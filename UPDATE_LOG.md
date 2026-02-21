# Immortal-Idle-RPG 开发日志

## [V1.0.0] - 2026-02-20
### 当前状态
- **架构**：完成基于 SOP V3.1 的模块化重构。
- **逻辑链条**：`core.js` 加载 `data/data.json` 后，初始化 `ui.js` 和 `save.js`。
- **数据源**：所有基础数值存放在 `data/data.json`，逻辑层通过 `import` 调用。

### 已完成模块
- [x] 纯净 UI 骨架 (index.html)
- [x] 模块化引擎加载器 (core.js)
- [x] 基础存档/读档系统 (save.js)
- [x] 数据与逻辑完全分离。

### 🚩 当前逻辑锚点
- 存档系统当前使用 `localStorage`，键名为 `ImmortalIdle_Save`。
- 界面更新通过 `ui.js` 的 `updateDisplay` 函数统一调度。

### 🚀 TODO
- [ ] 编写 `/systems/battle.js` 战斗逻辑。
- [ ] 剥离武器数据到 `/data/weapons.json`。
- [ ] 实现基础挂机收益计算。

## [V1.7.0] - 2026-02-22
### 架构升级
- **副本系统基石**：引入 `currentMode` (idle/tower/elite) 状态机控制战斗流程。
- **爬塔逻辑**：实现 `Stat * Growth^(Floor-1)` 的指数难度公式，数值高度解耦。
- **挂机逻辑**：设定为“只要击败一次即可选择”的前置准备（当前默认激活第一关）。

### 🚩 当前逻辑锚点
- 战斗模块根据 `state.currentMode` 自动切换数值源。
- `towerFloor` 存储在存档中，战胜后自动累加。
- 精英怪目前为单体固定配置，未来可扩展为定时刷新。

### 🚀 TODO
- [ ] 增加 **挂机副本选择列表**（只有打过的副本才出现在列表中）。
- [ ] 丰富 **精英怪刷新机制**。
- [ ] 完善 **页签切换 UI** 的 CSS 样式美化。
