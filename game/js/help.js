// help.js - Help page functionality

// Slide unlock configuration
const UNLOCK_CONFIG = [
    { level: 1, deaths: 0 },      // Slide 1: Game UI - unlocked at start
    { level: 1, deaths: 0 },      // Slide 2: Generators - unlocked at start
    { level: 1, deaths: 0 },      // Slide 3: Abilities - unlocked at start
    { level: 2, deaths: 3 },      // Slide 4: Chaser - unlock by beating level 2 or dying 3 times on level 2
    { level: 3, deaths: 3 },      // Slide 5: Flying Pig - unlock by beating level 3 or dying 3 times on level 3
    { level: 5, deaths: 3 },      // Slide 6: Seeker - unlock by beating level 5 or dying 3 times on level 5
    { level: 7, deaths: 3 },      // Slide 7: TBD - unlock by beating level 7 or dying 3 times on level 7
    { level: 9, deaths: 3 },      // Slide 8: TBD - unlock by beating level 9 or dying 3 times on level 9
    { level: 10, deaths: 3 }      // Slide 9: Boss - unlock by dying to boss 3 times or beating boss
];

// Slide content
const SLIDES = [
    // Slide 1: Game UI
    {
        title: "Game UI",
        content: `
            <div class="slide-section">
                <div class="ui-item">
                    <div class="ui-icon" style="background: #ff0000; display: flex; align-items: center; justify-content: center; font-size: 2em;">❤️</div>
                    <div class="description">
                        <strong>Health:</strong> Shows the number of lives you have. Makes sound when loss of life.
                    </div>
                </div>
                
                <div class="ui-item">
                    <div class="ui-icon" style="background: linear-gradient(135deg, #00ffff, #0088ff); display: flex; align-items: center; justify-content: center; font-size: 1.2em; color: white; font-weight: bold;">100%</div>
                    <div class="description">
                        <strong>Stamina: 100%</strong> - Shows how much stamina you have.
                    </div>
                </div>
                
                <div class="ui-item">
                    <div class="ui-icon" style="background: #ffff00; display: flex; align-items: center; justify-content: center; font-size: 2em;">🛡️</div>
                    <div class="description">
                        <strong>Shield Ready:</strong> This shows your wall shield (the wall shield is a free hit to the wall) once broken a timer will start showing its recharge time, makes sound for when recharged and when broken. Also shown as the pink circle around your character.
                    </div>
                </div>
                
                <div class="ui-item">
                    <div class="ui-icon" style="background: #00ffff; display: flex; align-items: center; justify-content: center; font-size: 1.8em;">⚡</div>
                    <div class="description">
                        <strong>Traps: 0 (F)</strong> - A Zap trap is gained when a generator is completed and can be used by pressing F. The Zap trap will drop on a tile on the floor and last 10 seconds. If an enemy walks on the Trap it will be stunned for 3 seconds and reset them back to their original state. Makes sound when activated.
                    </div>
                </div>
                
                <div class="ui-item">
                    <div class="ui-icon" style="background: #ffff00; display: flex; align-items: center; justify-content: center; font-size: 1.5em; color: black; font-weight: bold;">0/3</div>
                    <div class="description">
                        <strong>Generators: 0/3</strong> - Shows the amount of generators completed.
                    </div>
                </div>
                
                <div class="ui-item">
                    <div class="ui-icon" style="background: #00ff00; display: flex; align-items: center; justify-content: center; font-size: 1em; color: black; font-weight: bold;">00:15</div>
                    <div class="description">
                        <strong>Time: 00:15:124</strong> - Shows your time taken on the level.
                    </div>
                </div>
            </div>
        `
    },

    // Slide 2: Generators
    {
        title: "Generators",
        content: `
            <div class="slide-section">
                <div class="ui-item">
                    <div class="ui-icon" style="background: linear-gradient(135deg, #ffff00, #ff8800); display: flex; align-items: center; justify-content: center; font-size: 2em;">⚙️</div>
                    <div class="description">
                        The generators are required to power on the exit to get to the next level. You must power on 3 to open the exit gate. To start the generator press <strong>E</strong> next to a yellow tile. While in the generator most enemies cannot move until you leave the generator.
                    </div>
                </div>
                
                <h3>Skill Checks</h3>
                <div class="generator-checks">
                    <div class="check-item">
                        <div style="width: 150px; height: 150px; border-radius: 50%; border: 3px solid #00ffff; display: flex; align-items: center; justify-content: center; background: rgba(0,255,255,0.1); font-size: 1.2em; margin: 0 auto 10px;">✓</div>
                        <p>Skill check 1</p>
                    </div>
                    <div class="check-item">
                        <div style="width: 150px; height: 150px; border-radius: 50%; border: 3px solid #00ffff; display: flex; align-items: center; justify-content: center; background: rgba(0,255,255,0.1); font-size: 1.2em; margin: 0 auto 10px;">✓</div>
                        <p>Skill check 2</p>
                    </div>
                    <div class="check-item">
                        <div style="width: 150px; height: 150px; border-radius: 50%; border: 3px solid #00ffff; display: flex; align-items: center; justify-content: center; background: rgba(0,255,255,0.1); font-size: 1.2em; margin: 0 auto 10px;">✓</div>
                        <p>Skill check 3</p>
                    </div>
                </div>
                
                <div class="ui-item" style="margin-top: 30px;">
                    <div class="ui-icon" style="background: #ff0000; display: flex; align-items: center; justify-content: center; font-size: 2.5em;">✕</div>
                    <div class="description">
                        If you miss 2 skill checks you will be kicked out of the gen and will lose a life, the generator will be blocked for 15 seconds after this.
                    </div>
                </div>
                
                <div class="ui-item">
                    <div class="ui-icon" style="background: #00ff00; display: flex; align-items: center; justify-content: center; font-size: 2.5em;">✓</div>
                    <div class="description">
                        Once completed the gen will lock like this and you will be able to walk through it now.
                    </div>
                </div>
            </div>
        `
    },

    // Slide 3: Abilities
    {
        title: "Player Abilities",
        content: `
            <div class="slide-section">
                <h3>Dash Ability</h3>
                <div class="ability-item">
                    <div class="ability-icon" style="background: linear-gradient(135deg, #00ffff, #0088ff); display: flex; align-items: center; justify-content: center; font-size: 3em; color: white;">💨</div>
                    <div class="description">
                        By holding <strong>Shift</strong> (MUST hold down for the ability to work) your character will light up a cyan color showing you're ready to use the ability. If you press <strong>WASD</strong> you will do a 2 block movement instead of a 1 tile movement allowing you to jump over walls (cannot jump on walls or out of bounce). This will use 100% stamina and requires 100% stamina to use.
                    </div>
                </div>
            </div>

            <div class="slide-section">
                <h3>Shield Ability</h3>
                <div class="ability-item">
                    <div class="ability-icon" style="background: linear-gradient(135deg, #ffff00, #ffaa00); display: flex; align-items: center; justify-content: center; font-size: 3em;">🛡️</div>
                    <div class="description">
                        This ability is used by pressing <strong>space bar</strong>. This will activate a shield you use to reflect projectiles. The shield will stay active for 5 seconds. While the shield is active you cannot move but you can move the shield. Shield will use 100% stamina over the 5 second time and can be activated if not at 100% stamina but only for a short amount of time. Reflecting a projectile takes 100% stamina. Makes sound when activated.
                    </div>
                </div>
            </div>
        `
    },

    // Slide 4: Chaser
    {
        title: "Chaser",
        content: `
            <div class="slide-section">
                <div class="enemy-info">
                    <div class="enemy-icon" style="background: radial-gradient(circle, #ff00ff, #aa00aa); display: flex; align-items: center; justify-content: center; font-size: 4em;">👁️</div>
                    <div class="description">
                        The Chaser is an AI that will path find to you at all times throughout the level. The Chaser AI has the ability to jump over walls to cut you off and shorten its path to you, it will <strong>Turn yellow and pause</strong> right as it's going to jump over a wall. It has a short cool down before it can do it again. If you are hit by the AI you lose 1 life and your screen will turn <strong>black and white</strong> and all enemies will freeze, while in this state you are invincible and can escape anything for 2 seconds before returning to normal. Makes sound when jumping.
                    </div>
                </div>
                
                <div class="enemy-states">
                    <div class="state-item">
                        <div style="width: 100px; height: 100px; background: #ffff00; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2em; margin: 0 auto 10px;">⚠️</div>
                        <p><strong>Telegraph State:</strong> Yellow and paused before jumping</p>
                    </div>
                    <div class="state-item">
                        <div style="width: 100px; height: 100px; background: linear-gradient(45deg, #ff00ff, #ffff00); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 2em; margin: 0 auto 10px;">🚀</div>
                        <p><strong>Jumping:</strong> Shows pathfinding on maze</p>
                    </div>
                </div>
            </div>
        `
    },

    // Slide 5: Flying Pig
    {
        title: "Flying Pig",
        content: `
            <div class="slide-section">
                <div class="enemy-info">
                    <div class="enemy-icon" style="background: radial-gradient(circle, #ff69b4, #ff1493); display: flex; align-items: center; justify-content: center; font-size: 4em;">🐷</div>
                    <div class="description">
                        The Flying Pig AI can fly over walls and will fly slowly towards the player. The pig AI will make a noise <strong>QUE</strong> and will stand still and flash yellow and pink then fire a yellow projectile at you. If not blocked the projectile will insta die, if blocked the projectile will hit the pig and you will have 10 seconds to run over and touch the pig or else it will heal. If touched then it will be knocked out for 45 seconds.
                    </div>
                </div>
                
                <div class="enemy-states">
                    <div class="state-item">
                        <div style="width: 100px; height: 100px; background: #ffff00; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2em; margin: 0 auto 10px; box-shadow: 0 0 20px #ffff00;">💥</div>
                        <p><strong>Being Shot:</strong> Yellow projectile incoming</p>
                    </div>
                    <div class="state-item">
                        <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #ffff00, #00ffff); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 2em; margin: 0 auto 10px;">↩️</div>
                        <p><strong>Reflecting Shot:</strong> Using shield ability, breaks on impact</p>
                    </div>
                    <div class="state-item">
                        <div style="width: 100px; height: 100px; background: #888; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2em; margin: 0 auto 10px;">😵</div>
                        <p><strong>Weakened:</strong> When pig is knocked down you have 10 seconds to touch it before it regens</p>
                    </div>
                    <div class="state-item">
                        <div style="width: 100px; height: 100px; background: #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2em; margin: 0 auto 10px;">💤</div>
                        <p><strong>Knocked Out:</strong> When pig is knocked out for 45 seconds, slowly turns pink showing when it comes back</p>
                    </div>
                </div>
            </div>
        `
    },

    // Slide 6: Seeker
    {
        title: "Seeker",
        content: `
            <div class="slide-section">
                <div class="enemy-info">
                    <div class="enemy-icon" style="background: radial-gradient(circle, #00ff00, #008800); display: flex; align-items: center; justify-content: center; font-size: 4em;">👀</div>
                    <div class="description">
                        The Seeker AI will roam the maze randomly and is drawn to any and all noise. The Arrow on his head shows the direction it is looking. It sees you (can see down any length of hallway can not see through walls) it will go into rage mode it moves faster and path finds to you, if you are able to escape its vision and not get seen again for 3 seconds it will go back to normal, or use a ZAP trap on it. Rage mode will also be activated if you get stunned.
                    </div>
                </div>
                
                <div class="enemy-states">
                    <div class="state-item">
                        <div style="width: 100px; height: 100px; background: linear-gradient(90deg, transparent, #ff0000, transparent); display: flex; align-items: center; justify-content: center; font-size: 2em; margin: 0 auto 10px; clip-path: polygon(0 50%, 100% 0, 100% 100%);">👁️</div>
                        <p><strong>Vision Cone:</strong> Red indicates vision range down hallways</p>
                    </div>
                </div>
                
                <div class="ui-item" style="margin-top: 30px;">
                    <div class="ui-icon" style="background: linear-gradient(135deg, #9900ff, #0099ff); display: flex; align-items: center; justify-content: center; font-size: 2em;">🌀</div>
                    <div class="description">
                        <strong>Teleporters:</strong> Teleporters start spawning on level 5 and so on and will spawn on the middle left and middle right of the maze and can be used to teleport from one side to the other but after they are used they will be on cool down for 15 seconds.
                    </div>
                </div>
            </div>
        `
    },

    // Slide 7: Batter
    {
        title: "Batter",
        content: `
            <div class="slide-section">
                <div class="enemy-info">
                    <div class="enemy-icon" style="background: radial-gradient(circle, #ff8800, #ff4400); display: flex; align-items: center; justify-content: center; font-size: 4em;">🔥</div>
                    <div class="description">
                        The Batter AI is an orange AI that will aggro onto you if you get within a 3 tile radius of him or if you mess up a generator 2 times, he will path find to you forever until he either stuns you, or until you zap trap him. He cannot move while you're in generators so there is an indicator in the gen on the right and it will flash faster the closer he is to you and will turn red if he argos on to you.
                    </div>
                </div>
                
                <div class="enemy-states">
                    <div class="state-item">
                        <div style="width: 100px; height: 100px; background: #ff4400; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2em; margin: 0 auto 10px; animation: pulse 1s infinite;">⚠️</div>
                        <p><strong>Stunned:</strong> Being stunned means you cannot move for 4 seconds or depending on the stun time you will be unable to move. When stunned you will be one tapped by all enemies, and the Seeker AI will aggro onto you when you are stunned.</p>
                    </div>
                </div>
            </div>
        `
    },

    // Slide 8: Mortar
    {
        title: "Mortar",
        content: `
            <div class="slide-section">
                <div class="enemy-info">
                    <div class="enemy-icon" style="background: radial-gradient(circle, #2bb3c0, #1a7a84); display: flex; align-items: center; justify-content: center; font-size: 4em;">💣</div>
                    <div class="description">
                        The Mortar AI is an AI that will wander around the maze and randomly will mortar strike you showing a 5x5 area around you that you have some time to react to. If you don't escape you will lose a life and be stunned, you can stun the Mortar AI by either running into him or having him hit himself with the mortar strike, once 2 gens are completed the mortar will fire 2 volleys of mortars at you. The Mortar AI can move during generators and can shoot you so if you are being shot at you can run and escape.
                    </div>
                </div>
                
                <div class="enemy-states">
                    <div class="state-item">
                        <div style="width: 100px; height: 100px; background: linear-gradient(45deg, #ffff00, #ff0000); border: 3px solid #ff0000; display: flex; align-items: center; justify-content: center; font-size: 2em; margin: 0 auto 10px;">💥</div>
                        <p><strong>Warning Zone:</strong> 5x5 explosion area indicator</p>
                    </div>
                    <div class="state-item">
                        <div style="width: 100px; height: 100px; background: #666; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2em; margin: 0 auto 10px;">😵</div>
                        <p><strong>Stunned:</strong> Mortar is disabled after hitting himself or being tackled</p>
                    </div>
                </div>
            </div>
        `
    },

    // Slide 9: Boss
    {
        title: "The Core (Boss)",
        content: `
            <div class="slide-section">
                <div class="enemy-info">
                    <div class="enemy-icon" style="background: radial-gradient(circle, #00ffff, #00aaaa); display: flex; align-items: center; justify-content: center; font-size: 4em; border: 4px solid #ff0099;">👑</div>
                    <div class="description">
                        <div style="background: #ff0099; padding: 10px; border-radius: 5px; margin-bottom: 20px; font-weight: bold;">⚠️ THE CORE: 60/60</div>
                        <p>The Core Boss is the final boss of EchoMaze 1. You are given a bazooka that has 10 shots before needing to reload, the boss has 40 health (each shell deals 20 health per shot). The boss has 3 different phases:</p>
                        
                        <div class="boss-phase" style="margin: 20px 0; padding: 15px; background: rgba(255,105,180,0.1); border-left: 4px solid #ff69b4; border-radius: 5px;">
                            <h4 style="color: #ff69b4; margin-bottom: 10px;">Pink Phase (60-40 HP)</h4>
                            <p>The Pink phase will summon in 2 pigs on the left and right side of the maze, the two will merge into 1 stronger pig. You must knock the pig out to damage the boss. You cannot use your bazooka before moving on.</p>
                        </div>
                        
                        <div class="boss-phase" style="margin: 20px 0; padding: 15px; background: rgba(255,0,0,0.1); border-left: 4px solid #ff0000; border-radius: 5px;">
                            <h4 style="color: #ff0000; margin-bottom: 10px;">Red Phase (40-20 HP)</h4>
                            <p>In the Red phase the boss will shoot a bunch of mortar shots on the map for as long you have flying. The next phase is the red phase where the pig will just shoot the boss on the timing window, and shoot the boss.</p>
                        </div>
                        
                        <div class="boss-phase" style="margin: 20px 0; padding: 15px; background: rgba(138,43,226,0.1); border-left: 4px solid #8a2be2; border-radius: 5px;">
                            <h4 style="color: #8a2be2; margin-bottom: 10px;">Purple Phase (20-0 HP)</h4>
                            <p>The 2nd Boss phase is after it reaches 20 health, it will spawn 2 boss phases at once and if you sit on the outside edge of the map for too long lava will spawn at the edges of the maze. Once defeated someone will monolog and you have to escape before you're cooked.</p>
                        </div>
                        
                        <div style="margin-top: 30px; padding: 15px; background: rgba(255,215,0,0.1); border: 2px solid #ffd700; border-radius: 5px;">
                            <h4 style="color: #ffd700; margin-bottom: 10px;">🎯 Ammo Crates</h4>
                            <p>You can reload your bazooka by using the ammo crates on the edges of the maze. Press <strong>E</strong> to collect ammo and refill your shots.</p>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
];

let currentSlide = 0;

// Load progress from localStorage
function loadProgress() {
    const saved = localStorage.getItem('echoMazeProgress');
    if (saved) {
        return JSON.parse(saved);
    }
    return {
        highestLevel: 1,
        levelDeaths: {} // Track deaths per level
    };
}

// Check if a slide is unlocked
function isSlideUnlocked(slideIndex) {
    const progress = loadProgress();
    const config = UNLOCK_CONFIG[slideIndex];
    
    // First 3 slides always unlocked
    if (slideIndex < 3) return true;
    
    // Check if player has beaten the required level (highestLevel means they completed that level)
    if (progress.highestLevel > config.level) return true;
    
    // Check if player has died enough times on this specific level
    const deaths = progress.levelDeaths[config.level] || 0;
    if (deaths >= config.deaths) return true;
    
    return false;
}

// Get unlock condition text
function getUnlockText(slideIndex) {
    const config = UNLOCK_CONFIG[slideIndex];
    const progress = loadProgress();
    const deaths = progress.levelDeaths[config.level] || 0;
    
    if (config.level === 10) {
        // Boss level
        return `Unlock by defeating the boss or dying to it ${config.deaths} times<br>Current deaths: ${deaths}/${config.deaths}`;
    }
    
    return `Unlock by beating Level ${config.level} or dying ${config.deaths} times on that level<br>Current deaths: ${deaths}/${config.deaths}`;
}

// Initialize help page
function init() {
    renderSlide();
    updateNavigation();
}

// Render current slide
function renderSlide() {
    const container = document.getElementById('slideContainer');
    const slide = SLIDES[currentSlide];
    const locked = !isSlideUnlocked(currentSlide);
    
    if (locked) {
        container.innerHTML = `
            <div style="text-align: center; padding: 80px 40px;">
                <div style="font-size: 6em; margin-bottom: 30px;">🔒</div>
                <h2 style="color: #ff3333; font-size: 2.5em; margin-bottom: 20px;">PAGE LOCKED</h2>
                <p style="color: #ffcccc; font-size: 1.3em; line-height: 1.8;">${getUnlockText(currentSlide)}</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="slide active">
                <h2>${slide.title}</h2>
                ${slide.content}
            </div>
        `;
    }
}

// Update navigation buttons
function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentPage = document.getElementById('currentPage');
    
    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === SLIDES.length - 1;
    currentPage.textContent = currentSlide + 1;
}

// Navigation functions
function nextSlide() {
    if (currentSlide < SLIDES.length - 1) {
        currentSlide++;
        renderSlide();
        updateNavigation();
    }
}

function prevSlide() {
    if (currentSlide > 0) {
        currentSlide--;
        renderSlide();
        updateNavigation();
    }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        prevSlide();
    } else if (e.key === 'ArrowRight') {
        nextSlide();
    } else if (e.key === 'Escape') {
        window.location.href = '../index.html';
    }
});

// Button event listeners
document.getElementById('prevBtn').addEventListener('click', prevSlide);
document.getElementById('nextBtn').addEventListener('click', nextSlide);

// Initialize on page load
init();
