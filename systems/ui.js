/**
 * UISystem - 视图渲染模块 (V1.9.2)
 * 职责：处理角色属性、怪物面板、本命法宝及日志的动态显示。
 */
export const UISystem = {
    elements: {},

    init(config) {
        this.elements = {
            // 基础信息
            rank: document.getElementById('p-rank'),
            atk: document.getElementById('p-atk'), // 总攻击力展示位
            hp: document.getElementById('p-hp'),
            maxHp: document.getElementById('p-max-hp'),
            hpBar: document.getElementById('p-hp-bar'),
            expBar: document.getElementById('p-exp-bar'),
            gold: document.getElementById('p-gold'),
            
            // 法宝 UI
            artName: document.getElementById('art-full-name'),
            artLevel: document.getElementById('art-level'),
            artLevelBar: document.getElementById('art-level-bar'),
            artAffixes: document.getElementById('art-affixes'),
            artProBtn: document.getElementById('art-pro-btn'),

            // 怪物与副本
            mName: document.getElementById('m-name'),
            mHp: document.getElementById('m-hp'),
            mMaxHp: document.getElementById('m-max-hp'),
            mHpBar: document.getElementById('m-hp-bar'),
            towerFloor: document.getElementById('tower-floor'),
            logs: document.getElementById('game-logs')
        };
    },

    /**
     * 主渲染入口
     */
    render(state, artifactData) {
        if (!this.elements.rank) return;

        // 1. 玩家核心状态
        this.elements.rank.textContent = state.rank;
        this.elements.atk.textContent = state.totalAtk || state.atk; // 优先显示总攻击力
        this.elements.gold.textContent = state.gold;
        
        // HP 渲染
        this.elements.hp.textContent = Math.floor(state.hp);
        this.elements.maxHp.textContent = state.maxHp;
        const hpPct = Math.max((state.hp / state.maxHp) * 100, 0);
        this.elements.hpBar.style.width = `${hpPct}%`;

        // EXP 渲染
        const expPct = Math.min((state.exp / state.nextLevelExp) * 100, 100);
        this.elements.expBar.style.width = `${expPct}%`;

        // 2. 副本信息
        if (this.elements.towerFloor) {
            this.elements.towerFloor.textContent = state.towerFloor || 1;
        }

        // 3. 本命法宝渲染
        this.renderArtifact(state, artifactData);
    },

    /**
     * 本命法宝专项渲染
     */
    renderArtifact(state, artifactData) {
        const art = state.artifact;
        if (!art || !artifactData || !this.elements.artName) return;

        const tier = artifactData.tiers[art.tierIndex];
        const qual = artifactData.qualities[art.qualityIndex];
        const qualColors = ['white', 'green', 'orange', 'red'];
        const qualColorClass = `q-${qualColors[art.qualityIndex] || 'white'}`;

        // A. 名称渲染 (应用阶位 CSS 特效 + 品质色)
        this.elements.artName.innerHTML = `
            <span class="${tier.css}">【${tier.name}】</span>
            <span class="${qualColorClass}">${qual.name} · ${art.name}</span>
        `;

        // B. 等级进度
        this.elements.artLevel.textContent = art.level;
        this.elements.artLevelBar.style.width = `${(art.level / 10) * 100}%`;

        // C. 词条渲染
        if (this.elements.artAffixes) {
            this.elements.artAffixes.innerHTML = art.affixes.length > 0 
                ? art.affixes.map(a => `
                    <div class="affix-row">
                        <span>${a.name}</span>
                        <span>+${a.value}${a.unit}</span>
                    </div>`).join('')
                : '<div class="affix-tip">凡器未通灵，暂无词条</div>';
        }

        // D. 突破按钮状态
        if (this.elements.artProBtn) {
            this.elements.artProBtn.disabled = (art.level < 10);
            this.elements.artProBtn.textContent = art.qualityIndex === 3 ? "升阶突破" : "提升品质";
        }
    },

    /**
     * 怪物面板渲染
     */
    renderMonster(monster) {
        if (!this.elements.mName) return;
        this.elements.mName.textContent = monster.name;
        this.elements.mHp.textContent = Math.max(0, Math.floor(monster.hp));
        this.elements.mMaxHp.textContent = monster.maxHp;
        this.elements.mHpBar.style.width = "100%";
    },

    log(msg) {
        const p = document.createElement('p');
        p.className = 'log-entry';
        p.textContent = `[${new Date().toLocaleTimeString([], {hour12:false})}] ${msg}`;
        if (this.elements.logs) {
            this.elements.logs.prepend(p);
            if (this.elements.logs.children.length > 50) {
                this.elements.logs.removeChild(this.elements.logs.lastChild);
            }
        }
    }
};
