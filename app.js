// Импорт модуля безопасности
// Для использования добавьте в начале файла:
// import { Security, SecureSave } from './security.js';

// Если без модулей, используйте глобальную переменную:
const security = window.security;

// Инициализация с защитой
function initSecure() {
    // Проверка целостности
    const gameData = SecureSave.secureLoad();
    
    if (gameData) {
        // Восстановление сохранения
        Object.assign(state, gameData);
        console.log('✅ Данные загружены безопасно');
    } else {
        console.log('ℹ️ Новое сохранение');
    }
    
    // Установка защищенных данных
    state._sessionId = security.security.sessionId;
    state._fingerprint = security.multiAccount.fingerprint;
    
    // Обычная инициализация
    init();
}

// Защищенное сохранение
function secureSave() {
    const data = {
        pet: state.pet,
        user: state.user,
        inventory: state.inventory,
        _sessionId: state._sessionId
    };
    
    // Проверка перед сохранением
    const check = security.checkAction('save', data);
    if (!check.allowed) {
        console.warn('⚠️ Сохранение заблокировано:', check.reason);
        return false;
    }
    
    // Безопасное сохранение
    return SecureSave.secureSave(data);
}

// Защищенные действия
function secureAction(action, callback) {
    const check = security.checkAction(action, state);
    if (!check.allowed) {
        showNotification('⛔ ' + check.reason);
        return false;
    }
    
    try {
        callback();
        secureSave();
        return true;
    } catch (e) {
        console.error('Ошибка действия:', e);
        showNotification('❌ Произошла ошибка');
        return false;
    }
}

// Защищенное кормление
function secureFeedPet() {
    secureAction('feed', () => {
        if (state.inventory.food > 0) {
            state.pet.hunger = Math.min(100, state.pet.hunger + 30);
            state.inventory.food--;
            addExp(10);
            updateUI();
            showNotification('🍕 Питомец покормлен!');
        } else {
            showNotification('❌ Нет еды!');
        }
    });
}

// Защищенная игра
function securePlayPet() {
    secureAction('play', () => {
        if (state.inventory.toy > 0) {
            state.pet.mood = Math.min(100, state.pet.mood + 25);
            state.pet.energy = Math.max(0, state.pet.energy - 15);
            state.inventory.toy--;
            addExp(15);
            updateUI();
            showNotification('🎮 Игра с питомцем!');
        } else {
            showNotification('❌ Нет игрушек!');
        }
    });
}

// Защищенное лечение
function secureHealPet() {
    secureAction('heal', () => {
        if (state.inventory.medicine > 0) {
            state.pet.health = Math.min(100, state.pet.health + 35);
            state.inventory.medicine--;
            addExp(12);
            updateUI();
            showNotification('💊 Питомец вылечен!');
        } else {
            showNotification('❌ Нет лекарств!');
        }
    });
}

// Защищенный сон
function secureSleepPet() {
    secureAction('sleep', () => {
        state.pet.energy = Math.min(100, state.pet.energy + 40);
        state.pet.health = Math.min(100, state.pet.health + 5);
        addExp(8);
        updateUI();
        showNotification('😴 Питомец отдохнул!');
    });
}

// Защищенная покупка
function secureBuyItem(type) {
    secureAction('buy', () => {
        const prices = {
            food: { coins: 10, diamonds: 0 },
            toy: { coins: 20, diamonds: 0 },
            medicine: { coins: 30, diamonds: 0 },
            skin: { coins: 0, diamonds: 5 }
        };
        
        const price = prices[type];
        if (!price) return;
        
        if (price.coins > 0 && state.user.coins < price.coins) {
            showNotification('❌ Недостаточно монет!');
            return;
        }
        if (price.diamonds > 0 && state.user.diamonds < price.diamonds) {
            showNotification('❌ Недостаточно алмазов!');
            return;
        }
        
        state.user.coins -= price.coins;
        state.user.diamonds -= price.diamonds;
        
        if (type === 'skin') {
            changePetSkin();
        } else {
            state.inventory[type] = (state.inventory[type] || 0) + 1;
        }
        
        updateUI();
        showNotification('✅ Куплено!');
    });
}

// Переопределение функций безопасности
window.feedPet = secureFeedPet;
window.playPet = securePlayPet;
window.healPet = secureHealPet;
window.sleepPet = secureSleepPet;
window.buyItem = secureBuyItem;

