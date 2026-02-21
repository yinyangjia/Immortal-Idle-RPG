import { SaveSystem } from './systems/save.js';
import { UISystem } from './systems/ui.js';
import { CultivationSystem } from './systems/cultivation.js';
import { BattleSystem } from './systems/battle.js';

/**
 * GameEngine - 核心调度器
 */
class GameEngine {
    constructor() {
        this.config = null;
        this.zoneData = null; 
        this.state = null;
        this.loopTimer = null;
    }

    async init() {
        try {
            // 加载所有数据层
            const [configRes, zoneRes] = await Promise.all([
                fetch('./data/data.json'),
                fetch('./data/zones.json') // 确保文件名是 zones.json
            ]);
            
            this.config = await configRes.json();
            this.zoneData = await zoneRes.json();
            
            this.state = SaveSystem.load(this.config);

            // 初始化系统
            UISystem.init(this.config);
            UISystem.render(this.state);
            this.bindEvents();

            this.startGameLoop();
            UISystem.log("副本系统就绪，请选择修行区域。");
        } catch (error) {
            console.error("引擎初始化失败:", error);
        }
    }

    startGameLoop() {
        if (this.loopTimer) clearInterval(this.loopTimer);
        this.loopTimer = setInterval(() => {
            // 1. 自动修行
            CultivationSystem.tick(this.state, this.config);
            // 2. 副本战斗
            BattleSystem.tick(this.state, this.config, this.zoneData);
            // 3. 统一 UI 渲染
            UISystem.render(this.state);
        }, 1000);
    }

    bindEvents() {
        document.getElementById('save-btn').onclick = () => {
            SaveSystem.save(this.state, this.config.gameInfo.saveKey);
            UISystem.log("神识保存成功。");
        };
        document.getElementById('reset-btn').onclick = () => {
            if (confirm("确定要重置吗？")) {
                SaveSystem.clear(this.config.gameInfo.saveKey);
                location.reload();
            }
        };
    }
}

// 1. 实例化引擎
const engine = new GameEngine();
engine.init();

/**
 * 2. 全局切换函数 (添加在最底部)
 * 职责：连接 HTML 按钮与内部系统逻辑
 */
window.switchMode = (mode) => {
    if (!engine.state) return;

    // 更新状态
    engine.state.currentMode = mode;
    
    // 关键逻辑：重置战斗状态，迫使 BattleSystem 下一秒重新寻找新怪
    BattleSystem.currentMonster = null;
    
    // UI 反馈
    const modeNames = { idle: '野外挂机', tower: '无尽爬塔', elite: '精英挑战' };
    UISystem.log(`已前往：${modeNames[mode] || mode}`);
    
    // 更新按钮高亮 (可选)
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    // 注意：这里需要根据实际点击的按钮来操作，简单起见可交由 CSS 处理
};
