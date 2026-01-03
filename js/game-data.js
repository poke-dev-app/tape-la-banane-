// Fichier : js/game-data.js (Version COMPLÈTE avec rareté des skins et boucliers multiples)

/**
 * Liste de tous les SKINS disponibles dans le jeu.
 * - rarity: 'common', 'rare', 'epic', 'legendary'
 */
export const ALL_SKINS = [
    // --- Communs (Au moins 6) ---
    {
        id: 'default_skin',
        name: 'Banane Standard',
        image: 'img/default_skin.png',
        cost: 0,
        type: 'skin',
        rarity: 'common',
        description: 'La banane classique. Simple et efficace.'
    },
    {
        id: 'striped_banana',
        name: 'Banane Zébrée',
        image: 'img/striped_banana.png',
        cost: 2500,
        type: 'skin',
        rarity: 'common',
        description: 'Rayée, pour plus de style.'
    },
    {
        id: 'blue_banana',
        name: 'Banane Bleue',
        image: 'img/blue_banana.png',
        cost: 2000,
        type: 'skin',
        rarity: 'common',
        description: 'Une banane exotique, couleur azur.'
    },
    {
        id: 'red_banana',
        name: 'Banane Rouge',
        image: 'img/red_banana.png',
        cost: 2000,
        type: 'skin',
        rarity: 'common',
        description: 'Attention, très mûre !'
    },
    {
        id: 'pixel_banana',
        name: 'Banane Rétro',
        image: 'img/pixel_banana.png',
        cost: 3500,
        type: 'skin',
        rarity: 'common',
        description: 'Pour un look 8 bits.'
    },
    {
        id: 'stone_banana',
        name: 'Banane en Pierre',
        image: 'img/stone_banana.png',
        cost: 3000,
        type: 'skin',
        rarity: 'common',
        description: 'Solide comme un roc.'
    },

    // --- Rares (Au moins 3) ---
    {
        id: 'sunglasses_banana',
        name: 'Banane Cool',
        image: 'img/sunglasses_banana.png',
        cost: 10000,
        type: 'skin',
        rarity: 'rare',
        description: 'Tellement cool qu\'elle doit porter des lunettes de soleil.'
    },
    {
        id: 'chef_banana',
        name: 'Banane Chef',
        image: 'img/chef_banana.png',
        cost: 11000,
        type: 'skin',
        rarity: 'rare',
        description: 'Prête à vous préparer les meilleurs plats.'
    },
    {
        id: 'pirate_banana',
        name: 'Banane Pirate',
        image: 'img/pirate_banana.png',
        cost: 11500,
        type: 'skin',
        rarity: 'rare',
        description: 'Hisse et Ho !'
    },

    // --- Épiques (Au moins 2) ---
    {
        id: 'robot_banana',
        name: 'Banane Robot',
        image: 'img/robot_banana.png',
        cost: 30000,
        type: 'skin',
        rarity: 'epic',
        description: 'Parfaitement calibrée pour résister aux clics frénétiques.'
    },
    {
        id: 'ice_banana',
        name: 'Banane de Glace',
        image: 'img/ice_banana.png',
        cost: 45000,
        type: 'skin',
        rarity: 'epic',
        description: 'A été congelée dans le temps.'
    },

    // --- Légendaires (Au moins 2) ---
    {
        id: 'golden_banana',
        name: 'Banane d\'Or',
        image: 'img/golden_banana.png',
        cost: 150000,
        type: 'skin',
        rarity: 'legendary',
        description: 'Une banane recouverte du métal le plus précieux.'
    },
    {
        id: 'alien_banana',
        name: 'Banane Spatiale',
        image: 'img/alien_banana.png',
        cost: 250000,
        type: 'skin',
        rarity: 'legendary',
        description: 'Vient d\'une galaxie lointaine, très lointaine.'
    }
];

/**
 * Liste de tous les BOOSTS (Améliorations) disponibles dans le jeu.
 */
export const ALL_BOOSTS = [
    // Boost d'Argent (x2 Bananes)
    {
        id: 'boost_x2_money_3h',
        name: 'Boost Banane (x2 / 3h)',
        image: 'img/boost_money.png', 
        cost: 7500,
        type: 'boost',
        // Durée : 3 heures (en millisecondes)
        durationMs: 3 * 60 * 60 * 1000, 
        description: 'Multiplie par 2 les bananes gagnées pendant 3 heures.',
        target: 'money' // Nouvelle propriété pour cibler l'argent
    },
    
    // --- Boucliers (un seul utilisable à la fois) ---
    {
        id: 'shield_wood',
        name: 'Bouclier en Bois',
        image: 'img/shield_wood.png', 
        cost: 1000,
        type: 'shield',
        life: 1, // Le nombre de "vies" que le bouclier donne
        description: 'Protège d\'un seul "time out". (Protection simple)'
    },
    {
        id: 'shield_iron',
        name: 'Bouclier en Fer',
        image: 'img/shield_iron.png', 
        cost: 2500,
        type: 'shield',
        life: 3, 
        description: 'Protège de 3 erreurs de "time out". (Protection modérée)'
    },
    {
        id: 'shield_gold',
        name: 'Bouclier en Or',
        image: 'img/shield_gold.png', 
        cost: 4000 ,
        type: 'shield',
        life: 5, 
        description: 'Protège de 5 erreurs de "time out". (Protection maximale)'
    },
];

// --- PUISSANCE DE CLIC (1 à 10) ---
export const CLICK_UPGRADES = [
    { id: 'up_c_1', name: 'Gant de Cuir', cost: 15000, power: 2 },
    { id: 'up_c_2', name: 'Batte de Bois', cost: 50000, power: 4 },
    { id: 'up_c_3', name: 'Batte de Fer', cost: 150000, power: 6 },
    { id: 'up_c_4', name: 'Marteau de Thor', cost: 350000, power: 8 },
    { id: 'up_c_5', name: 'Main d\'Or', cost: 750000, power: 10 }
];

// --- CHANCE DE CRITIQUE (1% par palier) ---
// Prix : on commence à 10 000 et on augmente à chaque fois
export const CRIT_CHANCE_UPGRADES = Array.from({length: 10}, (_, i) => ({
    id: `crit_p_${i+1}`,
    name: `Trèfle ${i+1}`,
    cost: 10000 * (i + 1) * (i + 1), // Prix exponentiel : 10k, 40k, 90k, 160k...
    chance: (i + 1) / 100 // 0.01, 0.02...
}));

// --- MULTIPLICATEUR CRITIQUE (x2 à x5) ---
export const CRIT_MULTI_UPGRADES = [
    { id: 'crit_m_1', name: 'Force x3', cost: 40000, multi: 3 },
    { id: 'crit_m_2', name: 'Force x4', cost: 200000, multi: 4 },
    { id: 'crit_m_3', name: 'Force x5', cost: 600000, multi: 5 }
];