const Game = {
    player: { 
        realmIdx: 0, baseStats: { hp: 200, atk: 20, def: 10 }, 
        hp: 200, maxHp: 200, atk: 20, def: 10, exp: 0, money: 0, 
        towerFloor: 1, inventory: {}, equipment: {}, 
        selectedMonsterIdx: 0, lastSaveTime: Date.now() 
    },
    currentMap: 'field', isFighting: false,

    init() {
        this.load();
        this.calcOfflineProfit(); // 计算挂机收益
        this.recalcStats();
        this.updateUI();
        this.loop();
    },

    // 离线挂机逻辑
    calcOfflineProfit() {
        const now = Date.now();
        const offlineTime = (now - this.player.lastSaveTime) / 1000; // 秒
        if (offlineTime > 60) { // 离线超过1分钟才结算
            const monster = GAME_DATA.fieldMonsters[this.player.selectedMonsterIdx];
            const killSpeed = 5; // 假设5秒杀一只
            const count = Math.min(Math.floor(offlineTime / killSpeed), 17280); // 最多挂机24小时
            
            const earnedExp = monster.exp * count;
            const earnedMoney = monster.money * count;
            this.player.exp += earnedExp;
            this.player.money += earnedMoney;
            
            alert(`欢迎归来，宗主！离线挂机 ${Math.floor(offlineTime/60)} 分钟，击败 ${monster.name} x${count}，获得修为 ${earnedExp}，灵石 ${earnedMoney}`);
        }
        this.player.lastSaveTime = now;
    },

    // 战斗日志修复
    log(msg, type) {
        const logBox = document.getElementById('log-container');
        if(!logBox) return;
        const div = document.createElement('div');
        div.className = `log-entry log-${type}`;
        div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logBox.prepend(div);
        if (logBox.childNodes.length > 50) logBox.lastChild.remove();
    },

    // 商城购买
    buyItem(id) {
        const item = GAME_DATA.items[id];
        if (this.player.money >= item.price) {
            this.player.money -= item.price;
            this.addItem(id, 1);
            this.log(`购买了 [${item.name}]`, 'win');
            this.updateUI();
            this.refreshShop();
        } else alert("灵石不足！");
    },

    // 首领挑战
    challengeBoss(idx) {
        const boss = GAME_DATA.bosses[idx];
        if (this.player.inventory[boss.ticket] > 0) {
            this.player.inventory[boss.ticket]--;
            this.currentMap = 'boss';
            this.isFighting = false;
            this.currentBoss = boss;
            this.loop();
        } else {
            alert(`挑战此首领需消耗 [${GAME_DATA.items[boss.ticket].name}]`);
        }
    },

    loop() {
        if (this.isFighting) return;
        let e;
        if (this.currentMap === 'boss' && this.currentBoss) {
            const b = this.currentBoss;
            e = { name: b.name, hp: this.player.maxHp * b.hpMult, atk: this.player.def * b.atkMult, def: 0, exp: b.exp, money: b.money, loot: b.drops };
        } else if (this.currentMap === 'tower') {
            e = GAME_DATA.maps.tower.genEnemy(this.player, this.player.towerFloor);
        } else {
            e = GAME_DATA.maps.field.genEnemy(this.player, this.player.selectedMonsterIdx);
        }

        this.isFighting = true;
        Battle.start(this.player, e, 
            () => { // 胜利
                this.isFighting = false;
                this.gainReward(e);
                if(this.currentMap === 'boss') this.currentMap = 'field'; 
                if(this.currentMap === 'tower') this.player.towerFloor++;
                this.player.hp = this.player.maxHp;
                this.save(); this.updateUI();
                setTimeout(() => this.loop(), 1000);
            }, 
            () => { // 失败
                this.isFighting = false;
                if(this.currentMap === 'boss') this.currentMap = 'field';
                this.player.hp = this.player.maxHp;
                setTimeout(() => this.loop(), 2000);
            }
        );
    },

    gainReward(e) {
        this.player.exp += e.exp; this.player.money += e.money;
        if (e.loot) e.loot.forEach(k => { if(Math.random() < 0.2) this.addItem(k, 1); }); // 掉率提高
        this.log(`击败 ${e.name}，获得修为 ${e.exp}，灵石 ${e.money}`, 'win');
    },

    // UI刷新与面板（此处省略部分重复的UI代码，重点是商城渲染）
    refreshShop() {
        const shopList = document.getElementById('shop-list');
        if(!shopList) return;
        shopList.innerHTML = '';
        ["ticket_1", "ticket_2", "ticket_3"].forEach(id => {
            const it = GAME_DATA.items[id];
            shopList.innerHTML += `<div class="item-card"><b>${it.name}</b><br>${it.price}灵石<br><button onclick="Game.buyItem('${id}')">购买</button></div>`;
        });
    },

    save() { 
        this.player.lastSaveTime = Date.now();
        localStorage.setItem('cultivation_save_v14', JSON.stringify(this.player)); 
    },
    load() { 
        const s = localStorage.getItem('cultivation_save_v14'); 
        if (s) this.player = JSON.parse(s); 
    },
    addItem(k, c) { this.player.inventory[k] = (this.player.inventory[k] || 0) + c; },
    updateUI() {
        const r = GAME_DATA.realms[this.player.realmIdx] || GAME_DATA.realms[0];
        document.getElementById('realm-title').innerText = r.name;
        document.getElementById('val-hp').innerText = Math.floor(this.player.hp);
        document.getElementById('val-max-hp').innerText = this.player.maxHp;
        document.getElementById('val-atk').innerText = this.player.atk;
        document.getElementById('val-def').innerText = this.player.def;
        document.getElementById('val-exp').innerText = Math.floor(this.player.exp);
        document.getElementById('val-max-exp').innerText = r.exp;
        document.getElementById('val-money').innerText = this.player.money;
        document.getElementById('tower-floor').innerText = this.player.towerFloor;
    },
    recalcStats() {
        let p = this.player; const r = GAME_DATA.realms[p.realmIdx] || GAME_DATA.realms[0];
        p.maxHp = Math.floor(p.baseStats.hp * r.mult);
        p.atk = Math.floor(p.baseStats.atk * r.mult);
        p.def = Math.floor(p.baseStats.def * r.mult);
        for (let s in p.equipment) {
            const item = p.equipment[s];
            if (item) { const st = GAME_DATA.getEquipStats(s, item.tier); p.maxHp += st.hp; p.atk += st.atk; p.def += st.def; }
        }
    },
    // 地图切换与怪物选择等逻辑...
    switchMap(m) { 
        this.currentMap = m; 
        if(m === 'boss') this.showBossList();
        else if(m === 'shop') this.showShop();
        else if(m === 'field') this.showMonsterSelector();
    },
    showBossList() {
        const modal = document.getElementById('monster-selector');
        const list = document.getElementById('monster-list');
        modal.classList.remove('hidden'); list.innerHTML = '<h3>挑战首领</h3>';
        GAME_DATA.bosses.forEach((b, i) => {
            list.innerHTML += `<div class="monster-card" onclick="Game.challengeBoss(${i})">${b.name} (Lv.${b.level})<br>需要:${GAME_DATA.items[b.ticket].name}</div>`;
        });
    },
    showShop() {
        const modal = document.getElementById('monster-selector');
        const list = document.getElementById('monster-list');
        modal.classList.remove('hidden'); list.innerHTML = '<h3>万宝阁</h3><div id="shop-list"></div>';
        this.refreshShop();
    },
    showMonsterSelector() {
        const modal = document.getElementById('monster-selector');
        const list = document.getElementById('monster-list');
        modal.classList.remove('hidden'); list.innerHTML = '<h3>挂机选择</h3>';
        GAME_DATA.fieldMonsters.forEach((m, i) => {
            list.innerHTML += `<div class="monster-card" onclick="Game.selectMonster(${i})">${m.name} (Lv.${m.level})</div>`;
        });
    },
    selectMonster(i) { this.player.selectedMonsterIdx = i; document.getElementById('monster-selector').classList.add('hidden'); this.currentMap = 'field'; this.isFighting = false; this.loop(); }
};

// 覆盖原有的 Logger，确保战斗信息输出
const Logger = { log: (m, t) => Game.log(m, t) };
window.onload = () => Game.init();
