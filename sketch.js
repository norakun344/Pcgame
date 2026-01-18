const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.style.backgroundColor = "#001f3f";

let pt = 300;
let betAmount = 100; 
let scene = 'opening';
let textX = -800;
let selectedClass = null;
let isGameOver = false;

const marks = {
    "Start": {x: 0.5, y: 0.8},
    "Up":    {x: 0.5, y: 0.2},
    "Side":  {x: 0.8, y: 0.45},
    "Down":  {x: 0.5, y: 0.7},
    "Goal":  {x: 0.2, y: 0.8}
};

const baseVel = 0.075;
// 調整：Laserの速度を 0.035 -> 0.028 に下方修正
const racers = [
    { name: "Op", logo: "⌽", speed: (0.015 * 1.5) * baseVel, odds: 50.0, color: "#ff4444" },
    { name: "MR", logo: "⚓", speed: 0.025 * baseVel, odds: 12.5, color: "#44ff44" },
    { name: "Laser", logo: "L", speed: 0.028 * baseVel, odds: 1.8, color: "#4444ff" },
    { name: "Moth", logo: "M", speed: (0.065 * 0.5) * baseVel, odds: 2.5, color: "#ffff44" }
];

function resetRacer(r) {
    r.x = 0; r.y = 0; r.targetIdx = 0; r.finished = false; r.rank = 0;
}
racers.forEach(resetRacer);

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function main() {
    ctx.fillStyle = '#001f3f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (scene === 'opening') drawOpening();
    else if (scene === 'betting') drawBetting();
    else if (scene === 'racing') drawRacing();
    else if (scene === 'result') drawResult();
    else if (scene === 'gameover') drawGameOver();
    requestAnimationFrame(main);
}

function drawOpening() {
    ctx.fillStyle = "white";
    ctx.font = "bold 80px sans-serif";
    ctx.textAlign = "center";
    textX += (canvas.width / 2 - textX) * 0.1;
    if (Math.abs(canvas.width / 2 - textX) < 1) setTimeout(() => scene = 'betting', 800);
    ctx.fillText("KEITEI", textX, canvas.height / 2);
}

function drawBetting() {
    ctx.fillStyle = "white";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`所持Pt: ${pt}Pt`, canvas.width/2, 40);

    // 掛け金変更ボタン
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(canvas.width/2 - 100, 60, 200, 45);
    ctx.fillStyle = "black";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`賭け金: ${betAmount}Pt`, canvas.width/2, 90);
    ctx.fillStyle = "white";
    ctx.font = "14px sans-serif";
    ctx.fillText("ここを押して金額を変更 (最低10Pt)", canvas.width/2, 125);

    const sp = canvas.width / 5;
    racers.forEach((r, i) => {
        const x = (i + 1) * sp;
        const y = canvas.height / 2 + 50;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 60, y - 80, 120, 160);
        ctx.fillStyle = "white";
        ctx.font = "bold 60px serif"; 
        ctx.fillText(r.logo, x, y + 10);
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(r.name, x, y + 45);
        ctx.fillStyle = "#ffcc00";
        ctx.fillText(`${r.odds}倍`, x, y + 70);
    });
}

