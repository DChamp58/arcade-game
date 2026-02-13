// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = true;
let score = 0;
let lives = 3;

// Ship object
const ship = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    angle: 0,
    rotation: 0,
    thrusting: false,
    thrust: {
        x: 0,
        y: 0
    },
    canShoot: true,
    shootDelay: 250
};

// Game constants
const FRICTION = 0.98;
const SHIP_THRUST = 0.15;
const TURN_SPEED = 0.08;
const ASTEROID_SPEED = 1.5;
const BULLET_SPEED = 5;
const BULLET_LIFETIME = 60;

// Arrays for game objects
let asteroids = [];
let bullets = [];
let particles = [];

// Keyboard controls
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ' ': false
};

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key in keys) {
        e.preventDefault();
        keys[e.key] = true;
        
        if (e.key === ' ' && ship.canShoot && gameRunning) {
            shootBullet();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        e.preventDefault();
        keys[e.key] = false;
    }
});

document.getElementById('restartBtn').addEventListener('click', restartGame);

// Initialize asteroids
function createAsteroids(count) {
    for (let i = 0; i < count; i++) {
        let x, y;
        // Spawn away from ship
        do {
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        } while (distanceBetween(x, y, ship.x, ship.y) < 150);
        
        asteroids.push({
            x: x,
            y: y,
            xv: (Math.random() - 0.5) * ASTEROID_SPEED,
            yv: (Math.random() - 0.5) * ASTEROID_SPEED,
            radius: 40,
            angle: Math.random() * Math.PI * 2,
            rotation: (Math.random() - 0.5) * 0.05,
            vertices: 8 + Math.floor(Math.random() * 4),
            jaggedness: 0.3 + Math.random() * 0.3
        });
    }
}

// Shoot bullet
function shootBullet() {
    const angle = ship.angle - Math.PI / 2;
    bullets.push({
        x: ship.x + Math.cos(angle) * ship.radius,
        y: ship.y + Math.sin(angle) * ship.radius,
        xv: Math.cos(angle) * BULLET_SPEED,
        yv: Math.sin(angle) * BULLET_SPEED,
        life: BULLET_LIFETIME
    });
    
    ship.canShoot = false;
    setTimeout(() => ship.canShoot = true, ship.shootDelay);
}

// Create explosion particles
function createExplosion(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        particles.push({
            x: x,
            y: y,
            xv: Math.cos(angle) * (2 + Math.random() * 2),
            yv: Math.sin(angle) * (2 + Math.random() * 2),
            life: 30 + Math.random() * 20,
            maxLife: 50,
            color: color
        });
    }
}

// Draw ship
function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    
    // Ship body
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    
    ctx.beginPath();
    ctx.moveTo(0, -ship.radius);
    ctx.lineTo(ship.radius * 0.7, ship.radius);
    ctx.lineTo(0, ship.radius * 0.7);
    ctx.lineTo(-ship.radius * 0.7, ship.radius);
    ctx.closePath();
    ctx.stroke();
    
    // Thrust flame
    if (ship.thrusting && gameRunning) {
        ctx.fillStyle = keys.ArrowUp && Math.random() > 0.5 ? '#ff00ff' : '#ffff00';
        ctx.shadowColor = '#ff00ff';
        ctx.beginPath();
        ctx.moveTo(0, ship.radius);
        ctx.lineTo(ship.radius * 0.3, ship.radius + 10 + Math.random() * 5);
        ctx.lineTo(-ship.radius * 0.3, ship.radius + 10 + Math.random() * 5);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

// Draw asteroid
function drawAsteroid(asteroid) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.angle);
    
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00ff';
    
    ctx.beginPath();
    for (let i = 0; i < asteroid.vertices; i++) {
        const angle = (Math.PI * 2 * i) / asteroid.vertices;
        const radius = asteroid.radius * (1 - asteroid.jaggedness * Math.random());
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
}

// Draw bullet
function drawBullet(bullet) {
    ctx.fillStyle = '#ffff00';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffff00';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
    ctx.fill();
}

