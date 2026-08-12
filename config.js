// ============================================
// CONFIG.JS - КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

// ⭐ ВСТАВЬТЕ СВОИ ДАННЫЕ ⭐
export const CONFIG = {
    // Supabase
    SUPABASE_URL: 'https://wkprlyzvjbxlymweykca.supabase.co',
    SUPABASE_KEY: 'sb_publishable_hR0wJtsFk5wNNHiF-npb9w_4SQ9t4bP',
    BOT_USERNAME: 'nnvtamagochi_bot',
    
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
    
    // Опыт за действия
    EXP_PER_ACTION: {
        feed: 10,
        play: 15,
        heal: 12,
        sleep: 8
    },
    
    // ⭐ НОВАЯ МЕДЛЕННАЯ СКОРОСТЬ УМЕНЬШЕНИЯ ⭐
    DECREASE_RATE: {
        hunger: 0.5,      // Было 2
        energy: 0.3,      // Было 1.5
        mood: 0.2,        // Было 1
        health: 0.1       // Было 0.5
    },
    
    // ⭐ ПОРОГИ ДЛЯ УВЕДОМЛЕНИЙ ⭐
    NOTIFICATION_THRESHOLDS: {
        health: {
            critical: 20,
            low: 40,
            medium: 60
        },
        hunger: {
            critical: 15,
            low: 30,
            medium: 50
        },
        energy: {
            critical: 15,
            low: 30,
            medium: 50
        },
        mood: {
            critical: 15,
            low: 30,
            medium: 50
        }
    },
    
    // ⭐ ИНТЕРВАЛ ПРОВЕРКИ УВЕДОМЛЕНИЙ ⭐
    NOTIFICATION_CHECK_INTERVAL: 30,
    
    // Бонусы за уровень
    LEVEL_BONUS: {
        coins: 50,
        coinsPerLevel: 10,
        diamonds: 5,
        diamondsPerLevel: 5
    }
};
