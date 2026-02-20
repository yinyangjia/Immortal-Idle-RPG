import { UISystem } from './ui.js';

/**
 * BattleSystem - 战斗核心
 * 职责：处理战斗状态机、伤害结算与奖励掉落
 */
export const BattleSystem = {
    currentMonster: null,
    currentHp: 0,
    isResting: false,

    /**
     * 初始化战斗：从区域中随机抽取一个怪物
     */
    setupMonster(config, monsterData) {
        const zone = monsterData.zones[0]; // 默认第一个区域
        const randomIndex = Math.floor(Math.random() * zone.monsters.length);
        const monsterTemplate = zone.monsters[randomIndex];

        // 深拷贝怪物数据，防止修改原始 JSON
        this.currentMonster = JSON.parse(JSON.stringify(monsterTemplate));
        this.currentHp = this.currentMonster.hp;
        
        UISystem.renderMonster(this.currentMonster);
        UISystem.log(`遇到了一只【${this.currentMonster.name}】，战斗开始！`);
    },

    /**
     * 战斗心跳：由 core.js 每秒触发
     */
import { UISystem } from './ui.js';

export const BattleSystem = {
    currentMonster: null,
    currentHp: 0,
    isResting: false, // 战败调息状态

    tick(state, config, monsterData) {
        if (this.isResting) {
            this.handleResting(state);
            return;
        }

        if (!this.currentMonster) {
            this.setupMonster(config, monsterData);
            return;
        }

        // 1. 玩家攻击怪物
        const playerDamage = state.atk || 5;
        this.currentHp -= playerDamage;

        // 2. 怪物反击玩家
        const monsterDamage = this.currentMonster.atk || 1;
        state.hp -= monsterDamage;

        // 3. 检查战败 (玩家死亡)
        if (state.hp <= 0) {
            this.defeat(state, config);
            return;
        }

        // 4. 检查胜利 (怪物死亡)
        if (this.currentHp <= 0) {
            this.victory(state);
        }
        
        // 更新怪物血条 UI (代码略，同 V1.3.0)
    },

    defeat(state, config) {
        UISystem.log(config.strings.defeat);
        state.hp = 0;
        this.currentMonster = null; // 丢失当前对手
        this.isResting = true;
    },

    handleResting(state) {
        // 调息逻辑：每秒恢复 10% 的生命值
        const recover = state.maxHp * 0.1;
        state.hp += recover;
        if (state.hp >= state.maxHp) {
            state.hp = state.maxHp;
            this.isResting = false;
            UISystem.log("伤势痊愈，重新开始修行。");
        }
    },


    defeat(state, config) {
        UISystem.log(config.strings.defeat);
        state.hp = 0;
        this.currentMonster = null; // 丢失当前对手
        this.isResting = true;
    },

    handleResting(state) {
        // 调息逻辑：每秒恢复 10% 的生命值
        const recover = state.maxHp * 0.1;
        state.hp += recover;
        if (state.hp >= state.maxHp) {
            state.hp = state.maxHp;
            this.isResting = false;
            UISystem.log("伤势痊愈，重新开始修行。");
        }
    },
    
    victory(state) {
        const rewardExp = this.currentMonster.expGain;
        const rewardGold = this.currentMonster.goldGain;
        state.exp += rewardExp;
        state.gold += rewardGold;
        UISystem.log(`击败了【${this.currentMonster.name}】，获得修为+${rewardExp}`);
        this.currentMonster = null;
    },
    
    // setupMonster 函数保持不变...
};
    /**
     * 战斗胜利：发放奖励并重置战斗
     */
    victory(state, config, monsterData) {
        const rewardExp = this.currentMonster.expGain;
        const rewardGold = this.currentMonster.goldGain;

        state.exp += rewardExp;
        state.gold += rewardGold;

        UISystem.log(`击败了【${this.currentMonster.name}】，获得修为+${rewardExp}, 灵石+${rewardGold}`);
        
        // 寻找下一个对手
        this.currentMonster = null;
    }
};
