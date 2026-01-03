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
        const itemData = ALL_SKINS.find(s => s.id === id) || ALL_BOOSTS.find(b => b.id === id);
        if (itemData) {
            return { ...itemData, ...inventoryData[id] };
        }
        return null;
    }).filter(item => item !== null);

    // 3. Trier : Skins en premier, puis par rareté (Légendaire > Épique > Rare > Commun)
    const rarityOrder = { 'legendary': 4, 'epic': 3, 'rare': 2, 'common': 1 };
    ownedItems.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'skin' ? -1 : 1;
        return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
    });

    if (ownedItems.length === 0) {
        INVENTORY_LIST.innerHTML = "<p style='text-align:center; color:#777;'>Ton inventaire est vide.</p>";
        return;
    }

    // 4. Générer le HTML pour chaque item
    ownedItems.forEach(item => {
        const itemDiv = document.createElement('div');
        const isSkin = item.type === 'skin';
        const isActiveSkin = item.id === activeSkinId;
        const quantity = item.quantity || 1;
        
        // Classes pour le style (rareté)
        itemDiv.className = `shop-item inventory-item rarity-${item.rarity || 'common'}`;
        
        itemDiv.innerHTML = `
            ${!isSkin && quantity > 1 ? `<div class="quantity-badge">x${quantity}</div>` : ''}
            <div class="rarity-tag">${item.rarity || 'common'}</div>
            <img src="${item.image}" alt="${item.name}">
            
            <div class="item-details">
                <strong>${item.name}</strong>
                <p class="desc">${item.description}</p>
                <div class="price-line">
                    <button class="btn small-btn">
                        ${isSkin ? (isActiveSkin ? 'ÉQUIPÉ' : 'ÉQUIPER') : (hasActiveShield ? 'DÉJÀ ACTIF' : 'ACTIVER')}
                    </button>
                </div>
            </div>
        `;

        // Gestion du clic sur le bouton
        const btn = itemDiv.querySelector('button');
        
        // Désactiver le bouton si nécessaire
        if (isSkin && isActiveSkin) {
            btn.disabled = true;
            btn.style.opacity = "0.7";
        } else if (!isSkin && hasActiveShield) {
            btn.disabled = true;
            btn.style.opacity = "0.5";
        }

        btn.addEventListener('click', () => {
            if (isSkin) {
                handleEquipSkin(item); // Ta fonction pour changer de skin
            } else {
                activateBoost(item); // Ta fonction pour activer le bouclier
            }
        });

        INVENTORY_LIST.appendChild(itemDiv);
    });

    // Mise à jour du compteur de bananes en haut de page
    updateBananaBalance();
}

function equipSkin(id) {
    localStorage.setItem('banane_active_skin', id);
    renderInventory();
    alert("Skin équipé !");
}

function activateBoost(item) {
    // 1. VÉRIFICATION : Existe-t-il déjà un bouclier actif ?
    const activeShield = localStorage.getItem('banane_active_shield');
    
    if (activeShield) {
        alert("🛡️ Un bouclier est déjà actif ! Utilise-le en jouant avant d'en activer un nouveau.");
        return; // On arrête la fonction ici, le bouclier n'est pas consommé
    }

    // 2. LOGIQUE D'ACTIVATION (si aucun bouclier n'est actif)
    if (item.type === 'shield') {
        localStorage.setItem('banane_active_shield', JSON.stringify({
            id: item.id,
            life: item.life,
            name: item.name
        }));
        
        // On consomme l'item de l'inventaire seulement maintenant
        consumeItem(item.id);
        alert(`✅ ${item.name} activé ! Il te protégera lors de ta prochaine erreur.`);
        
        // On rafraîchit l'affichage de l'inventaire
        renderInventory();
    }
}

function consumeItem(id) {
    let inventory = JSON.parse(localStorage.getItem('banane_inventory') || "{}");
    
    if (inventory[id]) {
        // Si c'est un boost avec une quantité (comme le bouclier)
        if (inventory[id].quantity > 1) {
            inventory[id].quantity -= 1; // On réduit de 1
        } else {
            // S'il n'en reste qu'un, on supprime l'entrée
            delete inventory[id];
        }
        
        // Mise à jour du stockage local
        localStorage.setItem('banane_inventory', JSON.stringify(inventory));
        
        // Sauvegarde sur le Cloud
        const currentBananas = localStorage.getItem('banane_bananas') || 0;
        saveProgressAfterAction(currentBananas);
    }
}

document.addEventListener('DOMContentLoaded', renderInventory);