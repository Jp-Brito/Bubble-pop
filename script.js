// --- 1. CONFIGURAÇÃO INICIAL E CONSTANTES ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// MUDANÇA: Centralizando todas as referências de UI em um objeto para melhor organização.
const UI = {
    menu: document.getElementById('menu'),
    gameOverScreen: document.getElementById('gameOverScreen'),
    gameUi: document.getElementById('game-ui'),
    pauseMenu: document.getElementById('pauseMenu'),
    aboutScreen: document.getElementById('aboutScreen'),
    difficultyScreen: document.getElementById('difficultyScreen'),
    playButton: document.getElementById('playButton'),
    restartButton: document.getElementById('restartButton'),
    pauseButton: document.getElementById('pauseButton'),
    resumeButton: document.getElementById('resumeButton'),
    restartFromPauseButton: document.getElementById('restartFromPauseButton'),
    menuButton: document.getElementById('menuButton'),
    aboutButton: document.getElementById('aboutButton'),
    closeAboutButton: document.getElementById('closeAboutButton'),
    easyButton: document.getElementById('easyButton'),
    normalButton: document.getElementById('normalButton'),
    hardButton: document.getElementById('hardButton'),
    backToMenuButton: document.getElementById('backToMenuButton'),
    scoreDisplay: document.getElementById('score'),
    livesDisplay: document.getElementById('lives'),
    finalScoreDisplay: document.getElementById('finalScore'),
    levelDisplay: document.getElementById('levelDisplay'),
    finalLevelDisplay: document.getElementById('finalLevel'),
    highScoreGameOver: document.getElementById('highScoreGameOver'),
    newHighScoreMessage: document.getElementById('newHighScoreMessage'),
    easyHighScoreDisplay: document.querySelector('#easyButton .difficulty-highscore'),
    normalHighScoreDisplay: document.querySelector('#normalButton .difficulty-highscore'),
    hardHighScoreDisplay: document.querySelector('#hardButton .difficulty-highscore'),
};

// MUDANÇA: Definindo constantes para "números mágicos" para melhorar a legibilidade.
const PARTICLE_POOL_SIZE = 200;
const AUDIO_POOL_SIZE = 10;
const INITIAL_LIVES = 5;
const SCORE_PER_BUBBLE = 10;
const SCORE_TO_LEVEL_UP = 100;
const CANNON_RECOIL_AMOUNT = 20;

// --- 2. DEFINIÇÃO DAS CLASSES ---
class Bubble {
    constructor(speedMultiplier) {
        this.radius = Math.random() * 30 + 20;
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = canvas.height + this.radius;
        this.speed = (Math.random() * 3 + 1) * speedMultiplier;
        this.radiusSquared = this.radius * this.radius;
        this.frozen = false; // --- ADICIONADO: Estado de congelamento

        const roll = Math.random();
        if (roll < 0.05) {
            this.type = 'bomb';
            this.color = '#444';
        } else if (roll < 0.02) {
            this.type = 'heart';
            this.color = 'lightpink';
        // --- ADICIONADO: Lógica para a bolha de gelo ---
        } else if (roll < 0.02) { // 5% de chance de ser de gelo
            this.type = 'freeze';
            this.color = 'cyan';
        } else { // 85% de chance de ser normal
            this.type = 'normal';
            this.color = `hsl(${Math.random() * 360}, 100%, 75%)`;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        if (this.type !== 'normal') {
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `${this.radius * 1.2}px Arial`; 
            
            let icon = '';
            if (this.type === 'bomb') icon = '☠️';
            if (this.type === 'heart') icon = '❤️';
            if (this.type === 'freeze') icon = '❄️'; // --- ADICIONADO
            
            ctx.fillText(icon, this.x, this.y);
        }
    }
    
    update(speedFactor = 1) {
        // --- ADICIONADO: Se estiver congelada, não se move
        if (this.frozen) return;
        
        this.y -= this.speed * speedFactor;
    }
}

class Particle {
    constructor() {
        this.active = false;
        this.life = 0;
    }
    init(x, y, color) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 7 + 3;
        this.life = 1;
        const speed = Math.random() * 4 + 2;
        const angle = Math.random() * Math.PI * 2;
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
    }
    update() {
        if (!this.active) return;
        this.speedY += 0.1; // Gravidade
        this.speedX *= 0.98; // Atrito
        this.speedY *= 0.98;
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.03;
        if (this.life <= 0) {
            this.active = false;
        }
    }
    draw() {
        if (!this.active) return;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 25;
        this.radiusSquared = this.radius * this.radius;
        this.speedY = 1.5;
        this.symbol = '';

        // Define a aparência baseada no tipo
        switch (this.type) {
            case 'slowMotion':
                this.symbol = '⏳';
                break;
            // --- ADICIONE ISTO ---
            case 'doublePoints':
                this.symbol = 'x2';
                break;
            case 'shield':
                this.symbol = '🛡️';
                break;
            // --- FIM DA ADIÇÃO ---
        }
    }

