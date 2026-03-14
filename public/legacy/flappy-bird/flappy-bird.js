let pInstance;
let offsetX;
let offsetY;
let gameScale = 1;
const GAME_WIDTH = 350;
const GAME_HEIGHT = 600;
const SCALE_FACTOR = GAME_WIDTH / 350;
const FLAPPY_FONT = "FlappyBirdy";
const FLAPPY_FONT_URL = "lib/flappy-bird.woff";
let speedFactor = 1;
const IS_FILE_PROTOCOL = window.location.protocol === "file:";
let flappyFontReady = false;
let flappyFontLoading = false;

if (IS_FILE_PROTOCOL && typeof p5 !== "undefined" && !p5.prototype._loadImageFileCompat) {
  p5.prototype._loadImageFileCompat = p5.prototype.loadImage;
  p5.prototype.loadImage = function (path, successCallback, failureCallback) {
    const pImg = new p5.Image(1, 1, this);
    const img = new Image();
    const self = this;

    img.onload = function () {
      pImg.width = pImg.canvas.width = img.width;
      pImg.height = pImg.canvas.height = img.height;
      pImg.drawingContext.drawImage(img, 0, 0);
      pImg.modified = true;
      if (typeof successCallback === "function") {
        successCallback(pImg);
      }
      if (typeof self._decrementPreload === "function") {
        self._decrementPreload();
      }
    };

    img.onerror = function (e) {
      if (typeof p5._friendlyFileLoadError === "function") {
        p5._friendlyFileLoadError(0, path);
      }
      if (typeof failureCallback === "function") {
        failureCallback(e);
      } else {
        console.error(e);
      }
      if (typeof self._decrementPreload === "function") {
        self._decrementPreload();
      }
    };

    img.src = path;
    pImg.modified = true;
    return pImg;
  };
}


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
  let groundX = 0;
  let groundSpeed = 2;
  let baseGroundSpeed = 2;
  let basePipeSpeed = 2;
  let groundWidth = 0;
  let backgroundX = 0;
  let spawnTimer = 0;
  let nextPipeDelay = 0;
  let lastGapCenter = GAME_HEIGHT / 2;

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
    p.id = "p5canvas";
    pInstance = p;
    updateLayout();
    ensureFlappyFont();
    startGame(p);
  };

  p.windowResized = () => {
    updateLayout();
  };

  p.draw = () => {
    // p.push();
    // p.translate(offsetX, offsetY);
    // p.scale(GAME_WIDTH / p.width);
    // drawGame(p);
    // p.pop();
    p.background(0);
    drawBackgroundFull();
    p.push();
    p.translate(offsetX, offsetY);
    p.scale(gameScale);
    drawGame(p);
    p.pop();
    drawGroundFull();
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
    bird = new Bird(50 * SCALE_FACTOR, GAME_HEIGHT / 2, 40 * SCALE_FACTOR, 30 * SCALE_FACTOR, birdSprite);
    pipes = [];
    score = 0;
    gameStatus = "playing";
    speedFactor = 1;
    basePipeSpeed = 2 * SCALE_FACTOR;
    baseGroundSpeed = 2;
    groundSpeed = baseGroundSpeed;
    spawnTimer = 0;
    nextPipeDelay = getPipeSettings().delay;

    spawnPipe();
  }

  function drawGame() {
    // Draw bird and pipes in game space
    pipes.forEach((pipe) => pipe.draw(p));
    bird.draw(p, gameStatus);

    updateGame(p);

    if (gameStatus === "gameOver") {
      handleGameOver(p);
    } else {
      // Draw score
      p.fill(255);
      if (flappyFontReady) {
        p.textFont(FLAPPY_FONT);
        p.stroke(0);
        p.strokeWeight(4);
        p.textSize(72);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(score, GAME_WIDTH / 2, 50);
        p.noStroke();
      }
    }
  }

  function updateGame() {
    bird.update(p);
    speedFactor = getSpeedFactor();
    groundSpeed = baseGroundSpeed * speedFactor;

    if (gameStatus === 'gameOver') {
        if (!checkGroundCollision(bird)) {
          bird.update(p); // Keep updating bird's position to make it fall
        }
        handleGameOver(p);
        return;
      }
    
    updateSpawning();

    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].update();

      if (bird.collidesWith(pipes[i])) {
        gameStatus = "gameOver";
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
    }
  }

  function checkGroundCollision(bird) {
    const groundHeight = GAME_HEIGHT * 0.15;
    return bird.y + bird.height >= GAME_HEIGHT - groundHeight;
  }

  function handleGameOver(p) {
    bird.velocity = 0; // Stop bird's movement
    bird.gravity = 4; // Apply gravity to make the bird fall

    p.fill(255);
    if (flappyFontReady) {
      p.textFont(FLAPPY_FONT);
      p.stroke(0);
      p.strokeWeight(4);
      p.textSize(128);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("GAME OVER", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);

      p.textSize(32);
      p.text("SCORE: " + score, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
      p.noStroke();
    }
  }

  function updateLayout() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    const scaleX = p.width / GAME_WIDTH;
    const scaleY = p.height / GAME_HEIGHT;
    gameScale = Math.min(scaleX, scaleY);
    const scaledWidth = GAME_WIDTH * gameScale;
    const scaledHeight = GAME_HEIGHT * gameScale;
    offsetX = (p.width - scaledWidth) / 2;
    offsetY = (p.height - scaledHeight) / 2;
  }

  function ensureFlappyFont() {
    if (flappyFontReady || flappyFontLoading) {
      return;
    }

    if (typeof FontFace === "undefined" || !document.fonts) {
      flappyFontReady = true;
      return;
    }

    flappyFontLoading = true;
    const font = new FontFace(FLAPPY_FONT, `url(${FLAPPY_FONT_URL})`);
    font.load().then(
      (loaded) => {
        document.fonts.add(loaded);
        flappyFontReady = true;
      },
      () => {
        flappyFontReady = true;
      }
    );
  }

  function getViewBounds() {
    const left = -offsetX / gameScale;
    const right = (p.width - offsetX) / gameScale;
    return { left, right };
  }

  function getSpeedFactor() {
    return 1 + Math.floor(score / 500) * 0.15;
  }

  function getPipeSettings() {
    const level = Math.floor(score / 1000);
    const normalGap = 150 * SCALE_FACTOR;
    const narrowGap = 120 * SCALE_FACTOR;
    const minDelay = 850;
    const speedScale = 1 + Math.floor(score / 500) * 0.15;
    const baseDelay = Math.max(2000 / speedScale, minDelay);
    const closeDelay = Math.max(baseDelay * 0.85, minDelay);
    const farDelay = Math.max(baseDelay * 1.15, minDelay + 120);

    if (level === 0) {
      return { gap: normalGap, delay: Math.round(baseDelay) };
    }

    if (score >= 2000) {
      const narrowChance = Math.min(0.75 + Math.floor((score - 2000) / 1000) * 0.05, 0.9);
      if (p.random() < narrowChance) {
        return { gap: narrowGap, delay: Math.round(farDelay) };
      }
      return { gap: normalGap, delay: Math.round(closeDelay) };
    }

    if (level % 2 === 1) {
      return { gap: normalGap, delay: Math.round(closeDelay) };
    }

    return { gap: narrowGap, delay: Math.round(farDelay) };
  }

  function spawnPipe() {
    const settings = getPipeSettings();
    const viewRight = getViewBounds().right;
    const pipeSpawnX = viewRight + 80 * SCALE_FACTOR;
    const minTop = 100 * SCALE_FACTOR;
    const maxTop = 350 * SCALE_FACTOR;
    const targetGapCenter = chooseGapCenter(settings.gap, minTop, maxTop);
    const topHeight = targetGapCenter - settings.gap / 2;
    const pipe = new Pipe(
      pipeSpawnX,
      settings.gap,
      minTop,
      maxTop,
      topPipeSprite,
      bottomPipeSprite,
      52 * SCALE_FACTOR,
      basePipeSpeed,
      topHeight
    );
    pipes.push(pipe);
    lastGapCenter = targetGapCenter;
    nextPipeDelay = settings.delay;
  }

  function updateSpawning() {
    spawnTimer += p.deltaTime;
    while (spawnTimer >= nextPipeDelay) {
      spawnTimer -= nextPipeDelay;
      spawnPipe();
    }
  }

  function chooseGapCenter(gap, minTop, maxTop) {
    const minCenter = minTop + gap / 2;
    const maxCenter = maxTop + gap / 2;
    const range = maxCenter - minCenter;
    const upperRange = [minCenter, minCenter + range * 0.33];
    const middleRange = [minCenter + range * 0.33, minCenter + range * 0.66];
    const lowerRange = [minCenter + range * 0.66, maxCenter];
    const midPoint = (minCenter + maxCenter) / 2;
    const r = p.random();

    if (score >= 2000) {
      const topMax = minCenter + range / 3;
      const bottomMin = minCenter + (2 * range) / 3;

      if (lastGapCenter >= bottomMin) {
        return randomInRange(minCenter, topMax);
      }

      if (lastGapCenter <= topMax) {
        return randomInRange(bottomMin, maxCenter);
      }

      if (r < 0.5) {
        return randomInRange(minCenter, topMax);
      }
      return randomInRange(bottomMin, maxCenter);
    }

    if (lastGapCenter > midPoint) {
      if (r < 0.45) {
        return randomInRange(middleRange[0], middleRange[1]);
      }
      if (r < 0.8) {
        return randomInRange(upperRange[0], upperRange[1]);
      }
      return clamp(lastGapCenter + p.random(0.05, 0.15) * GAME_HEIGHT, minCenter, maxCenter);
    }

    if (r < 0.45) {
      return randomInRange(middleRange[0], middleRange[1]);
    }
    if (r < 0.8) {
      return randomInRange(lowerRange[0], lowerRange[1]);
    }
    return clamp(lastGapCenter - p.random(0.05, 0.15) * GAME_HEIGHT, minCenter, maxCenter);
  }

  function randomInRange(min, max) {
    return p.random(min, max);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function drawBackgroundFull() {
    if (!backgroundSprite) {
      return;
    }

    const scrollSpeed = p.width * 0.00125 * speedFactor;
    backgroundX -= scrollSpeed;
    if (backgroundX <= -p.width) {
      backgroundX = 0;
    }

    const drawWidth = p.width + 1;
    const drawHeight = p.height;
    const drawX = Math.floor(backgroundX);

    p.image(backgroundSprite, drawX, 0, drawWidth, drawHeight);
    p.image(backgroundSprite, drawX + p.width, 0, drawWidth, drawHeight);
  }

  function drawGroundFull() {
    if (!spriteMap) {
      return;
    }

    groundX -= groundSpeed;
    if (groundX <= -groundWidth) {
      groundX += groundWidth;
    }

    const groundDrawWidth = groundWidth * gameScale;
    const groundDrawHeight = 110 * gameScale;
    const groundY = offsetY + gameScale * (GAME_HEIGHT - 25);
    const step = (groundWidth - 5) * gameScale;
    let startX = offsetX + groundX * gameScale;

    while (startX > -step) {
      startX -= step;
    }

    const tiles = Math.ceil((p.width - startX) / step) + 1;

    for (let i = 0; i < tiles; i++) {
      p.image(
        spriteMap,
        startX + i * step,
        groundY,
        groundDrawWidth,
        groundDrawHeight,
        570,
        10,
        groundWidth,
        110
      );
    }
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
    if (this.y > GAME_HEIGHT - this.height) {
      this.y = GAME_HEIGHT - this.height;
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
    return this.y + this.height >= GAME_HEIGHT - groundHeight;
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
    speed,
    topHeight
  ) {
    this.x = x;
    this.width = width;
    this.speed = speed;
    this.topPipeImg = topPipeImg;
    this.bottomPipeImg = bottomPipeImg;
    this.topHeight = typeof topHeight === "number" ? topHeight : pInstance.random(minHeight, maxHeight);
    this.bottomY = this.topHeight + gap;
  }

  draw(p) {
    p.image(this.topPipeImg, this.x, 0, this.width, this.topHeight);
    p.image(
      this.bottomPipeImg,
      this.x,
      this.bottomY,
      this.width,
      GAME_HEIGHT - this.bottomY
    );
  }

  update() {
    this.x -= this.speed * speedFactor;
  }

  isOffScreen() {
    const viewLeft = -offsetX / gameScale;
    return this.x + this.width < viewLeft;
  }

  passed(bird) {
    return bird.x > this.x + this.width;
  }

  getSpeed() {
    return this.speed;
  }
}

const myp5 = new p5(sketch);
