const Game = {
    defaultPlayer: { 
        realmIdx: 0, baseStats: { hp: 150, atk: 25, def: 5 }, 
        hp: 150, maxHp: 150, atk: 25, def: 5, exp: 0, money: 0, reputation: 0, daoyun: 0,
        towerFloor: 1, inventory: {}, equipment: {}, 
        skills: [], equippedSkills: [], // 新增 equippedSkills
        activeCoupon: null, // 当前开启的掉落券ID
        sectId: -1, sectRank: 0,
        selectedMonsterIdx: 0, lastSaveTime: Date.now() 
    },
    player: null, currentMap: 'field', isFighting: false,
    saveKey: 'cultivation_save_v22_dao', // 更新 Key 

    init() {
        this.player = JSON.parse(JSON.stringify(this.defaultPlayer));
        this.load();
        
        // 数据迁移与修复
        if (isNaN(this.player.maxHp) || this.player.maxHp <= 0) this.player = JSON.parse(JSON.stringify(this.defaultPlayer));
        if (!Array.isArray(this.player.skills)) this.player.skills = [];
        if (!Array.isArray(this.player.equippedSkills)) this.player.equippedSkills = [];
        if (this.player.daoyun === undefined) this.player.daoyun = 0;
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
        
        for (let s in p.equipment) {
            const item = p.equipment[s];
            if (item) { 
                const st = GAME_DATA.getEquipStats(s, item.tier); 
                p.maxHp += (st.hp || 0); p.atk += (st.atk || 0); p.def += (st.def || 0); 
                if (item.enhanceAtk) p.atk += item.enhanceAtk;
            }
        }

        if (p.sectId !== -1) {
            const sect = GAME_DATA.sects[p.sectId];
            if (sect && sect.ranks[p.sectRank]) {
                const s = sect.ranks[p.sectRank].stats;
                if(s) { p.maxHp += (s.hp||0); p.atk += (s.atk||0); p.def += (s.def||0); }
            }
        }
        
        // 被动技能加成 (必须是已佩戴的)
        p.equippedSkills.forEach(sid => {
            const sk = GAME_DATA.skills[sid];
            if (sk && sk.type === 'passive' && sk.atkBonus) {
                p.atk = Math.floor(p.atk * (1 + sk.atkBonus));
            }
        });

        if (p.hp > p.maxHp || isNaN(p.hp)) p.hp = p.maxHp;
    },

    // --- 技能佩戴系统 ---
    toggleSkill(skillId) {
        const idx = this.player.equippedSkills.indexOf(skillId);
        if (idx > -1) {
            // 卸载
            this.player.equippedSkills.splice(idx, 1);
        } else {
            // 佩戴 (上限3个)
            if (this.player.equippedSkills.length >= 3) {
                alert("最多只能同时使用 3 个功法！");
                return;
            }
            this.player.equippedSkills.push(skillId);
        }
        this.recalcStats();
        this.save();
        this.refreshPanel();
    },

    // --- 掉落券开关 ---
    toggleCoupon(id) {
        if (this.player.activeCoupon === id) {
            this.player.activeCoupon = null; // 关闭
        } else {
            this.player.activeCoupon = id; // 开启
        }
        this.save();
        this.refreshPanel();
    },

    useItem(key) {
        const item = GAME_DATA.items[key];
        if (!item || !this.player.inventory[key]) return;

        if (item.type === "crystal") {
            const weapon = this.player.equipment.weapon;
            if (!weapon) { alert("请先装备武器！"); return; }
            if (!weapon.enhanceAtk) weapon.enhanceAtk = 0;
            weapon.enhanceAtk += item.boost;
            this.log(`使用 [${item.name}]，攻击力+${item.boost}`, 'win');
            this.player.inventory[key]--;
        }
        else if (item.type === "book") {
            if (this.player.skills.includes(item.skillId)) { alert("已学会！"); return; }
            this.player.skills.push(item.skillId);
            // 自动佩戴
            if (this.player.equippedSkills.length < 3) this.player.equippedSkills.push(item.skillId);
            this.log(`习得并装备 [${GAME_DATA.skills[item.skillId].name}]`, 'win');
            this.player.inventory[key]--;
        }
        else if (item.type === "exp") {
            this.player.exp += item.effect.val;
            this.log(`服用 [${item.name}]，修为+${item.effect.val}`, 'win');
            this.player.inventory[key]--;
        }

        if (this.player.inventory[key] <= 0) delete this.player.inventory[key];
        this.save(); this.recalcStats(); this.updateUI(); this.refreshPanel();
    },

    synthesizeAll() { 
        let ok=false; 
        for(let k in this.player.inventory){
            if(k.includes('_') && !k.startsWith('crystal') && this.player.inventory[k]>=3){
                const [t,tr]=k.split('_');const tier=parseInt(tr);
                if(tier<20){
                    const n=Math.floor(this.player.inventory[k]/3);
                    this.player.inventory[k]%=3; if(this.player.inventory[k]===0)delete this.player.inventory[k];
                    this.addItem(`${t}_${tier+1}`,n); ok=true;
                }
            }
            else if(k.startsWith('crystal_') && this.player.inventory[k]>=3) {
                const tier = parseInt(k.split('_')[1]);
                if(tier < 5) {
                    const n=Math.floor(this.player.inventory[k]/3);
                    this.player.inventory[k]%=3; if(this.player.inventory[k]===0)delete this.player.inventory[k];
                    this.addItem(`crystal_${tier+1}`,n); ok=true;
                }
            }
        } 
        if(ok){this.save();this.refreshPanel();}else alert("无足够材料"); 
    },

    buyItem(id) { 
        const it=GAME_DATA.items[id];
        const currency = it.currency === 'daoyun' ? 'daoyun' : 'money';
        const costName = currency === 'daoyun' ? '道韵' : '灵石';
        
        if (it.reqRank !== undefined && (this.player.sectId === -1 || this.player.sectRank < it.reqRank)) {
            alert(`身份不足！`); return;
        }

        if(this.player[currency] >= it.price){
            this.player[currency] -= it.price;
            this.addItem(id,1);
            this.log(`消耗${it.price}${costName} 购买 [${it.name}]`, 'win');
        }else alert(`${costName}不足`); 
        
        this.save();this.updateUI();
        if(document.getElementById('monster-selector').style.display!=='none')this.showShop();
        if(document.getElementById('sect-panel').style.display!=='none')this.showSectPanel(); 
    },

    refreshPanel() {
        const p=document.getElementById('character-panel'); if(p.classList.contains('hidden'))return; 
        
        for(let s in GAME_DATA.equipSlots){
            const el=document.getElementById(`slot-${s}`);const eq=this.player.equipment[s];
            if(eq){
                let txt = `${this.getItemName(eq.id)}`;
                if(s === 'weapon' && eq.enhanceAtk) txt += ` (+${eq.enhanceAtk})`;
                el.innerText = txt + `\n(卸下)`;
                el.className = `slot equipped tier-${Math.min(10,eq.tier)}`;
            } else { el.innerText=`${GAME_DATA.equipSlots[s]}: 空`;el.className='slot';}
        }
        document.getElementById('detail-atk').innerText=this.player.atk; 
        document.getElementById('detail-def').innerText=this.player.def; 
        document.getElementById('detail-hp').innerText=this.player.maxHp; 
        
        const g=document.getElementById('inventory-grid'); g.innerHTML=''; 
        for(let [k,c] of Object.entries(this.player.inventory)){
            const it=GAME_DATA.items[k]; const isEq=k.includes('_') && !k.startsWith('crystal'); 
            let d="材料", btn='', qc='';
            
            if(isEq){ 
                d="装备"; qc='tier-'+(k.split('_')[1]||1); 
                btn=`<button class="item-btn" onclick="Game.equip('${k}')">装备</button>`; 
            } else if (it) {
                d=it.desc;
                if(it.type==='book'||it.type==='exp'||it.type==='crystal') btn=`<button class="item-btn btn-buy" onclick="Game.useItem('${k}')">使用</button>`;
                
                // 掉落券逻辑
                if(it.type==='coupon') {
                    const isActive = this.player.activeCoupon === k;
                    btn = `<button class="item-btn ${isActive ? 'btn-sell' : 'btn-buy'}" onclick="Game.toggleCoupon('${k}')">${isActive ? '停止' : '开启'}</button>`;
                }
            }
            g.innerHTML+=`<div class="item-card ${qc}"><div style="font-weight:bold">${this.getItemName(k)}</div><div style="font-size:0.7em;color:#aaa">${d}</div><div>x${c}</div><div class="btn-group">${btn}<button class="item-btn btn-sell" onclick="Game.sellItem('${k}')">售出</button></div></div>`;
        }
        
        // 技能管理面板
        const sb=document.getElementById('skill-list-display'); 
        if(sb){
            if(this.player.skills.length===0) sb.innerHTML='<div style="color:#666;font-size:0.8em">暂无</div>'; 
            else {
                let html = '';
                this.player.skills.forEach(sid => { 
                    const sk = GAME_DATA.skills[sid];
                    const equipped = this.player.equippedSkills.includes(sid);
                    if(sk) {
                        html += `<div class="skill-tag ${equipped ? 'active' : ''}" onclick="Game.toggleSkill('${sid}')">
                            ${sk.name} ${equipped ? '✅' : ''}
                        </div>`;
                    }
                });
                sb.innerHTML = html;
            }
        }
    },

    gainReward(e) {
        let mult = 1;
        // 掉落券消耗逻辑
        if (this.player.activeCoupon) {
            const count = this.player.inventory[this.player.activeCoupon] || 0;
            if (count > 0) {
                const coupon = GAME_DATA.items[this.player.activeCoupon];
                if(coupon) {
                    mult = coupon.mult;
                    this.player.inventory[this.player.activeCoupon]--; // 消耗一张
                    if(this.player.inventory[this.player.activeCoupon]<=0) {
                        this.player.activeCoupon = null; // 耗尽关闭
                        delete this.player.inventory[this.player.activeCoupon];
                    }
                }
            } else {
                this.player.activeCoupon = null;
            }
        }

        const exp = Math.floor(e.exp * mult);
        const money = Math.floor((e.money || 0) * mult);
        const daoyun = Math.floor((e.daoyun || 0) * mult);
        
        this.player.exp += exp; 
        this.player.money += money;
        this.player.daoyun += daoyun;
        
        if (e.loot && e.loot.length > 0) {
            e.loot.forEach(k => { 
                // 掉落券也翻倍掉落数量？暂定只增加概率或固定数量，这里简单处理：如果是券，额外给
                this.addItem(k, 1);
                if (mult > 1 && Math.random() < (mult-1)) this.addItem(k, 1); // 概率双倍掉落
                this.log(`获得: [${this.getItemName(k)}]`, 'win');
            });
        }
        
        let logMsg = `胜! 修为+${exp} 灵石+${money}`;
        if(daoyun > 0) logMsg += ` 道韵+${daoyun}`;
        if(mult > 1) logMsg += ` (加成x${mult})`;
        
        this.log(logMsg, 'win');
    },

    // ... (保留其余基础逻辑) ...
    loop() { if (this.isFighting) return; let e; try { if (this.currentMap === 'boss' && this.currentBoss) { const b = this.currentBoss; e = { name: b.name, hp: b.hp, atk: b.atk, def: 0, exp: b.exp, money: b.money, daoyun: b.daoyun, loot: b.drops }; } else if (this.currentMap === 'tower') { e = GAME_DATA.maps.tower.genEnemy(this.player, this.player.towerFloor); } else if (this.currentMap === 'field') { e = GAME_DATA.maps.field.genEnemy(this.player, this.player.selectedMonsterIdx); } else return; } catch(err) { return; } this.isFighting = true; if(typeof Battle === 'undefined') return; Battle.start(this.player, e, this.player.equippedSkills, () => { this.isFighting = false; this.gainReward(e); if (this.currentMap === 'tower') this.player.towerFloor++; if (this.currentMap === 'boss') this.switchMap('field'); this.player.hp = this.player.maxHp; this.save(); try { this.updateUI(); } catch(e){} setTimeout(() => this.loop(), 500); }, () => { this.isFighting = false; this.log(`被 ${e.name} 击败...`, 'lose'); if (this.currentMap === 'boss') this.switchMap('field'); this.player.hp = this.player.maxHp; setTimeout(() => this.loop(), 2000); }, (msg) => this.log(msg, 'skill') ); },
    updateUI() { if(!this.player) return; const setText = (id, v) => { const el = document.getElementById(id); if(el) el.innerText = v; }; const r = GAME_DATA.realms[this.player.realmIdx] || GAME_DATA.realms[0]; setText('realm-title', r.name); setText('val-hp', Math.floor(this.player.hp)); setText('val-max-hp', this.player.maxHp); setText('val-atk', this.player.atk); setText('val-def', this.player.def); setText('val-exp', Math.floor(this.player.exp)); setText('val-max-exp', r.exp); setText('val-money', this.player.money); setText('tower-floor', this.player.towerFloor); setText('val-rep', this.player.reputation); setText('val-daoyun', this.player.daoyun); },
    addItem(k, c) { this.player.inventory[k] = (this.player.inventory[k] || 0) + c; },
    getItemName(k) { if(k.startsWith('crystal_') || k.startsWith('coupon_')) { return GAME_DATA.items[k].name; } if(k.includes('_')){const [t,tr]=k.split('_');if(GAME_DATA.equipSlots[t])return `${tr}阶·${GAME_DATA.equipSlots[t]}`;} return GAME_DATA.items[k]?GAME_DATA.items[k].name:k; },
    showShop() { this.switchMap('shop'); }, toggleCharacterPanel() { document.getElementById('character-panel').classList.toggle('hidden'); this.refreshPanel(); },
    switchMap(m) { if(this.isFighting)Battle.stop(); this.isFighting=false; this.currentMap=m; document.querySelectorAll('.map-btn').forEach(b=>b.classList.remove('active')); if(event&&event.target)event.target.classList.add('active'); const mod=document.getElementById('monster-selector'); const lst=document.getElementById('monster-list'); const tit=document.getElementById('selector-title'); document.getElementById('sect-panel').classList.add('hidden'); if(m==='sect'){this.showSectPanel();} else if(m==='shop'){mod.classList.remove('hidden');tit.innerText="万宝阁";lst.innerHTML=""; ["ticket_1","ticket_2","ticket_3","筑基丹","exp_fruit_1","coupon_1.5","coupon_2.0","coupon_3.0"].forEach(id=>{const it=GAME_DATA.items[id]; const currency=it.currency==='daoyun'?'道韵':'灵石'; const color=it.currency==='daoyun'?'#40c4ff':'gold'; lst.innerHTML+=`<div class="monster-card" style="display:block;text-align:center"><b>${it.name}</b><br>${it.desc}<div style="color:${color}">${it.price}${currency}</div><button class="item-btn btn-buy" onclick="Game.buyItem('${id}')">购买</button></div>`;});} else if(m==='boss'){mod.classList.remove('hidden');tit.innerText="首领";lst.innerHTML=""; GAME_DATA.bosses.forEach((b,i)=>{lst.innerHTML+=`<div class="monster-card" onclick="Game.challengeBoss(${i})"><div><b>${b.name}</b> Lv.${b.level}</div><div>需: ${GAME_DATA.items[b.ticket].name}</div></div>`;});} else if(m==='field'){mod.classList.remove('hidden');tit.innerText="挂机";lst.innerHTML=""; GAME_DATA.fieldMonsters.forEach((mon,i)=>{lst.innerHTML+=`<div class="monster-card" onclick="Game.selectMonster(${i})"><b>${mon.name}</b> Lv.${mon.level}</div>`;});} else this.loop(); },
    challengeBoss(i) { const b=GAME_DATA.bosses[i]; if((this.player.inventory[b.ticket]||0)>0){this.player.inventory[b.ticket]--;this.currentMap='boss';this.isFighting=false;this.currentBoss=b;document.getElementById('monster-selector').classList.add('hidden');this.log(`挑战 [${b.name}]`,'normal');this.loop();}else alert(`需: ${GAME_DATA.items[b.ticket].name}`); },
    selectMonster(i) { this.player.selectedMonsterIdx=i; document.getElementById('monster-selector').classList.add('hidden'); this.currentMap='field'; this.loop(); },
    equip(k) { const [t,tr]=k.split('_'); if(this.player.equipment[t])this.addItem(this.player.equipment[t].id,1); this.player.equipment[t]={id:k,tier:parseInt(tr)}; this.player.inventory[k]--; if(this.player.inventory[k]<=0)delete this.player.inventory[k]; this.recalcStats();this.save();this.refreshPanel();this.updateUI(); },
    unequip(s) { if(!this.player.equipment[s])return; this.addItem(this.player.equipment[s].id,1); delete this.player.equipment[s]; this.recalcStats();this.save();this.refreshPanel();this.updateUI(); },
    sellItem(k) { if(!this.player.inventory[k])return; let p=5; if(k.includes('_') && !k.startsWith('crystal')) p=parseInt(k.split('_')[1])*50; else if(GAME_DATA.items[k])p=GAME_DATA.items[k].price/2; this.player.money+=Math.floor(p); this.player.inventory[k]--; if(this.player.inventory[k]<=0)delete this.player.inventory[k]; this.log(`售出 [${this.getItemName(k)}]`,'win'); this.save();this.updateUI();this.refreshPanel(); },
    breakthrough() { const r=GAME_DATA.realms[this.player.realmIdx]; const nr=GAME_DATA.realms[this.player.realmIdx+1]; if(nr&&this.player.exp>=r.exp){this.player.exp-=r.exp;this.player.realmIdx++;const f=nr.isMajor?1.5:1.1;this.player.baseStats.hp=Math.floor(this.player.baseStats.hp*f);this.player.baseStats.atk=Math.floor(this.player.baseStats.atk*f);this.recalcStats();this.save();this.updateUI();this.log(`突破至 ${nr.name}`,'win');}else alert("修为不足"); },
    save() { this.player.lastSaveTime=Date.now(); localStorage.setItem(this.saveKey,JSON.stringify(this.player)); },
    load() { const s=localStorage.getItem(this.saveKey); if(s)this.player=JSON.parse(s); },
    showSectPanel() { const p=document.getElementById('sect-panel');p.classList.remove('hidden');const info=document.getElementById('sect-info');const shop=document.getElementById('sect-shop');if(this.player.sectId===-1){info.innerHTML=`<p>暂无门派。</p><h3>可加入：</h3>`;GAME_DATA.sects.forEach((s,i)=>{info.innerHTML+=`<div class="monster-card"><div><b>${s.name}</b><br>需: ${GAME_DATA.realms[GAME_DATA.majorRealms.indexOf(GAME_DATA.majorRealms[s.reqRealm])*10]?.name||"练气"}</div><button class="item-btn btn-buy" onclick="Game.joinSect(${i})">加入</button></div>`;});shop.innerHTML='';}else{const s=GAME_DATA.sects[this.player.sectId];const r=s.ranks[this.player.sectRank];const nr=s.ranks[this.player.sectRank+1];const stats=`攻+${r.stats.atk} 防+${r.stats.def} 血+${r.stats.hp}`;info.innerHTML=`<h2>${s.name}</h2><p>职位：<span style="color:gold">${r.name}</span></p><p style="font-size:0.8em;color:#aaa">${stats}</p><p>名望：${this.player.reputation}</p>${nr?`<button class="item-btn btn-buy" onclick="Game.promoteSect()">晋升 ${nr.name} (${nr.cost}名望)</button>`:'<p>已至巅峰</p>'}`;shop.innerHTML=`<h3>藏经阁</h3><div class="grid-list" style="display:grid;grid-template-columns:1fr 1fr;gap:5px"></div>`;const l=shop.querySelector('.grid-list');s.shop.forEach(id=>{const it=GAME_DATA.items[id];l.innerHTML+=`<div class="item-card"><div>${it.name}</div><div style="font-size:0.7em;color:#aaa">${it.price}灵石</div><button class="item-btn" onclick="Game.buyItem('${id}')">兑换</button></div>`;});}},
    calcOfflineProfit() { 
        const n=Date.now(); const d=(n-(this.player.lastSaveTime||n))/1000; 
        if(d>60){
            const m=GAME_DATA.fieldMonsters[this.player.selectedMonsterIdx||0]; 
            const c=Math.min(Math.floor(d/5),17280); 
            if(c>0){
                let mult = 1;
                // 离线也消耗券? 简化起见，离线不消耗券但也不享受加成，或者默认享受?
                // 这里暂不处理离线券消耗，避免上线发现券没了
                const e=m.exp*c, mo=m.money*c, r=(m.reputation||0)*c; 
                this.player.exp+=e; this.player.money+=mo; this.player.reputation+=r; 
                alert(`离线挂机 ${Math.floor(d/60)}分\n击败[${m.name}]x${c}\n获:修为${e},灵石${mo},名望${r}`);
            }
        } 
        this.player.lastSaveTime=n; 
    }
};
const Logger = { log: (m, t) => Game.log(m, t) };
window.onload = () => Game.init();
