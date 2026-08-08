// ============================================
// SUPABASE.JS - ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ
// ============================================

// Импорт Supabase SDK
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ============================================
// ⭐ КОНФИГУРАЦИЯ SUPABASE (ЗАМЕНИТЕ НА СВОЮ)
// ============================================
const supabaseConfig = {
    // Получить на https://supabase.com/dashboard
    url: 'https://gudhvphbswxromqounrg.supabase.co',        // ЗАМЕНИТЕ
    key: 'sb_publishable_6M1psOkWH67SbuqZFJR6-A_0vB6LTQB'  // ЗАМЕНИТЕ
};

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
const supabase = createClient(supabaseConfig.url, supabaseConfig.key);

// ============================================
// КЛАСС ДЛЯ РАБОТЫ С БАЗОЙ
// ============================================
class CloudDatabase {
    constructor() {
        this.supabase = supabase;
        this.table = 'players';
        this.connected = false;
        this.initConnection();
    }

    // Проверка подключения
    async initConnection() {
        try {
            const { data, error } = await this.supabase
                .from(this.table)
                .select('count')
                .limit(1);
            
            if (!error) {
                this.connected = true;
                console.log('✅ Supabase подключен');
            } else {
                console.warn('⚠️ Ошибка подключения к Supabase:', error);
            }
        } catch (e) {
            console.warn('⚠️ Supabase не доступен, работаем офлайн');
            this.connected = false;
        }
    }

