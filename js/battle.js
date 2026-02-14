const Battle = {
    intervalId: null,

    calcDmg(attacker, defender, skills, onLog) {
        let def = defender.def || 0;
        let atk = attacker.atk || 0;
        let multiplier = 1;

        if (skills && skills.length > 0) {
            skills.forEach(sid => {
                const sk = GAME_DATA.skills[sid];
                if (sk && Math.random() < sk.rate) {
                    if (sk.type === 'heal') {
                        const heal = Math.floor(attacker.maxHp * sk.healMult);
                        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
                        if(onLog) onLog(`${sk.name} 恢复 ${heal} 生命`);
                    } else {
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

        // 初始刷新
        if(window.Game) Game.updateUI();

        this.intervalId = setInterval(() => {
            // 1. 玩家攻击
            let pDmg = this.calcDmg(player, enemy, playerSkills, onLog);
            currentEnemyHp -= pDmg;
            
            // 更新敌人血条 (视觉)
            if (hpBar) hpBar.style.width = Math.max(0, (currentEnemyHp / maxEnemyHp) * 100) + "%";

            if (currentEnemyHp <= 0) {
                this.stop(); if(onWin) onWin(); return;
            }

            // 2. 敌人反击
            let eDmg = this.calcDmg(enemy, player, null, null);
            player.hp -= eDmg;
            
            // 核心修复：强制每回合刷新玩家血量
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
