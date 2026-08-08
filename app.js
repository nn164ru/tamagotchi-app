// ============================================
// APP.JS - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
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
// 3. СОСТОЯНИЕ ИГРЫ (ОПТИМИЗИРОВАННОЕ)
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
// 4. ЦЕНЫ МАГАЗИНА (ЕДИНСТВЕННЫЙ ИСТОЧНИК)
// ============================================
const SHOP_PRICES = {
    food: { coins: 10, diamonds: 0, name: 'Еда', emoji: '🍕' },
    toy: { coins: 15, diamonds: 0, name: 'Игрушка', emoji: '🧸' },
    medicine: { coins: 20, diamonds: 0, name: 'Лекарство', emoji: '💊' },
    skin: { coins: 0, diamonds: 5, name: 'Скин', emoji: '🎨' }
};

// ============================================
// 5. DOM ЭЛЕМЕНТЫ (С ПРОВЕРКОЙ)
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
    ratingList: $('ratingList')
};

// ============================================
// 6. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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
// 7. ЗАГРУЗКА/СОХРАНЕНИЕ
// ============================================
const loadGame = () => {
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
};

const saveGame = () => {
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
};

// ============================================
// 8. ВАЛИДАЦИЯ ДАННЫХ
// ============================================
const validateGameData = (data) => {
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
};

// ============================================
// 9. ОБНОВЛЕНИЕ UI (ИСПРАВЛЕННОЕ)
// ============================================
const updateUI = () => {
    const { pet, user } = state;
    
    // 1. Питомец
    if (elements.petEmoji) elements.petEmoji.textContent = pet.emoji;
    if (elements.petName) elements.petName.textContent = pet.name;
    if (elements.petStatus) elements.petStatus.textContent = getPetStatus();
    
    // 2. Бары
    const bars = [
        { el: elements.healthBar, val: pet.health, id: 'healthBar' },
        { el: elements.energyBar, val: pet.energy, id: 'energyBar' },
        { el: elements.moodBar, val: pet.mood, id: 'moodBar' },
        { el: elements.hungerBar, val: pet.hunger, id: 'hungerBar' }
    ];
    
    bars.forEach(({ el, val, id }) => {
        const element = el || document.getElementById(id);
        if (element) {
            const v = Math.round(clamp(val, 0, 100));
            element.style.width = v + '%';
            element.textContent = v + '%';
            element.style.background = v > 70 ? '#4CAF50' : v > 40 ? '#FFA726' : '#f44336';
        }
    });
    
    // 3. Информация пользователя
    if (elements.userName) elements.userName.textContent = user.name;
    if (elements.userLevel) elements.userLevel.textContent = `Уровень ${pet.level}`;
    
    // 4. ⭐ ВАЛЮТА (ГЛАВНОЕ ИСПРАВЛЕНИЕ) ⭐
    updateCurrencyDisplay();
};

// ============================================
// 9.1 ОБНОВЛЕНИЕ ВАЛЮТЫ (НОВАЯ ФУНКЦИЯ)
// ============================================
const updateCurrencyDisplay = () => {
    // Получаем элементы (с проверкой)
    let coinsEl = elements.coins || document.getElementById('coins');
    let diamondsEl = elements.diamonds || document.getElementById('diamonds');
    
    // Если элементы не найдены - пробуем найти через querySelector
    if (!coinsEl) {
        coinsEl = document.querySelector('.currency span:first-child');
        if (coinsEl) elements.coins = coinsEl;
    }
    if (!diamondsEl) {
        diamondsEl = document.querySelector('.currency span:last-child');
        if (diamondsEl) elements.diamonds = diamondsEl;
    }
    
    // Если всё ещё не найдены - создаем
    if (!coinsEl || !diamondsEl) {
        console.warn('⚠️ Элементы валюты не найдены, создаем...');
        createCurrencyElements();
        coinsEl = document.getElementById('coins');
        diamondsEl = document.getElementById('diamonds');
    }
    
    // Обновляем значения
    const coins = Math.floor(state.user.coins || 0);
    const diamonds = Math.floor(state.user.diamonds || 0);
    
    if (coinsEl) {
        coinsEl.textContent = `🪙 ${formatNumber(coins)}`;
        console.log('🪙 Монеты обновлены:', coins);
    }
    if (diamondsEl) {
        diamondsEl.textContent = `💎 ${formatNumber(diamonds)}`;
        console.log('💎 Алмазы обновлены:', diamonds);
    }
};

