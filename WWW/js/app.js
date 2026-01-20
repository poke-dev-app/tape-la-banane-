import { db, doc, setDoc, initializePlayerId, saveProgressAfterAction } from "./firebase-init.js";
import { ALL_SKINS, ALL_BOOSTS } from "./game-data.js";

// --- INITIALISATION ADMOB ---
let adMobInitialized = false;

async function initializeAdMob() {
    try {
        // Vérifier si le plugin AdMob est disponible (mobile uniquement)
        if (typeof AdMob !== 'undefined') {
            await AdMob.initialize({
                requestTrackingAuthorization: true,
                initializeForTesting: false, // CHANGEZ À false EN PRODUCTION
            });
            adMobInitialized = true;
            console.log("✅ AdMob initialisé avec succès");
            
            // Précharger la pub interstitielle pour des transitions plus rapides
            prepareInterstitial();
        } else {
            console.warn("⚠️ Plugin AdMob non disponible (mode web/navigateur)");
        }
    } catch (error) {
        console.error("❌ Erreur d'initialisation AdMob:", error);
    }
}

// Fonction pour préparer la pub interstitielle à l'avance
async function prepareInterstitial() {
    if (!adMobInitialized || typeof AdMob === 'undefined') return;
    
    try {
        await AdMob.prepareInterstitial({
            adId: 'ca-app-pub-9867983302890361/8805762482',
            isTesting: true // CHANGEZ À false EN PRODUCTION
        });
        console.log("✅ Pub interstitielle préchargée");
    } catch (error) {
        console.error("❌ Erreur préparation pub:", error);
    }
}

// Fonction pour afficher la pub interstitielle
async function showInterstitialAd() {
    if (!adMobInitialized || typeof AdMob === 'undefined') {
        console.log("ℹ️ AdMob non disponible, skip pub");
        return;
    }
    
    try {
        const result = await AdMob.showInterstitial();
        console.log("✅ Pub interstitielle affichée", result);
        
        // Recharger une nouvelle pub pour la prochaine partie
        setTimeout(prepareInterstitial, 1000);
    } catch (error) {
        console.error("❌ Erreur affichage pub:", error);
        // Même en cas d'erreur, on réessaie de préparer une pub
        setTimeout(prepareInterstitial, 2000);
    }
}

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
const homeBanana = document.getElementById('homeBanana');

// Indicateurs de boosts
const moneyBoostIndicator = document.getElementById('moneyBoostIndicator');
const shieldIndicator = document.getElementById('shieldIndicator');
const shieldLife = document.getElementById('shieldLife');
const shieldName = document.getElementById('shieldName');

// --- VARIABLES DE JEU ---
let currentScore = 0;
let bestScore = 0;
let totalBananasCurrency = 0;
let gameActive = false;
let currentTapTimeMs = START_TAP_TIME_MS;
let bananaTimeout;
let moneyMultiplier = 1;

// --- FONCTIONS DE GESTION DU DOM ---
function showElement(el) { if (el) el.classList.remove('hidden'); }
function hideElement(el) { if (el) el.classList.add('hidden'); }

// --- GESTION DES BOOSTS ACTIFS ---
function updateBoostIndicators() {
    // Vérifier le boost d'argent
    const moneyBoost = JSON.parse(localStorage.getItem('banane_active_money_boost') || "null");
    if (moneyBoost && new Date().getTime() < moneyBoost.expiresAt) {
        moneyMultiplier = 2;
        showElement(moneyBoostIndicator);
    } else {
        moneyMultiplier = 1;
        hideElement(moneyBoostIndicator);
        if (moneyBoost) localStorage.removeItem('banane_active_money_boost');
    }
    
    // Vérifier le bouclier
    const activeShield = JSON.parse(localStorage.getItem('banane_active_shield') || "null");
    if (activeShield && activeShield.life > 0) {
        showElement(shieldIndicator);
        if (shieldLife) shieldLife.textContent = activeShield.life;
        if (shieldName) shieldName.textContent = activeShield.name || 'Bouclier';
    } else {
        hideElement(shieldIndicator);
    }
}

