// ============================================
// APP.JS - ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================

// ⭐ ПРОВЕРКА TELEGRAM WebApp ⭐
console.log('🚀 Загрузка приложения...');

// Получаем Telegram WebApp
const tg = window.Telegram.WebApp;

// Проверяем, что WebApp доступен
if (!tg) {
    console.warn('⚠️ Telegram WebApp не найден!');
    // Создаем заглушку для веб-версии
    window.Telegram = window.Telegram || {};
    window.Telegram.WebApp = {
        expand: () => {},
        initDataUnsafe: {
            user: {
                id: 'guest_' + Date.now(),
                first_name: 'Гость',
                username: 'guest'
            }
        },
        showPopup: (params, callback) => {
            alert(params.message);
            if (callback) callback('ok');
        }
    };
} else {
    // Расширяем на весь экран
    tg.expand();
    console.log('✅ Telegram WebApp инициализирован');
}

// Получаем данные пользователя
const userData = tg?.initDataUnsafe?.user || {
    id: 'guest_' + Date.now().toString(36),
    first_name: 'Гость',
    username: 'guest'
};

console.log('👤 Данные пользователя:', userData);

// ============================================
// ИМПОРТ БАЗЫ ДАННЫХ
// ============================================
import { cloudDB } from './supabase.js';

// ============================================
// 1. СОСТОЯНИЕ ИГРЫ (С ПРАВИЛЬНЫМИ ДАННЫМИ)
// ============================================
const state = {
    pet: {
        name: 'Питомец',
        emoji: '🐣',
        health: 100,
        energy: 100,
        mood: 100,
        hunger: 100,
        level: 1,
        exp: 0,
        expToNext: 100
    },
    user: {
        // ⭐ ИСПОЛЬЗУЕМ ДАННЫЕ ИЗ TELEGRAM ⭐
        id: userData.id?.toString() || 'guest_' + Date.now().toString(36),
        name: userData.first_name || userData.username || 'Гость',
        username: userData.username || '',
        coins: 100,
        diamonds: 10,
        rating: 0,
        referrals: 0,
        referralEarned: 0,
        referralList: [],
        referralCode: null,
        referralLink: null,
        totalPlayTime: 0,
        lastLogin: Date.now(),
        loginStreak: 1
    },
    inventory: {
        food: 2,
        toy: 1,
        medicine: 1,
        skins: ['🐣']
    },
    _timestamp: Date.now(),
    _isCloudSync: false,
    _lastCloudSave: null
};

console.log('📊 Создано состояние:', {
    id: state.user.id,
    name: state.user.name
});

// ============================================
// 2. ЦЕНЫ МАГАЗИНА
// ============================================
const SHOP_PRICES = {
    food: { coins: 10, diamonds: 0, name: 'Еда', emoji: '🍕' },
    toy: { coins: 15, diamonds: 0, name: 'Игрушка', emoji: '🧸' },
    medicine: { coins: 20, diamonds: 0, name: 'Лекарство', emoji: '💊' },
    skin: { coins: 0, diamonds: 5, name: 'Скин', emoji: '🎨' }
};

// ============================================
// 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    num = Math.floor(num);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ============================================
// 4. DOM ЭЛЕМЕНТЫ
// ============================================
const $ = (id) => document.getElementById(id);
const elements = {
    petEmoji: $('petEmoji'),
    petName: $('petName'),
    petStatus: $('petStatus'),
    healthBar: $('healthBar'),
    energyBar: $('energyBar'),
    moodBar: $('moodBar'),
    hungerBar: $('hungerBar'),
    userName: $('userName'),
    userLevel: $('userLevel'),
    coins: $('coins'),
    diamonds: $('diamonds'),
    refLink: $('refLink'),
    ratingList: $('ratingList'),
    refCount: $('refCount'),
    refEarned: $('refEarned'),
    referralListContainer: $('referralListContainer')
};