// ============================================
// 9.2 СОЗДАНИЕ ЭЛЕМЕНТОВ ВАЛЮТЫ
// ============================================
const createCurrencyElements = () => {
    const header = document.getElementById('header');
    if (!header) {
        console.error('❌ Header не найден');
        return;
    }
    
    // Ищем или создаем контейнер валюты
    let currencyContainer = header.querySelector('.currency');
    if (!currencyContainer) {
        currencyContainer = document.createElement('div');
        currencyContainer.className = 'currency';
        header.appendChild(currencyContainer);
    }
    
    // Создаем элементы
    if (!document.getElementById('coins')) {
        const coinsSpan = document.createElement('span');
        coinsSpan.id = 'coins';
        coinsSpan.textContent = '🪙 0';
        currencyContainer.appendChild(coinsSpan);
        console.log('✅ Создан #coins');
    }
    
    if (!document.getElementById('diamonds')) {
        const diamondsSpan = document.createElement('span');
        diamondsSpan.id = 'diamonds';
        diamondsSpan.textContent = '💎 0';
        currencyContainer.appendChild(diamondsSpan);
        console.log('✅ Создан #diamonds');
    }
    
    // Обновляем ссылки
    elements.coins = document.getElementById('coins');
    elements.diamonds = document.getElementById('diamonds');
};

// ============================================
// 10. СТАТУС ПИТОМЦА
// ============================================
const getPetStatus = () => {
    const avg = (state.pet.health + state.pet.energy + state.pet.mood + state.pet.hunger) / 4;
    if (avg > 90) return '🌟 Счастлив';
    if (avg > 75) return '😊 Доволен';
    if (avg > 60) return '😐 Нормально';
    if (avg > 45) return '😕 Грустноват';
    if (avg > 30) return '😢 Грустен';
    if (avg > 15) return '😰 Плохо';
    return '💀 Очень плохо!';
};

// ============================================
// 11. ДЕЙСТВИЯ С ПИТОМЦЕМ
// ============================================
const safeAction = (action, callback, requireItem = null) => {
    if (typeof callback !== 'function') return false;
    
    if (security) {
        try {
            const check = security.checkAction?.(action, state);
            if (check && !check.allowed) {
                showNotification('⛔ ' + check.reason);
                return false;
            }
        } catch (e) {}
    }
    
    if (requireItem && (state.inventory[requireItem] || 0) <= 0) {
        showNotification(`❌ Нет ${requireItem === 'food' ? 'еды' : requireItem === 'toy' ? 'игрушек' : 'лекарств'}!`);
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
};

const feedPet = () => safeAction('feed', () => {
    state.pet.hunger = clamp(state.pet.hunger + 25, 0, 100);
    state.inventory.food--;
    addExp(10);
    showNotification('🍕 Питомец покормлен! +25 сытости');
}, 'food');

const playPet = () => safeAction('play', () => {
    state.pet.mood = clamp(state.pet.mood + 20, 0, 100);
    state.pet.energy = clamp(state.pet.energy - 10, 0, 100);
    state.inventory.toy--;
    addExp(15);
    showNotification('🎮 Игра с питомцем! +20 настроения');
}, 'toy');

const healPet = () => safeAction('heal', () => {
    state.pet.health = clamp(state.pet.health + 30, 0, 100);
    state.inventory.medicine--;
    addExp(12);
    showNotification('💊 Питомец вылечен! +30 здоровья');
}, 'medicine');

const sleepPet = () => safeAction('sleep', () => {
    state.pet.energy = clamp(state.pet.energy + 35, 0, 100);
    state.pet.health = clamp(state.pet.health + 5, 0, 100);
    addExp(8);
    showNotification('😴 Питомец отдохнул! +35 энергии');
});

// ============================================
// 12. СИСТЕМА УРОВНЕЙ
// ============================================
const addExp = (amount) => {
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
};

// ============================================
// 13. МАГАЗИН (ИСПРАВЛЕННЫЙ)
// ============================================
const buyItem = (type) => {
    const price = SHOP_PRICES[type];
    if (!price) {
        showNotification('❌ Неизвестный товар');
        return;
    }
    
    const coins = Math.floor(state.user.coins);
    const diamonds = Math.floor(state.user.diamonds);
    
    // Проверка средств
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
    
    // Выдача товара
    if (type === 'skin') {
        changePetSkin();
    } else {
        state.inventory[type] = (state.inventory[type] || 0) + 1;
    }
    
    // ⭐ ОБНОВЛЕНИЕ (ВАЖНО) ⭐
    updateUI();              // Обновляет всё
    updateCurrencyDisplay(); // Дополнительное обновление валюты
    saveGame();
    
    // Уведомление
    showNotification(`✅ Куплено: ${price.emoji} ${price.name}! Осталось: 🪙${state.user.coins}`);
    console.log(`🛒 Покупка: ${type} (${price.coins} монет) → Осталось: ${state.user.coins}`);
};

const changePetSkin = () => {
    const skins = ['🐣', '🐥', '🐔', '🦆', '🐦', '🐧', '🐤', '🦅', '🦉', '🦜'];
    const idx = skins.indexOf(state.pet.emoji);
    state.pet.emoji = skins[(idx + 1) % skins.length];
    if (!state.inventory.skins.includes(state.pet.emoji)) {
        state.inventory.skins.push(state.pet.emoji);
    }
    showNotification('🎨 Скин изменен!');
};

// ============================================
// 14. РЕФЕРАЛЬНАЯ СИСТЕМА
// ============================================
const generateReferralLink = () => {
    const link = `https://t.me/nnvtamagochi_bot?start=ref_${state.user.id}`;
    if (elements.refLink) elements.refLink.textContent = link;
    return link;
};

const shareReferral = () => {
    const link = elements.refLink?.textContent || generateReferralLink();
    if (tg?.showPopup) {
        tg.showPopup({
            title: '👥 Пригласить друга',
            message: `Пригласи друга и получи бонус!\n🪙 +50 монет\n💎 +5 алмазов\nСсылка: ${link}`,
            buttons: [{ type: 'ok' }]
        });
    } else {
        navigator.clipboard?.writeText(link).then(() => {
            showNotification('📋 Ссылка скопирована!');
        }).catch(() => {
            // fallback
            const input = document.createElement('input');
            input.value = link;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            showNotification('📋 Ссылка скопирована!');
        });
    }
};

// ============================================
// 15. ИГРОВОЙ ЦИКЛ
// ============================================
let gameLoopInterval = null;

const startGameLoop = () => {
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    console.log('🔄 Игровой цикл запущен');
    
    const updateStats = () => {
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
    };
    
    setTimeout(updateStats, 1000);
    gameLoopInterval = setInterval(updateStats, 5000);
};

// ============================================
// 16. ЕЖЕДНЕВНЫЙ БОНУС
// ============================================
const checkDailyBonus = () => {
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
};

// ============================================
// 17. РЕЙТИНГ
// ============================================
const updateRating = () => {
    const { pet, user } = state;
    user.rating = Math.floor(
        (pet.health + pet.energy + pet.mood + pet.hunger) * 0.1 +
        pet.level * 10 +
        user.coins * 0.01 +
        user.referrals * 50
    );
    
    if (elements.ratingList) {
        const items = [
            { name: '🏆 ' + user.name, score: user.rating },
            { name: '🥈 Игрок2', score: 850 },
            { name: '🥉 Игрок3', score: 720 }
        ];
        elements.ratingList.innerHTML = items
            .map((item, i) => `<div class="rating-item">${i+1}. ${item.name} - ${item.score} очков</div>`)
            .join('');
    }
};

// ============================================
// 18. УВЕДОМЛЕНИЯ
// ============================================
const showNotification = (message) => {
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
};

// ============================================
// 19. НАВИГАЦИЯ
// ============================================
const setupNavigation = () => {
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
        });
    });
};

