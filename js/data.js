const GAME_DATA = {
    // 境界设定
    realms: [
        { name: "凡人", exp: 100, mult: 1 },
        { name: "练气期", exp: 500, mult: 1.5 },
        { name: "筑基期", exp: 2000, mult: 3 },
        { name: "金丹期", exp: 10000, mult: 10 },
        { name: "元婴期", exp: 50000, mult: 50 },
        { name: "化神期", exp: 200000, mult: 200 }
    ],

    // 装备定义
    equipSlots: {
        weapon: "武器", head: "头饰", neck: "项链", 
        body: "防具", pants: "裤子", shoes: "鞋子", ornament: "装饰"
    },
    
    // 装备基础属性 (1阶属性)
    equipBaseStats: {
        weapon: { atk: 10, def: 0, hp: 0 },
        head:   { atk: 0, def: 2, hp: 50 },
        neck:   { atk: 5, def: 0, hp: 100 },
        body:   { atk: 0, def: 10, hp: 200 },
        pants:  { atk: 0, def: 5, hp: 100 },
        shoes:  { atk: 2, def: 2, hp: 20 },
        ornament: { atk: 10, def: 0, hp: 0 } // 纯攻击饰品
    },

    // 装备属性计算公式: 基础 * (1.5 ^ (阶级-1))
    getEquipStats: (type, tier) => {
        const base = GAME_DATA.equipBaseStats[type];
        const mult = Math.pow(1.5, tier - 1);
        return {
            atk: Math.floor(base.atk * mult),
            def: Math.floor(base.def * mult),
            hp: Math.floor(base.hp * mult)
        };
    },

    // 野外怪物 (增加装备掉落)
    fieldMonsters: [
        { level: 1, name: "野兔精", hpMult: 1, atkMult: 0.5, exp: 5, money: 1, loot: ["weapon_1", "body_1"] }, 
        { level: 5, name: "狂暴野猪", hpMult: 3, atkMult: 1, exp: 15, money: 5, loot: ["head_1", "pants_1"] },
        { level: 10, name: "铁皮蛮牛", hpMult: 8, atkMult: 2, exp: 50, money: 20, loot: ["neck_1", "shoes_1"] },
        { level: 20, name: "赤焰虎", hpMult: 20, atkMult: 5, exp: 200, money: 100, loot: ["ornament_1", "weapon_2"] },
        { level: 50, name: "玄水巨蟒", hpMult: 100, atkMult: 20, exp: 1000, money: 500, loot: ["body_3", "weapon_3"] }
    ],

    maps: {
        field: {
            name: "蛮荒野外",
            genEnemy: (player, monsterIdx) => {
                const m = GAME_DATA.fieldMonsters[monsterIdx || 0];
                return {
                    name: m.name,
                    hp: Math.floor(player.baseStats.atk * 2 * m.hpMult), // 动态平衡
                    atk: Math.floor(player.baseStats.def * 0.5 * m.atkMult),
                    def: 0, pen: 0,
                    exp: m.exp, money: m.money,
                    loot: m.loot // 掉落列表
                };
            }
        },
        boss: {
            name: "上古禁地",
            genEnemy: (player) => ({
                name: "远古魔像",
                hp: player.maxHp * 10, atk: player.def * 2 + 20, def: player.atk * 0.5,
                exp: 1000, money: 1000,
                loot: ["weapon_5", "body_5"] // Boss 掉高阶
            })
        },
        tower: {
            name: "镇妖塔",
            genEnemy: (player, floor) => {
                const scaling = Math.pow(1.1, floor);
                return {
                    name: `第${floor}层 守塔者`,
                    hp: Math.floor(100 * scaling), atk: Math.floor(15 * scaling),
                    def: Math.floor(5 * scaling), pen: Math.floor(2 * scaling),
                    exp: Math.floor(20 * scaling), money: Math.floor(10 * scaling)
                };
            }
        }
    }
};
