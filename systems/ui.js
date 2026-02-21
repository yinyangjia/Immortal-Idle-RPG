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
            zoneName: document.getElementById('current-zone-name'),
            zoneSelector: document.getElementById('zone-selector'),
            towerFloor: document.getElementById('tower-floor'),
            mName: document.getElementById('m-name'),
            mHp: document.getElementById('m-hp'),
            mMaxHp: document.getElementById('m-max-hp'),
            mHpBar: document.getElementById('m-hp-bar'),
            logs: document.getElementById('game-logs')
        };
    },

    render(state, zoneData) {
        // 1. 基础属性渲染 (略，同之前)
        this.elements.rank.textContent = state.rank;
        this.elements.hp.textContent = Math.floor(state.hp);
        this.elements.maxHp.textContent = state.maxHp;
        this.elements.hpBar.style.width = `${(state.hp/state.maxHp)*100}%`;
        this.elements.atk.textContent = state.atk;
        this.elements.gold.textContent = state.gold;
        this.elements.exp.textContent = state.exp;
        this.elements.next.textContent = state.nextLevelExp;
        this.elements.expBar.style.width = `${(state.exp/state.nextLevelExp)*100}%`;

        // 2. 副本信息渲染
        this.elements.towerFloor.textContent = state.towerFloor;
        if (state.currentMode === 'idle') {
            document.getElementById('idle-selector-container').style.display = 'block';
            this.renderZoneSelector(state, zoneData);
        } else {
            document.getElementById('idle-selector-container').style.display = 'none';
        }
    },

    /**
     * 动态渲染已解锁的副本下拉列表
     */
    renderZoneSelector(state, zoneData) {
        if (!zoneData || !this.elements.zoneSelector) return;
        
        // 只有当数量变动时才重新渲染，防止下拉框闪烁
        if (this.elements.zoneSelector.children.length === state.unlockedZones.length) return;

        this.elements.zoneSelector.innerHTML = '';
        zoneData.idleZones.forEach(zone => {
            if (state.unlockedZones.includes(zone.id)) {
                const opt = document.createElement('option');
                opt.value = zone.id;
                opt.textContent = zone.name;
                opt.selected = (state.currentZoneId === zone.id);
                this.elements.zoneSelector.appendChild(opt);
            }
        });
    },

    renderMonster(monster) {
        this.elements.mName.textContent = monster.name;
        this.elements.mHp.textContent = Math.max(0, Math.floor(monster.hp));
        this.elements.mMaxHp.textContent = monster.maxHp;
        this.elements.mHpBar.style.width = "100%";
    },

    log(msg) {
        const p = document.createElement('p');
        p.className = 'log-entry';
        p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        this.elements.logs.prepend(p);
    }
};
