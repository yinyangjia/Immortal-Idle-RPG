const GAME_DATA = {
    // 境界设定 (保持不变)
    realms: [
        { name: "凡人", exp: 100, mult: 1 },
        { name: "练气期", exp: 500, mult: 1.5 },
        { name: "筑基期", exp: 2000, mult: 3 },
        { name: "金丹期", exp: 10000, mult: 10 },
        { name: "元婴期", exp: 50000, mult: 50 },
        { name: "化神期", exp: 200000, mult: 200 }
    ],
    
    // --- 新增：野外怪物列表 (等级, 名字, 血量系数, 经验, 掉落灵石) ---
    fieldMonsters: [
        { level: 1, name: "野兔精", hpMult: 1, atkMult: 0.5, exp: 5, money: 1 },
        { level: 5, name: "狂暴野猪", hpMult: 3, atkMult: 1, exp: 15, money: 5 },
        { level: 10, name: "铁皮蛮牛", hpMult: 8, atkMult: 2, exp: 50, money: 20 },
        { level: 20, name: "赤焰虎", hpMult: 20, atkMult: 5, exp: 200, money: 100 },
        { level: 50, name: "玄水巨蟒", hpMult: 100, atkMult: 20, exp: 1000, money: 500 }
    ],

    // 地图逻辑
    maps: {
        field: {
            name: "蛮荒野外",
            // 现在根据玩家选择的 index 生成怪物
            genEnemy: (player, monsterIdx) => {
                const m = GAME_DATA.fieldMonsters[monsterIdx || 0]; // 默认打第一个
                return {
                    name: m.name,
                    hp: Math.floor(player.atk * 2 * m.hpMult), // 血量随玩家攻击力浮动，保证能打过但有快慢
                    atk: Math.floor(player.def * 0.5 * m.atkMult), 
                    def: 0,
                    pen: 0,
                    exp: m.exp,
                    money: m.money,
                    loot: "兽皮" // 简单掉落物
                };
            }
        },
        boss: {
            name: "上古禁地",
            genEnemy: (player) => ({
                name: "远古魔像",
                hp: player.maxHp * 10,
                atk: player.def * 1.5 + 20,
                def: player.atk * 0.5,
                pen: 10,
                exp: 1000,
                money: 1000,
                loot: "筑基丹"
            })
        },
        tower: {
            name: "镇妖塔",
            genEnemy: (player, floor) => {
                const scaling = Math.pow(1.1, floor);
                return {
                    name: `第${floor}层 守塔者`,
                    hp: Math.floor(100 * scaling),
                    atk: Math.floor(15 * scaling),
                    def: Math.floor(5 * scaling),
                    pen: Math.floor(2 * scaling),
                    exp: Math.floor(20 * scaling),
                    money: Math.floor(10 * scaling),
                    loot: "道韵碎片"
                };
            }
        }
    }
};
