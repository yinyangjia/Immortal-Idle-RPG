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
                        const max = attacker.maxHp || 100;
                        const heal = Math.floor(max * sk.healMult);
                        attacker.hp = Math.min(max, (attacker.hp||0) + heal);
                        if(onLog) onLog(`${sk.name} 恢复 ${heal} 生命`);
                    } else if (sk.type === 'drain') {
                         const dmg = Math.max(1, atk - def);
                         const drain = Math.floor(dmg * sk.drainMult);
                         attacker.hp = Math.min(attacker.maxHp, attacker.hp + drain);
                         if(onLog) onLog(`${sk.name} 吸血 ${drain}`);
                    } else if (sk.type === 'passive') {
                        // pass
                    } else {
                        multiplier *= sk.dmgMult;
                        if(onLog) onLog(`${sk.name} 暴击!`);
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
        
        let currentEnemyHp = enemy.hp || 100;
        let maxEnemyHp = enemy.hp || 100;

        if(window.Game) Game.updateUI();

        // 核心修正：立即执行第一次攻击，不再等待1秒
        const turn = () => {
            // 1. 玩家攻击
            let pDmg = this.calcDmg(player, enemy, playerSkills, onLog);
            currentEnemyHp -= pDmg;
            
            if (hpBar) hpBar.style.width = Math.max(0, (currentEnemyHp / maxEnemyHp) * 100) + "%";

            if (currentEnemyHp <= 0) {
                this.stop(); if(onWin) onWin(); return;
            }

            // 2. 敌人反击
            let eDmg = this.calcDmg(enemy, player, null, null);
            player.hp -= eDmg;
            
            if(window.Game) Game.updateUI();

            if (player.hp <= 0) {
                this.stop(); if(onLose) onLose(); return;
            }
        };

        // 立即执行一回合
        turn();
        // 如果没死，才开启循环
        if (currentEnemyHp > 0 && player.hp > 0) {
            this.intervalId = setInterval(turn, 1000); // 正常攻速
        }
    },

    stop() {
        if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    }
};
