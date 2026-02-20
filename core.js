import { SaveSystem } from './systems/save.js';
import { UISystem } from './systems/ui.js';

/**
 * GameEngine - 核心调度器
 * 职责：控制游戏初始化逻辑，不参与具体业务数值计算
 */
class GameEngine {
    constructor() {
        this.config = null; // 静态配置
        this.state = null;  // 动态存档
    }

    async init() {
        try {
            // 1. 异步获取基础数据
            const response = await fetch('./data/data.json');
            this.config = await response.json();

            // 2. 加载或初始化存档
            this.state = SaveSystem.load(this.config);

            // 3. 初始化 UI 模块并执行首次渲染
            UISystem.init(this.config);
            UISystem.render(this.state);

            // 4. 绑定全局操作事件
            this.bindEvents();

            console.log(`${this.config.gameInfo.title} V${this.config.gameInfo.version} 启动成功`);
            UISystem.log("欢迎来到修仙世界。");

        } catch (error) {
            console.error("引擎引导失败:", error);
            alert("游戏初始化异常，请检查控制台。");
        }
    }

    bindEvents() {
        // 保存按钮
        document.getElementById('save-btn').onclick = () => {
            SaveSystem.save(this.state, this.config.gameInfo.saveKey);
            UISystem.log(this.config.strings.saveSuccess);
        };

        // 重置按钮
        document.getElementById('reset-btn').onclick = () => {
            if (confirm(this.config.strings.resetConfirm)) {
                SaveSystem.clear(this.config.gameInfo.saveKey);
                location.reload();
            }
        };
    }
}

// 实例化并启动
const engine = new GameEngine();
engine.init();
