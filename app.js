// ============================================
// APP.JS - ПОЛНОСТЬЮ РАБОЧАЯ ВЕРСИЯ
// ============================================

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
if (tg) {
    tg.expand();
}

// ============================================
// ПОДКЛЮЧЕНИЕ ЗАЩИТЫ
// ============================================
const security = window.security;
const SecureSave = security?.saveProtection;

if (!security || !SecureSave) {
    console.warn('⚠️ security.js не загружен, работаем без защиты');
}

// ============================================
// СОСТОЯНИЕ ИГРЫ
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
        expToNext: 100,
        lastFed: Date.now(),
        lastPlayed: Date.now(),
        lastHealed: Date.now(),
        lastSlept: Date.now()
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
    settings: {
        sound: true,
        notifications: true,
        language: 'ru'
    },
    _sessionId: null,
    _fingerprint: null,
    _checksum: null,
    _timestamp: null
};

// ============================================
// DOM ЭЛЕМЕНТЫ
// ============================================
const elements = {
    petEmoji: document.getElementById('petEmoji'),
    petName: document.getElementById('petName'),
    petStatus: document.getElementById('petStatus'),
    healthBar: document.getElementById('healthBar'),
    energyBar: document.getElementById('energyBar'),
    moodBar: document.getElementById('moodBar'),
    hungerBar: document.getElementById('hungerBar'),
    userName: document.getElementById('userName'),
    userLevel: document.getElementById('userLevel'),
    coins: document.getElementById('coins'),
    diamonds: document.getElementById('diamonds'),
    refLink: document.getElementById('refLink'),
    ratingList: document.getElementById('ratingList')
};

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
function init() {
    console.log('🚀 Инициализация игры...');
    
    // Загрузка сохранения
    loadGame();
    
    // Установка защитных полей
    if (security) {
        state._sessionId = security.security?.sessionId || 'session_' + Date.now().toString(36);
        state._fingerprint = security.multiAccount?.fingerprint || 'fingerprint_' + Date.now().toString(36);
    }
    state._timestamp = Date.now();
    
    // Обновление UI
    updateUI();
    
    // Настройка навигации
    setupNavigation();
    
    // Настройка кнопок
    setupButtons();
    
    // Генерация реферальной ссылки
    generateReferralLink();
    
    // Настройка темы Telegram
    setupTelegramTheme();
    
    // ЗАПУСК ИГРОВОГО ЦИКЛА (ВАЖНО!)
    startGameLoop();
    
    // Проверка ежедневного бонуса
    checkDailyBonus();
    
    // Обновление рейтинга
    updateRating();
    
    console.log('✅ Игра успешно запущена!');
    console.log('📊 Текущие параметры:', {
        health: state.pet.health,
        energy: state.pet.energy,
        mood: state.pet.mood,
        hunger: state.pet.hunger
    });
}

// ============================================
// ЗАГРУЗКА СОХРАНЕНИЯ
// ============================================
function loadGame() {
    try {
        let savedData = null;
        
        // Пытаемся загрузить через защиту
        if (SecureSave) {
            savedData = SecureSave.secureLoad();
        }
        
        // Если защиты нет или не загрузилось - пробуем обычную загрузку
        if (!savedData) {
            const raw = localStorage.getItem('tamagochi_save');
            if (raw) {
                savedData = JSON.parse(raw);
                console.log('📂 Данные загружены из localStorage');
            }
        }
        
        if (savedData) {
            if (validateGameData(savedData)) {
                Object.assign(state, savedData);
                console.log('✅ Данные загружены успешно');
                console.log('📊 Состояние питомца:', {
                    health: Math.round(state.pet.health),
                    energy: Math.round(state.pet.energy),
                    mood: Math.round(state.pet.mood),
                    hunger: Math.round(state.pet.hunger)
                });
            } else {
                console.warn('⚠️ Невалидные данные, используем новые');
            }
        } else {
            console.log('ℹ️ Новое сохранение создано');
        }
    } catch (e) {
        console.error('❌ Ошибка загрузки:', e);
    }
}