function drawRacing() {
    // カラーガイド
    ctx.textAlign = "left";
    ctx.font = "bold 16px sans-serif";
    racers.forEach((r, i) => {
        ctx.fillStyle = r.color;
        let colorName = r.color === "#ff4444" ? "赤" : r.color === "#44ff44" ? "緑" : r.color === "#4444ff" ? "青" : "黄";
        ctx.fillText(`${colorName}=${r.name}`, 20, 30 + i*25);
    });
    ctx.fillStyle = "white";
    ctx.fillText(`賭け額: ${betAmount}Pt`, 20, 140);

    Object.keys(marks).forEach(m => {
        ctx.fillStyle = m === "Goal" ? "white" : "orange";
        ctx.beginPath();
        ctx.arc(marks[m].x * canvas.width, marks[m].y * canvas.height, 8, 0, Math.PI*2);
        ctx.fill();
    });

    racers.forEach(r => {
        if (r.finished) return;
        const targetList = ["Up", "Side", "Down", "Goal"];
        let target = marks[targetList[r.targetIdx]];
        let tx = target.x * canvas.width;
        let ty = target.y * canvas.height;

        if (r.x === 0) { r.x = marks.Start.x * canvas.width; r.y = marks.Start.y * canvas.height; }
        
        let dx = tx - r.x; let dy = ty - r.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 10) {
            r.targetIdx++;
            if (r.targetIdx >= targetList.length) {
                r.finished = true;
                r.rank = racers.filter(f => f.finished).length;
                if (racers.every(all => all.finished)) setTimeout(() => scene = 'result', 1000);
            }
        } else {
            let windFactor = (targetList[r.targetIdx] === "Up") ? 0.6 : (targetList[r.targetIdx] === "Side") ? 1.5 : 1.2;
            let luck = 0.85 + (Math.random() * 0.3); 
            r.x += (dx / dist) * r.speed * windFactor * luck * canvas.width;
            r.y += (dy / dist) * r.speed * windFactor * luck * canvas.width;
        }

        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.fillStyle = r.color;
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -6); ctx.lineTo(-8, 6); ctx.closePath();
        ctx.fill();
        ctx.restore();
    });
}

function drawResult() {
    const winner = racers.find(r => r.rank === 1);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText(`優勝: ${winner.name}級`, canvas.width/2, canvas.height/2 - 40);
    
    if (winner.name === selectedClass.name) {
        let payoff = Math.round(betAmount * winner.odds);
        pt += payoff;
        ctx.fillStyle = "#ffcc00";
        ctx.fillText(`的中！ ${payoff}Pt 獲得！`, canvas.width/2, canvas.height/2 + 20);
    } else {
        ctx.fillText(`ハズレ！`, canvas.width/2, canvas.height/2 + 20);
    }
    
    ctx.font = "20px sans-serif";
    ctx.fillText(`現在の所持金: ${pt}Pt`, canvas.width/2, canvas.height/2 + 80);
    ctx.fillText("タップして次へ", canvas.width/2, canvas.height/2 + 130);
}

function drawGameOver() {
    ctx.fillStyle = "red";
    ctx.font = "bold 80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("差 押 さ え", canvas.width/2, canvas.height/2 - 50);
    ctx.fillStyle = "white";
    ctx.font = "40px sans-serif";
    ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 + 40);
}

window.addEventListener('mousedown', (e) => {
    if (isGameOver) return;
    const mx = e.clientX; const my = e.clientY;

    if (scene === 'betting') {
        // 掛け金変更ボタン判定
        if (mx > canvas.width/2 - 100 && mx < canvas.width/2 + 100 && my > 60 && my < 105) {
            let input = prompt("賭ける金額を入力してください (最低10Pt)", betAmount);
            if (input !== null) {
                let val = parseInt(input);
                if (!isNaN(val) && val >= 10) betAmount = val;
                else alert("10以上の数値を入力してください");
            }
            return;
        }

        // 艇選択判定
        const sp = canvas.width / 5;
        racers.forEach((r, i) => {
            const x = (i + 1) * sp;
            if (mx > x - 60 && mx < x + 60 && my > canvas.height/2 - 30 && my < canvas.height/2 + 210) {
                selectedClass = r;
                pt -= betAmount;
                if (pt < 0) {
                    if (!confirm(`Ptが足りません。${Math.abs(pt)}Pt借金しますか？`)) { pt += betAmount; return; }
                }
                scene = 'racing';
            }
        });
    } else if (scene === 'result') {
        if (pt <= -1000) { scene = 'gameover'; isGameOver = true; }
        else { racers.forEach(resetRacer); scene = 'betting'; }
    }
});

main();