// Draw particle
function drawParticle(particle) {
    const alpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 5;
    ctx.shadowColor = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// Distance calculation
function distanceBetween(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Wrap around screen
function wrapPosition(obj) {
    if (obj.x < 0) obj.x = canvas.width;
    if (obj.x > canvas.width) obj.x = 0;
    if (obj.y < 0) obj.y = canvas.height;
    if (obj.y > canvas.height) obj.y = 0;
}

// Split asteroid
function splitAsteroid(asteroid) {
    if (asteroid.radius > 15) {
        for (let i = 0; i < 2; i++) {
            asteroids.push({
                x: asteroid.x,
                y: asteroid.y,
                xv: (Math.random() - 0.5) * ASTEROID_SPEED * 1.5,
                yv: (Math.random() - 0.5) * ASTEROID_SPEED * 1.5,
                radius: asteroid.radius / 2,
                angle: Math.random() * Math.PI * 2,
                rotation: (Math.random() - 0.5) * 0.08,
                vertices: asteroid.vertices,
                jaggedness: asteroid.jaggedness
            });
        }
    }
}

// Lose life
function loseLife() {
    lives--;
    document.getElementById('lives').textContent = lives;
    createExplosion(ship.x, ship.y, '#00ffff', 40);
    
    if (lives <= 0) {
        gameOver();
    } else {
        // Reset ship position
        ship.x = canvas.width / 2;
        ship.y = canvas.height / 2;
        ship.thrust.x = 0;
        ship.thrust.y = 0;
        ship.angle = 0;
    }
}

// Game over
function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Restart game
function restartGame() {
    gameRunning = true;
    score = 0;
    lives = 3;
    asteroids = [];
    bullets = [];
    particles = [];
    
    ship.x = canvas.width / 2;
    ship.y = canvas.height / 2;
    ship.thrust.x = 0;
    ship.thrust.y = 0;
    ship.angle = 0;
    
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    document.getElementById('gameOver').classList.add('hidden');
    
    createAsteroids(5);
}

// Update game
function update() {
    if (!gameRunning) return;
    
    // Ship rotation
    if (keys.ArrowLeft) {
        ship.angle -= TURN_SPEED;
    }
    if (keys.ArrowRight) {
        ship.angle += TURN_SPEED;
    }
    
    // Ship thrust
    ship.thrusting = keys.ArrowUp;
    if (ship.thrusting) {
        const angle = ship.angle - Math.PI / 2;
        ship.thrust.x += Math.cos(angle) * SHIP_THRUST;
        ship.thrust.y += Math.sin(angle) * SHIP_THRUST;
    }
    
    // Apply friction
    ship.thrust.x *= FRICTION;
    ship.thrust.y *= FRICTION;
    
    // Update ship position
    ship.x += ship.thrust.x;
    ship.y += ship.thrust.y;
    wrapPosition(ship);
    
    // Update asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        asteroid.x += asteroid.xv;
        asteroid.y += asteroid.yv;
        asteroid.angle += asteroid.rotation;
        wrapPosition(asteroid);
        
        // Check collision with ship
        if (distanceBetween(ship.x, ship.y, asteroid.x, asteroid.y) < ship.radius + asteroid.radius) {
            loseLife();
            asteroids.splice(i, 1);
            continue;
        }
    }
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.xv;
        bullet.y += bullet.yv;
        bullet.life--;
        
        if (bullet.life <= 0) {
            bullets.splice(i, 1);
            continue;
        }
        
        wrapPosition(bullet);
        
        // Check collision with asteroids
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const asteroid = asteroids[j];
            if (distanceBetween(bullet.x, bullet.y, asteroid.x, asteroid.y) < asteroid.radius) {
                createExplosion(asteroid.x, asteroid.y, '#ff00ff', 15);
                splitAsteroid(asteroid);
                asteroids.splice(j, 1);
                bullets.splice(i, 1);
                
                score += 10;
                document.getElementById('score').textContent = score;
                break;
            }
        }
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.xv;
        particle.y += particle.yv;
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // Spawn new asteroids if none left
    if (asteroids.length === 0) {
        createAsteroids(5 + Math.floor(score / 100));
    }
}

// Draw game
function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Draw particles
    particles.forEach(drawParticle);
    
    // Draw bullets
    bullets.forEach(drawBullet);
    
    // Draw asteroids
    asteroids.forEach(drawAsteroid);
    
    // Draw ship
    if (gameRunning) {
        drawShip();
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
createAsteroids(5);
gameLoop();
