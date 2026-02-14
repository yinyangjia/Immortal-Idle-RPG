const GAME_DATA = {
    // 基础大境界
    majorRealms: ["凡人", "练气", "筑基", "金丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫"],
    realms: [], 

    // --- 新增：材料字典 (解决undefined问题的关键) ---
    items: {
        "兽皮": { name: "粗糙兽皮", price: 5, desc: "野兽的皮毛，可换灵石" },
        "道韵": { name: "道韵碎片", price: 50, desc: "爬塔所得，蕴含法则之力" },
        "筑基丹": { name: "筑基丹", price: 200, desc: "突破筑基期的关键丹药" }
    },

    equipSlots: { weapon: "武器", head: "头饰", neck: "项链", body: "防具", pants: "裤子", shoes: "鞋子", ornament: "装饰" },
    equipBaseStats: {
        weapon: { atk: 12, def: 0, hp: 0 }, head: { atk: 0, def: 3, hp: 60 },
        neck: { atk: 6, def: 0, hp: 120 }, body: { atk: 0, def: 12, hp: 250 },
        pants: { atk: 0, def: 6, hp: 120 }, shoes: { atk: 3, def: 3, hp: 30 },
        ornament: { atk: 12, def: 0, hp: 0 }
    },
    // 修复：优化公式，防止高阶出现 NaN
    getEquipStats: (type, tier) => {
        const base = GAME_DATA.equipBaseStats[type] || {atk:0, def:0, hp:0};
        const t = Math.max(1, tier || 1); // 保底 tier 为 1
        const mult = Math.pow(1.35, t - 1);
        return { atk: Math.floor(base.atk * mult), def: Math.floor(base.def * mult), hp: Math.floor(base.hp * mult) };
    },

    fieldMonsters: [
        { level: 1, name: "野兔精", hpMult: 1, atkMult: 0.5, exp: 8, money: 2, loot: ["weapon_1", "兽皮"] }, 
        { level: 5, name: "狂暴野猪", hpMult: 4, atkMult: 1.2, exp: 25, money: 10, loot: ["head_1", "兽皮"] },
        { level: 15, name: "铁皮蛮牛", hpMult: 10, atkMult: 3, exp: 80, money: 40, loot: ["neck_1", "shoes_1"] },
        { level: 30, name: "赤焰虎", hpMult: 30, atkMult: 8, exp: 300, money: 150, loot: ["ornament_1", "weapon_2"] }
    ],

    maps: {
        field: { name: "蛮荒野外", genEnemy: (p, idx) => {
            const m = GAME_DATA.fieldMonsters[idx || 0];
            return { name: m.name, hp: Math.max(20, Math.floor(p.atk * 3 * m.hpMult)), atk: Math.floor(p.def * 0.8 * m.atkMult), def: 0, pen: 0, exp: m.exp, money: m.money, loot: m.loot };
        }},
        boss: { name: "上古禁地", genEnemy: (p) => ({ name: "远古魔像", hp: p.maxHp * 6, atk: p.def * 1.8 + 60, def: p.atk * 0.25, exp: 6000, money: 3000, loot: ["weapon_4", "body_4", "筑基丹"] }) },
        tower: { name: "镇妖塔", genEnemy: (p, f) => {
            const s = Math.pow(1.12, f);
            return { name: `第${f}层 守卫`, hp: Math.floor(250 * s), atk: Math.floor(25 * s), def: Math.floor(12 * s), pen: Math.floor(6 * s), exp: Math.floor(60 * s), money: Math.floor(30 * s), loot: ["道韵"] };
        }}
    }
};

// 自动生成境界
(function() {
    let bExp = 100; let sMult = 1;
    GAME_DATA.majorRealms.forEach((name, idx) => {
        if (idx === 0) { GAME_DATA.realms.push({ name: "凡人", exp: 120, mult: 1, isMajor: true }); return; }
        for (let i = 1; i <= 10; i++) {
            bExp = Math.floor(bExp * 1.18 + 200); 
            if (i === 1) sMult *= 1.6; else sMult *= 1.07; 
            GAME_DATA.realms.push({ name: `${name}${i === 10 ? '圆满' : i + '层'}`, exp: bExp, mult: parseFloat(sMult.toFixed(2)), isMajor: i === 1 });
        }
    });
})();
