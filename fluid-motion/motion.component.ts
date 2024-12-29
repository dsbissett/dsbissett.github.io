import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

interface FormatInfo {
  internalFormat: number;
  format: number;
}

class GLProgram {
  uniforms: { [key: string]: WebGLUniformLocation } = {};
  program: WebGLProgram;
  private gl: WebGLRenderingContext;

  constructor(
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ) {
    this.gl = gl;
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.program);
    }

    const uniformCount = gl.getProgramParameter(
      this.program,
      gl.ACTIVE_UNIFORMS
    );
    for (let i = 0; i < uniformCount; i++) {
      const uniformName = gl.getActiveUniform(this.program, i)!.name;
      this.uniforms[uniformName] = gl.getUniformLocation(
        this.program,
        uniformName
      )!;
    }
  }

  bind() {
    this.gl.useProgram(this.program);
  }
}

@Component({
  selector: 'app-motion',
  standalone: true,
  template: `
    <div id="container">
      <canvas #canvas></canvas>
    </div>
  `,
  styleUrls: ['./motion.component.scss'],
})
export class MotionComponent implements OnInit {
  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private config = {
    TEXTURE_DOWNSAMPLE: 1,
    DENSITY_DISSIPATION: 0.98,
    VELOCITY_DISSIPATION: 0.99,
    PRESSURE_DISSIPATION: 0.1,
    PRESSURE_ITERATIONS: 150,
    CURL: 48,
    SPLAT_RADIUS: 0.004,
  };

  private pointers: any[] = [];
  private splatStack: any[] = [];
  private gl!: WebGLRenderingContext;
  private ext: any;

  // Will hold all the GL programs and framebuffers
  private programs: any = {};
  private fb: any = {};

  private lastTime: number = Date.now();
  private textureWidth!: number;
  private textureHeight!: number;

  private readonly R16F = 0x822d;
  private readonly RG16F = 0x822f;
  private readonly RGBA16F = 0x881a;
  private readonly RG = 0x8227;

  private baseVertexShaderSource = `
    precision highp float;
    precision mediump sampler2D;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  private clearShaderSource = `
    precision highp float;
    precision mediump sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
  `;

  private displayShaderSource = `
    precision highp float;
    precision mediump sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
  `;

  private splatShaderSource = `
    precision highp float;
    precision mediump sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
  `;

  private advectionShaderSource = `
    precision highp float;
    precision mediump sampler2D;

    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform float dt;
    uniform float dissipation;

