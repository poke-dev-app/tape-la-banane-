import { saveProgressAfterAction, initializePlayerId } from "./firebase-init.js";
import { ALL_SKINS, ALL_BOOSTS, CLICK_UPGRADES, CRIT_CHANCE_UPGRADES, CRIT_MULTI_UPGRADES } from "./game-data.js";

const SKINS_GRID = document.getElementById('skinsGrid');
const BOOSTS_GRID = document.getElementById('boostsGrid');
const UPGRADES_GRID = document.getElementById('upgrades-container');
const CURRENT_BANANAS_SPAN = document.getElementById('currentBananas');

let isSpinning = false;
let currentRotation = 0;

// --- GESTION ADMOB REWARDED ---
async function showRewardedAd() {
    if (typeof AdMob === 'undefined') {
        console.warn("⚠️ AdMob non disponible (mode web)");
        // En mode développement web, on donne quand même la récompense
        if (confirm("Mode test : Voulez-vous recevoir 100 bananes gratuites ?")) {
            giveReward();
        }
        return;
    }

    try {
        // Préparer la pub rewarded
        await AdMob.prepareRewardVideoAd({
            adId: 'ca-app-pub-9867983302890361/7543639940',
            isTesting: true // CHANGEZ À false EN PRODUCTION
        });

        // Afficher la pub
        const result = await AdMob.showRewardVideoAd();
        
        console.log("📺 Résultat pub rewarded:", result);
        
        // Vérifier si l'utilisateur a bien regardé la pub jusqu'au bout
        if (result && result.rewarded) {
            giveReward();
        } else {
            alert("⚠️ Pub non terminée, pas de récompense.");
        }
    } catch (error) {
        console.error("❌ Erreur pub rewarded:", error);
        alert("❌ Erreur lors de l'affichage de la publicité. Réessayez plus tard.");
    }
}

function giveReward() {
    let bananas = Number(localStorage.getItem('banane_bananas') || 0);
    bananas += 100;
    localStorage.setItem('banane_bananas', bananas);
    
    // Vibration de succès
    if (localStorage.getItem('setting_vibration') === 'true' && navigator.vibrate) {
        navigator.vibrate([50, 100, 50, 100, 50]);
    }
    
    updateBananaBalance();
    saveProgressAfterAction(bananas);
    alert("🎉 Merci ! +100 bananes ajoutées 🍌");
}

