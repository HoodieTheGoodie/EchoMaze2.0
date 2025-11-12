// particles.js - Particle system for visual polish

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    // Spawn particles for different effects
    spawn(type, x, y, count, options = {}) {
        switch (type) {
            case 'move':
                this.spawnMoveTrail(x, y);
                break;
            case 'damage':
                this.spawnDamage(x, y, count);
                break;
            case 'heal':
                this.spawnHeal(x, y, count);
                break;
            case 'generator':
                this.spawnGenerator(x, y, count);
                break;
            case 'sprint':
                this.spawnSprint(x, y);
                break;
            case 'teleport':
                this.spawnTeleport(x, y, count);
                break;
            case 'explosion':
                this.spawnExplosion(x, y, count, options.color);
                break;
            case 'wallHit':
                this.spawnWallHit(x, y, count);
                break;
        }
    }

    spawnMoveTrail(x, y) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: 1.0,
                decay: 0.03,
                size: 2 + Math.random() * 2,
                color: `rgba(255, 123, 0, ${0.3 + Math.random() * 0.3})`
            });
        }
    }

    spawnDamage(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2 + Math.random() * 2;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02,
                size: 3 + Math.random() * 2,
                color: '#ff3333',
                gravity: 0.1
            });
        }
    }

    spawnHeal(x, y, count = 8) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: 0,
                vy: -1 - Math.random(),
                life: 1.0,
                decay: 0.015,
                size: 3 + Math.random() * 2,
                color: '#33ff33',
                sparkle: true
            });
        }
    }

    spawnGenerator(x, y, count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.012,
                size: 3 + Math.random() * 3,
                color: '#ffd700',
                sparkle: true
            });
        }
    }

    spawnSprint(x, y) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 15,
                y: y + (Math.random() - 0.5) * 15,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 1.0,
                decay: 0.04,
                size: 4 + Math.random() * 2,
                color: '#00ffff',
                trail: true
            });
        }
    }

    spawnTeleport(x, y, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2 + Math.random() * 3;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.015,
                size: 3 + Math.random() * 3,
                color: '#ff00ff',
                glow: true
            });
        }
    }

    spawnExplosion(x, y, count = 25, color = '#ff7b00') {
        // Regular explosion particles
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02,
                size: 4 + Math.random() * 4,
                color,
                gravity: 0.15
            });
        }
        
        // Add debris blocks
        const blockCount = Math.floor(count * 0.4); // 40% of particle count as blocks
        for (let i = 0; i < blockCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3;
            const blockSize = 3 + Math.random() * 5;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1, // Initial upward velocity
                life: 1.0,
                decay: 0.015,
                size: blockSize,
                color: i % 2 === 0 ? '#888' : '#666', // Gray blocks
                gravity: 0.2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                isBlock: true
            });
        }
    }

    spawnWallHit(x, y, count = 8) {
        // Small dust particles from wall impact
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.5,
                life: 1.0,
                decay: 0.025,
                size: 2 + Math.random() * 2,
                color: '#999',
                gravity: 0.05
            });
        }
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update position
            p.x += p.vx * (deltaTime / 16);
            p.y += p.vy * (deltaTime / 16);
            
            // Apply gravity if present
            if (p.gravity) {
                p.vy += p.gravity * (deltaTime / 16);
            }
            
            // Update rotation for blocks
            if (p.isBlock && p.rotationSpeed) {
                p.rotation += p.rotationSpeed * (deltaTime / 16);
            }
            
            // Decay life
            p.life -= p.decay * (deltaTime / 16);
            
            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx, currentTime) {
        for (const p of this.particles) {
            ctx.save();
            
            // Apply glow effect
            if (p.glow || p.sparkle) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
            }
            
            // Set opacity based on life
            ctx.globalAlpha = p.life;
            
            // Draw particle
            ctx.fillStyle = p.color;
            
            if (p.isBlock) {
                // Draw rotating block/debris
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation || 0);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                // Add outline for depth
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
            } else {
                ctx.beginPath();
                
                if (p.sparkle && currentTime) {
                    // Twinkling effect
                    const twinkle = Math.sin(currentTime * 0.01) * 0.5 + 0.5;
                    const size = p.size * (0.5 + twinkle * 0.5);
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                } else if (p.trail) {
                    // Motion blur trail
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.arc(p.x - p.vx * 2, p.y - p.vy * 2, p.size * 0.5, 0, Math.PI * 2);
                } else {
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                }
                
                ctx.fill();
            }
            
            ctx.restore();
        }
    }

    clear() {
        this.particles = [];
    }
}

// Export singleton instance
export const particles = new ParticleSystem();

// Add lightning particles for wall jump
export function addElectricParticles(startX, startY, endX, endY) {
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const t = i / particleCount;
        const x = startX + (endX - startX) * t;
        const y = startY + (endY - startY) * t;
        
        // Main lightning trail particles
        particles.particles.push({
            x: x + (Math.random() - 0.5) * 0.3,
            y: y + (Math.random() - 0.5) * 0.3,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            life: 1.0,
            decay: 0.05,
            size: 3 + Math.random() * 2,
            color: `rgba(0, 255, 255, ${0.8 + Math.random() * 0.2})`,
            sparkle: true
        });
        
        // Electric spark particles
        if (Math.random() > 0.5) {
            particles.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                life: 1.0,
                decay: 0.08,
                size: 2 + Math.random() * 1,
                color: `rgba(255, 255, 100, ${0.6 + Math.random() * 0.4})`
            });
        }
    }
    
    // Add burst particles at start and end positions
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 0.5 + Math.random() * 0.5;
        
        // Start position burst
        particles.particles.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.06,
            size: 2 + Math.random() * 2,
            color: `rgba(100, 200, 255, ${0.7 + Math.random() * 0.3})`
        });
        
        // End position burst
        particles.particles.push({
            x: endX,
            y: endY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.06,
            size: 2 + Math.random() * 2,
            color: `rgba(100, 200, 255, ${0.7 + Math.random() * 0.3})`
        });
    }
}
