// ============================================
// APP.JS - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================

// ============================================
// 1. ИНИЦИАЛИЗАЦИЯ TELEGRAM
// ============================================
const tg = window.Telegram.WebApp;
if (tg) tg.expand();

// ============================================
// 2. ПОДКЛЮЧЕНИЕ ЗАЩИТЫ
// ============================================
const security = window.security;
const SecureSave = security?.saveProtection;

// ============================================
// 3. СОСТОЯНИЕ ИГРЫ
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
        id: tg?.initDataUnsafe?.user?.id?.toString() || 'guest_' + Date.now().toString(36),
        name: tg?.initDataUnsafe?.user?.first_name || 'Гость',
        coins: 100,
        diamonds: 10,
        rating: 0,
        referrals: 0,
        referralEarned: 0,
        referralList: [],
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
    _sessionId: null,
    _fingerprint: null,
    _timestamp: null
};

// ============================================
// 4. ЦЕНЫ МАГАЗИНА
// ============================================
const SHOP_PRICES = {
    food: { coins: 10, diamonds: 0, name: 'Еда', emoji: '🍕' },
    toy: { coins: 15, diamonds: 0, name: 'Игрушка', emoji: '🧸' },
    medicine: { coins: 20, diamonds: 0, name: 'Лекарство', emoji: '💊' },
    skin: { coins: 0, diamonds: 5, name: 'Скин', emoji: '🎨' }
};

// ============================================
// 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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
// 6. СОЗДАНИЕ ЭЛЕМЕНТОВ ВАЛЮТЫ (ГАРАНТИРОВАННО)
// ============================================
function createCurrencyElements() {
    let header = document.getElementById('header');
    if (!header) {
        header = document.createElement('header');
        header.id = 'header';
        const app = document.getElementById('app');
        if (app) app.prepend(header);
        else document.body.prepend(header);
    }
    
    let currencyContainer = header.querySelector('.currency');
    if (!currencyContainer) {
        currencyContainer = document.createElement('div');
        currencyContainer.className = 'currency';
        header.appendChild(currencyContainer);
    }
    
    if (!document.getElementById('coins')) {
        const coinsSpan = document.createElement('span');
        coinsSpan.id = 'coins';
        coinsSpan.textContent = '🪙 0';
        currencyContainer.appendChild(coinsSpan);
    }
    
    if (!document.getElementById('diamonds')) {
        const diamondsSpan = document.createElement('span');
        diamondsSpan.id = 'diamonds';
        diamondsSpan.textContent = '💎 0';
        currencyContainer.appendChild(diamondsSpan);
    }
    
    if (!document.getElementById('userName')) {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        const nameSpan = document.createElement('span');
        nameSpan.id = 'userName';
        nameSpan.textContent = 'Гость';
        const levelSpan = document.createElement('span');
        levelSpan.id = 'userLevel';
        levelSpan.textContent = 'Уровень 1';
        userInfo.appendChild(nameSpan);
        userInfo.appendChild(levelSpan);
        header.prepend(userInfo);
    }
}

// ============================================
// 7. ОБНОВЛЕНИЕ МОНЕТ (ГАРАНТИРОВАННО РАБОТАЕТ)
// ============================================
function updateCoinsDisplay() {
    const coinsEl = document.getElementById('coins');
    const diamondsEl = document.getElementById('diamonds');
    
    if (!coinsEl || !diamondsEl) {
        createCurrencyElements();
        const newCoins = document.getElementById('coins');
        const newDiamonds = document.getElementById('diamonds');
        if (newCoins) {
            newCoins.textContent = `🪙 ${Math.floor(state.user.coins || 0)}`;
        }
        if (newDiamonds) {
            newDiamonds.textContent = `💎 ${Math.floor(state.user.diamonds || 0)}`;
        }
        return;
    }
    
    const coins = Math.floor(state.user.coins || 0);
    const diamonds = Math.floor(state.user.diamonds || 0);
    
    coinsEl.textContent = `🪙 ${coins}`;
    diamondsEl.textContent = `💎 ${diamonds}`;
}

// ============================================
// 8. ЗАГРУЗКА/СОХРАНЕНИЕ
// ============================================
function loadGame() {
    try {
        let savedData = null;
        if (SecureSave) savedData = SecureSave.secureLoad();
        if (!savedData) {
            const raw = localStorage.getItem('tamagochi_save');
            if (raw) savedData = JSON.parse(raw);
        }
        if (savedData && validateGameData(savedData)) {
            Object.assign(state, savedData);
            console.log('✅ Данные загружены');
            return true;
        }
    } catch (e) {
        console.error('❌ Ошибка загрузки:', e);
    }
    console.log('ℹ️ Создано новое сохранение');
    return false;
}

function saveGame() {
    state._timestamp = Date.now();
    try {
        if (SecureSave) {
            state._checksum = SecureSave.generateChecksum(state);
            return SecureSave.secureSave(state);
        }
        localStorage.setItem('tamagochi_save', JSON.stringify(state));
        return true;
    } catch (e) {
        console.error('❌ Ошибка сохранения:', e);
        return false;
    }
}

