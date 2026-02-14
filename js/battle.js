const Battle = {
    intervalId: null,

    // 伤害公式：(攻击 - (防御))，保底 1 点伤害
    calcDmg(attacker, defender) {
        // 简单防御减伤，确保数值不为 NaN
        let def = defender.def || 0;
        let atk = attacker.atk || 0;
        let dmg = Math.max(1, atk - def);
        return Math.floor(dmg);
    },

    start(player, enemy, onWin, onLose) {
        // 停止之前的战斗
        this.stop();

        // 刷新 UI 显示
        const nameEl = document.getElementById('enemy-name');
        const hpBar = document.getElementById('enemy-hp-bar');
        
        if(nameEl) nameEl.innerText = enemy.name;
        
        let currentEnemyHp = enemy.hp;
        let maxEnemyHp = enemy.hp;

        // 启动 1秒1回合 的循环
        this.intervalId = setInterval(() => {
            // 1. 玩家攻击
            let pDmg = this.calcDmg(player, enemy);
            currentEnemyHp -= pDmg;
            
            // 更新血条
            if (hpBar) {
                let pct = Math.max(0, (currentEnemyHp / maxEnemyHp) * 100);
                hpBar.style.width = pct + "%";
            }

            // 胜利判定
            if (currentEnemyHp <= 0) {
                this.stop();
                if(onWin) onWin();
                return;
            }

            // 2. 敌人反击
            let eDmg = this.calcDmg(enemy, player);
            player.hp -= eDmg;
            
            // 刷新玩家血量UI
            if(window.Game) Game.updateUI();

            // 失败判定
            if (player.hp <= 0) {
                this.stop();
                if(onLose) onLose();
                return;
            }

        }, 1000);
    },

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
};
