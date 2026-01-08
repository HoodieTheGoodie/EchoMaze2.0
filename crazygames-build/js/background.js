// background.js - Cyberpunk computer interior background

// Helper to get level color (blue -> red progression)
function getLevelColor(level = 1) {
    const l = Math.max(1, Math.min(10, level));
    const t = (l - 1) / 9;
    const r = Math.round(0 + t * 255);
    const g = Math.round(246 - t * 246);
    const b = Math.round(255 - t * 255);
    return { r, g, b };
}

class BackgroundRenderer {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'bgCanvas';
        this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
        document.body.prepend(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.circuits = [];
        this.pulsingWires = [];
        this.computerParts = [];
        this.dataPackets = [];
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.init();
        this.animate();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.init();
    }
    
    init() {
        this.circuits = [];
        this.pulsingWires = [];
        this.computerParts = [];
        this.dataPackets = [];
        
        const gridSize = 80;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            for (let y = 0; y < this.canvas.height; y += gridSize) {
                if (Math.random() > 0.3) {
                    this.circuits.push({
                        x, y,
                        width: gridSize,
                        height: gridSize,
                        opacity: 0.1 + Math.random() * 0.15
                    });
                }
            }
        }
        
        for (let i = 0; i < 15; i++) {
            const isHorizontal = Math.random() > 0.5;
            this.pulsingWires.push({
                isHorizontal,
                x: isHorizontal ? 0 : Math.random() * this.canvas.width,
                y: isHorizontal ? Math.random() * this.canvas.height : 0,
                length: isHorizontal ? this.canvas.width : this.canvas.height,
                pulseSpeed: 0.0003 + Math.random() * 0.0005, // Slower: ~30-50% of original speed
                pulseOffset: Math.random() * Math.PI * 2,
                thickness: 1 + Math.random() * 2
            });
        }
        
        for (let i = 0; i < 20; i++) {
            const type = ['chip', 'capacitor', 'resistor'][Math.floor(Math.random() * 3)];
            this.computerParts.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                type,
                size: 20 + Math.random() * 40,
                rotation: Math.random() * Math.PI * 2,
                opacity: 0.15 + Math.random() * 0.15,
                pulseSpeed: 0.0002 + Math.random() * 0.0003 // Slower: ~40% of original speed
            });
        }
    }
    
    animate(time = 0) {
        // Get current level from game state
        const level = (window.gameState && window.gameState.currentLevel) || 1;
        const color = getLevelColor(level);
        const baseColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
        
        // Dark computer interior base
        this.ctx.fillStyle = 'rgba(5, 7, 13, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw circuit grid with level color
        this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`;
        this.ctx.lineWidth = 1;
        for (const circuit of this.circuits) {
            this.ctx.strokeRect(circuit.x, circuit.y, circuit.width, circuit.height);
            
            if (Math.random() > 0.7) {
                this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${circuit.opacity})`;
                this.ctx.fillRect(circuit.x + circuit.width / 2 - 2, circuit.y + circuit.height / 2 - 2, 4, 4);
            }
        }
        
        // Draw pulsing wires with data flow - level color
        for (const wire of this.pulsingWires) {
            const pulse = Math.sin(time * wire.pulseSpeed + wire.pulseOffset) * 0.5 + 0.5;
            const alpha = 0.2 + pulse * 0.4;
            
            this.ctx.save();
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
            this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
            this.ctx.lineWidth = wire.thickness;
            
            this.ctx.beginPath();
            if (wire.isHorizontal) {
                this.ctx.moveTo(0, wire.y);
                this.ctx.lineTo(this.canvas.width, wire.y);
            } else {
                this.ctx.moveTo(wire.x, 0);
                this.ctx.lineTo(wire.x, this.canvas.height);
            }
            this.ctx.stroke();
            this.ctx.restore();
            
            // Spawn data packets less frequently and slower
            if (Math.random() > 0.995) {
                this.dataPackets.push({
                    wireIndex: this.pulsingWires.indexOf(wire),
                    progress: 0,
                    speed: 0.003 + Math.random() * 0.005, // Much slower: ~25-40% of original speed
                    size: 3 + Math.random() * 3,
                    color: `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
                });
            }
        }
        
        // Draw and update data packets with level color
        for (let i = this.dataPackets.length - 1; i >= 0; i--) {
            const packet = this.dataPackets[i];
            const wire = this.pulsingWires[packet.wireIndex];
            
            if (!wire) {
                this.dataPackets.splice(i, 1);
                continue;
            }
            
            // Update packet color for current level
            packet.color = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
            
            packet.progress += packet.speed;
            
            if (packet.progress > 1) {
                this.dataPackets.splice(i, 1);
                continue;
            }
            
            const x = wire.isHorizontal ? packet.progress * this.canvas.width : wire.x;
            const y = wire.isHorizontal ? wire.y : packet.progress * this.canvas.height;
            
            this.ctx.save();
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = packet.color;
            this.ctx.fillStyle = packet.color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, packet.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        
        // Draw computer components with level color
        for (const part of this.computerParts) {
            const pulse = Math.sin(time * part.pulseSpeed) * 0.3 + 0.7;
            const alpha = part.opacity * pulse;
            
            this.ctx.save();
            this.ctx.translate(part.x, part.y);
            this.ctx.rotate(part.rotation);
            this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
            this.ctx.lineWidth = 2;
            
            if (part.type === 'chip') {
                this.ctx.strokeRect(-part.size / 2, -part.size / 2, part.size, part.size);
                for (let i = 0; i < 4; i++) {
                    const pinLen = 8;
                    this.ctx.beginPath();
                    this.ctx.moveTo(-part.size / 2, -part.size / 4 + i * part.size / 6);
                    this.ctx.lineTo(-part.size / 2 - pinLen, -part.size / 4 + i * part.size / 6);
                    this.ctx.stroke();
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(part.size / 2, -part.size / 4 + i * part.size / 6);
                    this.ctx.lineTo(part.size / 2 + pinLen, -part.size / 4 + i * part.size / 6);
                    this.ctx.stroke();
                }
            } else if (part.type === 'capacitor') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, part.size / 3, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(0, -part.size / 2);
                this.ctx.lineTo(0, -part.size / 3);
                this.ctx.moveTo(0, part.size / 3);
                this.ctx.lineTo(0, part.size / 2);
                this.ctx.stroke();
            } else {
                this.ctx.beginPath();
                this.ctx.moveTo(-part.size / 2, 0);
                for (let i = 0; i < 6; i++) {
                    const x = -part.size / 2 + (i * part.size / 5);
                    const y = (i % 2 === 0) ? -part.size / 6 : part.size / 6;
                    this.ctx.lineTo(x, y);
                }
                this.ctx.lineTo(part.size / 2, 0);
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        }
        
        // Subtle scanlines with level color tint
        this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.02)`;
        for (let y = 0; y < this.canvas.height; y += 4) {
            this.ctx.fillRect(0, y, this.canvas.width, 1);
        }
        
        requestAnimationFrame((t) => this.animate(t));
    }
}

if (typeof window !== 'undefined') {
    new BackgroundRenderer();
}