// Проверяем элементы
console.log('🔍 DOM элементы:', {
    userName: elements.userName ? '✅' : '❌',
    coins: elements.coins ? '✅' : '❌',
    diamonds: elements.diamonds ? '✅' : '❌'
});

// ============================================
// 5. РАБОТА С БАЗОЙ ДАННЫХ
// ============================================

// Загрузка из облака
async function loadFromCloud() {
    const userId = state.user.id;
    console.log('📂 Загрузка данных для:', userId);
    
    try {
        const cloudData = await cloudDB.loadPlayer(userId);
        
        if (cloudData) {
            const localTime = state._timestamp || 0;
            const cloudTime = cloudData._timestamp || 0;
            
            if (cloudTime > localTime) {
                Object.assign(state, cloudData);
                console.log('✅ Данные загружены из Supabase');
                return true;
            } else {
                console.log('📂 Локальные данные новее');
                return false;
            }
        } else {
            console.log('ℹ️ Новый игрок в Supabase');
            return false;
        }
    } catch (e) {
        console.error('❌ Ошибка загрузки из Supabase:', e);
        return false;
    }
}

// Сохранение в облако
async function saveToCloud() {
    const userId = state.user.id;
    state._timestamp = Date.now();
    
    try {
        const result = await cloudDB.savePlayer(userId, state);
        if (result.success) {
            state._lastCloudSave = Date.now();
            console.log('✅ Данные сохранены в Supabase');
            return true;
        }
    } catch (e) {
        console.error('❌ Ошибка сохранения в Supabase:', e);
    }
    return false;
}

// Полная загрузка
async function loadGame() {
    console.log('📂 Загрузка данных...');
    
    const cloudLoaded = await loadFromCloud();
    
    if (!cloudLoaded) {
        try {
            const local = localStorage.getItem('tamagochi_local_save');
            if (local) {
                const data = JSON.parse(local);
                if (validateGameData(data)) {
                    Object.assign(state, data);
                    console.log('📂 Загружено из локального кэша');
                }
            }
        } catch (e) {
            console.error('❌ Ошибка локальной загрузки:', e);
        }
    }
    
    if (!state.user.id) {
        resetGame();
    }
    
    console.log('✅ Данные загружены');
    return true;
}

// ============================================
// 6. ОБНОВЛЕНИЕ UI (С ПРОВЕРКОЙ)
// ============================================
function updateUI() {
    const pet = state.pet;
    const user = state.user;
    
    // Проверяем, что элементы существуют
    if (!elements.userName) {
        console.warn('⚠️ Элементы DOM не найдены');
        return;
    }
    
    // Обновляем имя пользователя
    if (elements.userName) {
        elements.userName.textContent = user.name || 'Гость';
        console.log('👤 Имя обновлено:', user.name);
    }
    
    // Обновляем уровень
    if (elements.userLevel) {
        elements.userLevel.textContent = `Уровень ${pet.level}`;
    }
    
    // Обновляем питомца
    if (elements.petEmoji) elements.petEmoji.textContent = pet.emoji;
    if (elements.petName) elements.petName.textContent = pet.name;
    if (elements.petStatus) elements.petStatus.textContent = getPetStatus();
    
    // Обновляем бары
    const bars = [
        { id: 'healthBar', value: pet.health },
        { id: 'energyBar', value: pet.energy },
        { id: 'moodBar', value: pet.mood },
        { id: 'hungerBar', value: pet.hunger }
    ];
    
    bars.forEach(bar => {
        const el = document.getElementById(bar.id);
        if (el) {
            const v = Math.round(clamp(bar.value, 0, 100));
            el.style.width = v + '%';
            el.textContent = v + '%';
            el.style.background = v > 70 ? '#4CAF50' : v > 40 ? '#FFA726' : '#f44336';
        }
    });
    
    // Обновляем валюту
    updateCoinsDisplay();
}

