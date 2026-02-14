const Game = {
    // 玩家数据结构更新：增加 reputation(名望), sect(门派), skills(已学技能)
    defaultPlayer: { 
        realmIdx: 0, baseStats: { hp: 150, atk: 15, def: 5 }, 
        hp: 150, maxHp: 150, atk: 15, def: 5, exp: 0, money: 0, reputation: 0,
        towerFloor: 1, inventory: {}, equipment: {}, skills: [],
        sectId: -1, sectRank: 0, // -1 表示无门派
        selectedMonsterIdx: 0, lastSaveTime: Date.now() 
    },
    player: null, currentMap: 'field', isFighting: false,
    saveKey: 'cultivation_save_v16_sect', // 再次更新 Key 确保数据结构兼容

    init() {
        this.player = JSON.parse(JSON.stringify(this.defaultPlayer));
        this.load();
        if (isNaN(this.player.maxHp) || this.player.maxHp <= 0) this.player = JSON.parse(JSON.stringify(this.defaultPlayer));
        // 兼容旧档：补充字段
        if (this.player.reputation === undefined) this.player.reputation = 0;
        if (this.player.sectId === undefined) { this.player.sectId = -1; this.player.sectRank = 0; }
        if (!this.player.skills) this.player.skills = [];

        this.calcOfflineProfit();
        this.recalcStats();
        this.updateUI();
        if (this.currentMap === 'field') this.loop(); 
    },

    // --- 门派系统 ---
    joinSect(id) {
        const sect = GAME_DATA.sects[id];
        if (this.player.sectId !== -1) { alert("你已有门派，需先退出（功能开发中）"); return; }
        if (this.player.realmIdx < sect.reqRealm) { alert("境界不足，无法加入！"); return; }
        
        this.player.sectId = id;
        this.player.sectRank = 0;
        this.log(`恭喜加入 [${sect.name}]，成为外门弟子！`, 'win');
        this.save(); this.updateUI(); this.showSectPanel();
    },

    promoteSect() {
        if (this.player.sectId === -1) return;
        const sect = GAME_DATA.sects[this.player.sectId];
        const nextRankIdx = this.player.sectRank + 1;
        if (nextRankIdx >= sect.ranks.length) { alert("已至本门最高职位！"); return; }
        
        const nextRank = sect.ranks[nextRankIdx];
        if (this.player.reputation >= nextRank.cost) {
            this.player.reputation -= nextRank.cost;
            this.player.sectRank++;
            this.log(`晋升成功！当前职位：[${nextRank.name}]`, 'win');
            this.save(); this.updateUI(); this.showSectPanel();
        } else {
            alert(`名望不足！需要 ${nextRank.cost} 名望`);
        }
    },

    // --- 物品与技能系统 ---
    useItem(key) {
        const item = GAME_DATA.items[key];
        if (!item) return;

        // 1. 使用功法书
        if (item.type === "book") {
            if (this.player.skills.includes(item.skillId)) { alert("你已学会此功法！"); return; }
            this.player.skills.push(item.skillId);
            this.player.inventory[key]--;
            this.log(`领悟功法：[${GAME_DATA.skills[item.skillId].name}]`, 'win');
        }
        // 2. 使用修为果
        else if (item.effect && item.effect.type === "exp") {
            this.player.exp += item.effect.val;
            this.player.inventory[key]--;
            this.log(`服用 [${item.name}]，修为 +${item.effect.val}`, 'win');
        }
        
        if (this.player.inventory[key] <= 0) delete this.player.inventory[key];
        this.save(); this.updateUI(); this.refreshPanel();
    },

    // 购买逻辑 (修改为通用，支持名望/灵石)
    buyItem(id, currencyType = 'money') {
        const item = GAME_DATA.items[id];
        if (currencyType === 'money') {
            if (this.player.money >= item.price) {
                this.player.money -= item.price;
                this.addItem(id, 1);
                this.log(`购买 [${item.name}] 成功`, 'win');
            } else alert("灵石不足");
        }
        this.save(); this.updateUI();
        if (document.getElementById('monster-selector').style.display !== 'none') this.showShop(); // 刷新商店
        if (document.getElementById('sect-panel').style.display !== 'none') this.showSectPanel(); // 刷新门派商店
    },

    // --- 战斗循环 (接入技能系统) ---
    loop() {
        if (this.isFighting) return;
        let e;
        try {
            if (this.currentMap === 'boss' && this.currentBoss) {
                const b = this.currentBoss;
                e = { name: b.name, hp: this.player.maxHp * b.hpMult, atk: this.player.def * b.atkMult, def: 0, exp: b.exp, money: b.money, reputation: b.reputation, loot: b.drops };
            } else if (this.currentMap === 'tower') {
                e = GAME_DATA.maps.tower.genEnemy(this.player, this.player.towerFloor);
            } else if (this.currentMap === 'field') {
                e = GAME_DATA.maps.field.genEnemy(this.player, this.player.selectedMonsterIdx);
            } else return;
        } catch(err) { return; }

        this.isFighting = true;
        // 把已学技能列表传给 Battle
        Battle.start(this.player, e, this.player.skills,
            () => { // Win
                this.isFighting = false;
                this.gainReward(e);
                if (this.currentMap === 'tower') this.player.towerFloor++;
                if (this.currentMap === 'boss') this.switchMap('field');
                this.player.hp = this.player.maxHp;
                this.save(); this.updateUI();
                setTimeout(() => this.loop(), 1000);
            },
            () => { // Lose
                this.isFighting = false;
                this.log(`被 ${e.name} 击败...`, 'lose');
                if (this.currentMap === 'boss') this.switchMap('field');
                this.player.hp = this.player.maxHp;
                setTimeout(() => this.loop(), 2000);
            },
            (msg) => this.log(msg, 'skill') // 战斗日志回调
        );
    },

    gainReward(e) {
        this.player.exp += e.exp; 
        this.player.money += (e.money || 0);
        const rep = e.reputation || 0;
        this.player.reputation += rep;
        
        if (e.loot) e.loot.forEach(k => { if(Math.random() < 0.25) this.addItem(k, 1); });
        this.log(`胜! 修为+${e.exp} 灵石+${e.money} 名望+${rep}`, 'win');
    },

    // --- 界面与辅助 ---
    // 显示门派面板
    showSectPanel() {
        const panel = document.getElementById('sect-panel');
        panel.classList.remove('hidden');
        
        const infoBox = document.getElementById('sect-info');
        const shopBox = document.getElementById('sect-shop');
        
        if (this.player.sectId === -1) {
            // 未加入门派
            infoBox.innerHTML = `<p>你尚未加入任何门派，暂无名望传承。</p><h3>可加入门派：</h3>`;
            GAME_DATA.sects.forEach((s, i) => {
                infoBox.innerHTML += `
                    <div class="monster-card">
                        <div><b>${s.name}</b><br>要求: ${GAME_DATA.realms[GAME_DATA.majorRealms.indexOf(GAME_DATA.majorRealms[s.reqRealm]) * 10]?.name || "练气期"}</div>
                        <button class="item-btn btn-buy" onclick="Game.joinSect(${i})">加入</button>
                    </div>`;
            });
            shopBox.innerHTML = '';
        } else {
            // 已加入
            const sect = GAME_DATA.sects[this.player.sectId];
            const rank = sect.ranks[this.player.sectRank];
            const nextRank = sect.ranks[this.player.sectRank + 1];
            
            infoBox.innerHTML = `
                <h2>${sect.name}</h2>
                <p>当前职位：<span style="color:var(--accent-gold)">${rank.name}</span></p>
                <p>门派名望：${this.player.reputation}</p>
                ${nextRank ? `<button class="item-btn btn-buy" onclick="Game.promoteSect()">晋升 ${nextRank.name} (需${nextRank.cost}名望)</button>` : '<p>已至巅峰</p>'}
            `;
            
            shopBox.innerHTML = `<h3>宗门藏经阁 (消耗灵石)</h3><div class="grid-list" style="display:grid;grid-template-columns:1fr 1fr;gap:5px"></div>`;
            const list = shopBox.querySelector('.grid-list');
            sect.shop.forEach(id => {
                const it = GAME_DATA.items[id];
                list.innerHTML += `
                    <div class="item-card">
                        <div>${it.name}</div>
                        <div style="font-size:0.7em;color:#aaa">${it.price}灵石</div>
                        <button class="item-btn" onclick="Game.buyItem('${id}')">兑换</button>
                    </div>`;
            });
        }
    },

    refreshPanel() {
        // ... (保持原有的装备/背包刷新逻辑)
        // 在背包渲染中，如果是 book/exp_fruit，按钮显示 "使用"
        const p = document.getElementById('character-panel');
        if (p.classList.contains('hidden')) return;

        // ... (装备渲染略)
        // ... (属性渲染略)
        document.getElementById('detail-atk').innerText = this.player.atk;
        document.getElementById('detail-def').innerText = this.player.def;
        document.getElementById('detail-hp').innerText = this.player.maxHp;

        const grid = document.getElementById('inventory-grid'); grid.innerHTML = '';
        for (let [k, c] of Object.entries(this.player.inventory)) {
            const item = GAME_DATA.items[k];
            const isEquip = k.includes('_');
            const desc = isEquip ? "装备" : (item?.desc || "材料");
            
            let actionBtn = '';
            if (isEquip) actionBtn = `<button class="item-btn" onclick="Game.equip('${k}')">装备</button>`;
            else if (item && (item.type === 'book' || item.effect)) actionBtn = `<button class="item-btn btn-buy" onclick="Game.useItem('${k}')">使用</button>`;

            grid.innerHTML += `
                <div class="item-card ${isEquip ? 'tier-'+k.split('_')[1] : ''}">
                    <div style="font-weight:bold">${this.getItemName(k)}</div>
                    <div style="font-size:0.7em;color:#aaa">${desc}</div>
                    <div>x${c}</div>
                    <div class="btn-group">${actionBtn}<button class="item-btn btn-sell" onclick="Game.sellItem('${k}')">售出</button></div>
                </div>`;
        }
        
        // 新增：显示已学功法
        const skillBox = document.getElementById('skill-list-display');
        if (skillBox) {
            skillBox.innerHTML = this.player.skills.length ? '' : '<div style="color:#666;font-size:0.8em">暂无功法</div>';
            this.player.skills.forEach(sid => {
                const sk = GAME_DATA.skills[sid];
                skillBox.innerHTML += `<div class="skill-tag">${sk.name}</div>`;
            });
        }
    },

    // ... (保持其他 switchMap, showShop, save, load, etc. 不变，注意 switchMap 要加 sect case)
    switchMap(m) {
        if(this.isFighting) Battle.stop(); this.isFighting = false;
        this.currentMap = m;
        document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
        if (event && event.target) event.target.classList.add('active');
        
        const modal = document.getElementById('monster-selector');
        const list = document.getElementById('monster-list');
        const title = document.getElementById('selector-title');
        document.getElementById('sect-panel').classList.add('hidden'); // 隐藏门派

        if (m === 'sect') {
            this.showSectPanel();
        } else if (m === 'shop') {
            modal.classList.remove('hidden'); title.innerText = "万宝阁"; list.innerHTML = "";
            // 添加修为果实到商店
            ["ticket_1", "ticket_2", "ticket_3", "筑基丹", "exp_fruit_1", "exp_fruit_2"].forEach(id => {
                const it = GAME_DATA.items[id];
                list.innerHTML += `<div class="monster-card" style="display:block;text-align:center"><b>${it.name}</b><br>${it.desc}<div style="color:gold">${it.price}灵石</div><button class="item-btn btn-buy" onclick="Game.buyItem('${id}')">购买</button></div>`;
            });
        } 
        // ... (boss, field 逻辑保持不变)
        else if (m === 'boss') {
            modal.classList.remove('hidden'); title.innerText = "首领列表"; list.innerHTML = "";
            GAME_DATA.bosses.forEach((b, i) => { list.innerHTML += `<div class="monster-card" onclick="Game.challengeBoss(${i})"><div><b>${b.name}</b> Lv.${b.level}</div><div>需: ${GAME_DATA.items[b.ticket].name}</div></div>`; });
        } else if (m === 'field') {
            modal.classList.remove('hidden'); title.innerText = "选择挂机点"; list.innerHTML = "";
            GAME_DATA.fieldMonsters.forEach((mon, i) => { list.innerHTML += `<div class="monster-card" onclick="Game.selectMonster(${i})"><b>${mon.name}</b> Lv.${mon.level}</div>`; });
        } else {
            this.loop();
        }
    },

    // ... (其他辅助函数保持不变：recalcStats, log, calcOfflineProfit, etc)
    calcOfflineProfit() { /* 同上一版 */ const now = Date.now(); const diff = (now - (this.player.lastSaveTime || now)) / 1000; if (diff > 60) { const m = GAME_DATA.fieldMonsters[this.player.selectedMonsterIdx || 0]; const count = Math.min(Math.floor(diff / 5), 17280); if (count > 0) { const gainExp = m.exp * count; const gainMoney = m.money * count; const gainRep = (m.reputation||0) * count; this.player.exp += gainExp; this.player.money += gainMoney; this.player.reputation += gainRep; alert(`离线挂机 ${Math.floor(diff/60)} 分钟\n击败 [${m.name}] x${count}\n获得: 修为+${gainExp}, 灵石+${gainMoney}, 名望+${gainRep}`); } } this.player.lastSaveTime = now; },
    log(msg, type) { const box = document.getElementById('log-container'); if (box) { const div = document.createElement('div'); div.className = `log-entry log-${type||'normal'}`; div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`; box.prepend(div); if (box.children.length > 50) box.lastChild.remove(); } },
    toggleCharacterPanel() { document.getElementById('character-panel').classList.toggle('hidden'); this.refreshPanel(); },
    addItem(k, c) { this.player.inventory[k] = (this.player.inventory[k] || 0) + c; },
    getItemName(k) { if (k.includes('_')) { const [t, tr] = k.split('_'); if (GAME_DATA.equipSlots[t]) return `${tr}阶·${GAME_DATA.equipSlots[t]}`; } return GAME_DATA.items[k] ? GAME_DATA.items[k].name : k; },
    challengeBoss(idx) { const boss = GAME_DATA.bosses[idx]; if ((this.player.inventory[boss.ticket] || 0) > 0) { this.player.inventory[boss.ticket]--; this.currentMap = 'boss'; this.isFighting = false; this.currentBoss = boss; document.getElementById('monster-selector').classList.add('hidden'); this.log(`开始挑战 [${boss.name}]！`, 'normal'); this.loop(); } else alert(`需要: ${GAME_DATA.items[boss.ticket].name}`); },
    selectMonster(i) { this.player.selectedMonsterIdx = i; document.getElementById('monster-selector').classList.add('hidden'); this.currentMap = 'field'; this.loop(); },
    equip(k) { const [t, tr] = k.split('_'); if (this.player.equipment[t]) this.addItem(this.player.equipment[t].id, 1); this.player.equipment[t] = { id: k, tier: parseInt(tr) }; this.player.inventory[k]--; if (this.player.inventory[k]<=0) delete this.player.inventory[k]; this.recalcStats(); this.save(); this.refreshPanel(); this.updateUI(); },
    unequip(s) { if (!this.player.equipment[s]) return; this.addItem(this.player.equipment[s].id, 1); delete this.player.equipment[s]; this.recalcStats(); this.save(); this.refreshPanel(); this.updateUI(); },
    sellItem(k) { if (!this.player.inventory[k]) return; let p = 5; if (k.includes('_')) p = parseInt(k.split('_')[1]) * 50; else if (GAME_DATA.items[k]) p = GAME_DATA.items[k].price / 2; this.player.money += Math.floor(p); this.player.inventory[k]--; if(this.player.inventory[k]<=0) delete this.player.inventory[k]; this.log(`售出 [${this.getItemName(k)}]`, 'win'); this.save(); this.updateUI(); this.refreshPanel(); },
    synthesizeAll() { let ok = false; for (let k in this.player.inventory) { if (k.includes('_') && this.player.inventory[k] >= 3) { const [t, tr] = k.split('_'); const tier = parseInt(tr); if (tier < 20) { const n = Math.floor(this.player.inventory[k]/3); this.player.inventory[k] %= 3; if (this.player.inventory[k]===0) delete this.player.inventory[k]; this.addItem(`${t}_${tier+1}`, n); ok = true; } } } if (ok) { this.log("一键合成成功", 'win'); this.save(); this.refreshPanel(); } else alert("无可合成装备"); },
    breakthrough() { const r = GAME_DATA.realms[this.player.realmIdx]; const nr = GAME_DATA.realms[this.player.realmIdx+1]; if (nr && this.player.exp >= r.exp) { this.player.exp -= r.exp; this.player.realmIdx++; const factor = nr.isMajor ? 1.5 : 1.1; this.player.baseStats.hp = Math.floor(this.player.baseStats.hp * factor); this.player.baseStats.atk = Math.floor(this.player.baseStats.atk * factor); this.recalcStats(); this.save(); this.updateUI(); this.log(`突破至 ${nr.name}`, 'win'); } else alert("修为不足"); },
    recalcStats() { let p = this.player; const r = GAME_DATA.realms[p.realmIdx] || GAME_DATA.realms[0]; p.maxHp = Math.floor(p.baseStats.hp * r.mult); p.atk = Math.floor(p.baseStats.atk * r.mult); p.def = Math.floor(p.baseStats.def * r.mult); for (let s in p.equipment) { if(p.equipment[s]) { const st = GAME_DATA.getEquipStats(s, p.equipment[s].tier); p.maxHp+=st.hp; p.atk+=st.atk; p.def+=st.def; } } if (p.hp > p.maxHp) p.hp = p.maxHp; },
    save() { this.player.lastSaveTime = Date.now(); localStorage.setItem(this.saveKey, JSON.stringify(this.player)); },
    load() { const s = localStorage.getItem(this.saveKey); if (s) this.player = JSON.parse(s); },
    updateUI() {
        const r = GAME_DATA.realms[this.player.realmIdx] || GAME_DATA.realms[0];
        document.getElementById('realm-title').innerText = r.name;
        document.getElementById('val-hp').innerText = Math.floor(this.player.hp); document.getElementById('val-max-hp').innerText = this.player.maxHp;
        document.getElementById('val-atk').innerText = this.player.atk; document.getElementById('val-def').innerText = this.player.def;
        document.getElementById('val-exp').innerText = Math.floor(this.player.exp); document.getElementById('val-max-exp').innerText = r.exp;
        document.getElementById('val-money').innerText = this.player.money; document.getElementById('tower-floor').innerText = this.player.towerFloor;
        // 更新名望
        document.getElementById('val-rep').innerText = this.player.reputation;
    }
};

const Logger = { log: (m, t) => Game.log(m, t) };
window.onload = () => Game.init();
