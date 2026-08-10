// ============================================
// APP.JS - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================

import { CONFIG } from './config.js';
import { SecurityModule } from './security.js';
import { db } from './database.js';

// ============================================
// 1. TELEGRAM WEBAPP
// ============================================
const tg = window.Telegram.WebApp;
if (tg) tg.expand();

const userData = tg?.initDataUnsafe?.user || {
    id: 'guest_' + Date.now().toString(36),
    first_name: 'Гость'
};

// ============================================
// 2. СОСТОЯНИЕ ИГРЫ
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
        id: userData.id?.toString() || 'guest_' + Date.now().toString(36),
        name: userData.first_name || 'Гость',
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
    _timestamp: Date.now(),
    _version: '2.0'
};

// ============================================
// 3. БЕЗОПАСНОСТЬ
// ============================================
const security = new SecurityModule();

window.showSecurityOverlay = (message) => {
    const overlay = document.getElementById('securityOverlay');
    const msg = document.getElementById('securityMessage');
    if (overlay && msg) {
        msg.textContent = message || 'Подозрительная активность';
        overlay.classList.add('active');
    }
};

window.unlockGame = () => {
    const overlay = document.getElementById('securityOverlay');
    if (overlay) overlay.classList.remove('active');
    if (security) security.unlock();
    document.querySelectorAll('button, .item').forEach(el => {
        el.disabled = false;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
    });
    showNotification('🔓 Доступ восстановлен', 'success');
};

// ============================================
// 4. DOM ЭЛЕМЕНТЫ
// ============================================
const $ = (id) => document.getElementById(id);
const el = {
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
    referralListContainer: $('referralListContainer'),
    statusDot: $('statusDot'),
    levelProgress: $('levelProgress'),
    expDisplay: $('expDisplay')
};

// ============================================
// 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
function clamp(val, min, max) {
    return Math.round(Math.max(min, Math.min(max, val)));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return '0';
    num = Math.floor(num);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

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
// 6. СТАТУС ПОДКЛЮЧЕНИЯ К БАЗЕ
// ============================================
function updateStatusDot() {
    if (!el.statusDot) return;
    
    try {
        if (db && db.connected) {
            el.statusDot.className = 'status-dot online';
        } else {
            el.statusDot.className = 'status-dot offline';
        }
    } catch (e) {
        el.statusDot.className = 'status-dot offline';
    }
}

// ============================================
// 7. РАБОТА С БАЗОЙ ДАННЫХ
// ============================================
async function loadGame() {
    console.log('📂 Загрузка данных...');

    if (db) {
        await db.initConnection();
        updateStatusDot();

        const dbData = await db.loadPlayer(state.user.id);
        if (dbData) {
            Object.assign(state, dbData);
            console.log('✅ Данные загружены из базы');
            return true;
        }
    }

    console.log('ℹ️ Создаем нового игрока');
    resetGame();
    return true;
}

async function saveGame() {
    state._timestamp = Date.now();

    if (db && db.connected) {
        const result = await db.savePlayer(state.user.id, state);
        if (result) {
            updateStatusDot();
            return true;
        }
    }

    updateStatusDot();
    console.warn('⚠️ Нет подключения к базе');
    return false;
}

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
        coins: 100,
        diamonds: 10,
        rating: 0,
        referrals: 0,
        referralEarned: 0,
        referralList: [],
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
    state._timestamp = Date.now();

    saveGame();
}