function updateCoinsDisplay() {
    const coinsEl = document.getElementById('coins');
    const diamondsEl = document.getElementById('diamonds');
    
    if (coinsEl) {
        coinsEl.textContent = `🪙 ${formatNumber(Math.floor(state.user.coins || 0))}`;
    }
    if (diamondsEl) {
        diamondsEl.textContent = `💎 ${formatNumber(Math.floor(state.user.diamonds || 0))}`;
    }
}

// ============================================
// 7. СТАТУС ПИТОМЦА
// ============================================
function getPetStatus() {
    const avg = (state.pet.health + state.pet.energy + state.pet.mood + state.pet.hunger) / 4;
    if (avg > 90) return '🌟 Счастлив';
    if (avg > 75) return '😊 Доволен';
    if (avg > 60) return '😐 Нормально';
    if (avg > 45) return '😕 Грустноват';
    if (avg > 30) return '😢 Грустен';
    if (avg > 15) return '😰 Плохо';
    return '💀 Очень плохо!';
}

// ============================================
// 8. ВАЛИДАЦИЯ ДАННЫХ
// ============================================
function validateGameData(data) {
    if (!data?.pet?.health || !data?.user?.coins) return false;
    const { pet, user, inventory } = data;
    
    const isNum = (v, min, max) => typeof v === 'number' && !isNaN(v) && v >= min && v <= max;
    const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
    
    return (
        isNum(pet.health, 0, 100) && isNum(pet.energy, 0, 100) &&
        isNum(pet.mood, 0, 100) && isNum(pet.hunger, 0, 100) &&
        isInt(pet.level, 1, 1000) && isNum(pet.exp, 0) &&
        isInt(user.coins, 0, 9999999) && isInt(user.diamonds, 0, 999999) &&
        isInt(user.rating, 0) && isInt(user.referrals, 0, 10000) &&
        isInt(inventory.food, 0, 9999) && isInt(inventory.toy, 0, 9999) &&
        isInt(inventory.medicine, 0, 9999) && Array.isArray(inventory.skins)
    );
}

// ============================================
// 9. СБРОС ИГРЫ
// ============================================
function resetGame() {
    const userId = state.user?.id || 'guest_' + Date.now().toString(36);
    const userName = state.user?.name || 'Гость';
    
    state.pet = {
        name: 'Питомец',
        emoji: '🐣',
        health: 100,
        energy: 100,
        mood: 100,
        hunger: 100,
        level: 1,
        exp: 0,
        expToNext: 100
    };
    state.user = {
        id: userId,
        name: userName,
        username: state.user?.username || '',
        coins: 100,
        diamonds: 10,
        rating: 0,
        referrals: 0,
        referralEarned: 0,
        referralList: [],
        referralCode: null,
        referralLink: null,
        totalPlayTime: 0,
        lastLogin: Date.now(),
        loginStreak: 1
    };
    state.inventory = {
        food: 2,
        toy: 1,
        medicine: 1,
        skins: ['🐣']
    };
    
    saveGame();
}

// ============================================
// 10. СОХРАНЕНИЕ
// ============================================
async function saveGame() {
    state._timestamp = Date.now();
    
    try {
        localStorage.setItem('tamagochi_local_save', JSON.stringify(state));
        console.log('💾 Сохранено локально');
    } catch (e) {
        console.error('❌ Ошибка локального сохранения:', e);
    }
    
    await saveToCloud();
    return true;
}

// ============================================
// 11. ДЕЙСТВИЯ С ПИТОМЦЕМ
// ============================================
function safeAction(action, callback, requireItem = null) {
    if (typeof callback !== 'function') return false;
    
    if (requireItem && (state.inventory[requireItem] || 0) <= 0) {
        const names = { food: 'еды', toy: 'игрушек', medicine: 'лекарств' };
        showNotification(`❌ Нет ${names[requireItem] || requireItem}!`);
        return false;
    }
    
    try {
        callback();
        saveGame();
        updateUI();
        return true;
    } catch (e) {
        console.error('❌ Ошибка:', e);
        showNotification('❌ Произошла ошибка');
        return false;
    }
}

