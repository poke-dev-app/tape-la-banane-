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

// --- LOGIQUE DE LA ROUE CORRIGÉE ---
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

    // UNE SEULE ANIMATION (même pour x100)
    const extraDegree = Math.floor(Math.random() * 360);
    currentRotation += (360 * 5) + extraDegree;
    if (visualWheel) visualWheel.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(async () => {
        bananas -= cost; // On paye le total
        
        let inventory = JSON.parse(localStorage.getItem('banane_inventory') || "{}");
        let allRewards = []; 

        // LA BOUCLE DE CALCUL (Ultra rapide, se fait en arrière-plan)
        for (let i = 0; i < count; i++) {
            const rand = Math.random() * 100;
            
            if (rand < 45) { // Gains de bananes
                let gain;
                if (rand < 8) gain = 100;
                else if (rand < 15) gain = 200;
                else if (rand < 23) gain = 500;
                else if (rand < 29) gain = 700;
                else if (rand < 35) gain = 1000;
                else if (rand < 40) gain = 1300;
                else if (rand < 43) gain = 1500;
                else gain = 2000;
                
                bananas += gain;
                allRewards.push(`${gain} 🍌`);
            } 
            else { // Gains d'objets
                let item = {};
                if (rand < 57) item = { id: 'shield_wood', type: 'shield', name: "Bouclier Bois" };
                else if (rand < 67) item = { id: 'shield_iron', type: 'shield', name: "Bouclier Fer" };
                else if (rand < 75) item = { id: 'shield_gold', type: 'shield', name: "Bouclier Or" };
                else if (rand < 90) item = { id: 'boost_x2_money_3h', type: 'boost', name: "Boost x2" };
                else if (rand < 96) item = { id: 'box_common', type: 'box', rarity: 'common', name: "Lootbox Commune" };
                else if (rand < 99) item = { id: 'box_rare', type: 'box', rarity: 'rare', name: "Lootbox Rare" };
                else item = { id: 'box_epic', type: 'box', rarity: 'epic', name: "Lootbox Épique" };

                if (inventory[item.id]) {
                    inventory[item.id].quantity += 1;
                } else {
                    inventory[item.id] = { ...item, quantity: 1 };
                }
                allRewards.push(item.name);
            }
        }

        // --- SAUVEGARDE UNIQUE ---
        localStorage.setItem('banane_inventory', JSON.stringify(inventory));
        localStorage.setItem('banane_bananas', bananas);
        
        isSpinning = false;
        if (visualWheel) visualWheel.classList.remove('is-spinning');
        updateBananaBalance();
        await saveProgressAfterAction(bananas);

        // --- AFFICHAGE DU RÉSUMÉ ---
        const summary = allRewards.reduce((acc, curr) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
        }, {});

        let msg = count > 1 ? `🎰 RÉSULTATS (x${count}) :\n\n` : `🎁 GAIN :\n`;
        for (const [name, qty] of Object.entries(summary)) {
            msg += `• ${name} x${qty}\n`;
        }
        alert(msg);

    }, 3000); // Temps de l'animation unique
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