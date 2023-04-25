let pInstance;

const sketch = (p) => {
  let birdSprite,
    topPipeSprite,
    bottomPipeSprite,
    backgroundSprite,
    groundSprite;
  let bird,
    pipes = [];
  let gameStatus = "playing";
  let score = 0;
  let gameInterval;
  let groundX = 0;
  let groundSpeed = 2;
  let groundWidth = 0;
  let groundSpritesCount = 0;

  p.preload = () => {
    birdSprite = p.loadImage("images/birdie.png");
    topPipeSprite = p.loadImage("images/full pipe top.png");
    bottomPipeSprite = p.loadImage("images/full pipe bottom.png");
    backgroundSprite = p.loadImage("images/background.png");
    groundSpriteMap = p.loadImage("images/sprite-map.png");
    spriteMap = p.loadImage("images/sprite-map.png");
    groundWidth = 330;
  };

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    pInstance = p;
    startGame(p);
    groundSpritesCount = Math.ceil(p.width / groundWidth) + 1;
  };

  p.draw = () => {
    drawGame(p);
  };

  p.keyPressed = () => {
    if (p.keyCode === 32) {
      handleInput();
    }
  };

  p.touchStarted = () => {
    handleInput();
  };

  p.mousePressed = () => {
    handleInput();
  };

  function handleInput() {
    if (gameStatus === 'playing') {
      bird.jump();
    } else {
      startGame(p);
    }
  }

  function startGame() {
    const scaleFactor = p.width / 400;
    bird = new Bird(50 * scaleFactor, p.height / 2, 40 * scaleFactor, 30 * scaleFactor, birdSprite);
    pipes = [];
    score = 0;
    gameStatus = "playing";

    gameInterval = setInterval(() => {
      const pipe = new Pipe(p.width, 150 * scaleFactor, 100 * scaleFactor, 350 * scaleFactor, topPipeSprite, bottomPipeSprite, 52 * scaleFactor, 2 * scaleFactor);
      pipes.push(pipe);
    }, 2000);
  }

  let backgroundX = 0;

  function drawGame() {
    // Calculate the new backgroundX position
    backgroundX -= p.width * 0.00125;
    if (backgroundX <= -p.width) {
      backgroundX = 0;
    }

    // Draw the scrolling background
    //p.image(backgroundSprite, 0, p.height - p.height * 0.15, p.width, p.height * 0.15);
    p.image(backgroundSprite, backgroundX, -10, p.width, p.height);
    p.image(backgroundSprite, backgroundX + p.width, 0, p.width, p.height);

    // Draw background, ground, bird, and pipes
    pipes.forEach((pipe) => pipe.draw(p));
    bird.draw(p, gameStatus);

    // Draw the scrolling ground
    groundX -= groundSpeed;
    if (groundX <= -groundWidth) {
        groundX += groundWidth;
    }
    
    for (let i = 0; i < groundSpritesCount; i++) {
        drawGround(groundX + i * (groundWidth - 5));
    }

    updateGame(p);

    if (gameStatus === "gameOver") {
      handleGameOver(p);
    } else {
      // Draw score
      p.fill(255);
      p.textSize(24);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(score, p.width / 2, 50);
    }
  }

  function drawGround(x) {
    p.image(spriteMap, x, p.height - 25, groundWidth, 110, 570, 10, groundWidth, 110);
  }

  function updateGame() {
    bird.update(p);

    if (gameStatus === 'gameOver') {
        if (!checkGroundCollision(bird)) {
          bird.update(p); // Keep updating bird's position to make it fall
        }
        handleGameOver(p);
        return;
      }
    

    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].update();

      if (bird.collidesWith(pipes[i])) {
        gameStatus = "gameOver";
        clearInterval(gameInterval);
        handleGameOver(p);
        return;
      }

      if (pipes[i].passed(bird)) {
        score++;
      }

      if (pipes[i].isOffScreen()) {
        pipes.splice(i, 1);
      }
    }

    // Check for ground collision after processing all pipes
    if (checkGroundCollision(bird)) {
      gameStatus = "gameOver";
      clearInterval(gameInterval);
    }
  }

  function checkGroundCollision(bird) {
    const groundHeight = p.height * 0.15;
    return bird.y + bird.height >= p.height - groundHeight;
  }

  function handleGameOver(p) {
    bird.velocity = 0; // Stop bird's movement
    bird.gravity = 4; // Apply gravity to make the bird fall

    clearInterval(gameInterval);

    p.fill(255);
    p.textSize(48);
    p.textAlign(p.CENTER, p.CENTER);
    p.text("Game Over", p.width / 2, p.height / 2 - 50);

    p.textSize(24);
    p.text("Score: " + score, p.width / 2, p.height / 2 + 10);
  }
};

