import { SaveSystem } from './systems/save.js';
import { UISystem } from './systems/ui.js';
import { CultivationSystem } from './systems/cultivation.js';
import { BattleSystem } from './systems/battle.js';

class GameEngine {
    constructor() {
        this.config = null;
        this.zoneData = null;
        this.state = null;
        this.loopTimer = null;
    }

    async init() {
        try {
            const [configRes, zoneRes] = await Promise.all([
                fetch('./data/data.json'),
                fetch('./data/zones.json')
            ]);
            this.config = await configRes.json();
            this.zoneData = await zoneRes.json();
            this.state = SaveSystem.load(this.config);

            UISystem.init(this.config);
            UISystem.render(this.state);
            this.bindEvents();
            this.startGameLoop();
            UISystem.log("引擎引导成功。");
        } catch (e) { console.error("引导失败:", e); }
    }

    startGameLoop() {
        if (this.loopTimer) clearInterval(this.loopTimer);
        this.loopTimer = setInterval(() => {
            CultivationSystem.tick(this.state, this.config);
            BattleSystem.tick(this.state, this.config, this.zoneData);
            UISystem.render(this.state);
        }, 1000);
    }

    bindEvents() {
        document.getElementById('save-btn').onclick = () => SaveSystem.save(this.state, this.config.gameInfo.saveKey);
        document.getElementById('reset-btn').onclick = () => {
            if (confirm("清空修为？")) { SaveSystem.clear(this.config.gameInfo.saveKey); location.reload(); }
        };
    }
}

const engine = new GameEngine();
engine.init();

// 全局页签切换函数
window.switchMode = (mode) => {
    if (!engine.state) return;
    engine.state.currentMode = mode;
    BattleSystem.currentMonster = null;
    UISystem.log(`目标：${mode}`);
};

window.changeZone = (zoneId) => {
    if (!engine.state) return;
    engine.state.currentZoneId = zoneId;
    BattleSystem.currentMonster = null;
};
