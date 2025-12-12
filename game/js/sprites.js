// sprites.js - Sprite/texture management

const sprites = {
    bazooka: null,
    generator: null,
    ammoCrate: null,
    greenKey: null,
    yellowKey: null,
    flashlight: null,
    loaded: false
};

// Load all sprite images
export function loadSprites() {
    return new Promise((resolve) => {
        let loadedCount = 0;
        const totalSprites = 6; // Updated to 6 sprites
        
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
        
        // Load green key sprite
        sprites.greenKey = new Image();
        sprites.greenKey.onload = checkComplete;
        sprites.greenKey.onerror = checkComplete;
        sprites.greenKey.src = 'assets/green_key.png';
        
        // Load yellow key sprite
        sprites.yellowKey = new Image();
        sprites.yellowKey.onload = checkComplete;
        sprites.yellowKey.onerror = checkComplete;
        sprites.yellowKey.src = 'assets/yellow_key.png';
        
        // Load flashlight sprite
        sprites.flashlight = new Image();
        sprites.flashlight.onload = checkComplete;
        sprites.flashlight.onerror = checkComplete;
        sprites.flashlight.src = 'assets/flashlight.png';
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