function feedPet() {
    safeAction('feed', () => {
        state.pet.hunger = clamp(state.pet.hunger + 25, 0, 100);
        state.inventory.food--;
        addExp(10);
        showNotification('🍕 Питомец покормлен! +25 сытости');
    }, 'food');
}

function playPet() {
    safeAction('play', () => {
        state.pet.mood = clamp(state.pet.mood + 20, 0, 100);
        state.pet.energy = clamp(state.pet.energy - 10, 0, 100);
        state.inventory.toy--;
        addExp(15);
        showNotification('🎮 Игра с питомцем! +20 настроения');
    }, 'toy');
}

function healPet() {
    safeAction('heal', () => {
        state.pet.health = clamp(state.pet.health + 30, 0, 100);
        state.inventory.medicine--;
        addExp(12);
        showNotification('💊 Питомец вылечен! +30 здоровья');
    }, 'medicine');
}

function sleepPet() {
    safeAction('sleep', () => {
        state.pet.energy = clamp(state.pet.energy + 35, 0, 100);
        state.pet.health = clamp(state.pet.health + 5, 0, 100);
        addExp(8);
        showNotification('😴 Питомец отдохнул! +35 энергии');
    });
}

// ============================================
// 12. СИСТЕМА УРОВНЕЙ
// ============================================
function addExp(amount) {
    state.pet.exp += amount;
    while (state.pet.exp >= state.pet.expToNext) {
        state.pet.level++;
        state.pet.exp -= state.pet.expToNext;
        state.pet.expToNext = Math.floor(state.pet.expToNext * 1.5);
        
        const bonusCoins = 50 + (state.pet.level - 1) * 10;
        const bonusDiamonds = 5 + Math.floor((state.pet.level - 1) / 5);
        state.user.coins += bonusCoins;
        state.user.diamonds += bonusDiamonds;
        
        showNotification(`🎉 Уровень ${state.pet.level}! +🪙${bonusCoins} +💎${bonusDiamonds}`);
        saveGame();
        updateUI();
    }
}

// ============================================
// 13. МАГАЗИН
// ============================================
function buyItem(type) {
    const price = SHOP_PRICES[type];
    if (!price) {
        showNotification('❌ Неизвестный товар');
        return;
    }
    
    const coins = Math.floor(state.user.coins);
    const diamonds = Math.floor(state.user.diamonds);
    
    if (price.coins > 0 && coins < price.coins) {
        showNotification(`❌ Нужно ${price.coins} монет, у вас ${coins}`);
        return;
    }
    if (price.diamonds > 0 && diamonds < price.diamonds) {
        showNotification(`❌ Нужно ${price.diamonds} алмазов, у вас ${diamonds}`);
        return;
    }
    
    state.user.coins = Math.max(0, coins - price.coins);
    state.user.diamonds = Math.max(0, diamonds - price.diamonds);
    
    if (type === 'skin') {
        changePetSkin();
    } else {
        state.inventory[type] = (state.inventory[type] || 0) + 1;
    }
    
    updateUI();
    saveGame();
    showNotification(`✅ Куплено: ${price.emoji} ${price.name}! Осталось: 🪙${state.user.coins}`);
}

function changePetSkin() {
    const skins = ['🐣', '🐥', '🐔', '🦆', '🐦', '🐧', '🐤', '🦅', '🦉', '🦜'];
    const idx = skins.indexOf(state.pet.emoji);
    state.pet.emoji = skins[(idx + 1) % skins.length];
    if (!state.inventory.skins.includes(state.pet.emoji)) {
        state.inventory.skins.push(state.pet.emoji);
    }
    showNotification('🎨 Скин изменен!');
}

// ============================================
// 14. РЕФЕРАЛЬНАЯ СИСТЕМА
// ============================================
function generateReferralLink() {
    const userId = state.user.id;
    const refCode = generateReferralCode(userId);
    const botUsername = getBotUsername();
    const link = `https://t.me/${botUsername}?start=ref_${refCode}`;
    
    state.user.referralCode = refCode;
    state.user.referralLink = link;
    
    const refLinkElement = document.getElementById('refLink');
    if (refLinkElement) {
        refLinkElement.textContent = link;
    }
    
    localStorage.setItem('referral_link', link);
    localStorage.setItem('referral_code', refCode);
    
    return link;
}

