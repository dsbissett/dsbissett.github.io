const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const blockSize = Math.min(Math.floor(window.innerWidth / 10), 32);

const tetriminos = {
  'I': [
    [1, 1, 1, 1]
  ],
  'O': [
    [2, 2],
    [2, 2]
  ],
  'T': [
    [0, 3, 0],
    [3, 3, 3]
  ],
  'L': [
    [0, 4, 0],
    [0, 4, 0],
    [0, 4, 4]
  ],
  'J': [
    [0, 5, 0],
    [0, 5, 0],
    [5, 5, 0]
  ],
  'S': [
    [0, 6, 6],
    [6, 6, 0]
  ],
  'Z': [
    [7, 7, 0],
    [0, 7, 7]
  ]
};

const colors = [
  null,
  '#00f0f0', // I
  '#f0f000', // O
  '#a000f0', // T
  '#f0a000', // L
  '#0000f0', // J
  '#00f000', // S
  '#f00000'  // Z
];

// Update canvas width and height based on screen size
canvas.width = blockSize * 10;
canvas.height = blockSize * 20;

const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
const previewBlockSize = 32;

// Update preview canvas width and height based on screen size
previewCanvas.width = blockSize * 5;
previewCanvas.height = blockSize * 5;

function drawBlock(x, y, value) {
  ctx.fillStyle = colors[value];
  ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
}

function drawMatrix(matrix, offsetX, offsetY) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawBlock(x + offsetX, y + offsetY, value);
      }
    });
  });
}

function getRandomTetrimino() {
  const keys = Object.keys(tetriminos);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return tetriminos[randomKey];
}

class Tetrimino {
  constructor(matrix, x, y) {
    this.matrix = matrix;
    this.x = x;
    this.y = y;
  }

  move(dx, dy) {
    if (!isCollision(this.matrix, this.x + dx, this.y + dy)) {
      this.x += dx;
      this.y += dy;
    }
  }

  rotate() {
    const rotatedMatrix = rotateMatrix(this.matrix);
    if (!isCollision(rotatedMatrix, this.x, this.y)) {
      this.matrix = rotatedMatrix;
    }
  }
}

function rotateMatrix(matrix) {
  const result = matrix[0].map((_, i) => matrix.map(row => row[i])).reverse();
  return result;
}

function isCollision(matrix, offsetX, offsetY) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (matrix[y][x] &&
          (offsetX + x < 0 || offsetX + x >= 10 || offsetY + y >= 20 ||
           (grid[offsetY + y] && grid[offsetY + y][offsetX + x]))) {
        return true;
      }
    }
  }
  return false;
}

function clearLines() {
  let clearedLines = 0;

  outer: for (let y = grid.length - 1; y >= 0; y--) {
    for (let x = 0; x < grid[y].length; x++) {
      if (!grid[y][x]) {
        continue outer;
      }
    }

    for (let x = 0; x < grid[y].length; x++) {
      createBlocks(x, y, colors[grid[y][x]]);
    }

    // Create particles for each block in the cleared row
    // for (let x = 0; x < grid[y].length; x++) {
    //   createParticles(x + 0.5, y + 0.5, colors[grid[y][x]]);
    // }

    const row = grid.splice(y, 1)[0].fill(0);
    grid.unshift(row);
    y++; // Check the same row index again as it now contains the row above
    clearedLines++;
  }

  if (clearedLines > 0) {
    updateScore(clearedLines);
  }
}

const grid = Array.from({ length: 20 }, () => Array(10).fill(0));
const tetrimino = new Tetrimino(getRandomTetrimino(), 3, 0);

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') {
    tetrimino.move(-1, 0);
  } else if (event.key === 'ArrowRight') {
    tetrimino.move(1, 0);
  } else if (event.key === 'ArrowDown') {
    tetrimino.move(0, 1);
  } else if (event.key === 'ArrowUp') {
    tetrimino.rotate();
  }
});

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function merge(grid, tetrimino) {
  tetrimino.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        grid[tetrimino.y + y][tetrimino.x + x] = value;
      }
    });
  });
}

function resetTetrimino() {
tetrimino.matrix = nextTetrimino;
  tetrimino.x = Math.floor(grid[0].length / 2) - Math.ceil(tetrimino.matrix[0].length / 2);
  tetrimino.y = 0;

  // Set the next Tetrimino and draw it in the preview window
  nextTetrimino = getRandomTetrimino();
  drawPreview(nextTetrimino);

  // Check for game over
  if (isCollision(tetrimino.matrix, tetrimino.x, tetrimino.y)) {
    grid.forEach(row => row.fill(0));
  }

  clearLines(); // Clear lines after spawning a new Tetrimino
}

function update(dt) {
  dropCounter += dt;
  if (dropCounter > dropInterval) {
    if (!isCollision(tetrimino.matrix, tetrimino.x, tetrimino.y + 1)) {
      tetrimino.y++;
    } else {
      merge(grid, tetrimino);
      resetTetrimino();
    }
    dropCounter = 0;
  }
}

let score = 0;