// Запуск с защитой
document.addEventListener('DOMContentLoaded', initSecure);

// Периодическая проверка безопасности
setInterval(() => {
    const status = security.getSecurityStatus();
    if (status.antiCheat.flags.speedHack || 
        status.antiCheat.flags.memoryHack || 
        status.antiCheat.flags.debuggerDetected) {
        console.warn('⚠️ Обнаружена угроза!');
        // Можно применить меры: сброс данных, блокировка и т.д.
    }
}, 10000);

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние игры
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
        id: tg.initDataUnsafe?.user?.id || 'guest',
        name: tg.initDataUnsafe?.user?.first_name || 'Гость',
        coins: 100,
        diamonds: 10,
        rating: 0,
        referrals: 0
    },
    inventory: {
        food: 0,
        toy: 0,
        medicine: 0,
        skins: []
    }
};

// DOM элементы
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
    refLink: document.getElementById('refLink')
};

// Инициализация
function init() {
    loadGame();
    updateUI();
    setupNavigation();
    startGameLoop();
    generateReferralLink();
    setupTelegramTheme();
}

// Загрузка сохранений
function loadGame() {
    const saved = localStorage.getItem('tamagochi_save');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            Object.assign(state, data);
        } catch (e) {
            console.error('Ошибка загрузки сохранения');
        }
    }
}

// Сохранение игры
function saveGame() {
    try {
        localStorage.setItem('tamagochi_save', JSON.stringify(state));
    } catch (e) {
        console.error('Ошибка сохранения');
    }
}

// Обновление UI
function updateUI() {
    const pet = state.pet;
    const user = state.user;
    
    elements.petEmoji.textContent = pet.emoji;
    elements.petName.textContent = pet.name;
    elements.petStatus.textContent = getPetStatus();
    elements.healthBar.style.width = pet.health + '%';
    elements.energyBar.style.width = pet.energy + '%';
    elements.moodBar.style.width = pet.mood + '%';
    elements.hungerBar.style.width = pet.hunger + '%';
    elements.userName.textContent = user.name;
    elements.userLevel.textContent = `Уровень ${pet.level}`;
    elements.coins.textContent = `🪙 ${user.coins}`;
    elements.diamonds.textContent = `💎 ${user.diamonds}`;
}

// Получение статуса питомца
function getPetStatus() {
    const avg = (state.pet.health + state.pet.energy + state.pet.mood + state.pet.hunger) / 4;
    if (avg > 80) return '🌟 Счастлив';
    if (avg > 60) return '😊 Доволен';
    if (avg > 40) return '😐 Нормально';
    if (avg > 20) return '😢 Грустен';
    return '💀 Очень плохо';
}

// Действия с питомцем
function feedPet() {
    if (state.inventory.food > 0) {
        state.pet.hunger = Math.min(100, state.pet.hunger + 30);
        state.inventory.food--;
        addExp(10);
        saveGame();
        updateUI();
        showNotification('🍕 Питомец покормлен!');
    } else {
        showNotification('❌ Нет еды! Купите в магазине.');
    }
}

function playPet() {
    if (state.inventory.toy > 0) {
        state.pet.mood = Math.min(100, state.pet.mood + 25);
        state.pet.energy = Math.max(0, state.pet.energy - 15);
        state.inventory.toy--;
        addExp(15);
        saveGame();
        updateUI();
        showNotification('🎮 Игра с питомцем!');
    } else {
        showNotification('❌ Нет игрушек! Купите в магазине.');
    }
}

function healPet() {
    if (state.inventory.medicine > 0) {
        state.pet.health = Math.min(100, state.pet.health + 35);
        state.inventory.medicine--;
        addExp(12);
        saveGame();
        updateUI();
        showNotification('💊 Питомец вылечен!');
    } else {
        showNotification('❌ Нет лекарств! Купите в магазине.');
    }
}

function sleepPet() {
    state.pet.energy = Math.min(100, state.pet.energy + 40);
    state.pet.health = Math.min(100, state.pet.health + 5);
    addExp(8);
    saveGame();
    updateUI();
    showNotification('😴 Питомец отдохнул!');
}

// Добавление опыта
function addExp(amount) {
    state.pet.exp += amount;
    if (state.pet.exp >= state.pet.expToNext) {
        levelUp();
    }
}

