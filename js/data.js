const GAME_DATA = {
    majorRealms: ["凡人", "练气", "筑基", "金丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫"],
    realms: [], 

    // 独立材料字典，防止与装备逻辑混淆
    items: {
        "兽皮": { name: "粗糙兽皮", price: 10, desc: "普通的妖兽皮毛" },
        "道韵": { name: "道韵碎片", price: 50, desc: "蕴含天地法则的碎片" },
        "筑基丹": { name: "筑基丹", price: 500, desc: "突破筑基期的灵药" }
    },

    equipSlots: { weapon: "武器", head: "头饰", neck: "项链", body: "防具", pants: "裤子", shoes: "鞋子", ornament: "装饰" },
    equipBaseStats: {
        weapon: { atk: 15, def: 0, hp: 0 }, head: { atk: 0, def: 5, hp: 80 },
        neck: { atk: 8, def: 2, hp: 150 }, body: { atk: 0, def: 15, hp: 300 },
        pants: { atk: 0, def: 8, hp: 150 }, shoes: { atk: 4, def: 4, hp: 50 },
        ornament: { atk: 15, def: 0, hp: 0 }
    },

    getEquipStats: (type, tier) => {
        const base = GAME_DATA.equipBaseStats[type] || {atk:0, def:0, hp:0};
        const t = parseInt(tier) || 1;
        const mult = Math.pow(1.3, t - 1); // 属性随阶级指数增长
        return { atk: Math.floor(base.atk * mult), def: Math.floor(base.def * mult), hp: Math.floor(base.hp * mult) };
    },

    fieldMonsters: [
        { level: 1, name: "野兔精", hpMult: 1, atkMult: 0.5, exp: 10, money: 5, loot: ["weapon_1", "兽皮"] }, 
        { level: 10, name: "铁皮蛮牛", hpMult: 8, atkMult: 2, exp: 100, money: 50, loot: ["body_1", "neck_1", "兽皮"] },
        { level: 30, name: "赤焰虎", hpMult: 30, atkMult: 8, exp: 500, money: 200, loot: ["weapon_2", "ornament_1", "兽皮"] }
    ],

    maps: {
        field: { name: "蛮荒野外", genEnemy: (p, idx) => {
            const m = GAME_DATA.fieldMonsters[idx || 0];
            return { name: m.name, hp: Math.max(50, Math.floor(p.atk * 4 * m.hpMult)), atk: Math.floor(p.def * 0.8 * m.atkMult), def: 0, pen: 0, exp: m.exp, money: m.money, loot: m.loot };
        }},
        boss: { name: "上古禁地", genEnemy: (p) => ({ name: "禁地守卫", hp: p.maxHp * 8, atk: p.def * 2 + 50, def: p.atk * 0.3, exp: 8000, money: 5000, loot: ["weapon_4", "body_4", "筑基丹"] }) },
        tower: { name: "镇妖塔", genEnemy: (p, f) => {
            const s = Math.pow(1.15, f);
            return { name: `第${f}层 塔灵`, hp: Math.floor(300 * s), atk: Math.floor(30 * s), def: Math.floor(15 * s), pen: Math.floor(5 * s), exp: Math.floor(100 * s), money: Math.floor(50 * s), loot: ["道韵"] };
        }}
    }
};

(function init() {
    let bExp = 150; let sMult = 1;
    GAME_DATA.majorRealms.forEach((name, idx) => {
        if (idx === 0) { GAME_DATA.realms.push({ name: "凡人", exp: 200, mult: 1, isMajor: true }); return; }
        for (let i = 1; i <= 10; i++) {
            bExp = Math.floor(bExp * 1.2 + 300);
            if (i === 1) sMult *= 1.8; else sMult *= 1.1;
            GAME_DATA.realms.push({ name: `${name}${i === 10 ? '圆满' : i + '层'}`, exp: bExp, mult: parseFloat(sMult.toFixed(2)), isMajor: i === 1 });
        }
    });
})();