class Bird {
  constructor(x, y, width, height, img) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.img = img;
    this.gravity = 0.6;
    this.velocity = 0;
    this.lift = -15;
    this.lastClickTime = null;
    this.frameCounter = 0;
    this.frameIndex = 0;
    this.frames = [
      { x: 1, y: 0, w: 90, h: 64 },    // bird-flap-low
      { x: 93, y: 0, w: 90, h: 64 },   // bird-flap-middle
      { x: 185, y: 0, w: 90, h: 64 },  // bird-flap-high
    ];
  }

  draw(p, gameStatus) {
    p.push(); // Save the current drawing state

    // Calculate the angle of rotation based on bird's velocity and game status
    let angle;
    if (gameStatus === 'gameOver') {
      angle = p.PI / 2; // Face straight down
    } else {
      angle = p.map(this.velocity, -5, 5, -p.PI / 6, p.PI / 6);
    }

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Translate and rotate around the bird's center
    p.translate(centerX, centerY);
    p.rotate(angle);

    // Draw the bird with the updated rotation
    p.imageMode(p.CENTER);
    const frame = this.frames[this.frameIndex];
    p.image(this.img, 0, 0, this.width, this.height, frame.x, frame.y, frame.w, frame.h);

    p.pop(); // Restore the previous drawing state
  }

  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;
    this.velocity *= 0.9;

    // Prevent the bird from going off the screen
    if (this.y > pInstance.height - this.height) {
      this.y = pInstance.height - this.height;
      this.velocity = 0;
    } else if (this.y < 0) {
      this.y = 0;
      this.velocity = 0;
    }

    this.updateAnimationFrame();
  }

  updateAnimationFrame() {
    this.frameCounter++;

    if (this.frameCounter >= 2) { // Adjust this number to control the animation speed
      this.frameCounter = 0;
      this.frameIndex++;

      if (this.frameIndex > 2) {
        this.frameIndex = 0;
      }
    }
  }

  jump() {
    this.velocity += this.lift;

    const currentTime = new Date().getTime();
    if (this.lastClickTime) {
      const elapsedTime = currentTime - this.lastClickTime;

      // Update bird's x-position based on click speed
      if (elapsedTime < 400) {
        this.x += 5;
      } else if (elapsedTime >800) {
        this.x -= 5;
      }
    }

    this.lastClickTime = currentTime;
  }

  checkGroundCollision() {
    const groundHeight = groundSprite.height;
    return this.y + this.height >= pInstance.height - groundHeight;
  }

  collidesWith(pipe) {
    // Check for collision with a pipe
    const birdTop = this.y;
    const birdBottom = this.y + this.height;
    const birdLeft = this.x;
    const birdRight = this.x + this.width;

    const pipeTop = pipe.topHeight;
    const pipeBottom = pipe.bottomY;
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipe.width;

    const horizontalCollision = birdRight > pipeLeft && birdLeft < pipeRight;
    const verticalCollision = birdTop < pipeTop || birdBottom > pipeBottom;

    return horizontalCollision && verticalCollision;
  }
}

class Pipe {
  constructor(
    x,
    gap,
    minHeight,
    maxHeight,
    topPipeImg,
    bottomPipeImg,
    width,
    speed
  ) {
    this.x = x;
    this.width = width;
    this.speed = speed;
    this.topPipeImg = topPipeImg;
    this.bottomPipeImg = bottomPipeImg;
    this.topHeight = pInstance.random(minHeight, maxHeight);
    this.bottomY = this.topHeight + gap;
  }

  draw(p) {
    p.image(this.topPipeImg, this.x, 0, this.width, this.topHeight);
    p.image(
      this.bottomPipeImg,
      this.x,
      this.bottomY,
      this.width,
      pInstance.height - this.bottomY
    );
  }

  update() {
    this.x -= this.speed;
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }

  passed(bird) {
    return bird.x > this.x + this.width;
  }

  getSpeed() {
    return this.speed;
  }
}

const myp5 = new p5(sketch);