    update() {
        this.y += this.speedY;
    }

    draw() {
        // ... (o resto da função draw continua exatamente igual)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        //ctx.fillStyle = 'rgba(255, 255, 0, 0)';
        //ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${this.radius * 1.5}px Arial`;
        ctx.fillText(this.symbol, this.x, this.y);
    }
}

// --- 3. PISCINAS DE OBJETOS (OBJECT POOLS) ---
const particlesPool = Array.from({ length: PARTICLE_POOL_SIZE }, () => new Particle());
let particlePoolIndex = 0;

const audioPool = Array.from({ length: AUDIO_POOL_SIZE }, () => {
    const audio = new Audio('sounds/pop.mp3');
    audio.volume = 0.5;
    return audio;
});
let audioPoolIndex = 0;

const heartSoundPool = Array.from({ length: 3 }, () => new Audio('sounds/special.ogg'));
let heartSoundIndex = 0;

const bombSoundPool = Array.from({ length: 3 }, () => new Audio('sounds/lose.wav'));
let bombSoundIndex = 0;

const freezeSoundPool = Array.from({ length: 3 }, () => new Audio('sounds/freeze.wav'));
let freezeSoundIndex = 0;

const powerUpSpawnSoundPool = Array.from({ length: 3 }, () => new Audio('sounds/special.ogg'));
let powerUpSpawnSoundIndex = 0;

const powerUpCollectSoundPool = Array.from({ length: 3 }, () => new Audio('sounds/powerup_collect.wav'));
let powerUpCollectSoundIndex = 0;

// --- 4. VARIÁVEIS DE ESTADO DO JOGO ---
// MUDANÇA: Agrupando o estado do jogo em um objeto para melhor organização.
let gameState = {
    score: 0,
    lives: INITIAL_LIVES,
    bubbles: [],
    isGameOver: true,
    isPaused: false,
    spawnInterval: null,
    currentDifficulty: 'normal',
    highScores: { easy: 0, normal: 0, hard: 0 },
    cannonRecoil: 0,
    currentCannonAngle: 0,
    targetCannonAngle: 0,
    difficultyLevel: 1,
    spawnRate: 1000,
    bubbleSpeedMultiplier: 1.0,
    animationFrameId: null,
    powerUps: [], // Array para guardar os itens na tela
    isSlowMotionActive: false,
    powerUpTimeoutId: null, // Para controlar a duração do efeito
     isDoublePointsActive: false,
    isShieldActive: false,
};

// --- 5. FUNÇÕES PRINCIPAIS DO JOGO ---

function playPowerUpCollectSound() {
    powerUpCollectSoundPool[powerUpCollectSoundIndex].play().catch(e => {});
    powerUpCollectSoundIndex = (powerUpCollectSoundIndex + 1) % powerUpCollectSoundPool.length;
}

function playPowerUpSpawnSound() {
    powerUpSpawnSoundPool[powerUpSpawnSoundIndex].play().catch(e => {});
    powerUpSpawnSoundIndex = (powerUpSpawnSoundIndex + 1) % powerUpSpawnSoundPool.length;
}

function playFreezeSound() {
    freezeSoundPool[freezeSoundIndex].play().catch(e => {});
    freezeSoundIndex = (freezeSoundIndex + 1) % freezeSoundPool.length;
}

function handlePowerUps() {
    for (let i = gameState.powerUps.length - 1; i >= 0; i--) {
        const powerUp = gameState.powerUps[i];
        powerUp.update();
        powerUp.draw();

        // Remove o power-up se ele sair da tela
        if (powerUp.y > canvas.height + powerUp.radius) {
            gameState.powerUps.splice(i, 1);
        }
    }
}

