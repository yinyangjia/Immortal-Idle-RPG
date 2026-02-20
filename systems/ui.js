/**
 * UISystem - 视图渲染模块 (V1.5.1)
 * 职责：负责 DOM 节点的缓存、数值更新、进度条动画及日志打印。
 * 严禁：在本文件中编写任何业务逻辑（如伤害计算、突破判定）。
 */
export const UISystem = {
    elements: {},

    /**
     * 初始化 UI 系统：缓存所有必要的 DOM 引用
     * @param {Object} config - 来自 data.json 的全局配置
     */
    init(config) {
        this.elements = {
            // 顶部信息
            title: document.getElementById('game-title'),
            
            // 玩家基础状态
            rank: document.getElementById('p-rank'),
            atk: document.getElementById('p-atk'),
            gold: document.getElementById('p-gold'),

            // 玩家生命值 (HP)
            hp: document.getElementById('p-hp'),
            maxHp: document.getElementById('p-max-hp'),
            hpBar: document.getElementById('p-hp-bar'),

            // 玩家修为 (EXP)
            exp: document.getElementById('p-exp'),
            next: document.getElementById('p-next'),
            expBar: document.getElementById('p-exp-bar'),

            // 怪物面板
            mName: document.getElementById('m-name'),
            mHp: document.getElementById('m-hp'),
            mMaxHp: document.getElementById('m-max-hp'),
            mHpBar: document.getElementById('m-hp-bar'),
            mDesc: document.getElementById('m-desc'),
            battleBtn: document.getElementById('battle-btn'),

            // 日志系统
            logs: document.getElementById('game-logs')
        };

        // 设置游戏标题
        if (this.elements.title) {
            this.elements.title.textContent = config.gameInfo.title;
        }
    },

    /**
     * 核心渲染函数：将 state 数据全量同步到界面
     * @param {Object} state - 当前玩家的动态存档数据
     */
    render(state) {
        if (!this.elements.rank) return;

        // 1. 更新数值文本
        this.elements.rank.textContent = state.rank;
        this.elements.atk.textContent = state.atk;
        this.elements.gold.textContent = state.gold;
        this.elements.exp.textContent = state.exp;
        this.elements.next.textContent = state.nextLevelExp;
        this.elements.hp.textContent = Math.floor(state.hp);
        this.elements.maxHp.textContent = state.maxHp;

        // 2. 更新玩家 HP 进度条
        const hpPercent = Math.max((state.hp / state.maxHp) * 100, 0);
        this.elements.hpBar.style.width = `${hpPercent}%`;
        
        // 调息状态视觉反馈 (变灰)
        this.elements.hpBar.style.filter = state.hp <= 0 ? "grayscale(100%)" : "none";

        // 3. 更新修为进度条
        const expPercent = Math.min((state.exp / state.nextLevelExp) * 100, 100);
        this.elements.expBar.style.width = `${expPercent}%`;
    },

    /**
     * 渲染当前怪物信息
     * @param {Object} monster - 当前战斗中的怪物实例
     */
    renderMonster(monster) {
        if (!monster) {
            this.elements.mName.textContent = "寻找对手中...";
            this.elements.mHp.textContent = "-";
            this.elements.mMaxHp.textContent = "-";
            this.elements.mHpBar.style.width = "0%";
            this.elements.mDesc.textContent = "";
            return;
        }

        this.elements.mName.textContent = monster.name;
        this.elements.mHp.textContent = Math.max(monster.hp, 0); // 这里的 hp 是动态变化的
        this.elements.mMaxHp.textContent = monster.maxHp || monster.hp; // 优先取 maxHp
        this.elements.mDesc.textContent = monster.desc;

        // 按钮状态控制
        this.elements.battleBtn.disabled = false;
    },

    /**
     * 打印游戏日志
     * @param {string} message - 日志内容
     */
    log(message) {
        const p = document.createElement('p');
        p.className = 'log-entry';
        const time = new Date().toLocaleTimeString([], { hour12: false });
        p.textContent = `[${time}] ${message}`;
        
        const logContainer = this.elements.logs;
        logContainer.prepend(p);

        // 自动清理旧日志，保持性能 (保留最后 50 条)
        if (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }
};
