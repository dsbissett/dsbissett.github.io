export const VOLUMETRIC_TEXTURES_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_pos;

void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const VOLUMETRIC_TEXTURES_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp sampler3D;

uniform sampler3D u_vol;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

out vec4 fragColor;

#define STEPS 40.0
#define SOFTNESS 0.001

vec3 tonemap_aces(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

const mat3 GOLDEN_ROT3 = mat3(
  -0.571464913, +0.814921382, +0.096597072,
  -0.278044873, -0.303026659, +0.911518454,
  +0.772087367, +0.494042493, +0.399753815
);

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 fit = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  vec3 ray = normalize(vec3(fit, 1));
  vec3 pos = vec3(u_mouse.xy / u_resolution - 0.5, u_time);
  float z = 3.0;

  vec3 col = vec3(0);
  for (float i = 0.0; i < STEPS; i++) {
    float vol = texture(u_vol, GOLDEN_ROT3 * pos).r - 0.2 + 0.1 * length(pos.xy);
    float stepLen = SOFTNESS + 0.25 * abs(vol);
    z += stepLen;
    pos += ray * stepLen;
    float gyroid = 3.0 * dot(sin(pos * 7.0), cos(pos.yzx * 4.0));
    col += (sin(gyroid + vec3(0, 1, 2)) + 1.0) / stepLen / z;
  }

  col *= 0.0004;
  col = tonemap_aces(col);
  fragColor = vec4(col, 1.0);
}
`;
