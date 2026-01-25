<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>KYOUTEI MOBILE</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #001f3f; touch-action: manipulation; width: 100vw; height: 100vh; font-family: sans-serif; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script>
        // --- 縦画面固定 ---
        async function lockOrientation() {
            try { if (screen.orientation && screen.orientation.lock) { await screen.orientation.lock('portrait'); } } 
            catch (e) { console.log("Orientation lock failed"); }
        }
        window.addEventListener('click', lockOrientation, { once: true });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        document.body.appendChild(canvas);

        let pt = 300; let displayPt = 300; let betAmount = 100; let scene = 'opening';
        let textX = -800; let selectedBet = null; let isGameOver = false;
        let raceHistory = []; let currentWind = 3.5; let payoffResult = 0; let hasCalculated = false;

        const marks = {
            "Start": {x: 0.5, y: 0.9},
            "Up":    {x: 0.5, y: 0.45},
            "Side":  {x: 0.75, y: 0.55},
            "Down":  {x: 0.5, y: 0.75},
            "Goal":  {x: 0.25, y: 0.9}
        };

        const longCourse = ["Up", "Side", "Down", "Up", "Down", "Goal"];
        const shortCourse = ["Up", "Side", "Down", "Goal"];
        const baseVel = 0.075 * 0.7 * 1.2; 

        const racers = [
            { id:1, name: "Bath-tub", logo: "B", speed: (0.015777 * 1.5) * baseVel, odds: 30.0, color: "#ff4444", tackSide: 1, course: shortCourse, stability: 99.9999, winCount: 0 },
            { id:2, name: "M-Rig", logo: "M", speed: (0.029*1.2) * baseVel, odds: 10.0, color: "#44ff44", tackSide: -1, course: longCourse, stability: 0.99, winCount: 0 },
            { id:3, name: "Radar-Lazer", logo: "R", speed: 0.035 * baseVel, odds: 2.0, color: "#4444ff", tackSide: 1, course: longCourse, stability: 0.8, winCount: 0 },
            { id:4, name: "Nymph", logo: "N", speed: (0.0488 * 0.8999) * baseVel, odds: 4.5, color: "#ffff44", tackSide: -1, course: longCourse, stability: 0.665, winCount: 0 }
        ];

        function resetRacer(r) {
            r.x = 0; r.y = 0; r.targetIdx = 0; r.finished = false; r.rank = 0;
            r.tackTimer = Math.random() * 60; r.vx = 0; r.vy = 0; r.liveRank = 0; r.isCapsized = false;
        }
        racers.forEach(resetRacer);

        function main() {
            ctx.fillStyle = '#001f3f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (displayPt < pt) { displayPt += Math.max(1, Math.floor((pt - displayPt) * 0.1)); } 
            else if (displayPt > pt) { displayPt = pt; }
            if (scene === 'opening') drawOpening();
            else if (scene === 'betting') drawBetting();
            else if (scene === 'racing') drawRacing();
            else if (scene === 'result') drawResult();
            else if (scene === 'gameover') drawGameOver();
            requestAnimationFrame(main);
        }

        function drawOpening() {
            ctx.fillStyle = "white"; ctx.font = "bold 60px sans-serif"; ctx.textAlign = "center";
            textX += (canvas.width / 2 - textX) * 0.1;
            if (Math.abs(canvas.width / 2 - textX) < 1) setTimeout(() => scene = 'betting', 800);
            ctx.fillText("KYOUTEI", textX, canvas.height / 2);
        }

        function drawStatusPanel() {
            const pW = (canvas.width - 40) / 2;
            ctx.strokeStyle = "#00d1ff"; ctx.strokeRect(15, 15, pW, 70);
            ctx.fillStyle = "white"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left";
            ctx.fillText("CREDIT:", 20, 40); ctx.fillText("BET:", 20, 65);
            ctx.font = "bold 16px monospace"; ctx.textAlign = "right";
            ctx.fillText(displayPt + "Pt", 10 + pW, 40); ctx.fillText(betAmount + "Pt", 10 + pW, 65);
            let wCol = currentWind >= 10 ? "#ff4444" : (currentWind >= 5 ? "#ffcc00" : "#00d1ff");
            ctx.strokeStyle = wCol; ctx.strokeRect(canvas.width - 15 - pW, 15, pW, 70);
            ctx.fillStyle = "white"; ctx.font = "bold 22px monospace"; ctx.textAlign = "center";
            ctx.fillText(currentWind.toFixed(1), canvas.width - 15 - pW/2, 60);
            ctx.font = "bold 10px sans-serif"; ctx.fillText("m/s", canvas.width - 15 - pW/2, 75);
        }

        function drawBetting() {
            drawStatusPanel();
            ctx.fillStyle = "#ffcc00"; ctx.fillRect(canvas.width/2 - 60, 95, 120, 30);
            ctx.fillStyle = "black"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("金額変更", canvas.width/2, 115);
            drawColorGuide(135); drawHistory(135);
            const startY = 225; const cW = canvas.width / 2; const cH = 90;
            racers.forEach((r, i) => {
                const x = (i % 2) * cW + cW/2; const y = startY + Math.floor(i / 2) * cH;
                ctx.strokeStyle = r.color; ctx.lineWidth = 2; ctx.strokeRect(x - 60, y - 40, 120, 80);
                ctx.fillStyle = "white"; ctx.font = "bold 28px sans-serif"; ctx.fillText(r.logo, x, y + 5);
                ctx.font = "10px sans-serif"; ctx.fillText(r.name, x, y + 22); ctx.fillText(r.odds + "x", x, y + 35);
            });
            const zY = startY + 2 * cH + 5;
            // 全沈ボタン
            ctx.strokeStyle = "white"; ctx.setLineDash([4, 4]); ctx.strokeRect(canvas.width/2 - 60, zY - 40, 120, 80);
            ctx.setLineDash([]); ctx.fillStyle = "red"; ctx.font = "bold 18px sans-serif"; ctx.fillText("全沈", canvas.width/2, zY + 5);
            ctx.fillStyle = "white"; ctx.font = "10px sans-serif"; ctx.fillText("(50x)", canvas.width/2, zY + 25);
            
            // 二連単ボタン（全沈の下に追加）
            const nirenY = zY + 90;
            ctx.fillStyle = "#001529"; ctx.strokeStyle = "#00d1ff"; ctx.lineWidth = 2;
            ctx.fillRect(canvas.width/2 - 100, nirenY - 25, 200, 50);
            ctx.strokeRect(canvas.width/2 - 100, nirenY - 25, 200, 50);
            ctx.fillStyle = "white"; ctx.font = "bold 16px sans-serif";
            ctx.fillText("二連単で投票", canvas.width/2, nirenY + 5);
        }

        function drawRacing() {
            drawStatusPanel(); drawColorGuide(100); drawHistory(100);
            const sorted = [...racers].sort((a, b) => {
                if (a.isCapsized !== b.isCapsized) return a.isCapsized ? 1 : -1;
                if (a.finished !== b.finished) return a.finished ? -1 : 1;
                if (a.finished) return a.rank - b.rank;
                let progA = a.targetIdx / a.course.length;
                let progB = b.targetIdx / b.course.length;
                if (progA !== progB) return progB - progA;
                let tA = marks[a.course[a.targetIdx]], tB = marks[b.course[b.targetIdx]];
                let dA = Math.sqrt((tA.x*canvas.width-a.x)**2+(tA.y*canvas.height-a.y)**2);
                let dB = Math.sqrt((tB.x*canvas.width-b.x)**2+(tB.y*canvas.height-b.y)**2);
                return dA - dB;
            });
            sorted.forEach((r, i) => r.liveRank = i + 1);

            Object.keys(marks).forEach(m => {
                ctx.fillStyle = m === "Goal" ? "white" : "orange"; ctx.beginPath();
                ctx.arc(marks[m].x * canvas.width, marks[m].y * canvas.height, 5, 0, Math.PI*2); ctx.fill();
            });

            racers.forEach((r) => {
                if (r.isCapsized) { ctx.fillStyle = "red"; ctx.font = "bold 12px sans-serif"; ctx.fillText("沈", r.x, r.y - 10); } 
                else if (!r.finished) {
                    if (Math.random() < (0.00001 * currentWind) / r.stability) r.isCapsized = true; 
                    let tKey = r.course[r.targetIdx]; let t = marks[tKey]; if (!t) return;
                    let tx = t.x * canvas.width, ty = t.y * canvas.height;
                    if (r.x === 0) { r.x = marks.Start.x * canvas.width; r.y = marks.Start.y * canvas.height; }
                    let dx = tx - r.x, dy = ty - r.y, dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 15) { r.targetIdx++; if (r.targetIdx >= r.course.length) { r.finished = true; r.rank = racers.filter(f => f.finished).length; if (r.rank === 1) { raceHistory.push({name: r.name, color: r.color}); r.winCount++; updateOdds(); } } } 
                    else {
                        let moveVel = r.speed * canvas.width; let angle = Math.atan2(dy, dx);
                        if (tKey === "Up") { r.tackTimer++; if (r.tackTimer > 40 + Math.random() * 30) { r.tackSide *= -1; r.tackTimer = 0; } angle += 0.8 * r.tackSide; moveVel *= 0.6; }
                        r.vx = Math.cos(angle); r.vy = Math.sin(angle); r.x += r.vx * moveVel; r.y += r.vy * moveVel;
                    }
                    ctx.fillStyle = "white"; ctx.font = "bold 10px sans-serif"; ctx.textAlign="center"; ctx.fillText(r.liveRank + "位", r.x, r.y - 12);
                }
                ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(Math.atan2(r.vy, r.vx));
                ctx.fillStyle = r.isCapsized ? "#555" : r.color; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill(); ctx.restore();
            });
            if (racers.every(all => all.finished || all.isCapsized)) { if (!window.sceneTimer) { window.sceneTimer = setTimeout(() => { scene = 'result'; window.sceneTimer = null; }, 1500); } }
        }

        function drawResult() {
            const s = [...racers].sort((a, b) => (a.isCapsized !== b.isCapsized) ? (a.isCapsized ? 1 : -1) : a.rank - b.rank);
            const r1 = s[0]; const r2 = s[1];
            if (!hasCalculated) {
                payoffResult = 0;
                if (selectedBet) {
                    if (selectedBet.type === 'tan') {
                        if (selectedBet.r1 === 99) { if (racer