function generateReferralCode(userId) {
    const base = userId.replace(/[^a-zA-Z0-9]/g, '');
    const random = Math.random().toString(36).substring(2, 8);
    const time = Date.now().toString(36).substring(-4);
    return `${base}_${random}_${time}`.substring(0, 20);
}

function getBotUsername() {
    const saved = localStorage.getItem('bot_username');
    if (saved) return saved;
    return 'nnvtamagochi_bot'; // ЗАМЕНИТЕ
}

function copyReferralLink() {
    let link = state.user.referralLink || localStorage.getItem('referral_link');
    if (!link || link.includes('YourBotUsername')) {
        link = generateReferralLink();
    }
    
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            showNotification('📋 Ссылка скопирована!');
        });
    } else {
        const input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showNotification('📋 Ссылка скопирована!');
    }
}

function shareReferral() {
    const link = state.user.referralLink || generateReferralLink();
    
    if (tg?.showPopup) {
        tg.showPopup({
            title: '👥 Пригласить друга',
            message: `Пригласи друга и получи бонус!\n\n🪙 +50 монет\n💎 +5 алмазов\n⭐ +20 опыта\n\n📋 Ссылка: ${link}`,
            buttons: [
                { id: 'copy', type: 'default', text: '📋 Копировать' },
                { type: 'cancel' }
            ]
        }, (buttonId) => {
            if (buttonId === 'copy') copyReferralLink();
        });
    } else {
        copyReferralLink();
    }
}

function updateReferralUI() {
    if (elements.refCount) {
        elements.refCount.textContent = state.user.referrals || 0;
    }
    if (elements.refEarned) {
        elements.refEarned.textContent = state.user.referralEarned || 0;
    }
    
    if (elements.referralListContainer) {
        const list = state.user.referralList || [];
        if (list.length === 0) {
            elements.referralListContainer.innerHTML = 
                '<p style="color: var(--text-secondary);">👥 Пока нет приглашенных</p>';
        } else {
            elements.referralListContainer.innerHTML = list.map((ref, i) => 
                `<div class="referral-item">
                    <span>${i + 1}.</span>
                    <span>${ref.substring(0, 10)}...</span>
                    <span>✅</span>
                </div>`
            ).join('');
        }
    }
}

// ============================================
// 15. ОБРАБОТКА РЕФЕРАЛЬНОЙ ССЫЛКИ
// ============================================
function handleReferralStart() {
    const startParam = tg?.initDataUnsafe?.start_param;
    if (startParam && startParam.startsWith('ref_')) {
        const refCode = startParam.replace('ref_', '');
        console.log('🔗 Реферальный код:', refCode);
        
        setTimeout(() => {
            applyReferral(refCode);
        }, 1000);
    }
}

async function applyReferral(refCode) {
    if (refCode === state.user.referralCode) {
        console.warn('⚠️ Нельзя пригласить самого себя');
        return;
    }
    
    if (state.user.referralList && state.user.referralList.includes(refCode)) {
        console.warn('⚠️ Этот пользователь уже приглашен');
        return;
    }
    
    state.user.coins += 25;
    state.user.diamonds += 2;
    state.pet.exp += 10;
    
    try {
        await cloudDB.addReferral(refCode, state.user.id);
    } catch (e) {
        console.warn('⚠️ Ошибка отправки реферала в облако:', e);
    }
    
    saveGame();
    updateUI();
    updateReferralUI();
    showNotification('🎉 Реферальный код активирован! +🪙25 +💎2 +⭐10');
}

// ============================================
// 16. ИГРОВОЙ ЦИКЛ
// ============================================
let gameLoopInterval = null;

