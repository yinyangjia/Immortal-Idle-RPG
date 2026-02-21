import { UISystem } from './ui.js';

export const ArtifactSystem = {
    /**
     * 计算法宝总攻击力
     * 公式：(阶级基础值 + 等级加成) * 品质倍率 * 阶级倍率 * (1 + 词条总和)
     */
    getBonus: function(state, artifactData) {
        if (!state.artifact) return 0;
        const tier = artifactData.tiers[state.artifact.tierIndex];
        const quality = artifactData.qualities[state.artifact.qualityIndex];
        
        const base = tier.baseAtk + (state.artifact.level * 10); // 等级加法
        const multi = tier.multiplier * quality.multiplier;      // 阶级与品质乘法
        
        let affixBonus = 1;
        state.artifact.affixes.forEach(a => {
            if (a.type === 'atk_pct') affixBonus += (a.value / 100);
        });

        return Math.floor(base * multi * affixBonus);
    },

    /**
     * 升级 (1-10级)
     */
    levelUp: function(state) {
        if (state.artifact.level < 10) {
            state.artifact.level++;
            UISystem.log(`法宝淬炼完成，当前等级：${state.artifact.level}`);
        }
    },

    /**
     * 提升品质 (完美后可升阶)
     */
    promote: function(state, artifactData) {
        if (state.artifact.level < 10) return;

        if (state.artifact.qualityIndex < 3) {
            // 升品质
            state.artifact.qualityIndex++;
            state.artifact.level = 1;
            UISystem.log(`法宝进阶！当前品质：${artifactData.qualities[state.artifact.qualityIndex].name}`);
        } else if (state.artifact.tierIndex < 7) {
            // 升阶 (达到完美品质且10级)
            state.artifact.tierIndex++;
            state.artifact.qualityIndex = 0;
            state.artifact.level = 1;
            // 新增词条槽位
            this.addAffix(state, artifactData);
            UISystem.log(`✨ 逆天改命！法宝突破至【${artifactData.tiers[state.artifact.tierIndex].name}】！`);
        }
    },

    addAffix: function(state, artifactData) {
        const pool = artifactData.affixPool;
        const randomAffix = pool[Math.floor(Math.random() * pool.length)];
        const val = Math.floor(Math.random() * (randomAffix.max - randomAffix.min + 1)) + randomAffix.min;
        state.artifact.affixes.push({ ...randomAffix, value: val, locked: false });
    }
};
