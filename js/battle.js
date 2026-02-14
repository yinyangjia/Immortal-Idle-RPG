const Battle = {
    intervalId: null,

    // 伤害公式：(攻击 - (防御 - 破甲))，保底 1 点伤害
    calcDmg(attacker, defender) {
        let realDef = Math.max(0, defender.def - attacker.pen);
        let dmg = Math.max(1, attacker.atk - realDef);
        return Math.floor(dmg);
    },

    start(player, enemy, onWin, onLose) {
        if (this.intervalId) clearInterval(this.intervalId);

        // 刷新 UI 显示敌人
        document.getElementById('enemy-name').innerText = enemy.name;
        
        let currentEnemyHp = enemy.hp;
        let maxEnemyHp = enemy.hp;

        this.intervalId = setInterval(() => {
            // 1. 玩家回合
            let pDmg = this.calcDmg(player, enemy);
            currentEnemyHp -= pDmg;
            
            // 更新血条UI
            let pct = Math.max(0, (currentEnemyHp / maxEnemyHp) * 100);
            document.getElementById('enemy-hp-bar').style.width = pct + "%";

            // 判定胜利
            if (currentEnemyHp <= 0) {
                this.stop();
                onWin();
                return;
            }

            // 2. 敌人回合
            let eDmg = this.calcDmg(enemy, player);
            player.hp -= eDmg;
            
            // 判定失败
            if (player.hp <= 0) {
                this.stop();
                onLose();
                return;
            }
            
            // 每次扣血都刷新玩家UI
            Game.updateUI();

        }, 1000); // 1000毫秒 = 1秒一回合
    },

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
};
