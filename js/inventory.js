// Correction de l'importation en haut de inventory.js
import { db, doc, setDoc, initializePlayerId, saveProgressAfterAction } from "./firebase-init.js";
import { ALL_SKINS, ALL_BOOSTS } from "./game-data.js";

const INVENTORY_LIST = document.getElementById('inventoryList');

// Ordre des raretés pour le tri
const RARITY_ORDER = { 'legendary': 4, 'epic': 3, 'rare': 2, 'common': 1 };

async function saveInventoryToCloud() {
    const userId = localStorage.getItem("banane_id");
    if (!userId) return;
    const inventory = localStorage.getItem('banane_inventory');
    await setDoc(doc(db, "players", userId), { inventory: inventory }, { merge: true });
}

function renderInventory() {
    if (!INVENTORY_LIST) return;

    // 1. Récupérer les données
    const inventoryData = JSON.parse(localStorage.getItem('banane_inventory') || "{}");
    const activeSkinId = localStorage.getItem('banane_active_skin') || 'default_skin';
    const hasActiveShield = localStorage.getItem('banane_active_shield') !== null;
    
    INVENTORY_LIST.innerHTML = "";

    // 2. Transformer l'objet en liste d'items complets
    let ownedItems = Object.keys(inventoryData).map(id => {
        // Chercher dans les skins, les boosts ou vérifier si c'est une box
        const itemData = ALL_SKINS.find(s => s.id === id) || ALL_BOOSTS.find(b => b.id === id);
        
        if (itemData) {
            return { ...itemData, ...inventoryData[id], id: id };
        } else if (id.startsWith('box_')) {
            // Cas spécial pour les lootboxes qui n'ont pas de data fixe dans game-data.js
            return { 
                id: id, 
                type: 'box', 
                rarity: id.split('_')[1], 
                quantity: inventoryData[id].quantity || 1 
            };
        }
        return null;
    }).filter(item => item !== null);

    // 3. Trier
    ownedItems.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'skin' ? -1 : 1;
        return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
    });

    if (ownedItems.length === 0) {
        INVENTORY_LIST.innerHTML = "<p style='text-align:center; color:#777;'>Ton inventaire est vide.</p>";
        return;
    }

    // 4. Générer le HTML
    ownedItems.forEach(item => {
        const itemDiv = document.createElement('div');
        const isSkin = item.type === 'skin';
        const isBox = item.type === 'box';
        const isActiveSkin = item.id === activeSkinId;
        const quantity = item.quantity || 1;
        
        itemDiv.className = `shop-item inventory-item rarity-${item.rarity || 'common'}`;
        
        if (isBox) {
            // Affichage spécifique pour les Lootboxes
            itemDiv.innerHTML = `
                <div class="quantity-badge">x${quantity}</div>
                <div class="rarity-tag">${item.rarity.toUpperCase()}</div>
                <img src="img/box_${item.rarity}.png" class="item-img" onerror="this.src='img/box_common.png'">
                <div class="item-details">
                    <strong>Lootbox ${item.rarity}</strong>
                    <p class="desc">Contient des récompenses de valeur !</p>
                    <button class="btn small-btn">OUVRIR</button>
                </div>
            `;
        } else {
            // Affichage pour Skins et Boosts
            itemDiv.innerHTML = `
                ${!isSkin && quantity > 1 ? `<div class="quantity-badge">x${quantity}</div>` : ''}
                <div class="rarity-tag">${item.rarity || 'common'}</div>
                <img src="${item.image}" alt="${item.name}">
                <div class="item-details">
                    <strong>${item.name}</strong>
                    <p class="desc">${item.description}</p>
                    <button class="btn small-btn">
                        ${isSkin ? (isActiveSkin ? 'ÉQUIPÉ' : 'ÉQUIPER') : (hasActiveShield ? 'DÉJÀ ACTIF' : 'ACTIVER')}
                    </button>
                </div>
            `;
        }

        const btn = itemDiv.querySelector('button');
        if (isSkin && isActiveSkin) btn.disabled = true;

        btn.addEventListener('click', () => {
            if (isSkin) equipSkin(item.id);
            else if (isBox) window.openBox(item.rarity); // Appel de la fonction de shop.js
            else activateBoost(item);
        });

        INVENTORY_LIST.appendChild(itemDiv);
    });
} // <--- L'accolade qui manquait ici !

function equipSkin(id) {
    localStorage.setItem('banane_active_skin', id);
    renderInventory();
    alert("Skin équipé !");
}

function activateBoost(item) {
    const activeShield = localStorage.getItem('banane_active_shield');
    if (activeShield) {
        alert("🛡️ Un bouclier est déjà actif !");
        return;
    }
    if (item.type === 'shield') {
        localStorage.setItem('banane_active_shield', JSON.stringify({
            id: item.id,
            life: item.life,
            name: item.name
        }));
        consumeItem(item.id);
        alert(`✅ ${item.name} activé !`);
        renderInventory();
    }
}

function consumeItem(id) {
    let inventory = JSON.parse(localStorage.getItem('banane_inventory') || "{}");
    if (inventory[id]) {
        if (inventory[id].quantity > 1) inventory[id].quantity -= 1;
        else delete inventory[id];
        localStorage.setItem('banane_inventory', JSON.stringify(inventory));
        saveProgressAfterAction(localStorage.getItem('banane_bananas') || 0);
    }
}

document.addEventListener('DOMContentLoaded', renderInventory);
