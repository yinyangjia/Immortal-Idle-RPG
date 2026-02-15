const Game = {
    defaultPlayer: { 
        realmIdx: 0, baseStats: { hp: 150, atk: 25, def: 5 }, 
        hp: 150, maxHp: 150, atk: 25, def: 5, exp: 0, money: 0, reputation: 0,
        towerFloor: 1, inventory: {}, equipment: {}, skills: [],
        sectId: -1, sectRank: 0,
        selectedMonsterIdx: 0, lastSaveTime: Date.now() 
    },
    player: null, currentMap: 'field', isFighting: false,
    saveKey: 'cultivation_save_v21_magic', 

    init() {
        this.player = JSON.parse(JSON.stringify(this.defaultPlayer));
        this.load();
        
        if (isNaN(this.player.maxHp) || this.player.maxHp <= 0) this.player = JSON.parse(JSON.stringify(this.defaultPlayer));
        if (!Array.isArray(this.player.skills)) this.player.skills = [];
        if (this.player.sectId === undefined) { this.player.sectId = -1; this.player.sectRank = 0; }

        this.calcOfflineProfit();
        this.recalcStats();
        this.updateUI();
        if (this.currentMap === 'field') this.loop(); 
    },

    recalcStats() {
        let p = this.player; 
        const r = GAME_DATA.realms[p.realmIdx] || GAME_DATA.realms[0];
        
        p.maxHp = Math.floor((p.baseStats.hp||150) * r.mult);
        p.atk = Math.floor((p.baseStats.atk||25) * r.mult);
        p.def = Math.floor((p.baseStats.def||5) * r.mult);
        
        // 装备加成 (包含强化属性)
        for (let s in p.equipment) {
            const item = p.equipment[s];
            if (item) { 
                const st = GAME_DATA.getEquipStats(s, item.tier); 
                p.maxHp += (st.hp || 0); 
                p.atk += (st.atk || 0); 
                p.def += (st.def || 0); 
                // 加上额外的强化属性
                if (item.enhanceAtk) p.atk += item.enhanceAtk;
            }
        }

        // 门派加成
        if (p.sectId !== -1) {
            const sect = GAME_DATA.sects[p.sectId];
            if (sect && sect.ranks[p.sectRank]) {
                const s = sect.ranks[p.sectRank].stats;
                if(s) { p.maxHp += (s.hp||0); p.atk += (s.atk||0); p.def += (s.def||0); }
            }
        }
        
        // 技能被动加成 (如天魔解体)
        p.skills.forEach(sid => {
            const sk = GAME_DATA.skills[sid];
            if (sk && sk.type === 'passive') {
                if(sk.atkBonus) p.atk = Math.floor(p.atk * (1 + sk.atkBonus));
            }
        });

        if (p.hp > p.maxHp || isNaN(p.hp)) p.hp = p.maxHp;
    },

    // --- 新增：使用/强化逻辑 ---
    useItem(key) {
        const item = GAME_DATA.items[key];
        if (!item || !this.player.inventory[key]) return;

        // 1. 魔晶强化
        if (item.type === "crystal") {
            const weapon = this.player.equipment.weapon;
            if (!weapon) { alert("请先装备武器！"); return; }
            
            // 强化逻辑
            if (!weapon.enhanceAtk) weapon.enhanceAtk = 0;
            weapon.enhanceAtk += item.boost;
            
            this.log(`使用 [${item.name}] 强化武器，攻击力+${item.boost}`, 'win');
            this.player.inventory[key]--;
        }
        // 2. 学习技能
        else if (item.type === "book") {
            if (this.player.skills.includes(item.skillId)) {
                alert("已学会此功法！"); return;
            }
            this.player.skills.push(item.skillId);
            this.log(`习得功法 [${GAME_DATA.skills[item.skillId].name}]`, 'win');
            this.player.inventory[key]--;
        }
        // 3. 修为果
        else if (item.effect && item.effect.type === "exp") {
            this.player.exp += item.effect.val;
            this.log(`服用 [${item.name}]，修为+${item.effect.val}`, 'win');
            this.player.inventory[key]--;
        }

        if (this.player.inventory[key] <= 0) delete this.player.inventory[key];
        this.save(); this.recalcStats(); this.updateUI(); this.refreshPanel();
    },

    // --- 合成逻辑升级：支持魔晶合成 ---
    synthesizeAll() { 
        let ok=false; 
        for(let k in this.player.inventory){
            // 装备合成
            if(k.includes('_') && !k.startsWith('crystal') && this.player.inventory[k]>=3){
                const [t,tr]=k.split('_');const tier=parseInt(tr);
                if(tier<20){
                    const n=Math.floor(this.player.inventory[k]/3);
                    this.player.inventory[k]%=3; if(this.player.inventory[k]===0)delete this.player.inventory[k];
                    this.addItem(`${t}_${tier+1}`,n); ok=true;
                }
            }
            // 魔晶合成
            else if(k.startsWith('crystal_') && this.player.inventory[k]>=3) {
                const tier = parseInt(k.split('_')[1]);
                if(tier < 5) { // 最高5阶
                    const n=Math.floor(this.player.inventory[k]/3);
                    this.player.inventory[k]%=3; if(this.player.inventory[k]===0)delete this.player.inventory[k];
                    this.addItem(`crystal_${tier+1}`,n); ok=true;
                    this.log(`合成成功: ${n}颗 [${tier+1}阶魔晶]`, 'win');
                }
            }
        } 
        if(ok){this.save();this.refreshPanel();}else alert("无足够材料合成"); 
    },

    // --- 购买逻辑：增加门派身份限制 ---
    buyItem(id) { 
        const it=GAME_DATA.items[id]; 
        
        // 检查门派身份限制
        if (it.reqRank !== undefined) {
            if (this.player.sectId === -1 || this.player.sectRank < it.reqRank) {
                alert(`身份不足！需要达到 [${GAME_DATA.sects[this.player.sectId || 0].ranks[it.reqRank].name}] 才能购买`);
                return;
            }
        }

        if(this.player.money>=it.price){
            this.player.money-=it.price;
            this.addItem(id,1);
            this.log(`购买 [${it.name}]`, 'win');
        }else alert("灵石不足"); 
        
        this.save();this.updateUI();
        if(document.getElementById('sect-panel').style.display!=='none')this.showSectPanel(); 
    },

    // 5. 修复：已学功法正确显示
    refreshPanel() {
        const p=document.getElementById('character-panel'); if(p.classList.contains('hidden'))return; 
        
        // 刷新装备
        for(let s in GAME_DATA.equipSlots){
            const el=document.getElementById(`slot-${s}`);const eq=this.player.equipment[s];
            if(eq){
                let txt = `${this.getItemName(eq.id)}`;
                if(s === 'weapon' && eq.enhanceAtk) txt += ` (+${eq.enhanceAtk})`; // 显示强化值
                el.innerText = txt + `\n(卸下)`;
                el.className = `slot equipped tier-${Math.min(10,eq.tier)}`;
            } else { el.innerText=`${GAME_DATA.equipSlots[s]}: 空`;el.className='slot';}
        }
        document.getElementById('detail-atk').innerText=this.player.atk; document.getElementById('detail-def').innerText=this.player.def; document.getElementById('detail-hp').innerText=this.player.maxHp; 
        
        // 刷新背包 (增加魔晶强化按钮)
        const g=document.getElementById('inventory-grid'); g.innerHTML=''; 
        for(let [k,c] of Object.entries(this.player.inventory)){
            const it=GAME_DATA.items[k]; const isEq=k.includes('_') && !k.startsWith('crystal'); 
            let d="材料", btn='', qc='';
            if(isEq){ d="装备"; qc='tier-'+(k.split('_')[1]||1); btn=`<button class="item-btn" onclick="Game.equip('${k}')">装备</button>`; }
            else { 
                d=it?.desc||"未知"; 
                if(it && (it.type==='book'||it.effect)) btn=`<button class="item-btn btn-buy" onclick="Game.useItem('${k}')">使用</button>`;
                if(it && it.type==='crystal') btn=`<button class="item-btn btn-buy" onclick="Game.useItem('${k}')">强化</button>`; // 强化按钮
            }
            g.innerHTML+=`<div class="item-card ${qc}"><div style="font-weight:bold">${this.getItemName(k)}</div><div style="font-size:0.7em;color:#aaa">${d}</div><div>x${c}</div><div class="btn-group">${btn}<button class="item-btn btn-sell" onclick="Game.sellItem('${k}')">售出</button></div></div>`;
        }
        
        // 修复技能显示：遍历技能数组，查找对应名称
        const sb=document.getElementById('skill-list-display'); 
        if(sb){
            if(this.player.skills.length===0) sb.innerHTML='<div style="color:#666;font-size:0.8em">暂无</div>'; 
            else {
                let html = '';
                this.player.skills.forEach(sid => { 
                    const sk = GAME_DATA.skills[sid];
                    if(sk) html += `<div class="skill-tag">${sk.name}</div>`;
                });
                sb.innerHTML = html;
            }
        }
    },

    // ... (保留通用函数)
    gainReward(e) { this.player.exp += e.exp; this.player.money += (e.money || 0); this.player.reputation += (e.reputation || 0); if (e.loot && e.loot.length > 0) { e.loot.forEach(k => { this.addItem(k, 1); this.log(`获得: [${this.getItemName(k)}]`, 'win'); }); } this.log(`胜! 修为+${e.exp} 灵石+${e.money} 名望+${e.reputation||0}`, 'win'); },
    loop() { if (this.isFighting) return; let e; try { if (this.currentMap === 'boss' && this.currentBoss) { const b = this.currentBoss; e = { name: b.name, hp: this.player.maxHp * b.hpMult, atk: this.player.def * b.atkMult, def: 0, exp: b.exp, money: b.money, reputation: b.reputation, loot: b.drops }; } else if (this.currentMap === 'tower') { e = GAME_DATA.maps.tower.genEnemy(this.player, this.player.towerFloor); } else if (this.currentMap === 'field') { e = GAME_DATA.maps.field.genEnemy(this.player, this.player.selectedMonsterIdx); } else return; } catch(err) { return; } this.isFighting = true; if(typeof Battle === 'undefined') return; Battle.start(this.player, e, this.player.skills, () => { this.isFighting = false; this.gainReward(e); if (this.currentMap === 'tower') this.player.towerFloor++; if (this.currentMap === 'boss') this.switchMap('field'); this.player.hp = this.player.maxHp; this.save(); try { this.updateUI(); } catch(e){} setTimeout(() => this.loop(), 1000); }, () => { this.isFighting = false; this.log(`被 ${e.name} 击败...`, 'lose'); if (this.currentMap === 'boss') this.switchMap('field'); this.player.hp = this.player.maxHp; setTimeout(() => this.loop(), 2000); }, (msg) => this.log(msg, 'skill') ); },
    updateUI() { if(!this.player) return; const setText = (id, v) => { const el = document.getElementById(id); if(el) el.innerText = v; }; const r = GAME_DATA.realms[this.player.realmIdx] || GAME_DATA.realms[0]; setText('realm-title', r.name); setText('val-hp', Math.floor(this.player.hp)); setText('val-max-hp', this.player.maxHp); setText('val-atk', this.player.atk); setText('val-def', this.player.def); setText('val-exp', Math.floor(this.player.exp)); setText('val-max-exp', r.exp); setText('val-money', this.player.money); setText('tower-floor', this.player.towerFloor); setText('val-rep', this.player.reputation); },
    joinSect(id) { const s = GAME_DATA.sects[id]; if (this.player.sectId!==-1){alert("已有门派");return;} if(this.player.realmIdx<s.reqRealm){alert("境界不足");return;} this.player.sectId=id; this.player.sectRank=0; this.log(`加入 [${s.name}]`, 'win'); this.save(); this.recalcStats(); this.updateUI(); this.showSectPanel(); },
    promoteSect() { if(this.player.sectId===-1)return; const s=GAME_DATA.sects[this.player.sectId]; const n=this.player.sectRank+1; if(n>=s.ranks.length){alert("最高职位");return;} const nr=s.ranks[n]; if(this.player.reputation>=nr.cost){this.player.reputation-=nr.cost;this.player.sectRank++;this.log(`晋升 [${nr.name}]`,'win');this.save();this.recalcStats();this.updateUI();this.showSectPanel();}else alert(`名望不足 ${nr.cost}`); },
    calcOfflineProfit() { const n=Date.now(); const d=(n-(this.player.lastSaveTime||n))/1000; if(d>60){const m=GAME_DATA.fieldMonsters[this.player.selectedMonsterIdx||0]; const c=Math.min(Math.floor(d/5),17280); if(c>0){const e=m.exp*c, mo=m.money*c, r=(m.reputation||0)*c; this.player.exp+=e; this.player.money+=mo; this.player.reputation+=r; alert(`离线挂机 ${Math.floor(d/60)}分\n击败[${m.name}]x${c}\n获:修为${e},灵石${mo},名望${r}`);}} this.player.lastSaveTime=n; },
    log(m, t) { const b=document.getElementById('log-container'); if(b){const d=document.createElement('div'); d.className=`log-entry log-${t||'normal'}`; d.innerText=`[${new Date().toLocaleTimeString()}] ${m}`; b.prepend(d); if(b.children.length>50)b.lastChild.remove();} },
    addItem(k, c) { this.player.inventory[k] = (this.player.inventory[k] || 0) + c; },
    getItemName(k) { if(k.startsWith('crystal_')) { return GAME_DATA.items[k].name; } if(k.includes('_')){const [t,tr]=k.split('_');if(GAME_DATA.equipSlots[t])return `${tr}阶·${GAME_DATA.equipSlots[t]}`;} return GAME_DATA.items[k]?GAME_DATA.items[k].name:k; },
    showShop() { this.switchMap('shop'); }, toggleCharacterPanel() { document.getElementById('character-panel').classList.toggle('hidden'); this.refreshPanel(); },
    switchMap(m) { if(this.isFighting)Battle.stop(); this.isFighting=false; this.currentMap=m; document.querySelectorAll('.map-btn').forEach(b=>b.classList.remove('active')); if(event&&event.target)event.target.classList.add('active'); const mod=document.getElementById('monster-selector'); const lst=document.getElementById('monster-list'); const tit=document.getElementById('selector-title'); document.getElementById('sect-panel').classList.add('hidden'); if(m==='sect'){this.showSectPanel();} else if(m==='shop'){mod.classList.remove('hidden');tit.innerText="万宝阁";lst.innerHTML=""; ["ticket_1","ticket_2","ticket_3","筑基丹","exp_fruit_1"].forEach(id=>{const it=GAME_DATA.items[id]; lst.innerHTML+=`<div class="monster-card" style="display:block;text-align:center"><b>${it.name}</b><br>${it.desc}<div style="color:gold">${it.price}灵石</div><button class="item-btn btn-buy" onclick="Game.buyItem('${id}')">购买</button></div>`;});} else if(m==='boss'){mod.classList.remove('hidden');tit.innerText="首领";lst.innerHTML=""; GAME_DATA.bosses.forEach((b,i)=>{lst.innerHTML+=`<div class="monster-card" onclick="Game.challengeBoss(${i})"><div><b>${b.name}</b> Lv.${b.level}</div><div>需: ${GAME_DATA.items[b.ticket].name}</div></div>`;});} else if(m==='field'){mod.classList.remove('hidden');tit.innerText="挂机";lst.innerHTML=""; GAME_DATA.fieldMonsters.forEach((mon,i)=>{lst.innerHTML+=`<div class="monster-card" onclick="Game.selectMonster(${i})"><b>${mon.name}</b> Lv.${mon.level}</div>`;});} else this.loop(); },
    challengeBoss(i) { const b=GAME_DATA.bosses[i]; if((this.player.inventory[b.ticket]||0)>0){this.player.inventory[b.ticket]--;this.currentMap='boss';this.isFighting=false;this.currentBoss=b;document.getElementById('monster-selector').classList.add('hidden');this.log(`挑战 [${b.name}]`,'normal');this.loop();}else alert(`需: ${GAME_DATA.items[b.ticket].name}`); },
    selectMonster(i) { this.player.selectedMonsterIdx=i; document.getElementById('monster-selector').classList.add('hidden'); this.currentMap='field'; this.loop(); },
    equip(k) { const [t,tr]=k.split('_'); if(this.player.equipment[t])this.addItem(this.player.equipment[t].id,1); this.player.equipment[t]={id:k,tier:parseInt(tr)}; this.player.inventory[k]--; if(this.player.inventory[k]<=0)delete this.player.inventory[k]; this.recalcStats();this.save();this.refreshPanel();this.updateUI(); },
    unequip(s) { if(!this.player.equipment[s])return; this.addItem(this.player.equipment[s].id,1); delete this.player.equipment[s]; this.recalcStats();this.save();this.refreshPanel();this.updateUI(); },
    sellItem(k) { if(!this.player.inventory[k])return; let p=5; if(k.includes('_') && !k.startsWith('crystal')) p=parseInt(k.split('_')[1])*50; else if(GAME_DATA.items[k])p=GAME_DATA.items[k].price/2; this.player.money+=Math.floor(p); this.player.inventory[k]--; if(this.player.inventory[k]<=0)delete this.player.inventory[k]; this.log(`售出 [${this.getItemName(k)}]`,'win'); this.save();this.updateUI();this.refreshPanel(); },
    breakthrough() { const r=GAME_DATA.realms[this.player.realmIdx]; const nr=GAME_DATA.realms[this.player.realmIdx+1]; if(nr&&this.player.exp>=r.exp){this.player.exp-=r.exp;this.player.realmIdx++;const f=nr.isMajor?1.5:1.1;this.player.baseStats.hp=Math.floor(this.player.baseStats.hp*f);this.player.baseStats.atk=Math.floor(this.player.baseStats.atk*f);this.recalcStats();this.save();this.updateUI();this.log(`突破至 ${nr.name}`,'win');}else alert("修为不足"); },
    save() { this.player.lastSaveTime=Date.now(); localStorage.setItem(this.saveKey,JSON.stringify(this.player)); },
    load() { const s=localStorage.getItem(this.saveKey); if(s)this.player=JSON.parse(s); },
    showSectPanel() { const p=document.getElementById('sect-panel');p.classList.remove('hidden');const info=document.getElementById('sect-info');const shop=document.getElementById('sect-shop');if(this.player.sectId===-1){info.innerHTML=`<p>暂无门派。</p><h3>可加入：</h3>`;GAME_DATA.sects.forEach((s,i)=>{info.innerHTML+=`<div class="monster-card"><div><b>${s.name}</b><br>需: ${GAME_DATA.realms[GAME_DATA.majorRealms.indexOf(GAME_DATA.majorRealms[s.reqRealm])*10]?.name||"练气"}</div><button class="item-btn btn-buy" onclick="Game.joinSect(${i})">加入</button></div>`;});shop.innerHTML='';}else{const s=GAME_DATA.sects[this.player.sectId];const r=s.ranks[this.player.sectRank];const nr=s.ranks[this.player.sectRank+1];const stats=`攻+${r.stats.atk} 防+${r.stats.def} 血+${r.stats.hp}`;info.innerHTML=`<h2>${s.name}</h2><p>职位：<span style="color:gold">${r.name}</span></p><p style="font-size:0.8em;color:#aaa">${stats}</p><p>名望：${this.player.reputation}</p>${nr?`<button class="item-btn btn-buy" onclick="Game.promoteSect()">晋升 ${nr.name} (${nr.cost}名望)</button>`:'<p>已至巅峰</p>'}`;shop.innerHTML=`<h3>藏经阁</h3><div class="grid-list" style="display:grid;grid-template-columns:1fr 1fr;gap:5px"></div>`;const l=shop.querySelector('.grid-list');s.shop.forEach(id=>{const it=GAME_DATA.items[id];l.innerHTML+=`<div class="item-card"><div>${it.name}</div><div style="font-size:0.7em;color:#aaa">${it.price}灵石</div><button class="item-btn" onclick="Game.buyItem('${id}')">兑换</button></div>`;});}}
};

const Logger = { log: (m, t) => Game.log(m, t) };
window.onload = () => Game.init();
