// js/data.js
const GAME_DATA = {
    // 基础大境界配置
    majorRealms: ["凡人", "练气", "筑基", "金丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫"],
    
    // 自动生成的小境界列表 (engine会读取这个)
    realms: [],

    // 装备设定
    equipSlots: {
        weapon: "武器", head: "头饰", neck: "项链", 
        body: "防具", pants: "裤子", shoes: "鞋子", ornament: "装饰"
    },
    equipBaseStats: {
        weapon: { atk: 10, def: 0, hp: 0 },
        head:   { atk: 0, def: 2, hp: 50 },
        neck:   { atk: 5, def: 0, hp: 100 },
        body:   { atk: 0, def: 10, hp: 200 },
        pants:  { atk: 0, def: 5, hp: 100 },
        shoes:  { atk: 2, def: 2, hp: 20 },
        ornament: { atk: 10, def: 0, hp: 0 }
    },
    
    // 装备属性: 基础 * (1.4 ^ (阶级-1)) - 稍微降低指数，防止数值崩坏
    getEquipStats: (type, tier) => {
        const base = GAME_DATA.equipBaseStats[type];
        const mult = Math.pow(1.4, tier - 1);
        return {
            atk: Math.floor(base.atk * mult),
            def: Math.floor(base.def * mult),
            hp: Math.floor(base.hp * mult)
        };
    },

    // 怪物与地图
    fieldMonsters: [
        { level: 1, name: "野兔精", hpMult: 1, atkMult: 0.5, exp: 5, money: 1, loot: ["weapon_1", "body_1"] }, 
        { level: 5, name: "狂暴野猪", hpMult: 3, atkMult: 1, exp: 15, money: 5, loot: ["head_1", "pants_1"] },
        { level: 10, name: "铁皮蛮牛", hpMult: 8, atkMult: 2, exp: 50, money: 20, loot: ["neck_1", "shoes_1"] },
        { level: 20, name: "赤焰虎", hpMult: 20, atkMult: 5, exp: 200, money: 50, loot: ["ornament_1", "weapon_2"] },
        { level: 40, name: "玄水巨蟒", hpMult: 50, atkMult: 10, exp: 600, money: 200, loot: ["body_2", "shoes_2"] },
        { level: 60, name: "金背妖螂", hpMult: 150, atkMult: 30, exp: 2000, money: 500, loot: ["weapon_3", "head_3"] }
    ],

    maps: {
        field: {
            name: "蛮荒野外",
            genEnemy: (player, monsterIdx) => {
                const m = GAME_DATA.fieldMonsters[monsterIdx || 0];
                return {
                    name: m.name,
                    // 怪物属性随玩家当前属性浮动，但有最低下限
                    hp: Math.floor(player.baseStats.atk * 3 * m.hpMult), 
                    atk: Math.floor(player.baseStats.def * 0.8 * m.atkMult),
                    def: 0, pen: 0,
                    exp: m.exp, money: m.money, loot: m.loot
                };
            }
        },
        boss: {
            name: "上古禁地",
            genEnemy: (player) => ({
                name: "远古魔像",
                hp: player.maxHp * 5, atk: player.def * 1.5 + 50, def: player.atk * 0.2,
                exp: 5000, money: 2000,
                loot: ["weapon_4", "body_4"]
            })
        },
        tower: {
            name: "镇妖塔",
            genEnemy: (player, floor) => {
                const scaling = Math.pow(1.1, floor);
                return {
                    name: `第${floor}层 守塔者`,
                    hp: Math.floor(200 * scaling), atk: Math.floor(20 * scaling),
                    def: Math.floor(10 * scaling), pen: Math.floor(5 * scaling),
                    exp: Math.floor(50 * scaling), money: Math.floor(20 * scaling)
                };
            }
        }
    }
};

// --- 自动生成小境界逻辑 ---
(function initRealms() {
    let baseExp = 100;
    let statMult = 1;

    GAME_DATA.majorRealms.forEach((majorName, mIdx) => {
        if (mIdx === 0) {
            // 凡人只有1级
            GAME_DATA.realms.push({
                name: "凡人",
                exp: 100,
                mult: 1,
                isMajor: true
            });
            return;
        }

        // 其他境界分10层 (1-9层 + 圆满)
        for (let i = 1; i <= 10; i++) {
            const isMajor = (i === 1); // 每一层的第一级算作大突破点
            const subName = i === 10 ? "圆满" : `${i}层`;
            
            // 经验值曲线：每小级递增，每大境界跃升
            baseExp = Math.floor(baseExp * 1.2 + 200);
            
            // 属性倍率：小境界微涨(1.05)，大境界跳变
            if (i === 1) statMult *= 1.5; // 大境界突破加成
            else statMult *= 1.05;        // 小境界突破加成

            GAME_DATA.realms.push({
                name: `${majorName} ${subName}`,
                exp: baseExp,
                mult: parseFloat(statMult.toFixed(2)),
                isMajor: isMajor // 标记是否为大境界开头
            });
        }
    });
})();
