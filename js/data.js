const GAME_DATA = {
    majorRealms: ["凡人", "练气", "筑基", "金丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫"],
    realms: [], 

    items: {
        "兽皮": { name: "粗糙兽皮", price: 10, desc: "普通的妖兽皮毛" },
        "道韵": { name: "道韵碎片", price: 50, desc: "蕴含法则的碎片" },
        "ticket_1": { name: "低级挑战券", price: 500, desc: "挑战20级首领" },
        "ticket_2": { name: "中级挑战券", price: 5000, desc: "挑战50级首领" },
        "ticket_3": { name: "高级挑战券", price: 50000, desc: "挑战90级首领" },
        "筑基丹": { name: "筑基丹", price: 200, desc: "突破筑基期的灵药" },
        "exp_fruit_1": { name: "灵元果", price: 1000, desc: "服用增加 500 点修为", effect: {type:"exp", val:500} },
        "exp_fruit_2": { name: "天灵根", price: 10000, desc: "服用增加 5000 点修为", effect: {type:"exp", val:5000} },
        
        // 功法
        "book_fire": { name: "烈火剑法", price: 1000, desc: "攻击有20%几率造成200%伤害", type: "book", skillId: "skill_fire" },
        "book_ice":  { name: "寒冰诀", price: 2000, desc: "攻击有10%几率造成300%伤害", type: "book", skillId: "skill_ice" },
        "book_life": { name: "青木长生功", price: 3000, desc: "每回合恢复 5% 最大生命值", type: "book", skillId: "skill_life" }
    },

    skills: {
        "skill_fire": { name: "🔥烈火剑", rate: 0.2, dmgMult: 2.0 },
        "skill_ice":  { name: "❄️寒冰刺", rate: 0.1, dmgMult: 3.0 },
        "skill_life": { name: "💚回春", type: "heal", rate: 1.0, healMult: 0.05 }
    },

    // --- 门派系统 (扩充至10级，增加属性) ---
    sects: [
        { 
            id: 0, name: "青云门", reqRealm: 1, 
            ranks: [
                { name: "杂役弟子", cost: 10, stats: {atk:5, def:0, hp:50} },
                { name: "外门弟子", cost: 50, stats: {atk:10, def:2, hp:100} },
                { name: "外门执事", cost: 100, stats: {atk:20, def:5, hp:200} },
                { name: "内门弟子", cost: 200, stats: {atk:40, def:10, hp:400} },
                { name: "内门精英", cost: 500, stats: {atk:80, def:20, hp:800} },
                { name: "真传弟子", cost: 1000, stats: {atk:150, def:40, hp:1500} },
                { name: "首席弟子", cost: 2000, stats: {atk:300, def:80, hp:3000} },
                { name: "传功长老", cost: 5000, stats: {atk:600, def:150, hp:6000} },
                { name: "护宗长老", cost: 10000, stats: {atk:1000, def:300, hp:10000} },
                { name: "副宗主",   cost: 50000, stats: {atk:2000, def:500, hp:20000} }
            ],
            shop: ["book_fire", "book_life"] 
        },
        { 
            id: 1, name: "魔天宗", reqRealm: 1, 
            ranks: [
                { name: "魔卒",     cost: 10, stats: {atk:10, def:0, hp:20} },
                { name: "魔兵",     cost: 50, stats: {atk:20, def:0, hp:50} },
                { name: "魔将",     cost: 100, stats: {atk:40, def:5, hp:100} },
                { name: "魔帅",     cost: 200, stats: {atk:80, def:10, hp:200} },
                { name: "魔王",     cost: 500, stats: {atk:160, def:20, hp:400} },
                { name: "修罗",     cost: 1000, stats: {atk:300, def:40, hp:800} },
                { name: "大修罗",   cost: 2000, stats: {atk:600, def:80, hp:1600} },
                { name: "魔尊护法", cost: 5000, stats: {atk:1200, def:150, hp:3000} },
                { name: "魔尊",     cost: 10000, stats: {atk:2500, def:300, hp:5000} },
                { name: "血魔老祖", cost: 50000, stats: {atk:5000, def:500, hp:10000} }
            ],
            shop: ["book_ice", "ticket_2"] 
        }
    ],

    equipSlots: { weapon: "武器", head: "头饰", neck: "项链", body: "防具", pants: "裤子", shoes: "鞋子", ornament: "装饰" },
    
    getEquipStats: (type, tier) => {
        const base = { weapon:{atk:15}, head:{def:5,hp:80}, neck:{atk:5,hp:150}, body:{def:15,hp:300}, pants:{def:8,hp:150}, shoes:{atk:3,def:3}, ornament:{atk:15} }[type] || {atk:1,def:1,hp:1};
        const mult = Math.pow(1.35, tier - 1);
        return { atk: Math.floor((base.atk||0)*mult), def: Math.floor((base.def||0)*mult), hp: Math.floor((base.hp||0)*mult) };
    },

    // 怪物配置
    fieldMonsters: Array.from({length: 20}, (_, i) => {
        const lv = (i + 1) * 5;
        const names = ["野兔","灰狼","蛮牛","赤雕","猛虎","妖狐","魔猿","幽蟒","灵鹤","蛟龙"];
        return {
            level: lv,
            name: names[i % 10] + ((i >= 10) ? "王" : "精"),
            hpMult: 1 + i * 2, atkMult: 0.5 + i * 0.8,
            exp: Math.floor(20 * Math.pow(1.3, i)),
            money: 10 + i * 15,
            reputation: 5 + Math.floor(i * 2), // 名望提升
            loot: ["兽皮"] 
        };
    }),

    bosses: [
        { name: "地岩守卫", level: 20, ticket: "ticket_1", hpMult: 40, atkMult: 10, exp: 3000, money: 1000, reputation: 100, drops: ["weapon_3", "body_3"] },
        { name: "嗜血狼王", level: 50, ticket: "ticket_2", hpMult: 300, atkMult: 50, exp: 50000, money: 20000, reputation: 500, drops: ["weapon_6", "body_6"] },
        { name: "九幽冥凤", level: 90, ticket: "ticket_3", hpMult: 2000, atkMult: 500, exp: 1000000, money: 300000, reputation: 5000, drops: ["weapon_10", "body_10"] }
    ],

    maps: {
        field: { name: "蛮荒野外", genEnemy: (p, idx) => {
            const m = GAME_DATA.fieldMonsters[idx || 0];
            // 修复掉落：100% 携带一件符合等级的装备
            const extraLoot = [];
            const parts = ["weapon","body","head","neck","pants","shoes","ornament"];
            const part = parts[Math.floor(Math.random() * parts.length)];
            const tier = Math.max(1, Math.floor(m.level / 10) + 1);
            extraLoot.push(`${part}_${tier}`);
            
            return { 
                name: m.name, 
                hp: Math.max(50, Math.floor(p.atk * 3 * m.hpMult)), 
                atk: Math.floor(p.def * 0.8 * m.atkMult), 
                def: 0, exp: m.exp, money: m.money, reputation: m.reputation, 
                loot: m.loot.concat(extraLoot) // 必掉装备
            };
        }},
        tower: { name: "镇妖塔", genEnemy: (p, f) => {
            const s = Math.pow(1.15, f);
            return { name: `第${f}层 塔灵`, hp: Math.floor(300 * s), atk: Math.floor(25 * s), def: Math.floor(10 * s), exp: Math.floor(80 * s), money: Math.floor(40 * s), reputation: Math.floor(5*f), loot: ["道韵"] };
        }}
    }
};

(function init() {
    let bExp = 150; let sMult = 1;
    GAME_DATA.majorRealms.forEach((name, idx) => {
        if (idx === 0) { GAME_DATA.realms.push({ name: "凡人", exp: 200, mult: 1, isMajor: true }); return; }
        for (let i = 1; i <= 10; i++) {
            bExp = Math.floor(bExp * 1.25 + 200);
            if (i === 1) sMult *= 1.5; else sMult *= 1.1;
            GAME_DATA.realms.push({ name: `${name}${i === 10 ? '圆满' : i + '层'}`, exp: bExp, mult: parseFloat(sMult.toFixed(2)), isMajor: i === 1 });
        }
    });
})();
