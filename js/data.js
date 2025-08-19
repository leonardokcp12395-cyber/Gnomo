import * as state from './state.js';

export function savePermanentData() {
    localStorage.setItem('playerGems', state.playerGems);
    localStorage.setItem('playerUpgrades', JSON.stringify(state.playerUpgrades));
    localStorage.setItem('playerAchievements', JSON.stringify(state.playerAchievements));
}
