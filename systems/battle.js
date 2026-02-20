import { UISystem } from './ui.js';

/**
 * BattleSystem - 战斗核心模块 (V1.5.3)
 * 职责：处理回合制伤害、怪物生成及战败调息。
 */
export const BattleSystem = {
    currentMonster: null,
    currentHp: 0,
    isResting: false,

    /**
     * 战斗主循环
     */
    tick(state, config, monsterData) {
        // 1. 战败调息判定
        if (this.isResting) {
            this.handleResting(state);
            return;
        }

        // 2. 怪物生成判定
        if (!this.currentMonster) {
            this.setupMonster(config, monsterData);
            return;
        }

        // 3. 双方伤害结算
        const playerDamage = state.atk || 5;
        const monsterDamage = this.currentMonster.atk || 1;

        this.currentHp -= playerDamage;
        state.hp -= monsterDamage;

        // 4. 判定结果
        if (state.hp <= 0) {
            this.defeat(state, config);
        } else if (this.currentHp <= 0) {
            this.victory(state);
        } else {
            this.updateBattleUI();
        }
    },

    /**
     * 内部方法：从 monsters.json 数据中随机选择一只怪物
     */
    setupMonster(config, monsterData) {
        if (!monsterData || !monsterData.zones) return;

        // 合并所有区域的怪物
        let allMonsters = [];
        monsterData.zones.forEach(zone => {
            allMonsters = allMonsters.concat(zone.monsters);
        });

        const randomIndex = Math.floor(Math.random() * allMonsters.length);
        const template = allMonsters[randomIndex];

        // 深拷贝并初始化战斗状态
        this.currentMonster = JSON.parse(JSON.stringify(template));
        this.currentMonster.maxHp = this.currentMonster.hp;
        this.currentHp = this.currentMonster.hp;

        UISystem.renderMonster(this.currentMonster);
        UISystem.log(`在草丛中遇到一只【${this.currentMonster.name}】！`);
    },

    updateBattleUI() {
        const hpPercent = Math.max((this.currentHp / this.currentMonster.maxHp) * 100, 0);
        const bar = document.getElementById('m-hp-bar');
        const hpText = document.getElementById('m-hp');
        
        if (bar) bar.style.width = `${hpPercent}%`;
        if (hpText) hpText.textContent = Math.max(Math.floor(this.currentHp), 0);
    },

    victory(state) {
        const expGain = this.currentMonster.expGain || 0;
        const goldGain = this.currentMonster.goldGain || 0;

        state.exp += expGain;
        state.gold += goldGain;

        UISystem.log(`击败【${this.currentMonster.name}】，修为+${expGain}，灵石+${goldGain}`);
        this.currentMonster = null;
    },

    defeat(state, config) {
        state.hp = 0;
        this.isResting = true;
        this.currentMonster = null;
        UISystem.log(config.strings.defeat || "战败调息中...");
    },

    handleResting(state) {
        const heal = state.maxHp * 0.1;
        state.hp = Math.min(state.hp + heal, state.maxHp);

        if (state.hp >= state.maxHp) {
            this.isResting = false;
            UISystem.log("伤势已痊愈，重返战场！");
        }
    }
};