function startGameLoop() {
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    console.log('🔄 Игровой цикл запущен');
    
    function updateStats() {
        state.pet.hunger = clamp(state.pet.hunger - 2, 0, 100);
        state.pet.energy = clamp(state.pet.energy - 1.5, 0, 100);
        state.pet.mood = clamp(state.pet.mood - 1, 0, 100);
        state.pet.health = clamp(state.pet.health - 0.5, 0, 100);
        
        if (state.pet.health <= 0) {
            showNotification('💀 Питомец умер! Восстановление...');
            state.pet.health = 50;
            state.pet.energy = 50;
            state.pet.mood = 50;
            state.pet.hunger = 50;
            state.user.coins = Math.max(0, state.user.coins - 20);
        }
        
        if (Math.random() < 0.05) {
            state.user.coins += randomInt(1, 3);
        }
        
        state.user.totalPlayTime += 5;
        saveGame();
        updateUI();
    }
    
    setTimeout(updateStats, 1000);
    gameLoopInterval = setInterval(updateStats, 5000);
}

// ============================================
// 17. ЕЖЕДНЕВНЫЙ БОНУС
// ============================================
function checkDailyBonus() {
    const now = Date.now();
    const lastLogin = state.user.lastLogin || 0;
    const dayMs = 86400000;
    
    if (now - lastLogin > dayMs) {
        const streak = (now - lastLogin < dayMs * 2) ? (state.user.loginStreak || 0) + 1 : 1;
        state.user.loginStreak = streak;
        
        const bonusCoins = 50 + streak * 10;
        const bonusDiamonds = 5 + Math.floor(streak / 3);
        
        state.user.coins += bonusCoins;
        state.user.diamonds += bonusDiamonds;
        state.user.lastLogin = now;
        
        showNotification(`🎁 Ежедневный бонус!\n🪙 +${bonusCoins} монет\n💎 +${bonusDiamonds} алмазов\n🔥 ${streak} день подряд!`);
        saveGame();
        updateUI();
    }
}

// ============================================
// 18. РЕЙТИНГ
// ============================================
async function updateRating() {
    const { pet, user } = state;
    user.rating = Math.floor(
        (pet.health + pet.energy + pet.mood + pet.hunger) * 0.1 +
        pet.level * 10 +
        user.coins * 0.01 +
        user.referrals * 50
    );
    
    await cloudDB.updateField(user.id, 'rating', user.rating);
    await updateRatingList();
}

async function updateRatingList() {
    const ratingList = document.getElementById('ratingList');
    if (!ratingList) return;
    
    try {
        const topPlayers = await cloudDB.getTopPlayers(20);
        
        if (topPlayers && topPlayers.length > 0) {
            ratingList.innerHTML = topPlayers.map((player, i) => {
                const medal = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                return `<div class="rating-item">
                    ${medal} ${player.name} - ${player.rating} очков (Уровень ${player.level})
                </div>`;
            }).join('');
            
            localStorage.setItem('top_players', JSON.stringify(topPlayers));
        }
    } catch (e) {
        console.warn('⚠️ Ошибка загрузки рейтинга:', e);
        const cached = localStorage.getItem('top_players');
        if (cached) {
            const players = JSON.parse(cached);
            ratingList.innerHTML = players.map((player, i) => {
                const medal = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                return `<div class="rating-item">
                    ${medal} ${player.name} - ${player.rating} очков
                </div>`;
            }).join('');
        }
    }
}

// ============================================
// 19. УВЕДОМЛЕНИЯ
// ============================================
function showNotification(message) {
    console.log('📢', message);
    
    if (tg?.showPopup) {
        tg.showPopup({
            title: '🐾 Тамагочи',
            message: message,
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    const notification = document.createElement('div');
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.85)',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '12px',
        zIndex: '1000',
        maxWidth: '90%',
        textAlign: 'center',
        animation: 'slideDown 0.3s ease',
        backdropFilter: 'blur(10px)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '16px',
        pointerEvents: 'none'
    });
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// 20. НАВИГАЦИЯ
// ============================================
function setupNavigation() {
    const buttons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('section');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            const target = document.getElementById(sectionId);
            if (target) target.classList.add('active');
            if (sectionId === 'ratingSection') updateRating();
            if (sectionId === 'referralSection') updateReferralUI();
        });
    });
}

