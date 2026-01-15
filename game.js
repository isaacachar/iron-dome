// Iron Dome - JavaScript Tower Defense Game
// ================================
// CYBERPUNK VISUAL THEME

// ==================
// CRAZYGAMES SDK WRAPPER
// ==================
const CrazyGamesSDK = {
    available: false,
    environment: 'disabled',

    async init() {
        try {
            if (window.CrazyGames && window.CrazyGames.SDK) {
                this.environment = await window.CrazyGames.SDK.getEnvironment();
                this.available = (this.environment === 'crazygames' || this.environment === 'local');
                if (this.available) {
                    window.CrazyGames.SDK.game.sdkGameLoadingStart();
                }
            }
        } catch (e) {
            this.available = false;
        }
    },

    loadingStop() {
        if (this.available) {
            try { window.CrazyGames.SDK.game.sdkGameLoadingStop(); } catch (e) {}
        }
    },

    gameplayStart() {
        if (this.available) {
            try { window.CrazyGames.SDK.game.gameplayStart(); } catch (e) {}
        }
    },

    gameplayStop() {
        if (this.available) {
            try { window.CrazyGames.SDK.game.gameplayStop(); } catch (e) {}
        }
    },

    happytime() {
        if (this.available) {
            try { window.CrazyGames.SDK.game.happytime(); } catch (e) {}
        }
    }
};

// Initialize CrazyGames SDK
CrazyGamesSDK.init();

// Cyberpunk color palette
const CYBER = {
    cyan: '#00f0ff',
    cyanDim: '#00a0aa',
    magenta: '#ff00aa',
    magentaDim: '#aa0077',
    yellow: '#f0ff00',
    green: '#00ff66',
    red: '#ff0044',
    orange: '#ff6600',
    purple: '#aa00ff',
    bgDark: '#0a0a14',
    bgMid: '#0d1117',
    gridLine: 'rgba(0, 240, 255, 0.1)'
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ==================
// AUDIO SYSTEM
// ==================
const AudioManager = {
    ctx: null,
    musicGain: null,
    sfxGain: null,
    musicEnabled: true,
    sfxEnabled: true,
    initialized: false,

    init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Master gains
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.3;
        this.musicGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.5;
        this.sfxGain.connect(this.ctx.destination);

        this.initialized = true;
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // Shoot sound - short laser pew
    playShoot() {
        if (!this.initialized || !this.sfxEnabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    },

    // Crit shoot - beefier sound
    playCritShoot() {
        if (!this.initialized || !this.sfxEnabled) return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(660, this.ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.15);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(990, this.ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(165, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.15);
        osc2.stop(this.ctx.currentTime + 0.15);
    },

    // Pre-generated explosion buffer (created once)
    explosionBuffer: null,

    createExplosionBuffer() {
        if (!this.ctx || this.explosionBuffer) return;
        const bufferSize = this.ctx.sampleRate * 0.3;
        this.explosionBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.explosionBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
    },

    // Explosion sound (uses pre-generated buffer)
    playExplosion() {
        if (!this.initialized || !this.sfxEnabled) return;
        if (!this.explosionBuffer) this.createExplosionBuffer();

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.explosionBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start();
    },

    // Hit sound - enemy takes damage
    playHit() {
        if (!this.initialized || !this.sfxEnabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    },

    // Shield block sound
    playShieldBlock() {
        if (!this.initialized || !this.sfxEnabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.05);
        osc.frequency.setValueAtTime(600, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    },

    // UI click sound
    playClick() {
        if (!this.initialized || !this.sfxEnabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    },

    // Upgrade purchase sound
    playUpgrade() {
        if (!this.initialized || !this.sfxEnabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.setValueAtTime(600, this.ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(800, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    },

    // Ability activation sound
    playAbility() {
        if (!this.initialized || !this.sfxEnabled) return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.2);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(450, this.ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1350, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.25);
        osc2.stop(this.ctx.currentTime + 0.25);
    },

    // Wave start sound
    playWaveStart() {
        if (!this.initialized || !this.sfxEnabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    },

    // Boss wave warning
    playBossWarning() {
        if (!this.initialized || !this.sfxEnabled) return;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(200, this.ctx.currentTime);

                gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start();
                osc.stop(this.ctx.currentTime + 0.15);
            }, i * 200);
        }
    },

    // Game over sound
    playGameOver() {
        if (!this.initialized || !this.sfxEnabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 1);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 1);
    },

    // Background music - simple procedural loop
    musicOsc: null,
    musicPlaying: false,

    startMusic() {
        if (!this.initialized || !this.musicEnabled || this.musicPlaying) return;
        this.musicPlaying = true;
        this.musicGain.gain.value = 0.3; // Restore volume
        this.playMusicLoop();
    },

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicGain) {
            this.musicGain.gain.value = 0; // Instant mute
        }
    },

    playMusicLoop() {
        if (!this.musicPlaying || !this.musicEnabled) return;

        const notes = [110, 130.81, 146.83, 164.81, 130.81, 146.83, 110, 98];
        const now = this.ctx.currentTime;

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.5);

            gain.gain.setValueAtTime(0, now + i * 0.5);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.5 + 0.05);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.5 + 0.3);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.5 + 0.48);

            osc.connect(gain);
            gain.connect(this.musicGain);

            osc.start(now + i * 0.5);
            osc.stop(now + i * 0.5 + 0.5);
        });

        // Schedule next loop
        setTimeout(() => this.playMusicLoop(), notes.length * 500);
    },

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.startMusic();
        } else {
            this.stopMusic();
        }
        return this.musicEnabled;
    },

    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }
};

// ==================
// SAVE/LOAD SYSTEM
// ==================
const SaveManager = {
    storageKey: 'ironDomeSave',

    defaultData: {
        highScore: 0,
        totalEnemiesKilled: 0,
        totalWavesCompleted: 0,
        totalGamesPlayed: 0,
        musicEnabled: true,
        sfxEnabled: true,
        tutorialSeen: false,
        megaBossDefeated: false,
        // Meta currency
        scrap: 0,
        selectedClass: 'standard',
        // Class unlocks - standard is free
        classUnlocks: {
            standard: true,
            sniper: false,
            shotgun: false,
            minigun: false
        },
        // Unlocks - frost is free, others need to be earned
        unlocks: {
            frost: true,      // Free from start
            pierce: false,    // Reach Wave 5
            fury: false,      // Kill 100 enemies
            pulse: false,     // Reach Wave 15
            nuke: false,      // Kill 500 enemies
            extraLife: false  // Beat a Mega Boss
        }
    },

    data: null,

    // Unlock requirements
    unlockRequirements: {
        pierce: { type: 'wave', value: 5, label: 'Reach Wave 5' },
        fury: { type: 'kills', value: 100, label: 'Kill 100 enemies' },
        pulse: { type: 'wave', value: 15, label: 'Reach Wave 15' },
        nuke: { type: 'kills', value: 500, label: 'Kill 500 enemies' },
        extraLife: { type: 'megaboss', value: true, label: 'Defeat a Mega Boss' }
    },

    init() {
        this.load();
        // Apply saved settings
        AudioManager.musicEnabled = this.data.musicEnabled;
        AudioManager.sfxEnabled = this.data.sfxEnabled;
        // Update UI to reflect settings
        if (!this.data.musicEnabled) {
            document.getElementById('musicBtn').classList.add('muted');
        }
        if (!this.data.sfxEnabled) {
            document.getElementById('sfxBtn').classList.add('muted');
        }
        // Check for any unlocks on init (pass highScore as wave)
        this.checkUnlocks(this.data.highScore);
    },

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Deep merge for unlocks and classUnlocks
                this.data = { ...this.defaultData, ...parsed };
                if (parsed.unlocks) {
                    this.data.unlocks = { ...this.defaultData.unlocks, ...parsed.unlocks };
                }
                if (parsed.classUnlocks) {
                    this.data.classUnlocks = { ...this.defaultData.classUnlocks, ...parsed.classUnlocks };
                }
            } else {
                this.data = { ...this.defaultData };
            }
        } catch (e) {
            this.data = { ...this.defaultData };
        }
    },

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            // localStorage not available
        }
    },

    updateHighScore(wave) {
        if (wave > this.data.highScore) {
            this.data.highScore = wave;
            this.save();
            return true; // New high score!
        }
        return false;
    },

    addEnemyKilled() {
        this.data.totalEnemiesKilled++;
    },

    addWaveCompleted(currentWave) {
        this.data.totalWavesCompleted++;
        this.save();
        this.checkUnlocks(currentWave);
    },

    addGamePlayed() {
        this.data.totalGamesPlayed++;
        this.save();
    },

    saveSettings(musicEnabled, sfxEnabled) {
        this.data.musicEnabled = musicEnabled;
        this.data.sfxEnabled = sfxEnabled;
        this.save();
    },

    markMegaBossDefeated() {
        if (!this.data.megaBossDefeated) {
            this.data.megaBossDefeated = true;
            this.save();
            this.checkUnlocks();
        }
    },

    isUnlocked(ability) {
        return this.data.unlocks[ability] === true;
    },

    checkUnlocks(currentWave = 0) {
        let newUnlock = null;
        // Use current wave if higher than saved high score
        const waveToCheck = Math.max(this.data.highScore, currentWave);

        // Check pierce - Wave 5
        if (!this.data.unlocks.pierce && waveToCheck >= 5) {
            this.data.unlocks.pierce = true;
            newUnlock = 'PIERCE';
        }

        // Check fury - 100 kills
        if (!this.data.unlocks.fury && this.data.totalEnemiesKilled >= 100) {
            this.data.unlocks.fury = true;
            newUnlock = 'FURY';
        }

        // Check pulse - Wave 15
        if (!this.data.unlocks.pulse && waveToCheck >= 15) {
            this.data.unlocks.pulse = true;
            newUnlock = 'PULSE';
        }

        // Check nuke - 500 kills
        if (!this.data.unlocks.nuke && this.data.totalEnemiesKilled >= 500) {
            this.data.unlocks.nuke = true;
            newUnlock = 'NUKE';
        }

        // Check extraLife - Mega Boss defeated
        if (!this.data.unlocks.extraLife && this.data.megaBossDefeated) {
            this.data.unlocks.extraLife = true;
            newUnlock = '+1 STARTING LIFE';
        }

        if (newUnlock) {
            this.save();
            console.log('[UNLOCK]', newUnlock, this.data.unlocks);
            this.showUnlockNotification(newUnlock, newUnlock === '+1 STARTING LIFE');
        }

        return newUnlock;
    },

    // Ability descriptions for unlock notifications
    abilityInfo: {
        pierce: { desc: 'Shots penetrate through enemies', cost: 60 },
        fury: { desc: 'Shots deal critical damage', cost: 80 },
        pulse: { desc: 'Damages all enemies in range', cost: 100 },
        nuke: { desc: 'Destroys all enemies on screen', cost: 200 }
    },

    showUnlockNotification(unlockName, isBigUnlock = false) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'unlock-notification' + (isBigUnlock ? ' big-unlock' : '');

        if (isBigUnlock) {
            notification.innerHTML = `<span class="unlock-label">MEGA BOSS DEFEATED!</span><span class="unlock-name">${unlockName}</span><span class="unlock-desc">+1 LIFE EVERY RUN</span>`;
        } else {
            // Get ability info for description
            const key = unlockName.toLowerCase();
            const info = this.abilityInfo[key];
            if (info) {
                notification.innerHTML = `<span class="unlock-label">UNLOCKED</span><span class="unlock-name">${unlockName}</span><span class="unlock-desc">${info.desc}</span><span class="unlock-cost">$${info.cost}</span>`;
            } else {
                notification.innerHTML = `<span class="unlock-label">UNLOCKED</span><span class="unlock-name">${unlockName}</span>`;
            }
        }
        document.body.appendChild(notification);

        // Animate and remove (longer for big unlocks)
        const duration = isBigUnlock ? 5000 : 4000;
        setTimeout(() => notification.classList.add('show'), 50);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, duration);
    },

    getUnlockProgress(ability) {
        const req = this.unlockRequirements[ability];
        if (!req) return null;

        if (req.type === 'wave') {
            return { current: this.data.highScore, required: req.value, label: req.label };
        } else if (req.type === 'kills') {
            return { current: this.data.totalEnemiesKilled, required: req.value, label: req.label };
        } else if (req.type === 'megaboss') {
            return { current: this.data.megaBossDefeated ? 1 : 0, required: 1, label: req.label };
        }
        return null;
    },

    // ==================
    // CLASS SYSTEM
    // ==================
    classDefinitions: {
        standard: {
            name: 'TURRET',
            icon: '◎',
            desc: 'Balanced all-rounder',
            color: '#00f0ff',
            cost: 0,
            stats: {
                damage: 35,
                fireRate: 3,
                range: 225,
                targets: 1,
                special: null
            }
        },
        sniper: {
            name: 'SNIPER',
            icon: '⊕',
            desc: 'Slow but devastating',
            color: '#ff00aa',
            cost: 150,
            stats: {
                damage: 120,
                fireRate: 1,
                range: 320,
                targets: 1,
                special: 'pierce2' // Inherent pierce through 2 enemies
            }
        },
        shotgun: {
            name: 'SHOTGUN',
            icon: '❖',
            desc: 'Hits multiple targets',
            color: '#ff6600',
            cost: 200,
            stats: {
                damage: 20,
                fireRate: 2,
                range: 160,
                targets: 4,
                special: 'spread' // Spread shot
            }
        },
        minigun: {
            name: 'MINIGUN',
            icon: '⚡',
            desc: 'Extreme fire rate',
            color: '#f0ff00',
            cost: 300,
            stats: {
                damage: 12,
                fireRate: 10,
                range: 200,
                targets: 1,
                special: 'spinup' // Gets faster over time
            }
        }
    },

    // Calculate scrap earned from a run
    calculateScrapEarned(wavesCompleted, killsThisRun) {
        // Base: 5 scrap per wave + 1 scrap per 5 kills
        const waveScrap = wavesCompleted * 5;
        const killScrap = Math.floor(killsThisRun / 5);
        // Bonus for reaching milestones
        let bonusScrap = 0;
        if (wavesCompleted >= 10) bonusScrap += 10;
        if (wavesCompleted >= 20) bonusScrap += 20;
        if (wavesCompleted >= 30) bonusScrap += 30;
        return waveScrap + killScrap + bonusScrap;
    },

    // Add scrap from a completed run
    addScrap(amount) {
        this.data.scrap += amount;
        this.save();
        return this.data.scrap;
    },

    // Spend scrap to unlock a class
    unlockClass(classId) {
        const classDef = this.classDefinitions[classId];
        if (!classDef) return false;
        if (this.data.classUnlocks[classId]) return false; // Already unlocked
        if (this.data.scrap < classDef.cost) return false; // Can't afford

        this.data.scrap -= classDef.cost;
        this.data.classUnlocks[classId] = true;
        this.save();
        return true;
    },

    // Select a class for the next run
    selectClass(classId) {
        if (!this.data.classUnlocks[classId]) return false;
        this.data.selectedClass = classId;
        this.save();
        return true;
    },

    // Get current class definition
    getSelectedClass() {
        return this.classDefinitions[this.data.selectedClass] || this.classDefinitions.standard;
    },

    // Check if class is unlocked
    isClassUnlocked(classId) {
        return this.data.classUnlocks[classId] === true;
    }
};

