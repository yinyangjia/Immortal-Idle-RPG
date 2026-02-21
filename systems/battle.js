import { UISystem } from './ui.js';

export const BattleSystem = {
    currentMonster: null,
    currentHp: 0,
    isResting: false,

    tick: function(state, config, zoneData) {
        if (this.isResting) return this.handleResting(state);

        if (!this.currentMonster) {
            this.setupMonster(state, zoneData);
            return;
        }

        this.currentHp -= state.atk;
        state.hp -= (this.currentMonster.atk || 0);

        if (state.hp <= 0) return this.defeat(state, config);
        if (this.currentHp <= 0) return this.victory(state, zoneData);

        // 核心修复：使用 BattleSystem 而非 this 确保在 setInterval 中指向正确
        BattleSystem.updateUI();
    },

    setupMonster: function(state, zoneData) {
        if (!zoneData || !zoneData.idleZones) return;
        let m = null;
        const mode = state.currentMode || 'idle';

        if (mode === 'idle') {
            const zone = zoneData.idleZones.find(z => z.id === (state.currentZoneId || 'idle_01'));
            if(!zone) return;
            m = JSON.parse(JSON.stringify(zone.monsters[0]));
        } else if (mode === 'tower') {
            const floor = state.towerFloor || 1;
            const t = zoneData.tower;
            m = {
                name: `镇妖塔 第${floor}层 守卫`,
                hp: Math.floor(t.baseHp * Math.pow(t.growth, floor - 1)),
                atk: Math.floor(t.baseAtk * Math.pow(t.growth, floor - 1)),
                exp: Math.floor(10 * floor * t.rewardMultiplier),
                gold: Math.floor(5 * floor * t.rewardMultiplier)
            };
        } else if (mode === 'elite') {
            m = JSON.parse(JSON.stringify(zoneData.elites[0]));
        }

        this.currentMonster = m;
        this.currentMonster.maxHp = m.hp;
        this.currentHp = m.hp;
        UISystem.renderMonster(this.currentMonster);
    },

    updateUI: function() {
        if (!this.currentMonster) return;
        const percent = Math.max((this.currentHp / this.currentMonster.maxHp) * 100, 0);
        const bar = document.getElementById('m-hp-bar');
        const hpText = document.getElementById('m-hp');
        if (bar) bar.style.width = percent + "%";
        if (hpText) hpText.textContent = Math.max(0, Math.floor(this.currentHp));
    },

    victory: function(state, zoneData) {
        state.exp += this.currentMonster.exp;
        state.gold += this.currentMonster.gold;
        UISystem.log(`击败【${this.currentMonster.name}】`);

        if (state.currentMode === 'tower') {
            state.towerFloor++;
            if (state.towerFloor % 5 === 0) UISystem.log("✨ 镇妖塔震动，更强的气息出现了！");
        }
        this.currentMonster = null;
    },

    defeat: function(state) {
        state.hp = 0;
        this.isResting = true;
        this.currentMonster = null;
        UISystem.log("【战败】神识受损，正在原地调息...");
    },

    handleResting: function(state) {
        state.hp = Math.min(state.hp + (state.maxHp * 0.1), state.maxHp);
        if (state.hp >= state.maxHp) {
            this.isResting = false;
            UISystem.log("调息完毕，重返道途。");
        }
    }
};
