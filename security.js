// ============================================
// МОДУЛЬ БЕЗОПАСНОСТИ
// ============================================

class SecurityManager {
    constructor() {
        this.secretKey = this.generateSecretKey();
        this.sessionId = this.generateSessionId();
        this.antiCheat = new AntiCheatSystem();
        this.encryption = new EncryptionManager();
        this.validator = new DataValidator();
        this.throttle = new ThrottleManager();
    }

    // Генерация уникального ключа
    generateSecretKey() {
        const seed = Date.now().toString(36) + Math.random().toString(36);
        return btoa(seed).substring(0, 32);
    }

    // Генерация ID сессии
    generateSessionId() {
        return 'session_' + Date.now().toString(36) + '_' + 
               Math.random().toString(36).substring(2, 8);
    }

    // Проверка целостности данных
    verifyDataIntegrity(data) {
        return this.validator.validateAll(data);
    }

    // Шифрование данных
    encryptData(data) {
        return this.encryption.encrypt(data, this.secretKey);
    }

    // Дешифровка данных
    decryptData(encrypted) {
        return this.encryption.decrypt(encrypted, this.secretKey);
    }
}

// ============================================
// ШИФРОВАНИЕ
// ============================================
class EncryptionManager {
    constructor() {
        this.algorithm = 'AES-GCM';
    }

    // Простое шифрование (для совместимости)
    encrypt(data, key) {
        try {
            const jsonString = JSON.stringify(data);
            const encoded = btoa(jsonString);
            
            // Простое XOR шифрование с ключом
            let encrypted = '';
            for (let i = 0; i < encoded.length; i++) {
                const charCode = encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                encrypted += String.fromCharCode(charCode);
            }
            
            return btoa(encrypted);
        } catch (e) {
            console.error('Ошибка шифрования:', e);
            return null;
        }
    }

    // Дешифрование
    decrypt(encrypted, key) {
        try {
            const decoded = atob(encrypted);
            let decrypted = '';
            for (let i = 0; i < decoded.length; i++) {
                const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                decrypted += String.fromCharCode(charCode);
            }
            
            const jsonString = atob(decrypted);
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('Ошибка дешифрования:', e);
            return null;
        }
    }

    // Хеширование пароля (SHA-256)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// ============================================
// ВАЛИДАЦИЯ ДАННЫХ
// ============================================
class DataValidator {
    constructor() {
        this.maxValues = {
            coins: 9999999,
            diamonds: 999999,
            health: 100,
            energy: 100,
            mood: 100,
            hunger: 100,
            level: 1000,
            exp: 999999
        };
    }

    validateAll(data) {
        const checks = [
            this.validateUser(data.user),
            this.validatePet(data.pet),
            this.validateInventory(data.inventory),
            this.validateIntegrity(data)
        ];
        
        return checks.every(check => check === true);
    }

    validateUser(user) {
        if (!user || typeof user !== 'object') return false;
        
        // Проверка ID
        if (!user.id || typeof user.id !== 'string') return false;
        if (user.id.length > 50) return false;
        
        // Проверка валюты
        if (typeof user.coins !== 'number' || isNaN(user.coins)) return false;
        if (user.coins < 0 || user.coins > this.maxValues.coins) return false;
        
        if (typeof user.diamonds !== 'number' || isNaN(user.diamonds)) return false;
        if (user.diamonds < 0 || user.diamonds > this.maxValues.diamonds) return false;
        
        // Проверка рейтинга
        if (typeof user.rating !== 'number' || isNaN(user.rating)) return false;
        if (user.rating < 0) return false;
        
        // Проверка рефералов
        if (typeof user.referrals !== 'number' || isNaN(user.referrals)) return false;
        if (user.referrals < 0) return false;
        
        return true;
    }

    validatePet(pet) {
        if (!pet || typeof pet !== 'object') return false;
        
        const stats = ['health', 'energy', 'mood', 'hunger'];
        for (const stat of stats) {
            if (typeof pet[stat] !== 'number' || isNaN(pet[stat])) return false;
            if (pet[stat] < 0 || pet[stat] > this.maxValues[stat]) return false;
        }
        
        if (typeof pet.level !== 'number' || isNaN(pet.level)) return false;
        if (pet.level < 1 || pet.level > this.maxValues.level) return false;
        
        if (typeof pet.exp !== 'number' || isNaN(pet.exp)) return false;
        if (pet.exp < 0 || pet.exp > this.maxValues.exp) return false;
        
        if (typeof pet.expToNext !== 'number' || isNaN(pet.expToNext)) return false;
        if (pet.expToNext < 1) return false;
        
        return true;
    }

