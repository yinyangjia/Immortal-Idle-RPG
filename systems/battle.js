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

        // 双方对攻
        this.currentHp -= state.atk;
        state.hp -= (this.currentMonster.atk || 0);

        if (state.hp <= 0) return this.defeat(state, config);
        if (this.currentHp <= 0) return this.victory(state, zoneData);

        this.updateUI();
    },

    setupMonster: function(state, zoneData) {
        let m = null;
        const mode = state.currentMode || 'idle';

        if (mode === 'idle') {
            const zone = zoneData.idleZones[0]; 
            m = JSON.parse(JSON.stringify(zone.monsters[0]));
        } 
        else if (mode === 'tower') {
            const floor = state.towerFloor || 1;
            const t = zoneData.tower;
            // 爬塔公式：属性随层数指数增长
            m = {
                name: `镇妖塔 第${floor}层 守卫`,
                hp: Math.floor(t.baseHp * Math.pow(t.growth, floor - 1)),
                atk: Math.floor(t.baseAtk * Math.pow(t.growth, floor - 1)),
                exp: Math.floor(10 * floor * t.rewardMultiplier),
                gold: Math.floor(5 * floor * t.rewardMultiplier)
            };
        }
        else if (mode === 'elite') {
            m = JSON.parse(JSON.stringify(zoneData.elites[0]));
        }

        this.currentMonster = m;
        this.currentMonster.maxHp = m.hp;
        this.currentHp = m.hp;
        UISystem.renderMonster(this.currentMonster);
    },

    victory: function(state, zoneData) {
        state.exp += this.currentMonster.exp;
        state.gold += this.currentMonster.gold;
        UISystem.log(`击败【${this.currentMonster.name}】`);

        // 爬塔特有逻辑：自动进入下一层
        if (state.currentMode === 'tower') {
            state.towerFloor = (state.towerFloor || 1) + 1;
            UISystem.log(`勇闯镇妖塔，进入第${state.towerFloor}层！`);
        }
        
        this.currentMonster = null;
    },

    // defeat 和 handleResting 逻辑保持 V1.5.4 稳定版一致...
};
