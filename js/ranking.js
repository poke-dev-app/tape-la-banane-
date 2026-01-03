import { 
    db, doc, getDoc, collection, query, orderBy, limit, getDocs 
} from "./firebase-init.js";

const rankingList = document.getElementById("rankingList");
const friendsTab = document.getElementById("friendsTab");
const globalTab = document.getElementById("globalTab");

let myId = localStorage.getItem("banane_id");

async function getGlobalRanking() {
    rankingList.innerHTML = "<div style='text-align:center'>Chargement des records...</div>";
    try {
        // ON TRIE PAR SCORE (Le record de clics)
        const q = query(collection(db, "players"), orderBy("score", "desc"), limit(50));
        const querySnapshot = await getDocs(q);
        
        let players = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            players.push({ 
                name: data.username || data.pseudo || "Anonyme", 
                score: data.score || 0,
                id: doc.id 
            });
        });
        return players;
    } catch (error) {
        console.error("Erreur classement mondial:", error);
        return [];
    }
}

async function getFriendsRanking() {
    const friendIds = JSON.parse(localStorage.getItem("banane_friends_ids") || "[]");
    const friendPromises = friendIds.map(id => getDoc(doc(db, "players", id)));
    const friendSnaps = await Promise.all(friendPromises);

    let playersData = [];
    friendSnaps.forEach(snap => {
        if (snap.exists()) {
            const data = snap.data();
            playersData.push({ 
                name: data.username || data.pseudo || "Anonyme", 
                score: data.score || 0, 
                id: snap.id 
            });
        }
    });
    
    // Ajout de ton propre record local
    const myPseudo = localStorage.getItem("banane_pseudo") || "Toi";
    const myBest = Number(localStorage.getItem("banane_best_score") || 0);
    playersData.push({ name: myPseudo, score: myBest, id: myId });

    return playersData.sort((a, b) => b.score - a.score);
}

function renderRanking(players) {
    rankingList.innerHTML = "";
    players.forEach((player, index) => {
        const div = document.createElement("div");
        div.className = `rank-item ${player.id === myId ? 'is-me' : ''}`;
        let rankIcon = index + 1;
        if (index === 0) rankIcon = "🥇";
        else if (index === 1) rankIcon = "🥈";
        else if (index === 2) rankIcon = "🥉";

        div.innerHTML = `
            <div class="rank-pos">${rankIcon}</div>
            <div class="rank-name">${player.name}</div>
            <div class="rank-score">${player.score} pts</div>
        `;
        rankingList.appendChild(div);
    });
}

async function loadRanking(view) {
    friendsTab.classList.toggle('active', view === 'friends');
    globalTab.classList.toggle('active', view === 'global');
    const players = (view === 'friends') ? await getFriendsRanking() : await getGlobalRanking();
    renderRanking(players);
}

document.addEventListener('DOMContentLoaded', () => {
    friendsTab.addEventListener('click', () => loadRanking('friends'));
    globalTab.addEventListener('click', () => loadRanking('global'));
    loadRanking('friends');
});