function activatePowerUp(type) {
    clearTimeout(gameState.powerUpTimeoutId);
    // Reseta os outros bônus de tempo para não acumular
    gameState.isSlowMotionActive = false;
    gameState.isDoublePointsActive = false;

    switch (type) {
        case 'slowMotion':
            gameState.isSlowMotionActive = true;
            console.log("SLOW MOTION ATIVADO!");
            gameState.powerUpTimeoutId = setTimeout(() => {
                gameState.isSlowMotionActive = false;
            }, 8000); // 8 segundos
            break;

        // --- ADICIONE ISTO ---
        case 'doublePoints':
            gameState.isDoublePointsActive = true;
            console.log("PONTOS EM DOBRO ATIVADO!");
            gameState.powerUpTimeoutId = setTimeout(() => {
                gameState.isDoublePointsActive = false;
            }, 10000); // 10 segundos
            break;
        
        case 'shield':
            gameState.isShieldActive = true;
            console.log("ESCUDO ATIVADO!");
            updateUI(); // Atualiza a UI para mostrar o escudo
            break;
        // --- FIM DA ADIÇÃO ---
    }
}

function playHeartSound() {
    heartSoundPool[heartSoundIndex].play().catch(e => {});
    heartSoundIndex = (heartSoundIndex + 1) % heartSoundPool.length;
}

function playBombSound() {
    bombSoundPool[bombSoundIndex].play().catch(e => {});
    bombSoundIndex = (bombSoundIndex + 1) % bombSoundPool.length;
}

function updateCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function spawnBubble() {
    gameState.bubbles.push(new Bubble(gameState.bubbleSpeedMultiplier));
}

function handleBubbles(speedFactor) {
    for (let i = gameState.bubbles.length - 1; i >= 0; i--) {
        const bubble = gameState.bubbles[i];
        bubble.update(speedFactor);
        bubble.draw();
        
        if (bubble.y < -bubble.radius) {
            if (bubble.type === 'normal') {
                // --- MUDANÇA: LÓGICA DO ESCUDO ---
                if (gameState.isShieldActive) {
                    // Se o escudo está ativo, consome ele e não perde vida
                    gameState.isShieldActive = false;
                    console.log("Escudo usado!");
                } else {
                    // Se não tem escudo, perde vida normalmente
                    gameState.lives--;
                    if (gameState.lives <= 0) {
                        endGame();
                    }
                }
                // --- FIM DA MUDANÇA ---
            }
            gameState.bubbles.splice(i, 1);
            updateUI();
        }
    }
}

function handleParticles() {
    // CORREÇÃO: Combinado os loops de update e draw em um só para mais eficiência.
    particlesPool.forEach(particle => {
        if (particle.active) {
            particle.update();
            particle.draw();
        }
    });
    ctx.globalAlpha = 1; // Reseta a transparência global
}

function drawCannon() {
    const cannonBaseX = canvas.width / 2;
    const cannonBaseY = canvas.height;
    ctx.save();
    ctx.translate(cannonBaseX, cannonBaseY);
    ctx.rotate(gameState.currentCannonAngle);
    const recoilOffset = -gameState.cannonRecoil;
    ctx.fillStyle = '#333';
    ctx.fillRect(-40, -20 + recoilOffset, 80, 20);
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(-20, 0 + recoilOffset);
    ctx.lineTo(-30, -40 + recoilOffset);
    ctx.lineTo(30, -40 + recoilOffset);
    ctx.lineTo(20, 0 + recoilOffset);
    ctx.fill();
    ctx.restore();
}

function gameLoop() {
    if (gameState.isGameOver || gameState.isPaused) return;

    // --- CÓDIGO RESTAURADO: LÓGICA DE ANIMAÇÃO DO CANHÃO ---
    // Interpolação suave do ângulo do canhão para ele girar suavemente
    gameState.currentCannonAngle += (gameState.targetCannonAngle - gameState.currentCannonAngle) * 0.1;
    // Amortecimento do ângulo alvo para o canhão voltar ao centro devagar
    gameState.targetCannonAngle *= 0.95; 
    // Diminui o recuo do canhão a cada frame
    if (gameState.cannonRecoil > 0) {
        gameState.cannonRecoil -= 1;
    }
    // --- FIM DO CÓDIGO RESTAURADO ---

    // Lógica dos power-ups
    const speedFactor = gameState.isSlowMotionActive ? 0.5 : 1.0;

    // Limpa a tela para o próximo frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Funções de desenho e atualização
    handleBubbles(speedFactor);
    handleParticles();
    handlePowerUps();
    drawCannon();
    
    gameState.animationFrameId = requestAnimationFrame(gameLoop);
}