// ============================================
// ВАЛИДАЦИЯ ДАННЫХ
// ============================================
function validateGameData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.pet || !data.user || !data.inventory) return false;
    
    const pet = data.pet;
    if (typeof pet.health !== 'number' || pet.health < 0 || pet.health > 100) return false;
    if (typeof pet.energy !== 'number' || pet.energy < 0 || pet.energy > 100) return false;
    if (typeof pet.mood !== 'number' || pet.mood < 0 || pet.mood > 100) return false;
    if (typeof pet.hunger !== 'number' || pet.hunger < 0 || pet.hunger > 100) return false;
    if (typeof pet.level !== 'number' || !Number.isInteger(pet.level) || pet.level < 1 || pet.level > 1000) return false;
    if (typeof pet.exp !== 'number' || pet.exp < 0) return false;
    
    const user = data.user;
    if (typeof user.coins !== 'number' || !Number.isInteger(user.coins) || user.coins < 0 || user.coins > 9999999) return false;
    if (typeof user.diamonds !== 'number' || !Number.isInteger(user.diamonds) || user.diamonds < 0 || user.diamonds > 999999) return false;
    if (typeof user.rating !== 'number' || !Number.isInteger(user.rating) || user.rating < 0) return false;
    if (typeof user.referrals !== 'number' || !Number.isInteger(user.referrals) || user.referrals < 0 || user.referrals > 10000) return false;
    
    const inv = data.inventory;
    if (typeof inv.food !== 'number' || !Number.isInteger(inv.food) || inv.food < 0 || inv.food > 9999) return false;
    if (typeof inv.toy !== 'number' || !Number.isInteger(inv.toy) || inv.toy < 0 || inv.toy > 9999) return false;
    if (typeof inv.medicine !== 'number' || !Number.isInteger(inv.medicine) || inv.medicine < 0 || inv.medicine > 9999) return false;
    if (!Array.isArray(inv.skins) || inv.skins.length > 100) return false;
    
    return true;
}

// ============================================
// ОБНОВЛЕНИЕ UI (ПОЛНОСТЬЮ ИСПРАВЛЕННОЕ)
// ============================================
function updateUI() {
    const pet = state.pet;
    const user = state.user;
    
    // 1. ОБНОВЛЕНИЕ ПИТОМЦА
    if (elements.petEmoji) elements.petEmoji.textContent = pet.emoji;
    if (elements.petName) elements.petName.textContent = pet.name;
    if (elements.petStatus) elements.petStatus.textContent = getPetStatus();
    
    // 2. ОБНОВЛЕНИЕ БАРОВ
    if (elements.healthBar) {
        const val = Math.round(Math.max(0, Math.min(100, pet.health)));
        elements.healthBar.style.width = val + '%';
        elements.healthBar.textContent = val + '%';
    }
    if (elements.energyBar) {
        const val = Math.round(Math.max(0, Math.min(100, pet.energy)));
        elements.energyBar.style.width = val + '%';
        elements.energyBar.textContent = val + '%';
    }
    if (elements.moodBar) {
        const val = Math.round(Math.max(0, Math.min(100, pet.mood)));
        elements.moodBar.style.width = val + '%';
        elements.moodBar.textContent = val + '%';
    }
    if (elements.hungerBar) {
        const val = Math.round(Math.max(0, Math.min(100, pet.hunger)));
        elements.hungerBar.style.width = val + '%';
        elements.hungerBar.textContent = val + '%';
    }
    
    // 3. ОБНОВЛЕНИЕ ИНФОРМАЦИИ ПОЛЬЗОВАТЕЛЯ
    if (elements.userName) elements.userName.textContent = user.name;
    if (elements.userLevel) elements.userLevel.textContent = `Уровень ${pet.level}`;
    
    // 4. ⭐ ГЛАВНОЕ: ОБНОВЛЕНИЕ МОНЕТ И АЛМАЗОВ ⭐
    // Приводим к целым числам и форматируем
    const coinsDisplay = Math.floor(user.coins);
    const diamondsDisplay = Math.floor(user.diamonds);
    
    if (elements.coins) {
        elements.coins.textContent = `🪙 ${formatNumber(coinsDisplay)}`;
        console.log('🪙 Монеты обновлены:', coinsDisplay); // Для отладки
    }
    if (elements.diamonds) {
        elements.diamonds.textContent = `💎 ${formatNumber(diamondsDisplay)}`;
        console.log('💎 Алмазы обновлены:', diamondsDisplay); // Для отладки
    }
    
    // 5. ОБНОВЛЕНИЕ ЦВЕТОВ
    updateBarColors();
}

