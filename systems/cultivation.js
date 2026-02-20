import { UISystem } from './ui.js';

/**
 * CultivationSystem - 修行核心
 * 职责：处理数值增长逻辑，不直接操作 DOM
 */
export const CultivationSystem = {
    /**
     * 执行一次修行循环
     */
    tick(state, config) {
        // 1. 基础经验增长 (此处可根据装备/境界加成)
        const baseGain = 1; 
        state.exp += baseGain;

        // 2. 检查是否达到突破条件
        if (state.exp >= state.nextLevelExp) {
            this.tryBreakthrough(state, config);
        }
    },

    /**
     * 境界突破逻辑
     */
    tryBreakthrough(state, config) {
        const nextRankIndex = state.rankIndex + 1;
        
        if (nextRankIndex < config.ranks.length) {
            const nextRank = config.ranks[nextRankIndex];
            
            state.rankIndex = nextRankIndex;
            state.rank = nextRank.name;
            state.exp = 0; // 突破后修为清零
            state.nextLevelExp = nextRank.requirement;

            UISystem.log(`✨ 恭喜突破至 【${state.rank}】！`);
        } else {
            // 已达最高境界，溢出处理
            state.exp = state.nextLevelExp;
        }
    }
};
