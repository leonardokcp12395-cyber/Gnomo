import { ACHIEVEMENT_DATABASE } from './database.js';
import * as state from './state.js';
import { showTemporaryMessage } from './utils.js';
import { savePermanentData } from './data.js';

export function unlockAchievement(id) {
    if (state.playerAchievements.unlocked[id]) return;

    state.playerAchievements.unlocked[id] = true;
    const achievement = ACHIEVEMENT_DATABASE[id];

    if (achievement.reward) {
        if (achievement.reward.type === 'gems') {
            state.setPlayerGems(state.playerGems + achievement.reward.amount);
        }
    }

    savePermanentData();

    showTemporaryMessage(`Conquista: ${achievement.name}`, 'gold');
}

export function checkAchievements(eventType, value = 0) {
    for (const id in ACHIEVEMENT_DATABASE) {
        if (!state.playerAchievements.unlocked[id]) {
            const achievement = ACHIEVEMENT_DATABASE[id];
            if (achievement.condition.type === eventType) {
                let conditionMet = false;
                if (eventType === 'totalKills' && state.playerAchievements.stats.totalKills >= achievement.condition.value) {
                    conditionMet = true;
                } else if (eventType === 'survivalTime' && value >= achievement.condition.value) {
                    conditionMet = true;
                }

                if (conditionMet) {
                    unlockAchievement(id);
                }
            }
        }
    }
}