// ============================================
// 8. ОБНОВЛЕНИЕ UI (ИСПРАВЛЕННОЕ)
// ============================================
function updateUI() {
    const pet = state.pet;
    const user = state.user;

    // Имя пользователя
    if (el.userName) el.userName.textContent = user.name || 'Гость';
    if (el.userLevel) el.userLevel.textContent = `Уровень ${pet.level}`;

    // Прогресс уровня
    if (el.levelProgress && el.expDisplay) {
        const progress = Math.min(100, (pet.exp / pet.expToNext) * 100);
        el.levelProgress.style.width = progress + '%';
        el.expDisplay.textContent = `${Math.floor(pet.exp)} / ${Math.floor(pet.expToNext)}`;
        
        if (progress > 70) {
            el.levelProgress.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
        } else if (progress > 40) {
            el.levelProgress.style.background = 'linear-gradient(90deg, #FFA726, #FF9800)';
        } else {
            el.levelProgress.style.background = 'linear-gradient(90deg, #EF5350, #f44336)';
        }
    }

    // Питомец
    if (el.petEmoji) el.petEmoji.textContent = pet.emoji;
    if (el.petName) el.petName.textContent = pet.name;
    if (el.petStatus) el.petStatus.textContent = getPetStatus();

    // Бары характеристик
    const bars = [
        { id: 'healthBar', value: pet.health },
        { id: 'energyBar', value: pet.energy },
        { id: 'moodBar', value: pet.mood },
        { id: 'hungerBar', value: pet.hunger }
    ];

    bars.forEach(bar => {
        const elBar = document.getElementById(bar.id);
        if (elBar) {
            const v = Math.round(Math.max(0, Math.min(100, bar.value)));
            elBar.style.width = v + '%';
            elBar.textContent = v + '%';

            if (v > 70) {
                elBar.style.background = 'linear-gradient(90deg, #66BB6A, #4CAF50)';
            } else if (v > 40) {
                elBar.style.background = 'linear-gradient(90deg, #FFA726, #FB8C00)';
            } else {
                elBar.style.background = 'linear-gradient(90deg, #EF5350, #C62828)';
            }
        }
    });

    // Валюта
    if (el.coins) el.coins.textContent = `🪙 ${formatNumber(Math.floor(user.coins))}`;
    if (el.diamonds) el.diamonds.textContent = `💎 ${formatNumber(Math.floor(user.diamonds))}`;

    // Рефералы
    updateReferralUI();
    
    // Статус базы
    updateStatusDot();
}

// ============================================
// 9. ДЕЙСТВИЯ С ПИТОМЦЕМ
// ============================================
function secureAction(action, callback, requireItem = null) {
    if (!security) {
        showNotification('❌ Система безопасности не активна', 'error');
        return false;
    }

    if (security.isLocked) {
        showNotification('⛔ Доступ заблокирован', 'error');
        return false;
    }

    const check = security.checkAction(action, state.user.id);
    if (!check.allowed) {
        if (check.critical) {
            showNotification(`⛔ ${check.reason}`, 'error');
            security.triggerSecurity('speed_hack');
        } else {
            showNotification(`⏳ ${check.reason}`, 'warning');
        }
        return false;
    }

    if (requireItem && (state.inventory[requireItem] || 0) <= 0) {
        const names = { food: 'еды', toy: 'игрушек', medicine: 'лекарств' };
        showNotification(`❌ Нет ${names[requireItem] || requireItem}!`, 'error');
        return false;
    }

    try {
        callback();
        updateUI();
        saveGame();
        return true;
    } catch (e) {
        console.error('❌ Ошибка:', e);
        showNotification('❌ Произошла ошибка', 'error');
        return false;
    }
}

function feedPet() {
    secureAction('feed', () => {
        state.pet.hunger = clamp(state.pet.hunger + 25, 0, 100);
        state.inventory.food--;
        addExp(CONFIG.EXP_PER_ACTION.feed);
        showNotification('🍕 Питомец покормлен! +25 сытости', 'success');
    }, 'food');
}

function playPet() {
    secureAction('play', () => {
        state.pet.mood = clamp(state.pet.mood + 20, 0, 100);
        state.pet.energy = clamp(state.pet.energy - 10, 0, 100);
        state.inventory.toy--;
        addExp(CONFIG.EXP_PER_ACTION.play);
        showNotification('🎮 Игра с питомцем! +20 настроения', 'success');
    }, 'toy');
}

function healPet() {
    secureAction('heal', () => {
        state.pet.health = clamp(state.pet.health + 30, 0, 100);
        state.inventory.medicine--;
        addExp(CONFIG.EXP_PER_ACTION.heal);
        showNotification('💊 Питомец вылечен! +30 здоровья', 'success');
    }, 'medicine');
}

function sleepPet() {
    secureAction('sleep', () => {
        state.pet.energy = clamp(state.pet.energy + 35, 0, 100);
        state.pet.health = clamp(state.pet.health + 5, 0, 100);
        addExp(CONFIG.EXP_PER_ACTION.sleep);
        showNotification('😴 Питомец отдохнул! +35 энергии', 'success');
    });
}

// ============================================
// 10. СИСТЕМА УРОВНЕЙ
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

    const bonusCoins = CONFIG.LEVEL_BONUS.coins + (state.pet.level - 1) * CONFIG.LEVEL_BONUS.coinsPerLevel;
    const bonusDiamonds = CONFIG.LEVEL_BONUS.diamonds + Math.floor((state.pet.level - 1) / CONFIG.LEVEL_BONUS.diamondsPerLevel);
    state.user.coins += bonusCoins;
    state.user.diamonds += bonusDiamonds;

    showNotification(`🎉 Уровень ${state.pet.level}! +🪙${bonusCoins} +💎${bonusDiamonds}`, 'success');
    
    // Анимация прогресса
    if (el.levelProgress) {
        el.levelProgress.classList.add('level-up-flash');
        setTimeout(() => {
            el.levelProgress.classList.remove('level-up-flash');
        }, 1000);
    }
    
    saveGame();
    updateUI();
}

