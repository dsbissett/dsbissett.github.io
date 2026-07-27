/** Phong-lit mesh — vertex stage. uModel places instanced parts; vLocal carries object-space position for cracks. */
export const MESH_VERTEX_SHADER = `#version 300 es
in vec3 aPos;
in vec3 aNormal;
in vec3 aColor;
uniform mat4 uViewProj;
uniform mat4 uModel;
out vec3 vNormal;
out vec3 vColor;
out vec3 vWorld;
out vec3 vLocal;
void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  vWorld = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  vColor = aColor;
  vLocal = aPos;
  gl_Position = uViewProj * world;
}`;

/**
 * Two-sided studio lighting with a teal fresnel rim. When uCracks>0 the surface is
 * scored with object-space cellular cracks + mottling so mud reads as dried clay.
 */
export const MESH_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
in vec3 vWorld;
in vec3 vLocal;
uniform vec3 uCameraPos;
uniform vec3 uLightDir;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uCracks;
uniform float uGel;
out vec4 frag;

vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453);
}

float hash1(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

// Distance between the two nearest Worley feature points — small along cell borders (cracks).
float crackEdge(vec3 p) {
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float f1 = 9.0;
  float f2 = 9.0;
  for (int k = -1; k <= 1; k++) {
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec3 g = vec3(float(i), float(j), float(k));
        vec3 o = hash3(ip + g);
        vec3 r = g + o - fp;
        float d = dot(r, r);
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
      }
    }
  }
  return sqrt(f2) - sqrt(f1);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCameraPos - vWorld);
  if (dot(N, V) < 0.0) {
    N = -N;
  }
  vec3 L = normalize(uLightDir);
  float diff = max(dot(N, L), 0.0);
  vec3 fillDir = normalize(vec3(-L.x, 0.25, -L.z));
  float fill = max(dot(N, fillDir), 0.0) * 0.32;
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 54.0) * 0.55;
  float ambient = 0.34;

  vec3 base = vColor * uColor;
  if (uCracks > 0.5) {
    float scale = uGel > 0.5 ? 9.0 : 6.5;
    float edge = crackEdge(vLocal * scale);
    float crack = 1.0 - smoothstep(0.0, 0.07, edge);
    float mottle = 0.8 + 0.4 * hash1(floor(vLocal * 13.0));
    base *= mottle;
    base = mix(base, base * 0.18, crack);
    spec *= (1.0 - crack) * 0.5;
  }

  vec3 col;
  if (uGel > 0.5) {
    // Manure pile: soft matte brown with a faint moist sheen — no cracks, no metallic gloss.
    col = base * (ambient + diff * 0.9 + fill) + vec3(spec) * 0.18;
  } else {
    col = base * (ambient + diff * 0.82 + fill) + vec3(spec);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.16;
    col += rim * vec3(0.35, 0.95, 0.95);
  }

  frag = vec4(col, uAlpha);
}`;

/** Infinite-looking grid floor — vertex stage. */
export const FLOOR_VERTEX_SHADER = `#version 300 es
in vec3 aPos;
uniform mat4 uViewProj;
out vec3 vWorld;
void main() {
  vWorld = aPos;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

/** Neon grid lines with radial fade into the deep-space background. */
export const FLOOR_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vWorld;
out vec4 frag;
void main() {
  vec2 p = vWorld.xz / 0.5;
  vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  float dist = length(vWorld.xz);
  float fade = smoothstep(11.0, 1.5, dist);
  vec3 lineCol = vec3(0.0, 1.0, 0.96);
  vec3 base = vec3(0.03, 0.05, 0.1);
  vec3 col = mix(base, lineCol, line) * fade;
  float alpha = max(line * fade * 0.55, fade * 0.12);
  frag = vec4(col, alpha);
}`;
