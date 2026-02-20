import { UISystem } from './ui.js';

/**
 * BattleSystem - 战斗核心
 * 职责：处理战斗状态机、伤害结算与奖励掉落
 */
export const BattleSystem = {
    currentMonster: null,
    currentHp: 0,
    isInitialised: false,

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
    tick(state, config, monsterData) {
        if (!this.currentMonster) {
            this.setupMonster(config, monsterData);
            return;
        }

        // 1. 玩家攻击怪物 (基础逻辑：玩家每次攻击造成 10 点固定伤害，后续可接入 state.atk)
        const playerAtk = 10; 
        this.currentHp -= playerAtk;
        
        // 更新 UI 血条
        const hpPercent = Math.max((this.currentHp / this.currentMonster.hp) * 100, 0);
        document.getElementById('m-hp-bar').style.width = `${hpPercent}%`;
        document.getElementById('m-hp').textContent = Math.max(this.currentHp, 0);

        // 2. 检查怪物死亡
        if (this.currentHp <= 0) {
            this.victory(state, config, monsterData);
        }
    },

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