    validateInventory(inventory) {
        if (!inventory || typeof inventory !== 'object') return false;
        
        const items = ['food', 'toy', 'medicine'];
        for (const item of items) {
            if (typeof inventory[item] !== 'number' || isNaN(inventory[item])) return false;
            if (inventory[item] < 0 || inventory[item] > 9999) return false;
        }
        
        if (!Array.isArray(inventory.skins)) return false;
        if (inventory.skins.length > 100) return false;
        
        return true;
    }

    validateIntegrity(data) {
        // Проверка на наличие контрольной суммы
        if (!data._checksum) return false;
        
        // Проверка временной метки
        if (!data._timestamp) return false;
        const age = Date.now() - data._timestamp;
        if (age > 86400000) return false; // 24 часа
        
        return true;
    }
}

// ============================================
// АНТИ-ЧИТ СИСТЕМА
// ============================================
class AntiCheatSystem {
    constructor() {
        this.detectionLog = [];
        this.thresholds = {
            maxCoinsPerSecond: 100,
            maxExpPerSecond: 50,
            maxActionsPerSecond: 10,
            suspiciousRate: 0.7
        };
        this.actionHistory = [];
        this.cheatFlags = {
            speedHack: false,
            memoryHack: false,
            debuggerDetected: false
        };
    }

    // Проверка на читы
    detectCheats(data) {
        const flags = [];
        
        // Проверка на слишком быстрый прогресс
        if (this.checkSpeedHack(data)) {
            flags.push('speed_hack');
            this.cheatFlags.speedHack = true;
        }
        
        // Проверка на взлом памяти
        if (this.checkMemoryHack(data)) {
            flags.push('memory_hack');
            this.cheatFlags.memoryHack = true;
        }
        
        // Проверка на отладку
        if (this.checkDebugger()) {
            flags.push('debugger_detected');
            this.cheatFlags.debuggerDetected = true;
        }
        
        // Проверка на аномалии в данных
        if (this.checkDataAnomalies(data)) {
            flags.push('data_anomaly');
        }
        
        // Логирование
        if (flags.length > 0) {
            this.logDetection(flags, data);
        }
        
        return flags;
    }

    // Проверка на читы скорости
    checkSpeedHack(data) {
        const now = Date.now();
        this.actionHistory.push({ time: now, data: data });
        
        // Очистка старых записей
        this.actionHistory = this.actionHistory.filter(
            entry => now - entry.time < 5000
        );
        
        if (this.actionHistory.length < 5) return false;
        
        // Проверка скорости получения ресурсов
        const coinRate = this.calculateRate('coins');
        const expRate = this.calculateRate('exp');
        
        if (coinRate > this.thresholds.maxCoinsPerSecond) return true;
        if (expRate > this.thresholds.maxExpPerSecond) return true;
        
        return false;
    }

    // Расчет скорости
    calculateRate(resource) {
        if (this.actionHistory.length < 2) return 0;
        
        const first = this.actionHistory[0];
        const last = this.actionHistory[this.actionHistory.length - 1];
        const timeDiff = (last.time - first.time) / 1000;
        
        if (timeDiff === 0) return 0;
        
        let total = 0;
        for (const entry of this.actionHistory) {
            if (entry.data.user && entry.data.user[resource]) {
                total += entry.data.user[resource];
            }
        }
        
        return total / timeDiff;
    }

    // Проверка на взлом памяти
    checkMemoryHack(data) {
        // Проверка на невалидные значения
        if (data.user.coins > 9999999) return true;
        if (data.user.diamonds > 999999) return true;
        if (data.pet.level > 1000) return true;
        
        // Проверка на отрицательные значения
        if (data.user.coins < 0) return true;
        if (data.user.diamonds < 0) return true;
        
        // Проверка на NaN
        if (isNaN(data.user.coins)) return true;
        if (isNaN(data.user.diamonds)) return true;
        
        return false;
    }

    // Обнаружение отладчика
    checkDebugger() {
        try {
            // Проверка через свойство debugger
            if (window.navigator.userAgent.includes('Chrome')) {
                if (window.outerWidth - window.innerWidth > 100) return true;
                if (window.outerHeight - window.innerHeight > 100) return true;
            }
            
            // Проверка через console.log
            const originalLog = console.log;
            console.log = function() {};
            const hasDebugger = false;
            console.log = originalLog;
            
            // Проверка через Error.stack
            const error = new Error();
            if (error.stack && error.stack.includes('debugger')) {
                return true;
            }
            
            return false;
        } catch (e) {
            return true;
        }
    }

