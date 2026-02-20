/**
 * SaveSystem - 存档逻辑模块
 */
export const SaveSystem = {
    /**
     * 加载存档：若无存档则克隆 data.json 中的初始值
     */
    load(config) {
        const key = config.gameInfo.saveKey;
        const savedData = localStorage.getItem(key);
        
        if (savedData) {
            try {
                return JSON.parse(savedData);
            } catch (e) {
                console.warn("存档损坏，正在应用初始配置...");
            }
        }
        
        // 使用结构克隆初始值，防止污染原始配置
        return JSON.parse(JSON.stringify(config.initialPlayerState));
    },

    save(state, key) {
        state.lastUpdate = Date.now();
        localStorage.setItem(key, JSON.stringify(state));
    },

    clear(key) {
        localStorage.removeItem(key);
    }
};