// ============================================
// 11. МАГАЗИН
// ============================================
function buyItem(type) {
    const price = CONFIG.SHOP_PRICES[type];
    if (!price) {
        showNotification('❌ Неизвестный товар', 'error');
        return;
    }

    if (security && security.isLocked) {
        showNotification('⛔ Доступ заблокирован', 'error');
        return;
    }

    const coins = Math.floor(state.user.coins);
    const diamonds = Math.floor(state.user.diamonds);

    if (price.coins > 0 && coins < price.coins) {
        showNotification(`❌ Нужно ${price.coins} монет, у вас ${coins}`, 'error');
        return;
    }
    if (price.diamonds > 0 && diamonds < price.diamonds) {
        showNotification(`❌ Нужно ${price.diamonds} алмазов, у вас ${diamonds}`, 'error');
        return;
    }

    state.user.coins = Math.max(0, coins - price.coins);
    state.user.diamonds = Math.max(0, diamonds - price.diamonds);

    if (type === 'skin') {
        changePetSkin();
    } else {
        state.inventory[type] = (state.inventory[type] || 0) + 1;
    }

    showNotification(`✅ Куплено: ${price.emoji} ${price.name}!`, 'success');
    saveGame();
    updateUI();
}

function changePetSkin() {
    const idx = CONFIG.SKINS.indexOf(state.pet.emoji);
    state.pet.emoji = CONFIG.SKINS[(idx + 1) % CONFIG.SKINS.length];
    if (!state.inventory.skins.includes(state.pet.emoji)) {
        state.inventory.skins.push(state.pet.emoji);
    }
    showNotification('🎨 Скин изменен!', 'success');
}

// ============================================
// 12. РЕФЕРАЛЫ
// ============================================
function generateReferralLink() {
    const link = `https://t.me/${CONFIG.BOT_USERNAME}?start=ref_${state.user.id}`;
    if (el.refLink) el.refLink.textContent = link;
    return link;
}

function copyReferralLink() {
    const link = el.refLink?.textContent || generateReferralLink();
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            showNotification('📋 Ссылка скопирована!', 'success');
        });
    } else {
        const input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showNotification('📋 Ссылка скопирована!', 'success');
    }
}

