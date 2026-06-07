// 星河记忆 - 银河视觉引擎
// 使用 Canvas 生成高密度星星，算法分布形成旋涡银河带

const Galaxy = (() => {
    let canvas = null;
    let ctx = null;
    let animationId = null;
    let stars = [];
    let twinklePhase = 0;

    function init(canvasId = 'galaxy-canvas') {
        canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn('[Galaxy] Canvas 元素未找到:', canvasId);
            return;
        }

        ctx = canvas.getContext('2d');
        resize();
        generateStars();
        animate();

        window.addEventListener('resize', () => {
            resize();
            generateStars();
        });
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    }

    function generateStars() {
        const w = canvas.width;
        const h = canvas.height;
        // 密度提升 2 倍
        const starCount = Math.floor((w * h) / 400);

        stars = [];
        const centerX = w / 2;
        const centerY = h / 2;
        const maxRadius = Math.max(w, h) * 0.8;

        for (let i = 0; i < starCount; i++) {
            let x, y;
            const isSpiral = Math.random() < 0.75; 

            if (isSpiral) {
                // 旋涡星系算法
                const arms = 2;
                const armIndex = Math.floor(Math.random() * arms);
                const distance = Math.pow(Math.random(), 0.75) * maxRadius;
                
                // 螺旋线公式: theta = r * factor
                const spiralFactor = 0.12;
                const baseAngle = distance * spiralFactor;
                const armAngle = (armIndex / arms) * Math.PI * 2;
                
                // 离中心越远，散布越大
                const spread = (Math.random() - 0.5) * (maxRadius / (distance + 100)) * 5;
                
                const finalAngle = baseAngle + armAngle + spread;
                
                // 椭圆投影模拟倾斜
                let tx = Math.cos(finalAngle) * distance;
                let ty = Math.sin(finalAngle) * distance * 0.4; 

                // 整体旋转倾斜
                const galaxyTilt = -0.5;
                x = centerX + tx * Math.cos(galaxyTilt) - ty * Math.sin(galaxyTilt);
                y = centerY + tx * Math.sin(galaxyTilt) + ty * Math.cos(galaxyTilt);
            } else {
                x = Math.random() * w;
                y = Math.random() * h;
            }

            // 星星规格：0.5px - 1.0px
            const size = 0.5 + Math.random() * 0.5;
            const brightness = 0.2 + Math.random() * 0.8;
            const blueShift = Math.random();
            let color;
            
            if (blueShift < 0.2) {
                color = `rgba(180, 200, 255, ${brightness})`;
            } else if (blueShift < 0.4) {
                color = `rgba(255, 255, 255, ${brightness})`;
            } else {
                color = `rgba(255, 240, 220, ${brightness})`;
            }

            stars.push({
                x, y,
                baseBrightness: brightness,
                twinkleSpeed: 0.3 + Math.random() * 1.2,
                twinkleOffset: Math.random() * Math.PI * 2,
                size,
                color
            });
        }
    }

    function draw(timestamp) {
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        twinklePhase = timestamp / 1000;

        for (const star of stars) {
            const twinkle = 0.6 + 0.4 * Math.sin(twinklePhase * star.twinkleSpeed + star.twinkleOffset);
            const alpha = star.baseBrightness * twinkle;

            // 优化渲染：使用 globalAlpha 配合固定的颜色字符串以提升性能
            ctx.globalAlpha = alpha;
            ctx.fillStyle = star.color.substring(0, star.color.lastIndexOf(',')) + ', 1)';
            
            if (star.size > 0.8) {
                ctx.fillRect(star.x, star.y, star.size, star.size);
            } else {
                // 极小星点
                ctx.fillRect(star.x, star.y, 1, 1);
            }
        }
        ctx.globalAlpha = 1.0;

        animationId = requestAnimationFrame(draw);
    }

    function animate() {
        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(draw);
    }

    function destroy() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        canvas = null;
        ctx = null;
        stars = [];
    }

    return { init, destroy, resize };
})();
