export const UISystem = {
    elements: {},

    init(config) {
        this.elements = {
            title: document.getElementById('game-title'),
            rank: document.getElementById('p-rank'),
            exp: document.getElementById('p-exp'),
            next: document.getElementById('p-next'),
            expBar: document.getElementById('p-exp-bar'),
            gold: document.getElementById('p-gold'),
            logs: document.getElementById('game-logs'),
            // 新增战斗元素
            mName: document.getElementById('m-name'),
            mHp: document.getElementById('m-hp'),
            mMaxHp: document.getElementById('m-max-hp'),
            mHpBar: document.getElementById('m-hp-bar'),
            mDesc: document.getElementById('m-desc'),
            battleBtn: document.getElementById('battle-btn')
        };
        this.elements.title.textContent = config.gameInfo.title;
    },

    render(state) {
        const { rank, exp, nextLevelExp, gold } = state;
        this.elements.rank.textContent = rank;
        this.elements.exp.textContent = exp;
        this.elements.next.textContent = nextLevelExp;
        this.elements.gold.textContent = gold;
        const percent = Math.min((exp / nextLevelExp) * 100, 100);
        this.elements.expBar.style.width = `${percent}%`;
    },

    /**
     * 渲染怪物信息
     */
    renderMonster(monster) {
        if (!monster) return;
        this.elements.mName.textContent = monster.name;
        this.elements.mHp.textContent = monster.hp;
        this.elements.mMaxHp.textContent = monster.hp;
        this.elements.mDesc.textContent = monster.desc;
        this.elements.mHpBar.style.width = "100%";
        this.elements.battleBtn.disabled = false;
    },

    log(message) {
        const p = document.createElement('p');
        p.className = 'log-entry';
        p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.elements.logs.prepend(p);
    }
};
