const Logger = {
    log(msg, type = 'normal') {
        const container = document.getElementById('log-container');
        const div = document.createElement('div');
        div.className = `log-entry log-${type}`;
        div.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight; // 自动滚动到底部
        
        // 限制日志数量，防止网页卡顿
        if (container.children.length > 50) {
            container.removeChild(container.firstChild);
        }
    }
};
