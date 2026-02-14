const Game = {
    player: {
        realmIdx: 0,
        hp: 100, maxHp: 100,
        atk: 10,
        def: 2,
        pen: 0,
        exp: 0,
        towerFloor: 1
    },
    currentMap: 'field', // field, boss, tower
    isFighting: false,

    init() {
        this.load();
        this.updateUI();
        this.loop();
    },

    // 主循环：负责不断寻找敌人
    loop() {
        if (this.isFighting) return;

        // 生成敌人
        let enemy;
        if (this.currentMap === 'tower') {
            enemy = GAME_DATA.maps.tower.genEnemy(this.player, this.player.towerFloor);
        } else {
            enemy = GAME_DATA.maps[this.currentMap].genEnemy(this.player);
        }

        this.isFighting = true;
        Logger.log(`遭遇 ${enemy.name} (HP:${enemy.hp} ATK:${enemy.atk})`, 'normal');

        // 开始战斗
        Battle.start(this.player, enemy, 
            () => { // 胜利回调
                this.isFighting = false;
                this.player.exp += enemy.exp;
                Logger.log(`击败 ${enemy.name}，获得修为 +${enemy.exp}`, 'win');
                
                // 爬塔特殊逻辑
                if (this.currentMap === 'tower') {
                    this.player.towerFloor++;
                    Logger.log(`恭喜！进入第 ${this.player.towerFloor} 层`);
                    // 只有爬塔成功才回血
                    this.player.hp = this.player.maxHp; 
                }
                
                // 野外挂机自动回血
                if (this.currentMap === 'field') this.player.hp = this.player.maxHp;
                
                this.save();
                this.updateUI();
                setTimeout(() => this.loop(), 1000); // 1秒后找下一个怪
            },
            () => { // 失败回调
                this.isFighting = false;
                Logger.log(`你被 ${enemy.name} 击败了！正在疗伤...`, 'lose');
                this.player.hp = this.player.maxHp; // 复活
                
                // 爬塔失败不掉层，野外失败也不掉
                setTimeout(() => this.loop(), 3000); // 3秒后复活
            }
        );
    },

    // 突破逻辑
    breakthrough() {
        const realm = GAME_DATA.realms[this.player.realmIdx];
        const nextRealm = GAME_DATA.realms[this.player.realmIdx + 1];

        if (!nextRealm) {
            alert("已至修仙界巅峰！");
            return;
        }

        if (this.player.exp >= realm.exp) {
            this.player.exp -= realm.exp;
            this.player.realmIdx++;
            
            // 属性飞升 (简单的乘法)
            this.player.maxHp = Math.floor(this.player.maxHp * 1.5);
            this.player.atk = Math.floor(this.player.atk * 1.5);
            this.player.def = Math.floor(this.player.def * 1.5);
            this.player.hp = this.player.maxHp;
            
            Logger.log(`=== 突破成功！晋升为 [${nextRealm.name}] ===`, 'win');
            this.save();
            this.updateUI();
        } else {
            alert(`修为不足！需 ${realm.exp} 修为`);
        }
    },

    switchMap(mapType) {
        // 如果正在爬塔且未失败，不允许随意切换，或者切换后战斗重置
        if(this.isFighting) Battle.stop(); 
        this.isFighting = false;
        
        this.currentMap = mapType;
        
        // UI 按钮样式切换
        document.querySelectorAll('.map-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        Logger.log(`前往地图：${GAME_DATA.maps[mapType].name}`);
        this.loop(); // 立即开始新地图循环
    },

    updateUI() {
        const r = GAME_DATA.realms[this.player.realmIdx];
        document.getElementById('realm-title').innerText = `${r.name} (层数:${this.player.towerFloor})`;
        document.getElementById('val-hp').innerText = this.player.hp;
        document.getElementById('val-max-hp').innerText = this.player.maxHp;
        document.getElementById('val-atk').innerText = this.player.atk;
        document.getElementById('val-def').innerText = this.player.def;
        document.getElementById('val-pen').innerText = this.player.pen;
        document.getElementById('val-exp').innerText = this.player.exp;
        document.getElementById('val-max-exp').innerText = r.exp;
        document.getElementById('tower-floor').innerText = this.player.towerFloor;
    },

    save() {
        localStorage.setItem('cultivation_save', JSON.stringify(this.player));
    },

    load() {
        const saved = localStorage.getItem('cultivation_save');
        if (saved) {
            this.player = JSON.parse(saved);
        }
    }
};

// 启动游戏
window.onload = () => Game.init();
