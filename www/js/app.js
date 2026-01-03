import { db, doc, setDoc, initializePlayerId } from "./firebase-init.js";
import { ALL_SKINS, ALL_BOOSTS } from "./game-data.js";

// --- CONSTANTES ET PARAMÈTRES DU JEU ---
const START_TAP_TIME_MS = 1200;  
const END_TAP_TIME_MS = 400;     
const DIFFICULTY_STEP = 8;       

// --- ÉLÉMENTS DU DOM ---
const mainBanana = document.getElementById('mainBanana');
const scoreDisplay = document.getElementById('scoreDisplay'); 
const bestScoreDisplay = document.getElementById('bestScoreDisplay'); 
const totalBananasDisplay = document.getElementById('totalBananasDisplay'); 
const playButton = document.getElementById('playBtn'); 
const homeScreen = document.getElementById('homeScreen'); 
const gameArea = document.getElementById('gameArea'); 
const gameOverScreen = document.getElementById('gameOverScreen'); 
const finalScoreDisplay = document.getElementById('finalScoreDisplay'); 
const restartButton = document.getElementById('restartButton'); 

// --- VARIABLES DE JEU ---
let currentScore = 0;
let bestScore = 0;
let totalBananasCurrency = 0;
let gameActive = false;
let currentTapTimeMs = START_TAP_TIME_MS;
let bananaTimeout; // <--- CORRECTION : Variable déclarée ici pour éviter l'erreur

// --- FONCTIONS DE GESTION DU DOM ---
function showElement(el) { if (el) el.classList.remove('hidden'); }
function hideElement(el) { if (el) el.classList.add('hidden'); }

// --- LOGIQUE DE JEU ---

function showBanana() {
    if (!gameActive || !mainBanana) return;

    // Calcul du temps restant (vitesse augmente avec le score)
    let time = Math.max(END_TAP_TIME_MS, START_TAP_TIME_MS - (currentScore * DIFFICULTY_STEP));

    // Position aléatoire sur l'écran
    const x = Math.random() * (window.innerWidth - 100);
    const y = Math.random() * (window.innerHeight - 250) + 50;

    mainBanana.style.left = `${x}px`;
    mainBanana.style.top = `${y}px`;
    mainBanana.style.display = 'block';

    // Lancement du chronomètre
    bananaTimeout = setTimeout(hideBanana, time);
}

function hideBanana() {
    // On nettoie le timer actuel
    if (bananaTimeout) {
        clearTimeout(bananaTimeout);
        bananaTimeout = null;
    }

    if (gameActive) {
        // --- VÉRIFICATION DU BOUCLIER ---
        const activeShield = JSON.parse(localStorage.getItem('banane_active_shield') || "null");

        if (activeShield && activeShield.life > 0) {
            // Le bouclier sauve le joueur
            activeShield.life -= 1;
            alert(`🛡️ Bouclier utilisé ! Vies restantes : ${activeShield.life}`);

            if (activeShield.life <= 0) {
                localStorage.removeItem('banane_active_shield');
            } else {
                localStorage.setItem('banane_active_shield', JSON.stringify(activeShield));
            }

            // On continue la partie
            mainBanana.style.display = 'none';
            showBanana();
            return;
        }

        // Si pas de bouclier, fin de partie
        endGame();
    }

    if (mainBanana) mainBanana.style.display = 'none';
}

function handleBananaTap() {
    if (!gameActive) return;

    // Arrêter le timer car on a cliqué à temps
    if (bananaTimeout) {
        clearTimeout(bananaTimeout);
        bananaTimeout = null;
    }

    // Récupération des stats d'amélioration
    const clickPower = parseInt(localStorage.getItem('banane_click_power') || "1");
    const critChance = parseFloat(localStorage.getItem('banane_crit_chance') || "0");
    const critMulti = parseFloat(localStorage.getItem('banane_crit_multi') || "2");

    // Calcul du gain (avec chance de critique)
    let gain = clickPower;
    if (Math.random() < critChance) {
        gain = Math.floor(clickPower * critMulti);
    }

    currentScore++;
    totalBananasCurrency += gain;

    // Sauvegarde locale temporaire
    localStorage.setItem('banane_bananas', totalBananasCurrency);

    updateGameVisuals();
    mainBanana.style.display = 'none';
    showBanana();
}

function updateGameVisuals() {
    if (scoreDisplay) scoreDisplay.textContent = currentScore;
    if (totalBananasDisplay) totalBananasDisplay.textContent = new Intl.NumberFormat('fr-FR').format(totalBananasCurrency);
}

async function endGame() {
    console.log("Fin de partie détectée !"); // Pour vérifier si ça se lance
    gameActive = false;
    
    if (bananaTimeout) {
        clearTimeout(bananaTimeout);
        bananaTimeout = null;
    }

    // 1. Mise à jour du score final sur l'écran de fin
    if (finalScoreDisplay) {
        finalScoreDisplay.textContent = currentScore;
    }

    // 2. Gestion du meilleur score
    if (currentScore > bestScore) {
        bestScore = currentScore;
        localStorage.setItem("banane_best_score", bestScore);
        if (bestScoreDisplay) bestScoreDisplay.textContent = bestScore;
    }

    // 3. Sauvegarde Cloud
    const userId = localStorage.getItem("banane_id");
    if (userId) {
        try {
            const playerRef = doc(db, "players", userId);
            await setDoc(playerRef, { 
                score: bestScore, 
                bananas: totalBananasCurrency 
            }, { merge: true });
        } catch (e) {
            console.error("Erreur sauvegarde fin de partie :", e);
        }
    }

    // 4. CHANGEMENT D'ÉCRAN
    hideElement(gameArea);      // Cache la zone de jeu
    showElement(gameOverScreen); // Affiche l'écran Game Over
    console.log("Écran Game Over affiché.");
}

function startGame() {
    // 1. Appliquer le skin équipé
    const activeSkinId = localStorage.getItem('banane_active_skin') || 'default_skin';
    const activeSkin = ALL_SKINS.find(s => s.id === activeSkinId);
    if (activeSkin && mainBanana) {
        mainBanana.src = activeSkin.image;
    }

    // 2. Init variables
    initializePlayerId();
    currentScore = 0;
    gameActive = true;
    totalBananasCurrency = Number(localStorage.getItem("banane_bananas") || 0);
    bestScore = Number(localStorage.getItem("banane_best_score") || 0);

    // 3. UI
    updateGameVisuals();
    hideElement(homeScreen);
    hideElement(gameOverScreen);
    showElement(gameArea);
    
    showBanana();
}

function initApp() {
    // Chargement initial des scores
    bestScore = Number(localStorage.getItem("banane_best_score") || 0);
    totalBananasCurrency = Number(localStorage.getItem("banane_bananas") || 0);
    
    if (bestScoreDisplay) bestScoreDisplay.textContent = bestScore;
    if (totalBananasDisplay) totalBananasDisplay.textContent = new Intl.NumberFormat('fr-FR').format(totalBananasCurrency);

    // Événements
    if (mainBanana) {
        mainBanana.addEventListener('click', handleBananaTap);
    }
    if (playButton) playButton.addEventListener('click', startGame);
    if (restartButton) restartButton.addEventListener('click', startGame);
}

document.addEventListener('DOMContentLoaded', initApp);