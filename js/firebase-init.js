// Fichier : js/firebase-init.js

// 1. Un SEUL import pour tout Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// 2. Ta configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBLpno3mrTvNjMUSIt7tglLFUlzggZQCVg",
  authDomain: "tapelabanane.firebaseapp.com",
  projectId: "tapelabanane",
  storageBucket: "tapelabanane.firebasestorage.app",
  messagingSenderId: "127439707534",
  appId: "1:127439707534:web:fa537502ac7d6fede898df",
  measurementId: "G-SXBPVCLHMR"
};

// 3. Initialisation unique
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 4. Fonction d'initialisation de l'ID (Local)
export function initializePlayerId() {
    let userId = localStorage.getItem("banane_id");
    if (!userId) {
        userId = 'user-' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("banane_id", userId);
        localStorage.setItem("banane_pseudo", "Joueur");
    }
    return userId;
}

// 5. Fonction de connexion Google
export async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // On force l'enregistrement du nom exact de Google
        localStorage.setItem("banane_id", user.uid);
        localStorage.setItem("banane_pseudo", user.displayName); // Vérifie que ce n'est pas vide
        
        // On lance une sauvegarde immédiate pour mettre à jour le classement
        const currentBananas = localStorage.getItem('banane_bananas') || 0;
        await saveProgressAfterAction(currentBananas);
        
        return user;
    } catch (error) {
        console.error("Erreur de connexion Google:", error);
    }
}

// Dans js/firebase-init.js

// Dans js/firebase-init.js
export async function saveProgressAfterAction(bananas) {
    const userId = localStorage.getItem("banane_id");
    // On récupère le nom depuis le localStorage ou on met "Joueur" par défaut
    const pseudo = localStorage.getItem("banane_pseudo") || "Joueur";
    const bestScore = localStorage.getItem("banane_best_score") || 0;
    
    if (!userId) return;
    
    const playerRef = doc(db, "players", userId);
    const dataToSave = {
        bananas: Number(bananas),
        score: Number(bestScore),
        username: pseudo, // <--- C'EST CETTE LIGNE QUI VA CRÉER LE CHAMP DANS FIREBASE
        inventory: localStorage.getItem('banane_inventory')
    };
    
    await setDoc(playerRef, dataToSave, { merge: true });
    console.log("Nom envoyé à Firebase :", pseudo);
}

// Dans js/firebase-init.js

export async function loadUserData(userId) {
    try {
        const docRef = doc(db, "players", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // On écrase le localStorage avec les données du Cloud
            localStorage.setItem('banane_bananas', data.bananas || 0);
            localStorage.setItem('banane_click_power', data.click_power || 1);
            localStorage.setItem('banane_crit_chance', data.crit_chance || 0);
            localStorage.setItem('banane_crit_multi', data.crit_multi || 2);
            localStorage.setItem('banane_inventory', JSON.stringify(data.inventory || {}));
            
            console.log("Données récupérées du Cloud !");
            return true;
        } else {
            console.log("Nouveau joueur, aucune donnée sur le Cloud.");
            return false;
        }
    } catch (e) {
        console.error("Erreur de récupération :", e);
        return false;
    }
}
// 6. Exports des outils Firestore pour les autres fichiers
export { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs };
