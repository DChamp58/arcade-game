// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameRunning = true;
let gamePaused = false;
let score = 0;
let lives = 3;
let money = 0;
let level = 1;
let asteroidsDestroyed = 0;
let asteroidsNeededForLevel = 10;
let levelingUp = false;
let levelUpTimer = 0;

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
    shootDelay: 250,
    weapon: 'normal', // normal, spread, rapid, laser
    speedLevel: 1,
    maxLives: 3
};

// Upgrades and costs
const upgrades = {
    spreadShot: { owned: false, cost: 100 },
    rapidFire: { owned: false, cost: 150 },
    laserBeam: { owned: false, cost: 200 },
    speedBoost: { level: 1, cost: 80, maxLevel: 3 },
    extraLife: { cost: 120 }
};

// Game constants
const FRICTION = 0.98;
const SHIP_THRUST = 0.15;
const TURN_SPEED = 0.08;
const BASE_ASTEROID_SPEED = 1.5;
const BULLET_SPEED = 5;
const BULLET_LIFETIME = 60;
const LASER_LIFETIME = 30;

// Arrays for game objects
let asteroids = [];
let bullets = [];
let particles = [];
let lasers = [];

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
        
        if (e.key === ' ' && ship.canShoot && gameRunning && !gamePaused) {
            shootWeapon();
        }
    }
    
    // Toggle shop with 'S' key
    if (e.key.toLowerCase() === 's' && gameRunning) {
        toggleShop();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        e.preventDefault();
        keys[e.key] = false;
    }
});

document.getElementById('restartBtn').addEventListener('click', restartGame);
document.getElementById('closeShop').addEventListener('click', toggleShop);

// Shop button handlers
document.getElementById('buySpread').addEventListener('click', () => buyUpgrade('spreadShot'));
document.getElementById('buyRapid').addEventListener('click', () => buyUpgrade('rapidFire'));
document.getElementById('buyLaser').addEventListener('click', () => buyUpgrade('laserBeam'));
document.getElementById('buySpeed').addEventListener('click', () => buyUpgrade('speedBoost'));
document.getElementById('buyLife').addEventListener('click', () => buyUpgrade('extraLife'));

// Toggle shop
function toggleShop() {
    gamePaused = !gamePaused;
    const shopEl = document.getElementById('shop');
    shopEl.classList.toggle('hidden');
    updateShopUI();
}

// Update shop UI
function updateShopUI() {
    document.getElementById('shopMoney').textContent = money;
    
    // Update button states
    const spreadBtn = document.getElementById('buySpread');
    const rapidBtn = document.getElementById('buyRapid');
    const laserBtn = document.getElementById('buyLaser');
    const speedBtn = document.getElementById('buySpeed');
    const lifeBtn = document.getElementById('buyLife');
    
    // Spread shot
    if (upgrades.spreadShot.owned) {
        spreadBtn.textContent = 'OWNED';
        spreadBtn.disabled = true;
    } else {
        spreadBtn.disabled = money < upgrades.spreadShot.cost;
    }
    
    // Rapid fire
    if (upgrades.rapidFire.owned) {
        rapidBtn.textContent = 'OWNED';
        rapidBtn.disabled = true;
    } else {
        rapidBtn.disabled = money < upgrades.rapidFire.cost;
    }
    
    // Laser beam
    if (upgrades.laserBeam.owned) {
        laserBtn.textContent = 'OWNED';
        laserBtn.disabled = true;
    } else {
        laserBtn.disabled = money < upgrades.laserBeam.cost;
    }
    
    // Speed boost
    if (upgrades.speedBoost.level >= upgrades.speedBoost.maxLevel) {
        speedBtn.textContent = 'MAX LEVEL';
        speedBtn.disabled = true;
    } else {
        speedBtn.disabled = money < upgrades.speedBoost.cost;
        document.getElementById('speedLevel').textContent = upgrades.speedBoost.level;
    }
    
    // Extra life
    lifeBtn.disabled = money < upgrades.extraLife.cost;
}

// Buy upgrade
function buyUpgrade(type) {
    if (type === 'spreadShot' && !upgrades.spreadShot.owned && money >= upgrades.spreadShot.cost) {
        money -= upgrades.spreadShot.cost;
        upgrades.spreadShot.owned = true;
        ship.weapon = 'spread';
        document.getElementById('currentWeapon').textContent = 'SPREAD SHOT';
    }
    else if (type === 'rapidFire' && !upgrades.rapidFire.owned && money >= upgrades.rapidFire.cost) {
        money -= upgrades.rapidFire.cost;
        upgrades.rapidFire.owned = true;
        ship.weapon = 'rapid';
        ship.shootDelay = 150;
        document.getElementById('currentWeapon').textContent = 'RAPID FIRE';
    }
    else if (type === 'laserBeam' && !upgrades.laserBeam.owned && money >= upgrades.laserBeam.cost) {
        money -= upgrades.laserBeam.cost;
        upgrades.laserBeam.owned = true;
        ship.weapon = 'laser';
        document.getElementById('currentWeapon').textContent = 'LASER BEAM';
    }
    else if (type === 'speedBoost' && upgrades.speedBoost.level < upgrades.speedBoost.maxLevel && money >= upgrades.speedBoost.cost) {
        money -= upgrades.speedBoost.cost;
        upgrades.speedBoost.level++;
        upgrades.speedBoost.cost = Math.floor(upgrades.speedBoost.cost * 1.5);
    }
    else if (type === 'extraLife' && money >= upgrades.extraLife.cost) {
        money -= upgrades.extraLife.cost;
        lives++;
        ship.maxLives++;
        document.getElementById('lives').textContent = lives;
    }
    
    document.getElementById('money').textContent = money;
    updateShopUI();
}

// Get asteroid speed based on level
function getAsteroidSpeed() {
    return BASE_ASTEROID_SPEED * (1 + (level - 1) * 0.15);
}

// Get asteroid count for level
function getAsteroidCount() {
    return Math.min(5 + level, 12); // Cap at 12 asteroids
}

// Initialize asteroids
function createAsteroids(count) {
    const speed = getAsteroidSpeed();
    
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
            xv: (Math.random() - 0.5) * speed,
            yv: (Math.random() - 0.5) * speed,
            radius: 40,
            angle: Math.random() * Math.PI * 2,
            rotation: (Math.random() - 0.5) * 0.05,
            vertices: 8 + Math.floor(Math.random() * 4),
            jaggedness: 0.3 + Math.random() * 0.3
        });
    }
}

// Level up function
function levelUp() {
    level++;
    asteroidsDestroyed = 0;
    asteroidsNeededForLevel = Math.floor(10 + level * 2);
    levelingUp = true;
    levelUpTimer = 120; // 2 seconds at 60fps
    
    // Bonus money for leveling up
    const bonus = level * 50;
    money += bonus;
    
    document.getElementById('level').textContent = level;
    document.getElementById('money').textContent = money;
    
    // Create explosion effect
    createExplosion(canvas.width / 2, canvas.height / 2, '#ffff00', 50);
}

// Shoot weapon based on type
function shootWeapon() {
    const angle = ship.angle - Math.PI / 2;
    
    if (ship.weapon === 'normal') {
        shootBullet(angle);
    }
    else if (ship.weapon === 'spread') {
        // Shoot 3 bullets in a spread
        shootBullet(angle - 0.2);
        shootBullet(angle);
        shootBullet(angle + 0.2);
    }
    else if (ship.weapon === 'rapid') {
        shootBullet(angle);
    }
    else if (ship.weapon === 'laser') {
        shootLaser(angle);
    }
    
    ship.canShoot = false;
    setTimeout(() => ship.canShoot = true, ship.shootDelay);
}

// Shoot bullet
function shootBullet(angle) {
    bullets.push({
        x: ship.x + Math.cos(angle) * ship.radius,
        y: ship.y + Math.sin(angle) * ship.radius,
        xv: Math.cos(angle) * BULLET_SPEED,
        yv: Math.sin(angle) * BULLET_SPEED,
        life: BULLET_LIFETIME
    });
}

// Shoot laser
function shootLaser(angle) {
    lasers.push({
        x: ship.x,
        y: ship.y,
        angle: angle,
        life: LASER_LIFETIME,
        length: 0,
        maxLength: 1200
    });
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
    
    // Reset shadow for flame
    ctx.shadowBlur = 0;
    
    // Thrust flame
    if (ship.thrusting && gameRunning && !gamePaused) {
        ctx.fillStyle = keys.ArrowUp && Math.random() > 0.5 ? '#ff00ff' : '#ffff00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff00ff';
        ctx.beginPath();
        ctx.moveTo(0, ship.radius);
        ctx.lineTo(ship.radius * 0.3, ship.radius + 10 + Math.random() * 5);
        ctx.lineTo(-ship.radius * 0.3, ship.radius + 10 + Math.random() * 5);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
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
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
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
    // Reset shadow
    ctx.shadowBlur = 0;
}

// Draw laser
function drawLaser(laser) {
    const endX = laser.x + Math.cos(laser.angle) * laser.length;
    const endY = laser.y + Math.sin(laser.angle) * laser.length;
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff00';
    
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowBlur = 0;
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
    // Reset shadow and alpha
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
}

// Distance calculation
function distanceBetween(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Check if point is near line segment
function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
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
    const speed = getAsteroidSpeed();
    
    if (asteroid.radius > 15) {
        for (let i = 0; i < 2; i++) {
            asteroids.push({
                x: asteroid.x,
                y: asteroid.y,
                xv: (Math.random() - 0.5) * speed * 1.5,
                yv: (Math.random() - 0.5) * speed * 1.5,
                radius: asteroid.radius / 2,
                angle: Math.random() * Math.PI * 2,
                rotation: (Math.random() - 0.5) * 0.08,
                vertices: asteroid.vertices,
                jaggedness: asteroid.jaggedness
            });
        }
    }
}

// Add money based on asteroid size
function addMoney(asteroidRadius) {
    let earned = 0;
    if (asteroidRadius >= 40) earned = 10;
    else if (asteroidRadius >= 20) earned = 5;
    else earned = 2;
    
    money += earned;
    document.getElementById('money').textContent = money;
}

// Destroy asteroid (called when asteroid is destroyed)
function destroyAsteroid(asteroid, fromBullet = true) {
    asteroidsDestroyed++;
    
    // Check for level up
    if (asteroidsDestroyed >= asteroidsNeededForLevel) {
        levelUp();
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
    document.getElementById('finalMoney').textContent = money;
    document.getElementById('finalLevel').textContent = level;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Restart game
function restartGame() {
    gameRunning = true;
    gamePaused = false;
    score = 0;
    lives = ship.maxLives;
    money = 0;
    level = 1;
    asteroidsDestroyed = 0;
    asteroidsNeededForLevel = 10;
    levelingUp = false;
    levelUpTimer = 0;
    asteroids = [];
    bullets = [];
    particles = [];
    lasers = [];
    
    ship.x = canvas.width / 2;
    ship.y = canvas.height / 2;
    ship.thrust.x = 0;
    ship.thrust.y = 0;
    ship.angle = 0;
    
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    document.getElementById('money').textContent = money;
    document.getElementById('level').textContent = level;
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('shop').classList.add('hidden');
    
    createAsteroids(getAsteroidCount());
}

// Update game
function update() {
    if (!gameRunning || gamePaused) return;
    
    // Update level up timer
    if (levelingUp) {
        levelUpTimer--;
        if (levelUpTimer <= 0) {
            levelingUp = false;
        }
    }
    
    // Ship rotation
    if (keys.ArrowLeft) {
        ship.angle -= TURN_SPEED;
    }
    if (keys.ArrowRight) {
        ship.angle += TURN_SPEED;
    }
    
    // Ship thrust with speed upgrade
    ship.thrusting = keys.ArrowUp;
    if (ship.thrusting) {
        const angle = ship.angle - Math.PI / 2;
        const thrustPower = SHIP_THRUST * upgrades.speedBoost.level;
        ship.thrust.x += Math.cos(angle) * thrustPower;
        ship.thrust.y += Math.sin(angle) * thrustPower;
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
                addMoney(asteroid.radius);
                destroyAsteroid(asteroid);
                splitAsteroid(asteroid);
                asteroids.splice(j, 1);
                bullets.splice(i, 1);
                
                score += 10;
                document.getElementById('score').textContent = score;
                break;
            }
        }
    }
    
    // Update lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.life--;
        
        // Extend laser
        if (laser.length < laser.maxLength) {
            laser.length += 40;
        }
        
        if (laser.life <= 0) {
            lasers.splice(i, 1);
            continue;
        }
        
        // Check collision with asteroids
        const endX = laser.x + Math.cos(laser.angle) * laser.length;
        const endY = laser.y + Math.sin(laser.angle) * laser.length;
        
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const asteroid = asteroids[j];
            const dist = pointToLineDistance(asteroid.x, asteroid.y, laser.x, laser.y, endX, endY);
            
            if (dist < asteroid.radius) {
                createExplosion(asteroid.x, asteroid.y, '#00ff00', 15);
                addMoney(asteroid.radius);
                destroyAsteroid(asteroid);
                splitAsteroid(asteroid);
                asteroids.splice(j, 1);
                
                score += 10;
                document.getElementById('score').textContent = score;
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
    
    // Spawn new asteroids if none left (and not currently leveling up)
    if (asteroids.length === 0 && !levelingUp) {
        createAsteroids(getAsteroidCount());
    }
}

// Draw game
function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset all canvas shadow/alpha settings at start of draw
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1;
    
    // Draw particles
    particles.forEach(drawParticle);
    
    // Draw bullets
    bullets.forEach(drawBullet);
    
    // Draw lasers
    lasers.forEach(drawLaser);
    
    // Draw asteroids
    asteroids.forEach(drawAsteroid);
    
    // Draw ship
    if (gameRunning) {
        drawShip();
    }
    
    // Draw level up message
    if (levelingUp) {
        const alpha = levelUpTimer / 120;
        ctx.globalAlpha = alpha;
        
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 60px "Courier New"';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffff00';
        ctx.fillText(`LEVEL ${level}`, canvas.width / 2, canvas.height / 2 - 30);
        
        ctx.font = '30px "Courier New"';
        ctx.fillText(`+$${level * 50} BONUS`, canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
    
    // Draw pause text
    if (gamePaused) {
        ctx.fillStyle = '#ffff00';
        ctx.font = '30px "Courier New"';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffff00';
        ctx.fillText('PAUSED - SHOP OPEN', canvas.width / 2, 50);
        ctx.shadowBlur = 0;
    }
    
    // Final reset to ensure clean state
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
createAsteroids(getAsteroidCount());
gameLoop();