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

// --- VARIABLES GLOBALES ---
let myId;
let myShortCode;

// --- GESTION PROFIL ET ID DU JOUEUR ---
function generateShortCode() {
    return "BAN-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function saveProfile() {
    const pseudo = pseudoInput.value.trim();
    if (pseudo.length < 3) {
        alert("Veuillez choisir un pseudo de 3 caractères minimum.");
        return;
    }

    const currentMyId = localStorage.getItem("banane_id");
    const currentShortCode = localStorage.getItem("banane_short_code");
    
    if (!currentMyId || !currentShortCode || !db) {
        console.error("CRITICAL: Missing user ID or Short Code during saveProfile.");
        alert("Erreur critique: L'ID du joueur n'a pas été initialisé. Veuillez recharger la page.");
        return;
    }

    localStorage.setItem("banane_pseudo", pseudo);
    
    const playerRef = doc(db, "players", currentMyId);
    try {
        await setDoc(playerRef, {
            username: pseudo,
            shortCode: currentShortCode,
            updatedAt: new Date().toISOString()
        }, { merge: true });

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

function showMyCode(pseudo) {
    if (!pseudo) return; 
    
    setupArea.classList.add("hidden");
    myCodeArea.classList.remove("hidden");
    
    displayPseudoSpan.textContent = pseudo;
    myCodeInput.value = myShortCode;
}

// --- GESTION DE L'AJOUT D'AMI ---
async function addFriend(friendCode) {
    if (!friendCode || friendCode.length < 8 || !friendCode.startsWith('BAN-')) {
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
            
            currentFriends.push(friendId);
            localStorage.setItem("banane_friends_ids", JSON.stringify(currentFriends));
            
            alert("Ami ajouté avec succès !");
            friendCodeInput.value = '';
            addFriendArea.classList.add('hidden');
            renderFriendsList();

        } else {
            alert("Ce code ami n'existe pas ou n'est pas actif.");
        }
    } catch (error) {
        console.error("Erreur lors de la recherche du code ami:", error);
        alert("Erreur de connexion lors de l'ajout d'ami.");
    }
}

// --- AFFICHER LA LISTE ---
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
    
    if (myFriends.length === 0) {
        friendsList.innerHTML = "<div style='padding:20px; text-align:center; color:#777;'>Aucun ami ajouté pour le moment.</div>";
        return;
    }

    const friendPromises = myFriends.map(friendId => getDoc(doc(db, "players", friendId)));
    const friendSnaps = await Promise.all(friendPromises);

    friendsList.innerHTML = "";
    
    friendSnaps.forEach((friendSnap, index) => {
        if (friendSnap.exists()) {
            const data = friendSnap.data();
            const friendId = myFriends[index];
            
            const div = document.createElement("div");
            div.className = "rank-item";

            div.innerHTML = `
                <div class="rank-name">${data.username || data.name || 'Pseudo non défini'}</div>
                <div class="rank-score">${new Intl.NumberFormat('fr-FR').format(data.score || 0)}</div>
                <div class="friend-actions">
                    <button class="btn ghost small-btn remove-btn" data-id="${friendId}">❌</button>
                </div>
            `;
            
            friendsList.appendChild(div);

            div.querySelector('.remove-btn').addEventListener('click', (e) => {
                const friendId = e.currentTarget.getAttribute('data-id');
                removeFriend(friendId);
            });
        }
    });
}

// --- INITIALISATION ---
async function initFriends() {
    await initializePlayerId();
    myId = localStorage.getItem("banane_id");

    myShortCode = localStorage.getItem("banane_short_code");
    if (!myShortCode) {
        myShortCode = generateShortCode();
        localStorage.setItem("banane_short_code", myShortCode);
    }

    const pseudo = localStorage.getItem("banane_pseudo");

    if (pseudo) {
        showMyCode(pseudo);
        if (db && myId && myShortCode) {
            await setDoc(doc(db, "codes", myShortCode), { userId: myId }, { merge: true });
        }
    } else {
        myCodeArea.classList.add("hidden");
        setupArea.classList.remove("hidden");
    }
    
    saveBtn.addEventListener('click', saveProfile);
    toggleAddBtn.addEventListener('click', () => {
        addFriendArea.classList.toggle('hidden');
    });
    confirmAddBtn.addEventListener('click', () => {
        addFriend(friendCodeInput.value.trim().toUpperCase());
    });
    
    renderFriendsList();
}

document.addEventListener('DOMContentLoaded', initFriends);