// Responsive canvas sizing - full screen on mobile
let gameScale = 1;
let gameOffsetX = 0;
let gameOffsetY = 0;
let canvasWidth = 0;
let canvasHeight = 0;

function resizeCanvas() {
    // Use multiple fallbacks to get valid dimensions
    let width = window.innerWidth || document.documentElement.clientWidth || screen.width || 400;
    let height = window.innerHeight || document.documentElement.clientHeight || screen.height || 700;

    // Ensure minimum dimensions
    width = Math.max(width, 300);
    height = Math.max(height, 400);

    // Set canvas to full screen
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    canvasWidth = width;
    canvasHeight = height;

    // Calculate game scale - game world fits in screen
    const minDim = Math.min(width, height);
    gameScale = Math.max(0.3, minDim / 700);
    gameOffsetX = width / 2;
    gameOffsetY = height / 2;
}

// Resize immediately and on events
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 100));
document.addEventListener('DOMContentLoaded', resizeCanvas);

// Game Constants - scaled for game world
const BASE_SPAWN_RADIUS = 280;
const SPAWN_BUFFER = 60; // Enemies spawn this far outside attack range
const ABILITY_DURATION = 8;
const FROST_DURATION = 12; // Frost lasts longer
const FROST_SLOW = 0.75; // 75% slow (was 50%)
// MAX_RANGE moved to UPGRADE_CONFIG.range.max

// Ability balance
const ABILITY_MAX_CHARGES = {
    frost: 3,
    pierce: 3,
    fury: 3,
    pulse: 3,
    nuke: 1  // Only 1 nuke at a time!
};
const ABILITY_BASE_COSTS = {
    frost: 40,
    pierce: 50,
    fury: 60,
    pulse: 150,
    nuke: 800  // Increased from 500
};
const ABILITY_COST_MULTIPLIER = 1.5; // 50% increase per purchase

// Turret upgrade configuration
const UPGRADE_CONFIG = {
    damage: {
        baseCost: 50,
        costMultiplier: 1.4,
        perLevel: 10,
        unit: 'dmg'
    },
    fireRate: {
        baseCost: 75,
        costMultiplier: 1.5,
        perLevel: 0.5,
        unit: '/s'
    },
    range: {
        baseCost: 60,
        costMultiplier: 1.4,
        perLevel: 25,
        max: 400,  // Maximum range (prevents going off screen)
        unit: ''
    },
    multishot: {
        baseCost: 250,
        costMultiplier: 1.8,
        perLevel: 1,
        max: 5,
        unit: ''
    }
};

// Dynamic spawn radius - always outside attack range
function getSpawnRadius() {
    return Math.max(BASE_SPAWN_RADIUS, core.attackRange + SPAWN_BUFFER);
}

// ==================
// GAME STATE
// ==================
const game = {
    state: 'title', // 'title', 'playing', 'gameover'
    money: 0,
    currentWave: 0,
    enemiesAlive: 0,
    enemiesToSpawn: 0,
    waveInProgress: false,
    gameOver: false,
    paused: false,
    speedMultiplier: 1,
    countdown: 0,
    countdownActive: false,
    upgradeShownForWave: -1,
    lifePauseCountdown: 0, // Countdown when life is lost (pauses game)
    lastTime: 0,
    killsThisRun: 0, // Track kills per run for scrap calculation
    scrapEarned: 0,  // Scrap earned this run (for display)

    // Upgrade costs (turret upgrades - these scale with purchase)
    // Initial values from UPGRADE_CONFIG.baseCost
    damageCost: UPGRADE_CONFIG.damage.baseCost,
    fireRateCost: UPGRADE_CONFIG.fireRate.baseCost,
    rangeCost: UPGRADE_CONFIG.range.baseCost,
    multishotCost: UPGRADE_CONFIG.multishot.baseCost,
    shieldCost: 400,
    // Note: Ability costs (frost, pierce, fury, pulse, nuke) are calculated
    // dynamically via getAbilityCost() using ABILITY_BASE_COSTS and abilityPurchases

    // Track ability purchases for scaling costs
    abilityPurchases: {
        frost: 0,
        pierce: 0,
        fury: 0,
        pulse: 0,
        nuke: 0
    }
};

// ==================
// CORE (PLAYER TURRET)
// ==================
const core = {
    x: 0,
    y: 0,
    damage: 35,
    fireRate: 3,
    attackRange: 225, // Scaled for canvas size
    projectileCount: 1,
    rotation: 0,
    target: null,
    shootTimer: 0,
    pulseTime: 0,
    muzzleFlash: 0,

    // Abilities
    pierceActive: false,
    pierceTimer: 0,
    pierceCharges: 0,
    frostActive: false,
    frostTimer: 0,
    frostCharges: 0,
    critActive: false,
    critTimer: 0,
    critCharges: 0,
    nukeCharges: 0,
    // PULSE ability (laser ring)
    pulseCharges: 0,
    pulseActive: false,
    pulseTimer: 0,
    pulseDamageTimer: 0,

    // Class system
    currentClass: 'standard',
    classSpecial: null,  // 'pierce2', 'spread', 'spinup'
    spinupMultiplier: 1,  // For minigun spinup mechanic

    // Screen effects
    screenShake: 0,
    damageFlash: 0
};

// Get current ability cost (scales with purchases)
function getAbilityCost(abilityKey) {
    const baseCost = ABILITY_BASE_COSTS[abilityKey];
    const purchases = game.abilityPurchases[abilityKey];
    return Math.floor(baseCost * Math.pow(ABILITY_COST_MULTIPLIER, purchases));
}

// Get current charges for an ability
function getAbilityCharges(abilityKey) {
    switch(abilityKey) {
        case 'frost': return core.frostCharges;
        case 'pierce': return core.pierceCharges;
        case 'fury': return core.critCharges;
        case 'pulse': return core.pulseCharges;
        case 'nuke': return core.nukeCharges;
        default: return 0;
    }
}

// Check if can buy ability (has money and under max charges)
function canBuyAbility(abilityKey) {
    const cost = getAbilityCost(abilityKey);
    const currentCharges = getAbilityCharges(abilityKey);
    const maxCharges = ABILITY_MAX_CHARGES[abilityKey];
    return game.money >= cost && currentCharges < maxCharges;
}

// Trigger screen shake
function triggerShake(intensity) {
    game.screenShake = Math.max(game.screenShake, intensity);
}

// Trigger damage flash
function triggerDamageFlash() {
    game.damageFlash = 1;
}

// ==================
// ENTITIES
// ==================
let enemies = [];
let bullets = [];
let explosions = [];
let damageNumbers = [];

// Lives system (buyable shields)
let lives = 0; // Start with 0, can buy up to 3


// ==================
// ENEMY CLASS
// ==================
class Enemy {
    constructor(x, y, wave) {
        this.x = x;
        this.y = y;
        this.speed = 30 * getSpeedMultiplier(wave);
        this.maxHealth = 40 * getHealthMultiplier(wave);
        this.health = this.maxHealth;
        this.moneyReward = getMoneyReward(wave);
        this.type = 'normal';
        this.rotation = 0;
        this.spawnScale = 0;
        this.hitFlash = 0;

        // Slow effect
        this.slowTimer = 0;
        this.baseSpeed = this.speed;

        // Special properties
        this.shieldHits = 0;
        this.regenRate = 0;
        this.canSplit = false;
        this.splitCount = 0;
        this.splitTier = 0;
        this.isMegaBoss = false;

        // Cyberpunk Colors
        this.bodyColor = CYBER.red;
        this.glowColor = CYBER.magenta;
    }