// ============================================
// ФОРМАТИРОВАНИЕ ЧИСЕЛ (ИСПРАВЛЕННОЕ)
// ============================================
function formatNumber(num) {
    // Проверка на undefined/null
    if (num === undefined || num === null || isNaN(num)) {
        return '0';
    }
    
    // Приводим к целому числу
    num = Math.floor(num);
    
    // Форматирование больших чисел
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    
    return num.toString();
}

// ============================================
// ЦВЕТА БАРОВ
// ============================================
function updateBarColors() {
    const bars = [
        { id: 'healthBar', value: state.pet.health },
        { id: 'energyBar', value: state.pet.energy },
        { id: 'moodBar', value: state.pet.mood },
        { id: 'hungerBar', value: state.pet.hunger }
    ];
    
    bars.forEach(bar => {
        const element = document.getElementById(bar.id);
        if (element) {
            const value = bar.value;
            if (value > 70) {
                element.style.background = '#4CAF50';
            } else if (value > 40) {
                element.style.background = '#FFA726';
            } else {
                element.style.background = '#f44336';
            }
        }
    });
}

// ============================================
// СТАТУС ПИТОМЦА
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
// БЕЗОПАСНОЕ ДЕЙСТВИЕ
// ============================================
function secureAction(action, callback, requireItem = null) {
    if (typeof callback !== 'function') {
        console.error('❌ Callback не является функцией');
        return false;
    }
    
    if (security) {
        try {
            const check = security.checkAction(action, state);
            if (!check.allowed) {
                showNotification('⛔ ' + check.reason);
                return false;
            }
        } catch (e) {
            console.warn('⚠️ Ошибка проверки безопасности:', e);
        }
    }
    
    if (requireItem && state.inventory[requireItem] <= 0) {
        showNotification(`❌ Нет ${getItemName(requireItem)}! Купите в магазине.`);
        return false;
    }
    
    try {
        callback();
        saveGame();
        updateUI();
        return true;
    } catch (e) {
        console.error('❌ Ошибка действия:', e);
        showNotification('❌ Произошла ошибка');
        return false;
    }
}

function getItemName(type) {
    const names = {
        food: 'еды',
        toy: 'игрушек',
        medicine: 'лекарств',
        skin: 'скинов'
    };
    return names[type] || type;
}

// ============================================
// ДЕЙСТВИЯ С ПИТОМЦЕМ
// ============================================
function feedPet() {
    secureAction('feed', () => {
        state.pet.hunger = Math.min(100, state.pet.hunger + 25);
        state.inventory.food--;
        addExp(10);
        state.pet.lastFed = Date.now();
        showNotification('🍕 Питомец покормлен! +25 сытости');
    }, 'food');
}

function playPet() {
    secureAction('play', () => {
        state.pet.mood = Math.min(100, state.pet.mood + 20);
        state.pet.energy = Math.max(0, state.pet.energy - 10);
        state.inventory.toy--;
        addExp(15);
        state.pet.lastPlayed = Date.now();
        showNotification('🎮 Игра с питомцем! +20 настроения');
    }, 'toy');
}

