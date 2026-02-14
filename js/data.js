const GAME_DATA = {
    majorRealms: ["凡人", "练气", "筑基", "金丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫"],
    realms: [], 

    items: {
        "兽皮": { name: "粗糙兽皮", price: 10, desc: "普通的妖兽皮毛" },
        "道韵": { name: "道韵碎片", price: 50, desc: "蕴含法则的碎片" },
        "ticket_1": { name: "低级挑战券", price: 500, desc: "挑战1-30级首领使用" },
        "ticket_2": { name: "中级挑战券", price: 5000, desc: "挑战31-70级首领使用" },
        "ticket_3": { name: "高级挑战券", price: 50000, desc: "挑战71-100级首领使用" }
    },

    equipSlots: { weapon: "武器", head: "头饰", neck: "项链", body: "防具", pants: "裤子", shoes: "鞋子", ornament: "装饰" },
    
    // 自动生成 1-100 级野外怪物
    fieldMonsters: Array.from({length: 20}, (_, i) => {
        const lv = (i + 1) * 5;
        return {
            level: lv,
            name: ["野兔","灰狼","蛮牛","赤雕","猛虎","妖狐","魔猿","幽蟒","灵鹤","蛟龙"][i % 10] + "精",
            hpMult: 1 + i * 1.5,
            atkMult: 1 + i * 1.2,
            exp: Math.floor(15 * Math.pow(1.4, i)),
            money: 10 + i * 20,
            dropRate: 0.15 // 提高掉落率至 15% 
        };
    }),

    // 首领配置
    bosses: [
        { name: "地岩守卫", level: 20, ticket: "ticket_1", hpMult: 50, atkMult: 15, exp: 5000, money: 2000, drops: ["weapon_3", "body_3"] },
        { name: "嗜血狼王", level: 50, ticket: "ticket_2", hpMult: 500, atkMult: 100, exp: 80000, money: 30000, drops: ["weapon_7", "body_7"] },
        { name: "九幽冥凤", level: 90, ticket: "ticket_3", hpMult: 5000, atkMult: 1200, exp: 2000000, money: 500000, drops: ["weapon_12", "body_12"] }
    ],

    getEquipStats: (type, tier) => {
        const base = { weapon:{atk:20}, head:{def:8,hp:100}, neck:{atk:10,hp:200}, body:{def:20,hp:500}, pants:{def:12,hp:200}, shoes:{atk:5,def:5}, ornament:{atk:20} }[type];
        const mult = Math.pow(1.35, tier - 1);
        return { atk: Math.floor((base.atk||0)*mult), def: Math.floor((base.def||0)*mult), hp: Math.floor((base.hp||0)*mult) };
    }
};

// 境界属性大幅上调
(function() {
    let bExp = 200; let sMult = 1;
    GAME_DATA.majorRealms.forEach((name, idx) => {
        if (idx === 0) { GAME_DATA.realms.push({ name: "凡人", exp: 200, mult: 1, isMajor: true }); return; }
        for (let i = 1; i <= 10; i++) {
            bExp = Math.floor(bExp * 1.25 + 300);
            if (i === 1) sMult *= 2.0; // 大境界跨度翻倍
            else sMult *= 1.15; // 小境界加成提高
            GAME_DATA.realms.push({ name: `${name}${i === 10 ? '圆满' : i + '层'}`, exp: bExp, mult: parseFloat(sMult.toFixed(2)), isMajor: i === 1 });
        }
    });
})();