    void main () {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      gl_FragColor = dissipation * texture2D(uSource, coord);
    }
  `;

  private divergenceShaderSource = `
    precision highp float;
    precision mediump sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
  `;

  private curlShaderSource = `
    precision highp float;
    precision mediump sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      float vorticity = R - L - T + B;
      gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);
    }
  `;

  private vorticityShaderSource = `
    precision highp float;
    precision mediump sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = vec2(abs(T) - abs(B), abs(R) - abs(L));
      force *= 1.0 / length(force + 0.00001) * curl * C;
      vec2 vel = texture2D(uVelocity, vUv).xy;
      gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
    }
  `;

  private pressureShaderSource = `
    precision highp float;
    precision mediump sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float C = texture2D(uPressure, vUv).x;
      float divergence = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + B + T - divergence) * 0.25;
      gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
  `;

  private gradientSubtractShaderSource = `
    precision highp float;
    precision mediump sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity.xy -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `;

  private blit!: (destination: WebGLFramebuffer | null) => void;

  ngOnInit() {
    this.initWebGL();
    this.initPointers();
    this.initEventListeners();
    this.multipleSplats(parseInt((Math.random() * 20).toString()) + 5);
    this.update();
  }

  private initWebGL() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const params = {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
    };
    this.gl = (canvas.getContext('webgl', params) ||
      canvas.getContext('experimental-webgl', params)) as WebGLRenderingContext;

    const { gl, ext } = this.getWebGLContext(canvas);
    this.gl = gl;
    this.ext = ext;

    this.initFramebuffers();
    this.initShaders();
    this.initBlit();
  }

  private initBlit() {
    this.blit = (() => {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
        this.gl.STATIC_DRAW
      );
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.gl.createBuffer());
      this.gl.bufferData(
        this.gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array([0, 1, 2, 0, 2, 3]),
        this.gl.STATIC_DRAW
      );
      this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(0);

      return (destination: WebGLFramebuffer | null) => {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, destination);
        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
      };
    })();
  }

  private getWebGLContext(canvas: HTMLCanvasElement) {
    const params = {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
    };
    const gl2 = canvas.getContext('webgl2', params);
    const isWebGL2 = !!gl2;
    const gl = (gl2 ||
      canvas.getContext('webgl', params)) as WebGLRenderingContext;

    let halfFloat;
    let supportLinearFiltering;
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
      halfFloat = { HALF_FLOAT_OES: 0x140b }; // WebGL2's HALF_FLOAT constant
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
    }

    const RGBA16F = isWebGL2 ? 0x881a : gl.RGBA;
    const RG16F = isWebGL2 ? 0x822f : gl.RGBA;
    const R16F = isWebGL2 ? 0x822d : gl.RGBA;
    const RED = isWebGL2 ? 0x1903 : gl.RGBA;
    const RG = isWebGL2 ? 0x8227 : gl.RGBA;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2
      ? 0x140b
      : halfFloat?.HALF_FLOAT_OES ?? gl.FLOAT;
    const formatRGBA = this.getSupportedFormat(
      gl,
      RGBA16F,
      gl.RGBA,
      halfFloatTexType
    );
    const formatRG = this.getSupportedFormat(gl, RG16F, RG, halfFloatTexType);
    const formatR = this.getSupportedFormat(gl, R16F, RED, halfFloatTexType);

    return {
      gl,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering,
      },
    };
  }

  private getSupportedFormat(
    gl: WebGLRenderingContext,
    internalFormat: number,
    format: number,
    type: number
  ): FormatInfo | null {
    if (!this.supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case this.R16F:
          return this.getSupportedFormat(gl, this.RG16F, this.RG, type);
        case this.RG16F:
          return this.getSupportedFormat(gl, this.RGBA16F, gl.RGBA, type);
        default:
          return null;
      }
    }
    return { internalFormat, format };
  }

  private supportRenderTextureFormat(
    gl: WebGLRenderingContext,
    internalFormat: number,
    format: number,
    type: number
  ) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      4,
      4,
      0,
      format,
      type,
      null
    );

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  private initPointers() {
    const pointer = {
      id: -1,
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      down: false,
      moved: false,
      color: [30, 0, 300],
    };
    this.pointers.push(pointer);
  }

  private initEventListeners() {
    const canvas = this.canvasRef.nativeElement;

    canvas.addEventListener('mousemove', e => {
      this.pointers[0].moved = this.pointers[0].down;
      this.pointers[0].dx = (e.offsetX - this.pointers[0].x) * 10.0;
      this.pointers[0].dy = (e.offsetY - this.pointers[0].y) * 10.0;
      this.pointers[0].x = e.offsetX;
      this.pointers[0].y = e.offsetY;
    });

    canvas.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        e.preventDefault();
        const touches = e.targetTouches;
        for (let i = 0; i < touches.length; i++) {
          let pointer = this.pointers[i];
          pointer.moved = pointer.down;
          pointer.dx = (touches[i].pageX - pointer.x) * 10.0;
          pointer.dy = (touches[i].pageY - pointer.y) * 10.0;
          pointer.x = touches[i].pageX;
          pointer.y = touches[i].pageY;
        }
      },
      false
    );

    canvas.addEventListener('mousedown', () => {
      this.pointers[0].down = true;
    });

    canvas.addEventListener('mousemove', () => {
      if (this.pointers[0].down) {
        this.pointers[0].color = [
          Math.random() * 15 + 0.2,
          Math.random() * 15 + 0.2,
          Math.random() * 15 + 0.2,
        ];
      }
    });

    // Touch start
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      const touches = e.targetTouches;
      for (let i = 0; i < touches.length; i++) {
        if (i >= this.pointers.length) {
          this.pointers.push({
            id: -1,
            x: 0,
            y: 0,
            dx: 0,
            dy: 0,
            down: false,
            moved: false,
            color: [30, 0, 300],
          });
        }

        this.pointers[i].id = touches[i].identifier;
        this.pointers[i].down = true;
        this.pointers[i].x = touches[i].pageX;
        this.pointers[i].y = touches[i].pageY;
        this.pointers[i].color = [
          Math.random() * 10 + 1,
          Math.random() * 10 + 1,
          Math.random() * 10 + 1,
        ];
      }
    });

    // Mouse leave
    window.addEventListener('mouseleave', () => {
      this.pointers[0].down = false;
    });

    // Touch end
    window.addEventListener('touchend', (e: TouchEvent) => {
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        for (let j = 0; j < this.pointers.length; j++) {
          if (touches[i].identifier === this.pointers[j].id) {
            this.pointers[j].down = false;
          }
        }
      }
    });
  }

  private update() {
    this.resizeCanvas();

    const dt = Math.min((Date.now() - this.lastTime) / 1000, 0.016);
    this.lastTime = Date.now();

    this.gl.viewport(0, 0, this.textureWidth, this.textureHeight);

    if (this.splatStack.length > 0) {
      this.multipleSplats(this.splatStack.pop());
    }

    // Advection
    this.programs.advection.bind();
    this.gl.uniform2f(
      this.programs.advection.uniforms.texelSize,
      1.0 / this.textureWidth,
      1.0 / this.textureHeight
    );
    this.gl.uniform1i(
      this.programs.advection.uniforms.uVelocity,
      this.fb.velocity.read[2]
    );
    this.gl.uniform1i(
      this.programs.advection.uniforms.uSource,
      this.fb.velocity.read[2]
    );
    this.gl.uniform1f(this.programs.advection.uniforms.dt, dt);
    this.gl.uniform1f(
      this.programs.advection.uniforms.dissipation,
      this.config.VELOCITY_DISSIPATION
    );
    this.blit(this.fb.velocity.write[1]);
    this.fb.velocity.swap();

    this.gl.uniform1i(
      this.programs.advection.uniforms.uVelocity,
      this.fb.velocity.read[2]
    );
    this.gl.uniform1i(
      this.programs.advection.uniforms.uSource,
      this.fb.density.read[2]
    );
    this.gl.uniform1f(
      this.programs.advection.uniforms.dissipation,
      this.config.DENSITY_DISSIPATION
    );
    this.blit(this.fb.density.write[1]);
    this.fb.density.swap();

    // Handle pointers
    for (let i = 0; i < this.pointers.length; i++) {
      const pointer = this.pointers[i];
      if (pointer.moved) {
        this.splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color);
        pointer.moved = false;
      }
    }

    // Curl
    this.programs.curl.bind();
    this.gl.uniform2f(
      this.programs.curl.uniforms.texelSize,
      1.0 / this.textureWidth,
      1.0 / this.textureHeight
    );
    this.gl.uniform1i(
      this.programs.curl.uniforms.uVelocity,
      this.fb.velocity.read[2]
    );
    this.blit(this.fb.curl[1]);

    // Vorticity
    this.programs.vorticity.bind();
    this.gl.uniform2f(
      this.programs.vorticity.uniforms.texelSize,
      1.0 / this.textureWidth,
      1.0 / this.textureHeight
    );
    this.gl.uniform1i(
      this.programs.vorticity.uniforms.uVelocity,
      this.fb.velocity.read[2]
    );
    this.gl.uniform1i(this.programs.vorticity.uniforms.uCurl, this.fb.curl[2]);
    this.gl.uniform1f(this.programs.vorticity.uniforms.curl, this.config.CURL);
    this.gl.uniform1f(this.programs.vorticity.uniforms.dt, dt);
    this.blit(this.fb.velocity.write[1]);
    this.fb.velocity.swap();

    // Divergence
    this.programs.divergence.bind();
    this.gl.uniform2f(
      this.programs.divergence.uniforms.texelSize,
      1.0 / this.textureWidth,
      1.0 / this.textureHeight
    );
    this.gl.uniform1i(
      this.programs.divergence.uniforms.uVelocity,
      this.fb.velocity.read[2]
    );
    this.blit(this.fb.divergence[1]);

    // Clear
    this.programs.clear.bind();
    let pressureTexId = this.fb.pressure.read[2];
    this.gl.activeTexture(this.gl.TEXTURE0 + pressureTexId);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.fb.pressure.read[0]);
    this.gl.uniform1i(this.programs.clear.uniforms.uTexture, pressureTexId);
    this.gl.uniform1f(
      this.programs.clear.uniforms.value,
      this.config.PRESSURE_DISSIPATION
    );
    this.blit(this.fb.pressure.write[1]);
    this.fb.pressure.swap();

    // Pressure
    this.programs.pressure.bind();
    this.gl.uniform2f(
      this.programs.pressure.uniforms.texelSize,
      1.0 / this.textureWidth,
      1.0 / this.textureHeight
    );
    this.gl.uniform1i(
      this.programs.pressure.uniforms.uDivergence,
      this.fb.divergence[2]
    );
    pressureTexId = this.fb.pressure.read[2];
    this.gl.uniform1i(this.programs.pressure.uniforms.uPressure, pressureTexId);
    this.gl.activeTexture(this.gl.TEXTURE0 + pressureTexId);
    for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.fb.pressure.read[0]);
      this.blit(this.fb.pressure.write[1]);
      this.fb.pressure.swap();
    }

    // Gradient subtract
    this.programs.gradientSubtract.bind();
    this.gl.uniform2f(
      this.programs.gradientSubtract.uniforms.texelSize,
      1.0 / this.textureWidth,
      1.0 / this.textureHeight
    );
    this.gl.uniform1i(
      this.programs.gradientSubtract.uniforms.uPressure,
      this.fb.pressure.read[2]
    );
    this.gl.uniform1i(
      this.programs.gradientSubtract.uniforms.uVelocity,
      this.fb.velocity.read[2]
    );
    this.blit(this.fb.velocity.write[1]);
    this.fb.velocity.swap();

    // Display
    this.gl.viewport(
      0,
      0,
      this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight
    );
    this.programs.display.bind();
    this.gl.uniform1i(
      this.programs.display.uniforms.uTexture,
      this.fb.density.read[2]
    );
    this.blit(null);

    requestAnimationFrame(() => this.update());
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    if (
      canvas.width !== canvas.clientWidth ||
      canvas.height !== canvas.clientHeight
    ) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      this.initFramebuffers();
    }
  }

  private multipleSplats(amount: number) {
    for (let i = 0; i < amount; i++) {
      const color = [
        Math.random() * 10,
        Math.random() * 10,
        Math.random() * 10,
      ];
      const x = this.canvasRef.nativeElement.width * Math.random();
      const y = this.canvasRef.nativeElement.height * Math.random();
      const dx = 1000 * (Math.random() - 0.5);
      const dy = 1000 * (Math.random() - 0.5);
      this.splat(x, y, dx, dy, color);
    }
  }

  private splat(x: number, y: number, dx: number, dy: number, color: number[]) {
    // Velocity splat
    this.programs.splat.bind();
    this.gl.uniform1i(
      this.programs.splat.uniforms.uTarget,
      this.fb.velocity.read[2]
    );
    this.gl.uniform1f(
      this.programs.splat.uniforms.aspectRatio,
      this.canvasRef.nativeElement.width / this.canvasRef.nativeElement.height
    );
    this.gl.uniform2f(
      this.programs.splat.uniforms.point,
      x / this.canvasRef.nativeElement.width,
      1.0 - y / this.canvasRef.nativeElement.height
    );
    this.gl.uniform3f(this.programs.splat.uniforms.color, dx, -dy, 1.0);
    this.gl.uniform1f(
      this.programs.splat.uniforms.radius,
      this.config.SPLAT_RADIUS
    );
    this.blit(this.fb.velocity.write[1]);
    this.fb.velocity.swap();

    // Density splat - reduce the 0.3 scaling factor to make it less bright
    this.gl.uniform1i(
      this.programs.splat.uniforms.uTarget,
      this.fb.density.read[2]
    );
    this.gl.uniform3f(
      this.programs.splat.uniforms.color,
      color[0] * 0.02,
      color[1] * 0.02,
      color[2] * 0.02
    );
    this.blit(this.fb.density.write[1]);
    this.fb.density.swap();
  }

  private initFramebuffers() {
    this.textureWidth =
      this.gl.drawingBufferWidth >> this.config.TEXTURE_DOWNSAMPLE;
    this.textureHeight =
      this.gl.drawingBufferHeight >> this.config.TEXTURE_DOWNSAMPLE;

    const texType = this.ext.halfFloatTexType;
    const rgba = this.ext.formatRGBA;
    const rg = this.ext.formatRG;
    const r = this.ext.formatR;

    this.fb.density = this.createDoubleFBO(
      2,
      this.textureWidth,
      this.textureHeight,
      rgba.internalFormat,
      rgba.format,
      texType,
      this.ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST
    );
    this.fb.velocity = this.createDoubleFBO(
      0,
      this.textureWidth,
      this.textureHeight,
      rg.internalFormat,
      rg.format,
      texType,
      this.ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST
    );
    this.fb.divergence = this.createFBO(
      4,
      this.textureWidth,
      this.textureHeight,
      r.internalFormat,
      r.format,
      texType,
      this.gl.NEAREST
    );
    this.fb.curl = this.createFBO(
      5,
      this.textureWidth,
      this.textureHeight,
      r.internalFormat,
      r.format,
      texType,
      this.gl.NEAREST
    );
    this.fb.pressure = this.createDoubleFBO(
      6,
      this.textureWidth,
      this.textureHeight,
      r.internalFormat,
      r.format,
      texType,
      this.gl.NEAREST
    );
  }

  private createFBO(
    texId: number,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number
  ) {
    this.gl.activeTexture(this.gl.TEXTURE0 + texId);
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      param
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      param
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE
    );
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      internalFormat,
      w,
      h,
      0,
      format,
      type,
      null
    );

    const fbo = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      texture,
      0
    );
    this.gl.viewport(0, 0, w, h);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    return [texture, fbo, texId];
  }

  private createDoubleFBO(
    texId: number,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number
  ) {
    let fbo1 = this.createFBO(texId, w, h, internalFormat, format, type, param);
    let fbo2 = this.createFBO(
      texId + 1,
      w,
      h,
      internalFormat,
      format,
      type,
      param
    );

    return {
      get read() {
        return fbo1;
      },
      get write() {
        return fbo2;
      },
      swap() {
        const temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  }

  private initShaders() {
    const baseVertexShader = this.compileShader(
      this.gl.VERTEX_SHADER,
      this.baseVertexShaderSource
    );
    const clearShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      this.clearShaderSource
    );
    const displayShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      this.displayShaderSource
    );
    const splatShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      this.splatShaderSource
    );
    const advectionShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      this.advectionShaderSource
    );
    const divergenceShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      this.divergenceShaderSource
    );
    const curlShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      this.curlShaderSource
    );
    const vorticityShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      this.vorticityShaderSource
    );
    const pressureShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      this.pressureShaderSource
    );
    const gradientSubtractShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      this.gradientSubtractShaderSource
    );

    this.programs.clear = new GLProgram(this.gl, baseVertexShader, clearShader);
    this.programs.display = new GLProgram(
      this.gl,
      baseVertexShader,
      displayShader
    );
    this.programs.splat = new GLProgram(this.gl, baseVertexShader, splatShader);
    this.programs.advection = new GLProgram(
      this.gl,
      baseVertexShader,
      advectionShader
    );
    this.programs.divergence = new GLProgram(
      this.gl,
      baseVertexShader,
      divergenceShader
    );
    this.programs.curl = new GLProgram(this.gl, baseVertexShader, curlShader);
    this.programs.vorticity = new GLProgram(
      this.gl,
      baseVertexShader,
      vorticityShader
    );
    this.programs.pressure = new GLProgram(
      this.gl,
      baseVertexShader,
      pressureShader
    );
    this.programs.gradientSubtract = new GLProgram(
      this.gl,
      baseVertexShader,
      gradientSubtractShader
    );
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;

    this.gl.shaderSource(shader, source);

    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw this.gl.getShaderInfoLog(shader);
    }

    return shader;
  }
}
