const Game = {
    // 默认数据
    defaultPlayer: { 
        realmIdx: 0, baseStats: { hp: 150, atk: 15, def: 5 }, 
        hp: 150, maxHp: 150, atk: 15, def: 5, exp: 0, money: 0, reputation: 0,
        towerFloor: 1, inventory: {}, equipment: {}, skills: [],
        sectId: -1, sectRank: 0,
        selectedMonsterIdx: 0, lastSaveTime: Date.now() 
    },
    player: null, currentMap: 'field', isFighting: false,
    saveKey: 'cultivation_save_v20_safe', // 再次升级Key以清洗坏档

    init() {
        this.player = JSON.parse(JSON.stringify(this.defaultPlayer));
        this.load();
        
        // 坏档修复逻辑
        if (isNaN(this.player.maxHp) || this.player.maxHp <= 0 || !this.player.inventory) {
            console.warn("数据损坏，重置人物");
            this.player = JSON.parse(JSON.stringify(this.defaultPlayer));
        }
        if (!Array.isArray(this.player.skills)) this.player.skills = [];
        if (this.player.sectId === undefined) { this.player.sectId = -1; this.player.sectRank = 0; }

        this.calcOfflineProfit();
        this.recalcStats();
        this.updateUI();
        if (this.currentMap === 'field') this.loop(); 
    },

    // --- 核心修复：属性计算防 NaN ---
    recalcStats() {
        let p = this.player; 
        const r = GAME_DATA.realms[p.realmIdx] || GAME_DATA.realms[0];
        const mult = r.mult || 1;
        
        // 基础值 (防NaN)
        p.maxHp = Math.floor((p.baseStats.hp || 100) * mult);
        p.atk = Math.floor((p.baseStats.atk || 10) * mult);
        p.def = Math.floor((p.baseStats.def || 0) * mult);
        
        // 装备加成
        for (let s in p.equipment) {
            const item = p.equipment[s];
            if (item) { 
                const st = GAME_DATA.getEquipStats(s, item.tier); 
                p.maxHp += (st.hp || 0); 
                p.atk += (st.atk || 0); 
                p.def += (st.def || 0); 
            }
        }

        // 门派加成
        if (p.sectId !== -1) {
            const sect = GAME_DATA.sects[p.sectId];
            if (sect && sect.ranks[p.sectRank]) {
                const s = sect.ranks[p.sectRank].stats;
                if(s) {
                    p.maxHp += (s.hp || 0);
                    p.atk += (s.atk || 0);
                    p.def += (s.def || 0);
                }
            }
        }
        
        // 血量修正
        if (isNaN(p.maxHp) || p.maxHp < 10) p.maxHp = 100; // 保底
        if (p.hp > p.maxHp || isNaN(p.hp)) p.hp = p.maxHp;
    },

    // --- 核心修复：物品与技能使用 ---
    useItem(key) {
        const item = GAME_DATA.items[key];
        const count = this.player.inventory[key] || 0;
        
        if (!item || count <= 0) return;

        if (item.type === "book") {
            if (this.player.skills.includes(item.skillId)) {
                alert("你已经学会此功法，无需重复研读！");
                return;
            }
            // 学习技能
            this.player.skills.push(item.skillId);
            this.log(`研读 [${item.name}] 成功，习得功法！`, 'win');
        } 
        else if (item.effect && item.effect.type === "exp") {
            this.player.exp += item.effect.val;
            this.log(`服用 [${item.name}]，增加 ${item.effect.val} 修为`, 'win');
        }

        // 扣除物品
        this.player.inventory[key]--;
        if (this.player.inventory[key] <= 0) delete this.player.inventory[key];

        // 立即保存并刷新全套界面
        this.save();
        this.recalcStats();
        this.updateUI();
        this.refreshPanel();
    },

    // --- 核心修复：面板刷新逻辑 ---
    refreshPanel() {
        const p = document.getElementById('character-panel');
        if (p.classList.contains('hidden')) return;

        // 1. 刷新属性
        document.getElementById('detail-atk').innerText = this.player.atk;
        document.getElementById('detail-def').innerText = this.player.def;
        document.getElementById('detail-hp').innerText = this.player.maxHp;

        // 2. 刷新装备槽
        for (let s in GAME_DATA.equipSlots) {
            const el = document.getElementById(`slot-${s}`);
            const eq = this.player.equipment[s];
            if (eq) { 
                el.innerText = `${this.getItemName(eq.id)}\n(卸下)`; 
                el.className = `slot equipped tier-${Math.min(10, eq.tier)}`; 
            } else { 
                el.innerText = `${GAME_DATA.equipSlots[s]}: 空`; 
                el.className = 'slot'; 
            }
        }

        // 3. 刷新背包 (显示装备和书籍)
        const grid = document.getElementById('inventory-grid'); 
        grid.innerHTML = '';
        
        const inv = this.player.inventory || {};
        for (let [k, c] of Object.entries(inv)) {
            if (c <= 0) continue;
            
            const isEquip = k.includes('_');
            const item = GAME_DATA.items[k];
            
            let desc = "材料";
            let btn = '';
            let qc = '';
            
            if (isEquip) { 
                desc = "装备"; 
                qc = 'tier-' + (k.split('_')[1] || 1); 
                btn = `<button class="item-btn" onclick="Game.equip('${k}')">装备</button>`; 
            } else { 
                desc = item?.desc || "未知"; 
                // 只有书籍和消耗品显示使用按钮
                if (item && (item.type === 'book' || item.effect)) {
                    btn = `<button class="item-btn btn-buy" onclick="Game.useItem('${k}')">使用</button>`; 
                }
            }
            
            grid.innerHTML += `
                <div class="item-card ${qc}">
                    <div style="font-weight:bold">${this.getItemName(k)}</div>
                    <div style="font-size:0.7em;color:#aaa">${desc}</div>
                    <div>x${c}</div>
                    <div class="btn-group">${btn}<button class="item-btn btn-sell" onclick="Game.sellItem('${k}')">售出</button></div>
                </div>`;
        }
        
        // 4. 刷新已学技能 (关键修复)
        const sb = document.getElementById('skill-list-display');
        if (sb) { 
            if (this.player.skills.length === 0) {
                sb.innerHTML = '<div style="color:#666;font-size:0.8em;padding:5px;">暂未修习任何功法</div>'; 
            } else {
                let html = '';
                this.player.skills.forEach(sid => { 
                    const sk = GAME_DATA.skills[sid];
                    if(sk) html += `<span class="skill-tag">${sk.name}</span> `;
                }); 
                sb.innerHTML = html;
            }
        }
    },

    // ... (保留其余逻辑：gainReward, loop, switchMap 等) ...
    gainReward(e) { this.player.exp += e.exp; this.player.money += (e.money || 0); this.player.reputation += (e.reputation || 0); if (e.loot && e.loot.length > 0) { e.loot.forEach(k => { this.addItem(k, 1); this.log(`获得: [${this.getItemName(k)}]`, 'win'); }); } this.log(`胜! 修为+${e.exp} 灵石+${e.money} 名望+${e.reputation||0}`, 'win'); },
    loop() { if (this.isFighting) return; let e; try { if (this.currentMap === 'boss' && this.currentBoss) { const b = this.currentBoss; e = { name: b.name, hp: this.player.maxHp * b.hpMult, atk: this.player.def * b.atkMult, def: 0, exp: b.exp, money: b.money, reputation: b.reputation, loot: b.drops }; } else if (this.currentMap === 'tower') { e = GAME_DATA.maps.tower.genEnemy(this.player, this.player.towerFloor); } else if (this.currentMap === 'field') { e = GAME_DATA.maps.field.genEnemy(this.player, this.player.selectedMonsterIdx); } else return; } catch(err) { return; } this.isFighting = true; if(typeof Battle === 'undefined') return; Battle.start(this.player, e, this.player.skills, () => { this.isFighting = false; this.gainReward(e); if (this.currentMap === 'tower') this.player.towerFloor++; if (this.currentMap === 'boss') this.switchMap('field'); this.player.hp = this.player.maxHp; this.save(); try { this.updateUI(); } catch(e){} setTimeout(() => this.loop(), 1000); }, () => { this.isFighting = false; this.log(`被 ${e.name} 击败...`, 'lose'); if (this.currentMap === 'boss') this.switchMap('field'); this.player.hp = this.player.maxHp; setTimeout(() => this.loop(), 2000); }, (msg) => this.log(msg, 'skill') ); },
    updateUI() { if(!this.player) return; const setText = (id, v) => { const el = document.getElementById(id); if(el) el.innerText = v; }; const r = GAME_DATA.realms[this.player.realmIdx] || GAME_DATA.realms[0]; setText('realm-title', r.name); setText('val-hp', Math.floor(this.player.hp)); setText('val-max-hp', this.player.maxHp); setText('val-atk', this.player.atk); setText('val-def', this.player.def); setText('val-exp', Math.floor(this.player.exp)); setText('val-max-exp', r.exp); setText('val-money', this.player.money); setText('tower-floor', this.player.towerFloor); setText('val-rep', this.player.reputation); },
    joinSect(id) { const s = GAME_DATA.sects[id]; if (this.player.sectId!==-1){alert("已有门派");return;} if(this.player.realmIdx<s.reqRealm){alert("境界不足");return;} this.player.sectId=id; this.player.sectRank=0; this.log(`加入 [${s.name}]`, 'win'); this.save(); this.recalcStats(); this.updateUI(); this.showSectPanel(); },
    promoteSect() { if(this.player.sectId===-1)return; const s=GAME_DATA.sects[this.player.sectId]; const n=this.player.sectRank+1; if(n>=s.ranks.length){alert("最高职位");return;} const nr=s.ranks[n]; if(this.player.reputation>=nr.cost){this.player.reputation-=nr.cost;this.player.sectRank++;this.log(`晋升 [${nr.name}]`,'win');this.save();this.recalcStats();this.updateUI();this.showSectPanel();}else alert(`名望不足 ${nr.cost}`); },
    buyItem(id) { const it=GAME_DATA.items[id]; if(this.player.money>=it.price){this.player.money-=it.price;this.addItem(id,1);this.log(`购买 [${it.name}]`,'win');}else alert("灵石不足"); this.save();this.updateUI();if(document.getElementById('monster-selector').style.display!=='none')this.showShop();if(document.getElementById('sect-panel').style.display!=='none')this.showSectPanel(); },
    calcOfflineProfit() { const n=Date.now(); const d=(n-(this.player.lastSaveTime||n))/1000; if(d>60){const m=GAME_DATA.fieldMonsters[this.player.selectedMonsterIdx||0]; const c=Math.min(Math.floor(d/5),17280); if(c>0){const e=m.exp*c, mo=m.money*c, r=(m.reputation||0)*c; this.player.exp+=e; this.player.money+=mo; this.player.reputation+=r; alert(`离线挂机 ${Math.floor(d/60)}分\n击败[${m.name}]x${c}\n获:修为${e},灵石${mo},名望${r}`);}} this.player.lastSaveTime=n; },
    log(m, t) { const b=document.getElementById('log-container'); if(b){const d=document.createElement('div'); d.className=`log-entry log-${t||'normal'}`; d.innerText=`[${new Date().toLocaleTimeString()}] ${m}`; b.prepend(d); if(b.children.length>50)b.lastChild.remove();} },
    addItem(k, c) { this.player.inventory[k] = (this.player.inventory[k] || 0) + c; },
    getItemName(k) { if(k.includes('_')){const [t,tr]=k.split('_');if(GAME_DATA.equipSlots[t])return `${tr}阶·${GAME_DATA.equipSlots[t]}`;} return GAME_DATA.items[k]?GAME_DATA.items[k].name:k; },
    showShop() { this.switchMap('shop'); }, toggleCharacterPanel() { document.getElementById('character-panel').classList.toggle('hidden'); this.refreshPanel(); },
    switchMap(m) { if(this.isFighting)Battle.stop(); this.isFighting=false; this.currentMap=m; document.querySelectorAll('.map-btn').forEach(b=>b.classList.remove('active')); if(event&&event.target)event.target.classList.add('active'); const mod=document.getElementById('monster-selector'); const lst=document.getElementById('monster-list'); const tit=document.getElementById('selector-title'); document.getElementById('sect-panel').classList.add('hidden'); if(m==='sect'){this.showSectPanel();} else if(m==='shop'){mod.classList.remove('hidden');tit.innerText="万宝阁";lst.innerHTML=""; ["ticket_1","ticket_2","ticket_3","筑基丹","exp_fruit_1","exp_fruit_2"].forEach(id=>{const it=GAME_DATA.items[id]; lst.innerHTML+=`<div class="monster-card" style="display:block;text-align:center"><b>${it.name}</b><br>${it.desc}<div style="color:gold">${it.price}灵石</div><button class="item-btn btn-buy" onclick="Game.buyItem('${id}')">购买</button></div>`;});} else if(m==='boss'){mod.classList.remove('hidden');tit.innerText="首领";lst.innerHTML=""; GAME_DATA.bosses.forEach((b,i)=>{lst.innerHTML+=`<div class="monster-card" onclick="Game.challengeBoss(${i})"><div><b>${b.name}</b> Lv.${b.level}</div><div>需: ${GAME_DATA.items[b.ticket].name}</div></div>`;});} else if(m==='field'){mod.classList.remove('hidden');tit.innerText="挂机";lst.innerHTML=""; GAME_DATA.fieldMonsters.forEach((mon,i)=>{lst.innerHTML+=`<div class="monster-card" onclick="Game.selectMonster(${i})"><b>${mon.name}</b> Lv.${mon.level}</div>`;});} else this.loop(); },
    challengeBoss(i) { const b=GAME_DATA.bosses[i]; if((this.player.inventory[b.ticket]||0)>0){this.player.inventory[b.ticket]--;this.currentMap='boss';this.isFighting=false;this.currentBoss=b;document.getElementById('monster-selector').classList.add('hidden');this.log(`挑战 [${b.name}]`,'normal');this.loop();}else alert(`需: ${GAME_DATA.items[b.ticket].name}`); },
    selectMonster(i) { this.player.selectedMonsterIdx=i; document.getElementById('monster-selector').classList.add('hidden'); this.currentMap='field'; this.loop(); },
    equip(k) { const [t,tr]=k.split('_'); if(this.player.equipment[t])this.addItem(this.player.equipment[t].id,1); this.player.equipment[t]={id:k,tier:parseInt(tr)}; this.player.inventory[k]--; if(this.player.inventory[k]<=0)delete this.player.inventory[k]; this.recalcStats();this.save();this.refreshPanel();this.updateUI(); },
    unequip(s) { if(!this.player.equipment[s])return; this.addItem(this.player.equipment[s].id,1); delete this.player.equipment[s]; this.recalcStats();this.save();this.refreshPanel();this.updateUI(); },
    sellItem(k) { if(!this.player.inventory[k])return; let p=5; if(k.includes('_'))p=parseInt(k.split('_')[1])*50; else if(GAME_DATA.items[k])p=GAME_DATA.items[k].price/2; this.player.money+=Math.floor(p); this.player.inventory[k]--; if(this.player.inventory[k]<=0)delete this.player.inventory[k]; this.log(`售出 [${this.getItemName(k)}]`,'win'); this.save();this.updateUI();this.refreshPanel(); },
    synthesizeAll() { let ok=false; for(let k in this.player.inventory){if(k.includes('_')&&this.player.inventory[k]>=3){const [t,tr]=k.split('_');const tier=parseInt(tr);if(tier<20){const n=Math.floor(this.player.inventory[k]/3);this.player.inventory[k]%=3;if(this.player.inventory[k]===0)delete this.player.inventory[k];this.addItem(`${t}_${tier+1}`,n);ok=true;}}} if(ok){this.log("合成成功",'win');this.save();this.refreshPanel();}else alert("无可合成"); },
    breakthrough() { const r=GAME_DATA.realms[this.player.realmIdx]; const nr=GAME_DATA.realms[this.player.realmIdx+1]; if(nr&&this.player.exp>=r.exp){this.player.exp-=r.exp;this.player.realmIdx++;const f=nr.isMajor?1.5:1.1;this.player.baseStats.hp=Math.floor(this.player.baseStats.hp*f);this.player.baseStats.atk=Math.floor(this.player.baseStats.atk*f);this.recalcStats();this.save();this.updateUI();this.log(`突破至 ${nr.name}`,'win');}else alert("修为不足"); },
    save() { this.player.lastSaveTime=Date.now(); localStorage.setItem(this.saveKey,JSON.stringify(this.player)); },
    load() { const s=localStorage.getItem(this.saveKey); if(s)this.player=JSON.parse(s); },
    showSectPanel() { const p=document.getElementById('sect-panel');p.classList.remove('hidden');const info=document.getElementById('sect-info');const shop=document.getElementById('sect-shop');if(this.player.sectId===-1){info.innerHTML=`<p>暂无门派。</p><h3>可加入：</h3>`;GAME_DATA.sects.forEach((s,i)=>{info.innerHTML+=`<div class="monster-card"><div><b>${s.name}</b><br>需: ${GAME_DATA.realms[GAME_DATA.majorRealms.indexOf(GAME_DATA.majorRealms[s.reqRealm])*10]?.name||"练气"}</div><button class="item-btn btn-buy" onclick="Game.joinSect(${i})">加入</button></div>`;});shop.innerHTML='';}else{const s=GAME_DATA.sects[this.player.sectId];const r=s.ranks[this.player.sectRank];const nr=s.ranks[this.player.sectRank+1];const stats=`攻+${r.stats.atk} 防+${r.stats.def} 血+${r.stats.hp}`;info.innerHTML=`<h2>${s.name}</h2><p>职位：<span style="color:gold">${r.name}</span></p><p style="font-size:0.8em;color:#aaa">${stats}</p><p>名望：${this.player.reputation}</p>${nr?`<button class="item-btn btn-buy" onclick="Game.promoteSect()">晋升 ${nr.name} (${nr.cost}名望)</button>`:'<p>已至巅峰</p>'}`;shop.innerHTML=`<h3>藏经阁</h3><div class="grid-list" style="display:grid;grid-template-columns:1fr 1fr;gap:5px"></div>`;const l=shop.querySelector('.grid-list');s.shop.forEach(id=>{const it=GAME_DATA.items[id];l.innerHTML+=`<div class="item-card"><div>${it.name}</div><div style="font-size:0.7em;color:#aaa">${it.price}灵石</div><button class="item-btn" onclick="Game.buyItem('${id}')">兑换</button></div>`;});}}
};
const Logger = { log: (m, t) => Game.log(m, t) };
window.onload = () => Game.init();
