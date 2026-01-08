// Core Defender - JavaScript Port
// ================================

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
        this.playMusicLoop();
    },

    stopMusic() {
        this.musicPlaying = false;
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
    storageKey: 'coreDefenderSave',

    defaultData: {
        highScore: 0,
        totalEnemiesKilled: 0,
        totalWavesCompleted: 0,
        totalGamesPlayed: 0,
        musicEnabled: true,
        sfxEnabled: true
    },

    data: null,

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
    },

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.data = { ...this.defaultData, ...JSON.parse(saved) };
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

    addWaveCompleted() {
        this.data.totalWavesCompleted++;
        this.save();
    },

    addGamePlayed() {
        this.data.totalGamesPlayed++;
        this.save();
    },

    saveSettings(musicEnabled, sfxEnabled) {
        this.data.musicEnabled = musicEnabled;
        this.data.sfxEnabled = sfxEnabled;
        this.save();
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
const SPAWN_RADIUS = 280;
const ABILITY_DURATION = 8;

// ==================
// GAME STATE
// ==================
const game = {
    money: 0,
    currentWave: 0,
    enemiesAlive: 0,
    enemiesToSpawn: 0,
    waveInProgress: false,
    gameOver: false,
    speedMultiplier: 1,
    countdown: 0,
    countdownActive: false,
    upgradeShownForWave: -1,
    lastTime: 0,

    // Upgrade costs
    damageCost: 50,
    fireRateCost: 75,
    rangeCost: 60,
    multishotCost: 250,
    pierceCost: 50,
    frostCost: 40,
    critCost: 60
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
    critCharges: 0
};

// ==================
// ENTITIES
// ==================
let enemies = [];
let bullets = [];
let explosions = [];
let damageNumbers = [];

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

        // Colors
        this.bodyColor = '#e64033';
        this.glowColor = '#ff3319';
    }

    setType(type) {
        this.type = type;
        switch (type) {
            case 'fast':
                this.speed *= 1.8;
                this.maxHealth *= 0.5;
                this.moneyReward = Math.floor(this.moneyReward * 0.8);
                this.bodyColor = '#33cce6';
                this.glowColor = '#19e6ff';
                break;
            case 'tank':
                this.speed *= 0.5;
                this.maxHealth *= 3.0;
                this.moneyReward = Math.floor(this.moneyReward * 2.0);
                this.bodyColor = '#994db3';
                this.glowColor = '#b333e6';
                break;
            case 'swarm':
                this.speed *= 1.2;
                this.maxHealth *= 0.3;
                this.moneyReward = Math.floor(this.moneyReward * 0.5);
                this.bodyColor = '#e6b333';
                this.glowColor = '#ffcc19';
                break;
            case 'shielded':
                this.speed *= 0.9;
                this.maxHealth *= 1.5;
                this.shieldHits = 5;
                this.moneyReward = Math.floor(this.moneyReward * 1.5);
                this.bodyColor = '#4dcccc';
                this.glowColor = '#33ffff';
                break;
            case 'regen':
                this.speed *= 0.8;
                this.maxHealth *= 2.0;
                this.regenRate = this.maxHealth * 0.1;
                this.moneyReward = Math.floor(this.moneyReward * 1.8);
                this.bodyColor = '#4de64d';
                this.glowColor = '#33ff4d';
                break;
            case 'splitter':
                this.speed *= 1.0;
                this.maxHealth *= 1.2;
                this.canSplit = true;
                this.splitCount = 2;
                this.moneyReward = Math.floor(this.moneyReward * 0.7);
                this.bodyColor = '#e666b3';
                this.glowColor = '#ff4dcc';
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
            game.gameOver = true;
            showGameOver(false);
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
        AudioManager.playExplosion();
        SaveManager.addEnemyKilled();

        // Splitter spawns children
        if (this.canSplit && this.splitCount > 0) {
            for (let i = 0; i < this.splitCount; i++) {
                const angle = (i / this.splitCount) * Math.PI * 2;
                const child = new Enemy(
                    this.x + Math.cos(angle) * 20,
                    this.y + Math.sin(angle) * 20,
                    game.currentWave
                );
                child.speed = this.speed * 1.5;
                child.maxHealth = this.maxHealth * 0.3;
                child.health = child.maxHealth;
                child.moneyReward = Math.floor(this.moneyReward * 0.3);
                child.bodyColor = '#ff99cc';
                child.glowColor = '#ff66b3';
                child.canSplit = false;
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

        // Eye
        ctx.fillStyle = '#ffe64d';
        ctx.beginPath();
        ctx.arc(1 * s * sizeMult, 0, 1.5 * s * sizeMult, 0, Math.PI * 2);
        ctx.fill();

        // Engine glow
        const engineGlow = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = this.glowColor;
        ctx.beginPath();
        ctx.arc(-5 * s * sizeMult, 0, 2.5 * s * sizeMult * engineGlow, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();

        // Shield indicator
        if (this.shieldHits > 0) {
            const shieldAlpha = 0.4 + Math.sin(Date.now() * 0.008) * 0.2;
            ctx.strokeStyle = `rgba(77, 230, 255, ${shieldAlpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 11 * s * sizeMult, 0, Math.PI * 2);
            ctx.stroke();

            // Shield pips
            for (let i = 0; i < this.shieldHits; i++) {
                const pipAngle = (i / 5) * Math.PI - Math.PI / 2;
                const pipX = this.x + Math.cos(pipAngle) * 9 * s * sizeMult;
                const pipY = this.y + Math.sin(pipAngle) * 9 * s * sizeMult;
                ctx.fillStyle = 'rgba(77, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(pipX, pipY, 1.5 * s, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Regen indicator
        if (this.regenRate > 0) {
            const regenPulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#33ff4d';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 12 * s * sizeMult * regenPulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Health bar
        const barWidth = 15 * s * sizeMult;
        const barHeight = 2 * s;
        const barY = this.y - 11 * s * sizeMult;
        const healthPercent = this.health / this.maxHealth;

        ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

        let healthColor = '#33e64d';
        if (healthPercent <= 0.5) healthColor = '#e6e633';
        if (healthPercent <= 0.25) healthColor = '#e63333';
        ctx.fillStyle = healthColor;
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
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
        const trailColor = this.isCrit ? '#ffcc33' : '#66ccff';
        const glowColor = this.isCrit ? '#ff9919' : '#4db3ff';
        const coreColor = this.isCrit ? '#ffff80' : '#cdf2ff';

        // Trail
        for (let i = 0; i < this.trail.length; i++) {
            const pos = this.trail[i];
            const alpha = 1 - (i / this.trail.length);
            const size = 3 * alpha * sizeMult;
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = trailColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5 * sizeMult, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3 * sizeMult, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Core
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
            text = 'BLOCK';
            fontSize = 10;
        }
        fontSize = Math.floor(fontSize * scale);

        let color, outlineColor;
        if (dn.isBlocked) {
            color = `rgba(77, 230, 255, ${alpha})`;
            outlineColor = `rgba(0, 77, 102, ${alpha * 0.8})`;
        } else if (dn.isCrit) {
            color = `rgba(255, 230, 51, ${alpha})`;
            outlineColor = `rgba(204, 77, 0, ${alpha})`;
        } else {
            color = `rgba(255, 255, 255, ${alpha})`;
            outlineColor = `rgba(0, 0, 0, ${alpha * 0.8})`;
        }

        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

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
    let base = 8 + wave;
    if (wave > 10) base = Math.floor(base * 0.6);
    if (wave > 20) base = Math.floor(base * 0.5);
    if (wave > 30) base = Math.floor(base * 0.4);
    return Math.max(3, base);
}

function getAvailableTypes(wave) {
    if (wave <= 2) return ['normal'];
    if (wave <= 4) return ['normal', 'fast'];
    if (wave <= 6) return ['normal', 'fast', 'tank'];
    if (wave <= 9) return ['normal', 'fast', 'tank', 'swarm', 'shielded'];
    if (wave <= 12) return ['normal', 'fast', 'tank', 'swarm', 'shielded', 'regen'];
    return ['normal', 'fast', 'tank', 'swarm', 'shielded', 'regen', 'splitter'];
}

// ==================
// SPAWNING
// ==================
let spawnTimer = 0;
let spawnDelay = 2;
let isBossWave = false;
let isSwarmWave = false;

function startWave(waveNum) {
    game.currentWave = waveNum;
    game.waveInProgress = true;

    isBossWave = (waveNum % 5 === 0) && waveNum > 0;
    isSwarmWave = (waveNum % 3 === 0) && waveNum > 2 && !isBossWave;

    // Play wave start sound
    if (isBossWave) {
        AudioManager.playBossWarning();
    } else {
        AudioManager.playWaveStart();
    }

    let count = getEnemyCount(waveNum);
    if (isSwarmWave) {
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
    const x = core.x + Math.cos(angle) * SPAWN_RADIUS;
    const y = core.y + Math.sin(angle) * SPAWN_RADIUS;

    const enemy = new Enemy(x, y, game.currentWave);

    // Determine type
    let type;
    if (isSwarmWave) {
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

    // Find target
    core.target = null;
    let closestDist = core.attackRange;
    for (const enemy of enemies) {
        const dx = enemy.x - core.x;
        const dy = enemy.y - core.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
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

        const pierce = core.pierceActive ? 3 : 0;
        const slow = core.frostActive ? 0.5 : 0;

        bullets.push(new Bullet(startX, startY, target, damage, pierce, slow, isCrit));
    }

    // Play shoot sound
    if (hasCrit) {
        AudioManager.playCritShoot();
    } else {
        AudioManager.playShoot();
    }
}

function drawCore() {
    const pulse = Math.sin(core.pulseTime * 2) * 0.2 + 0.8;

    // Range indicator
    ctx.globalAlpha = 0.03 * pulse;
    ctx.fillStyle = '#3366cc';
    ctx.beginPath();
    ctx.arc(core.x, core.y, core.attackRange, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Range ring
    ctx.strokeStyle = `rgba(77, 153, 255, ${0.4 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(core.x, core.y, core.attackRange, 0, Math.PI * 2);
    ctx.stroke();

    // Animated dashes
    const numDashes = 24;
    for (let i = 0; i < numDashes; i++) {
        const angle = (i / numDashes) * Math.PI * 2 + core.pulseTime * 0.5;
        const r1 = core.attackRange - 4;
        const r2 = core.attackRange + 4;
        ctx.strokeStyle = 'rgba(102, 178, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(core.x + Math.cos(angle) * r1, core.y + Math.sin(angle) * r1);
        ctx.lineTo(core.x + Math.cos(angle) * r2, core.y + Math.sin(angle) * r2);
        ctx.stroke();
    }

    // Core base
    ctx.fillStyle = '#192640';
    ctx.beginPath();
    ctx.arc(core.x, core.y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Core ring
    ctx.strokeStyle = '#3366cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow
    const innerPulse = Math.sin(core.pulseTime * 1.5) * 0.2 + 0.8;
    ctx.fillStyle = '#263340';
    ctx.beginPath();
    ctx.arc(core.x, core.y, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(51, 128, 255, ${0.8 * innerPulse})`;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(128, 204, 255, ${innerPulse})`;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Turret
    ctx.save();
    ctx.translate(core.x, core.y);
    ctx.rotate(core.rotation);

    // Barrel
    ctx.fillStyle = '#334866';
    ctx.fillRect(0, -3, 25, 6);

    // Barrel highlight
    ctx.strokeStyle = '#4d7399';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -1.5);
    ctx.lineTo(25, -1.5);
    ctx.stroke();

    // Muzzle flash
    if (core.muzzleFlash > 0) {
        ctx.globalAlpha = core.muzzleFlash;
        ctx.fillStyle = '#ffe680';
        ctx.beginPath();
        ctx.arc(25, 0, 6 * core.muzzleFlash, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(25, 0, 3 * core.muzzleFlash, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Turret base
    ctx.fillStyle = '#263340';
    ctx.beginPath();
    ctx.arc(core.x, core.y, 6, 0, Math.PI * 2);
    ctx.fill();
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
        const radius = 10 + progress * 20;
        const alpha = 1 - progress;

        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = '#ff9933';
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffcc66';
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}

// ==================
// UI UPDATES
// ==================
function updateUI() {
    document.getElementById('moneyLabel').textContent = `$ ${game.money}`;
    document.getElementById('enemiesLabel').textContent = `Enemies: ${game.enemiesAlive}`;
    document.getElementById('highScoreLabel').textContent = `Best: ${SaveManager.data.highScore}`;

    // Ability buttons
    updateAbilityButton('pierceBtn', core.pierceActive, core.pierceTimer, core.pierceCharges, 'PIERCE');
    updateAbilityButton('frostBtn', core.frostActive, core.frostTimer, core.frostCharges, 'FROST');
    updateAbilityButton('critBtn', core.critActive, core.critTimer, core.critCharges, 'CRIT');

    // Start wave button
    const startBtn = document.getElementById('startWaveBtn');
    if (game.waveInProgress || game.enemiesAlive > 0) {
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

function updateAbilityButton(id, active, timer, charges, name) {
    const btn = document.getElementById(id);
    if (active) {
        btn.textContent = `${name} [${timer.toFixed(1)}s]`;
        btn.disabled = true;
        btn.classList.add('active');
    } else if (charges > 0) {
        btn.textContent = `${name} [${charges}]`;
        btn.disabled = false;
        btn.classList.remove('active');
    } else {
        btn.textContent = `${name} [0]`;
        btn.disabled = true;
        btn.classList.remove('active');
    }
}

function updateWaveLabel() {
    const label = document.getElementById('waveLabel');
    label.classList.remove('boss', 'swarm');

    if (isBossWave) {
        label.textContent = `Wave ${game.currentWave} - BOSS`;
        label.classList.add('boss');
    } else if (isSwarmWave) {
        label.textContent = `Wave ${game.currentWave} - SWARM`;
        label.classList.add('swarm');
    } else {
        label.textContent = `Wave ${game.currentWave}`;
    }
}

function updateUpgradePanel() {
    document.getElementById('damageBtn').textContent = `Damage +10 [$${game.damageCost}]`;
    document.getElementById('damageInfo').textContent = `Current: ${core.damage} dmg`;
    document.getElementById('damageBtn').disabled = game.money < game.damageCost;

    document.getElementById('fireRateBtn').textContent = `Fire Rate +0.5 [$${game.fireRateCost}]`;
    document.getElementById('fireRateInfo').textContent = `Current: ${core.fireRate.toFixed(1)}/s`;
    document.getElementById('fireRateBtn').disabled = game.money < game.fireRateCost;

    document.getElementById('rangeBtn').textContent = `Range +50 [$${game.rangeCost}]`;
    document.getElementById('rangeInfo').textContent = `Current: ${Math.floor(core.attackRange * 2)}`; // Display scaled
    document.getElementById('rangeBtn').disabled = game.money < game.rangeCost;

    document.getElementById('multishotBtn').textContent = `Multi-shot +1 [$${game.multishotCost}]`;
    document.getElementById('multishotInfo').textContent = `Current: ${core.projectileCount} projectile${core.projectileCount > 1 ? 's' : ''}`;
    document.getElementById('multishotBtn').disabled = game.money < game.multishotCost || core.projectileCount >= 5;

    document.getElementById('buyPierceBtn').textContent = `+1 Pierce [$${game.pierceCost}]`;
    document.getElementById('buyPierceBtn').disabled = game.money < game.pierceCost;

    document.getElementById('buyFrostBtn').textContent = `+1 Frost [$${game.frostCost}]`;
    document.getElementById('buyFrostBtn').disabled = game.money < game.frostCost;

    document.getElementById('buyCritBtn').textContent = `+1 Crit [$${game.critCost}]`;
    document.getElementById('buyCritBtn').disabled = game.money < game.critCost;
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

    if (isNewHighScore && game.currentWave > 0) {
        text.textContent = `NEW HIGH SCORE! Wave ${game.currentWave}`;
        text.style.color = '#ffcc00';
    } else {
        text.textContent = won ? 'VICTORY!' : 'CORE DESTROYED';
        text.style.color = won ? '#50ff80' : '#ff5050';
    }

    // Update stats display
    updateGameOverStats();

    panel.style.display = 'block';
    game.speedMultiplier = 1;
    document.getElementById('speedBtn').textContent = '1x';
    AudioManager.playGameOver();
    AudioManager.stopMusic();
}

function updateGameOverStats() {
    const statsDiv = document.getElementById('gameOverStats');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <div>Wave Reached: ${game.currentWave}</div>
            <div>Best: Wave ${SaveManager.data.highScore}</div>
            <div>Total Kills: ${SaveManager.data.totalEnemiesKilled.toLocaleString()}</div>
            <div>Games Played: ${SaveManager.data.totalGamesPlayed}</div>
        `;
    }
}

// ==================
// GAME LOOP
// ==================
function gameLoop(currentTime) {
    if (!game.lastTime) game.lastTime = currentTime;
    let dt = (currentTime - game.lastTime) / 1000;
    game.lastTime = currentTime;

    // Apply speed multiplier
    dt *= game.speedMultiplier;

    // Cap delta time to prevent huge jumps
    dt = Math.min(dt, 0.1);

    if (!game.gameOver) {
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
            SaveManager.addWaveCompleted();
        }

        // Auto-wave countdown
        if (!game.waveInProgress && game.enemiesAlive === 0 && !game.gameOver) {
            if (game.currentWave > 0 && game.upgradeShownForWave !== game.currentWave) {
                game.upgradeShownForWave = game.currentWave;
                showUpgradePanel();
                game.countdown = 10;
                game.countdownActive = true;
            }

            if (game.countdownActive) {
                game.countdown -= dt;
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

    // DEBUG: Draw a test rectangle to verify canvas works
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(10, 10, 50, 50);

    // DEBUG: Show game state
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(`waveInProgress: ${game.waveInProgress}`, 10, 80);
    ctx.fillText(`enemiesToSpawn: ${game.enemiesToSpawn}`, 10, 95);
    ctx.fillText(`enemiesAlive: ${game.enemiesAlive}`, 10, 110);
    ctx.fillText(`enemies.length: ${enemies.length}`, 10, 125);
    ctx.fillText(`spawnTimer: ${spawnTimer.toFixed(2)}`, 10, 140);
    ctx.fillText(`spawnDelay: ${spawnDelay}`, 10, 155);

    // Center and scale the view
    ctx.save();
    ctx.translate(gameOffsetX, gameOffsetY);
    ctx.scale(gameScale, gameScale);

    // DEBUG: Draw at origin to verify transform
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(-25, -25, 50, 50);

    drawCore();

    for (const enemy of enemies) {
        enemy.draw();
    }

    for (const bullet of bullets) {
        bullet.draw();
    }

    drawExplosions();
    drawDamageNumbers();

    ctx.restore();

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

document.getElementById('speedBtn').addEventListener('click', () => {
    AudioManager.playClick();
    game.speedMultiplier = game.speedMultiplier === 1 ? 2 : 1;
    document.getElementById('speedBtn').textContent = `${game.speedMultiplier}x`;
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
        core.frostTimer = ABILITY_DURATION + 2;
    }
});

document.getElementById('critBtn').addEventListener('click', () => {
    if (core.critCharges > 0 && !core.critActive) {
        AudioManager.playAbility();
        core.critCharges--;
        core.critActive = true;
        core.critTimer = ABILITY_DURATION;
    }
});

document.getElementById('damageBtn').addEventListener('click', () => {
    if (game.money >= game.damageCost) {
        AudioManager.playUpgrade();
        game.money -= game.damageCost;
        core.damage += 10;
        game.damageCost = Math.floor(game.damageCost * 1.8);
        updateUpgradePanel();
    }
});

document.getElementById('fireRateBtn').addEventListener('click', () => {
    if (game.money >= game.fireRateCost) {
        AudioManager.playUpgrade();
        game.money -= game.fireRateCost;
        core.fireRate += 0.5;
        game.fireRateCost = Math.floor(game.fireRateCost * 2);
        updateUpgradePanel();
    }
});

document.getElementById('rangeBtn').addEventListener('click', () => {
    if (game.money >= game.rangeCost) {
        AudioManager.playUpgrade();
        game.money -= game.rangeCost;
        core.attackRange += 25; // Scaled for canvas
        game.rangeCost = Math.floor(game.rangeCost * 1.6);
        updateUpgradePanel();
    }
});

document.getElementById('multishotBtn').addEventListener('click', () => {
    if (game.money >= game.multishotCost && core.projectileCount < 5) {
        AudioManager.playUpgrade();
        game.money -= game.multishotCost;
        core.projectileCount++;
        game.multishotCost = Math.floor(game.multishotCost * 2.5);
        updateUpgradePanel();
    }
});

document.getElementById('buyPierceBtn').addEventListener('click', () => {
    if (game.money >= game.pierceCost) {
        AudioManager.playUpgrade();
        game.money -= game.pierceCost;
        core.pierceCharges++;
        updateUpgradePanel();
    }
});

document.getElementById('buyFrostBtn').addEventListener('click', () => {
    if (game.money >= game.frostCost) {
        AudioManager.playUpgrade();
        game.money -= game.frostCost;
        core.frostCharges++;
        updateUpgradePanel();
    }
});

document.getElementById('buyCritBtn').addEventListener('click', () => {
    if (game.money >= game.critCost) {
        AudioManager.playUpgrade();
        game.money -= game.critCost;
        core.critCharges++;
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

document.getElementById('restartBtn').addEventListener('click', () => {
    AudioManager.playClick();
    AudioManager.startMusic();
    // Reset game state
    game.money = 0;
    game.currentWave = 0;
    game.enemiesAlive = 0;
    game.enemiesToSpawn = 0;
    game.waveInProgress = false;
    game.gameOver = false;
    game.speedMultiplier = 1;
    game.countdown = 0;
    game.countdownActive = false;
    game.upgradeShownForWave = -1;

    game.damageCost = 50;
    game.fireRateCost = 75;
    game.rangeCost = 60;
    game.multishotCost = 250;
    game.pierceCost = 50;
    game.frostCost = 40;
    game.critCost = 60;

    // Reset core
    core.damage = 35;
    core.fireRate = 3;
    core.attackRange = 225;
    core.projectileCount = 1;
    core.pierceActive = false;
    core.pierceTimer = 0;
    core.pierceCharges = 0;
    core.frostActive = false;
    core.frostTimer = 0;
    core.frostCharges = 0;
    core.critActive = false;
    core.critTimer = 0;
    core.critCharges = 0;
    core.shootTimer = 0;

    // Clear entities
    enemies = [];
    bullets = [];
    explosions = [];
    damageNumbers = [];

    // Hide panels
    document.getElementById('gameOverPanel').style.display = 'none';
    hideUpgradePanel();

    // Reset UI
    document.getElementById('speedBtn').textContent = '1x';
    document.getElementById('waveLabel').textContent = 'Wave 0';
    document.getElementById('waveLabel').classList.remove('boss', 'swarm');
});

// ==================
// INIT
// ==================
SaveManager.init();
core.x = 0;
core.y = 0;
requestAnimationFrame(gameLoop);
