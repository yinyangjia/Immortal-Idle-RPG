import { SaveSystem } from './systems/save.js';
import { UISystem } from './systems/ui.js';
import { CultivationSystem } from './systems/cultivation.js';
import { BattleSystem } from './systems/battle.js';

class GameEngine {
    constructor() {
        this.config = null;
        this.monsterData = null; // 新增怪物数据容器
        this.state = null;
        this.loopTimer = null;
    }

    async init() {
        try {
            // 并行加载基础配置与怪物数据
            const [configRes, monsterRes] = await Promise.all([
                fetch('./data/data.json'),
                fetch('./data/monsters.json')
            ]);
            
            this.config = await configRes.json();
            this.monsterData = await monsterRes.json();
            
            this.state = SaveSystem.load(this.config);

            UISystem.init(this.config);
            UISystem.render(this.state);
            this.bindEvents();

            this.startGameLoop();
            UISystem.log("战斗系统加载完毕，自动搜索对手中...");
        } catch (error) {
            console.error("引擎初始化失败:", error);
        }
    }

    startGameLoop() {
        if (this.loopTimer) clearInterval(this.loopTimer);
        
        this.loopTimer = setInterval(() => {
            // 1. 修行逻辑（每秒加修为）
            CultivationSystem.tick(this.state, this.config);
            
            // 2. 战斗逻辑（每秒进行一次攻击结算）
            BattleSystem.tick(this.state, this.config, this.monsterData);
            
            // 3. 统一渲染
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
