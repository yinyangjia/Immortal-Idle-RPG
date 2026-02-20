/**
 * UISystem - 视图渲染模块
 */
export const UISystem = {
    elements: {},

    init(config) {
        // 缓存 DOM 节点提升性能
        this.elements = {
            title: document.getElementById('game-title'),
            rank: document.getElementById('p-rank'),
            exp: document.getElementById('p-exp'),
            next: document.getElementById('p-next'),
            expBar: document.getElementById('p-exp-bar'),
            gold: document.getElementById('p-gold'),
            logs: document.getElementById('game-logs')
        };

        this.elements.title.textContent = config.gameInfo.title;
    },

    /**
     * 全量更新视图：将 state 中的数据同步到界面
     */
    render(state) {
        const { rank, exp, nextLevelExp, gold } = state;
        
        this.elements.rank.textContent = rank;
        this.elements.exp.textContent = exp;
        this.elements.next.textContent = nextLevelExp;
        this.elements.gold.textContent = gold;

        // 计算进度条宽度
        const percent = Math.min((exp / nextLevelExp) * 100, 100);
        this.elements.expBar.style.width = `${percent}%`;
    },

    /**
     * 游戏日志打印
     */
    log(message) {
        const p = document.createElement('p');
        p.className = 'log-entry';
        p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.elements.logs.prepend(p); // 最新的在上面
    }
};