function updateUI() {
    UI.scoreDisplay.textContent = `Pontos: ${gameState.score}`;
    UI.livesDisplay.textContent = '❤️'.repeat(gameState.lives);
    
    // --- MUDANÇA: MOSTRAR O ESCUDO ---
    if (gameState.isShieldActive) {
        UI.livesDisplay.textContent += ' 🛡️';
    }
    // --- FIM DA MUDANÇA ---
    
    UI.levelDisplay.textContent = `Nível: ${gameState.difficultyLevel}`;

    const maxLevelForColor = 10;
    const progress = Math.min(1, (gameState.difficultyLevel - 1) / (maxLevelForColor - 1));
    const saturation = progress * 100;
    const lightness = 100 - (progress * 50);
    UI.levelDisplay.style.color = `hsl(0, ${saturation}%, ${lightness}%)`;
}

function startGame(difficulty) {
    gameState.currentDifficulty = difficulty;
    switch (gameState.currentDifficulty) {
        case 'easy':
            gameState.spawnRate = 1200;
            gameState.bubbleSpeedMultiplier = 0.8;
            break;
        case 'hard':
            gameState.spawnRate = 750;
            gameState.bubbleSpeedMultiplier = 1.3;
            break;
        case 'normal':
        default:
            gameState.spawnRate = 1000;
            gameState.bubbleSpeedMultiplier = 1.0;
            break;
    }

    Object.assign(gameState, {
        score: 0,
        lives: INITIAL_LIVES,
        bubbles: [],
        isGameOver: false,
        isPaused: false,
        difficultyLevel: 1,
        currentCannonAngle: 0,
        targetCannonAngle: 0,
        cannonRecoil: 0,
    });

    backgroundMusic.currentTime = 0; // Reinicia a música
    backgroundMusic.playbackRate = 1.0; // Reinicia a velocidade
    backgroundMusic.play();
    
    particlesPool.forEach(p => p.active = false);

    // --- Linhas Corrigidas ---
    showScreen(null); // Esconde todas as telas (menu, game over, etc.)
    UI.gameUi.style.display = 'flex'; // Mostra a interface de pontos e vidas
    // --- Fim da Correção ---
    
    updateUI();
    gameState.spawnInterval = setInterval(spawnBubble, gameState.spawnRate);
    gameLoop();
}

function endGame() {
    gameState.isGameOver = true;
    clearInterval(gameState.spawnInterval);
    cancelAnimationFrame(gameState.animationFrameId);

    const currentHighScore = gameState.highScores[gameState.currentDifficulty];
    UI.highScoreGameOver.textContent = currentHighScore;
    UI.newHighScoreMessage.style.display = 'none';

    if (gameState.score > currentHighScore) {
        gameState.highScores[gameState.currentDifficulty] = gameState.score;
        localStorage.setItem(`bubblePopHighScore_${gameState.currentDifficulty}`, gameState.score);
        UI.highScoreGameOver.textContent = gameState.score;
        UI.newHighScoreMessage.style.display = 'block';
    }

    UI.finalScoreDisplay.textContent = gameState.score;
    UI.finalLevelDisplay.textContent = gameState.difficultyLevel;

    backgroundMusic.pause();
    
    // --- Linhas Corrigidas ---
    showScreen('gameOverScreen'); // Mostra a tela de "Game Over"
    UI.gameUi.style.display = 'none'; // Esconde a interface de pontos e vidas
    // --- Fim da Correção ---
}

function pauseGame() {
    if (gameState.isGameOver) return;
    gameState.isPaused = true;
    clearInterval(gameState.spawnInterval);
    cancelAnimationFrame(gameState.animationFrameId);
    
    backgroundMusic.pause();

    showScreen('pauseMenu'); // Apenas mostra o menu de pause
}

