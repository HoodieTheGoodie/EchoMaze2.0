/**
 * Menu Background Particles Module
 * Adds ambient particle effects to the main menu background
 */

(function() {
    'use strict';

    let canvas, ctx;
    let particles = [];
    let animationFrame;
    let isActive = false;

    const CONFIG = {
        particleCount: 40,
        minSpeed: 0.2,
        maxSpeed: 0.8,
        minSize: 1,
        maxSize: 3,
        color: 'rgba(0, 246, 255, 0.4)',
        connectionDistance: 150,
        connectionOpacity: 0.15
    };

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * (CONFIG.maxSpeed - CONFIG.minSpeed) + CONFIG.minSpeed;
            this.vy = (Math.random() - 0.5) * (CONFIG.maxSpeed - CONFIG.minSpeed) + CONFIG.minSpeed;
            this.size = Math.random() * (CONFIG.maxSize - CONFIG.minSize) + CONFIG.minSize;
            this.opacity = Math.random() * 0.5 + 0.3;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Wrap around edges
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 246, 255, ${this.opacity})`;
            ctx.fill();
        }
    }

    /**
     * Initialize the particle system
     */
    function init() {
        // Create canvas element
        canvas = document.createElement('canvas');
        canvas.id = 'menu-particles';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1';
        canvas.style.opacity = '0.6';
        
        document.body.insertBefore(canvas, document.body.firstChild);
        
        ctx = canvas.getContext('2d');
        
        // Set canvas size
        resize();
        
        // Create particles
        for (let i = 0; i < CONFIG.particleCount; i++) {
            particles.push(new Particle());
        }
        
        // Handle window resize
        window.addEventListener('resize', resize);
    }

    /**
     * Resize canvas to match window
     */
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    /**
     * Draw connections between nearby particles
     */
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < CONFIG.connectionDistance) {
                    const opacity = CONFIG.connectionOpacity * (1 - distance / CONFIG.connectionDistance);
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 246, 255, ${opacity})`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    /**
     * Animation loop
     */
    function animate() {
        if (!isActive) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // Draw connections
        drawConnections();
        
        animationFrame = requestAnimationFrame(animate);
    }

    /**
     * Start the particle effect
     */
    function start() {
        if (isActive) return;
        
        // Check if reduced motion is enabled (safely check if ACCESSIBILITY exists and is initialized)
        if (window.ACCESSIBILITY && window.ACCESSIBILITY.settings && window.ACCESSIBILITY.settings.reducedMotion) {
            return; // Don't start particles if reduced motion is on
        }
        
        isActive = true;
        if (canvas) {
            canvas.style.display = 'block';
            animate();
        }
    }

    /**
     * Stop the particle effect
     */
    function stop() {
        isActive = false;
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        if (canvas) {
            canvas.style.display = 'none';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    /**
     * Clean up resources
     */
    function destroy() {
        stop();
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
        particles = [];
        canvas = null;
        ctx = null;
    }

    // Export API
    window.MENU_PARTICLES = {
        init,
        start,
        stop,
        destroy
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