function healPet() {
    secureAction('heal', () => {
        state.pet.health = Math.min(100, state.pet.health + 30);
        state.inventory.medicine--;
        addExp(12);
        state.pet.lastHealed = Date.now();
        showNotification('💊 Питомец вылечен! +30 здоровья');
    }, 'medicine');
}

function sleepPet() {
    secureAction('sleep', () => {
        state.pet.energy = Math.min(100, state.pet.energy + 35);
        state.pet.health = Math.min(100, state.pet.health + 5);
        addExp(8);
        state.pet.lastSlept = Date.now();
        showNotification('😴 Питомец отдохнул! +35 энергии');
    });
}

// ============================================
// СИСТЕМА УРОВНЕЙ
// ============================================
function addExp(amount) {
    state.pet.exp += amount;
    while (state.pet.exp >= state.pet.expToNext) {
        levelUp();
    }
}

function levelUp() {
    state.pet.level++;
    state.pet.exp -= state.pet.expToNext;
    state.pet.expToNext = Math.floor(state.pet.expToNext * 1.5);
    
    const bonusCoins = 50 + (state.pet.level - 1) * 10;
    const bonusDiamonds = 5 + Math.floor((state.pet.level - 1) / 5);
    
    state.user.coins = Math.floor(state.user.coins) + bonusCoins;
    state.user.diamonds = Math.floor(state.user.diamonds) + bonusDiamonds;
    
    showNotification(`🎉 Уровень ${state.pet.level}! Получено: 🪙${bonusCoins} 💎${bonusDiamonds}`);
    saveGame();
    updateUI();
}

// ============================================
// МАГАЗИН (ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ)
// ============================================
function buyItem(type) {
    // ЦЕНЫ ТОВАРОВ
    const prices = {
        food: { coins: 10, diamonds: 0, name: 'Еда', emoji: '🍕' },
        toy: { coins: 15, diamonds: 0, name: 'Игрушка', emoji: '🧸' },
        medicine: { coins: 20, diamonds: 0, name: 'Лекарство', emoji: '💊' },
        skin: { coins: 0, diamonds: 5, name: 'Скин', emoji: '🎨' }
    };
    
    const price = prices[type];
    if (!price) {
        showNotification('❌ Неизвестный товар');
        return;
    }
    
    // ТЕКУЩИЕ СРЕДСТВА
    const currentCoins = Math.floor(state.user.coins);
    const currentDiamonds = Math.floor(state.user.diamonds);
    
    // ПРОВЕРКА МОНЕТ
    if (price.coins > 0 && currentCoins < price.coins) {
        showNotification(`❌ Недостаточно монет! Нужно ${price.coins}, у вас ${currentCoins}`);
        return;
    }
    
    // ПРОВЕРКА АЛМАЗОВ
    if (price.diamonds > 0 && currentDiamonds < price.diamonds) {
        showNotification(`❌ Недостаточно алмазов! Нужно ${price.diamonds}, у вас ${currentDiamonds}`);
        return;
    }
    
    // 💰 СПИСАНИЕ СРЕДСТВ
    state.user.coins = Math.max(0, currentCoins - price.coins);
    state.user.diamonds = Math.max(0, currentDiamonds - price.diamonds);
    
    // 🎁 ВЫДАЧА ТОВАРА
    if (type === 'skin') {
        changePetSkin();
    } else {
        state.inventory[type] = (state.inventory[type] || 0) + 1;
    }
    
    // ⭐ ВАЖНО: ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ UI ⭐
    updateUI();
    updateCurrencyDisplay(); // ДОПОЛНИТЕЛЬНОЕ ОБНОВЛЕНИЕ
    saveGame();
    
    // 📢 УВЕДОМЛЕНИЕ С ДЕТАЛЯМИ
    const message = `✅ Куплено: ${price.emoji} ${price.name}!
🪙 ${currentCoins} → ${state.user.coins} монет
💎 ${currentDiamonds} → ${state.user.diamonds} алмазов`;
    showNotification(message);
    
    console.log('🛒 Покупка завершена:', {
        товар: type,
        цена: price.coins,
        монет_было: currentCoins,
        монет_стало: state.user.coins
    });
}