// ============================================
// 9. ВАЛИДАЦИЯ ДАННЫХ
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
// 10. СТАТУС ПИТОМЦА
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
// 11. ОБНОВЛЕНИЕ UI
// ============================================
function updateUI() {
    const pet = state.pet;
    const user = state.user;
    
    // Питомец
    const petEmoji = document.getElementById('petEmoji');
    const petName = document.getElementById('petName');
    const petStatus = document.getElementById('petStatus');
    if (petEmoji) petEmoji.textContent = pet.emoji;
    if (petName) petName.textContent = pet.name;
    if (petStatus) petStatus.textContent = getPetStatus();
    
    // Бары
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
    
    // Информация
    const userName = document.getElementById('userName');
    const userLevel = document.getElementById('userLevel');
    if (userName) userName.textContent = user.name;
    if (userLevel) userLevel.textContent = `Уровень ${pet.level}`;
    
    // ВАЛЮТА
    updateCoinsDisplay();
}

// ============================================
// 12. ДЕЙСТВИЯ С ПИТОМЦЕМ
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
// 13. СИСТЕМА УРОВНЕЙ
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
// 14. МАГАЗИН (ГАРАНТИРОВАННО ОБНОВЛЯЕТ МОНЕТЫ)
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
    
    // Списание
    state.user.coins = Math.max(0, coins - price.coins);
    state.user.diamonds = Math.max(0, diamonds - price.diamonds);
    
    // Выдача
    if (type === 'skin') {
        changePetSkin();
    } else {
        state.inventory[type] = (state.inventory[type] || 0) + 1;
    }
    
    // ⭐ ОБНОВЛЕНИЕ ⭐
    updateUI();
    updateCoinsDisplay();
    saveGame();
    
    showNotification(`✅ Куплено: ${price.emoji} ${price.name}! Осталось: 🪙${state.user.coins}`);
    console.log(`🛒 Покупка: ${type} (${price.coins} монет)`);
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
// 15. РЕФЕРАЛЬНАЯ СИСТЕМА
// ============================================
function generateReferralLink() {
    const link = `https://t.me/nnvtamagochi_bot?start=ref_${state.user.id}`;
    const refLink = document.getElementById('refLink');
    if (refLink) refLink.textContent = link;
    return link;
}