function shareReferral() {
    const link = el.refLink?.textContent || generateReferralLink();

    if (tg?.showPopup) {
        tg.showPopup({
            title: '👥 Пригласить друга',
            message: `Пригласи друга и получи бонус!\n\n🪙 +${CONFIG.REFERRAL_BONUS_COINS} монет\n💎 +${CONFIG.REFERRAL_BONUS_DIAMONDS} алмазов\n⭐ +${CONFIG.REFERRAL_BONUS_EXP} опыта\n\n📋 Ссылка: ${link}`,
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
    if (el.refCount) el.refCount.textContent = state.user.referrals || 0;
    if (el.refEarned) el.refEarned.textContent = state.user.referralEarned || 0;

    if (el.referralListContainer) {
        const list = state.user.referralList || [];
        if (list.length === 0) {
            el.referralListContainer.innerHTML =
                '<p style="color: var(--text-secondary);">👥 Пока нет приглашенных</p>';
        } else {
            el.referralListContainer.innerHTML = list.map((ref, i) =>
                `<div class="referral-item">
                    <span>${i + 1}.</span>
                    <span>${ref.substring(0, 10)}...</span>
                    <span>✅</span>
                </div>`
            ).join('');
        }
    }
}

function applyReferral(refId) {
    if (!refId || refId === state.user.id) return;
    if (state.user.referralList?.includes(refId)) {
        showNotification('❌ Уже приглашен', 'warning');
        return;
    }

    state.user.referrals = (state.user.referrals || 0) + 1;
    state.user.referralEarned = (state.user.referralEarned || 0) + CONFIG.REFERRAL_BONUS_COINS;
    state.user.coins = Math.floor(state.user.coins) + CONFIG.REFERRAL_BONUS_COINS;
    state.user.diamonds = Math.floor(state.user.diamonds) + CONFIG.REFERRAL_BONUS_DIAMONDS;
    state.pet.exp += CONFIG.REFERRAL_BONUS_EXP;

    if (!state.user.referralList) state.user.referralList = [];
    state.user.referralList.push(refId);

    showNotification(`🎉 Реферал добавлен! +${CONFIG.REFERRAL_BONUS_COINS} монет, +${CONFIG.REFERRAL_BONUS_DIAMONDS} алмазов!`, 'success');
    saveGame();
    updateUI();
}

// ============================================
// 13. РЕЙТИНГ
// ============================================
async function updateRating() {
    const { pet, user } = state;

    const newRating = Math.floor(
        (pet.health + pet.energy + pet.mood + pet.hunger) * 0.1 +
        pet.level * 10 +
        user.coins * 0.01 +
        user.referrals * 50
    );

    if (user.rating !== newRating) {
        user.rating = newRating;
        if (db && db.connected) {
            await db.updateRating(user.id, newRating);
        }
        saveGame();
    }

    await updateRatingList();
}

async function updateRatingList() {
    const ratingList = document.getElementById('ratingList');
    if (!ratingList) return;

    try {
        let data = [];
        if (db && db.connected) {
            data = await db.getTopPlayers(50) || [];
        }

        const playersMap = new Map();

        if (data && data.length > 0) {
            data.forEach(p => {
                const key = p.user_id || p.user_name;
                playersMap.set(key, {
                    name: p.user_name || 'Гость',
                    rating: p.rating || 0,
                    level: p.level || 1,
                    isCurrent: (p.user_name === state.user.name) || (p.user_id === state.user.id)
                });
            });
        }

        const currentKey = state.user.id || state.user.name;
        if (!playersMap.has(currentKey)) {
            playersMap.set(currentKey, {
                name: state.user.name || 'Гость',
                rating: state.user.rating || 0,
                level: state.pet.level || 1,
                isCurrent: true
            });
        }

        const sortedPlayers = Array.from(playersMap.values())
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 50);

        if (sortedPlayers.length > 0) {
            ratingList.innerHTML = sortedPlayers.map((player, index) => {
                const medal = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                const isCurrent = player.isCurrent ? ' (Вы)' : '';

                let topClass = '';
                if (index === 0) topClass = 'top1';
                else if (index === 1) topClass = 'top2';
                else if (index === 2) topClass = 'top3';

                return `<div class="rating-item ${topClass} ${player.isCurrent ? 'current-player' : ''}">
                    <span>
                        <span class="medal">${medal}</span>
                        ${player.name}${isCurrent}
                        <span class="level-badge">Ур. ${player.level}</span>
                    </span>
                    <span class="score">${player.rating} ⭐</span>
                </div>`;
            }).join('');
        } else {
            ratingList.innerHTML = `
                <div class="rating-item current-player">
                    <span>👤 ${state.user.name} (Вы)</span>
                    <span class="score">${state.user.rating || 0} ⭐</span>
                </div>
                <div style="text-align:center; padding:20px; color:var(--text-secondary); font-size:14px;">
                    📡 Нет данных для рейтинга
                </div>
            `;
        }

    } catch (e) {
        console.warn('⚠️ Ошибка загрузки рейтинга:', e);
        ratingList.innerHTML = `
            <div class="rating-item current-player">
                <span>👤 ${state.user.name} (Вы)</span>
                <span class="score">${state.user.rating || 0} ⭐</span>
            </div>
            <div style="text-align:center; padding:20px; color:var(--text-secondary); font-size:14px;">
                📡 Рейтинг временно недоступен
            </div>
        `;
    }
}

// ============================================
// 14. ИГРОВОЙ ЦИКЛ
// ============================================
let gameLoopInterval = null;

function startGameLoop() {
    if (gameLoopInterval) clearInterval(gameLoopInterval);

    function updateStats() {
        state.pet.hunger = clamp(state.pet.hunger - CONFIG.DECREASE_RATE.hunger, 0, 100);
        state.pet.energy = clamp(state.pet.energy - CONFIG.DECREASE_RATE.energy, 0, 100);
        state.pet.mood = clamp(state.pet.mood - CONFIG.DECREASE_RATE.mood, 0, 100);
        state.pet.health = clamp(state.pet.health - CONFIG.DECREASE_RATE.health, 0, 100);

        if (state.pet.health <= 0) {
            showNotification('💀 Питомец умер! Восстановление...', 'error');
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
        updateUI();
        saveGame();
    }

    setTimeout(updateStats, 1000);
    gameLoopInterval = setInterval(updateStats, CONFIG.GAME_LOOP_INTERVAL);
}

// ============================================
// 15. ЕЖЕДНЕВНЫЙ БОНУС
// ============================================
function checkDailyBonus() {
    const now = Date.now();
    const lastLogin = state.user.lastLogin || 0;
    const dayMs = 86400000;

    if (now - lastLogin > dayMs) {
        const streak = (now - lastLogin < dayMs * 2) ? (state.user.loginStreak || 0) + 1 : 1;
        state.user.loginStreak = streak;

        const bonusCoins = CONFIG.DAILY_BONUS_COINS + streak * 10;
        const bonusDiamonds = CONFIG.DAILY_BONUS_DIAMONDS + Math.floor(streak / 3);

        state.user.coins += bonusCoins;
        state.user.diamonds += bonusDiamonds;
        state.user.lastLogin = now;

        showNotification(`🎁 Ежедневный бонус!\n🪙 +${bonusCoins} монет\n💎 +${bonusDiamonds} алмазов\n🔥 ${streak} день подряд!`, 'success');
        saveGame();
        updateUI();
    }
}

// ============================================
// 16. УВЕДОМЛЕНИЯ
// ============================================
function showNotification(message, type = 'info') {
    console.log('📢', message);

    if (tg?.showPopup) {
        tg.showPopup({
            title: '🐾 Тамагочи',
            message: message,
            buttons: [{ type: 'ok' }]
        });
        return;
    }

    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const types = {
        success: { icon: '✅' },
        error: { icon: '❌' },
        warning: { icon: '⚠️' },
        info: { icon: '📢' }
    };

    const t = types[type] || types.info;
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <span class="icon">${t.icon}</span>
        <span class="text">${message}</span>
        <span class="close" onclick="this.parentElement.remove()">×</span>
    `;
    container.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ============================================
// 17. НАСТРОЙКИ
// ============================================
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
            const target = document.getElementById(sectionId);
            if (target) target.classList.add('active');
            if (sectionId === 'ratingSection') updateRating();
        });
    });
}

function setupButtons() {
    const feedBtn = document.getElementById('feedBtn');
    const playBtn = document.getElementById('playBtn');
    const healBtn = document.getElementById('healBtn');
    const sleepBtn = document.getElementById('sleepBtn');

    if (feedBtn) feedBtn.addEventListener('click', (e) => { e.preventDefault();
        feedPet(); });
    if (playBtn) playBtn.addEventListener('click', (e) => { e.preventDefault();
        playPet(); });
    if (healBtn) healBtn.addEventListener('click', (e) => { e.preventDefault();
        healPet(); });
    if (sleepBtn) sleepBtn.addEventListener('click', (e) => { e.preventDefault();
        sleepPet(); });

    document.querySelectorAll('.item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const type = el.dataset.item;
            if (type) buyItem(type);
        });
    });

    console.log('✅ Кнопки настроены');
}

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
// 18. ИНИЦИАЛИЗАЦИЯ
// ============================================
async function init() {
    console.log('🚀 Инициализация...');

    if (db) {
        await db.initConnection();
        updateStatusDot();
    }

    await loadGame();
    updateUI();
    setupNavigation();
    setupButtons();
    generateReferralLink();
    setupTelegramTheme();

    startGameLoop();
    checkDailyBonus();
    await updateRating();

    // Автосохранение
    setInterval(() => {
        saveGame();
        console.log('💾 Автосохранение...');
    }, CONFIG.AUTO_SAVE_INTERVAL);

    const startParam = tg?.initDataUnsafe?.start_param;
    if (startParam && startParam.startsWith('ref_')) {
        setTimeout(() => applyReferral(startParam.replace('ref_', '')), 1000);
    }

    console.log('✅ Игра запущена!');
    console.log('📊 Прогресс:', {
        уровень: state.pet.level,
        монет: state.user.coins,
        здоровье: state.pet.health,
        энергия: state.pet.energy,
        настроение: state.pet.mood,
        сытость: state.pet.hunger
    });
    console.log('☁️ База данных:', db && db.connected ? '✅ Подключена' : '⚠️ Офлайн');
}

// ============================================
// 19. ГЛОБАЛЬНЫЙ ДОСТУП
// ============================================
window.feedPet = feedPet;
window.playPet = playPet;
window.healPet = healPet;
window.sleepPet = sleepPet;
window.buyItem = buyItem;
window.shareReferral = shareReferral;
window.copyReferralLink = copyReferralLink;
window.updateUI = updateUI;
window.state = state;
window.security = security;
window.db = db;

window.addEventListener('beforeunload', () => {
    saveGame();
    console.log('💾 Сохранено перед закрытием');
});

// ============================================
// 20. ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен');
    init();
});

console.log('📦 app.js загружен');
