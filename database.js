// ============================================
// DATABASE.JS - РАБОТА ТОЛЬКО С SUPABASE
// ============================================

import { CONFIG } from './config.js';

// Проверяем, что Supabase загружен
if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase не загружен! Проверьте подключение скрипта.');
}

const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

export class DatabaseManager {
    constructor() {
        this.supabase = supabase;
        this.table = 'players';
        this.connected = false;
        this.initConnection();
    }

    async initConnection() {
        try {
            console.log('🔄 Проверка подключения к Supabase...');
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Таймаут подключения')), 5000)
            );
            
            const connectionPromise = this.supabase
                .from(this.table)
                .select('count')
                .limit(1);
            
            await Promise.race([connectionPromise, timeoutPromise]);
            
            const { error } = await connectionPromise;
            this.connected = !error;
            
            console.log(this.connected ? '✅ Supabase подключен' : '⚠️ Supabase не доступен');
            
            if (!this.connected) {
                console.warn('⚠️ Ошибка подключения:', error);
            }
        } catch (e) {
            this.connected = false;
            console.warn('⚠️ Ошибка подключения к Supabase:', e.message);
        }
    }

    async loadPlayer(userId) {
        try {
            if (!this.connected) {
                throw new Error('Нет подключения к Supabase');
            }

            const { data, error } = await this.supabase
                .from(this.table)
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('ℹ️ Новый игрок в базе');
                    return null;
                }
                throw error;
            }
            return data ? this.convertData(data) : null;
        } catch (e) {
            console.error('❌ Ошибка загрузки:', e);
            throw e;
        }
    }

    async savePlayer(userId, state) {
        try {
            if (!this.connected) {
                throw new Error('Нет подключения к Supabase');
            }

            const saveData = {
                user_id: userId,
                user_name: state.user.name,
                pet_name: state.pet.name,
                pet_emoji: state.pet.emoji,
                health: Math.round(state.pet.health),
                energy: Math.round(state.pet.energy),
                mood: Math.round(state.pet.mood),
                hunger: Math.round(state.pet.hunger),
                level: Math.round(state.pet.level),
                exp: Math.round(state.pet.exp),
                exp_to_next: Math.round(state.pet.expToNext),
                coins: Math.round(state.user.coins),
                diamonds: Math.round(state.user.diamonds),
                rating: Math.round(state.user.rating),
                referrals: Math.round(state.user.referrals || 0),
                referral_earned: Math.round(state.user.referralEarned || 0),
                referral_list: state.user.referralList || [],
                total_play_time: Math.round(state.user.totalPlayTime || 0),
                login_streak: Math.round(state.user.loginStreak || 1),
                last_login: state.user.lastLogin || Date.now(),
                inventory: state.inventory,
                _timestamp: Date.now(),
                updated_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from(this.table)
                .upsert(saveData, { onConflict: 'user_id' });

            if (error) throw error;
            console.log('✅ Данные сохранены в Supabase');
            return true;
        } catch (e) {
            console.error('❌ Ошибка сохранения:', e);
            throw e;
        }
    }

    convertData(data) {
        return {
            pet: {
                name: data.pet_name || 'Питомец',
                emoji: data.pet_emoji || '🐣',
                health: Math.round(data.health || 100),
                energy: Math.round(data.energy || 100),
                mood: Math.round(data.mood || 100),
                hunger: Math.round(data.hunger || 100),
                level: Math.round(data.level || 1),
                exp: Math.round(data.exp || 0),
                expToNext: data.exp_to_next || 100
            },
            user: {
                id: data.user_id,
                name: data.user_name || 'Гость',
                coins: Math.round(data.coins || 0),
                diamonds: Math.round(data.diamonds || 0),
                rating: Math.round(data.rating || 0),
                referrals: Math.round(data.referrals || 0),
                referralEarned: Math.round(data.referral_earned || 0),
                referralList: data.referral_list || [],
                totalPlayTime: Math.round(data.total_play_time || 0),
                loginStreak: Math.round(data.login_streak || 1),
                lastLogin: data.last_login || Date.now()
            },
            inventory: data.inventory || { food: 2, toy: 1, medicine: 1, skins: ['🐣'] },
            _timestamp: data._timestamp || Date.now()
        };
    }

    async getTopPlayers(limit = 50) {
        try {
            if (!this.connected) {
                throw new Error('Нет подключения к Supabase');
            }

            const { data, error } = await this.supabase
                .from(this.table)
                .select('user_name, rating, level, coins, user_id')
                .order('rating', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('❌ Ошибка рейтинга:', e);
            throw e;
        }
    }

    async updateRating(userId, rating) {
        try {
            if (!this.connected) {
                throw new Error('Нет подключения к Supabase');
            }

            const { error } = await this.supabase
                .from(this.table)
                .update({ rating })
                .eq('user_id', userId);
            return !error;
        } catch (e) {
            console.error('❌ Ошибка обновления рейтинга:', e);
            throw e;
        }
    }

    async createNewPlayer(userId, userName) {
        try {
            const newData = {
                user_id: userId,
                user_name: userName || 'Гость',
                pet_name: 'Питомец',
                pet_emoji: '🐣',
                health: 100,
                energy: 100,
                mood: 100,
                hunger: 100,
                level: 1,
                exp: 0,
                exp_to_next: 100,
                coins: 100,
                diamonds: 10,
                rating: 0,
                referrals: 0,
                referral_earned: 0,
                referral_list: [],
                total_play_time: 0,
                login_streak: 1,
                last_login: Date.now(),
                inventory: { food: 2, toy: 1, medicine: 1, skins: ['🐣'] },
                _timestamp: Date.now()
            };

            const { error } = await this.supabase
                .from(this.table)
                .insert(newData);

            if (error) throw error;
            console.log('✅ Новый игрок создан в Supabase');
            return this.convertData(newData);
        } catch (e) {
            console.error('❌ Ошибка создания игрока:', e);
            throw e;
        }
    }
}

export const db = new DatabaseManager();