function updateScore(clearedLines) {
  const linePoints = [0, 40, 100, 300, 1200];
  const level = 1; // You can implement level progression based on the player's score or lines cleared
  score += linePoints[clearedLines] * (level + 1);
}

function drawScore() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${score}`, 10, 30);
}

let nextTetrimino = getRandomTetrimino();

function drawPreview(matrix) {
  // Clear preview canvas
  previewCtx.fillStyle = '#222';
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

  // Calculate x and y offsets to center the Tetrimino matrix
  const xOffset = Math.floor((previewCanvas.width / previewBlockSize - matrix[0].length) / 2);
  const yOffset = Math.floor((previewCanvas.height / previewBlockSize - matrix.length) / 2);

  // Draw the next Tetrimino with the calculated offsets
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        previewCtx.fillStyle = colors[value];
        previewCtx.fillRect((x + xOffset) * previewBlockSize, (y + yOffset) * previewBlockSize, previewBlockSize, previewBlockSize);
        previewCtx.strokeStyle = '#000';
        previewCtx.strokeRect((x + xOffset) * previewBlockSize, (y + yOffset) * previewBlockSize, previewBlockSize, previewBlockSize);
      }
    });
  });
}

const bgMusic = document.getElementById('bgMusic');

function playBackgroundMusic() {
  bgMusic.volume = 0.5; // Adjust the volume as needed
  bgMusic.play();
}

function playMusicOnClick() {
  document.addEventListener('touchstart', function onClick(){
    bgMusic.volume = 0.5;
    bgMusic.play().catch((error) => {
      console.error("Error playing background music:", error);
    });
    document.removeEventListener('touchstart', onClick);
  })
  document.addEventListener('click', function onClick() {
    bgMusic.volume = 0.5;
    bgMusic.play().catch((error) => {
      console.error("Error playing background music:", error);
    });
    document.removeEventListener('click', onClick);
  });
}

function rotateTetrimino() {
  const rotatedMatrix = rotateMatrix(tetrimino.matrix);
  if (!isCollision(rotatedMatrix, tetrimino.x, tetrimino.y)) {
    tetrimino.matrix = rotatedMatrix;
  }
}

// Add touch controls
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);

let touchStartX = null;
let touchStartY = null;

function handleTouchStart(e) {
  e.preventDefault();
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}

function handleTouchMove(e) {
  e.preventDefault();
  const touchMoveX = e.touches[0].clientX;
  const touchMoveY = e.touches[0].clientY;

  const dx = touchMoveX - touchStartX;
  const dy = touchMoveY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > blockSize * 0.75) {
      tetrimino.move(1, 0);
      touchStartX = touchMoveX;
    } else if (dx < -blockSize * 0.75) {
      tetrimino.move(-1, 0);
      touchStartX = touchMoveX;
    }
  } else {
    if (dy > blockSize * 0.75) {
      tetrimino.move(0, 1);
      touchStartY = touchMoveY;
    }
  }
}


function handleTouchEnd(e) {
  e.preventDefault();
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  if (Math.abs(dx) < blockSize * 0.25 && Math.abs(dy) < blockSize * 0.25) {
    rotateTetrimino();
  }
}

class Block {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = blockSize;
    this.speedX = Math.random() * 6 - 3;
    this.speedY = -Math.random() * 8 - 4;
    this.gravity = 0.3;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.speedY += this.gravity;

    if (this.y > canvas.height) {
      this.size = 0;
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(this.x, this.y, this.size, this.size);
  }
}

const blocks = [];

function createBlocks(x, y, color) {
  const numberOfBlocks = 1;

  for (let i = 0; i < numberOfBlocks; i++) {
    blocks.push(new Block(x * blockSize, y * blockSize, color));
  }
}

function handleBlocks() {
  blocks.forEach((block, index) => {
    block.update();
    block.draw();

    if (block.size <= 0) {
      blocks.splice(index, 1);
    }
  });
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Math.random() * 5 + 1;
    this.speedX = Math.random() * 3 - 1.5;
    this.speedY = Math.random() * 3 - 1.5;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.size > 0.1) this.size -= 0.1;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

const particles = [];

function createParticles(particleX, y, color) {
  const numberOfParticles = 30;

  for (let i = 0; i < numberOfParticles; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    const velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    };
    const size = Math.random() * 3 + 1;
    const life = 100;
    particles.push(new Particle(particleX * blockSize, y * blockSize, velocity, size, life, color));
  }
}

function handleParticles() {
  particles.forEach((particle, index) => {
    particle.update();
    particle.draw();

    if (particle.size <= 0.1) {
      particles.splice(index, 1);
    }
  });
}

function gameLoop(time = 0) {
  const dt = time - lastTime;
  lastTime = time;

  update(dt);

  // Clear canvas
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Tetrimino, grid, and score
  drawMatrix(grid, 0, 0);
  drawMatrix(tetrimino.matrix, tetrimino.x, tetrimino.y);
  drawScore();

  // Handle particles
  //handleParticles();
  handleBlocks();

  // Play background music
  playMusicOnClick();

  // Request the next frame
  requestAnimationFrame(gameLoop);
}

resetTetrimino();
gameLoop();
