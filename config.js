// ============================================
// CONFIG.JS - КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

// ⭐ ЗАМЕНИТЕ НА СВОИ ДАННЫЕ ⭐
export const CONFIG = {
    // Берем значения из переменных окружения
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_KEY: process.env.SUPABASE_KEY || '',
    BOT_USERNAME: process.env.BOT_USERNAME || '',
    
    // Настройки игры
    MAX_ACTIONS_PER_MINUTE: 20,
    MAX_COINS: 99999999,
    MAX_DIAMONDS: 9999999,
    MAX_LEVEL: 10000,
    COOLDOWN_SECONDS: 1,
    AUTO_SAVE_INTERVAL: 30000,
    GAME_LOOP_INTERVAL: 5000,
    
    // Бонусы
    DAILY_BONUS_COINS: 50,
    DAILY_BONUS_DIAMONDS: 5,
    REFERRAL_BONUS_COINS: 50,
    REFERRAL_BONUS_DIAMONDS: 5,
    REFERRAL_BONUS_EXP: 20,
    
    // Цены в магазине
    SHOP_PRICES: {
        food: { coins: 10, diamonds: 0, name: 'Еда', emoji: '🍕' },
        toy: { coins: 15, diamonds: 0, name: 'Игрушка', emoji: '🧸' },
        medicine: { coins: 20, diamonds: 0, name: 'Лекарство', emoji: '💊' },
        skin: { coins: 0, diamonds: 5, name: 'Скин', emoji: '🎨' }
    },
    
    // Скины
    SKINS: ['🐣', '🐥', '🐔', '🦆', '🐦', '🐧', '🐤', '🦅', '🦉', '🦜'],
    
    // Уровни опыта
    EXP_PER_ACTION: {
        feed: 10,
        play: 15,
        heal: 12,
        sleep: 8
    },
    
    // Уменьшение характеристик
    DECREASE_RATE: {
        hunger: 2,
        energy: 1.5,
        mood: 1,
        health: 0.5
    },
    
    // Бонусы за уровень
    LEVEL_BONUS: {
        coins: 50,
        coinsPerLevel: 10,
        diamonds: 5,
        diamondsPerLevel: 5
    }
};