function resumeGame() {
    if (gameState.isGameOver) return;
    gameState.isPaused = false;

    
    showScreen(null); // Esconde qualquer tela de menu que esteja aberta
    
    backgroundMusic.play();
    
    gameState.spawnInterval = setInterval(spawnBubble, gameState.spawnRate);
    gameLoop();
}

function returnToMenu() {
    gameState.isGameOver = true;
    gameState.isPaused = false;
    clearInterval(gameState.spawnInterval);
    cancelAnimationFrame(gameState.animationFrameId);

    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    
    showScreen('menu'); // Mostra o menu principal
    UI.gameUi.style.display = 'none'; // Esconde a interface do jogo
}

function increaseDifficulty() {
    gameState.difficultyLevel++;
    gameState.spawnRate = Math.max(250, gameState.spawnRate * 0.95);
    gameState.bubbleSpeedMultiplier += 0.15;
    
    console.log(`Nível: ${gameState.difficultyLevel}, Frequência: ${gameState.spawnRate.toFixed(0)}ms, Velocidade: ${gameState.bubbleSpeedMultiplier.toFixed(2)}x`);
    
    backgroundMusic.playbackRate += 0.05;

    clearInterval(gameState.spawnInterval);
    gameState.spawnInterval = setInterval(spawnBubble, gameState.spawnRate);
    updateUI();
}

function createBurst(bubble) {
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
        particlesPool[particlePoolIndex].init(bubble.x, bubble.y, bubble.color);
        particlePoolIndex = (particlePoolIndex + 1) % PARTICLE_POOL_SIZE;
    }
}

function playPopSound() {
    // CORREÇÃO: Tratando o retorno da função play() para evitar erros no console.
    audioPool[audioPoolIndex].play().catch(error => console.log("Interação do usuário necessária para tocar o som.", error));
    audioPoolIndex = (audioPoolIndex + 1) % AUDIO_POOL_SIZE;
}

function handleInteraction(clickX, clickY) {
    if (gameState.isGameOver || gameState.isPaused) return;

    // ETAPA 1: VERIFICAR CLIQUE NOS POWER-UPS
    for (let i = gameState.powerUps.length - 1; i >= 0; i--) {
        const powerUp = gameState.powerUps[i];
        const deltaX = clickX - powerUp.x;
        const deltaY = clickY - powerUp.y;
        
        const distanceSquared = (deltaX * deltaX) + (deltaY * deltaY);
        if (distanceSquared < powerUp.radiusSquared) {
            
            // --- MUDANÇA: TOCA O SOM DE COLETA AQUI! ---
            playPowerUpCollectSound();
            // --- FIM DA MUDANÇA ---

            activatePowerUp(powerUp.type);
            gameState.powerUps.splice(i, 1);
            return;
        }
    }

    // ETAPA 2: VERIFICAR CLIQUE NAS BOLHAS (sem alterações aqui)
    for (let i = gameState.bubbles.length - 1; i >= 0; i--) {
        const bubble = gameState.bubbles[i];
        const deltaX = clickX - bubble.x;
        const deltaY = clickY - bubble.y;
        const distanceSquared = (deltaX * deltaX) + (deltaY * deltaY);

        if (distanceSquared < bubble.radiusSquared) {
            
            switch (bubble.type) {
                // ... (todo o switch continua igual)
                case 'bomb':
                    playBombSound();
                    gameState.lives--;
                    if (gameState.lives <= 0) endGame();
                    break;
                case 'heart':
                    playHeartSound();
                    if (gameState.lives < INITIAL_LIVES) gameState.lives++;
                    break;
                case 'freeze':
                    playFreezeSound();
                    gameState.bubbles.forEach(b => {
                        if (b !== bubble) {
                            b.frozen = true;
                        }
                    });
                    setTimeout(() => {
                        gameState.bubbles.forEach(b => b.frozen = false);
                    }, 2000);
                    break;
                default: // Caso 'normal'
                    playPopSound();
                    
                    const pointsToAdd = gameState.isDoublePointsActive ? SCORE_PER_BUBBLE * 2 : SCORE_PER_BUBBLE;
                    gameState.score += pointsToAdd;
                    
                    if (gameState.score > 0 && gameState.score % SCORE_TO_LEVEL_UP === 0) {
                        increaseDifficulty();
                    }
                    
                    let powerUpDropped = false;
                    const roll = Math.random();

                    if (roll < 0.07) { 
                        gameState.powerUps.push(new PowerUp(bubble.x, bubble.y, 'shield'));
                        powerUpDropped = true;
                    } else if (roll < 0.12) { 
                        gameState.powerUps.push(new PowerUp(bubble.x, bubble.y, 'doublePoints'));
                        powerUpDropped = true;
                    } else if (roll < 0.15) { 
                        gameState.powerUps.push(new PowerUp(bubble.x, bubble.y, 'slowMotion'));
                        powerUpDropped = true;
                    }

                    if (powerUpDropped) {
                        playPowerUpSpawnSound();
                    }
                    break;
            }

            createBurst(bubble);
            gameState.cannonRecoil = CANNON_RECOIL_AMOUNT;
            const cannonX = canvas.width / 2;
            gameState.targetCannonAngle = Math.atan2(bubble.x - cannonX, canvas.height - bubble.y);
            gameState.bubbles.splice(i, 1);
            updateUI();
            
            return;
        }
    }
}