// --- LOGIQUE DE JEU ---
function showBanana() {
    if (!gameActive || !mainBanana) return;

    // Calcul du temps restant (vitesse augmente avec le score)
    let time = Math.max(END_TAP_TIME_MS, START_TAP_TIME_MS - (currentScore * DIFFICULTY_STEP));

    // Position aléatoire sur l'écran (avec marges de sécurité)
    const bananaWidth = 100;
    const bananaHeight = 100;
    const maxX = Math.max(50, window.innerWidth - bananaWidth - 20);
    const maxY = Math.max(100, window.innerHeight - bananaHeight - 150);
    
    const x = Math.random() * maxX;
    const y = 80 + Math.random() * (maxY - 80);

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
            
            // Vibration de feedback
            if (localStorage.getItem('setting_vibration') === 'true' && navigator.vibrate) {
                navigator.vibrate([100, 50, 100]); // Pattern de vibration
            }
            
            if (activeShield.life <= 0) {
                localStorage.removeItem('banane_active_shield');
            } else {
                localStorage.setItem('banane_active_shield', JSON.stringify(activeShield));
            }

            // Mise à jour de l'indicateur
            updateBoostIndicators();
            
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

function handleBananaTap(event) {
    if (!gameActive) return;
    
    // Empêcher le comportement par défaut sur mobile
    if (event) event.preventDefault();

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
    let isCrit = false;
    
    if (Math.random() < critChance) {
        gain = Math.floor(clickPower * critMulti);
        isCrit = true;
    }
    
    // Appliquer le multiplicateur de boost d'argent
    gain = Math.floor(gain * moneyMultiplier);

    currentScore++;
    totalBananasCurrency += gain;

    // Sauvegarde locale temporaire
    localStorage.setItem('banane_bananas', totalBananasCurrency);

    // Vibration si activée (plus intense pour un critique)
    if (localStorage.getItem('setting_vibration') === 'true' && navigator.vibrate) {
        navigator.vibrate(isCrit ? 30 : 15);
    }

    updateGameVisuals();
    mainBanana.style.display = 'none';
    showBanana();
}

function updateGameVisuals() {
    if (scoreDisplay) scoreDisplay.textContent = currentScore;
    if (totalBananasDisplay) {
        totalBananasDisplay.textContent = new Intl.NumberFormat('fr-FR').format(totalBananasCurrency);
    }
}

async function endGame() {
    console.log("🎮 Fin de partie détectée !");
    gameActive = false;
    
    if (bananaTimeout) {
        clearTimeout(bananaTimeout);
        bananaTimeout = null;
    }

    // Mise à jour du meilleur score
    if (currentScore > bestScore) {
        bestScore = currentScore;
        localStorage.setItem("banane_best_score", bestScore);
        if (bestScoreDisplay) bestScoreDisplay.textContent = bestScore;
    }

    // Mise à jour de l'écran de fin
    if (finalScoreDisplay) {
        finalScoreDisplay.textContent = currentScore;
    }

    // Changement d'écran
    hideElement(gameArea);
    showElement(gameOverScreen);

    // Sauvegarde Cloud (asynchrone, ne bloque pas l'affichage)
    saveProgressAfterAction(totalBananasCurrency).catch(err => {
        console.error("Erreur sauvegarde:", err);
    });

    // --- AFFICHAGE PUB INTERSTITIELLE (après un court délai) ---
    setTimeout(() => {
        showInterstitialAd();
    }, 500);
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

    // 3. Mise à jour des indicateurs de boost
    updateBoostIndicators();

    // 4. UI
    updateGameVisuals();
    hideElement(homeScreen);
    hideElement(gameOverScreen);
    showElement(gameArea);
    
    showBanana();
}

function initApp() {
    console.log("🍌 Initialisation de Tape la Banane...");
    
    // Initialisation AdMob
    initializeAdMob();
    
    // Chargement initial des scores
    bestScore = Number(localStorage.getItem("banane_best_score") || 0);
    totalBananasCurrency = Number(localStorage.getItem("banane_bananas") || 0);
    
    if (bestScoreDisplay) bestScoreDisplay.textContent = bestScore;
    if (totalBananasDisplay) {
        totalBananasDisplay.textContent = new Intl.NumberFormat('fr-FR').format(totalBananasCurrency);
    }

    // Appliquer le skin sur l'écran d'accueil
    const activeSkinId = localStorage.getItem('banane_active_skin') || 'default_skin';
    const activeSkin = ALL_SKINS.find(s => s.id === activeSkinId);
    if (activeSkin && homeBanana) {
        homeBanana.src = activeSkin.image;
    }

    // Événements - Support mobile et desktop
    if (mainBanana) {
        // Desktop
        mainBanana.addEventListener('click', handleBananaTap);
        
        // Mobile (évite le double-tap zoom)
        mainBanana.addEventListener('touchstart', handleBananaTap, { passive: false });
    }
    
    if (playButton) playButton.addEventListener('click', startGame);
    if (restartButton) restartButton.addEventListener('click', startGame);
    
    console.log("✅ Initialisation terminée");
}

// Attendre que le DOM soit chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}