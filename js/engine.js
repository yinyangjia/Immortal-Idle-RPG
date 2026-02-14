// js/engine.js
const Game = {
    player: {
        realmIdx: 0,
        baseStats: { hp: 100, atk: 10, def: 2 }, // 裸装属性
        hp: 100, maxHp: 100, atk: 10, def: 2, pen: 0,
        exp: 0, money: 0,
        towerFloor: 1,
        inventory: {}, 
        equipment: {}, 
        selectedMonsterIdx: 0
    },
    currentMap: 'field',
    isFighting: false,

    init() {
        this.load();
        // 修复：如果存档里的 realmIdx 超过了新数据的长度，重置
        if (this.player.realmIdx >= GAME_DATA.realms.length) {
            this.player.realmIdx = 0;
            this.player.baseStats = { hp: 100, atk: 10, def: 2 };
        }
        this.recalcStats();
        this.updateUI();
        if(this.currentMap !== 'field') this.loop();
    },

    loop() {
        if (this.isFighting) return;
        
        let enemy;
        if (this.currentMap === 'tower') enemy = GAME_DATA.maps.tower.genEnemy(this.player, this.player.towerFloor);
        else if (this.currentMap === 'boss') enemy = GAME_DATA.maps.boss.genEnemy(this.player);
        else enemy = GAME_DATA.maps.field.genEnemy(this.player, this.player.selectedMonsterIdx);

        this.isFighting = true;
        Logger.log(`遭遇 ${enemy.name}`, 'normal');

        Battle.start(this.player, enemy, 
            () => { // Win
                this.isFighting = false;
                this.gainReward(enemy);
                if (this.currentMap === 'tower') this.player.towerFloor++;
                this.player.hp = this.player.maxHp;
                this.save();
                this.updateUI();
                setTimeout(() => this.loop(), 1000);
            },
            () => { // Lose
                this.isFighting = false;
                Logger.log(`战败！`, 'lose');
                this.player.hp = this.player.maxHp;
                if(this.currentMap === 'tower') setTimeout(() => this.loop(), 3000);
            }
        );
    },

    gainReward(enemy) {
        this.player.exp += enemy.exp;
        this.player.money += (enemy.money || 0);
        
        if (enemy.loot && enemy.loot.length > 0) {
            enemy.loot.forEach(itemKey => {
                if(Math.random() < 0.4) { 
                    this.addItem(itemKey, 1);
                    Logger.log(`获得装备: [${this.getItemName(itemKey)}]`, 'win');
                }
            });
        }
    },

    addItem(key, count) {
        if (!this.player.inventory) this.player.inventory = {};
        this.player.inventory[key] = (this.player.inventory[key] || 0) + count;
    },

    equip(key) {
        const [type, tierStr] = key.split('_');
        const tier = parseInt(tierStr);
        if (this.player.equipment[type]) {
            const oldItemKey = `${type}_${this.player.equipment[type].tier}`;
            this.addItem(oldItemKey, 1);
        }
        this.player.equipment[type] = { id: key, tier: tier };
        this.player.inventory[key]--;
        if (this.player.inventory[key] <= 0) delete this.player.inventory[key];
        Logger.log(`穿戴了 [${this.getItemName(key)}]`);
        this.recalcStats();
        this.save();
        this.toggleCharacterPanel(); this.toggleCharacterPanel();
    },

    unequip(slot) {
        if (!this.player.equipment[slot]) return;
        const item = this.player.equipment[slot];
        this.addItem(item.id, 1);
        delete this.player.equipment[slot];
        this.recalcStats();
        this.save();
        this.toggleCharacterPanel(); this.toggleCharacterPanel(); 
    },

    synthesizeAll() {
        let synthed = false;
        const items = this.player.inventory;
        for (let key in items) {
            if (items[key] >= 3) {
                const [type, tierStr] = key.split('_');
                const tier = parseInt(tierStr);
                if (tier >= 20) continue; 
                const count = items[key];
                const newCount = Math.floor(count / 3);
                const remain = count % 3;
                if (newCount > 0) {
                    const nextKey = `${type}_${tier + 1}`;
                    items[key] = remain;
                    if (remain === 0) delete items[key];
                    this.addItem(nextKey, newCount);
                    Logger.log(`合成成功！${newCount} 个 [${this.getItemName(nextKey)}]`, 'win');
                    synthed = true;
                }
            }
        }
        if (synthed) {
            this.toggleCharacterPanel(); this.toggleCharacterPanel();
            this.save();
        } else {
            alert("没有足够数量（3个同名）的装备可合成");
        }
    },

    recalcStats() {
        let p = this.player;
        if (!p.baseStats) p.baseStats = { hp: 100, atk: 10, def: 2 };

        // 核心修改：属性不再是 baseStats * mult，而是动态计算
        // 这里的 mult 已经在 data.js 里被平滑处理过了
        const realm = GAME_DATA.realms[p.realmIdx];
        
        p.maxHp = Math.floor(p.baseStats.hp * realm.mult);
        p.atk = Math.floor(p.baseStats.atk * realm.mult);
        p.def = Math.floor(p.baseStats.def * realm.mult);

        for (let slot in p.equipment) {
            const item = p.equipment[slot];
            if (item) {
                const stats = GAME_DATA.getEquipStats(slot, item.tier);
                p.maxHp += stats.hp;
                p.atk += stats.atk;
                p.def += stats.def;
            }
        }
        if (p.hp > p.maxHp) p.hp = p.maxHp;
    },

    getItemName(key) {
        const [type, tier] = key.split('_');
        const nameMap = GAME_DATA.equipSlots;
        return `${tier}阶·${nameMap[type]}`;
    },

    toggleCharacterPanel() {
        const panel = document.getElementById('character-panel');
        const grid = document.getElementById('inventory-grid');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            for (let slot in GAME_DATA.equipSlots) {
                const el = document.getElementById(`slot-${slot}`);
                const equipped = this.player.equipment[slot];
                if (equipped) {
                    el.innerText = `${this.getItemName(equipped.id)}\n(卸下)`;
                    el.className = `slot equipped tier-${Math.min(10, equipped.tier)}`;
                } else {
                    el.innerText = `${GAME_DATA.equipSlots[slot]}: 空`;
                    el.className = 'slot';
                }
            }
            document.getElementById('detail-atk').innerText = this.player.atk;
            document.getElementById('detail-def').innerText = this.player.def;
            document.getElementById('detail-hp').innerText = this.player.maxHp;
            grid.innerHTML = '';
            for (let [key, count] of Object.entries(this.player.inventory || {})) {
                const [type, tier] = key.split('_');
                const stats = GAME_DATA.getEquipStats(type, parseInt(tier));
                let statText = "";
                if(stats.atk) statText += `攻+${stats.atk} `;
                if(stats.def) statText += `防+${stats.def} `;
                if(stats.hp) statText += `血+${stats.hp}`;
                grid.innerHTML += `
                    <div class="item-card tier-${Math.min(10, tier)}">
                        <div class="item-name">${this.getItemName(key)}</div>
                        <div style="font-size:0.8em; color:#888">拥有: ${count}</div>
                        <div style="font-size:0.7em; color:#aaa">${statText}</div>
                        <button class="item-btn" onclick="Game.equip('${key}')">装备</button>
                    </div>`;
            }
        } else {
            panel.classList.add('hidden');
        }
    },
    
    switchMap(mapType) {
        if(this.isFighting) Battle.stop(); this.isFighting = false;
        this.currentMap = mapType;
        document.querySelectorAll('.map-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        if (mapType === 'field') this.showMonsterSelector();
        else this.loop();
    },

    showMonsterSelector() {
        const panel = document.getElementById('monster-selector');
        const list = document.getElementById('monster-list');
        panel.classList.remove('hidden');
        list.innerHTML = '';
        GAME_DATA.fieldMonsters.forEach((m, idx) => {
            list.innerHTML += `
                <div class="monster-card" onclick="Game.selectMonster(${idx})">
                    <div><strong>${m.name}</strong> (Lv.${m.level})</div>
                    <div style="color:var(--accent-gold)">掉落: ${m.loot ? "装备" : "无"}</div>
                </div>`;
        });
    },
    selectMonster(idx) {
        this.player.selectedMonsterIdx = idx;
        document.getElementById('monster-selector').classList.add('hidden');
        this.loop();
    },

    breakthrough() {
        const realm = GAME_DATA.realms[this.player.realmIdx];
        const nextRealm = GAME_DATA.realms[this.player.realmIdx + 1];

        if (!nextRealm) { alert("已至巅峰！"); return; }

        if(this.player.exp >= realm.exp) {
            this.player.exp -= realm.exp;
            this.player.realmIdx++;
            
            // 核心修改：突破时增加基础属性
            // 小境界加成少，大境界加成多
            if (nextRealm.isMajor) {
                Logger.log(`【渡劫成功】大境界突破！晋升 ${nextRealm.name}`, 'win');
                this.player.baseStats.hp = Math.floor(this.player.baseStats.hp * 1.2);
                this.player.baseStats.atk = Math.floor(this.player.baseStats.atk * 1.2);
                this.player.baseStats.def = Math.floor(this.player.baseStats.def * 1.2);
            } else {
                Logger.log(`【突破】小境界提升！晋升 ${nextRealm.name}`, 'win');
                this.player.baseStats.hp = Math.floor(this.player.baseStats.hp * 1.05);
                this.player.baseStats.atk = Math.floor(this.player.baseStats.atk * 1.05);
                this.player.baseStats.def = Math.floor(this.player.baseStats.def * 1.05);
            }
            
            this.recalcStats();
            this.save();
            this.updateUI();
        } else alert(`修为不足！需 ${realm.exp}`);
    },

    updateUI() {
        const r = GAME_DATA.realms[this.player.realmIdx];
        document.getElementById('realm-title').innerText = r.name;
        document.getElementById('val-hp').innerText = this.player.hp;
        document.getElementById('val-max-hp').innerText = this.player.maxHp;
        document.getElementById('val-atk').innerText = this.player.atk;
        document.getElementById('val-def').innerText = this.player.def;
        document.getElementById('val-exp').innerText = this.player.exp;
        document.getElementById('val-max-exp').innerText = r.exp;
        document.getElementById('val-money').innerText = this.player.money;
        document.getElementById('tower-floor').innerText = this.player.towerFloor;
    },
    save() { localStorage.setItem('cultivation_save', JSON.stringify(this.player)); },
    load() { 
        const saved = localStorage.getItem('cultivation_save');
        if (saved) {
            this.player = JSON.parse(saved);
            if(!this.player.equipment) this.player.equipment = {};
            if(!this.player.baseStats) this.player.baseStats = {hp:100, atk:10, def:2};
        }
    }
};

window.onload = () => Game.init();
