const Game = {
    player: { realmIdx: 0, baseStats: { hp: 120, atk: 12, def: 3 }, hp: 120, maxHp: 120, atk: 12, def: 3, pen: 0, exp: 0, money: 0, towerFloor: 1, inventory: {}, equipment: {}, selectedMonsterIdx: 0 },
    currentMap: 'field', isFighting: false,

    init() {
        this.load();
        if (this.player.realmIdx >= GAME_DATA.realms.length) this.player.realmIdx = 0;
        this.recalcStats(); this.updateUI();
        if(this.currentMap !== 'field') this.loop();
    },

    // --- 核心修复：智能识别物品名称 ---
    getItemName(key) {
        // 1. 装备：有下划线且类型有效
        if (key.includes('_')) {
            const [type, tier] = key.split('_');
            if (GAME_DATA.equipSlots[type]) {
                return `${tier}阶·${GAME_DATA.equipSlots[type]}`;
            }
        }
        // 2. 材料：在 items 字典里能找到
        if (GAME_DATA.items[key]) {
            return GAME_DATA.items[key].name;
        }
        // 3. 未知物品 (保底显示)
        return key;
    },

    // --- 新增：出售物品 ---
    sellItem(key) {
        const count = this.player.inventory[key] || 0;
        if (count <= 0) return;

        let price = 1;
        // 材料查表
        if (GAME_DATA.items[key]) {
            price = GAME_DATA.items[key].price;
        } 
        // 装备按阶级算价 (防止误卖高阶)
        else if (key.includes('_')) {
            const tier = parseInt(key.split('_')[1]) || 1;
            if (tier >= 3 && !confirm(`确定要出售高阶装备 [${this.getItemName(key)}] 吗？`)) return;
            price = tier * 50;
        }

        this.player.money += price;
        this.player.inventory[key]--;
        if (this.player.inventory[key] <= 0) delete this.player.inventory[key];

        Logger.log(`出售 [${this.getItemName(key)}]，获得 ${price} 灵石`, 'win');
        this.save();
        this.toggleCharacterPanel(); this.toggleCharacterPanel(); // 刷新界面
    },

    // --- 界面渲染更新 ---
    toggleCharacterPanel() {
        const panel = document.getElementById('character-panel');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            
            // 渲染装备槽
            for (let s in GAME_DATA.equipSlots) {
                const el = document.getElementById(`slot-${s}`);
                const eq = this.player.equipment[s];
                el.innerText = eq ? `${this.getItemName(eq.id)}\n(卸下)` : `${GAME_DATA.equipSlots[s]}: 空`;
                el.className = eq ? `slot equipped tier-${Math.min(10, eq.tier)}` : 'slot';
            }
            document.getElementById('detail-atk').innerText = this.player.atk;
            document.getElementById('detail-def').innerText = this.player.def;
            document.getElementById('detail-hp').innerText = this.player.maxHp;

            // 渲染背包 (修复 Bug 的核心)
            const grid = document.getElementById('inventory-grid'); 
            grid.innerHTML = '';
            
            for (let [key, count] of Object.entries(this.player.inventory || {})) {
                let cardHtml = '';
                
                // 判断是装备还是材料
                if (key.includes('_') && GAME_DATA.equipSlots[key.split('_')[0]]) {
                    // === 装备卡片 ===
                    const [t, tr] = key.split('_'); 
                    const tier = parseInt(tr) || 1;
                    const st = GAME_DATA.getEquipStats(t, tier);
                    let statInfo = `攻${st.atk} 防${st.def} 血${st.hp}`;
                    
                    cardHtml = `
                        <div class="item-card tier-${Math.min(10, tier)}">
                            <div class="item-name">${this.getItemName(key)}</div>
                            <div style="font-size:0.7em; color:#aaa">${statInfo}</div>
                            <div style="font-size:0.7em">数量: ${count}</div>
                            <div class="btn-group">
                                <button class="item-btn" onclick="Game.equip('${key}')">装备</button>
                                <button class="item-btn btn-sell" onclick="Game.sellItem('${key}')">售出</button>
                            </div>
                        </div>`;
                } else {
                    // === 材料卡片 (兽皮/道韵) ===
                    const itemData = GAME_DATA.items[key] || { name: key, desc: "未知物品", price: 1 };
                    
                    cardHtml = `
                        <div class="item-card item-material">
                            <div class="item-name" style="color:#fff">${itemData.name}</div>
                            <div style="font-size:0.7em; color:#aaa">${itemData.desc}</div>
                            <div style="font-size:0.7em">数量: ${count}</div>
                            <div class="btn-group">
                                <button class="item-btn btn-sell" onclick="Game.sellItem('${key}')">出售 (${itemData.price})</button>
                            </div>
                        </div>`;
                }
                grid.innerHTML += cardHtml;
            }
        } else panel.classList.add('hidden');
    },

    // 其余逻辑 (合成、装备、卸下等) 保持不变...
    equip(k) { const [t, tr] = k.split('_'); const tier = parseInt(tr); if (this.player.equipment[t]) this.addItem(`${t}_${this.player.equipment[t].tier}`, 1); this.player.equipment[t] = { id: k, tier: tier }; this.player.inventory[k]--; if (this.player.inventory[k] <= 0) delete this.player.inventory[k]; this.recalcStats(); this.save(); this.toggleCharacterPanel(); this.toggleCharacterPanel(); },
    unequip(s) { if (!this.player.equipment[s]) return; this.addItem(this.player.equipment[s].id, 1); delete this.player.equipment[s]; this.recalcStats(); this.save(); this.toggleCharacterPanel(); this.toggleCharacterPanel(); },
    synthesizeAll() {
        let s = false; const inv = this.player.inventory;
        for (let k in inv) {
            if (inv[k] >= 3 && k.includes('_')) { // 只合成装备
                const [t, tr] = k.split('_'); const tier = parseInt(tr);
                if (tier >= 20) continue;
                const nc = Math.floor(inv[k] / 3); inv[k] %= 3; if (inv[k] === 0) delete inv[k];
                this.addItem(`${t}_${tier + 1}`, nc); s = true;
                Logger.log(`合成成功！${nc} 个 [${t}_${tier+1}]`, 'win');
            }
        }
        if (s) { this.toggleCharacterPanel(); this.toggleCharacterPanel(); this.save(); } else { alert("没有足够（3个同名）的低阶装备可合成"); }
    },
    loop() {
        if (this.isFighting) return;
        let e;
        if (this.currentMap === 'tower') e = GAME_DATA.maps.tower.genEnemy(this.player, this.player.towerFloor);
        else if (this.currentMap === 'boss') e = GAME_DATA.maps.boss.genEnemy(this.player);
        else e = GAME_DATA.maps.field.genEnemy(this.player, this.player.selectedMonsterIdx);
        this.isFighting = true;
        Battle.start(this.player, e, () => {
            this.isFighting = false; this.gainReward(e);
            if (this.currentMap === 'tower') this.player.towerFloor++;
            this.player.hp = this.player.maxHp; this.save(); this.updateUI();
            setTimeout(() => this.loop(), 1000);
        }, () => {
            this.isFighting = false; this.player.hp = this.player.maxHp;
            if(this.currentMap === 'tower') setTimeout(() => this.loop(), 3000);
            else setTimeout(() => this.loop(), 1000);
        });
    },
    gainReward(e) {
        this.player.exp += e.exp; this.player.money += (e.money || 0);
        if (e.loot) { e.loot.forEach(k => { if(Math.random() < 0.4) this.addItem(k, 1); }); }
    },
    addItem(k, c) { if (!this.player.inventory) this.player.inventory = {}; this.player.inventory[k] = (this.player.inventory[k] || 0) + c; },
    recalcStats() {
        let p = this.player; const r = GAME_DATA.realms[p.realmIdx] || GAME_DATA.realms[0];
        p.maxHp = Math.floor(p.baseStats.hp * r.mult);
        p.atk = Math.floor(p.baseStats.atk * r.mult);
        p.def = Math.floor(p.baseStats.def * r.mult);
        for (let s in p.equipment) {
            const item = p.equipment[s];
            if (item) { const st = GAME_DATA.getEquipStats(s, item.tier); p.maxHp += st.hp; p.atk += st.atk; p.def += st.def; }
        }
        if (p.hp > p.maxHp) p.hp = p.maxHp;
    },
    breakthrough() {
        const r = GAME_DATA.realms[this.player.realmIdx]; const nr = GAME_DATA.realms[this.player.realmIdx + 1];
        if (!nr) return;
        if(this.player.exp >= r.exp) {
            this.player.exp -= r.exp; this.player.realmIdx++;
            if (nr.isMajor) { Logger.log(`【大境界突破】晋升 ${nr.name}`, 'win'); this.player.baseStats.hp = Math.floor(this.player.baseStats.hp * 1.3); this.player.baseStats.atk = Math.floor(this.player.baseStats.atk * 1.3); } 
            else { Logger.log(`【提升】晋升 ${nr.name}`, 'win'); this.player.baseStats.hp = Math.floor(this.player.baseStats.hp * 1.08); }
            this.recalcStats(); this.save(); this.updateUI();
        } else alert(`修为不足！`);
    },
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
    save() { localStorage.setItem('cultivation_save', JSON.stringify(this.player)); },
    load() { const s = localStorage.getItem('cultivation_save'); if (s) { this.player = JSON.parse(s); if(!this.player.baseStats) this.player.baseStats = {hp:120, atk:12, def:3}; } },
    switchMap(m) { if(this.isFighting) Battle.stop(); this.isFighting = false; this.currentMap = m; document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active')); event.target.classList.add('active'); if (m === 'field') this.showMonsterSelector(); else this.loop(); },
    showMonsterSelector() { const p = document.getElementById('monster-selector'); const l = document.getElementById('monster-list'); p.classList.remove('hidden'); l.innerHTML = ''; GAME_DATA.fieldMonsters.forEach((m, i) => { l.innerHTML += `<div class="monster-card" onclick="Game.selectMonster(${i})"><strong>${m.name}</strong> (Lv.${m.level})</div>`; }); },
    selectMonster(i) { this.player.selectedMonsterIdx = i; document.getElementById('monster-selector').classList.add('hidden'); this.loop(); }
};
window.onload = () => Game.init();
