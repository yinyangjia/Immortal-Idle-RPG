import { UISystem } from './ui.js';

/**
 * BattleSystem - 战斗核心模块 (V1.5.2)
 * 职责：处理回合制伤害结算、怪物AI反击、战败调息及奖励分发。
 */
export const BattleSystem = {
    currentMonster: null,
    currentHp: 0,
    isResting: false,

    /**
     * 战斗主循环
     * @param {Object} state - 玩家实时状态
     * @param {Object} config - 全局配置 (data.json)
     * @param {Object} monsterData - 怪物数据库 (monsters.json)
     */
    tick(state, config, monsterData) {
        // 1. 战败调息判定
        if (this.isResting) {
            this.handleResting(state);
            return;
        }

        // 2. 怪物生成判定 (对应原 31 行报错位置)
        if (!this.currentMonster) {
            this.setupMonster(config, monsterMonsterData(monsterData));
            return;
        }

        // 3. 玩家回合：造成伤害 (基于 state.atk)
        const playerDamage = state.atk || 5;
        this.currentHp -= playerDamage;

        // 4. 怪物回合：反击玩家
        const monsterAtk = this.currentMonster.atk || 1;
        state.hp -= monsterAtk;

        // 5. 判定玩家是否战败
        if (state.hp <= 0) {
            this.defeat(state, config);
            return;
        }

        // 6. 判定怪物是否死亡 (胜利结算)
        if (this.currentHp <= 0) {
            this.victory(state);
        } else {
            // 战斗进行中：仅更新怪物血条 UI
            const hpPercent = Math.max((this.currentHp / (this.currentMonster.maxHp || this.currentMonster.hp)) * 100, 0);
            const bar = document.getElementById('m-hp-bar');
            if (bar) bar.style.width = `${hpPercent}%`;
            const hpText = document.getElementById('m-hp');
            if (hpText) hpText.textContent = Math.max(Math.floor(this.currentHp), 0);
        }
    },

    setupMonster(config, monsterList) {
        const randomIndex = Math.floor(Math.random() * monsterList.length);
        const template = monsterList[randomIndex];

        // 核心：使用深拷贝确保不污染原始数据
        this.currentMonster = JSON.parse(JSON.stringify(template));
        this.currentMonster.maxHp = this.currentMonster.hp; // 记录初始血量用于计算进度条
        this.currentHp = this.currentMonster.hp;

        UISystem.renderMonster(this.currentMonster);
        UISystem.log(`在草丛中遇到一只【${this.currentMonster.name}】！`);
    },

    victory(state) {
        const expGain = this.currentMonster.expGain || 0;
        const goldGain = this.currentMonster.goldGain || 0;

        state.exp += expGain;
        state.gold += goldGain;

        UISystem.log(`击败【${this.currentMonster.name}】，修为+${expGain}，灵石+${goldGain}`);
        this.currentMonster = null; // 清空当前对手，等待下一轮 tick 寻找新怪
    },

    defeat(state, config) {
        state.hp = 0;
        this.isResting = true;
        this.currentMonster = null;
        UISystem.log(config.strings.defeat || "战败调息中...");
    },

    handleResting(state) {
        // 每秒恢复 10% 最大生命值
        const heal = state.maxHp * 0.1;
        state.hp = Math.min(state.hp + heal, state.maxHp);

        if (state.hp >= state.maxHp) {
            this.isResting = false;
            UISystem.log("伤势已痊愈，重返战场！");
        }
    }
};

/**
 * 辅助工具：提取所有区域的怪物列表
 */
function monsterMonsterData(monsterData) {
    let allMonsters = [];
    monsterData.zones.forEach(zone => {
        allMonsters = allMonsters.concat(zone.monsters);
    });
    return allMonsters;
}