    setType(type) {
        this.type = type;
        switch (type) {
            case 'fast':
                this.speed *= 1.8;
                this.maxHealth *= 0.5;
                this.moneyReward = Math.floor(this.moneyReward * 0.8);
                this.bodyColor = CYBER.cyan;
                this.glowColor = '#00ffff';
                break;
            case 'tank':
                this.speed *= 0.5;
                this.maxHealth *= 3.0;
                this.moneyReward = Math.floor(this.moneyReward * 2.0);
                this.bodyColor = CYBER.purple;
                this.glowColor = '#cc00ff';
                break;
            case 'swarm':
                this.speed *= 1.2;
                this.maxHealth *= 0.3;
                this.moneyReward = Math.floor(this.moneyReward * 0.5);
                this.bodyColor = CYBER.yellow;
                this.glowColor = '#ffff00';
                break;
            case 'shielded':
                this.speed *= 0.9;
                this.maxHealth *= 1.5;
                this.shieldHits = 5;
                this.moneyReward = Math.floor(this.moneyReward * 1.5);
                this.bodyColor = '#00dddd';
                this.glowColor = CYBER.cyan;
                break;
            case 'regen':
                this.speed *= 0.8;
                this.maxHealth *= 2.0;
                this.regenRate = this.maxHealth * 0.1;
                this.moneyReward = Math.floor(this.moneyReward * 1.8);
                this.bodyColor = CYBER.green;
                this.glowColor = '#00ff88';
                break;
            case 'splitter':
                this.speed *= 1.0;
                this.maxHealth *= 1.2;
                this.canSplit = true;
                this.splitCount = 2;
                this.moneyReward = Math.floor(this.moneyReward * 0.7);
                this.bodyColor = CYBER.magenta;
                this.glowColor = '#ff44cc';
                break;
            case 'megaboss':
                this.speed *= 0.3;
                this.maxHealth *= 15;
                this.canSplit = true;
                this.splitCount = 3;
                this.splitTier = 2; // 2 = splits into medium, 1 = splits into small, 0 = no split
                this.moneyReward = Math.floor(this.moneyReward * 5);
                this.bodyColor = '#ff4400';
                this.glowColor = '#ff6600';
                this.isMegaBoss = true;
                break;
            case 'megaboss_medium':
                this.speed *= 0.5;
                this.maxHealth *= 4;
                this.canSplit = true;
                this.splitCount = 3;
                this.splitTier = 1;
                this.moneyReward = Math.floor(this.moneyReward * 1.5);
                this.bodyColor = '#ff6622';
                this.glowColor = '#ff8844';
                this.isMegaBoss = true;
                break;
            case 'megaboss_small':
                this.speed *= 0.8;
                this.maxHealth *= 1.5;
                this.canSplit = false;
                this.splitCount = 0;
                this.splitTier = 0;
                this.moneyReward = Math.floor(this.moneyReward * 0.5);
                this.bodyColor = '#ff8844';
                this.glowColor = '#ffaa66';
                this.isMegaBoss = true;
                break;
        }
        this.health = this.maxHealth;
        this.baseSpeed = this.speed;
    }

    update(dt) {
        // Spawn animation
        this.spawnScale = Math.min(1, this.spawnScale + dt * 4);

        // Slow effect
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) {
                this.speed = this.baseSpeed;
            }
        }

        // Regeneration
        if (this.regenRate > 0 && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + this.regenRate * dt);
        }

        // Move toward center
        const dx = core.x - this.x;
        const dy = core.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
            this.rotation = Math.atan2(dy, dx);
        }

        // Hit flash decay
        this.hitFlash = Math.max(0, this.hitFlash - dt * 6);

        // Check if reached core
        if (dist < 20) {
            // Lives absorb the hit
            if (lives > 0) {
                lives--;
                AudioManager.playShieldBlock();
                triggerShake(12); // Strong shake on taking damage
                triggerDamageFlash(); // Red flash
                // Pause game and show upgrade panel - gives player time to recover
                game.paused = true;
                game.lifePauseCountdown = 5; // 5 seconds to upgrade
                showUpgradePanel();
                // Kill this enemy
                game.enemiesAlive = Math.max(0, game.enemiesAlive - 1);
                const idx = enemies.indexOf(this);
                if (idx > -1) enemies.splice(idx, 1);
                // Spawn explosion
                explosions.push({
                    x: this.x,
                    y: this.y,
                    time: 0,
                    maxTime: 0.4
                });
            } else {
                game.gameOver = true;
                showGameOver(false);
            }
        }
    }

    takeDamage(damage, isCrit = false) {
        this.hitFlash = 1;

        // Shield absorbs hits
        if (this.shieldHits > 0) {
            this.shieldHits--;
            spawnDamageNumber(this.x, this.y - 15, 0, false, true);
            AudioManager.playShieldBlock();
            return;
        }

        this.health -= damage;
        spawnDamageNumber(this.x, this.y - 15, damage, isCrit, false);
        AudioManager.playHit();

        if (this.health <= 0) {
            this.die();
        }
    }

    applySlow(percent) {
        this.speed = this.baseSpeed * (1 - percent);
        this.slowTimer = 2;
    }

    die() {
        game.money += this.moneyReward;
        game.enemiesAlive = Math.max(0, game.enemiesAlive - 1);
        game.killsThisRun++; // Track kills this run for scrap
        AudioManager.playExplosion();
        SaveManager.addEnemyKilled();

        // Track mega boss defeat (only the main mega boss, not children)
        if (this.type === 'megaboss') {
            SaveManager.markMegaBossDefeated();
        }

        // Splitter/Megaboss spawns children
        if (this.canSplit && this.splitCount > 0) {
            // Determine child type for mega boss chain
            let childType = null;
            if (this.isMegaBoss && this.splitTier === 2) {
                childType = 'megaboss_medium';
            } else if (this.isMegaBoss && this.splitTier === 1) {
                childType = 'megaboss_small';
            }

            const spreadDist = this.isMegaBoss ? 40 : 20;
            for (let i = 0; i < this.splitCount; i++) {
                const angle = (i / this.splitCount) * Math.PI * 2 + Math.random() * 0.3;
                const child = new Enemy(
                    this.x + Math.cos(angle) * spreadDist,
                    this.y + Math.sin(angle) * spreadDist,
                    game.currentWave
                );

                if (childType) {
                    // Mega boss child - use setType
                    child.setType(childType);
                } else {
                    // Regular splitter child
                    child.speed = this.speed * 1.5;
                    child.maxHealth = this.maxHealth * 0.3;
                    child.health = child.maxHealth;
                    child.moneyReward = Math.floor(this.moneyReward * 0.3);
                    child.bodyColor = '#ff66aa';
                    child.glowColor = CYBER.magenta;
                    child.canSplit = false;
                }
                child.spawnScale = 1;
                enemies.push(child);
                game.enemiesAlive++;
            }
        }

        // Spawn explosion
        explosions.push({
            x: this.x,
            y: this.y,
            time: 0,
            maxTime: 0.4
        });

        // Screen shake based on enemy type
        if (this.type === 'megaboss') {
            triggerShake(20); // Massive shake for mega boss
        } else if (this.type === 'megaboss_medium' || this.type === 'tank') {
            triggerShake(8); // Medium shake for big enemies
        } else {
            triggerShake(3); // Small shake for normal enemies
        }

        // Remove from array
        const idx = enemies.indexOf(this);
        if (idx > -1) enemies.splice(idx, 1);

        // Check wave complete
        if (game.enemiesAlive <= 0 && game.enemiesToSpawn <= 0 && game.waveInProgress) {
            game.waveInProgress = false;
        }
    }

    draw() {
        const s = this.spawnScale;
        let sizeMult = 1;
        if (this.type === 'tank') sizeMult = 1.5;
        else if (this.type === 'swarm') sizeMult = 0.7;
        else if (this.type === 'regen') sizeMult = 1.3;
        else if (this.type === 'splitter') sizeMult = 1.1;
        else if (this.type === 'megaboss') sizeMult = 3.0;
        else if (this.type === 'megaboss_medium') sizeMult = 2.0;
        else if (this.type === 'megaboss_small') sizeMult = 1.3;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Glow
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = this.glowColor;
        ctx.beginPath();
        ctx.arc(0, 0, 10 * s * sizeMult, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Body
        const color = this.hitFlash > 0.5 ? '#ffffff' : this.bodyColor;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(9 * s * sizeMult, 0);
        ctx.lineTo(-6 * s * sizeMult, -6 * s * sizeMult);
        ctx.lineTo(-3 * s * sizeMult, 0);
        ctx.lineTo(-6 * s * sizeMult, 6 * s * sizeMult);
        ctx.closePath();
        ctx.fill();

        // Eye - neon cyan
        ctx.fillStyle = CYBER.cyan;
        ctx.beginPath();
        ctx.arc(1 * s * sizeMult, 0, 1.5 * s * sizeMult, 0, Math.PI * 2);
        ctx.fill();
        // Eye glow
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(1 * s * sizeMult, 0, 0.8 * s * sizeMult, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Engine glow
        const engineGlow = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = this.glowColor;
        ctx.beginPath();
        ctx.arc(-5 * s * sizeMult, 0, 2.5 * s * sizeMult * engineGlow, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();

        // Shield indicator - cyberpunk cyan
        if (this.shieldHits > 0) {
            const shieldAlpha = 0.5 + Math.sin(Date.now() * 0.008) * 0.3;
            ctx.strokeStyle = `rgba(0, 240, 255, ${shieldAlpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 11 * s * sizeMult, 0, Math.PI * 2);
            ctx.stroke();

            // Shield pips - neon cyan
            for (let i = 0; i < this.shieldHits; i++) {
                const pipAngle = (i / 5) * Math.PI - Math.PI / 2;
                const pipX = this.x + Math.cos(pipAngle) * 9 * s * sizeMult;
                const pipY = this.y + Math.sin(pipAngle) * 9 * s * sizeMult;
                ctx.fillStyle = CYBER.cyan;
                ctx.beginPath();
                ctx.arc(pipX, pipY, 1.5 * s, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Regen indicator - neon green
        if (this.regenRate > 0) {
            const regenPulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = CYBER.green;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 12 * s * sizeMult * regenPulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Slow/Frost indicator - cyan ice ring
        if (this.slowTimer > 0) {
            const frostAlpha = 0.4 + Math.sin(Date.now() * 0.015) * 0.2;
            ctx.strokeStyle = `rgba(100, 200, 255, ${frostAlpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 13 * s * sizeMult, 0, Math.PI * 2);
            ctx.stroke();
            // Ice particles
            for (let i = 0; i < 4; i++) {
                const angle = (Date.now() * 0.002 + i * Math.PI / 2) % (Math.PI * 2);
                const px = this.x + Math.cos(angle) * 11 * s * sizeMult;
                const py = this.y + Math.sin(angle) * 11 * s * sizeMult;
                ctx.fillStyle = `rgba(200, 240, 255, ${frostAlpha})`;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Health bar - cyberpunk style
        const barWidth = 15 * s * sizeMult;
        const barHeight = 2 * s;
        const barY = this.y - 11 * s * sizeMult;
        const healthPercent = this.health / this.maxHealth;

        // Bar background
        ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
        ctx.fillRect(this.x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

        // Health color - neon gradient
        let healthColor = CYBER.green;
        if (healthPercent <= 0.5) healthColor = CYBER.yellow;
        if (healthPercent <= 0.25) healthColor = CYBER.red;
        ctx.fillStyle = healthColor;
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // Health bar glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = healthColor;
        ctx.fillRect(this.x - barWidth / 2, barY - 1, barWidth * healthPercent, barHeight + 2);
        ctx.globalAlpha = 1;
    }
}

// ==================
// BULLET CLASS
// ==================
class Bullet {
    constructor(x, y, target, damage, pierce, slow, isCrit) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = 250;
        this.pierceCount = pierce;
        this.slowPercent = slow;
        this.isCrit = isCrit;
        this.enemiesHit = [];
        this.trail = [];
        this.rotation = 0;
    }

    update(dt) {
        // If target is gone, find new one or die
        if (!this.target || enemies.indexOf(this.target) === -1) {
            if (this.pierceCount > 0) {
                this.findNewTarget();
            }
            if (!this.target) {
                return false; // Remove bullet
            }
        }

        // Trail
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > 8) this.trail.pop();

        // Move toward target
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.rotation = Math.atan2(dy, dx);

        if (dist > 0) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }

        // Hit detection
        if (dist < 8) {
            this.hit();
            if (this.pierceCount > 0) {
                this.pierceCount--;
                this.enemiesHit.push(this.target);
                this.findNewTarget();
                if (this.target) return true;
            }
            return false; // Remove bullet
        }

        return true; // Keep bullet
    }

    findNewTarget() {
        let closest = null;
        let closestDist = 150;
        for (const enemy of enemies) {
            if (!this.enemiesHit.includes(enemy)) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = enemy;
                }
            }
        }
        this.target = closest;
    }

    hit() {
        if (this.target && enemies.indexOf(this.target) !== -1) {
            this.target.takeDamage(this.damage, this.isCrit);
            if (this.slowPercent > 0) {
                this.target.applySlow(this.slowPercent);
            }
        }
    }

    draw() {
        const sizeMult = this.isCrit ? 1.5 : 1;
        // Cyberpunk bullet colors - magenta for crit, cyan for normal
        const trailColor = this.isCrit ? CYBER.magenta : CYBER.cyan;
        const glowColor = this.isCrit ? '#ff44aa' : CYBER.cyanDim;
        const coreColor = this.isCrit ? CYBER.yellow : '#ffffff';

        // Trail - neon effect
        for (let i = 0; i < this.trail.length; i++) {
            const pos = this.trail[i];
            const alpha = 1 - (i / this.trail.length);
            const size = 3 * alpha * sizeMult;
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = trailColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Outer glow
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6 * sizeMult, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = trailColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3.5 * sizeMult, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Core - bright white/yellow center
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2 * sizeMult, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================
// DAMAGE NUMBERS
// ==================
function spawnDamageNumber(x, y, amount, isCrit, isBlocked) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const speed = 40 + Math.random() * 20;
    damageNumbers.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y,
        vx: Math.cos(angle) * speed * (isCrit ? 1.3 : 1),
        vy: Math.sin(angle) * speed * (isCrit ? 1.3 : 1),
        amount: amount,
        isCrit: isCrit,
        isBlocked: isBlocked,
        age: 0,
        lifetime: 0.8
    });
}

function updateDamageNumbers(dt) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const dn = damageNumbers[i];
        dn.age += dt;
        dn.vx *= 0.95;
        dn.vy *= 0.95;
        dn.x += dn.vx * dt;
        dn.y += dn.vy * dt;
        if (dn.age >= dn.lifetime) {
            damageNumbers.splice(i, 1);
        }
    }
}

