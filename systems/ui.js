export const UISystem = {
    elements: {},

    init(config) {
        this.elements = {
            title: document.getElementById('game-title'),
            rank: document.getElementById('p-rank'),
            hp: document.getElementById('p-hp'),
            maxHp: document.getElementById('p-max-hp'),
            hpBar: document.getElementById('p-hp-bar'),
            atk: document.getElementById('p-atk'),
            exp: document.getElementById('p-exp'),
            next: document.getElementById('p-next'),
            expBar: document.getElementById('p-exp-bar'),
            gold: document.getElementById('p-gold'),
            towerFloor: document.getElementById('tower-floor'),
            mName: document.getElementById('m-name'),
            mHp: document.getElementById('m-hp'),
            mMaxHp: document.getElementById('m-max-hp'),
            mHpBar: document.getElementById('m-hp-bar'),
            logs: document.getElementById('game-logs')
        };
        if (this.elements.title) this.elements.title.textContent = config.gameInfo.title;
    },

    render(state) {
        if (!this.elements.rank) return;
        this.elements.rank.textContent = state.rank;
        this.elements.hp.textContent = Math.floor(state.hp);
        this.elements.maxHp.textContent = state.maxHp;
        this.elements.hpBar.style.width = `${(state.hp / state.maxHp) * 100}%`;
        this.elements.atk.textContent = state.atk;
        this.elements.gold.textContent = state.gold;
        this.elements.exp.textContent = state.exp;
        this.elements.next.textContent = state.nextLevelExp;
        this.elements.expBar.style.width = `${(state.exp / state.nextLevelExp) * 100}%`;
        this.elements.towerFloor.textContent = state.towerFloor || 1;
    },

    renderMonster(monster) {
        if (!this.elements.mName) return;
        this.elements.mName.textContent = monster.name;
        this.elements.mHp.textContent = Math.max(0, Math.floor(monster.hp));
        this.elements.mMaxHp.textContent = monster.maxHp;
        this.elements.mHpBar.style.width = "100%";
        // 核心修复：移除了对 battle-btn 的 disabled 操作
    },

    log(msg) {
        const p = document.createElement('p');
        p.className = 'log-entry';
        p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        if (this.elements.logs) this.elements.logs.prepend(p);
    }
};
