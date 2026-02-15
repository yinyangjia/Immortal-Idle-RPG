const GAME_DATA = {
    majorRealms: ["凡人", "练气", "筑基", "金丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫"],
    realms: [], 

    items: {
        // --- 魔晶 ---
        "crystal_1": { name: "1阶魔晶", price: 100, desc: "强化武器 (攻+5)", type: "crystal", level: 1, boost: 5 },
        "crystal_2": { name: "2阶魔晶", price: 300, desc: "强化武器 (攻+15)", type: "crystal", level: 2, boost: 15 },
        "crystal_3": { name: "3阶魔晶", price: 900, desc: "强化武器 (攻+45)", type: "crystal", level: 3, boost: 45 },
        "crystal_4": { name: "4阶魔晶", price: 2700, desc: "强化武器 (攻+135)", type: "crystal", level: 4, boost: 135 },
        "crystal_5": { name: "5阶魔晶", price: 8100, desc: "强化武器 (攻+400)", type: "crystal", level: 5, boost: 400 },

        // --- 掉落倍率券 (新增，type: coupon) ---
        "coupon_1.5": { name: "1.5倍掉落券", price: 50, currency: "daoyun", desc: "开启后战斗收益1.5倍 (消耗道韵购买)", type: "coupon", mult: 1.5 },
        "coupon_2.0": { name: "2倍掉落券", price: 150, currency: "daoyun", desc: "开启后战斗收益2倍 (消耗道韵购买)", type: "coupon", mult: 2.0 },
        "coupon_3.0": { name: "3倍掉落券", price: 500, currency: "daoyun", desc: "开启后战斗收益3倍 (消耗道韵购买)", type: "coupon", mult: 3.0 },

        // 杂物
        "ticket_1": { name: "低级挑战券", price: 500, desc: "挑战20级首领" },
        "ticket_2": { name: "中级挑战券", price: 5000, desc: "挑战50级首领" },
        "ticket_3": { name: "高级挑战券", price: 50000, desc: "挑战90级首领" },
        "筑基丹": { name: "筑基丹", price: 200, desc: "突破筑基期的灵药" },
        "exp_fruit_1": { name: "灵元果", price: 1000, desc: "修为+500", effect: {type:"exp", val:500} },
        
        // 功法
        "book_fire": { name: "烈火剑法", price: 1000, desc: "20%几率 2倍暴击 (需:外门)", type: "book", skillId: "skill_fire", reqRank: 1 },
        "book_life": { name: "青木长生功", price: 3000, desc: "每回合回血 5% (需:内门)", type: "book", skillId: "skill_life", reqRank: 3 },
        "book_thunder": { name: "九天雷引", price: 10000, desc: "15%几率 5倍暴击 (需:真传)", type: "book", skillId: "skill_thunder", reqRank: 5 },
        "book_ice":  { name: "寒冰诀", price: 2000, desc: "10%几率 3倍暴击 (需:魔兵)", type: "book", skillId: "skill_ice", reqRank: 1 },
        "book_blood": { name: "嗜血术", price: 5000, desc: "攻击吸血 20% (需:魔帅)", type: "book", skillId: "skill_blood", reqRank: 3 },
        "book_dark": { name: "天魔解体", price: 20000, desc: "攻击力提升50% (需:修罗)", type: "book", skillId: "skill_dark", reqRank: 5 }
    },

    skills: {
        "skill_fire": { name: "🔥烈火", rate: 0.2, dmgMult: 2.0 },
        "skill_ice":  { name: "❄️寒冰", rate: 0.1, dmgMult: 3.0 },
        "skill_life": { name: "💚回春", type: "heal", rate: 1.0, healMult: 0.05 },
        "skill_thunder": { name: "⚡雷罚", rate: 0.15, dmgMult: 5.0 },
        "skill_blood": { name: "🩸嗜血", type: "drain", rate: 0.3, drainMult: 0.2 },
        "skill_dark": { name: "🌑天魔", type: "passive", atkBonus: 0.5 }
    },

    sects: [
        { 
            id: 0, name: "青云门", reqRealm: 1, 
            ranks: [
                { name: "杂役弟子", cost: 10, stats: {atk:10, def:0, hp:50} },
                { name: "外门弟子", cost: 50, stats: {atk:25, def:5, hp:150} },
                { name: "内门弟子", cost: 200, stats: {atk:50, def:10, hp:300} }, // 属性微调
                { name: "内门精英", cost: 500, stats: {atk:100, def:20, hp:600} },
                { name: "真传弟子", cost: 1000, stats: {atk:200, def:40, hp:1200} },
                { name: "首席弟子", cost: 2000, stats: {atk:400, def:80, hp:2500} },
                { name: "长老",     cost: 5000, stats: {atk:800, def:160, hp:5000} },
                { name: "护法",     cost: 10000, stats: {atk:1600, def:300, hp:10000} },
                { name: "副宗主",   cost: 50000, stats: {atk:3200, def:600, hp:20000} },
                { name: "宗主",     cost: 100000, stats: {atk:6400, def:1200, hp:50000} }
            ],
            shop: ["book_fire", "book_life", "book_thunder", "coupon_1.5", "coupon_2.0"] 
        },
        { 
            id: 1, name: "魔天宗", reqRealm: 1, 
            ranks: [
                { name: "魔卒",     cost: 10, stats: {atk:15, def:0, hp:40} },
                { name: "魔兵",     cost: 50, stats: {atk:35, def:0, hp:120} },
                { name: "魔将",     cost: 100, stats: {atk:70, def:5, hp:250} },
                { name: "魔帅",     cost: 200, stats: {atk:140, def:10, hp:500} },
                { name: "魔王",     cost: 500, stats: {atk:280, def:20, hp:1000} },
                { name: "修罗",     cost: 1000, stats: {atk:560, def:40, hp:2000} },
                { name: "大修罗",   cost: 2000, stats: {atk:1120, def:80, hp:4000} },
                { name: "魔尊护法", cost: 5000, stats: {atk:2240, def:150, hp:8000} },
                { name: "魔尊",     cost: 10000, stats: {atk:4500, def:300, hp:15000} },
                { name: "血魔老祖", cost: 50000, stats: {atk:9000, def:500, hp:30000} }
            ],
            shop: ["book_ice", "book_blood", "book_dark", "coupon_2.0", "coupon_3.0"] 
        }
    ],

    equipSlots: { weapon: "武器", head: "头饰", neck: "项链", body: "防具", pants: "裤子", shoes: "鞋子", ornament: "装饰" },
    
    getEquipStats: (type, tier) => {
        const base = { weapon:{atk:25}, head:{def:3,hp:80}, neck:{atk:10,hp:150}, body:{def:8,hp:300}, pants:{def:5,hp:150}, shoes:{atk:5,def:2}, ornament:{atk:20} }[type] || {atk:0,def:0,hp:0};
        const t = parseInt(tier) || 1;
        const mult = Math.pow(1.4, t - 1); 
        return { atk: Math.floor((base.atk||0)*mult), def: Math.floor((base.def||0)*mult), hp: Math.floor((base.hp||0)*mult) };
    },

    fieldMonsters: Array.from({length: 20}, (_, i) => {
        const lv = (i + 1) * 5;
        const names = ["野兔","灰狼","蛮牛","赤雕","猛虎","妖狐","魔猿","幽蟒","灵鹤","蛟龙"];
        // 修复：血量不再随玩家攻击力浮动，改为固定数值，确保高攻秒杀
        const baseHp = 50 * Math.pow(1.25, i); 
        return {
            level: lv,
            name: names[i % 10] + ((i >= 10) ? "王" : "精"),
            hp: Math.floor(baseHp), // 固定血量
            atk: Math.floor(baseHp * 0.15),
            exp: Math.floor(20 * Math.pow(1.3, i)),
            money: 10 + i * 15,
            daoyun: 0, // 野外不掉道韵
            loot: ["crystal_1"]
        };
    }),

    bosses: [
        // Boss 掉落大量道韵
        { name: "地岩守卫", level: 20, ticket: "ticket_1", hp: 5000, atk: 200, exp: 3000, money: 1000, daoyun: 20, drops: ["weapon_3", "crystal_2"] },
        { name: "嗜血狼王", level: 50, ticket: "ticket_2", hp: 50000, atk: 1500, exp: 50000, money: 20000, daoyun: 100, drops: ["weapon_6", "crystal_3"] },
        { name: "九幽冥凤", level: 90, ticket: "ticket_3", hp: 1000000, atk: 10000, exp: 1000000, money: 300000, daoyun: 500, drops: ["weapon_10", "crystal_4"] }
    ],

    maps: {
        field: { name: "蛮荒野外", genEnemy: (p, idx) => {
            const m = GAME_DATA.fieldMonsters[idx || 0];
            const extraLoot = [];
            const crystalTier = Math.min(5, Math.floor(m.level / 20) + 1);
            extraLoot.push(`crystal_${crystalTier}`);
            const parts = ["weapon","body","head","neck","pants","shoes","ornament"];
            const part = parts[Math.floor(Math.random() * parts.length)];
            const tier = Math.max(1, Math.floor(m.level / 10) + 1);
            extraLoot.push(`${part}_${tier}`);
            
            return { 
                name: m.name, 
                hp: m.hp, // 使用固定血量
                atk: m.atk, 
                def: 0, exp: m.exp, money: m.money, daoyun: 0,
                loot: m.loot.concat(extraLoot) 
            };
        }},
        tower: { name: "镇妖塔", genEnemy: (p, f) => {
            const s = Math.pow(1.15, f);
            // 爬塔掉落道韵
            return { name: `第${f}层 塔灵`, hp: Math.floor(500 * s), atk: Math.floor(30 * s), def: Math.floor(10 * s), exp: Math.floor(80 * s), money: Math.floor(40 * s), daoyun: Math.floor(1+f/5), loot: [] };
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
