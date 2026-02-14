const Game = {
    player: { realmIdx: 0, baseStats: { hp: 150, atk: 15, def: 5 }, hp: 150, maxHp: 150, atk: 15, def: 5, pen: 0, exp: 0, money: 0, towerFloor: 1, inventory: {}, equipment: {}, selectedMonsterIdx: 0 },
    currentMap: 'field', isFighting: false,

    init() {
        this.load();
        if (this.player.realmIdx >= GAME_DATA.realms.length) this.player.realmIdx = 0;
        this.recalcStats(); this.updateUI();
        if(this.currentMap !== 'field') this.loop();
    },

    // 智能识别物品名：解决 undefined 的核心
    getItemName(key) {
        if (key.includes('_')) {
            const [type, tier] = key.split('_');
            if (GAME_DATA.equipSlots[type]) return `${tier}阶·${GAME_DATA.equipSlots[type]}`;
        }
        return GAME_DATA.items[key] ? GAME_DATA.items[key].name : key;
    },

    sellItem(key) {
        if (!this.player.inventory[key]) return;
        let price = 5;
        if (GAME_DATA.items[key]) price = GAME_DATA.items[key].price;
        else if (key.includes('_')) price = parseInt(key.split('_')[1]) * 50;
        
        this.player.money += price;
        this.player.inventory[key]--;
        if (this.player.inventory[key] <= 0) delete this.player.inventory[key];
        
        Logger.log(`售出 [${this.getItemName(key)}]，获得 ${price} 灵石`, 'win');
        this.save(); this.updateUI(); this.refreshPanel();
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
        if (p.hp > p.maxHp) p.hp = p.maxHp;
    },

    gainReward(e) {
        this.player.exp += e.exp; this.player.money += (e.money || 0);
        if (e.loot) { e.loot.forEach(k => { if(Math.random() < 0.4) this.addItem(k, 1); }); }
    },

    addItem(k, c) { if (!this.player.inventory) this.player.inventory = {}; this.player.inventory[k] = (this.player.inventory[k] || 0) + c; },

    synthesizeAll() {
        let sy = false; const inv = this.player.inventory;
        for (let k in inv) {
            if (inv[k] >= 3 && k.includes('_')) {
                const [type, tierStr] = k.split('_');
                const tier = parseInt(tierStr);
                if (tier >= 20) continue;
                const nc = Math.floor(inv[k] / 3); inv[k] %= 3; if (inv[k] === 0) delete inv[k];
                this.addItem(`${type}_${tier + 1}`, nc); sy = true;
                Logger.log(`合成成功: ${nc}个 [${tier + 1}阶·${GAME_DATA.equipSlots[type]}]`, 'win');
            }
        }
        if (sy) { this.save(); this.refreshPanel(); } else { alert("无足够装备可合成"); }
    },

    // 解决战斗信息消失的关键：刷新面板时不要冲突
    refreshPanel() {
        const p = document.getElementById('character-panel');
        if (p.classList.contains('hidden')) return;
        
        for (let s in GAME_DATA.equipSlots) {
            const el = document.getElementById(`slot-${s}`);
            const eq = this.player.equipment[s];
            el.innerText = eq ? `${this.getItemName(eq.id)}\n(卸下)` : `${GAME_DATA.equipSlots[s]}: 空`;
            el.className = eq ? `slot equipped tier-${Math.min(10, eq.tier)}` : 'slot';
        }
        document.getElementById('detail-atk').innerText = this.player.atk;
        document.getElementById('detail-def').innerText = this.player.def;
        document.getElementById('detail-hp').innerText = this.player.maxHp;
        
        const g = document.getElementById('inventory-grid'); g.innerHTML = '';
        for (let [k, c] of Object.entries(this.player.inventory)) {
            let info = "";
            if (k.includes('_')) {
                const st = GAME_DATA.getEquipStats(k.split('_')[0], k.split('_')[1]);
                info = `攻${st.atk} 防${st.def}`;
            } else {
                info = GAME_DATA.items[k] ? GAME_DATA.items[k].desc : "材料";
            }
            g.innerHTML += `<div class="item-card"><div>${this.getItemName(k)}</div><div style="font-size:0.7em;color:#aaa">${info}</div><div>数量:${c}</div><div class="btn-group"><button class="item-btn" onclick="Game.itemAction('${k}')">${k.includes('_')?'装备':'使用'}</button><button class="item-btn btn-sell" onclick="Game.sellItem('${k}')">售出</button></div></div>`;
        }
    },

    itemAction(k) {
        if (k.includes('_')) this.equip(k);
        else Logger.log(`[${k}] 暂时无法直接使用`);
    },

    equip(k) {
        const [t, tr] = k.split('_');
        if (this.player.equipment[t]) this.addItem(this.player.equipment[t].id, 1);
        this.player.equipment[t] = { id: k, tier: parseInt(tr) };
        this.player.inventory[k]--; if (this.player.inventory[k] <= 0) delete this.player.inventory[k];
        this.recalcStats(); this.save(); this.refreshPanel(); this.updateUI();
    },

    unequip(s) {
        if (!this.player.equipment[s]) return;
        this.addItem(this.player.equipment[s].id, 1);
        delete this.player.equipment[s];
        this.recalcStats(); this.save(); this.refreshPanel(); this.updateUI();
    },

    toggleCharacterPanel() {
        const p = document.getElementById('character-panel');
        p.classList.toggle('hidden');
        if (!p.classList.contains('hidden')) this.refreshPanel();
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
            setTimeout(() => this.loop(), 1000);
        });
    },

    breakthrough() {
        const r = GAME_DATA.realms[this.player.realmIdx]; const nr = GAME_DATA.realms[this.player.realmIdx + 1];
        if (!nr) return;
        if(this.player.exp >= r.exp) {
            this.player.exp -= r.exp; this.player.realmIdx++;
            if (nr.isMajor) { 
                this.player.baseStats.hp *= 1.4; this.player.baseStats.atk *= 1.4; 
                Logger.log(`渡劫成功！晋升 ${nr.name}`, 'win');
            } else { 
                this.player.baseStats.hp *= 1.08; 
                Logger.log(`提升成功！晋升 ${nr.name}`, 'win');
            }
            this.recalcStats(); this.save(); this.updateUI();
        } else alert("修为不足");
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

    switchMap(m) { 
        if(this.isFighting) Battle.stop(); this.isFighting = false; this.currentMap = m;
        document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
        if (event) event.target.classList.add('active');
        if (m === 'field') this.showMonsterSelector(); else this.loop(); 
    },

    showMonsterSelector() {
        const p = document.getElementById('monster-selector');
        const l = document.getElementById('monster-list');
        p.classList.remove('hidden'); l.innerHTML = '';
        GAME_DATA.fieldMonsters.forEach((m, i) => {
            l.innerHTML += `<div class="monster-card" onclick="Game.selectMonster(${i})"><strong>${m.name}</strong> (Lv.${m.level})</div>`;
        });
    },

    selectMonster(i) { this.player.selectedMonsterIdx = i; document.getElementById('monster-selector').classList.add('hidden'); this.loop(); },
    save() { localStorage.setItem('cultivation_save', JSON.stringify(this.player)); },
    load() { const s = localStorage.getItem('cultivation_save'); if (s) { this.player = JSON.parse(s); } }
};
window.onload = () => Game.init();
