// --- Elementos do HTML ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // O "pincel" para desenhar no canvas

const menu = document.getElementById('menu');
const gameOverScreen = document.getElementById('gameOverScreen');
const gameUi = document.getElementById('game-ui');
const pauseMenu = document.getElementById('pauseMenu');

const playButton = document.getElementById('playButton');
const restartButton = document.getElementById('restartButton');
const pauseButton = document.getElementById('pauseButton');
const resumeButton = document.getElementById('resumeButton');
const restartFromPauseButton = document.getElementById('restartFromPauseButton');
const menuButton = document.getElementById('menuButton');

const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const finalScoreDisplay = document.getElementById('finalScore');
const levelDisplay = document.getElementById('levelDisplay');
const finalLevelDisplay = document.getElementById('finalLevel'); 

const popSound = new Audio('sounds/pop.mp3');
popSound.volume = 0.5;

// About
const aboutButton = document.getElementById('aboutButton');
const aboutScreen = document.getElementById('aboutScreen');
const closeAboutButton = document.getElementById('closeAboutButton');

// Buttons dificuldades
const difficultyScreen = document.getElementById('difficultyScreen');
const easyButton = document.getElementById('easyButton');
const normalButton = document.getElementById('normalButton');
const hardButton = document.getElementById('hardButton');
const backToMenuButton = document.getElementById('backToMenuButton');

// --- Configurações do Jogo ---
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let lives = 5;
let bubbles = []; // Array para guardar todas as bolhas
let particles = [];
let isGameOver = true;
let isPaused = false; // Variável de estado para a pausa
let spawnInterval; // Variável para controlar o intervalo de criação de bolhas
let currentDifficulty = 'normal';
let cannonRecoil = 0;
let currentCannonAngle = 0;
let targetCannonAngle = 0;

// VARIÁVEIS DE DIFICULDADE
let difficultyLevel = 1;
let spawnRate = 1000; // ms
let bubbleSpeedMultiplier = 1.0;

// --- Lógica do Jogo ---

// Classe para criar objetos Bolha
class Bubble {
    constructor() {
        this.radius = Math.random() * 30 + 20;
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = canvas.height + this.radius;
        this.speed = (Math.random() * 3 + 1) * bubbleSpeedMultiplier; // Usa o multiplicador
        this.color = `hsl(${Math.random() * 360}, 100%, 75%)`;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    update() {
        this.y -= this.speed;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 5 + 2; // Tamanho entre 2 e 7
        this.speedX = Math.random() * 6 - 3; // Velocidade horizontal aleatória (-3 a +3)
        this.speedY = Math.random() * 6 - 3; // Velocidade vertical aleatória (-3 a +3)
        this.life = 1; // Tempo de vida da partícula (1 = 100%)
    }

    // Atualiza a posição e o tempo de vida
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.04; // Desvanece gradualmente
    }

    // Desenha a partícula no canvas
    draw() {
        ctx.save(); // Salva o estado atual do canvas
        ctx.globalAlpha = this.life; // Define a transparência (para o efeito de desvanecer)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore(); // Restaura o estado anterior do canvas
    }
}

function spawnBubble() {
    bubbles.push(new Bubble());
}

function handleBubbles() {
    for (let i = bubbles.length - 1; i >= 0; i--) {
        bubbles[i].update();
        bubbles[i].draw();

        if (bubbles[i].y < -bubbles[i].radius) {
            bubbles.splice(i, 1);
            lives--;
            updateUI();
            if (lives <= 0) {
                endGame();
            }
        }
    }
}

function handleParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();

        // Se a partícula já "morreu" (vida < 0), remove-a do array
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function gameLoop() {
    if (isGameOver || isPaused) return;

    // Limpa o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenha e atualiza as bolhas
    handleBubbles();

    // Desenha e atualiza as partículas da explosão
    handleParticles();

    // Desenha o canhão
    currentCannonAngle += (targetCannonAngle - currentCannonAngle) * 0.1;
    targetCannonAngle *= 0.95;
    if (cannonRecoil > 0) {
        cannonRecoil -= 1;
    }

    drawCannon();

    // Pede a próxima frame de animação
    requestAnimationFrame(gameLoop);
}
function updateUI() {
    // Atualiza a pontuação
    scoreDisplay.textContent = `Pontos: ${score}`;

    // Atualiza os corações
    let hearts = '';
    for (let i = 0; i < lives; i++) {
        hearts += '❤️';
    }
    livesDisplay.textContent = hearts;

    // --- NOVA LÓGICA PARA O NÍVEL ---
    
    // 1. Atualiza o texto do nível
    levelDisplay.textContent = `Nível: ${difficultyLevel}`;

    // 2. Calcula e atualiza a cor do nível
    // Queremos um gradiente de Branco (nível 1) para Vermelho (nível 10+)
    // Branco em HSL: hsl(0, 0%, 100%)
    // Vermelho em HSL: hsl(0, 100%, 50%)
    const maxLevelForColor = 10; // O nível em que a cor atinge o vermelho máximo
    
    // Calcula o progresso de 0 a 1 em direção ao nível máximo
    const progress = Math.min(1, (difficultyLevel - 1) / (maxLevelForColor - 1));
    
    // Interpola a Saturação e a Luminosidade
    const saturation = progress * 100; // Vai de 0% a 100%
    const lightness = 100 - (progress * 50); // Vai de 100% a 50%
    
    levelDisplay.style.color = `hsl(0, ${saturation}%, ${lightness}%)`;
}


function startGame() {
    // Define os parâmetros iniciais com base na dificuldade escolhida
    switch (currentDifficulty) {
        case 'easy':
            spawnRate = 1200;
            bubbleSpeedMultiplier = 0.8;
            break;
        case 'hard':
            spawnRate = 750;
            bubbleSpeedMultiplier = 1.3;
            break;
        case 'normal':
        default:
            spawnRate = 1000;
            bubbleSpeedMultiplier = 1.0;
            break;
    }

    score = 0;
    lives = 5;
    bubbles = [];
    isGameOver = false;
    isPaused = false;
    difficultyLevel = 1; // O nível de dificuldade progressiva sempre começa em 1

    menu.style.display = 'none';
    difficultyScreen.style.display = 'none'; // Esconde o menu de dificuldade
    gameOverScreen.style.display = 'none';
    pauseMenu.style.display = 'none';
    gameUi.style.display = 'flex';

    updateUI();
    spawnInterval = setInterval(spawnBubble, spawnRate);
    gameLoop();
}

function endGame() {
    isGameOver = true;
    clearInterval(spawnInterval);
    
    finalScoreDisplay.textContent = score;
    finalLevelDisplay.textContent = difficultyLevel;
    gameOverScreen.style.display = 'flex';
    gameUi.style.display = 'none';
}

function pauseGame() {
    if (isGameOver) return;
    isPaused = true;
    clearInterval(spawnInterval);
    pauseMenu.style.display = 'flex';
}

function resumeGame() {
    if (isGameOver) return;
    isPaused = false;
    pauseMenu.style.display = 'none';
    spawnInterval = setInterval(spawnBubble, spawnRate);
    gameLoop();
}

function increaseDifficulty() {
    difficultyLevel++;
    spawnRate = Math.max(250, 1000 - (difficultyLevel * 75));
    bubbleSpeedMultiplier += 0.15;

    console.log(`Nível de Dificuldade: ${difficultyLevel}, Frequência: ${spawnRate}ms, Velocidade: ${bubbleSpeedMultiplier}x`);

    clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnBubble, spawnRate);
}