function drawDamageNumbers() {
    for (const dn of damageNumbers) {
        const alpha = 1 - (dn.age / dn.lifetime);
        let scale = 1;
        if (dn.age < 0.1) scale = dn.age / 0.1 * 1.2;
        else if (dn.age < 0.2) scale = 1.2 - (dn.age - 0.1) / 0.1 * 0.2;

        let text = Math.floor(dn.amount).toString();
        let fontSize = dn.isCrit ? 16 : 12;
        if (dn.isBlocked) {
            text = 'BLOCKED';
            fontSize = 10;
        }
        fontSize = Math.floor(fontSize * scale);

        // Cyberpunk damage colors
        let color, outlineColor;
        if (dn.isBlocked) {
            // Cyan for blocked
            color = `rgba(0, 240, 255, ${alpha})`;
            outlineColor = `rgba(0, 50, 80, ${alpha * 0.9})`;
        } else if (dn.isCrit) {
            // Magenta/yellow for crit
            color = `rgba(255, 0, 170, ${alpha})`;
            outlineColor = `rgba(80, 0, 50, ${alpha})`;
        } else {
            // White/cyan for normal
            color = `rgba(255, 255, 255, ${alpha})`;
            outlineColor = `rgba(0, 100, 120, ${alpha * 0.8})`;
        }

        ctx.font = `bold ${fontSize}px 'Orbitron', Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow effect
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = color;
        ctx.fillText(text, dn.x, dn.y);
        ctx.globalAlpha = 1;

        // Outline
        ctx.fillStyle = outlineColor;
        ctx.fillText(text, dn.x - 1, dn.y - 1);
        ctx.fillText(text, dn.x + 1, dn.y - 1);
        ctx.fillText(text, dn.x - 1, dn.y + 1);
        ctx.fillText(text, dn.x + 1, dn.y + 1);

        // Main text
        ctx.fillStyle = color;
        ctx.fillText(text, dn.x, dn.y);
    }
}

// ==================
// WAVE SCALING
// ==================
function getEnemyCount(wave) {
    let base = 10 + wave * 4;
    if (wave > 10) base += Math.pow(wave - 10, 1.5);
    if (wave > 20) base += Math.pow(wave - 20, 1.7);
    return Math.floor(base);
}

function getHealthMultiplier(wave) {
    return 0.6 * Math.pow(1.2, wave);
}

function getSpeedMultiplier(wave) {
    return Math.min(2.5, 0.8 + wave * 0.06);
}

function getSpawnDelay(wave) {
    return Math.max(0.3, 2.5 - wave * 0.1);
}

function getMoneyReward(wave) {
    // Simple linear scaling - no penalties
    return 8 + wave;
}

function getAvailableTypes(wave) {
    if (wave <= 2) return ['normal'];
    if (wave <= 4) return ['normal', 'fast'];
    if (wave <= 6) return ['normal', 'fast', 'tank'];
    if (wave <= 9) return ['normal', 'fast', 'tank', 'swarm', 'shielded'];
    if (wave <= 12) return ['normal', 'fast', 'tank', 'swarm', 'shielded', 'regen'];
    // Splitters are more common after wave 13 (appear twice in pool)
    return ['normal', 'fast', 'tank', 'swarm', 'shielded', 'regen', 'splitter', 'splitter'];
}

// ==================
// SPAWNING
// ==================
let spawnTimer = 0;
let spawnDelay = 2;
let isBossWave = false;
let isSwarmWave = false;
let isMegaBossWave = false;

function startWave(waveNum) {
    game.currentWave = waveNum;
    game.waveInProgress = true;

    isMegaBossWave = (waveNum % 10 === 0) && waveNum > 0;
    isBossWave = (waveNum % 5 === 0) && waveNum > 0 && !isMegaBossWave;
    isSwarmWave = (waveNum % 3 === 0) && waveNum > 2 && !isBossWave && !isMegaBossWave;

    // Play wave start sound
    if (isMegaBossWave || isBossWave) {
        AudioManager.playBossWarning();
    } else {
        AudioManager.playWaveStart();
    }

    let count = getEnemyCount(waveNum);
    if (isMegaBossWave) {
        count = 1; // Just the mega boss
        spawnDelay = 1;
    } else if (isSwarmWave) {
        count *= 3;
        spawnDelay = 0.15;
    } else if (isBossWave) {
        count = Math.floor(count * 0.5) + 1;
        spawnDelay = getSpawnDelay(waveNum) * 1.5;
    } else {
        spawnDelay = getSpawnDelay(waveNum);
    }

    game.enemiesToSpawn = count;
    spawnTimer = spawnDelay; // Spawn first enemy immediately

    updateWaveLabel();
}

function spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const spawnRadius = getSpawnRadius();
    const x = core.x + Math.cos(angle) * spawnRadius;
    const y = core.y + Math.sin(angle) * spawnRadius;

    const enemy = new Enemy(x, y, game.currentWave);

    // Determine type
    let type;
    if (isMegaBossWave) {
        type = 'megaboss';
    } else if (isSwarmWave) {
        type = 'swarm';
    } else if (isBossWave) {
        type = Math.random() < 0.7 ? 'tank' : 'normal';
    } else {
        const types = getAvailableTypes(game.currentWave);
        type = types[Math.floor(Math.random() * types.length)];
    }
    enemy.setType(type);

    // Boss wave buffs
    if (isBossWave) {
        if (type === 'tank') {
            enemy.maxHealth *= 2;
            enemy.health = enemy.maxHealth;
        } else {
            enemy.maxHealth *= 1.5;
            enemy.health = enemy.maxHealth;
        }
    }

    // Swarm wave adjustments
    if (isSwarmWave) {
        enemy.maxHealth *= 0.4;
        enemy.health = enemy.maxHealth;
        enemy.speed *= 1.3;
        enemy.baseSpeed = enemy.speed;
    }

    enemies.push(enemy);
    game.enemiesAlive++;
    game.enemiesToSpawn = Math.max(0, game.enemiesToSpawn - 1);
}

// ==================
// CORE UPDATE & DRAW
// ==================
function updateCore(dt) {
    core.pulseTime += dt * 2;
    core.muzzleFlash = Math.max(0, core.muzzleFlash - dt * 8);

    // Update ability timers
    if (core.pierceActive) {
        core.pierceTimer -= dt;
        if (core.pierceTimer <= 0) core.pierceActive = false;
    }
    if (core.frostActive) {
        core.frostTimer -= dt;
        if (core.frostTimer <= 0) core.frostActive = false;
    }
    if (core.critActive) {
        core.critTimer -= dt;
        if (core.critTimer <= 0) core.critActive = false;
    }

    // Update PULSE laser ring
    if (core.pulseActive) {
        core.pulseTimer -= dt;
        core.pulseDamageTimer -= dt;

        // Damage enemies crossing the range boundary (every 0.15 seconds)
        if (core.pulseDamageTimer <= 0) {
            core.pulseDamageTimer = 0.15; // Faster damage tick rate

            const ringThickness = 30; // How close to the ring edge to take damage
            const enemiesToKill = [];

            for (const enemy of enemies) {
                const dx = enemy.x - core.x;
                const dy = enemy.y - core.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Check if enemy is near the range ring (crossing through it)
                if (Math.abs(dist - core.attackRange) < ringThickness) {
                    // High flat damage + percentage damage = destroys weak enemies, hurts tanks
                    const flatDamage = 80; // Base damage that kills weak enemies
                    const percentDamage = Math.floor(enemy.maxHealth * 0.15); // 15% max HP
                    const pulseDamage = flatDamage + percentDamage;
                    enemy.health -= pulseDamage;

                    // Create damage number
                    damageNumbers.push({
                        x: enemy.x + (Math.random() - 0.5) * 20,
                        y: enemy.y - 15,
                        value: pulseDamage,
                        timer: 0.6,
                        color: CYBER.magenta
                    });

                    // Mark for death if health depleted
                    if (enemy.health <= 0) {
                        enemiesToKill.push(enemy);
                    }
                }
            }

            // Kill enemies after iteration is complete
            for (const enemy of enemiesToKill) {
                enemy.die();
            }
        }

        // End pulse when timer runs out
        if (core.pulseTimer <= 0) {
            core.pulseActive = false;
            core.pulseTimer = 0;
        }
    }

    // Find target
    core.target = null;
    let closestDist = core.attackRange;
    for (const enemy of enemies) {
        const dx = enemy.x - core.x;
        const dy = enemy.y - core.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= closestDist) {
            closestDist = dist;
            core.target = enemy;
        }
    }

    // Rotate toward target
    if (core.target) {
        const dx = core.target.x - core.x;
        const dy = core.target.y - core.y;
        core.rotation = Math.atan2(dy, dx);
    }

    // Shooting
    core.shootTimer -= dt;
    if (core.shootTimer <= 0 && core.target) {
        shoot();
        core.shootTimer = 1 / core.fireRate;
    }
}

function shoot() {
    core.muzzleFlash = 1;

    // Get targets for multishot
    let targets = [];
    if (core.projectileCount === 1) {
        targets = [core.target];
    } else {
        // Sort enemies by distance
        const sorted = [...enemies].sort((a, b) => {
            const da = Math.sqrt((a.x - core.x) ** 2 + (a.y - core.y) ** 2);
            const db = Math.sqrt((b.x - core.x) ** 2 + (b.y - core.y) ** 2);
            return da - db;
        }).filter(e => {
            const d = Math.sqrt((e.x - core.x) ** 2 + (e.y - core.y) ** 2);
            return d <= core.attackRange;
        });
        targets = sorted.slice(0, core.projectileCount);
    }

    // Create bullets
    let hasCrit = false;
    for (const target of targets) {
        const dx = target.x - core.x;
        const dy = target.y - core.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const startX = core.x + (dx / dist) * 25;
        const startY = core.y + (dy / dist) * 25;

        let damage = core.damage;
        let isCrit = false;
        if (core.critActive) {
            damage *= 2;
            isCrit = true;
            hasCrit = true;
        }

        // Pierce: ability gives 3, sniper class gives inherent 2
        let pierce = 0;
        if (core.pierceActive) pierce = 3;
        else if (core.classSpecial === 'pierce2') pierce = 2;
        const slow = core.frostActive ? FROST_SLOW : 0;

        bullets.push(new Bullet(startX, startY, target, damage, pierce, slow, isCrit));
    }

    // Play shoot sound
    if (hasCrit) {
        AudioManager.playCritShoot();
    } else {
        AudioManager.playShoot();
    }
}

function getClassColor() {
    const classDef = SaveManager.classDefinitions[core.currentClass];
    return classDef ? classDef.color : CYBER.cyan;
}

function drawCore() {
    const pulse = Math.sin(core.pulseTime * 2) * 0.2 + 0.8;
    const time = Date.now() * 0.001;
    const classColor = getClassColor();

    // Draw grid pattern in background
    ctx.save();
    ctx.globalAlpha = 0.1;
    const gridSize = 30;
    const gridRadius = core.attackRange + 50;
    ctx.strokeStyle = CYBER.cyan;
    ctx.lineWidth = 0.5;
    for (let x = -gridRadius; x <= gridRadius; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(core.x + x, core.y - gridRadius);
        ctx.lineTo(core.x + x, core.y + gridRadius);
        ctx.stroke();
    }
    for (let y = -gridRadius; y <= gridRadius; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(core.x - gridRadius, core.y + y);
        ctx.lineTo(core.x + gridRadius, core.y + y);
        ctx.stroke();
    }
    ctx.restore();

    // Range indicator - cyberpunk cyan fill
    ctx.globalAlpha = 0.04 * pulse;
    ctx.fillStyle = CYBER.cyan;
    ctx.beginPath();
    ctx.arc(core.x, core.y, core.attackRange, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Range ring - neon cyan
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.5 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(core.x, core.y, core.attackRange, 0, Math.PI * 2);
    ctx.stroke();

    // Animated scanning dashes - becomes LASER RING when pulse active
    const numDashes = 24;
    const isPulseActive = core.pulseActive && core.pulseTimer > 0;

    if (isPulseActive) {
        // PULSE ACTIVE: Draw intense laser ring
        const pulseIntensity = 0.7 + Math.sin(time * 15) * 0.3;

        // Outer glow
        ctx.strokeStyle = `rgba(255, 0, 170, ${0.4 * pulseIntensity})`;
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.arc(core.x, core.y, core.attackRange, 0, Math.PI * 2);
        ctx.stroke();

        // Main laser ring
        ctx.strokeStyle = `rgba(255, 100, 200, ${0.9 * pulseIntensity})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(core.x, core.y, core.attackRange, 0, Math.PI * 2);
        ctx.stroke();

        // Inner bright core
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * pulseIntensity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(core.x, core.y, core.attackRange, 0, Math.PI * 2);
        ctx.stroke();

        // Spinning energy dashes (faster when active)
        for (let i = 0; i < numDashes; i++) {
            const angle = (i / numDashes) * Math.PI * 2 + core.pulseTime * 2; // Faster spin
            const r1 = core.attackRange - 15;
            const r2 = core.attackRange + 15;
            const dashAlpha = 0.6 + Math.sin(angle * 3 + time * 8) * 0.4;
            ctx.strokeStyle = `rgba(255, 200, 255, ${dashAlpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(core.x + Math.cos(angle) * r1, core.y + Math.sin(angle) * r1);
            ctx.lineTo(core.x + Math.cos(angle) * r2, core.y + Math.sin(angle) * r2);
            ctx.stroke();
        }
    } else {
        // Normal scanning dashes
        for (let i = 0; i < numDashes; i++) {
            const angle = (i / numDashes) * Math.PI * 2 + core.pulseTime * 0.5;
            const r1 = core.attackRange - 5;
            const r2 = core.attackRange + 5;
            const dashAlpha = 0.3 + Math.sin(angle * 3 + time * 2) * 0.2;
            ctx.strokeStyle = `rgba(0, 240, 255, ${dashAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(core.x + Math.cos(angle) * r1, core.y + Math.sin(angle) * r1);
            ctx.lineTo(core.x + Math.cos(angle) * r2, core.y + Math.sin(angle) * r2);
            ctx.stroke();
        }
    }

    // Hex grid pattern around core
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = CYBER.cyan;
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 3; ring++) {
        const hexRadius = 25 + ring * 12;
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
            const hexAngle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const hx = core.x + Math.cos(hexAngle) * hexRadius;
            const hy = core.y + Math.sin(hexAngle) * hexRadius;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Core base - dark with neon border
    ctx.fillStyle = CYBER.bgDark;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Outer ring - class color
    ctx.strokeStyle = classColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Core ring - class color
    ctx.strokeStyle = classColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 15, 0, Math.PI * 2);
    ctx.stroke();

    // Inner chamber
    const innerPulse = Math.sin(core.pulseTime * 1.5) * 0.2 + 0.8;
    ctx.fillStyle = '#0a1520';
    ctx.beginPath();
    ctx.arc(core.x, core.y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Energy core - pulsing with class color
    ctx.globalAlpha = 0.6 * innerPulse;
    ctx.fillStyle = classColor;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.8 * innerPulse;
    ctx.fillStyle = classColor;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.globalAlpha = innerPulse;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(core.x, core.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Turret
    ctx.save();
    ctx.translate(core.x, core.y);
    ctx.rotate(core.rotation);

    // Barrel - dark with neon highlights
    ctx.fillStyle = '#0a1520';
    ctx.fillRect(0, -4, 28, 8);

    // Barrel border
    ctx.strokeStyle = CYBER.cyan;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -4, 28, 8);

    // Barrel highlights
    ctx.fillStyle = CYBER.cyanDim;
    ctx.fillRect(4, -2, 20, 1);
    ctx.fillRect(4, 1, 20, 1);

    // Energy lines on barrel
    const energyPulse = Math.sin(time * 4) * 0.5 + 0.5;
    ctx.globalAlpha = 0.5 + energyPulse * 0.5;
    ctx.fillStyle = CYBER.cyan;
    ctx.fillRect(25, -3, 3, 6);
    ctx.globalAlpha = 1;

    // Muzzle flash - cyan/magenta
    if (core.muzzleFlash > 0) {
        ctx.globalAlpha = core.muzzleFlash;
        ctx.fillStyle = CYBER.cyan;
        ctx.beginPath();
        ctx.arc(28, 0, 8 * core.muzzleFlash, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = CYBER.magenta;
        ctx.beginPath();
        ctx.arc(28, 0, 5 * core.muzzleFlash, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(28, 0, 2 * core.muzzleFlash, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Turret base center
    ctx.fillStyle = CYBER.bgDark;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CYBER.magenta;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 7, 0, Math.PI * 2);
    ctx.stroke();
}

// ==================
// EXPLOSIONS
// ==================
function updateExplosions(dt) {
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].time += dt;
        if (explosions[i].time >= explosions[i].maxTime) {
            explosions.splice(i, 1);
        }
    }
}

function drawExplosions() {
    for (const exp of explosions) {
        const progress = exp.time / exp.maxTime;
        const radius = 12 + progress * 25;
        const alpha = 1 - progress;

        // Outer ring - magenta
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = CYBER.magenta;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, radius * 1.2, 0, Math.PI * 2);
        ctx.stroke();

        // Middle ring - cyan
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = CYBER.cyan;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow - magenta
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = CYBER.magenta;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Core - white
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}

// ==================
// UI UPDATES
// ==================
function updateUI() {
    document.getElementById('moneyLabel').textContent = `$${game.money}`;
    document.getElementById('livesLabel').textContent = `♥ ${lives}`;
    document.getElementById('highScoreLabel').textContent = `HI::${SaveManager.data.highScore}`;

    // Enemy count (enemies alive + enemies still to spawn)
    const totalEnemiesLeft = game.enemiesAlive + game.enemiesToSpawn;
    document.getElementById('enemyCountLabel').textContent = `☠ ${totalEnemiesLeft}`;

    // Ability buttons (with unlock keys)
    updateAbilityButton('frostBtn', core.frostActive, core.frostTimer, core.frostCharges, 'FROST', 'frost');
    updateAbilityButton('pierceBtn', core.pierceActive, core.pierceTimer, core.pierceCharges, 'PIERCE', 'pierce');
    updateAbilityButton('furyBtn', core.critActive, core.critTimer, core.critCharges, 'FURY', 'fury');
    updateAbilityButton('pulseBtn', core.pulseActive, core.pulseTimer, core.pulseCharges, 'PULSE', 'pulse');

    // Nuke button (instant use, no timer) - needs special handling for locked state
    const nukeBtn = document.getElementById('nukeBtn');
    const nukeCountSpan = nukeBtn.querySelector('.count');
    const nukeNameSpan = nukeBtn.querySelector('span:not(.count)');
    const nukeLocked = !SaveManager.isUnlocked('nuke');

    if (nukeLocked) {
        const progress = SaveManager.getUnlockProgress('nuke');
        if (nukeNameSpan) nukeNameSpan.textContent = 'LOCKED';
        if (nukeCountSpan) nukeCountSpan.textContent = progress ? `[${progress.label}]` : '[???]';
        nukeBtn.disabled = true;
        nukeBtn.classList.add('locked');
    } else {
        nukeBtn.classList.remove('locked');
        if (nukeNameSpan) nukeNameSpan.textContent = 'NUKE';
        if (nukeCountSpan) nukeCountSpan.textContent = `[${core.nukeCharges}]`;
        nukeBtn.disabled = core.nukeCharges <= 0 || enemies.length === 0;
    }

    // Start wave button
    const startBtn = document.getElementById('startWaveBtn');
    if (game.lifePauseCountdown > 0) {
        startBtn.textContent = `LIFE LOST! (${Math.ceil(game.lifePauseCountdown)})`;
        startBtn.disabled = true;
    } else if (game.waveInProgress || game.enemiesAlive > 0) {
        startBtn.textContent = 'WAVE IN PROGRESS';
        startBtn.disabled = true;
    } else if (game.countdownActive) {
        startBtn.textContent = `NEXT WAVE (${Math.ceil(game.countdown)})`;
        startBtn.disabled = false;
    } else {
        startBtn.textContent = 'START WAVE';
        startBtn.disabled = false;
    }
}

function updateAbilityButton(id, active, timer, charges, name, unlockKey) {
    const btn = document.getElementById(id);
    const countSpan = btn.querySelector('.count');
    const nameSpan = btn.querySelector('span:not(.count)');

    // Check if ability is locked
    const isLocked = unlockKey && !SaveManager.isUnlocked(unlockKey);

    if (isLocked) {
        const progress = SaveManager.getUnlockProgress(unlockKey);
        if (nameSpan) nameSpan.textContent = 'LOCKED';
        if (countSpan) countSpan.textContent = progress ? `[${progress.label}]` : '[???]';
        btn.disabled = true;
        btn.classList.remove('active');
        btn.classList.add('locked');
        return;
    }

    btn.classList.remove('locked');

    if (active) {
        if (nameSpan) nameSpan.textContent = name;
        if (countSpan) countSpan.textContent = `[${timer.toFixed(1)}s]`;
        btn.disabled = true;
        btn.classList.add('active');
    } else if (charges > 0) {
        if (nameSpan) nameSpan.textContent = name;
        if (countSpan) countSpan.textContent = `[${charges}]`;
        btn.disabled = false;
        btn.classList.remove('active');
    } else {
        if (nameSpan) nameSpan.textContent = name;
        if (countSpan) countSpan.textContent = '[0]';
        btn.disabled = true;
        btn.classList.remove('active');
    }
}

function updateWaveLabel() {
    const label = document.getElementById('waveLabel');
    label.classList.remove('boss', 'swarm', 'megaboss');

    if (isMegaBossWave) {
        const hint = !SaveManager.isUnlocked('extraLife') ? ' +?' : '';
        label.textContent = `W::${game.currentWave} MEGA${hint}`;
        label.classList.add('megaboss');
    } else if (isBossWave) {
        label.textContent = `W::${game.currentWave} BOSS`;
        label.classList.add('boss');
    } else if (isSwarmWave) {
        label.textContent = `W::${game.currentWave} SWARM`;
        label.classList.add('swarm');
    } else {
        label.textContent = `W::${game.currentWave}`;
    }
}

// Track upgrade levels
const upgradeLevels = {
    damage: 1,
    fireRate: 1,
    range: 1,
    multishot: 1
};

function updateUpgradePanel() {
    // Update panel money display
    const panelMoney = document.getElementById('panelMoneyLabel');
    if (panelMoney) panelMoney.textContent = `$${game.money}`;

    // Damage upgrade
    const damageBtn = document.getElementById('damageBtn');
    const dmgConfig = UPGRADE_CONFIG.damage;
    document.getElementById('damageInfo').textContent = `${core.damage} dmg (+${dmgConfig.perLevel})`;
    document.getElementById('damageCost').textContent = `$${game.damageCost}`;
    document.getElementById('damageLevel').textContent = `Level ${upgradeLevels.damage}`;
    damageBtn.disabled = game.money < game.damageCost;
    damageBtn.classList.toggle('affordable', game.money >= game.damageCost);

    // Fire rate upgrade
    const fireRateBtn = document.getElementById('fireRateBtn');
    const frConfig = UPGRADE_CONFIG.fireRate;
    document.getElementById('fireRateInfo').textContent = `${core.fireRate.toFixed(1)}/s (+${frConfig.perLevel})`;
    document.getElementById('fireRateCost').textContent = `$${game.fireRateCost}`;
    document.getElementById('fireRateLevel').textContent = `Level ${upgradeLevels.fireRate}`;
    fireRateBtn.disabled = game.money < game.fireRateCost;
    fireRateBtn.classList.toggle('affordable', game.money >= game.fireRateCost);

    // Range upgrade
    const rangeBtn = document.getElementById('rangeBtn');
    const rangeConfig = UPGRADE_CONFIG.range;
    const rangeMaxed = core.attackRange >= rangeConfig.max;
    document.getElementById('rangeInfo').textContent = rangeMaxed ? `${Math.floor(core.attackRange)} MAX` : `${Math.floor(core.attackRange)} (+${rangeConfig.perLevel})`;
    document.getElementById('rangeCost').textContent = rangeMaxed ? 'MAX' : `$${game.rangeCost}`;
    document.getElementById('rangeLevel').textContent = `Level ${upgradeLevels.range}`;
    const canBuyRange = game.money >= game.rangeCost && !rangeMaxed;
    rangeBtn.disabled = !canBuyRange;
    rangeBtn.classList.toggle('affordable', canBuyRange);
    rangeBtn.classList.toggle('maxed', rangeMaxed);

    // Multishot upgrade
    const multishotBtn = document.getElementById('multishotBtn');
    const msConfig = UPGRADE_CONFIG.multishot;
    const isMaxMultishot = core.projectileCount >= msConfig.max;
    document.getElementById('multishotInfo').textContent = isMaxMultishot ? `${core.projectileCount} targets MAX` : `${core.projectileCount} target${core.projectileCount > 1 ? 's' : ''} (+${msConfig.perLevel})`;
    document.getElementById('multishotCost').textContent = isMaxMultishot ? 'MAX' : `$${game.multishotCost}`;
    document.getElementById('multishotLevel').textContent = isMaxMultishot ? 'MAX' : `Level ${upgradeLevels.multishot}`;
    const canBuyMultishot = game.money >= game.multishotCost && !isMaxMultishot;
    multishotBtn.disabled = !canBuyMultishot;
    multishotBtn.classList.toggle('affordable', canBuyMultishot);
    multishotBtn.classList.toggle('maxed', isMaxMultishot);

    // Ability purchase buttons - check unlock status and max charges
    const frostBuyBtn = document.getElementById('buyFrostBtn');
    updatePurchaseButton(frostBuyBtn, getAbilityCost('frost'), 'frost');

    const pierceBuyBtn = document.getElementById('buyPierceBtn');
    updatePurchaseButton(pierceBuyBtn, getAbilityCost('pierce'), 'pierce');

    const furyBuyBtn = document.getElementById('buyFuryBtn');
    updatePurchaseButton(furyBuyBtn, getAbilityCost('fury'), 'fury');

    const pulseBuyBtn = document.getElementById('buyPulseBtn');
    updatePurchaseButton(pulseBuyBtn, getAbilityCost('pulse'), 'pulse');

    const nukeBuyBtn = document.getElementById('buyNukeBtn');
    updatePurchaseButton(nukeBuyBtn, getAbilityCost('nuke'), 'nuke');

    // Shield/Life purchase button (max 3)
    const shieldBtn = document.getElementById('buyShieldBtn');
    const canBuyShield = game.money >= game.shieldCost && lives < 3;
    shieldBtn.disabled = !canBuyShield;
    shieldBtn.classList.toggle('affordable', canBuyShield);
    shieldBtn.classList.remove('locked');
    // Update shield button text to show current lives
    const shieldCostSpan = shieldBtn.querySelector('.cost');
    if (lives >= 3) {
        shieldCostSpan.textContent = 'MAX';
    } else {
        shieldCostSpan.textContent = `$${game.shieldCost}`;
    }
}

// Helper for purchase buttons in upgrade panel
function updatePurchaseButton(btn, cost, unlockKey) {
    const isLocked = !SaveManager.isUnlocked(unlockKey);
    const costSpan = btn.querySelector('.cost');
    const nameSpan = btn.querySelector('span:not(.cost):not(.icon)');

    // Check if at max charges
    const currentCharges = getAbilityCharges(unlockKey);
    const maxCharges = ABILITY_MAX_CHARGES[unlockKey];
    const isMaxed = currentCharges >= maxCharges;

    if (isLocked) {
        btn.disabled = true;
        btn.classList.remove('affordable', 'maxed');
        btn.classList.add('locked');
        if (costSpan) costSpan.textContent = 'LOCKED';
    } else if (isMaxed) {
        btn.disabled = true;
        btn.classList.remove('affordable', 'locked');
        btn.classList.add('maxed');
        if (costSpan) costSpan.textContent = 'MAX';
    } else {
        btn.classList.remove('locked', 'maxed');
        btn.disabled = game.money < cost;
        btn.classList.toggle('affordable', game.money >= cost);
        if (costSpan) costSpan.textContent = `$${cost}`;
    }
}

function showUpgradePanel() {
    updateUpgradePanel();
    document.getElementById('upgradePanel').style.display = 'block';
}

function hideUpgradePanel() {
    document.getElementById('upgradePanel').style.display = 'none';
}

function showGameOver(won) {
    const panel = document.getElementById('gameOverPanel');
    const text = document.getElementById('gameOverText');
    const isNewHighScore = SaveManager.updateHighScore(game.currentWave);
    SaveManager.addGamePlayed();

    // Calculate and award scrap
    game.scrapEarned = SaveManager.calculateScrapEarned(game.currentWave, game.killsThisRun);
    SaveManager.addScrap(game.scrapEarned);

    // Signal gameplay stopped to CrazyGames
    CrazyGamesSDK.gameplayStop();

    if (isNewHighScore && game.currentWave > 0) {
        text.textContent = `NEW HIGH SCORE! Wave ${game.currentWave}`;
        text.style.color = '#ffcc00';
        // Celebrate new high score
        CrazyGamesSDK.happytime();
    } else {
        text.textContent = won ? 'VICTORY!' : 'CORE DESTROYED';
        text.style.color = won ? '#50ff80' : '#ff5050';
    }

    // Update stats display
    updateGameOverStats();

    panel.style.display = 'block';
    game.speedMultiplier = 1;
    document.getElementById('speedBtn').textContent = '>';
    AudioManager.playGameOver();
    AudioManager.stopMusic();
}

function updateGameOverStats() {
    const statsDiv = document.getElementById('gameOverStats');
    if (statsDiv) {
        let unlockProgress = getNextUnlockProgress();
        statsDiv.innerHTML = `
            <div>Wave Reached: ${game.currentWave}</div>
            <div>Kills This Run: ${game.killsThisRun}</div>
            <div class="scrap-earned">+${game.scrapEarned} SCRAP</div>
            <div class="scrap-total">Total: ${SaveManager.data.scrap.toLocaleString()} Scrap</div>
            ${unlockProgress ? `<div class="unlock-hint">${unlockProgress}</div>` : ''}
        `;
    }
}

function getNextUnlockProgress() {
    const data = SaveManager.data;
    const unlocks = data.unlocks;

    // Find next locked ability and show progress
    if (!unlocks.pierce) {
        return `Next: PIERCE (Wave ${data.highScore}/5)`;
    }
    if (!unlocks.fury) {
        return `Next: FURY (${data.totalEnemiesKilled}/100 kills)`;
    }
    if (!unlocks.pulse) {
        return `Next: PULSE (Wave ${data.highScore}/15)`;
    }
    if (!unlocks.nuke) {
        return `Next: NUKE (${data.totalEnemiesKilled}/500 kills)`;
    }
    if (!unlocks.extraLife) {
        return `Next: +1 LIFE (Defeat Mega Boss)`;
    }
    return null; // All unlocked
}

// ==================
// GAME LOOP
// ==================
function gameLoop(currentTime) {
    if (!game.lastTime) game.lastTime = currentTime;
    let dt = (currentTime - game.lastTime) / 1000;
    game.lastTime = currentTime;

    // Cap delta time to prevent huge jumps
    dt = Math.min(dt, 0.1);

    // Title screen animation
    if (game.state === 'title') {
        // Update core pulse animation
        core.pulseTime += dt * 2;
        core.rotation += dt * 0.3; // Slow rotation

        // Ensure canvas is sized
        if (canvasWidth <= 0 || canvasHeight <= 0) {
            resizeCanvas();
        }

        // Clear and draw title background
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = CYBER.bgDark;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Center the view
        ctx.save();
        ctx.translate(gameOffsetX, gameOffsetY);
        ctx.scale(gameScale, gameScale);

        // Draw the core in the background
        drawCore();

        ctx.restore();

        requestAnimationFrame(gameLoop);
        return;
    }

    // Save raw dt for countdown (unaffected by speed multiplier)
    const rawDt = dt;

    // Apply speed multiplier (0 if paused)
    if (game.paused) {
        dt = 0;
    } else {
        dt *= game.speedMultiplier;
    }

    // Life lost countdown (runs even when paused)
    if (game.lifePauseCountdown > 0) {
        game.lifePauseCountdown -= rawDt;
        if (game.lifePauseCountdown <= 0) {
            game.lifePauseCountdown = 0;
            game.paused = false;
            hideUpgradePanel();
        }
    }

    if (!game.gameOver && !game.paused) {
        // Spawning
        if (game.waveInProgress && game.enemiesToSpawn > 0) {
            spawnTimer += dt;
            if (spawnTimer >= spawnDelay) {
                spawnEnemy();
                spawnTimer = 0;
            }
        }

        // Wave completion check
        if (game.enemiesAlive <= 0 && game.enemiesToSpawn <= 0 && game.waveInProgress) {
            game.waveInProgress = false;
            SaveManager.addWaveCompleted(game.currentWave);
            // Celebrate boss wave completion
            if (isBossWave || isMegaBossWave) {
                CrazyGamesSDK.happytime();
            }
        }

        // Auto-wave countdown (uses raw dt - unaffected by speed multiplier)
        if (!game.waveInProgress && game.enemiesAlive === 0 && !game.gameOver) {
            if (game.currentWave > 0 && game.upgradeShownForWave !== game.currentWave) {
                game.upgradeShownForWave = game.currentWave;
                showUpgradePanel();
                game.countdown = 10;
                game.countdownActive = true;
            }

            if (game.countdownActive) {
                game.countdown -= rawDt;
                if (game.countdown <= 0) {
                    game.countdownActive = false;
                    hideUpgradePanel();
                    startWave(game.currentWave + 1);
                }
            }
        }

        // Update
        updateCore(dt);

        for (const enemy of enemies) {
            enemy.update(dt);
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            if (!bullets[i].update(dt)) {
                bullets.splice(i, 1);
            }
        }

        updateExplosions(dt);
        updateDamageNumbers(dt);
    }

    // Ensure canvas is sized (will always have valid dimensions now)
    if (canvasWidth <= 0 || canvasHeight <= 0) {
        resizeCanvas();
    }

    // Reset transform and clear canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply screen shake
    let shakeX = 0, shakeY = 0;
    if (game.screenShake > 0) {
        shakeX = (Math.random() - 0.5) * game.screenShake * 2;
        shakeY = (Math.random() - 0.5) * game.screenShake * 2;
        game.screenShake *= 0.85; // Decay
        if (game.screenShake < 0.5) game.screenShake = 0;
    }

    // Center and scale the view
    ctx.save();
    ctx.translate(gameOffsetX + shakeX, gameOffsetY + shakeY);
    ctx.scale(gameScale, gameScale);

    drawCore();

    for (const enemy of enemies) {
        enemy.draw();
    }

    for (const bullet of bullets) {
        bullet.draw();
    }

    drawExplosions();
    drawDamageNumbers();

    // Draw lives indicator around core
    if (lives > 0) {
        const shieldPulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.6 * shieldPulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(core.x, core.y, 28, 0, Math.PI * 2);
        ctx.stroke();

        // Lives pips
        for (let i = 0; i < lives; i++) {
            const pipAngle = (i / 3) * Math.PI * 2 - Math.PI / 2;
            const pipX = core.x + Math.cos(pipAngle) * 28;
            const pipY = core.y + Math.sin(pipAngle) * 28;
            ctx.fillStyle = CYBER.cyan;
            ctx.beginPath();
            ctx.arc(pipX, pipY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();

    // Draw damage flash overlay
    if (game.damageFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 68, ${game.damageFlash * 0.4})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        game.damageFlash -= 0.05;
        if (game.damageFlash < 0) game.damageFlash = 0;
    }

    // Update UI
    updateUI();

    requestAnimationFrame(gameLoop);
}

// ==================
// EVENT LISTENERS
// ==================

// Initialize audio on first user interaction (works on iOS/Android)
function initAudioOnInteraction() {
    AudioManager.init();
    AudioManager.resume();
    AudioManager.startMusic();
    // Remove listeners after first interaction
    document.removeEventListener('touchstart', initAudioOnInteraction);
    document.removeEventListener('touchend', initAudioOnInteraction);
    document.removeEventListener('click', initAudioOnInteraction);
}
document.addEventListener('touchstart', initAudioOnInteraction, { once: true });
document.addEventListener('touchend', initAudioOnInteraction, { once: true });
document.addEventListener('click', initAudioOnInteraction, { once: true });

function handleStartWave() {
    if (!game.waveInProgress && game.enemiesAlive === 0) {
        AudioManager.playClick();
        game.countdownActive = false;
        hideUpgradePanel();
        startWave(game.currentWave + 1);
    }
}
document.getElementById('startWaveBtn').addEventListener('click', handleStartWave);
document.getElementById('startWaveBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    handleStartWave();
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    AudioManager.playClick();
    game.paused = !game.paused;
    const btn = document.getElementById('pauseBtn');
    if (game.paused) {
        btn.textContent = '>';
        btn.classList.add('paused');
    } else {
        btn.textContent = '||';
        btn.classList.remove('paused');
    }
});

document.getElementById('speedBtn').addEventListener('click', () => {
    AudioManager.playClick();
    // Cycle through 1x -> 2x -> 3x -> 1x
    if (game.speedMultiplier === 1) {
        game.speedMultiplier = 2;
        document.getElementById('speedBtn').textContent = '>>';
    } else if (game.speedMultiplier === 2) {
        game.speedMultiplier = 3;
        document.getElementById('speedBtn').textContent = '>>>';
    } else {
        game.speedMultiplier = 1;
        document.getElementById('speedBtn').textContent = '>';
    }
});

document.getElementById('pierceBtn').addEventListener('click', () => {
    if (core.pierceCharges > 0 && !core.pierceActive) {
        AudioManager.playAbility();
        core.pierceCharges--;
        core.pierceActive = true;
        core.pierceTimer = ABILITY_DURATION;
    }
});

document.getElementById('frostBtn').addEventListener('click', () => {
    if (core.frostCharges > 0 && !core.frostActive) {
        AudioManager.playAbility();
        core.frostCharges--;
        core.frostActive = true;
        core.frostTimer = FROST_DURATION;
    }
});

document.getElementById('furyBtn').addEventListener('click', () => {
    if (core.critCharges > 0 && !core.critActive) {
        AudioManager.playAbility();
        core.critCharges--;
        core.critActive = true;
        core.critTimer = ABILITY_DURATION;
    }
});

document.getElementById('nukeBtn').addEventListener('click', () => {
    if (core.nukeCharges > 0 && enemies.length > 0) {
        AudioManager.playAbility();
        core.nukeCharges--;
        // Kill all regular enemies, deal 80% damage to mega bosses
        const survivingEnemies = [];
        for (const enemy of [...enemies]) {
            if (enemy.isMegaBoss) {
                // Deal 80% max HP damage to mega bosses (they survive but weakened)
                const nukeDamage = Math.floor(enemy.maxHP * 0.8);
                enemy.hp -= nukeDamage;
                // Show damage number
                damageNumbers.push({
                    x: enemy.x,
                    y: enemy.y - 30,
                    damage: nukeDamage,
                    time: 0,
                    isCrit: true
                });
                if (enemy.hp > 0) {
                    survivingEnemies.push(enemy);
                } else {
                    // Boss died from nuke damage
                    game.money += enemy.moneyReward;
                    game.killsThisRun++;
                    SaveManager.addEnemyKilled();
                    enemy.onDeath();
                    explosions.push({
                        x: enemy.x,
                        y: enemy.y,
                        time: 0,
                        maxTime: 0.5
                    });
                }
            } else {
                // Kill regular enemies instantly
                game.money += enemy.moneyReward;
                game.killsThisRun++; // Track kills this run for scrap
                SaveManager.addEnemyKilled();
                explosions.push({
                    x: enemy.x,
                    y: enemy.y,
                    time: 0,
                    maxTime: 0.5
                });
            }
        }
        enemies = survivingEnemies;
        game.enemiesAlive = enemies.length;
        AudioManager.playExplosion();
    }
});

document.getElementById('pulseBtn').addEventListener('click', () => {
    if (core.pulseCharges > 0 && !core.pulseActive && enemies.length > 0) {
        AudioManager.playAbility();
        core.pulseCharges--;
        // Activate laser ring for 5 seconds
        core.pulseActive = true;
        core.pulseTimer = 5; // 5 second duration
        core.pulseDamageTimer = 0; // Start damaging immediately
    }
});

document.getElementById('damageBtn').addEventListener('click', () => {
    if (game.money >= game.damageCost) {
        const config = UPGRADE_CONFIG.damage;
        AudioManager.playUpgrade();
        game.money -= game.damageCost;
        core.damage += config.perLevel;
        game.damageCost = Math.floor(game.damageCost * config.costMultiplier);
        upgradeLevels.damage++;
        updateUpgradePanel();
    }
});

document.getElementById('fireRateBtn').addEventListener('click', () => {
    if (game.money >= game.fireRateCost) {
        const config = UPGRADE_CONFIG.fireRate;
        AudioManager.playUpgrade();
        game.money -= game.fireRateCost;
        core.fireRate += config.perLevel;
        game.fireRateCost = Math.floor(game.fireRateCost * config.costMultiplier);
        upgradeLevels.fireRate++;
        updateUpgradePanel();
    }
});

document.getElementById('rangeBtn').addEventListener('click', () => {
    const config = UPGRADE_CONFIG.range;
    if (game.money >= game.rangeCost && core.attackRange < config.max) {
        AudioManager.playUpgrade();
        game.money -= game.rangeCost;
        core.attackRange = Math.min(core.attackRange + config.perLevel, config.max);
        game.rangeCost = Math.floor(game.rangeCost * config.costMultiplier);
        upgradeLevels.range++;
        updateUpgradePanel();
    }
});

document.getElementById('multishotBtn').addEventListener('click', () => {
    const config = UPGRADE_CONFIG.multishot;
    if (game.money >= game.multishotCost && core.projectileCount < config.max) {
        AudioManager.playUpgrade();
        game.money -= game.multishotCost;
        core.projectileCount += config.perLevel;
        game.multishotCost = Math.floor(game.multishotCost * config.costMultiplier);
        upgradeLevels.multishot++;
        updateUpgradePanel();
    }
});

document.getElementById('buyPierceBtn').addEventListener('click', () => {
    if (canBuyAbility('pierce')) {
        const cost = getAbilityCost('pierce');
        AudioManager.playUpgrade();
        game.money -= cost;
        core.pierceCharges++;
        game.abilityPurchases.pierce++;
        updateUpgradePanel();
    }
});

document.getElementById('buyFrostBtn').addEventListener('click', () => {
    if (canBuyAbility('frost')) {
        const cost = getAbilityCost('frost');
        AudioManager.playUpgrade();
        game.money -= cost;
        core.frostCharges++;
        game.abilityPurchases.frost++;
        updateUpgradePanel();
    }
});

document.getElementById('buyFuryBtn').addEventListener('click', () => {
    if (canBuyAbility('fury')) {
        const cost = getAbilityCost('fury');
        AudioManager.playUpgrade();
        game.money -= cost;
        core.critCharges++;
        game.abilityPurchases.fury++;
        updateUpgradePanel();
    }
});

document.getElementById('buyNukeBtn').addEventListener('click', () => {
    if (canBuyAbility('nuke')) {
        const cost = getAbilityCost('nuke');
        AudioManager.playUpgrade();
        game.money -= cost;
        core.nukeCharges++;
        game.abilityPurchases.nuke++;
        updateUpgradePanel();
    }
});

document.getElementById('buyShieldBtn').addEventListener('click', () => {
    if (game.money >= game.shieldCost && lives < 3) {
        AudioManager.playUpgrade();
        game.money -= game.shieldCost;
        lives++;
        updateUpgradePanel();
    }
});

document.getElementById('buyPulseBtn').addEventListener('click', () => {
    if (canBuyAbility('pulse')) {
        const cost = getAbilityCost('pulse');
        AudioManager.playUpgrade();
        game.money -= cost;
        core.pulseCharges++;
        game.abilityPurchases.pulse++;
        updateUpgradePanel();
    }
});

document.getElementById('closeBtn').addEventListener('click', () => {
    AudioManager.playClick();
    hideUpgradePanel();
});

document.getElementById('musicBtn').addEventListener('click', () => {
    const enabled = AudioManager.toggleMusic();
    const btn = document.getElementById('musicBtn');
    if (enabled) {
        btn.classList.remove('muted');
    } else {
        btn.classList.add('muted');
    }
    SaveManager.saveSettings(AudioManager.musicEnabled, AudioManager.sfxEnabled);
});

document.getElementById('sfxBtn').addEventListener('click', () => {
    const enabled = AudioManager.toggleSfx();
    const btn = document.getElementById('sfxBtn');
    if (enabled) {
        btn.classList.remove('muted');
    } else {
        btn.classList.add('muted');
    }
    SaveManager.saveSettings(AudioManager.musicEnabled, AudioManager.sfxEnabled);
    // Play click sound to confirm sfx is on
    if (enabled) {
        AudioManager.playClick();
    }
});

// REBOOT button - show class selector
document.getElementById('restartBtn').addEventListener('click', () => {
    AudioManager.playClick();
    // Hide game over panel, show class select panel
    document.getElementById('gameOverPanel').style.display = 'none';
    showClassSelectPanel();
});

// Show class select panel for restart
function showClassSelectPanel() {
    const panel = document.getElementById('classSelectPanel');
    const grid = document.getElementById('classSelectGrid');
    const scrapLabel = document.getElementById('classSelectScrap');

    // Update scrap display
    scrapLabel.textContent = SaveManager.data.scrap.toLocaleString();

    // Build class buttons
    const classes = SaveManager.classDefinitions;
    const data = SaveManager.data;
    let html = '';

    for (const [classId, classDef] of Object.entries(classes)) {
        const isUnlocked = data.classUnlocks[classId];
        const isSelected = data.selectedClass === classId;
        const canAfford = data.scrap >= classDef.cost;

        let stateClass = '';
        if (isSelected) {
            stateClass = 'selected';
        } else if (isUnlocked) {
            stateClass = 'unlocked';
        } else if (canAfford) {
            stateClass = 'locked affordable';
        } else {
            stateClass = 'locked';
        }

        html += `
            <div class="class-select-btn ${stateClass}" data-class="${classId}">
                <div class="cs-icon" style="color: ${classDef.color}">${classDef.icon}</div>
                <span class="cs-name">${classDef.name}</span>
                ${!isUnlocked ? `<div class="cs-cost">${classDef.cost} SCRAP</div>` : ''}
            </div>
        `;
    }

    grid.innerHTML = html;
    panel.style.display = 'block';

    // Add click handlers
    grid.querySelectorAll('.class-select-btn').forEach(btn => {
        btn.addEventListener('click', () => handleClassSelectClick(btn.dataset.class));
    });
}

// Handle class selection in restart screen
function handleClassSelectClick(classId) {
    const isUnlocked = SaveManager.isClassUnlocked(classId);

    if (isUnlocked) {
        SaveManager.selectClass(classId);
        AudioManager.playClick();
        showClassSelectPanel(); // Refresh UI
    } else {
        // Try to purchase
        const classDef = SaveManager.classDefinitions[classId];
        if (SaveManager.data.scrap >= classDef.cost) {
            SaveManager.purchaseClass(classId);
            AudioManager.playAbility();
            showClassSelectPanel(); // Refresh UI
        }
    }
}

// DEPLOY button - actually restart the game
document.getElementById('classSelectStartBtn').addEventListener('click', () => {
    AudioManager.playClick();
    AudioManager.startMusic();
    // Hide class select panel
    document.getElementById('classSelectPanel').style.display = 'none';
    // Signal gameplay restarted
    CrazyGamesSDK.gameplayStart();
    // Reset game state
    game.money = 0;
    game.currentWave = 0;
    game.enemiesAlive = 0;
    game.enemiesToSpawn = 0;
    game.waveInProgress = false;
    game.gameOver = false;
    game.paused = false;
    game.speedMultiplier = 1;
    game.countdown = 0;
    game.countdownActive = false;
    game.upgradeShownForWave = -1;
    game.lifePauseCountdown = 0;
    game.killsThisRun = 0;
    game.scrapEarned = 0;

    game.damageCost = UPGRADE_CONFIG.damage.baseCost;
    game.fireRateCost = UPGRADE_CONFIG.fireRate.baseCost;
    game.rangeCost = UPGRADE_CONFIG.range.baseCost;
    game.multishotCost = UPGRADE_CONFIG.multishot.baseCost;
    game.shieldCost = 400;

    // Reset ability purchase counters (for scaling costs)
    game.abilityPurchases = {
        frost: 0,
        pierce: 0,
        fury: 0,
        pulse: 0,
        nuke: 0
    };

    // Reset upgrade levels
    upgradeLevels.damage = 1;
    upgradeLevels.fireRate = 1;
    upgradeLevels.range = 1;

    // Reset core - apply selected class stats
    const selectedClass = SaveManager.getSelectedClass();
    core.currentClass = SaveManager.data.selectedClass;
    core.classSpecial = selectedClass.stats.special;
    core.damage = selectedClass.stats.damage;
    core.fireRate = selectedClass.stats.fireRate;
    core.attackRange = selectedClass.stats.range;
    core.projectileCount = selectedClass.stats.targets;
    upgradeLevels.multishot = selectedClass.stats.targets; // Match class starting targets
    core.spinupMultiplier = 1; // Reset spinup for minigun
    core.pierceActive = false;
    core.pierceTimer = 0;
    core.pierceCharges = 0;
    core.frostActive = false;
    core.frostTimer = 0;
    core.frostCharges = 0;
    core.critActive = false;
    core.critTimer = 0;
    core.critCharges = 0;
    core.nukeCharges = 0;
    core.pulseCharges = 0;
    core.pulseActive = false;
    core.pulseTimer = 0;
    core.pulseDamageTimer = 0;
    core.shootTimer = 0;

    // Clear entities
    enemies = [];
    bullets = [];
    explosions = [];
    damageNumbers = [];

    // Reset lives - give +1 if extraLife is unlocked
    lives = SaveManager.isUnlocked('extraLife') ? 1 : 0;

    // Hide panels
    hideUpgradePanel();

    // Reset UI
    document.getElementById('speedBtn').textContent = '>';
    document.getElementById('pauseBtn').textContent = '||';
    document.getElementById('pauseBtn').classList.remove('paused');
    document.getElementById('waveLabel').textContent = 'W::0';
    document.getElementById('waveLabel').classList.remove('boss', 'swarm');
});

// ==================
// INIT
// ==================
SaveManager.init();
core.x = 0;
core.y = 0;

// Title screen setup
function showTitleScreen() {
    game.state = 'title';
    document.getElementById('titleScreen').classList.remove('hidden');
    document.getElementById('ui').style.display = 'none';

    // Update title stats
    document.getElementById('titleHighScore').textContent = `Wave ${SaveManager.data.highScore}`;
    document.getElementById('titleKills').textContent = SaveManager.data.totalEnemiesKilled.toLocaleString();

    // Update unlocks display
    updateTitleUnlocks();
}

function updateTitleUnlocks() {
    const container = document.getElementById('titleUnlocks');
    if (!container) return;

    const data = SaveManager.data;

    // Show scrap balance only (abilities unlock automatically during gameplay)
    let html = `
        <div class="scrap-balance">⚙ ${data.scrap.toLocaleString()} SCRAP</div>
    `;
    container.innerHTML = html;

    // Update class selector
    updateClassSelector();
}

function updateClassSelector() {
    const container = document.getElementById('classSelector');
    if (!container) return;

    const data = SaveManager.data;
    const classes = SaveManager.classDefinitions;
    let html = '';

    for (const [classId, classDef] of Object.entries(classes)) {
        const isUnlocked = data.classUnlocks[classId];
        const isSelected = data.selectedClass === classId;
        const canAfford = data.scrap >= classDef.cost;

        let stateClass = '';
        if (isSelected) {
            stateClass = 'selected';
        } else if (isUnlocked) {
            stateClass = 'unlocked';
        } else if (canAfford) {
            stateClass = 'locked affordable';
        } else {
            stateClass = 'locked';
        }

        html += `
            <div class="class-btn ${stateClass}" data-class="${classId}" style="--class-color: ${classDef.color}">
                <span class="class-icon" style="color: ${classDef.color}">${classDef.icon}</span>
                <span class="class-name">${classDef.name}</span>
                ${!isUnlocked ? `<span class="class-cost">${classDef.cost} ⚙</span>` : ''}
            </div>
        `;
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', () => handleClassClick(btn.dataset.class));
    });
}

function handleClassClick(classId) {
    const isUnlocked = SaveManager.isClassUnlocked(classId);

    if (isUnlocked) {
        // Select this class
        SaveManager.selectClass(classId);
        AudioManager.playClick();
        updateClassSelector();
    } else {
        // Try to unlock
        const classDef = SaveManager.classDefinitions[classId];
        if (SaveManager.data.scrap >= classDef.cost) {
            if (SaveManager.unlockClass(classId)) {
                AudioManager.playUpgrade();
                // Auto-select newly unlocked class
                SaveManager.selectClass(classId);
                updateTitleUnlocks(); // Update scrap display
            }
        } else {
            // Can't afford - play error sound or shake
            AudioManager.playClick();
        }
    }
}

function hideTitleScreen() {
    game.state = 'playing';
    document.getElementById('titleScreen').classList.add('hidden');
    document.getElementById('ui').style.display = 'block';
}

function showTutorial() {
    document.getElementById('tutorialOverlay').classList.remove('hidden');
}

function hideTutorial() {
    document.getElementById('tutorialOverlay').classList.add('hidden');
    SaveManager.data.tutorialSeen = true;
    SaveManager.save();
}

function startGame() {
    hideTitleScreen();
    AudioManager.init();
    AudioManager.resume();
    AudioManager.startMusic();
    AudioManager.playClick();

    // Apply selected class stats to core
    const selectedClass = SaveManager.getSelectedClass();
    core.currentClass = SaveManager.data.selectedClass;
    core.classSpecial = selectedClass.stats.special;
    core.damage = selectedClass.stats.damage;
    core.fireRate = selectedClass.stats.fireRate;
    core.attackRange = selectedClass.stats.range;
    core.projectileCount = selectedClass.stats.targets;
    core.spinupMultiplier = 1;

    // Signal gameplay started to CrazyGames
    CrazyGamesSDK.gameplayStart();

    // Show tutorial on first play
    if (!SaveManager.data.tutorialSeen) {
        showTutorial();
    }
}

// Play button handler
document.getElementById('playBtn').addEventListener('click', startGame);
document.getElementById('playBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    startGame();
});

// Tutorial button handler
document.getElementById('tutorialBtn').addEventListener('click', () => {
    AudioManager.playClick();
    hideTutorial();
});
document.getElementById('tutorialBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    AudioManager.playClick();
    hideTutorial();
});

// Reset button handlers
document.getElementById('resetBtn').addEventListener('click', () => {
    AudioManager.playClick();
    document.getElementById('resetModal').classList.remove('hidden');
});

document.getElementById('resetConfirmBtn').addEventListener('click', () => {
    AudioManager.playClick();
    localStorage.clear();
    SaveManager.data = JSON.parse(JSON.stringify(SaveManager.defaultData));
    document.getElementById('resetModal').classList.add('hidden');
    showTitleScreen();
});

document.getElementById('resetCancelBtn').addEventListener('click', () => {
    AudioManager.playClick();
    document.getElementById('resetModal').classList.add('hidden');
});

// Show title screen on load
showTitleScreen();

// Signal that game loading is complete
CrazyGamesSDK.loadingStop();

requestAnimationFrame(gameLoop);