function changePetSkin() {
    const skins = ['🐣', '🐥', '🐔', '🦆', '🐦', '🐧', '🐤', '🦅', '🦉', '🦜'];
    const currentIndex = skins.indexOf(state.pet.emoji);
    const nextIndex = (currentIndex + 1) % skins.length;
    state.pet.emoji = skins[nextIndex];
    
    if (!state.inventory.skins.includes(state.pet.emoji)) {
        state.inventory.skins.push(state.pet.emoji);
    }
    showNotification('🎨 Скин изменен!');
}

// ============================================
// РЕФЕРАЛЬНАЯ СИСТЕМА
// ============================================
function generateReferralLink() {
    const userId = state.user.id;
    const botUsername = 'YourBotUsername';
    const link = `https://t.me/${botUsername}?start=ref_${userId}`;
    if (elements.refLink) {
        elements.refLink.textContent = link;
    }
}

function shareReferral() {
    const link = elements.refLink ? elements.refLink.textContent : '';
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: '👥 Пригласить друга',
            message: `Пригласи друга и получи бонус 50 монет!\nСсылка: ${link}`,
            buttons: [{ type: 'ok' }]
        });
    } else {
        navigator.clipboard.writeText(link).then(() => {
            showNotification('📋 Ссылка скопирована!');
        });
    }
}

function applyReferral(refId) {
    if (refId && refId !== state.user.id) {
        state.user.referrals = (state.user.referrals || 0) + 1;
        state.user.coins = Math.floor(state.user.coins) + 50;
        showNotification('🎉 Реферал добавлен! Получено 50 монет!');
        saveGame();
        updateUI();
    }
}

// ============================================
// ИГРОВОЙ ЦИКЛ (ОБНОВЛЯЕТ ПАРАМЕТРЫ)
// ============================================
function startGameLoop() {
    console.log('🔄 Игровой цикл запущен (обновление каждые 5 секунд)');
    
    // Первое обновление через 1 секунду
    setTimeout(() => {
        updateGameStats();
    }, 1000);
    
    // Затем каждые 5 секунд
    const intervalId = setInterval(() => {
        updateGameStats();
    }, 5000);
    
    // Сохраняем ID интервала для возможности остановки
    window.gameLoopInterval = intervalId;
}

function updateGameStats() {
    // Уменьшаем характеристики
    state.pet.hunger = Math.max(0, state.pet.hunger - 2);
    state.pet.energy = Math.max(0, state.pet.energy - 1.5);
    state.pet.mood = Math.max(0, state.pet.mood - 1);
    state.pet.health = Math.max(0, state.pet.health - 0.5);
    
    // Логируем изменения (для отладки)
    console.log('📉 Характеристики уменьшены:', {
        hunger: Math.round(state.pet.hunger),
        energy: Math.round(state.pet.energy),
        mood: Math.round(state.pet.mood),
        health: Math.round(state.pet.health)
    });
    
    // Проверка на смерть
    if (state.pet.health <= 0) {
        console.warn('💀 Питомец умер!');
        showNotification('💀 Питомец умер! Восстановление...');
        state.pet.health = 50;
        state.pet.energy = 50;
        state.pet.mood = 50;
        state.pet.hunger = 50;
        state.user.coins = Math.max(0, Math.floor(state.user.coins) - 20);
    }
    
    // Пассивный доход
    if (Math.random() < 0.05) {
        const bonus = Math.floor(Math.random() * 3) + 1;
        state.user.coins = Math.floor(state.user.coins) + bonus;
        console.log(`💰 Пассивный доход: +${bonus} монет`);
    }
    
    state.user.totalPlayTime += 5;
    
    // Сохраняем и обновляем UI
    saveGame();
    updateUI();
}

