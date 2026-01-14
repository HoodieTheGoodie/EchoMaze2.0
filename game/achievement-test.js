// Achievement Testing Automation Script
// Run this in browser console to verify all achievements work

/**
 * USAGE:
 * 1. Open game in browser
 * 2. Open console (F12)
 * 3. Copy/paste this entire script
 * 4. Run: await testAllAchievements()
 */

async function testAllAchievements() {
    console.log('🧪 STARTING ACHIEVEMENT VERIFICATION TEST\n');
    console.log('━'.repeat(60));
    
    const results = {
        passed: [],
        failed: [],
        total: 0
    };
    
    // Enable debug mode
    if (window.ACHIEVEMENT && window.ACHIEVEMENT.enableDebug) {
        window.ACHIEVEMENT.enableDebug();
        console.log('✅ Debug mode enabled\n');
    }
    
    // Clear all achievements first
    if (window.ACHIEVEMENT && window.ACHIEVEMENT.clear) {
        window.ACHIEVEMENT.clear();
        console.log('✅ Cleared all existing achievements\n');
    }
    
    const tests = [
        // LEVEL COMPLETION TESTS
        {
            name: 'Level 1 Complete',
            id: 'level1_clear',
            test: () => window.ACHIEVEMENT.unlock('level1_clear'),
            verify: () => window.ACHIEVEMENT.isUnlocked('level1_clear')
        },
        {
            name: 'Level 5 Complete (+ rookie skin)',
            id: 'level5_clear',
            test: () => window.ACHIEVEMENT.unlock('level5_clear'),
            verify: () => window.ACHIEVEMENT.isUnlocked('level5_clear'),
            checkSkin: 'rookie'
        },
        {
            name: 'Level 10 Complete (+ veteran skin)',
            id: 'level10_clear',
            test: () => window.ACHIEVEMENT.unlock('level10_clear'),
            verify: () => window.ACHIEVEMENT.isUnlocked('level10_clear'),
            checkSkin: 'veteran'
        },
        
        // DEATH TEST
        {
            name: 'First Death',
            id: 'first_death',
            test: () => window.ACHIEVEMENT.unlock('first_death'),
            verify: () => window.ACHIEVEMENT.isUnlocked('first_death')
        },
        
        // ENDING TESTS
        {
            name: 'Good Ending (+ guardian skin)',
            id: 'ending_good',
            test: () => window.ACHIEVEMENT.unlock('ending_good'),
            verify: () => window.ACHIEVEMENT.isUnlocked('ending_good'),
            checkSkin: 'guardian'
        },
        {
            name: 'Bad Ending (+ shadow skin)',
            id: 'ending_bad',
            test: () => window.ACHIEVEMENT.unlock('ending_bad'),
            verify: () => window.ACHIEVEMENT.isUnlocked('ending_bad'),
            checkSkin: 'shadow'
        },
        {
            name: 'Normal Ending',
            id: 'ending_normal',
            test: () => window.ACHIEVEMENT.unlock('ending_normal'),
            verify: () => window.ACHIEVEMENT.isUnlocked('ending_normal')
        },
        {
            name: 'All Endings (auto-unlocks after 3 endings)',
            id: 'all_endings',
            test: () => {}, // Should auto-unlock
            verify: () => window.ACHIEVEMENT.isUnlocked('all_endings'),
            note: 'Auto-unlocks when good, bad, and normal endings are unlocked'
        },
        
        // SPEEDRUN TESTS
        {
            name: 'Speedrun < 60s (+ blitz skin)',
            id: 'speedrun_level_60s',
            test: () => window.ACHIEVEMENT.unlock('speedrun_level_60s'),
            verify: () => window.ACHIEVEMENT.isUnlocked('speedrun_level_60s'),
            checkSkin: 'blitz'
        },
        {
            name: 'Level 3 Speedrun < 30s',
            id: 'speedrun_level3_30s',
            test: () => window.ACHIEVEMENT.unlock('speedrun_level3_30s'),
            verify: () => window.ACHIEVEMENT.isUnlocked('speedrun_level3_30s')
        },
        
        // ENDLESS TESTS
        {
            name: 'Endless Wave 10',
            id: 'endless_wave_10',
            test: () => window.ACHIEVEMENT.unlock('endless_wave_10'),
            verify: () => window.ACHIEVEMENT.isUnlocked('endless_wave_10')
        },
        {
            name: 'Endless Wave 20',
            id: 'endless_wave_20',
            test: () => window.ACHIEVEMENT.unlock('endless_wave_20'),
            verify: () => window.ACHIEVEMENT.isUnlocked('endless_wave_20')
        },
        {
            name: 'Endless Wave 30 (+ infinite skin)',
            id: 'endless_wave_30',
            test: () => window.ACHIEVEMENT.unlock('endless_wave_30'),
            verify: () => window.ACHIEVEMENT.isUnlocked('endless_wave_30'),
            checkSkin: 'infinite'
        },
        
        // SKILL TESTS
        {
            name: 'Generator Perfect x3',
            id: 'generator_perfect_3',
            test: () => window.ACHIEVEMENT.unlock('generator_perfect_3'),
            verify: () => window.ACHIEVEMENT.isUnlocked('generator_perfect_3')
        },
        {
            name: 'Generator Perfect x10 (+ technician skin)',
            id: 'generator_perfect_10',
            test: () => window.ACHIEVEMENT.unlock('generator_perfect_10'),
            verify: () => window.ACHIEVEMENT.isUnlocked('generator_perfect_10'),
            checkSkin: 'technician'
        },
        {
            name: 'Perfect Shield x10 (+ defender skin)',
            id: 'perfect_shield_10',
            test: () => window.ACHIEVEMENT.unlock('perfect_shield_10'),
            verify: () => window.ACHIEVEMENT.isUnlocked('perfect_shield_10'),
            checkSkin: 'defender'
        },
        
        // SECRET TESTS
        {
            name: 'Level 11 Unlock',
            id: 'level11_unlock',
            test: () => window.ACHIEVEMENT.unlock('level11_unlock'),
            verify: () => window.ACHIEVEMENT.isUnlocked('level11_unlock')
        },
        {
            name: 'L11 Power Supply (+ glitch skin)',
            id: 'secret_level11_power',
            test: () => window.ACHIEVEMENT.unlock('secret_level11_power'),
            verify: () => window.ACHIEVEMENT.isUnlocked('secret_level11_power'),
            checkSkin: 'glitch'
        },
        {
            name: 'Secret Code (+ void skin)',
            id: 'secret_code_alpha',
            test: () => window.ACHIEVEMENT.unlock('secret_code_alpha'),
            verify: () => window.ACHIEVEMENT.isUnlocked('secret_code_alpha'),
            checkSkin: 'void'
        },
        
        // PLATINUM TESTS
        {
            name: 'Game Complete (+ engineer skin)',
            id: 'game_complete',
            test: () => window.ACHIEVEMENT.unlock('game_complete'),
            verify: () => window.ACHIEVEMENT.isUnlocked('game_complete'),
            checkSkin: 'engineer'
        },
        {
            name: 'Speedrun < 20min (+ chrono skin)',
            id: 'speedrun_game_20m',
            test: () => window.ACHIEVEMENT.unlock('speedrun_game_20m'),
            verify: () => window.ACHIEVEMENT.isUnlocked('speedrun_game_20m'),
            checkSkin: 'chrono'
        },
        {
            name: 'Deathless Game (+ ghost skin)',
            id: 'deathless_game',
            test: () => window.ACHIEVEMENT.unlock('deathless_game'),
            verify: () => window.ACHIEVEMENT.isUnlocked('deathless_game'),
            checkSkin: 'ghost'
        },
        {
            name: 'Speedrun < 10min (+ time_lord skin)',
            id: 'speedrun_game_10m',
            test: () => window.ACHIEVEMENT.unlock('speedrun_game_10m'),
            verify: () => window.ACHIEVEMENT.isUnlocked('speedrun_game_10m'),
            checkSkin: 'time_lord'
        },
        {
            name: 'Total Deaths 100 (+ phoenix skin)',
            id: 'total_deaths_100',
            test: () => window.ACHIEVEMENT.unlock('total_deaths_100'),
            verify: () => window.ACHIEVEMENT.isUnlocked('total_deaths_100'),
            checkSkin: 'phoenix'
        }
    ];
    
    // Run each test
    for (const test of tests) {
        results.total++;
        console.log(`\n🧪 Testing: ${test.name}`);
        
        try {
            // Run test
            test.test();
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async operations
            
            // Verify achievement unlocked
            const unlocked = test.verify();
            
            if (!unlocked) {
                console.log(`❌ FAILED: ${test.name} - Achievement not unlocked`);
                results.failed.push(test.name);
                continue;
            }
            
            // Check skin if applicable
            if (test.checkSkin) {
                const skinUnlocked = window.SKINS && window.SKINS.isUnlocked 
                    ? window.SKINS.isUnlocked(test.checkSkin)
                    : false;
                    
                if (!skinUnlocked) {
                    console.log(`⚠️  WARNING: ${test.name} - Achievement unlocked but skin "${test.checkSkin}" not unlocked`);
                }
            }
            
            console.log(`✅ PASSED: ${test.name}`);
            if (test.note) console.log(`   📝 Note: ${test.note}`);
            results.passed.push(test.name);
            
        } catch (err) {
            console.log(`❌ ERROR: ${test.name} - ${err.message}`);
            results.failed.push(test.name);
        }
    }
    
    // Print summary
    console.log('\n' + '━'.repeat(60));
    console.log('📊 TEST SUMMARY\n');
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`📈 Success Rate: ${((results.passed.length / results.total) * 100).toFixed(1)}%`);
    
    if (results.failed.length > 0) {
        console.log('\n❌ Failed Tests:');
        results.failed.forEach(name => console.log(`   • ${name}`));
    }
    
    console.log('\n' + '━'.repeat(60));
    
    // Check 100% achievement
    const progress = window.ACHIEVEMENT.progress();
    console.log(`\n📊 Achievement Progress: ${progress.unlocked}/${progress.total} (${progress.percentage}%)`);
    
    return results;
}

// Helper function to test a single achievement
function testAchievement(id) {
    console.log(`🧪 Testing achievement: ${id}`);
    
    const before = window.ACHIEVEMENT.isUnlocked(id);
    console.log(`Before: ${before ? 'Unlocked' : 'Locked'}`);
    
    window.ACHIEVEMENT.unlock(id);
    
    setTimeout(() => {
        const after = window.ACHIEVEMENT.isUnlocked(id);
        console.log(`After: ${after ? 'Unlocked ✅' : 'Still Locked ❌'}`);
        
        if (after && !before) {
            console.log('✅ Achievement unlock successful!');
        } else if (!after) {
            console.log('❌ Achievement failed to unlock!');
        } else {
            console.log('⚠️  Achievement was already unlocked');
        }
    }, 200);
}

// Export functions to window
window.testAllAchievements = testAllAchievements;
window.testAchievement = testAchievement;

console.log('✅ Achievement testing script loaded!');
console.log('📝 Run: await testAllAchievements()');
console.log('📝 Or test one: testAchievement("level1_clear")');
