const Game = {
    player: { 
        realmIdx: 0, baseStats: { hp: 150, atk: 15, def: 5 }, 
        hp: 150, maxHp: 150, atk: 15, def: 5, exp: 0, money: 0, 
        towerFloor: 1, inventory: {}, equipment: {}, 
        selectedMonsterIdx: 0, lastSaveTime: Date.now() 
    },
    currentMap: 'field', isFighting: false,

    init() {
        this.load();
        this.calcOfflineProfit();
        this.recalcStats();
        this.updateUI();
        // 自动开始
        if (this.currentMap === 'field') this.loop(); 
    },

    // 离线挂机
    calcOfflineProfit() {
        const now = Date.now();
        const diff = (now - (this.player.lastSaveTime || now)) / 1000;
        if (diff > 60) {
            const m = GAME_DATA.fieldMonsters[this.player.selectedMonsterIdx || 0];
            const count = Math.min(Math.floor(diff / 5), 17280); // 5秒一只，上限24h
            if (count > 0) {
                const gainExp = m.exp * count;
                const gainMoney = m.money * count;
                this.player.exp += gainExp;
                this.player.money += gainMoney;
                alert(`离线挂机 ${Math.floor(diff/60)} 分钟\n击败 [${m.name}] x${count}\n获得: 修为+${gainExp}, 灵石+${gainMoney}`);
                this.log(`离线收益: 修为+${gainExp}, 灵石+${gainMoney}`, 'win');
            }
        }
        this.player.lastSaveTime = now;
    },

    // 战斗日志 (修复DOM引用)
    log(msg, type) {
        const box = document.getElementById('log-container');
        if (box) {
            const div = document.createElement('div');
            div.className = `log-entry log-${type||'normal'}`;
            div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
            box.prepend(div); // 最新日志在最上
            if (box.children.length > 50) box.lastChild.remove();
        }
    },

    // 商城
    buyItem(id) {
        const item = GAME_DATA.items[id];
        if (this.player.money >= item.price) {
            this.player.money -= item.price;
            this.addItem(id, 1);
            this.log(`购买 [${item.name}] 成功`, 'win');
            this.updateUI(); this.showShop(); // 刷新商店显示
        } else alert("灵石不足");
    },

    // Boss逻辑
    challengeBoss(idx) {
        const boss = GAME_DATA.bosses[idx];
        if ((this.player.inventory[boss.ticket] || 0) > 0) {
            this.player.inventory[boss.ticket]--;
            this.currentMap = 'boss';
            this.isFighting = false;
            this.currentBoss = boss;
            document.getElementById('monster-selector').classList.add('hidden');
            this.log(`使用了 [${GAME_DATA.items[boss.ticket].name}]，开始挑战！`, 'normal');
            this.loop();
        } else {
            alert(`需要: ${GAME_DATA.items[boss.ticket].name}`);
        }
    },

    // 循环
    loop() {
        if (this.isFighting) return;
        
        let e;
        if (this.currentMap === 'boss' && this.currentBoss) {
            const b = this.currentBoss;
            e = { name: b.name, hp: this.player.maxHp * b.hpMult, atk: this.player.def * b.atkMult, def: 0, exp: b.exp, money: b.money, loot: b.drops };
        } else if (this.currentMap === 'tower') {
            e = GAME_DATA.maps.tower.genEnemy(this.player, this.player.towerFloor);
        } else if (this.currentMap === 'field') {
            e = GAME_DATA.maps.field.genEnemy(this.player, this.player.selectedMonsterIdx);
        } else {
            return; // 商城状态不战斗
        }

        this.isFighting = true;
        Battle.start(this.player, e, 
            () => { // Win
                this.isFighting = false;
                this.gainReward(e);
                if (this.currentMap === 'tower') this.player.towerFloor++;
                if (this.currentMap === 'boss') this.switchMap('field'); // Boss打完回城
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
            }
        );
    },

    gainReward(e) {
        this.player.exp += e.exp; this.player.money += (e.money || 0);
        if (e.loot) e.loot.forEach(k => { if(Math.random() < 0.25) this.addItem(k, 1); });
        this.log(`击败 ${e.name}, 修为+${e.exp}, 灵石+${e.money}`, 'win');
    },

    // 辅助函数
    getItemName(k) {
        if (k.includes('_')) {
            const [t, tr] = k.split('_');
            if (GAME_DATA.equipSlots[t]) return `${tr}阶·${GAME_DATA.equipSlots[t]}`;
        }
        return GAME_DATA.items[k] ? GAME_DATA.items[k].name : k;
    },
    addItem(k, c) { this.player.inventory[k] = (this.player.inventory[k] || 0) + c; },
    
    // UI - 背包面板
    refreshPanel() {
        const p = document.getElementById('character-panel');
        if (p.classList.contains('hidden')) return;

        // 装备
        for (let s in GAME_DATA.equipSlots) {
            const el = document.getElementById(`slot-${s}`);
            const eq = this.player.equipment[s];
            el.innerText = eq ? `${this.getItemName(eq.id)}\n(卸下)` : `${GAME_DATA.equipSlots[s]}: 空`;
            el.className = eq ? `slot equipped tier-${Math.min(10, eq.tier)}` : 'slot';
        }
        // 属性
        document.getElementById('detail-atk').innerText = this.player.atk;
        document.getElementById('detail-def').innerText = this.player.def;
        document.getElementById('detail-hp').innerText = this.player.maxHp;
        // 物品
        const grid = document.getElementById('inventory-grid'); grid.innerHTML = '';
        for (let [k, c] of Object.entries(this.player.inventory)) {
            const isEquip = k.includes('_');
            const desc = isEquip ? "装备" : (GAME_DATA.items[k]?.desc || "材料");
            const btn1 = isEquip ? `<button class="item-btn" onclick="Game.equip('${k}')">装备</button>` : '';
            grid.innerHTML += `
                <div class="item-card ${isEquip ? 'tier-'+k.split('_')[1] : ''}">
                    <div style="font-weight:bold">${this.getItemName(k)}</div>
                    <div style="font-size:0.7em;color:#aaa">${desc}</div>
                    <div>x${c}</div>
                    <div class="btn-group">${btn1}<button class="item-btn btn-sell" onclick="Game.sellItem('${k}')">售出</button></div>
                </div>`;
        }
    },
    
    toggleCharacterPanel() { 
        document.getElementById('character-panel').classList.toggle('hidden'); 
        this.refreshPanel(); 
    },
    
    // UI - 商店/选怪
    switchMap(m) {
        if(this.isFighting) Battle.stop(); this.isFighting = false;
        this.currentMap = m;
        document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
        if (event && event.target) event.target.classList.add('active');
        
        const modal = document.getElementById('monster-selector');
        const list = document.getElementById('monster-list');
        const title = document.getElementById('selector-title');
        
        if (m === 'shop') {
            modal.classList.remove('hidden'); title.innerText = "万宝阁"; list.innerHTML = "";
            ["ticket_1", "ticket_2", "ticket_3", "筑基丹"].forEach(id => {
                const it = GAME_DATA.items[id];
                list.innerHTML += `<div class="monster-card" style="display:block;text-align:center"><b>${it.name}</b><br>${it.desc}<div style="color:gold">${it.price}灵石</div><button class="item-btn btn-buy" onclick="Game.buyItem('${id}')">购买</button></div>`;
            });
        } else if (m === 'boss') {
            modal.classList.remove('hidden'); title.innerText = "首领列表"; list.innerHTML = "";
            GAME_DATA.bosses.forEach((b, i) => {
                list.innerHTML += `<div class="monster-card" onclick="Game.challengeBoss(${i})"><div><b>${b.name}</b> Lv.${b.level}</div><div>需: ${GAME_DATA.items[b.ticket].name}</div></div>`;
            });
        } else if (m === 'field') {
            modal.classList.remove('hidden'); title.innerText = "选择挂机点"; list.innerHTML = "";
            GAME_DATA.fieldMonsters.forEach((mon, i) => {
                list.innerHTML += `<div class="monster-card" onclick="Game.selectMonster(${i})"><b>${mon.name}</b> Lv.${mon.level}</div>`;
            });
        } else {
            this.loop();
        }
    },

    showShop() { this.switchMap('shop'); }, // 快捷刷新

    // 基础操作
    selectMonster(i) { this.player.selectedMonsterIdx = i; document.getElementById('monster-selector').classList.add('hidden'); this.currentMap = 'field'; this.loop(); },
    equip(k) { 
        const [t, tr] = k.split('_'); 
        if (this.player.equipment[t]) this.addItem(this.player.equipment[t].id, 1);
        this.player.equipment[t] = { id: k, tier: parseInt(tr) };
        this.player.inventory[k]--; if (this.player.inventory[k]<=0) delete this.player.inventory[k];
        this.recalcStats(); this.save(); this.refreshPanel(); this.updateUI();
    },
    unequip(s) {
        if (!this.player.equipment[s]) return;
        this.addItem(this.player.equipment[s].id, 1);
        delete this.player.equipment[s];
        this.recalcStats(); this.save(); this.refreshPanel(); this.updateUI();
    },
    sellItem(k) {
        if (!this.player.inventory[k]) return;
        let p = 5;
        if (k.includes('_')) p = parseInt(k.split('_')[1]) * 50;
        else if (GAME_DATA.items[k]) p = GAME_DATA.items[k].price / 2;
        this.player.money += Math.floor(p);
        this.player.inventory[k]--; if(this.player.inventory[k]<=0) delete this.player.inventory[k];
        this.log(`售出 [${this.getItemName(k)}]`, 'win');
        this.save(); this.updateUI(); this.refreshPanel();
    },
    synthesizeAll() {
        let ok = false;
        for (let k in this.player.inventory) {
            if (k.includes('_') && this.player.inventory[k] >= 3) {
                const [t, tr] = k.split('_'); const tier = parseInt(tr);
                if (tier < 20) {
                    const n = Math.floor(this.player.inventory[k]/3);
                    this.player.inventory[k] %= 3; if (this.player.inventory[k]===0) delete this.player.inventory[k];
                    this.addItem(`${t}_${tier+1}`, n); ok = true;
                }
            }
        }
        if (ok) { this.log("一键合成成功", 'win'); this.save(); this.refreshPanel(); } else alert("无可合成装备");
    },
    breakthrough() {
        const r = GAME_DATA.realms[this.player.realmIdx]; const nr = GAME_DATA.realms[this.player.realmIdx+1];
        if (nr && this.player.exp >= r.exp) {
            this.player.exp -= r.exp; this.player.realmIdx++;
            const factor = nr.isMajor ? 1.5 : 1.1;
            this.player.baseStats.hp = Math.floor(this.player.baseStats.hp * factor);
            this.player.baseStats.atk = Math.floor(this.player.baseStats.atk * factor);
            this.recalcStats(); this.save(); this.updateUI(); this.log(`突破至 ${nr.name}`, 'win');
        } else alert("修为不足");
    },
    recalcStats() {
        let p = this.player; const r = GAME_DATA.realms[p.realmIdx] || GAME_DATA.realms[0];
        p.maxHp = Math.floor(p.baseStats.hp * r.mult); p.atk = Math.floor(p.baseStats.atk * r.mult); p.def = Math.floor(p.baseStats.def * r.mult);
        for (let s in p.equipment) { if(p.equipment[s]) { const st = GAME_DATA.getEquipStats(s, p.equipment[s].tier); p.maxHp+=st.hp; p.atk+=st.atk; p.def+=st.def; } }
        if (p.hp > p.maxHp) p.hp = p.maxHp;
    },
    save() { this.player.lastSaveTime = Date.now(); localStorage.setItem('cultivation_save_v14', JSON.stringify(this.player)); },
    load() { const s = localStorage.getItem('cultivation_save_v14'); if (s) this.player = JSON.parse(s); },
    updateUI() {
        const r = GAME_DATA.realms[this.player.realmIdx] || GAME_DATA.realms[0];
        document.getElementById('realm-title').innerText = r.name;
        document.getElementById('val-hp').innerText = Math.floor(this.player.hp); document.getElementById('val-max-hp').innerText = this.player.maxHp;
        document.getElementById('val-atk').innerText = this.player.atk; document.getElementById('val-def').innerText = this.player.def;
        document.getElementById('val-exp').innerText = Math.floor(this.player.exp); document.getElementById('val-max-exp').innerText = r.exp;
        document.getElementById('val-money').innerText = this.player.money; document.getElementById('tower-floor').innerText = this.player.towerFloor;
    }
};

// 代理 Log
const Logger = { log: (m, t) => Game.log(m, t) };
window.onload = () => Game.init();