function copyReferralLink() {
    const refLink = document.getElementById('refLink');
    const link = refLink?.textContent || generateReferralLink();
    
    if (navigator.clipboard) {
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
    const link = document.getElementById('refLink')?.textContent || generateReferralLink();
    if (tg?.showPopup) {
        tg.showPopup({
            title: '👥 Пригласить друга',
            message: `Пригласи друга и получи бонус!\n🪙 +50 монет\n💎 +5 алмазов\nСсылка: ${link}`,
            buttons: [{ type: 'ok' }]
        });
    } else {
        copyReferralLink();
    }
}

function updateReferralUI() {
    const refCount = document.getElementById('refCount');
    const refEarned = document.getElementById('refEarned');
    const refList = document.getElementById('referralListContainer');
    
    if (refCount) refCount.textContent = state.user.referrals || 0;
    if (refEarned) refEarned.textContent = state.user.referralEarned || 0;
    
    if (refList) {
        const list = state.user.referralList || [];
        if (list.length === 0) {
            refList.innerHTML = '<p style="color: var(--text-secondary);">👥 Пока нет приглашенных</p>';
        } else {
            refList.innerHTML = list.map((ref, i) => 
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
function updateRating() {
    const { pet, user } = state;
    user.rating = Math.floor(
        (pet.health + pet.energy + pet.mood + pet.hunger) * 0.1 +
        pet.level * 10 +
        user.coins * 0.01 +
        user.referrals * 50
    );
    
    const ratingList = document.getElementById('ratingList');
    if (ratingList) {
        const items = [
            { name: '🏆 ' + user.name, score: user.rating },
            { name: '🥈 Игрок2', score: 850 },
            { name: '🥉 Игрок3', score: 720 }
        ];
        ratingList.innerHTML = items
            .map((item, i) => `<div class="rating-item">${i+1}. ${item.name} - ${item.score} очков</div>`)
            .join('');
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
    // Кнопки действий
    const feedBtn = document.getElementById('feedBtn');
    const playBtn = document.getElementById('playBtn');
    const healBtn = document.getElementById('healBtn');
    const sleepBtn = document.getElementById('sleepBtn');
    
    if (feedBtn) feedBtn.addEventListener('click', (e) => { e.preventDefault(); feedPet(); });
    if (playBtn) playBtn.addEventListener('click', (e) => { e.preventDefault(); playPet(); });
    if (healBtn) healBtn.addEventListener('click', (e) => { e.preventDefault(); healPet(); });
    if (sleepBtn) sleepBtn.addEventListener('click', (e) => { e.preventDefault(); sleepPet(); });
    
    // Кнопки магазина
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
// 23. ИНИЦИАЛИЗАЦИЯ
// ============================================
function init() {
    console.log('🚀 Инициализация...');
    
    // Создаем элементы валюты
    createCurrencyElements();
    
    // Загружаем данные
    loadGame();
    
    if (security) {
        state._sessionId = security.security?.sessionId || 'session_' + Date.now().toString(36);
        state._fingerprint = security.multiAccount?.fingerprint || 'fingerprint_' + Date.now().toString(36);
    }
    state._timestamp = Date.now();
    
    // Обновляем UI
    updateUI();
    updateReferralUI();
    
    // Настройки
    setupNavigation();
    setupButtons();
    generateReferralLink();
    setupTelegramTheme();
    startGameLoop();
    checkDailyBonus();
    updateRating();
    
    console.log('✅ Игра запущена!');
}

// ============================================
// 24. ГЛОБАЛЬНЫЙ ДОСТУП
// ============================================
window.feedPet = feedPet;
window.playPet = playPet;
window.healPet = healPet;
window.sleepPet = sleepPet;
window.buyItem = buyItem;
window.shareReferral = shareReferral;
window.copyReferralLink = copyReferralLink;
window.updateUI = updateUI;
window.updateCoinsDisplay = updateCoinsDisplay;
window.saveGame = saveGame;
window.state = state;

// ============================================
// 25. ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', init);
console.log('📦 app.js загружен');

// ============================================
// ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ СОХРАНЕНИЯ
// ============================================

function forceSave() {
    const result = saveGame();
    if (result) {
        showNotification('✅ Игра сохранена!');
        console.log('💾 Принудительное сохранение выполнено');
    } else {
        showNotification('❌ Ошибка сохранения!');
    }
}

function showSaveInfo() {
    const saved = localStorage.getItem('tamagochi_save');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            const message = `📊 Уровень ${data.pet?.level}\n🪙 ${data.user?.coins} монет\n💎 ${data.user?.diamonds} алмазов\n❤️ ${Math.round(data.pet?.health)}% здоровья`;
            showNotification(message);
            console.log('📊 Информация о сохранении:', {
                уровень: data.pet?.level,
                монет: data.user?.coins,
                алмазов: data.user?.diamonds,
                здоровье: data.pet?.health,
                энергия: data.pet?.energy,
                настроение: data.pet?.mood,
                сытость: data.pet?.hunger,
                сохранено: new Date(data._timestamp).toLocaleString()
            });
        } catch (e) {
            console.error('❌ Ошибка чтения сохранения:', e);
            showNotification('❌ Ошибка чтения сохранения');
        }
    } else {
        showNotification('❌ Сохранений нет');
        console.log('❌ Сохранений нет');
    }
}

function checkSaveOnLoad() {
    const saved = localStorage.getItem('tamagochi_save');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            console.log('📂 Найдено сохранение:', {
                уровень: data.pet?.level,
                монет: data.user?.coins,
                время: new Date(data._timestamp).toLocaleString()
            });
            return true;
        } catch (e) {
            console.warn('⚠️ Сохранение повреждено');
            return false;
        }
    }
    console.log('ℹ️ Сохранений нет');
    return false;
}

// Добавляем в глобальный доступ
window.forceSave = forceSave;
window.showSaveInfo = showSaveInfo;
window.checkSaveOnLoad = checkSaveOnLoad;

// Автосохранение
function startAutoSave() {
    setInterval(() => {
        saveGame();
        console.log('💾 Автосохранение...');
    }, 10000);
}

// Переопределяем init
const originalInit = init;
init = function() {
    console.log('🚀 Инициализация...');
    
    // Проверяем сохранения
    checkSaveOnLoad();
    
    // Создаем элементы валюты
    createCurrencyElements();
    
    // Загружаем данные
    loadGame();
    
    if (security) {
        state._sessionId = security.security?.sessionId || 'session_' + Date.now().toString(36);
        state._fingerprint = security.multiAccount?.fingerprint || 'fingerprint_' + Date.now().toString(36);
    }
    state._timestamp = Date.now();
    
    // Обновляем UI
    updateUI();
    updateReferralUI();
    
    // Настройки
    setupNavigation();
    setupButtons();
    generateReferralLink();
    setupTelegramTheme();
    startGameLoop();
    checkDailyBonus();
    updateRating();
    
    // Автосохранение
    startAutoSave();
    
    console.log('✅ Игра запущена!');
    console.log('📊 Текущий прогресс:', {
        уровень: state.pet.level,
        монет: state.user.coins,
        здоровье: Math.round(state.pet.health)
    });
};

// Сохраняем при закрытии
window.addEventListener('beforeunload', function() {
    saveGame();
    console.log('💾 Сохранено перед закрытием');
});

console.log('📦 app.js загружен');
