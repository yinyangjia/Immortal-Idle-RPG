const GAME_DATA = {
    // 境界设定：名、所需修为、属性倍率
    realms: [
        { name: "凡人", exp: 100, mult: 1 },
        { name: "练气期", exp: 500, mult: 1.5 },
        { name: "筑基期", exp: 2000, mult: 3 },
        { name: "金丹期", exp: 10000, mult: 10 },
        { name: "元婴期", exp: 50000, mult: 50 },
        { name: "化神期", exp: 200000, mult: 200 }
    ],
    
    // 怪物生成逻辑
    maps: {
        field: {
            name: "蛮荒野外",
            // 野外怪物随玩家战力浮动，总是比玩家弱一点，保证挂机效率
            genEnemy: (player) => ({
                name: "野猪妖",
                hp: Math.floor(player.atk * 5),
                atk: Math.floor(player.def * 0.8), // 破不了防
                def: 0,
                pen: 0,
                exp: 10
            })
        },
        boss: {
            name: "上古禁地",
            // BOSS 属性固定，是检验玩家的考官
            genEnemy: (player) => ({
                name: "远古魔像",
                hp: player.maxHp * 10,
                atk: player.def * 1.5 + 20, // 必定破防
                def: player.atk * 0.5,
                pen: 10,
                exp: 1000
            })
        },
        tower: {
            name: "镇妖塔",
            // 塔怪：指数级增长
            genEnemy: (player, floor) => {
                const scaling = Math.pow(1.1, floor); // 每层属性增加 10%
                return {
                    name: `第${floor}层 守塔者`,
                    hp: Math.floor(100 * scaling),
                    atk: Math.floor(15 * scaling),
                    def: Math.floor(5 * scaling),
                    pen: Math.floor(2 * scaling),
                    exp: Math.floor(20 * scaling)
                };
            }
        }
    }
};
