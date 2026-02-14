const Battle = {
    intervalId: null,

    // 伤害公式：增加 skills 参数
    calcDmg(attacker, defender, skills, onLog) {
        let def = defender.def || 0;
        let atk = attacker.atk || 0;
        let multiplier = 1;

        // 技能判定 (只对玩家生效)
        if (skills && skills.length > 0) {
            skills.forEach(sid => {
                const sk = GAME_DATA.skills[sid];
                if (sk && Math.random() < sk.rate) {
                    if (sk.type === 'heal') {
                        // 治疗
                        const heal = Math.floor(attacker.maxHp * sk.healMult);
                        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
                        if(onLog) onLog(`${sk.name} 触发！恢复 ${heal} 生命`);
                    } else {
                        // 攻击增益
                        multiplier *= sk.dmgMult;
                        if(onLog) onLog(`${sk.name} 触发！伤害翻倍！`);
                    }
                }
            });
        }

        let dmg = Math.max(1, (atk * multiplier) - def);
        return Math.floor(dmg);
    },

    start(player, enemy, playerSkills, onWin, onLose, onLog) {
        this.stop();
        const nameEl = document.getElementById('enemy-name');
        const hpBar = document.getElementById('enemy-hp-bar');
        if(nameEl) nameEl.innerText = enemy.name;
        
        let currentEnemyHp = enemy.hp;
        let maxEnemyHp = enemy.hp;

        this.intervalId = setInterval(() => {
            // 1. 玩家回合 (传入技能)
            let pDmg = this.calcDmg(player, enemy, playerSkills, onLog);
            currentEnemyHp -= pDmg;
            
            if (hpBar) hpBar.style.width = Math.max(0, (currentEnemyHp / maxEnemyHp) * 100) + "%";

            if (currentEnemyHp <= 0) {
                this.stop(); if(onWin) onWin(); return;
            }

            // 2. 敌人回合 (无技能)
            let eDmg = this.calcDmg(enemy, player, null, null);
            player.hp -= eDmg;
            
            if(window.Game) Game.updateUI();

            if (player.hp <= 0) {
                this.stop(); if(onLose) onLose(); return;
            }
        }, 1000);
    },

    stop() {
        if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    }
};
