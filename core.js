import { SaveSystem } from './systems/save.js';
import { UISystem } from './systems/ui.js';
import { CultivationSystem } from './systems/cultivation.js';

class GameEngine {
    constructor() {
        this.config = null;
        this.state = null;
        this.loopTimer = null;
    }

    async init() {
        try {
            const response = await fetch('./data/data.json');
            this.config = await response.json();
            this.state = SaveSystem.load(this.config);

            UISystem.init(this.config);
            UISystem.render(this.state);
            this.bindEvents();

            // 启动游戏主循环 (每 1000ms 一次 tick)
            this.startGameLoop();

            UISystem.log("灵气感应中，自动修行已开启...");
        } catch (error) {
            console.error("引擎初始化失败:", error);
        }
    }

    startGameLoop() {
        if (this.loopTimer) clearInterval(this.loopTimer);
        
        this.loopTimer = setInterval(() => {
            // 执行修行逻辑
            CultivationSystem.tick(this.state, this.config);
            
            // 更新 UI
            UISystem.render(this.state);
        }, 1000);
    }

    bindEvents() {
        document.getElementById('save-btn').onclick = () => {
            SaveSystem.save(this.state, this.config.gameInfo.saveKey);
            UISystem.log(this.config.strings.saveSuccess);
        };

        document.getElementById('reset-btn').onclick = () => {
            if (confirm(this.config.strings.resetConfirm)) {
                SaveSystem.clear(this.config.gameInfo.saveKey);
                location.reload();
            }
        };
    }
}

const engine = new GameEngine();
engine.init();