function loadHighScores() {
    ['easy', 'normal', 'hard'].forEach(difficulty => {
        gameState.highScores[difficulty] = parseInt(localStorage.getItem(`bubblePopHighScore_${difficulty}`)) || 0;
    });
}

function updateDifficultyScreenScores() {
    UI.easyHighScoreDisplay.textContent = `Recorde: ${gameState.highScores.easy}`;
    UI.normalHighScoreDisplay.textContent = `Recorde: ${gameState.highScores.normal}`;
    UI.hardHighScoreDisplay.textContent = `Recorde: ${gameState.highScores.hard}`;
}

// MUDANÇA: Função centralizada para gerenciar a exibição de telas.
function showScreen(screenName) {
    // Lista de todas as telas que devem ser gerenciadas
    const screensToManage = [
        UI.menu,
        UI.gameOverScreen,
        UI.pauseMenu,
        UI.aboutScreen,
        UI.difficultyScreen
    ];

    // Esconde todas elas
    screensToManage.forEach(screen => screen.style.display = 'none');

    // Mostra apenas a tela solicitada
    switch (screenName) {
        case 'menu':
            UI.menu.style.display = 'flex';
            break;
        case 'difficulty':
            UI.difficultyScreen.style.display = 'flex';
            break;
        case 'pauseMenu':
            UI.pauseMenu.style.display = 'flex';
            break;
        case 'gameOverScreen':
            UI.gameOverScreen.style.display = 'flex';
            break;
        case 'aboutScreen':
            UI.aboutScreen.style.display = 'flex';
            break;
    }
}

// --- 6. EVENT LISTENERS ---
function setupEventListeners() {
    UI.playButton.addEventListener('click', () => {
        updateDifficultyScreenScores();
        showScreen('difficulty');
    });

    ['easy', 'normal', 'hard'].forEach(difficulty => {
        UI[`${difficulty}Button`].addEventListener('click', () => startGame(difficulty));
    });

    UI.backToMenuButton.addEventListener('click', () => showScreen('menu'));
    UI.restartButton.addEventListener('click', () => startGame(gameState.currentDifficulty));
    UI.pauseButton.addEventListener('click', pauseGame);
    UI.resumeButton.addEventListener('click', resumeGame);
    UI.restartFromPauseButton.addEventListener('click', () => startGame(gameState.currentDifficulty));
    UI.menuButton.addEventListener('click', returnToMenu);
    
    UI.aboutButton.addEventListener('click', () => showScreen('aboutScreen')); // Corrigido de 'about' para 'aboutScreen'

    UI.closeAboutButton.addEventListener('click', () => showScreen('menu'));

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        handleInteraction(event.clientX - rect.left, event.clientY - rect.top);
    });

    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        handleInteraction(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });

    window.addEventListener('resize', updateCanvasSize);
}

// --- 7. INICIALIZAÇÃO DO JOGO ---
function init() {
    updateCanvasSize();
    loadHighScores();
    updateDifficultyScreenScores();
    setupEventListeners();
    showScreen('menu'); // Garante que a tela de menu seja a primeira a ser exibida.
}

init(); // Inicia tudo!
const backgroundMusic = document.getElementById('backgroundMusic');
backgroundMusic.volume = 0.3; // Volume mais baixo para não atrapalhar