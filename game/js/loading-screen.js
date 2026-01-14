/**
 * Loading Screen Manager
 * Displays smooth loading transitions between levels and game states
 */

export function showLoadingScreen(message = 'Loading...', subtext = 'Preparing level') {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingText = document.getElementById('loadingText');
    const loadingSubtext = document.getElementById('loadingSubtext');
    
    if (!loadingScreen) return;
    
    if (loadingText) loadingText.textContent = message;
    if (loadingSubtext) loadingSubtext.textContent = subtext;
    
    loadingScreen.style.display = 'flex';
    loadingScreen.style.opacity = '0';
    
    // Fade in
    requestAnimationFrame(() => {
        loadingScreen.style.transition = 'opacity 0.3s ease';
        loadingScreen.style.opacity = '1';
    });
}

export function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) return;
    
    // Fade out
    loadingScreen.style.transition = 'opacity 0.3s ease';
    loadingScreen.style.opacity = '0';
    
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 300);
}

export function updateLoadingProgress(message, subtext) {
    const loadingText = document.getElementById('loadingText');
    const loadingSubtext = document.getElementById('loadingSubtext');
    
    if (loadingText && message) loadingText.textContent = message;
    if (loadingSubtext && subtext) loadingSubtext.textContent = subtext;
}

// Auto-show loading on level start
if (typeof window !== 'undefined') {
    window.LOADING = {
        show: showLoadingScreen,
        hide: hideLoadingScreen,
        update: updateLoadingProgress
    };
}
