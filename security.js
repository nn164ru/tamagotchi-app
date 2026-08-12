// ============================================
// SECURITY.JS - СИСТЕМА ЗАЩИТЫ
// ============================================

import { CONFIG } from './config.js';

export class SecurityModule {
    constructor() {
        this.actionLog = [];
        this.cheatFlags = {
            speedHack: false,
            memoryHack: false,
            debuggerDetected: false
        };
        this.lastActionTime = {};
        this.detectionCount = 0;
        this.isLocked = false;
        this.warningCount = 0;
        this._fingerprint = null;
        this.init();
        console.log('🛡️ Защита активирована');
    }

    init() {
        this.protectConsole();
        this.protectEval();
        this.setupFingerprint();
    }

    protectConsole() {
        const originalLog = console.log;
        console.log = function(...args) {
            if (args.some(a => typeof a === 'string' &&
                (a.includes('localStorage') || a.includes('state') || a.includes('_sessionId')))) {
                return;
            }
            originalLog.apply(console, args);
        };
    }

    protectEval() {
        const originalEval = window.eval;
        window.eval = function(code) {
            if (typeof code === 'string' &&
                (code.includes('localStorage') || code.includes('state'))) {
                return null;
            }
            return originalEval.call(window, code);
        };
    }

    setupFingerprint() {
        const components = [
            navigator.userAgent,
            screen.width,
            screen.height,
            navigator.language,
            navigator.platform,
            navigator.hardwareConcurrency || 0
        ];
        const fingerprint = components.join('|');
        const hash = this.hashString(fingerprint);
        const stored = localStorage.getItem('device_fingerprint');
        if (!stored) {
            localStorage.setItem('device_fingerprint', hash);
            this._fingerprint = hash;
        } else {
            this._fingerprint = stored;
        }
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    checkAction(action, userId) {
        const now = Date.now();
        const key = `${userId}_${action}`;
        const lastTime = this.lastActionTime[key] || 0;

        if (now - lastTime < CONFIG.COOLDOWN_SECONDS * 1000) {
            return { allowed: false, reason: `Подождите ${CONFIG.COOLDOWN_SECONDS} сек`, cooldown: true };
        }

        this.actionLog.push({ action, userId, time: now });
        if (this.actionLog.length > 100) this.actionLog.shift();

        const recentActions = this.actionLog.filter(a => now - a.time < 10000);
        if (recentActions.length > CONFIG.MAX_ACTIONS_PER_MINUTE) {
            this.warningCount++;
            if (this.warningCount > 3) {
                this.cheatFlags.speedHack = true;
                this.triggerSecurity('speed_hack');
                return { allowed: false, reason: 'Слишком много действий', critical: true };
            }
            return { allowed: false, reason: 'Подождите немного', cooldown: true };
        }

        this.lastActionTime[key] = now;
        this.warningCount = 0;
        return { allowed: true };
    }

    validateData(data) {
        if (!data || !data.user || !data.pet) return false;
        if (data.user.coins > CONFIG.MAX_COINS || data.user.coins < -100) return false;
        if (data.user.diamonds > CONFIG.MAX_DIAMONDS || data.user.diamonds < -10) return false;
        if (data.pet.level > CONFIG.MAX_LEVEL || data.pet.level < 0) return false;
        if (isNaN(data.user.coins) || isNaN(data.user.diamonds)) return false;
        if (isNaN(data.pet.health) || isNaN(data.pet.energy)) return false;
        return true;
    }

    triggerSecurity(type) {
        this.detectionCount++;
        console.warn('⚠️ Угроза:', type);
        if (type === 'memory_hack' || type === 'speed_hack') {
            this.isLocked = true;
            if (window.showSecurityOverlay) {
                window.showSecurityOverlay('Обнаружена подозрительная активность');
            }
        }
    }

    unlock() {
        this.isLocked = false;
        this.detectionCount = 0;
        this.warningCount = 0;
        console.log('🔓 Игра разблокирована');
    }

    getStatus() {
        return {
            fingerprint: this._fingerprint,
            cheatFlags: this.cheatFlags,
            detectionCount: this.detectionCount,
            isLocked: this.isLocked,
            isSecure: !Object.values(this.cheatFlags).some(f => f === true)
        };
    }
}
