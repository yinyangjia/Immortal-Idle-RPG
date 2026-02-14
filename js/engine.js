const Game = {
    // 玩家核心数据
    player: {
        realmIdx: 0,            // 境界索引 (0=凡人, 1=练气一层...)
        baseStats: { hp: 120, atk: 12, def: 3 }, // 裸装属性 (突破时增加这个)
        
        // 战斗属性 (动态计算得出)
        hp: 120, maxHp: 120,
        atk: 12, def: 3, pen: 0,
        
        exp: 0,
        money: 0,               // 灵石
        towerFloor: 1,          // 塔层数
        inventory: {},          // 背包: { "weapon_1": 5 }
        equipment: {},          // 装备: { "weapon": {id: "weapon_1", tier: 1} }
        selectedMonsterIdx: 0   // 野外挂机选中的怪物
    },

    currentMap: 'field',        // 当前地图
    isFighting: false,          // 战斗状态锁

    // --- 初始化 ---
    init() {
        this.load(); // 读取存档

        // 防错检查：如果存档的境界超过了数据上限，重置为凡人
        if (!GAME_DATA.realms[this.player.realmIdx]) {
            this.player.realmIdx = 0;
            this.player.baseStats = { hp: 120, atk: 12, def: 3 };
        }

        this.recalcStats(); // 计算属性
        this.updateUI();    // 刷新界面

        // 如果不是在野外选怪界面，则直接开始循环
        if(this.currentMap !== 'field') this.loop();
    },

    // --- 主循环 (核心心跳) ---
    loop() {
        if (this.isFighting) return;

        // 1. 生成敌人
        let enemy;
        if (this.currentMap === 'tower') {
            enemy = GAME_DATA.maps.tower.genEnemy(this.player, this.player.towerFloor);
        } else if (this.currentMap === 'boss') {
            enemy = GAME_DATA.maps.boss.genEnemy(this.player);
        } else {
            // 野外：根据选择生成
            enemy = GAME_DATA.maps.field.genEnemy(this.player, this.player.selectedMonsterIdx);
        }

        // 2. 开始战斗
        this.isFighting = true;
        Logger.log(`遭遇 ${enemy.name}`, 'normal');

        Battle.start(this.player, enemy, 
            // 胜利回调
            () => {
                this.isFighting = false;
                this.gainReward(enemy);

                // 爬塔成功逻辑
                if (this.currentMap === 'tower') {
                    this.player.towerFloor++;
                    this.player.hp = this.player.maxHp; // 爬塔成功回满血
                }

                // 野外/Boss 回血
                if (this.currentMap === 'field' || this.currentMap === 'boss') {
                    this.player.hp = this.player.maxHp;
                }
                
                this.save();
                this.updateUI();
                
                // 1秒后寻找下一个敌人
                setTimeout(() => this.loop(), 1000);
            },
            // 失败回调
            () => {
                this.isFighting = false;
                Logger.log(`不敌 ${enemy.name}，正在疗伤...`, 'lose');
                this.player.hp = this.player.maxHp; // 复活

                // 塔失败等待3秒，野外等待1秒
                const waitTime = this.currentMap === 'tower' ? 3000 : 1000;
                setTimeout(() => this.loop(), waitTime);
            }
        );
    },

    // --- 奖励结算 ---
    gainReward(enemy) {
        // 获得修为与灵石
        this.player.exp += enemy.exp;
        this.player.money += (enemy.money || 0);

        // 处理掉落 (40% 概率掉落装备)
        if (enemy.loot && enemy.loot.length > 0) {
            enemy.loot.forEach(itemKey => {
                if(Math.random() < 0.4) {
                    this.addItem(itemKey, 1);
                    Logger.log(`获得战利品: [${this.getItemName(itemKey)}]`, 'win');
                }
            });
        }
    },

    // --- 物品背包系统 ---
    addItem(key, count) {
        if (!this.player.inventory) this.player.inventory = {};
        this.player.inventory[key] = (this.player.inventory[key] || 0) + count;
    },

    // --- 装备系统 ---
    // 穿戴装备
    equip(key) {
        const [type, tierStr] = key.split('_');
        const tier = parseInt(tierStr);

        // 1. 如果该部位已有装备，先卸下（回到背包）
        if (this.player.equipment[type]) {
            const oldItem = this.player.equipment[type];
            this.addItem(oldItem.id, 1);
        }

        // 2. 穿上新装备，背包扣除
        this.player.equipment[type] = { id: key, tier: tier };
        this.player.inventory[key]--;
        if (this.player.inventory[key] <= 0) delete this.player.inventory[key];

        Logger.log(`装备了 [${this.getItemName(key)}]`);
        
        // 3. 刷新属性与界面
        this.recalcStats();
        this.save();
        this.toggleCharacterPanel(); // 关闭再打开以刷新渲染
        this.toggleCharacterPanel();
    },

    // 卸下装备
    unequip(slot) {
        if (!this.player.equipment[slot]) return;
        const item = this.player.equipment[slot];
        
        this.addItem(item.id, 1); // 回到背包
        delete this.player.equipment[slot]; // 清空槽位
        
        this.recalcStats();
        this.save();
        this.toggleCharacterPanel();
        this.toggleCharacterPanel();
    },

    // 一键合成 (3合1)
    synthesizeAll() {
        let isSynthesized = false;
        const items = this.player.inventory;

        for (let key in items) {
            if (items[key] >= 3) {
                const [type, tierStr] = key.split('_');
                const tier = parseInt(tierStr);

                if (tier >= 20) continue; // 最高20阶

                const count = items[key];
                const newCount = Math.floor(count / 3);
                const remain = count % 3;

                // 执行合成
                if (newCount > 0) {
                    const nextKey = `${type}_${tier + 1}`;
                    
                    items[key] = remain;
                    if (remain === 0) delete items[key];

                    this.addItem(nextKey, newCount);
                    Logger.log(`合成成功！${newCount} 个 [${this.getItemName(nextKey)}]`, 'win');
                    isSynthesized = true;
                }
            }
        }

        if (isSynthesized) {
            this.toggleCharacterPanel();
            this.toggleCharacterPanel();
            this.save();
        } else {
            alert("背包中没有足够（3个同名）的低阶装备可合成");
        }
    },

    // --- 属性计算核心 ---
    recalcStats() {
        let p = this.player;
        
        // 1. 获取当前境界加成 (如果没有则默认第一级)
        const realm = GAME_DATA.realms[p.realmIdx] || GAME_DATA.realms[0];

        // 2. 计算人物基础面板 (裸装 * 境界倍率)
        p.maxHp = Math.floor(p.baseStats.hp * realm.mult);
        p.atk = Math.floor(p.baseStats.atk * realm.mult);
        p.def = Math.floor(p.baseStats.def * realm.mult);

        // 3. 累加装备属性
        for (let slot in p.equipment) {
            const item = p.equipment[slot];
            if (item) {
                // 调用 data.js 里的公式计算装备数值
                const stats = GAME_DATA.getEquipStats(slot, item.tier);
                p.maxHp += stats.hp;
                p.atk += stats.atk;
                p.def += stats.def;
            }
        }

        // 血量修正
        if (p.hp > p.maxHp) p.hp = p.maxHp;
    },

    // --- 境界突破 ---
    breakthrough() {
        const realm = GAME_DATA.realms[this.player.realmIdx];
        const nextRealm = GAME_DATA.realms[this.player.realmIdx + 1];

        if (!nextRealm) {
            alert("已至修仙界巅峰，无法再突破！");
            return;
        }

        if (this.player.exp >= realm.exp) {
            // 扣除修为，提升境界
            this.player.exp -= realm.exp;
            this.player.realmIdx++;

            // 属性成长逻辑：区分【大境界】和【小境界】
            if (nextRealm.isMajor) {
                // 大境界突破 (如 练气 -> 筑基)：大幅提升基础潜力
                Logger.log(`=== 渡劫成功！晋升 [${nextRealm.name}] ===`, 'win');
                this.player.baseStats.hp = Math.floor(this.player.baseStats.hp * 1.3);
                this.player.baseStats.atk = Math.floor(this.player.baseStats.atk * 1.3);
                this.player.baseStats.def = Math.floor(this.player.baseStats.def * 1.3);
            } else {
                // 小境界提升 (如 练气一层 -> 二层)：小幅提升
                Logger.log(`突破成功！晋升 [${nextRealm.name}]`, 'win');
                this.player.baseStats.hp = Math.floor(this.player.baseStats.hp * 1.08);
                this.player.baseStats.atk = Math.floor(this.player.baseStats.atk * 1.08);
                this.player.baseStats.def = Math.floor(this.player.baseStats.def * 1.08);
            }

            this.recalcStats();
            this.save();
            this.updateUI();
        } else {
            alert(`修为不足！当前 ${Math.floor(this.player.exp)} / 需 ${realm.exp}`);
        }
    },

    // --- 界面与辅助 ---
    // 获取装备中文名
    getItemName(key) {
        const [type, tier] = key.split('_');
        const nameMap = GAME_DATA.equipSlots;
        return `${tier}阶·${nameMap[type]}`;
    },

    // 切换地图
    switchMap(mapType) {
        if(this.isFighting) Battle.stop(); 
        this.isFighting = false;
        this.currentMap = mapType;

        // 按钮高亮处理
        document.querySelectorAll('.map-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        if (mapType === 'field') {
            this.showMonsterSelector();
        } else {
            Logger.log(`前往：${GAME_DATA.maps[mapType].name}`);
            this.loop();
        }
    },

    // 打开全屏角色面板
    toggleCharacterPanel() {
        const panel = document.getElementById('character-panel');
        
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');

            // 1. 渲染左侧：装备槽
            for (let slot in GAME_DATA.equipSlots) {
                const el = document.getElementById(`slot-${slot}`);
                const equipped = this.player.equipment[slot];

                if (equipped) {
                    el.innerText = `${this.getItemName(equipped.id)}\n(点击卸下)`;
                    // 根据阶级添加颜色类名 (tier-1 到 tier-10)
                    el.className = `slot equipped tier-${Math.min(10, equipped.tier)}`;
                } else {
                    el.innerText = `${GAME_DATA.equipSlots[slot]}: 空`;
                    el.className = 'slot';
                }
            }

            // 2. 渲染面板数值概览
            document.getElementById('detail-atk').innerText = this.player.atk;
            document.getElementById('detail-def').innerText = this.player.def;
            document.getElementById('detail-hp').innerText = this.player.maxHp;

            // 3. 渲染右侧：背包物品
            const grid = document.getElementById('inventory-grid');
            grid.innerHTML = '';
            
            const inventory = this.player.inventory || {};
            for (let [key, count] of Object.entries(inventory)) {
                const [type, tierStr] = key.split('_');
                const tier = parseInt(tierStr);

                // 渲染背包里的卡片
                grid.innerHTML += `
                    <div class="item-card tier-${Math.min(10, tier)}">
                        <div class="item-name">${this.getItemName(key)}</div>
                        <div style="font-size:0.8em; color:#888">拥有: ${count}</div>
                        <button class="item-btn" onclick="Game.equip('${key}')">装备</button>
                    </div>`;
            }

        } else {
            panel.classList.add('hidden');
        }
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
                    <div style="font-size:0.8em; color:#aaa">掉落: ${m.loot ? "装备" : "无"}</div>
                </div>`;
        });
    },

    selectMonster(idx) {
        this.player.selectedMonsterIdx = idx;
        document.getElementById('monster-selector').classList.add('hidden');
        this.loop();
    },

    updateUI() {
        // 防止数据未加载时报错
        const realm = GAME_DATA.realms[this.player.realmIdx] || { name: "未知", exp: 999999 };
        
        document.getElementById('realm-title').innerText = realm.name;
        document.getElementById('val-hp').innerText = Math.floor(this.player.hp);
        document.getElementById('val-max-hp').innerText = this.player.maxHp;
        document.getElementById('val-atk').innerText = this.player.atk;
        document.getElementById('val-def').innerText = this.player.def;
        document.getElementById('val-exp').innerText = Math.floor(this.player.exp);
        document.getElementById('val-max-exp').innerText = realm.exp;
        document.getElementById('val-money').innerText = this.player.money;
        document.getElementById('tower-floor').innerText = this.player.towerFloor;
    },

    save() {
        localStorage.setItem('cultivation_save', JSON.stringify(this.player));
    },

    load() {
        const saved = localStorage.getItem('cultivation_save');
        if (saved) {
            const data = JSON.parse(saved);
            // 合并存档，防止新版本缺少字段
            this.player = { ...this.player, ...data };
            
            // 确保核心对象存在
            if (!this.player.baseStats) this.player.baseStats = { hp: 120, atk: 12, def: 3 };
            if (!this.player.inventory) this.player.inventory = {};
            if (!this.player.equipment) this.player.equipment = {};
        }
    }
};

// 启动引擎
window.onload = () => Game.init();
