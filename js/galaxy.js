// 星河记忆 - 银河视觉引擎
// 使用 Canvas 生成高密度 1px 星星，算法分布形成银河带

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
        const starCount = Math.floor((w * h) / 800); // ~1 star per 800px² for high density

        stars = [];

        for (let i = 0; i < starCount; i++) {
            // Determine if this star belongs to the Milky Way band
            // The band follows a diagonal curve across the sky
            const isInBand = Math.random() < 0.35;

            let x, y;

            if (isInBand) {
                // Milky Way band: diagonal swath across the canvas
                // Use a sine-wave shaped band
                const bandY = Math.random();
                // The band center follows a sine curve from top-left to bottom-right
                const bandCenter = 0.3 + 0.4 * (bandY + 0.1 * Math.sin(bandY * Math.PI * 4));
                // Scatter around the band center with a Gaussian-ish distribution
                const bandWidth = 0.08;
                const offset = (Math.random() - 0.5) * bandWidth * 2;
                // Map to canvas coordinates along the diagonal
                const t = bandY;
                x = (t * 0.7 + 0.15 + offset) * w;
                y = (t * 0.6 + 0.2 + offset * 1.5) * h;
                // Add slight random scatter
                x += (Math.random() - 0.5) * 20;
                y += (Math.random() - 0.5) * 20;
            } else {
                // Random scattered stars everywhere
                x = Math.random() * w;
                y = Math.random() * h;
            }

            // Ensure within bounds
            x = Math.max(0, Math.min(w, x));
            y = Math.max(0, Math.min(h, y));

            // Star properties
            const brightness = 0.3 + Math.random() * 0.7;
            const blueShift = Math.random();
            let color;
            if (blueShift < 0.15) {
                // Blue-white stars (hot)
                color = `rgba(180, 200, 255, ${brightness})`;
            } else if (blueShift < 0.3) {
                // White stars
                color = `rgba(255, 255, 255, ${brightness})`;
            } else {
                // Warm/yellow-white stars
                color = `rgba(255, 240, 220, ${brightness})`;
            }

            stars.push({
                x, y,
                brightness,
                baseBrightness: brightness,
                twinkleSpeed: 0.5 + Math.random() * 2,
                twinkleOffset: Math.random() * Math.PI * 2,
                size: 1, // Always 1px
                color
            });
        }
    }

    function draw(timestamp) {
        if (!ctx || !canvas) return;

        // Clear canvas (transparent - background is set via CSS)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Twinkle phase
        twinklePhase = timestamp / 1000;

        // Draw all stars
        for (const star of stars) {
            const twinkle = 0.6 + 0.4 * Math.sin(twinklePhase * star.twinkleSpeed + star.twinkleOffset);
            const alpha = star.baseBrightness * twinkle;

            ctx.fillStyle = star.color.replace(/[\d.]+\)$/, `${alpha})`);
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        animationId = requestAnimationFrame(draw);
    }

    function animate() {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
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

    return {
        init,
        destroy,
        resize
    };
})();