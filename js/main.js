import { setGameState } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing game...");
    setGameState('menu');
    console.log("Game state set to menu.");
});
