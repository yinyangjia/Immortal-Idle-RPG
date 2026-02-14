const GAME_DATA = {
    majorRealms: ["凡人", "练气", "筑基", "金丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫"],
    realms: [], 

    items: {
        "兽皮": { name: "粗糙兽皮", price: 10, desc: "普通的妖兽皮毛" },
        "道韵": { name: "道韵碎片", price: 50, desc: "蕴含法则的碎片" },
        "ticket_1": { name: "低级挑战券", price: 500, desc: "挑战20级首领" },
        "ticket_2": { name: "中级挑战券", price: 5000, desc: "挑战50级首领" },
        "ticket_3": { name: "高级挑战券", price: 50000, desc: "挑战90级首领" },
        "筑基丹": { name: "筑基丹", price: 200, desc: "突破筑基期的灵药" }
    },

    equipSlots: { weapon: "武器", head: "头饰", neck: "项链", body: "防具", pants: "裤子", shoes: "鞋子", ornament: "装饰" },
    
    // 自动生成100级怪物，平滑曲线
    fieldMonsters: Array.from({length: 20}, (_, i) => {
        const lv = (i + 1) * 5;
        const names = ["野兔","灰狼","蛮牛","赤雕","猛虎","妖狐","魔猿","幽蟒","灵鹤","蛟龙"];
        const name = names[i % 10] + ((i >= 10) ? "王" : "精");
        return {
            level: lv,
            name: name,
            hpMult: 1 + i * 2,
            atkMult: 0.5 + i * 0.8,
            exp: Math.floor(20 * Math.pow(1.3, i)),
            money: 10 + i * 15,
            loot: ["兽皮"], // 基础掉落，装备动态生成
            dropRate: 0.2 // 20% 掉率
        };
    }),

    bosses: [
        { name: "地岩守卫", level: 20, ticket: "ticket_1", hpMult: 40, atkMult: 10, exp: 3000, money: 1000, drops: ["weapon_3", "body_3"] },
        { name: "嗜血狼王", level: 50, ticket: "ticket_2", hpMult: 300, atkMult: 50, exp: 50000, money: 20000, drops: ["weapon_6", "body_6"] },
        { name: "九幽冥凤", level: 90, ticket: "ticket_3", hpMult: 2000, atkMult: 500, exp: 1000000, money: 300000, drops: ["weapon_10", "body_10"] }
    ],

    getEquipStats: (type, tier) => {
        const base = { weapon:{atk:15}, head:{def:5,hp:80}, neck:{atk:5,hp:150}, body:{def:15,hp:300}, pants:{def:8,hp:150}, shoes:{atk:3,def:3}, ornament:{atk:15} }[type] || {atk:1,def:1,hp:1};
        const mult = Math.pow(1.35, tier - 1);
        return { atk: Math.floor((base.atk||0)*mult), def: Math.floor((base.def||0)*mult), hp: Math.floor((base.hp||0)*mult) };
    },

    maps: {
        field: { name: "蛮荒野外", genEnemy: (p, idx) => {
            const m = GAME_DATA.fieldMonsters[idx || 0];
            // 动态生成装备掉落：等级越高，掉落装备阶级越高
            const tier = Math.floor(m.level / 10) + 1;
            const extraLoot = [];
            if(Math.random() < 0.5) extraLoot.push(["weapon","body","head"][Math.floor(Math.random()*3)] + "_" + tier);
            
            return { 
                name: m.name, 
                hp: Math.max(50, Math.floor(p.atk * 3 * m.hpMult)), // 动态血量
                atk: Math.floor(p.def * 0.8 * m.atkMult), 
                def: 0, exp: m.exp, money: m.money, 
                loot: m.loot.concat(extraLoot) 
            };
        }},
        tower: { name: "镇妖塔", genEnemy: (p, f) => {
            const s = Math.pow(1.15, f);
            return { name: `第${f}层 塔灵`, hp: Math.floor(300 * s), atk: Math.floor(25 * s), def: Math.floor(10 * s), exp: Math.floor(80 * s), money: Math.floor(40 * s), loot: ["道韵"] };
        }}
    }
};

(function init() {
    let bExp = 150; let sMult = 1;
    GAME_DATA.majorRealms.forEach((name, idx) => {
        if (idx === 0) { GAME_DATA.realms.push({ name: "凡人", exp: 200, mult: 1, isMajor: true }); return; }
        for (let i = 1; i <= 10; i++) {
            bExp = Math.floor(bExp * 1.25 + 200);
            if (i === 1) sMult *= 1.5; else sMult *= 1.1; // 属性系数
            GAME_DATA.realms.push({ name: `${name}${i === 10 ? '圆满' : i + '层'}`, exp: bExp, mult: parseFloat(sMult.toFixed(2)), isMajor: i === 1 });
        }
    });
})();
