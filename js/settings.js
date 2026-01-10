import { db } from "./firebase-init.js"; 
// REMARQUE : L'importation de 'functions' a été supprimée ici.
// Assurez-vous que votre firebase-init.js n'exporte que 'db' (ou les modules nécessaires).

// --- ELEMENTS ---
const pseudoInput = document.getElementById('pseudoInput');
const savePseudoBtn = document.getElementById('savePseudoBtn'); 
const myUserIdSpan = document.getElementById('myUserId');
const soundToggle = document.getElementById('soundToggle');
const vibrationToggle = document.getElementById('vibrationToggle');
const bonusCodeInput = document.getElementById('bonusCodeInput');
const activateCodeBtn = document.getElementById('activateCodeBtn');
const networkStatus = document.getElementById('networkStatus');
const resetGameBtn = document.getElementById('resetGameBtn');
const creatorLink = document.getElementById('creatorLink');

// --- DÉFAUTS ---
const DEFAULT_CREATOR_LINK = "https://www.instagram.com/poke_deve?igsh=MXFjYWV0OGpjemoxdw=="; 
creatorLink.href = DEFAULT_CREATOR_LINK; 

// --- GESTION DU PSUEDO ET ID ---
let myId = localStorage.getItem("banane_id");
let myPseudo = localStorage.getItem("banane_pseudo") || "Joueur";

function getUserId() {
    return localStorage.getItem("banane_id");
}

// Affichage initial
myUserIdSpan.textContent = myId || "Non défini";
pseudoInput.value = myPseudo;

// Listener pour le bouton "Enregistrer"
savePseudoBtn.addEventListener('click', () => {
    const newPseudo = pseudoInput.value.trim();
    if (newPseudo.length < 3) {
        return alert("Le pseudo doit contenir au moins 3 caractères.");
    }
    localStorage.setItem("banane_pseudo", newPseudo);
    myPseudo = newPseudo;
    alert("Pseudo mis à jour !");
});


// --- GESTION DES TOGGLES (Son et Vibreur) ---
function loadToggleState(id, defaultVal) {
    const state = localStorage.getItem(id);
    return state === null ? defaultVal : (state === 'true');
}

// Initialisation des états
soundToggle.checked = loadToggleState('setting_sound', true);
vibrationToggle.checked = loadToggleState('setting_vibration', true);

// Listeners pour sauvegarder l'état
soundToggle.addEventListener('change', () => {
    localStorage.setItem('setting_sound', soundToggle.checked);
});
vibrationToggle.addEventListener('change', () => {
    localStorage.setItem('setting_vibration', vibrationToggle.checked);
    if (vibrationToggle.checked && navigator.vibrate) {
        navigator.vibrate(50);
    }
});

//connexion google 
// Dans js/settings.js
import { loginWithGoogle, loadUserData } from "./firebase-init.js";

const googleBtn = document.getElementById('googleLoginBtn');

googleBtn.addEventListener('click', async () => {
    const user = await loginWithGoogle(); // 1. Se connecter
    if (user) {
        const hasData = await loadUserData(user.uid); // 2. Charger les données
        
        if (hasData) {
            alert(`Bon retour ${user.displayName} ! Tes bananes et améliorations ont été récupérées.`);
        } else {
            alert(`Bienvenue ${user.displayName} ! Ton compte a été créé.`);
        }
        
        // 3. Rafraîchir pour afficher les nouvelles valeurs
        window.location.href = "index.html"; 
    }
});

// --- DÉFINITION ET GESTION DES CODES BONUS (Côté Client) ---
const AVAILABLE_CODES = [
    { code: "POKEBONUS", reward: 500, message: "Vous gagnez 500 bananes ! 🍌" },
    { code: "WELCOME1000", reward: 1000, message: "Bienvenue ! 1000 bananes ajoutées à votre compte. 🎉" },
    { code: "WELCOME", reward: 1000000, message: "Bienvenue ! 1000000 bananes ajoutées à votre compte. 🎉" }
    
    // Ajoutez tous vos codes marketing ici (en MAJUSCULES)
];

activateCodeBtn.addEventListener('click', () => {
    const code = bonusCodeInput.value.trim().toUpperCase();
    
    if (!code) {
        return alert("Veuillez entrer un code !");
    }

    // 1. Charger la liste des codes déjà utilisés par cet utilisateur
    let usedCodes = JSON.parse(localStorage.getItem('banane_used_codes') || '[]');
    
    // 2. Vérifier si le code est déjà utilisé localement
    if (usedCodes.includes(code)) {
        return alert("Ce code a déjà été utilisé sur ce compte.");
    }

    // 3. Chercher le code dans la liste des codes valides
    const validCode = AVAILABLE_CODES.find(c => c.code === code);

    if (validCode) {
        // Code Valide :
        
        // a) Ajouter la récompense au score local
        let currentBananas = Number(localStorage.getItem("banane_bananas") || 0);
        let newBananas = currentBananas + validCode.reward;
        localStorage.setItem("banane_bananas", newBananas);

        // b) Marquer le code comme utilisé dans le Local Storage
        usedCodes.push(code);
        localStorage.setItem('banane_used_codes', JSON.stringify(usedCodes));
        
        // c) Succès
        alert(`Code '${code}' activé ! ${validCode.message}`);
        // NOTE: Pensez à actualiser l'affichage des bananes sur la page d'accueil si l'utilisateur y revient.

    } else {
        // Code Invalide :
        alert("Code invalide.");
    }

    bonusCodeInput.value = "";
});


// --- STATUT RÉSEAU ---
function checkNetworkStatus() {
    // Vérifie si Firebase (db) est initialisé, sans vérifier 'functions'
    if (db) {
        networkStatus.textContent = "Connecté";
        networkStatus.classList.add('connected');
    } else {
        networkStatus.textContent = "Déconnecté"; 
        networkStatus.classList.remove('connected');
    }
}
checkNetworkStatus();


// --- RÉINITIALISATION DU JEU ---
resetGameBtn.addEventListener('click', () => {
    if (confirm("ATTENTION : Voulez-vous vraiment réinitialiser TOUT le jeu (Score, Bananes, Amis, Inventaire, Pseudo) ? Cette action est irréversible !")) {
        localStorage.clear();
        alert("Jeu réinitialisé. Rechargez la page.");
        window.location.reload();
    }
});
