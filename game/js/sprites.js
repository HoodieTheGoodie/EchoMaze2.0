// sprites.js - Sprite/texture management

const sprites = {
    bazooka: null,
    generator: null,
    ammoCrate: null,
    loaded: false
};

// Load all sprite images
export function loadSprites() {
    return new Promise((resolve) => {
        let loadedCount = 0;
        const totalSprites = 3; // Only 3 sprites now
        
        const checkComplete = () => {
            loadedCount++;
            console.log(`Sprite loaded: ${loadedCount}/${totalSprites}`);
            if (loadedCount === totalSprites) {
                sprites.loaded = true;
                console.log('All sprites loaded!', sprites);
                resolve();
            }
        };
        
        // Load bazooka sprite
        sprites.bazooka = new Image();
        sprites.bazooka.onload = () => {
            console.log('Bazooka sprite loaded successfully!', sprites.bazooka.src);
            checkComplete();
        };
        sprites.bazooka.onerror = (err) => {
            console.error('Failed to load bazooka sprite:', err);
            checkComplete();
        };
        sprites.bazooka.src = 'assets/bazooka.png';
        console.log('Loading bazooka from:', sprites.bazooka.src);
        
        // Load generator sprite
        sprites.generator = new Image();
        sprites.generator.onload = checkComplete;
        sprites.generator.onerror = checkComplete;
        sprites.generator.src = 'assets/generator.png';
        
        // Load ammo crate sprite
        sprites.ammoCrate = new Image();
        sprites.ammoCrate.onload = checkComplete;
        sprites.ammoCrate.onerror = checkComplete;
        sprites.ammoCrate.src = 'assets/ammo_crate.png';
    });
}

// Get a sprite by name
export function getSprite(name) {
    return sprites[name] || null;
}

// Check if sprites are loaded
export function areSpritesLoaded() {
    return sprites.loaded;
}