function handleInteraction(clickX, clickY) {
    if (isGameOver || isPaused) return;
    for (let i = bubbles.length - 1; i >= 0; i--) {
        const bubble = bubbles[i];
        const distance = Math.sqrt((clickX - bubble.x) ** 2 + (clickY - bubble.y) ** 2);
        
        if (distance < bubble.radius) {
            createBurst(bubble);
            cannonRecoil = 20;

            // ADICIONAR ESTA LÓGICA DE CÁLCULO DE ÂNGULO
            const cannonX = canvas.width / 2;
            const deltaX = bubble.x - cannonX;
            const deltaY = canvas.height - bubble.y; // Y é invertido no canvas
            targetCannonAngle = Math.atan2(deltaX, deltaY);

            popSound.currentTime = 0; // Reinicia o som para o início
            popSound.play();

            bubbles.splice(i, 1);
            score += 10;
            if (score > 0 && score % 100 === 0) {
                increaseDifficulty();
            } else {
                updateUI();
            }
            break;
        }
    }
}

function createBurst(bubble) {
    // Cria 15 partículas para a explosão
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(bubble.x, bubble.y, bubble.color));
    }
}

function drawCannon() {
    const cannonBaseX = canvas.width / 2;
    const cannonBaseY = canvas.height;
    
    // Salva o estado do canvas (posição, rotação, etc.)
    ctx.save();
    
    // 1. Translada o ponto de origem (0,0) do canvas para a base do canhão.
    // A partir de agora, todas as operações de desenho e rotação acontecerão
    // em torno deste ponto.
    ctx.translate(cannonBaseX, cannonBaseY);
    
    // 2. Rotaciona o canvas pelo ângulo atual do canhão.
    ctx.rotate(currentCannonAngle);

    // 3. Desenha o canhão. Como já transladámos a origem, desenhamos
    // o canhão como se a sua base estivesse em (0,0), apontando para cima (Y negativo).
    const recoilOffset = -cannonRecoil;

    // Base do canhão (agora em (0, -20))
    ctx.fillStyle = '#333';
    ctx.fillRect(-40, -20 + recoilOffset, 80, 20);

    // Corpo do canhão
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(-20, 0 + recoilOffset);
    ctx.lineTo(-30, -40 + recoilOffset);
    ctx.lineTo(30, -40 + recoilOffset);
    ctx.lineTo(20, 0 + recoilOffset);
    ctx.fill();

    // 4. Restaura o estado do canvas para a sua posição e rotação originais.
    // Isto é CRUCIAL para que o resto do jogo (bolhas, partículas) não seja desenhado rotacionado.
    ctx.restore();
}
// --- Event Listeners ---

// O botão Jogar agora abre o menu de dificuldade
playButton.addEventListener('click', () => {
    menu.style.display = 'none';
    difficultyScreen.style.display = 'flex';
});
// Listeners para os botões de dificuldade
easyButton.addEventListener('click', () => {
    currentDifficulty = 'easy';
    startGame();
});
normalButton.addEventListener('click', () => {
    currentDifficulty = 'normal';
    startGame();
});
hardButton.addEventListener('click', () => {
    currentDifficulty = 'hard';
    startGame();
});
backToMenuButton.addEventListener('click', () => {
    difficultyScreen.style.display = 'none';
    menu.style.display = 'flex';
});
restartButton.addEventListener('click', startGame);

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    handleInteraction(clickX, clickY);
});

canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    handleInteraction(touchX, touchY);
});

pauseButton.addEventListener('click', pauseGame);
resumeButton.addEventListener('click', resumeGame);
restartFromPauseButton.addEventListener('click', startGame);

menuButton.addEventListener('click', () => {
    isGameOver = true;
    isPaused = false;
    clearInterval(spawnInterval);
    
    pauseMenu.style.display = 'none';
    gameUi.style.display = 'none';
    menu.style.display = 'flex';
});

// About
aboutButton.addEventListener('click', () => {
    aboutScreen.style.display = 'flex'; // Mostra a janela "Sobre"
});
closeAboutButton.addEventListener('click', () => {
    aboutScreen.style.display = 'none'; // Esconde a janela "Sobre"
});