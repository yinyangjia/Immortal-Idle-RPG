import { UISystem } from './ui.js';

/**
 * CultivationSystem - 修行核心
 * 职责：处理数值增长逻辑，不直接操作 DOM
 */

export const CultivationSystem = {
    tick(state, config) {
        state.exp += 1;
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
            state.exp = 0;
            state.nextLevelExp = nextRank.requirement;
            
            // 核心逻辑：从 data.json 读取境界对应的攻击力
            state.atk = nextRank.baseAtk; 

            UISystem.log(`✨ 突破至 【${state.rank}】，攻击力提升至 ${state.atk}！`);
        }
    }
};