// ============================================
// ЕЖЕДНЕВНЫЙ БОНУС
// ============================================
function checkDailyBonus() {
    const now = Date.now();
    const lastLogin = state.user.lastLogin || 0;
    const dayInMs = 86400000;
    
    if (now - lastLogin > dayInMs) {
        const streak = state.user.loginStreak || 0;
        const newStreak = now - lastLogin < dayInMs * 2 ? streak + 1 : 1;
        state.user.loginStreak = newStreak;
        
        const bonusCoins = 50 + newStreak * 10;
        const bonusDiamonds = 5 + Math.floor(newStreak / 3);
        
        state.user.coins = Math.floor(state.user.coins) + bonusCoins;
        state.user.diamonds = Math.floor(state.user.diamonds) + bonusDiamonds;
        state.user.lastLogin = now;
        
        showNotification(`🎁 Ежедневный бонус!\n🪙 +${bonusCoins} монет\n💎 +${bonusDiamonds} алмазов\n🔥 ${newStreak} день подряд!`);
        saveGame();
        updateUI();
    }
}

// ============================================
// РЕЙТИНГ
// ============================================
function updateRating() {
    const pet = state.pet;
    const user = state.user;
    
    const ratingScore = 
        (pet.health + pet.energy + pet.mood + pet.hunger) * 0.1 +
        pet.level * 10 +
        user.coins * 0.01 +
        user.referrals * 50;
    
    user.rating = Math.floor(ratingScore);
    updateRatingList();
}

function updateRatingList() {
    const ratingItems = [
        { name: '🏆 ' + state.user.name, score: state.user.rating },
        { name: '🥈 Игрок2', score: 850 },
        { name: '🥉 Игрок3', score: 720 }
    ];
    
    if (elements.ratingList) {
        elements.ratingList.innerHTML = ratingItems
            .map((item, index) => 
                `<div class="rating-item">${index + 1}. ${item.name} - ${item.score} очков</div>`
            )
            .join('');
    }
}

// ============================================
// НАВИГАЦИЯ
// ============================================
function setupNavigation() {
    const buttons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('section');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section;
            
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            sections.forEach(s => s.classList.remove('active'));
            const target = document.getElementById(sectionId);
            if (target) {
                target.classList.add('active');
                if (sectionId === 'ratingSection') {
                    updateRating();
                }
            }
        });
    });
}

// ============================================
// НАСТРОЙКА КНОПОК
// ============================================
function setupButtons() {
    console.log('🔧 Настройка кнопок...');
    
    // Кнопки действий с питомцем
    const feedBtn = document.getElementById('feedBtn') || document.querySelector('[onclick="feedPet()"]');
    const playBtn = document.getElementById('playBtn') || document.querySelector('[onclick="playPet()"]');
    const healBtn = document.getElementById('healBtn') || document.querySelector('[onclick="healPet()"]');
    const sleepBtn = document.getElementById('sleepBtn') || document.querySelector('[onclick="sleepPet()"]');
    
    if (feedBtn) {
        feedBtn.addEventListener('click', function(e) {
            e.preventDefault();
            feedPet();
        });
    }
    if (playBtn) {
        playBtn.addEventListener('click', function(e) {
            e.preventDefault();
            playPet();
        });
    }
    if (healBtn) {
        healBtn.addEventListener('click', function(e) {
            e.preventDefault();
            healPet();
        });
    }
    if (sleepBtn) {
        sleepBtn.addEventListener('click', function(e) {
            e.preventDefault();
            sleepPet();
        });
    }
    
    // Кнопки магазина
    document.querySelectorAll('.item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const onclick = this.getAttribute('onclick');
            if (onclick) {
                const match = onclick.match(/buyItem\('(\w+)'\)/);
                if (match && match[1]) {
                    buyItem(match[1]);
                }
            } else {
                const itemType = this.dataset.item;
                if (itemType) {
                    buyItem(itemType);
                }
            }
        });
    });
    
    // Кнопка реферальной ссылки
    const shareBtn = document.getElementById('shareBtn') || document.querySelector('[onclick="shareReferral()"]');
    if (shareBtn) {
        shareBtn.addEventListener('click', function(e) {
            e.preventDefault();
            shareReferral();
        });
    }
    
    console.log('✅ Кнопки настроены');
}