// Повышение уровня
function levelUp() {
    state.pet.level++;
    state.pet.exp = 0;
    state.pet.expToNext = Math.floor(state.pet.expToNext * 1.5);
    state.user.coins += 50;
    state.user.diamonds += 5;
    showNotification(`🎉 Уровень повышен! Теперь ${state.pet.level} уровень!`);
    saveGame();
    updateUI();
}

// Магазин
function buyItem(type) {
    const prices = {
        food: { coins: 10, diamonds: 0 },
        toy: { coins: 20, diamonds: 0 },
        medicine: { coins: 30, diamonds: 0 },
        skin: { coins: 0, diamonds: 5 }
    };
    
    const price = prices[type];
    if (!price) return;
    
    if (price.coins > 0 && state.user.coins < price.coins) {
        showNotification('❌ Недостаточно монет!');
        return;
    }
    if (price.diamonds > 0 && state.user.diamonds < price.diamonds) {
        showNotification('❌ Недостаточно алмазов!');
        return;
    }
    
    state.user.coins -= price.coins;
    state.user.diamonds -= price.diamonds;
    
    if (type === 'skin') {
        changePetSkin();
    } else {
        state.inventory[type] = (state.inventory[type] || 0) + 1;
    }
    
    saveGame();
    updateUI();
    showNotification(`✅ Куплено!`);
}

// Смена скина
function changePetSkin() {
    const skins = ['🐣', '🐥', '🐔', '🦆', '🐦', '🐧'];
    const currentIndex = skins.indexOf(state.pet.emoji);
    const nextIndex = (currentIndex + 1) % skins.length;
    state.pet.emoji = skins[nextIndex];
    showNotification('🎨 Скин изменен!');
}

// Игровой цикл
function startGameLoop() {
    setInterval(() => {
        // Постепенное уменьшение показателей
        state.pet.hunger = Math.max(0, state.pet.hunger - 2);
        state.pet.energy = Math.max(0, state.pet.energy - 1.5);
        state.pet.mood = Math.max(0, state.pet.mood - 1);
        state.pet.health = Math.max(0, state.pet.health - 0.5);
        
        // Проверка на смерть
        if (state.pet.health <= 0) {
            showNotification('💀 Питомец умер! Восстановление...');
            state.pet.health = 50;
            state.pet.energy = 50;
            state.pet.mood = 50;
            state.pet.hunger = 50;
        }
        
        // Начисление монет
        if (Math.random() < 0.1) {
            state.user.coins += Math.floor(Math.random() * 5) + 1;
        }
        
        saveGame();
        updateUI();
    }, 5000);
}

// Навигация
function setupNavigation() {
    const buttons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('section');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            
            // Обновление активной кнопки
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Показ нужной секции
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
        });
    });
}

// Реферальная система
function generateReferralLink() {
    const userId = state.user.id;
    const link = `https://t.me/YourBotUsername?start=ref_${userId}`;
    elements.refLink.textContent = link;
}

function shareReferral() {
    const link = elements.refLink.textContent;
    if (tg) {
        tg.showPopup({
            title: 'Пригласить друга',
            message: `Пригласи друга и получи бонус!\nСсылка: ${link}`,
            buttons: [{ type: 'ok' }]
        });
    } else {
        navigator.clipboard.writeText(link).then(() => {
            showNotification('📋 Ссылка скопирована!');
        });
    }
}

// Уведомления
function showNotification(message) {
    if (tg) {
        tg.showPopup({
            title: 'Уведомление',
            message: message,
            buttons: [{ type: 'ok' }]
        });
    } else {
        alert(message);
    }
}

// Адаптация под тему Telegram
function setupTelegramTheme() {
    if (tg && tg.themeParams) {
        const theme = tg.themeParams;
        document.documentElement.style.setProperty('--bg-primary', theme.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--text-primary', theme.text_color || '#000000');
        document.documentElement.style.setProperty('--button-bg', theme.button_color || '#0088cc');
    }
}

// Запуск
document.addEventListener('DOMContentLoaded', init);

// Экспорт функций для использования в HTML
window.feedPet = feedPet;
window.playPet = playPet;
window.healPet = healPet;
window.sleepPet = sleepPet;
window.buyItem = buyItem;
window.shareReferral = shareReferral;