// --- 1. INITIALISATION & UI ---
function updateBananaBalance() {
    const bananas = localStorage.getItem('banane_bananas') || 0;
    if (CURRENT_BANANAS_SPAN) {
        CURRENT_BANANAS_SPAN.textContent = new Intl.NumberFormat('fr-FR').format(bananas);
    }
    
    // Mise à jour de l'afficheur du header s'il existe
    const totalDisplay = document.getElementById('totalBananasDisplay');
    if (totalDisplay) {
        totalDisplay.textContent = new Intl.NumberFormat('fr-FR').format(bananas);
    }
    
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
            <img src="${item.image}" alt="${item.name}" onerror="this.src='img/default_skin.png'">
            <div class="item-details">
                <strong>${item.name}</strong>
                <p class="desc">${item.description || ''}</p>
                <button class="btn small-btn">${item.cost.toLocaleString()} 🍌</button>
            </div>
        `;
        div.querySelector('button').addEventListener('click', () => handleBuyItem(item));
        targetElement.appendChild(div);
    });
}

function renderSkins() {
    const skinsToShow = ALL_SKINS.filter(s => s.id !== 'default_skin');
    renderItemGrid(skinsToShow, SKINS_GRID);
}

function renderBoosts() {
    renderItemGrid(ALL_BOOSTS, BOOSTS_GRID);
}

// --- 3. AFFICHAGE DES AMÉLIORATIONS ---
function renderUpgrades() {
    if (!UPGRADES_GRID) return;
    UPGRADES_GRID.innerHTML = '';

    const statsGrid = document.createElement('div');
    statsGrid.className = 'items-grid'; 
    statsGrid.style.display = 'grid';
    statsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(100px, 1fr))';
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
        div.innerHTML = `
            <div class="item-details" style="opacity: 0.5; text-align: center;">
                <div style="font-size: 1.5rem;">${icon}</div>
                <strong>MAX</strong>
            </div>
        `;
        return div;
    }

    let desc = type === 'click' ? `+${upgrade.power} /clic` : 
               type === 'crit' ? `+${(upgrade.chance * 100).toFixed(0)}% Crit` : 
               `x${upgrade.multi} Multi`;

    div.innerHTML = `
        <div class="item-details">
            <div style="font-size: 1.5rem; margin-bottom: 5px;">${icon}</div>
            <strong style="font-size: 0.9em;">${upgrade.name}</strong>
            <p style="font-size: 0.85em; margin: 5px 0;">${desc}</p>
            <button class="btn small-btn" data-type="${type}" data-id="${upgrade.id}">
                ${upgrade.cost.toLocaleString()} 🍌
            </button>
        </div>
    `;
    
    div.querySelector('button').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        buySpecialUpgrade(btn.dataset.type, btn.dataset.id);
    });
    
    return div;
}

// --- 4. LOGIQUE D'ACHAT (Skins & Boosts) ---
async function handleBuyItem(item) {
    let bananas = updateBananaBalance();
    
    if (bananas < item.cost) {
        alert("❌ Pas assez de bananes !");
        return;
    }
    
    let inventory = JSON.parse(localStorage.getItem('banane_inventory') || "{}");
    
    if (item.type === 'skin') {
        if (inventory[item.id]) {
            alert("✅ Tu possèdes déjà ce skin !");
            return;
        }
        inventory[item.id] = { bought: true, type: 'skin', quantity: 1 };
    } else if (item.type === 'boost' || item.type === 'shield') {
        if (!inventory[item.id]) {
            inventory[item.id] = { 
                quantity: 1, 
                type: item.type,
                id: item.id
            };
        } else {
            inventory[item.id].quantity += 1;
        }
    }

    bananas -= item.cost;
    localStorage.setItem('banane_bananas', bananas);
    localStorage.setItem('banane_inventory', JSON.stringify(inventory));
    
    await saveProgressAfterAction(bananas);
    
    // Vibration de succès
    if (localStorage.getItem('setting_vibration') === 'true' && navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    alert(`✅ Achat réussi : ${item.name}`);
    updateBananaBalance();
}

// --- LOGIQUE DE LA ROUE ---
window.playWheel = async (count = 1) => {
    if (isSpinning) {
        alert("⏳ La roue tourne déjà !");
        return;
    }

    const cost = 1000 * count;
    let bananas = updateBananaBalance();

    if (bananas < cost) {
        alert("❌ Pas assez de bananes !");
        return;
    }

    isSpinning = true;
    const visualWheel = document.getElementById('visualWheel');
    if (visualWheel) visualWheel.classList.add('is-spinning');

    const extraDegree = Math.floor(Math.random() * 360);
    currentRotation += (360 * 5) + extraDegree;
    if (visualWheel) visualWheel.style.transform = `rotate(${currentRotation}deg)`;

    // Vibration pendant le spin
    if (localStorage.getItem('setting_vibration') === 'true' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
    }

    setTimeout(async () => {
        bananas -= cost;
        
        let inventory = JSON.parse(localStorage.getItem('banane_inventory') || "{}");
        let allRewards = []; 

        for (let i = 0; i < count; i++) {
            const rand = Math.random() * 100;
            
            if (rand < 45) {
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
            else {
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

        localStorage.setItem('banane_inventory', JSON.stringify(inventory));
        localStorage.setItem('banane_bananas', bananas);
        
        isSpinning = false;
        if (visualWheel) visualWheel.classList.remove('is-spinning');
        updateBananaBalance();
        await saveProgressAfterAction(bananas);

        // Résumé des gains
        const summary = allRewards.reduce((acc, curr) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
        }, {});

        let msg = count > 1 ? `🎰 RÉSULTATS (x${count}) :\n\n` : `🎁 GAIN :\n\n`;
        for (const [name, qty] of Object.entries(summary)) {
            msg += `• ${name} ${qty > 1 ? 'x' + qty : ''}\n`;
        }
        alert(msg);

    }, 3000);
};

async function buySpecialUpgrade(type, id) {
    let bananas = updateBananaBalance();
    let upgrade;
    
    if (type === 'click') upgrade = CLICK_UPGRADES.find(u => u.id === id);
    else if (type === 'crit') upgrade = CRIT_CHANCE_UPGRADES.find(u => u.id === id);
    else if (type === 'multi') upgrade = CRIT_MULTI_UPGRADES.find(u => u.id === id);
    
    if (!upgrade) {
        alert("❌ Amélioration introuvable !");
        return;
    }
    
    if (bananas < upgrade.cost) {
        alert("❌ Pas assez de bananes !");
        return;
    }
    
    bananas -= upgrade.cost;
    localStorage.setItem('banane_bananas', bananas);
    
    if (type === 'click') localStorage.setItem('banane_click_power', upgrade.power);
    else if (type === 'crit') localStorage.setItem('banane_crit_chance', upgrade.chance);
    else if (type === 'multi') localStorage.setItem('banane_crit_multi', upgrade.multi);
    
    await saveProgressAfterAction(bananas);
    
    // Vibration de succès
    if (localStorage.getItem('setting_vibration') === 'true' && navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    alert("✅ Amélioration achetée !");
    renderUpgrades();
    updateBananaBalance();
}

// --- INITIALISATION ---
function initShop() {
    console.log("🛒 Initialisation de la boutique...");
    
    initializePlayerId();
    updateBananaBalance();
    renderUpgrades();
    renderSkins();
    renderBoosts();

    // Bouton pub rewarded
    const rewardBtn = document.getElementById('rewardAdBtn');
    if (rewardBtn) {
        rewardBtn.addEventListener('click', showRewardedAd);
        console.log("✅ Bouton pub rewarded configuré");
    }
}

// Attendre que le DOM soit chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShop);
} else {
    initShop();
}