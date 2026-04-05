import { Injectable } from '@angular/core';

import { FluidMotionShaderSources } from '../interfaces/fluid-motion-shader-sources.interface';

@Injectable()
export class FluidMotionShaderSourceService {
  public getSources(): FluidMotionShaderSources {
    return {
      advection: `
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
      `,
      baseVertex: `
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
      `,
      clear: `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
        void main () {
          gl_FragColor = value * texture2D(uTexture, vUv);
        }
      `,
      curl: `
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
      `,
      display: `
        precision highp float;
        precision mediump sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform vec2 uResolution;
        uniform float uTime;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main () {
          vec2 screenUv = gl_FragCoord.xy / uResolution;
          vec3 ink = texture2D(uTexture, vUv).rgb;
          float peak = max(max(ink.r, ink.g), ink.b);
          float energy = clamp(peak, 0.0, 1.35);
          vec3 normalizedInk = peak > 0.0001 ? ink / peak : vec3(0.0);
          vec2 centered = vUv - 0.5;
          float vignette = smoothstep(0.86, 0.1, dot(centered, centered) * 1.7);
          float flow = 0.5 + 0.5 * sin(vUv.x * 8.5 - vUv.y * 6.0 + uTime * 0.24);
          vec3 background = mix(
            vec3(0.02, 0.05, 0.11),
            vec3(0.18, 0.03, 0.16),
            vUv.y * 0.72 + flow * 0.18
          );
          background += 0.08 * vec3(0.0, 0.72, 1.0) * exp(-7.0 * distance(vUv, vec2(0.2, 0.22)));
          background += 0.06 * vec3(1.0, 0.34, 0.28) * exp(-9.0 * distance(vUv, vec2(0.82, 0.78)));

          float scanline = sin(screenUv.y * uResolution.y * 0.09 + uTime * 0.35) * 0.012;
          float sparkle = (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.03;
          vec3 glow = normalizedInk * energy * (0.32 + 0.4 * flow);
          vec3 color = background * vignette + ink * 0.94 + glow;
          color += normalizedInk * energy * energy * 0.12;
          color += vec3(scanline * 0.35);
          color += normalizedInk * sparkle * 0.8;
          color = 1.0 - exp(-color * 1.08);
          color = pow(color, vec3(0.97));

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      divergence: `
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
      `,
      gradientSubtract: `
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
      `,
      pressure: `
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
          float divergence = texture2D(uDivergence, vUv).x;
          float pressure = (L + R + B + T - divergence) * 0.25;
          gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
      `,
      splat: `
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
      `,
      vorticity: `
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
      `,
    };
  }
}