// ============================================
// 21. НАСТРОЙКА КНОПОК
// ============================================
function setupButtons() {
    const feedBtn = document.getElementById('feedBtn');
    const playBtn = document.getElementById('playBtn');
    const healBtn = document.getElementById('healBtn');
    const sleepBtn = document.getElementById('sleepBtn');
    
    if (feedBtn) feedBtn.addEventListener('click', (e) => { e.preventDefault(); feedPet(); });
    if (playBtn) playBtn.addEventListener('click', (e) => { e.preventDefault(); playPet(); });
    if (healBtn) healBtn.addEventListener('click', (e) => { e.preventDefault(); healPet(); });
    if (sleepBtn) sleepBtn.addEventListener('click', (e) => { e.preventDefault(); sleepPet(); });
    
    document.querySelectorAll('.item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const type = el.dataset.item;
            if (type) buyItem(type);
        });
    });
    
    console.log('✅ Кнопки настроены');
}

// ============================================
// 22. ТЕМА TELEGRAM
// ============================================
function setupTelegramTheme() {
    if (!tg?.themeParams) return;
    const theme = tg.themeParams;
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', theme.bg_color || '#ffffff');
    root.style.setProperty('--bg-secondary', theme.secondary_bg_color || '#f0f0f0');
    root.style.setProperty('--text-primary', theme.text_color || '#000000');
    root.style.setProperty('--text-secondary', theme.hint_color || '#333333');
    root.style.setProperty('--button-bg', theme.button_color || '#0088cc');
    root.style.setProperty('--button-text', theme.button_text_color || '#ffffff');
    root.style.setProperty('--border-color', theme.hint_color || '#e0e0e0');
}

// ============================================
// 23. АВТОСОХРАНЕНИЕ
// ============================================
let autoSaveInterval = null;

function startAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    
    autoSaveInterval = setInterval(() => {
        saveGame();
        console.log('💾 Автосохранение в Supabase...');
    }, 30000);
}

// ============================================
// 24. ИНИЦИАЛИЗАЦИЯ
// ============================================
async function init() {
    console.log('🚀 Инициализация с Supabase...');
    
    // Проверяем, что данные пользователя получены
    if (!state.user.id || state.user.id === 'guest_undefined') {
        console.warn('⚠️ Нет данных пользователя, создаем гостя');
        state.user.id = 'guest_' + Date.now().toString(36);
        state.user.name = 'Гость';
    }
    
    console.log('👤 Пользователь:', {
        id: state.user.id,
        name: state.user.name
    });
    
    await loadGame();
    
    updateUI();
    updateReferralUI();
    
    setupNavigation();
    setupButtons();
    generateReferralLink();
    setupTelegramTheme();
    startGameLoop();
    checkDailyBonus();
    await updateRating();
    startAutoSave();
    handleReferralStart();
    
    console.log('✅ Игра запущена с Supabase!');
    console.log('📊 Текущий прогресс:', {
        уровень: state.pet.level,
        монет: state.user.coins,
        здоровье: Math.round(state.pet.health)
    });
}

// ============================================
// 25. ГЛОБАЛЬНЫЙ ДОСТУП
// ============================================
window.feedPet = feedPet;
window.playPet = playPet;
window.healPet = healPet;
window.sleepPet = sleepPet;
window.buyItem = buyItem;
window.shareReferral = shareReferral;
window.copyReferralLink = copyReferralLink;
window.updateUI = updateUI;
window.saveGame = saveGame;
window.state = state;
window.cloudDB = cloudDB;

window.addEventListener('beforeunload', function() {
    saveGame();
    console.log('💾 Сохранено перед закрытием');
});

// ============================================
// 26. ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен');
    init();
});

console.log('📦 app.js загружен (Supabase версия)');