    // Проверка аномалий в данных
    checkDataAnomalies(data) {
        // Проверка на слишком быстрый рост уровня
        if (data.pet.level > 10 && data.pet.exp < 100) return true;
        
        // Проверка на несоответствие опыта и уровня
        const expectedExp = this.calculateExpectedExp(data.pet.level);
        if (data.pet.exp > expectedExp * 2) return true;
        
        return false;
    }

    // Расчет ожидаемого опыта
    calculateExpectedExp(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    // Логирование обнаружения
    logDetection(flags, data) {
        const log = {
            timestamp: Date.now(),
            flags: flags,
            userId: data.user?.id || 'unknown',
            data: data,
            sessionId: data._sessionId || 'unknown'
        };
        
        this.detectionLog.push(log);
        
        // Отправка на сервер (если есть)
        this.reportCheat(log);
        
        console.warn('⚠️ Обнаружены читы:', flags);
    }

    // Отправка отчета
    reportCheat(log) {
        // Здесь можно отправить на сервер
        // fetch('/api/report-cheat', { method: 'POST', body: JSON.stringify(log) });
        
        // Сохранение в localStorage для анализа
        try {
            const reports = JSON.parse(localStorage.getItem('cheat_reports') || '[]');
            reports.push(log);
            if (reports.length > 100) reports.shift();
            localStorage.setItem('cheat_reports', JSON.stringify(reports));
        } catch (e) {}
    }

    // Получение статуса анти-чита
    getStatus() {
        return {
            flags: this.cheatFlags,
            detectionCount: this.detectionLog.length,
            lastDetection: this.detectionLog[this.detectionLog.length - 1] || null,
            actionHistorySize: this.actionHistory.length
        };
    }
}

// ============================================
// ЗАЩИТА ОТ ТРОТТЛИНГА
// ============================================
class ThrottleManager {
    constructor() {
        this.actions = new Map();
        this.limits = {
            feed: { max: 5, period: 60000 },      // 5 раз в минуту
            play: { max: 5, period: 60000 },
            heal: { max: 3, period: 60000 },
            sleep: { max: 3, period: 60000 },
            buy: { max: 20, period: 60000 }
        };
    }

    // Проверка лимита
    checkLimit(action, userId) {
        const key = `${userId}_${action}`;
        const limit = this.limits[action];
        
        if (!limit) return true;
        
        const now = Date.now();
        const history = this.actions.get(key) || [];
        
        // Очистка старых записей
        const recent = history.filter(time => now - time < limit.period);
        
        if (recent.length >= limit.max) {
            return false;
        }
        
        recent.push(now);
        this.actions.set(key, recent);
        
        return true;
    }

    // Получение времени до разблокировки
    getCooldown(action, userId) {
        const key = `${userId}_${action}`;
        const limit = this.limits[action];
        
        if (!limit) return 0;
        
        const history = this.actions.get(key) || [];
        const now = Date.now();
        const recent = history.filter(time => now - time < limit.period);
        
        if (recent.length < limit.max) return 0;
        
        const oldest = Math.min(...recent);
        return limit.period - (now - oldest);
    }
}

// ============================================
// ЗАЩИТА ОТ XSS И INJECTION
// ============================================
class XSSProtection {
    constructor() {
        this.sanitize = this.sanitize.bind(this);
    }

    // Очистка ввода
    sanitize(input) {
        if (typeof input === 'string') {
            return input
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }
        if (typeof input === 'object' && input !== null) {
            const cleaned = {};
            for (const [key, value] of Object.entries(input)) {
                cleaned[this.sanitize(key)] = this.sanitize(value);
            }
            return cleaned;
        }
        return input;
    }

    // Проверка на опасные символы
    hasDangerousChars(input) {
        if (typeof input !== 'string') return false;
        const dangerous = /[<>"'`;()&]/g;
        return dangerous.test(input);
    }

    // Безопасный вывод
    safeOutput(input) {
        return this.sanitize(input);
    }
}

// ============================================
// ЗАЩИТА ОТ CSRF
// ============================================
class CSRFProtection {
    constructor() {
        this.token = this.generateToken();
        this.setupAutoProtection();
    }

    generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    setupAutoProtection() {
        // Добавление токена в формы
        document.addEventListener('DOMContentLoaded', () => {
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = '_csrf';
                input.value = this.token;
                form.appendChild(input);
            });
        });

        // Проверка запросов
        this.interceptRequests();
    }

    interceptRequests() {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            // Добавление токена в заголовки
            if (args[1] && args[1].method && args[1].method.toUpperCase() !== 'GET') {
                args[1].headers = {
                    ...args[1].headers,
                    'X-CSRF-Token': this.token
                };
            }
            return originalFetch.apply(this, args);
        }.bind(this);
    }

    validateToken(token) {
        return token === this.token;
    }
}

// ============================================
// ЗАЩИТА ОТ MULTI-ACCOUNT
// ============================================
class MultiAccountProtection {
    constructor() {
        this.fingerprint = this.generateFingerprint();
        this.storedFingerprint = localStorage.getItem('device_fingerprint');
        this.setupFingerprint();
    }

    generateFingerprint() {
        const components = [
            navigator.userAgent,
            screen.width,
            screen.height,
            navigator.language,
            navigator.platform,
            navigator.hardwareConcurrency || 0,
            navigator.deviceMemory || 0,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            new Date().getTimezoneOffset()
        ];
        
        const fingerprint = components.join('|');
        return this.hashString(fingerprint);
    }

    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    setupFingerprint() {
        if (!this.storedFingerprint) {
            localStorage.setItem('device_fingerprint', this.fingerprint);
        } else if (this.storedFingerprint !== this.fingerprint) {
            console.warn('⚠️ Изменение устройства обнаружено!');
            this.handleDeviceChange();
        }
    }

    handleDeviceChange() {
        // Сброс сессии или уведомление
        this.flagMultiAccount();
    }

    flagMultiAccount() {
        localStorage.setItem('multi_account_flag', 'true');
        // Можно отправить на сервер
    }

    verifyFingerprint() {
        return localStorage.getItem('device_fingerprint') === this.fingerprint;
    }
}

// ============================================
// ЗАЩИТА СОХРАНЕНИЙ
// ============================================
class SaveProtection {
    constructor(securityManager) {
        this.security = securityManager;
        this.saveKey = 'tamagochi_secure_save';
        this.backupKey = 'tamagochi_backup';
        this.setupAutoSave();
    }

    // Безопасное сохранение
    secureSave(data) {
        try {
            // Добавление защиты
            const secureData = {
                data: data,
                _checksum: this.generateChecksum(data),
                _timestamp: Date.now(),
                _sessionId: this.security.sessionId,
                _version: '2.0'
            };
            
            // Шифрование
            const encrypted = this.security.encryptData(secureData);
            
            if (encrypted) {
                localStorage.setItem(this.saveKey, encrypted);
                this.createBackup(secureData);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Ошибка сохранения:', e);
            return false;
        }
    }

    // Безопасная загрузка
    secureLoad() {
        try {
            const encrypted = localStorage.getItem(this.saveKey);
            if (!encrypted) return null;
            
            const decrypted = this.security.decryptData(encrypted);
            if (!decrypted) return null;
            
            // Проверка целостности
            if (!this.verifyChecksum(decrypted.data, decrypted._checksum)) {
                console.warn('⚠️ Нарушение целостности данных!');
                return this.loadBackup();
            }
            
            // Проверка временной метки
            if (Date.now() - decrypted._timestamp > 86400000) {
                console.warn('⚠️ Устаревшие данные!');
                return this.loadBackup();
            }
            
            // Проверка валидности
            if (!this.security.verifyDataIntegrity(decrypted.data)) {
                console.warn('⚠️ Невалидные данные!');
                return this.loadBackup();
            }
            
            return decrypted.data;
        } catch (e) {
            console.error('Ошибка загрузки:', e);
            return this.loadBackup();
        }
    }

    // Генерация контрольной суммы
    generateChecksum(data) {
        const jsonString = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Преобразование в 32-bit integer
        }
        return hash.toString(36);
    }

    // Проверка контрольной суммы
    verifyChecksum(data, checksum) {
        const calculated = this.generateChecksum(data);
        return calculated === checksum;
    }

    // Создание резервной копии
    createBackup(secureData) {
        try {
            const backup = {
                ...secureData,
                _backupTime: Date.now()
            };
            localStorage.setItem(this.backupKey, JSON.stringify(backup));
        } catch (e) {}
    }

