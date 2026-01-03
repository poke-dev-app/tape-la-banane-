// Fichier : js/friends.js (VERSION COMPLÈTE & CORRIGÉE pour la création de profil)

import { db, doc, getDoc, setDoc, initializePlayerId } from "./firebase-init.js";

// --- ÉLÉMENTS DU DOM ---
const setupArea = document.getElementById("setupArea");
const myCodeArea = document.getElementById("myCodeArea");
const pseudoInput = document.getElementById("myPseudoInput");
const saveBtn = document.getElementById("saveProfileBtn");
const displayPseudoSpan = document.getElementById("displayPseudo");
const myCodeInput = document.getElementById("myCode");

const friendsList = document.getElementById("friendsList");
const toggleAddBtn = document.getElementById("toggleAddBtn");
const addFriendArea = document.getElementById("addFriendArea");
const friendCodeInput = document.getElementById("friendCodeInput");
const confirmAddBtn = document.getElementById("confirmAddBtn");

// --- VARIABLES GLOBALES (Initialisées dans initFriends) ---
let myId;
let myShortCode;

// --- GESTION PROFIL ET ID DU JOUEUR ---

// Génère un code court de 8 caractères préfixé par 'BAN-'
function generateShortCode() {
    return "BAN-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Tente de sauvegarder le pseudo et la liaison code court/ID long sur Firebase.
 */
async function saveProfile() {
    const pseudo = pseudoInput.value.trim();
    if (pseudo.length < 3) {
        alert("Veuillez choisir un pseudo de 3 caractères minimum.");
        return;
    }

    // Récupération des IDs critiques (plus robuste)
    const currentMyId = localStorage.getItem("banane_id");
    const currentShortCode = localStorage.getItem("banane_short_code");
    
    if (!currentMyId || !currentShortCode || !db) {
        console.error("CRITICAL: Missing user ID or Short Code during saveProfile.");
        alert("Erreur critique: L'ID du joueur n'a pas été initialisé. Veuillez recharger la page.");
        return;
    }

    // Sauvegarde du pseudo en local
    localStorage.setItem("banane_pseudo", pseudo);
    
    // 1. Sauvegarde sur Firebase (Players Collection)
    const playerRef = doc(db, "players", currentMyId);
    try {
        await setDoc(playerRef, {
            name: pseudo,
            shortCode: currentShortCode, // Ajout de l'ID court
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // 2. Sauvegarde de la liaison dans une collection dédiée (codes) pour la recherche
        const codeRef = doc(db, "codes", currentShortCode);
        await setDoc(codeRef, { 
            userId: currentMyId 
        }); 

        alert("Profil enregistré ! Ton code ami est maintenant actif.");
        showMyCode(pseudo);
    } catch (error) {
        console.error("Erreur lors de la sauvegarde du profil:", error);
        alert("Erreur: Impossible d'enregistrer le profil. Veuillez vérifier votre connexion.");
    }
}

// Afficher mon code et masquer la zone de setup
function showMyCode(pseudo) {
    if(!pseudo) return; 
    
    setupArea.classList.add("hidden");
    myCodeArea.classList.remove("hidden");
    
    displayPseudoSpan.textContent = pseudo;
    myCodeInput.value = myShortCode;
}


// --- GESTION DE L'AJOUT D'AMI ---

async function addFriend(friendCode) {
    if (!friendCode || friendCode.length !== 12 || !friendCode.startsWith('BAN-')) {
        alert("Format de code ami invalide (doit être BAN-XXXXXXX).");
        return;
    }

    const codeRef = doc(db, "codes", friendCode);
    
    try {
        const docSnap = await getDoc(codeRef);
        
        if (docSnap.exists()) {
            const friendId = docSnap.data().userId;
            
            if (friendId === myId) {
                alert("Tu ne peux pas t'ajouter toi-même !");
                return;
            }

            let currentFriends = JSON.parse(localStorage.getItem("banane_friends_ids") || "[]");
            if (currentFriends.includes(friendId)) {
                alert("Cet ami est déjà dans ta liste.");
                return;
            }
            
            // Ajout
            currentFriends.push(friendId);
            localStorage.setItem("banane_friends_ids", JSON.stringify(currentFriends));
            
            alert("Ami ajouté avec succès !");
            friendCodeInput.value = '';
            renderFriendsList();

        } else {
            alert("Ce code ami n'existe pas ou n'est pas actif.");
        }
    } catch (error) {
        console.error("Erreur lors de la recherche du code ami:", error);
        alert("Erreur de connexion lors de l'ajout d'ami. Veuillez vérifier votre connexion ou réessayez.");
    }
}


// --- AFFICHER LA LISTE (Récupère les données fraiches du cloud) ---

function getFriendIds() {
    return JSON.parse(localStorage.getItem("banane_friends_ids") || "[]");
}

function removeFriend(friendIdToRemove) {
    if (confirm("Voulez-vous vraiment supprimer cet ami de votre liste ?")) {
        let currentFriends = getFriendIds();
        const newFriends = currentFriends.filter(id => id !== friendIdToRemove);
        localStorage.setItem("banane_friends_ids", JSON.stringify(newFriends));
        renderFriendsList();
    }
}


async function renderFriendsList() {
    friendsList.innerHTML = "<div style='padding:20px; text-align:center'>Chargement des amis...</div>";

    const myFriends = getFriendIds();
    const friendsData = [];

    // NOUVEAU : Créer un tableau de Promesses pour toutes les requêtes d'amis
    const friendPromises = myFriends.map(friendId => getDoc(doc(db, "players", friendId)));
    
    // NOUVEAU : Attendre que TOUTES les Promesses soient résolues en parallèle
    const friendSnaps = await Promise.all(friendPromises);

    friendSnaps.forEach(friendSnap => {
        if (friendSnap.exists()) {
            const data = friendSnap.data();
            friendsData.push({ 
                name: data.name || 'Pseudo non défini', // Sécurité
                score: data.score || 0, 
                id: friendSnap.id 
            }); 
        }
    });

    // Tri par score (le meilleur d'abord)
    friendsData.sort((a, b) => b.score - a.score);

    renderList(friendsData, friendsList);
}


function renderFriendItem(data, isMe, canRemove) {
    const div = document.createElement("div");
    // Utilise la classe rank-item pour le style
    div.className = `rank-item ${isMe ? 'is-me' : ''}`; 

    div.innerHTML = `
        <div class="rank-name">${data.name} ${isMe ? '(Toi)' : ''}</div>
        <div class="rank-score">${new Intl.NumberFormat('fr-FR').format(data.score || 0)}</div>
        <div class="friend-actions">
            ${canRemove ? `<button class="btn ghost small-btn remove-btn" data-id="${data.id}">❌</button>` : ''}
        </div>
    `;
    
    friendsList.appendChild(div);

    if (canRemove) {
        div.querySelector('.remove-btn').addEventListener('click', (e) => {
            const friendId = e.currentTarget.getAttribute('data-id');
            removeFriend(friendId);
        });
    }
}


// --- INITIALISATION ---

async function initFriends() {
    // 1. Initialisation de l'ID Utilisateur (CRITIQUE)
    await initializePlayerId(); // Assure que l'ID est généré/récupéré dans localStorage
    myId = localStorage.getItem("banane_id");

    // 2. Initialisation du Code Court
    myShortCode = localStorage.getItem("banane_short_code");
    if (!myShortCode) {
        myShortCode = generateShortCode();
        localStorage.setItem("banane_short_code", myShortCode);
    }

    // 3. Gestion de l'affichage initial (Setup ou Code)
    const pseudo = localStorage.getItem("banane_pseudo");

    if (pseudo) {
        showMyCode(pseudo);
        // Si le profil existe déjà, on s'assure que la liaison est sur Firebase (sécurité)
        if (db && myId && myShortCode) {
             await setDoc(doc(db, "codes", myShortCode), { userId: myId }, { merge: true });
        }
    } else {
        myCodeArea.classList.add("hidden");
        setupArea.classList.remove("hidden");
    }
    
    // 4. Événements
    saveBtn.addEventListener('click', saveProfile);
    toggleAddBtn.addEventListener('click', () => {
        addFriendArea.classList.toggle('hidden');
    });
    confirmAddBtn.addEventListener('click', () => {
        addFriend(friendCodeInput.value.trim().toUpperCase());
    });
    
    // 5. Rendu de la liste
    renderFriendsList();
}

document.addEventListener('DOMContentLoaded', initFriends);