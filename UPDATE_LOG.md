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
