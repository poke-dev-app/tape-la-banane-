import { saveProgressAfterAction, initializePlayerId } from "./firebase-init.js";
import { ALL_SKINS, ALL_BOOSTS, CLICK_UPGRADES, CRIT_CHANCE_UPGRADES, CRIT_MULTI_UPGRADES } from "./game-data.js";

const SKINS_GRID = document.getElementById('skinsGrid');
const BOOSTS_GRID = document.getElementById('boostsGrid');
const UPGRADES_GRID = document.getElementById('upgrades-container');
const CURRENT_BANANAS_SPAN = document.getElementById('currentBananas');

let isSpinning = false;
let currentRotation = 0;

// --- 1. INITIALISATION & UI ---
function updateBananaBalance() {
    const bananas = localStorage.getItem('banane_bananas') || 0;
    if (CURRENT_BANANAS_SPAN) CURRENT_BANANAS_SPAN.textContent = new Intl.NumberFormat('fr-FR').format(bananas);
    
    // Mise à jour de l'afficheur du header s'il existe
    const totalDisplay = document.getElementById('totalBananasDisplay');
    if (totalDisplay) totalDisplay.textContent = new Intl.NumberFormat('fr-FR').format(bananas);
    
    return Number(bananas);
}

// --- 2. AFFICHAGE DES SKINS ET BOOSTS ---
function renderItemGrid(items, targetElement) {
    if (!targetElement) return;
    targetElement.innerHTML = '';
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = `shop-item rarity-${item.rarity || 'common'}`;
        
        div.innerHTML = `
            <span class="rarity-badge rarity-${item.rarity}">${item.rarity}</span>
            <img src="${item.image}" alt="${item.name}">
            <div class="item-details">
                <strong>${item.name}</strong>
                <button class="btn small-btn">${item.cost.toLocaleString()} 🍌</button>
            </div>
        `;
        // On attache l'événement de clic au bouton d'achat
        div.querySelector('button').addEventListener('click', () => handleBuyItem(item));
        targetElement.appendChild(div);
    });
}

// --- 3. AFFICHAGE DES AMÉLIORATIONS ---
function renderUpgrades() {
    if (!UPGRADES_GRID) return;
    UPGRADES_GRID.innerHTML = '';

    const statsGrid = document.createElement('div');
    statsGrid.className = 'items-grid'; 
    statsGrid.style.display = 'grid';
    statsGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    statsGrid.style.gap = '10px';

    // 1. Prochain Clic
    const currentPower = parseInt(localStorage.getItem('banane_click_power') || "1");
    const nextClick = CLICK_UPGRADES.find(up => up.power > currentPower);
    statsGrid.appendChild(createUpgradeCard(nextClick, 'click', '🥊'));

    // 2. Prochaine Chance Crit
    const currentCrit = parseFloat(localStorage.getItem('banane_crit_chance') || "0");
    const nextCrit = CRIT_CHANCE_UPGRADES.find(up => up.chance > currentCrit);
    statsGrid.appendChild(createUpgradeCard(nextCrit, 'crit', '🍀'));

    // 3. Prochain Multiplicateur
    const currentMulti = parseFloat(localStorage.getItem('banane_crit_multi') || "2");
    const nextMulti = CRIT_MULTI_UPGRADES.find(up => up.multi > currentMulti);
    statsGrid.appendChild(createUpgradeCard(nextMulti, 'multi', '🔥'));

    UPGRADES_GRID.appendChild(statsGrid);
}

function createUpgradeCard(upgrade, type, icon) {
    const div = document.createElement('div');
    div.className = 'shop-item';
    
    if (!upgrade) {
        div.innerHTML = `<div class="item-details" style="opacity: 0.5;"><strong>MAX</strong></div>`;
        return div;
    }

    let desc = type === 'click' ? `+${upgrade.power} /clic` : 
               type === 'crit' ? `+${upgrade.chance * 100}% Crit` : `x${upgrade.multi} Multi`;

    div.innerHTML = `
        <div class="item-details">
            <div style="font-size: 1.5rem;">${icon}</div>
            <strong>${upgrade.name}</strong>
            <p>${desc}</p>
            <button class="btn small-btn" onclick="buySpecialUpgrade('${type}', '${upgrade.id}')">
                ${upgrade.cost.toLocaleString()} 🍌
            </button>
        </div>
    `;
    return div;
}

// --- 4. LOGIQUE D'ACHAT (Skins & Boosts) ---
async function handleBuyItem(item) {
    let bananas = updateBananaBalance();
    if (bananas >= item.cost) {
        let inventory = JSON.parse(localStorage.getItem('banane_inventory') || "{}");
        
        if (item.type === 'skin') {
            if (inventory[item.id]) return alert("Déjà possédé !");
            inventory[item.id] = { bought: true, type: 'skin' };
        } else {
            // Pour les boucliers et boosts : on augmente la quantité
            if (!inventory[item.id]) inventory[item.id] = { quantity: 1, type: item.type };
            else inventory[item.id].quantity += 1;
        }

        bananas -= item.cost;
        localStorage.setItem('banane_bananas', bananas);
        localStorage.setItem('banane_inventory', JSON.stringify(inventory));
        
        await saveProgressAfterAction(bananas);
        alert(`✅ Achat réussi : ${item.name}`);
        updateBananaBalance();
    } else {
        alert("❌ Pas assez de bananes !");
    }
}