// ============================================
// СОХРАНЕНИЕ
// ============================================
function saveGame() {
    state._timestamp = Date.now();
    
    try {
        if (SecureSave) {
            state._checksum = SecureSave.generateChecksum(state);
            return SecureSave.secureSave(state);
        } else {
            localStorage.setItem('tamagochi_save', JSON.stringify(state));
            return true;
        }
    } catch (e) {
        console.error('❌ Ошибка сохранения:', e);
        return false;
    }
}

// ============================================
// УВЕДОМЛЕНИЯ
// ============================================
function showNotification(message) {
    console.log('📢', message);
    
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: '🐾 Тамагочи',
            message: message,
            buttons: [{ type: 'ok' }]
        });
    } else {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            z-index: 1000;
            max-width: 90%;
            text-align: center;
            animation: slideDown 0.3s ease;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-size: 16px;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
}

// ============================================
// ТЕМА TELEGRAM
// ============================================
function setupTelegramTheme() {
    if (tg && tg.themeParams) {
        const theme = tg.themeParams;
        document.documentElement.style.setProperty('--bg-primary', theme.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--bg-secondary', theme.secondary_bg_color || '#f0f0f0');
        document.documentElement.style.setProperty('--text-primary', theme.text_color || '#000000');
        document.documentElement.style.setProperty('--text-secondary', theme.hint_color || '#333333');
        document.documentElement.style.setProperty('--button-bg', theme.button_color || '#0088cc');
        document.documentElement.style.setProperty('--button-text', theme.button_text_color || '#ffffff');
        document.documentElement.style.setProperty('--border-color', theme.hint_color || '#e0e0e0');
    }
}

// ============================================
// КОНСОЛЬНЫЕ КОМАНДЫ ДЛЯ ОТЛАДКИ
// ============================================
function debugStats() {
    console.log('📊 Текущие параметры:', {
        health: state.pet.health,
        energy: state.pet.energy,
        mood: state.pet.mood,
        hunger: state.pet.hunger,
        level: state.pet.level,
        coins: state.user.coins
    });
}

function testDecrease() {
    console.log('🧪 Принудительное уменьшение параметров...');
    state.pet.hunger = Math.max(0, state.pet.hunger - 10);
    state.pet.energy = Math.max(0, state.pet.energy - 10);
    state.pet.mood = Math.max(0, state.pet.mood - 10);
    state.pet.health = Math.max(0, state.pet.health - 10);
    updateUI();
    saveGame();
    debugStats();
}

// ============================================
// ГЛОБАЛЬНЫЙ ДОСТУП
// ============================================
window.feedPet = feedPet;
window.playPet = playPet;
window.healPet = healPet;
window.sleepPet = sleepPet;
window.buyItem = buyItem;
window.shareReferral = shareReferral;
window.applyReferral = applyReferral;
window.showNotification = showNotification;
window.state = state;
window.security = security;
window.updateUI = updateUI;
window.saveGame = saveGame;
window.debugStats = debugStats;
window.testDecrease = testDecrease;
window.restartGame = function() {
    saveGame();
    location.reload();
};

// ============================================
// ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен');
    init();
});

console.log('📦 app.js загружен');
