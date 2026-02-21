import { SaveSystem } from './systems/save.js';
import { UISystem } from './systems/ui.js';
import { CultivationSystem } from './systems/cultivation.js';
import { BattleSystem } from './systems/battle.js';
import { ArtifactSystem } from './systems/artifact.js';

/**
 * GameEngine - 核心调度器 (V1.9.2)
 */
class GameEngine {
    constructor() {
        this.config = null;
        this.zoneData = null;
        this.artifactData = null;
        this.state = null;
        this.loopTimer = null;
    }

    async init() {
        try {
            // 1. 同时加载三个核心数据文件
            const [configRes, zoneRes, artRes] = await Promise.all([
                fetch('./data/data.json'),
                fetch('./data/zones.json'),
                fetch('./data/artifact.json')
            ]);
            
            this.config = await configRes.json();
            this.zoneData = await zoneRes.json();
            this.artifactData = await artRes.json();
            
            // 2. 加载或初始化存档
            this.state = SaveSystem.load(this.config);

            // 3. 初始法宝检测 (如果新玩家没有法宝，初始化一件)
            if (!this.state.artifact) {
                this.state.artifact = {
                    name: "斩神剑",
                    level: 1,
                    qualityIndex: 0,
                    tierIndex: 0,
                    affixes: []
                };
            }

            // 4. 初始化系统
            UISystem.init(this.config);
            this.bindEvents();
            this.startGameLoop();
            
            UISystem.log("大道初开，本命法宝已感应归位。");
        } catch (error) {
            console.error("引擎引导失败:", error);
        }
    }

    startGameLoop() {
        if (this.loopTimer) clearInterval(this.loopTimer);
        this.loopTimer = setInterval(() => {
            // A. 计算法宝实时加成并同步至玩家总攻击力
            const artAtkBonus = ArtifactSystem.getBonus(this.state, this.artifactData);
            const baseAtk = this.config.ranks[this.state.rankIndex].baseAtk || 5;
            this.state.totalAtk = baseAtk + artAtkBonus;

            // B. 逻辑步进
            CultivationSystem.tick(this.state, this.config);
            BattleSystem.tick(this.state, this.config, this.zoneData);

            // C. 统一渲染
            UISystem.render(this.state, this.artifactData);
        }, 1000);
    }

    bindEvents() {
        document.getElementById('save-btn').onclick = () => {
            SaveSystem.save(this.state, this.config.gameInfo.saveKey);
            UISystem.log("神识存档成功。");
        };
        document.getElementById('reset-btn').onclick = () => {
            if (confirm("确定要兵解重修（重置）吗？")) {
                SaveSystem.clear(this.config.gameInfo.saveKey);
                location.reload();
            }
        };
    }
}

// 启动引擎
const engine = new GameEngine();
engine.init();

/**
 * 全局交互映射 (用于 HTML onclick)
 */
window.switchMode = (mode) => {
    if (!engine.state) return;
    engine.state.currentMode = mode;
    BattleSystem.currentMonster = null;
    UISystem.log(`目标：${mode === 'tower' ? '无尽爬塔' : mode === 'elite' ? '精英挑战' : '野外挂机'}`);
};

window.changeZone = (zoneId) => {
    if (!engine.state) return;
    engine.state.currentZoneId = zoneId;
    BattleSystem.currentMonster = null;
};

// 法宝操作
window.artLevelUp = () => {
    ArtifactSystem.levelUp(engine.state);
};

window.artPromote = () => {
    ArtifactSystem.promote(engine.state, engine.artifactData);
};