// --- 5. LOGIQUE DE LA ROUE ---
// --- LOGIQUE DE LA ROUE (FONCTION COMPLÈTE) ---
window.playWheel = async (count = 1) => {
    if (isSpinning) return;

    const cost = 1000 * count;
    let bananas = updateBananaBalance();

    if (bananas < cost) {
        alert("❌ Pas assez de bananes !");
        return;
    }

    isSpinning = true;
    const visualWheel = document.getElementById('visualWheel');
    if (visualWheel) visualWheel.classList.add('is-spinning');

    // Calcul de la rotation : 3 tours complets + angle aléatoire
    const extraDegree = Math.floor(Math.random() * 360);
    currentRotation += (360 * 3) + extraDegree;
    
    if (visualWheel) {
        visualWheel.style.transform = `rotate(${currentRotation}deg)`;
    }

    // Attendre la fin de l'animation (3 secondes)
    setTimeout(async () => {
        // 1. Déduction du prix
        bananas -= cost;
        localStorage.setItem('banane_bananas', bananas);
        
        // 2. Détermination de la récompense
         const rand = Math.random() * 100;

    let gain = 0;

    let title = "";



    // Probabilités définies selon game-data.js

    if (rand < 45) { // Gains de bananes

        if (rand < 8) gain = 100;

        else if (rand < 15) gain = 200;

        else if (rand < 23) gain = 500;

        else if (rand < 29) gain = 700;

        else if (rand < 35) gain = 1000;

        else if (rand < 40) gain = 1300;

        else if (rand < 43) gain = 1500;

        else gain = 2000;

        title = `+${gain} 🍌`;

    } 

    else if (rand < 57) { title = "Bouclier Bois"; addBoostToWheel('shield_wood', 'shield'); }

    else if (rand < 67) { title = "Bouclier Fer"; addBoostToWheel('shield_iron', 'shield'); }

    else if (rand < 75) { title = "Bouclier Or"; addBoostToWheel('shield_gold', 'shield'); }

    else if (rand < 90) { title = "Boost x2"; addBoostToWheel('boost_x2_money_3h', 'boost'); }

    else if (rand < 96) { title = "Lootbox Commune"; ('loot-box Commun','box'); }

    else if (rand < 99) { title = "Lootbox Rare"; ('loot-box Rare','box'); }

    else { title = "Lootbox Épique"; ('loot-box Épique','box'); }



    return { bananas: gain, title };



        // 3. Application de la récompense
        let inventory = JSON.parse(localStorage.getItem('banane_inventory') || "{}");
        let alertMsg = "";

        if (reward.type === 'money') {
            bananas += reward.val;
            localStorage.setItem('banane_bananas', bananas);
            alertMsg = `💰 Gagné : ${reward.name} !`;
        } else if (reward.type === 'box') {
            if (inventory[reward.id]) {
                inventory[reward.id].quantity += 1;
            } else {
                inventory[reward.id] = { id: reward.id, type: 'box', rarity: reward.rarity, quantity: 1 };
            }
            localStorage.setItem('banane_inventory', JSON.stringify(inventory));
            alertMsg = `🎁 Gagné : un ${reward.name} !`;
        }

        alert(alertMsg);

// 4. Libération de la roue
        isSpinning = false;
        if (visualWheel) visualWheel.classList.remove('is-spinning');
        updateBananaBalance();
        
        await saveProgressAfterAction(bananas);
    }, 3000);
};

// --- 3. EXPOSITION GLOBALE ---
window.playWheel = playWheel;

window.buySpecialUpgrade = async (type, id) => {
    let bananas = updateBananaBalance();
    let upgrade;
    if (type === 'click') upgrade = CLICK_UPGRADES.find(u => u.id === id);
    else if (type === 'crit') upgrade = CRIT_CHANCE_UPGRADES.find(u => u.id === id);
    else if (type === 'multi') upgrade = CRIT_MULTI_UPGRADES.find(u => u.id === id);
    
    if (upgrade && bananas >= upgrade.cost) {
        bananas -= upgrade.cost;
        localStorage.setItem('banane_bananas', bananas);
        if (type === 'click') localStorage.setItem('banane_click_power', upgrade.power);
        else if (type === 'crit') localStorage.setItem('banane_crit_chance', upgrade.chance);
        else if (type === 'multi') localStorage.setItem('banane_crit_multi', upgrade.multi);
        
        await saveProgressAfterAction(bananas);
        alert("✅ Amélioration achetée !");
        // Note: Assure-toi que renderUpgrades() est défini ou retire cette ligne
        if (typeof renderUpgrades === 'function') renderUpgrades();
        updateBananaBalance();
    } else {
        alert("❌ Pas assez de bananes !");
    }
};

// Initialisation au chargement
updateBananaBalance();

// --- LANCEMENT ---
function initShop() {
    initializePlayerId();
    updateBananaBalance();
    renderItemGrid(ALL_SKINS.filter(s => s.cost > 0), SKINS_GRID);
    renderItemGrid(ALL_BOOSTS, BOOSTS_GRID);
    renderUpgrades();
}

document.addEventListener('DOMContentLoaded', initShop);