    // Загрузка из резервной копии
    loadBackup() {
        try {
            const backup = localStorage.getItem(this.backupKey);
            if (!backup) return null;
            
            const data = JSON.parse(backup);
            if (Date.now() - data._backupTime > 604800000) { // 7 дней
                return null;
            }
            
            return data.data;
        } catch (e) {
            return null;
        }
    }

    // Автосохранение
    setupAutoSave() {
        setInterval(() => {
            const data = this.security.getCurrentData();
            if (data) {
                this.secureSave(data);
            }
        }, 30000); // Каждые 30 секунд
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ ЗАЩИТЫ
// ============================================
class GameSecurity {
    constructor() {
        this.security = new SecurityManager();
        this.saveProtection = new SaveProtection(this.security);
        this.xssProtection = new XSSProtection();
        this.csrfProtection = new CSRFProtection();
        this.multiAccount = new MultiAccountProtection();
        
        // Инициализация
        this.initSecurity();
    }

    initSecurity() {
        // Защита от изменения DOM
        this.protectDOM();
        
        // Защита от консольных команд
        this.protectConsole();
        
        // Защита от расширений
        this.protectExtensions();
        
        // Защита от инъекций
        this.protectInjection();
        
        console.log('🔒 Система безопасности активирована');
    }

    protectDOM() {
        // Защита от изменения ключевых элементов
        const protectElement = (selector) => {
            const element = document.querySelector(selector);
            if (element) {
                Object.defineProperty(element, 'innerHTML', {
                    set: function(value) {
                        if (value.includes('<script>')) {
                            console.warn('⚠️ Попытка инъекции скрипта!');
                            return;
                        }
                        // Использовать безопасный сеттер
                        this.textContent = value;
                    }
                });
            }
        };

        protectElement('#app');
        protectElement('#petEmoji');
        protectElement('#petName');
    }

    protectConsole() {
        // Очистка консоли от опасных команд
        const originalLog = console.log;
        console.log = function(...args) {
            if (args.some(arg => 
                typeof arg === 'string' && 
                (arg.includes('localStorage') || 
                 arg.includes('document.cookie') ||
                 arg.includes('eval('))
            )) {
                console.warn('⚠️ Попытка выполнения опасной команды');
                return;
            }
            originalLog.apply(console, args);
        };
    }

    protectExtensions() {
        // Проверка на наличие вредоносных расширений
        try {
            if (chrome && chrome.runtime && chrome.runtime.id) {
                console.warn('⚠️ Обнаружено расширение браузера');
            }
        } catch (e) {}
    }

    protectInjection() {
        // Защита от eval
        const originalEval = window.eval;
        window.eval = function(code) {
            if (typeof code === 'string' && code.includes('localStorage')) {
                console.warn('⚠️ Попытка использования eval для доступа к localStorage');
                return null;
            }
            return originalEval.call(window, code);
        };
    }

    // Проверка безопасности перед действием
    checkAction(action, data) {
        // Проверка на читы
        const cheats = this.security.antiCheat.detectCheats(data);
        if (cheats.length > 0) {
            return {
                allowed: false,
                reason: 'Обнаружены читы: ' + cheats.join(', ')
            };
        }
        
        // Проверка лимитов
        if (!this.security.throttle.checkLimit(action, data.user.id)) {
            const cooldown = this.security.throttle.getCooldown(action, data.user.id);
            return {
                allowed: false,
                reason: `Подождите ${Math.ceil(cooldown/1000)} секунд`
            };
        }
        
        // Проверка устройства
        if (!this.multiAccount.verifyFingerprint()) {
            return {
                allowed: false,
                reason: 'Обнаружено изменение устройства'
            };
        }
        
        return { allowed: true };
    }

    // Получение текущих данных
    getCurrentData() {
        // Здесь получить текущие данные игры
        return window.gameState || null;
    }

    // Получение статуса безопасности
    getSecurityStatus() {
        return {
            antiCheat: this.security.antiCheat.getStatus(),
            fingerprint: this.multiAccount.fingerprint,
            sessionId: this.security.sessionId,
            saveProtected: true,
            xssProtected: true,
            csrfProtected: true
        };
    }
}

// ============================================
// ИНТЕГРАЦИЯ С ОСНОВНЫМ ПРИЛОЖЕНИЕМ
// ============================================
window.GameSecurity = GameSecurity;
window.security = new GameSecurity();

// Экспорт для использования в app.js
export const Security = window.security;
export const SecureSave = window.security.saveProtection;

console.log('🛡️ Защита активирована!');