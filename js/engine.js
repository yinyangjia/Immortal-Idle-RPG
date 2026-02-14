const Game = {
    player: {
        realmIdx: 0,
        hp: 100, maxHp: 100,
        atk: 10, def: 2, pen: 0,
        exp: 0, money: 0,
        towerFloor: 1,
        inventory: {}, // 物品背包 { "兽皮": 10 }
        selectedMonsterIdx: 0 // 当前选择打哪个怪
    },
    currentMap: 'field',
    isFighting: false,

    init() {
        this.load();
        this.updateUI();
        // 如果是野外，不直接开打，等待选择。如果是塔，可以继续逻辑。
        if(this.currentMap !== 'field') this.loop(); 
    },

    // 主循环
    loop() {
        if (this.isFighting) return;

        // 生成敌人逻辑
        let enemy;
        if (this.currentMap === 'tower') {
            enemy = GAME_DATA.maps.tower.genEnemy(this.player, this.player.towerFloor);
        } else if (this.currentMap === 'boss') {
            enemy = GAME_DATA.maps.boss.genEnemy(this.player);
        } else {
            // 野外：根据玩家选择的 index 生成
            enemy = GAME_DATA.maps.field.genEnemy(this.player, this.player.selectedMonsterIdx);
        }

        this.isFighting = true;
        Logger.log(`遭遇 ${enemy.name} (HP:${enemy.hp})`, 'normal');

        Battle.start(this.player, enemy, 
            () => { // 胜利
                this.isFighting = false;
                this.gainReward(enemy); // 统一处理奖励
                
                if (this.currentMap === 'tower') {
                    this.player.towerFloor++;
                    this.player.hp = this.player.maxHp;
                }
                if (this.currentMap === 'field') this.player.hp = this.player.maxHp;
                
                this.save();
                this.updateUI();
                // 继续循环
                setTimeout(() => this.loop(), 1000);
            },
            () => { // 失败
                this.isFighting = false;
                Logger.log(`你被 ${enemy.name} 击败了！`, 'lose');
                this.player.hp = this.player.maxHp;
                // 失败后停止挂机，如果是野外则等待重新选择，或者是塔则重试
                if(this.currentMap === 'tower') setTimeout(() => this.loop(), 3000); 
            }
        );
    },

    // 奖励结算系统
    gainReward(enemy) {
        this.player.exp += enemy.exp;
        this.player.money = (this.player.money || 0) + (enemy.money || 0);
        
        Logger.log(`获胜！修为+${enemy.exp}, 灵石+${enemy.money || 0}`, 'win');
        
        // 掉落物品
        if (enemy.loot && Math.random() < 0.3) { // 30% 掉率
            this.addItem(enemy.loot, 1);
            Logger.log(`获得物品: [${enemy.loot}]`, 'win');
        }
    },

    // 背包系统
    addItem(name, count) {
        if (!this.player.inventory) this.player.inventory = {};
        this.player.inventory[name] = (this.player.inventory[name] || 0) + count;
    },

    toggleBag() {
        const panel = document.getElementById('bag-panel');
        const grid = document.getElementById('inventory-grid');
        
        if (panel.classList.contains('hidden')) {
            // 打开背包：渲染物品
            panel.classList.remove('hidden');
            document.getElementById('bag-money').innerText = this.player.money || 0;
            grid.innerHTML = '';
            
            const items = this.player.inventory || {};
            if (Object.keys(items).length === 0) {
                grid.innerHTML = '<div style="color:#666">空空如也</div>';
            } else {
                for (let [name, count] of Object.entries(items)) {
                    grid.innerHTML += `
                        <div class="item-card">
                            <span>${name}</span>
                            <span>x${count}</span>
                        </div>`;
                }
            }
        } else {
            panel.classList.add('hidden');
        }
    },

    // 地图切换逻辑
    switchMap(mapType) {
        if(this.isFighting) Battle.stop(); 
        this.isFighting = false;
        this.currentMap = mapType;

        // UI 切换
        document.querySelectorAll('.map-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // 如果是野外，弹出怪物选择框
        if (mapType === 'field') {
            this.showMonsterSelector();
        } else {
            // 其他地图直接开始
            Logger.log(`前往：${GAME_DATA.maps[mapType].name}`);
            this.loop();
        }
    },

    // 显示野外怪物选择
    showMonsterSelector() {
        const panel = document.getElementById('monster-selector');
        const list = document.getElementById('monster-list');
        panel.classList.remove('hidden');
        list.innerHTML = '';

        GAME_DATA.fieldMonsters.forEach((m, idx) => {
            list.innerHTML += `
                <div class="monster-card" onclick="Game.selectMonster(${idx})">
                    <div>
                        <strong>${m.name}</strong> (Lv.${m.level})<br>
                        <span style="font-size:0.8em; color:#888">掉落: 灵石${m.money} / 经验${m.exp}</span>
                    </div>
                    <div style="align-self:center; color:var(--accent-gold)">出发 ></div>
                </div>
            `;
        });
    },

    selectMonster(idx) {
        this.player.selectedMonsterIdx = idx;
        document.getElementById('monster-selector').classList.add('hidden');
        Logger.log(`开始在野外狩猎：${GAME_DATA.fieldMonsters[idx].name}`);
        this.loop();
    },

    // 突破 (保持不变)
    breakthrough() {
        const realm = GAME_DATA.realms[this.player.realmIdx];
        const nextRealm = GAME_DATA.realms[this.player.realmIdx + 1];
        if (!nextRealm) { alert("已至巅峰！"); return; }
        if (this.player.exp >= realm.exp) {
            this.player.exp -= realm.exp;
            this.player.realmIdx++;
            this.player.maxHp = Math.floor(this.player.maxHp * 1.5);
            this.player.atk = Math.floor(this.player.atk * 1.5);
            this.player.def = Math.floor(this.player.def * 1.5);
            this.player.hp = this.player.maxHp;
            Logger.log(`突破成功！晋升 [${nextRealm.name}]`, 'win');
            this.save();
            this.updateUI();
        } else {
            alert(`修为不足！需 ${realm.exp}`);
        }
    },

    updateUI() {
        const r = GAME_DATA.realms[this.player.realmIdx];
        document.getElementById('realm-title').innerText = `${r.name}`;
        document.getElementById('val-hp').innerText = this.player.hp;
        document.getElementById('val-max-hp').innerText = this.player.maxHp;
        document.getElementById('val-atk').innerText = this.player.atk;
        document.getElementById('val-def').innerText = this.player.def;
        document.getElementById('val-pen').innerText = this.player.pen;
        document.getElementById('val-exp').innerText = this.player.exp;
        document.getElementById('val-max-exp').innerText = r.exp;
        document.getElementById('tower-floor').innerText = this.player.towerFloor;
        // 更新灵石显示
        document.getElementById('val-money').innerText = this.player.money || 0;
    },

    save() { localStorage.setItem('cultivation_save', JSON.stringify(this.player)); },
    load() { 
        const saved = localStorage.getItem('cultivation_save');
        if (saved) {
            this.player = JSON.parse(saved);
            // 兼容旧存档：如果没有 inventory 字段，补上
            if(!this.player.inventory) this.player.inventory = {};
            if(!this.player.money) this.player.money = 0;
        }
    }
};

window.onload = () => Game.init();
