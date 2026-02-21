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

        // 修复：使用显式引用防止 this 指向 null
        BattleSystem.updateUI();
    },

    setupMonster: function(state, zoneData) {
        let m = null;
        const mode = state.currentMode || 'idle';

        if (mode === 'idle') {
            // 根据当前选择的 ZoneID 寻找怪物
            const zone = zoneData.idleZones.find(z => z.id === (state.currentZoneId || 'idle_01'));
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

    victory: function(state, zoneData) {
        state.exp += this.currentMonster.exp;
        state.gold += this.currentMonster.gold;
        UISystem.log(`击败【${this.currentMonster.name}】`);

        // 副本解锁逻辑：如果是爬塔达到特定层数，解锁对应副本
        if (state.currentMode === 'tower') {
            state.towerFloor++;
            // 示例：打过第 5 层解锁新地图
            if (state.towerFloor === 5 && !state.unlockedZones.includes('idle_02')) {
                state.unlockedZones.push('idle_02');
                UISystem.log("✨ 镇妖塔气息外泄，【幽暗森林】副本已解锁！");
            }
        }
        
        this.currentMonster = null;
    },

    updateUI: function() {
        const percent = Math.max((this.currentHp / this.currentMonster.maxHp) * 100, 0);
        const bar = document.getElementById('m-hp-bar');
        const hp = document.getElementById('m-hp');
        if (bar) bar.style.width = percent + "%";
        if (hp) hp.textContent = Math.max(0, Math.floor(this.currentHp));
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