    // ============================================
    // СОХРАНЕНИЕ ДАННЫХ ИГРОКА
    // ============================================
    async savePlayer(userId, data) {
        try {
            const saveData = {
                user_id: userId,
                user_name: data.user?.name || 'Гость',
                pet_name: data.pet?.name || 'Питомец',
                pet_emoji: data.pet?.emoji || '🐣',
                health: Math.round(data.pet?.health || 100),
                energy: Math.round(data.pet?.energy || 100),
                mood: Math.round(data.pet?.mood || 100),
                hunger: Math.round(data.pet?.hunger || 100),
                level: data.pet?.level || 1,
                exp: Math.round(data.pet?.exp || 0),
                exp_to_next: data.pet?.expToNext || 100,
                coins: Math.round(data.user?.coins || 0),
                diamonds: Math.round(data.user?.diamonds || 0),
                rating: Math.round(data.user?.rating || 0),
                referrals: data.user?.referrals || 0,
                referral_earned: data.user?.referralEarned || 0,
                referral_list: data.user?.referralList || [],
                total_play_time: data.user?.totalPlayTime || 0,
                login_streak: data.user?.loginStreak || 1,
                last_login: data.user?.lastLogin || Date.now(),
                inventory: data.inventory || {},
                updated_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from(this.table)
                .upsert(saveData, { onConflict: 'user_id' });

            if (error) throw error;
            
            console.log('✅ Данные сохранены в Supabase');
            
            // Сохраняем локально как резерв
            localStorage.setItem('tamagochi_cloud_backup', JSON.stringify(data));
            
            return { success: true };
        } catch (e) {
            console.error('❌ Ошибка сохранения в Supabase:', e);
            return { success: false, error: e.message };
        }
    }

    // ============================================
    // ЗАГРУЗКА ДАННЫХ ИГРОКА
    // ============================================
    async loadPlayer(userId) {
        try {
            const { data, error } = await this.supabase
                .from(this.table)
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('ℹ️ Новый игрок, данных нет');
                    return null;
                }
                throw error;
            }

            if (data) {
                console.log('✅ Данные загружены из Supabase');
                return this.convertSupabaseData(data);
            }
            return null;
        } catch (e) {
            console.error('❌ Ошибка загрузки из Supabase:', e);
            // Пытаемся загрузить из локального бэкапа
            const backup = localStorage.getItem('tamagochi_cloud_backup');
            if (backup) {
                console.log('📂 Загружено из локального бэкапа');
                return JSON.parse(backup);
            }
            return null;
        }
    }

    // ============================================
    // КОНВЕРТАЦИЯ ДАННЫХ ИЗ SUPABASE
    // ============================================
    convertSupabaseData(data) {
        return {
            pet: {
                name: data.pet_name || 'Питомец',
                emoji: data.pet_emoji || '🐣',
                health: data.health || 100,
                energy: data.energy || 100,
                mood: data.mood || 100,
                hunger: data.hunger || 100,
                level: data.level || 1,
                exp: data.exp || 0,
                expToNext: data.exp_to_next || 100
            },
            user: {
                id: data.user_id,
                name: data.user_name || 'Гость',
                coins: data.coins || 0,
                diamonds: data.diamonds || 0,
                rating: data.rating || 0,
                referrals: data.referrals || 0,
                referralEarned: data.referral_earned || 0,
                referralList: data.referral_list || [],
                totalPlayTime: data.total_play_time || 0,
                lastLogin: data.last_login || Date.now(),
                loginStreak: data.login_streak || 1
            },
            inventory: data.inventory || {
                food: 2,
                toy: 1,
                medicine: 1,
                skins: ['🐣']
            }
        };
    }

    // ============================================
    // ОБНОВЛЕНИЕ КОНКРЕТНЫХ ПОЛЕЙ
    // ============================================
    async updateField(userId, field, value) {
        try {
            const { error } = await this.supabase
                .from(this.table)
                .update({ 
                    [field]: value,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (e) {
            console.error('❌ Ошибка обновления:', e);
            return false;
        }
    }

    // ============================================
    // УВЕЛИЧЕНИЕ ЗНАЧЕНИЯ
    // ============================================
    async incrementField(userId, field, amount = 1) {
        try {
            // Сначала получаем текущее значение
            const { data, error } = await this.supabase
                .from(this.table)
                .select(field)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            const currentValue = data[field] || 0;
            const newValue = currentValue + amount;

            // Обновляем
            const { error: updateError } = await this.supabase
                .from(this.table)
                .update({ 
                    [field]: newValue,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (updateError) throw updateError;
            return true;
        } catch (e) {
            console.error('❌ Ошибка увеличения:', e);
            return false;
        }
    }

    // ============================================
    // РЕЙТИНГ (ТОП ИГРОКОВ)
    // ============================================
    async getTopPlayers(limitCount = 20) {
        try {
            const { data, error } = await this.supabase
                .from(this.table)
                .select('user_id, user_name, rating, level, coins, diamonds')
                .order('rating', { ascending: false })
                .limit(limitCount);

            if (error) throw error;

            return data.map(player => ({
                id: player.user_id,
                name: player.user_name || 'Гость',
                rating: player.rating || 0,
                level: player.level || 1,
                coins: player.coins || 0,
                diamonds: player.diamonds || 0
            }));
        } catch (e) {
            console.error('❌ Ошибка загрузки рейтинга:', e);
            return this.getLocalTopPlayers();
        }
    }

    getLocalTopPlayers() {
        try {
            const players = JSON.parse(localStorage.getItem('top_players') || '[]');
            return players.sort((a, b) => b.rating - a.rating).slice(0, 20);
        } catch (e) {
            return [];
        }
    }

    // ============================================
    // РЕФЕРАЛЬНАЯ СИСТЕМА
    // ============================================
    async addReferral(referrerId, newUserId) {
        try {
            // Начисляем бонус пригласившему
            await this.incrementField(referrerId, 'referrals', 1);
            await this.incrementField(referrerId, 'coins', 50);
            await this.incrementField(referrerId, 'diamonds', 5);
            await this.incrementField(referrerId, 'referral_earned', 50);
            
            // Добавляем в список рефералов
            const { data, error } = await this.supabase
                .from(this.table)
                .select('referral_list')
                .eq('user_id', referrerId)
                .single();

            if (!error && data) {
                const list = data.referral_list || [];
                if (!list.includes(newUserId)) {
                    list.push(newUserId);
                    await this.updateField(referrerId, 'referral_list', list);
                }
            }
            
            // Начисляем бонус новому игроку
            await this.incrementField(newUserId, 'coins', 25);
            await this.incrementField(newUserId, 'diamonds', 2);
            
            console.log('✅ Реферальный бонус начислен');
            return true;
        } catch (e) {
            console.error('❌ Ошибка начисления бонуса:', e);
            return false;
        }
    }

    // ============================================
    // РЕАЛЬНОЕ ВРЕМЯ (СЛУШАТЕЛЬ)
    // ============================================
    listenToPlayer(userId, callback) {
        const channel = this.supabase
            .channel(`player_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: this.table,
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const data = payload.new;
                    const converted = this.convertSupabaseData(data);
                    callback(converted);
                    console.log('🔄 Данные обновлены в реальном времени');
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }

    // ============================================
    // УДАЛЕНИЕ ДАННЫХ
    // ============================================
    async deletePlayer(userId) {
        try {
            const { error } = await this.supabase
                .from(this.table)
                .delete()
                .eq('user_id', userId);

            if (error) throw error;
            console.log('🗑️ Игрок удален');
            return true;
        } catch (e) {
            console.error('❌ Ошибка удаления:', e);
            return false;
        }
    }

    // ============================================
    // СТАТИСТИКА ПО ВСЕМ ИГРОКАМ
    // ============================================
    async getPlayerStats() {
        try {
            const { data, error } = await this.supabase
                .from(this.table)
                .select('count, avg(level), avg(coins), max(rating)');

            if (error) throw error;

            return {
                totalPlayers: data[0]?.count || 0,
                avgLevel: Math.round(data[0]?.avg || 0),
                avgCoins: Math.round(data[0]?.avg || 0),
                maxRating: data[0]?.max || 0
            };
        } catch (e) {
            console.error('❌ Ошибка получения статистики:', e);
            return null;
        }
    }
}

// ============================================
// ЭКСПОРТ
// ============================================
export const cloudDB = new CloudDatabase();
export { supabase };