// ============================================
// 20. НАСТРОЙКА КНОПОК (ОПТИМИЗИРОВАННАЯ)
// ============================================
const setupButtons = () => {
    const actions = {
        feedBtn: feedPet,
        playBtn: playPet,
        healBtn: healPet,
        sleepBtn: sleepPet,
        shareBtn: shareReferral
    };
    
    Object.entries(actions).forEach(([id, fn]) => {
        const el = document.getElementById(id) || document.querySelector(`[onclick*="${fn.name}()"]`);
        if (el) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                fn();
            });
        }
    });
    
    // Кнопки магазина
    document.querySelectorAll('.item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const type = el.dataset.item || el.getAttribute('onclick')?.match(/buyItem\('(\w+)'\)/)?.[1];
            if (type) buyItem(type);
        });
    });
    
    console.log('✅ Кнопки настроены');
};

// ============================================
// 21. ТЕМА TELEGRAM
// ============================================
const setupTelegramTheme = () => {
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
};

// ============================================
// 22. ИНИЦИАЛИЗАЦИЯ
// ============================================
const init = () => {
    console.log('🚀 Инициализация...');
    
    loadGame();
    
    if (security) {
        state._sessionId = security.security?.sessionId || 'session_' + Date.now().toString(36);
        state._fingerprint = security.multiAccount?.fingerprint || 'fingerprint_' + Date.now().toString(36);
    }
    state._timestamp = Date.now();
    
    updateUI();
    setupNavigation();
    setupButtons();
    generateReferralLink();
    setupTelegramTheme();
    startGameLoop();
    checkDailyBonus();
    updateRating();
    
    console.log('✅ Игра запущена!');
};

// ============================================
// 23. ГЛОБАЛЬНЫЙ ДОСТУП
// ============================================
window.feedPet = feedPet;
window.playPet = playPet;
window.healPet = healPet;
window.sleepPet = sleepPet;
window.buyItem = buyItem;
window.shareReferral = shareReferral;
window.updateUI = updateUI;
window.saveGame = saveGame;
window.state = state;
window.showNotification = showNotification;

// ============================================
// 24. ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', init);
console.log('📦 app.js загружен');
