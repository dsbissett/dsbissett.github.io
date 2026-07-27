import { Injectable } from '@angular/core';

import { Mat4 } from '../classes/mat4.class';
import { Quat } from '../classes/quat.class';
import { MeshData } from '../interfaces/mesh-data.interface';
import { RenderInstance } from '../interfaces/render-instance.interface';
import { CLEAR_COLOR } from '../constants/toilet-palette.constant';
import { BLOB_ALPHA, BLOB_COLOR, LID_HINGE, SEAT_HINGE } from '../constants/toilet-physics.constant';
import {
  FLOOR_FRAGMENT_SHADER,
  FLOOR_VERTEX_SHADER,
  MESH_FRAGMENT_SHADER,
  MESH_VERTEX_SHADER,
} from '../constants/toilet-shaders.constant';
import { ToiletCameraService } from './toilet-camera.service';

interface DrawObject {
  readonly vao: WebGLVertexArrayObject;
  readonly count: number;
}

interface DynamicObject {
  readonly vao: WebGLVertexArrayObject;
  readonly positionBuffer: WebGLBuffer;
  readonly normalBuffer: WebGLBuffer;
  readonly count: number;
}

const LIGHT_DIR: readonly [number, number, number] = [0.55, 0.85, 0.6];
const IDENTITY = Mat4.identity();

/** Owns the WebGL2 context, shader programs and draw calls for the viewer. */
@Injectable()
export class ToiletRendererService {
  private gl: WebGL2RenderingContext | null = null;
  private meshProgram: WebGLProgram | null = null;
  private floorProgram: WebGLProgram | null = null;
  private toilet: DrawObject | null = null;
  private floor: DrawObject | null = null;
  private seat: DrawObject | null = null;
  private lid: DrawObject | null = null;
  private projectileMeshes: DrawObject[] = [];
  private water: DynamicObject | null = null;
  private blobVao: WebGLVertexArrayObject | null = null;
  private blobBuffers: WebGLBuffer[] = [];
  private blobCount = 0;
  private viewProj = IDENTITY;
  private time = 0;

  public init(canvas: HTMLCanvasElement): boolean {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) {
      return false;
    }
    this.gl = gl;
    this.meshProgram = this.createProgram(gl, MESH_VERTEX_SHADER, MESH_FRAGMENT_SHADER);
    this.floorProgram = this.createProgram(gl, FLOOR_VERTEX_SHADER, FLOOR_FRAGMENT_SHADER);
    if (!this.meshProgram || !this.floorProgram) {
      return false;
    }
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }

  public uploadToilet(mesh: MeshData): void {
    this.toilet = this.createObject(mesh);
  }

  public uploadFloor(mesh: MeshData): void {
    this.floor = this.createObject(mesh);
  }

  public uploadProjectileMeshes(meshes: MeshData[]): void {
    this.projectileMeshes = meshes.map((mesh) => this.createObject(mesh));
  }

  public uploadSeat(mesh: MeshData): void {
    this.seat = this.createObject(mesh);
  }

  public uploadLid(mesh: MeshData): void {
    this.lid = this.createObject(mesh);
  }

  /** (Re)fills the persistent congealed-blob buffers with a freshly extracted isosurface. */
  public uploadBlob(mesh: MeshData): void {
    const gl = this.gl!;
    if (!this.blobVao) {
      this.blobVao = gl.createVertexArray()!;
      gl.bindVertexArray(this.blobVao);
      this.blobBuffers = [this.makeDynamic(gl, 0), this.makeDynamic(gl, 1), this.makeDynamic(gl, 2), gl.createBuffer()!];
      gl.bindVertexArray(null);
    }
    gl.bindVertexArray(this.blobVao);
    this.fill(gl, gl.ARRAY_BUFFER, this.blobBuffers[0], new Float32Array(mesh.positions));
    this.fill(gl, gl.ARRAY_BUFFER, this.blobBuffers[1], new Float32Array(mesh.normals));
    this.fill(gl, gl.ARRAY_BUFFER, this.blobBuffers[2], new Float32Array(mesh.colors));
    this.fill(gl, gl.ELEMENT_ARRAY_BUFFER, this.blobBuffers[3], new Uint32Array(mesh.indices));
    gl.bindVertexArray(null);
    this.blobCount = mesh.indices.length;
  }

  private makeDynamic(gl: WebGL2RenderingContext, location: number): WebGLBuffer {
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    return buffer;
  }

  private fill(gl: WebGL2RenderingContext, target: number, buffer: WebGLBuffer, data: ArrayBufferView): void {
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.DYNAMIC_DRAW);
  }

  public initWater(indices: number[], vertexCount: number): void {
    const gl = this.gl!;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const positionBuffer = this.bindDynamicAttribute(gl, 0, vertexCount);
    const normalBuffer = this.bindDynamicAttribute(gl, 1, vertexCount);
    this.bindAttribute(gl, 2, new Float32Array(vertexCount * 3).fill(1), 3);
    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.water = { vao, positionBuffer, normalBuffer, count: indices.length };
  }

  public render(
    camera: ToiletCameraService,
    width: number,
    height: number,
    instances: RenderInstance[],
    seatAngle: number,
    lidAngle: number,
    time: number,
    waterPositions: Float32Array,
    waterNormals: Float32Array,
    waterColor: readonly [number, number, number],
    waterAlpha: number,
  ): void {
    const gl = this.gl;
    if (!gl) {
      return;
    }
    this.time = time;
    gl.viewport(0, 0, width, height);
    gl.clearColor(CLEAR_COLOR[0], CLEAR_COLOR[1], CLEAR_COLOR[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.viewProj = camera.viewProj(width / Math.max(1, height));

    this.drawFloor(gl);
    this.beginMeshProgram(gl, camera);
    this.drawMesh(gl, this.toilet, IDENTITY, [1, 1, 1], 1, 0);
    this.drawMesh(gl, this.seat, this.hingeModel(SEAT_HINGE, seatAngle), [1, 1, 1], 1, 0);
    this.drawMesh(gl, this.lid, this.hingeModel(LID_HINGE, lidAngle), [1, 1, 1], 1, 0);
    for (const instance of instances) {
      const mesh = this.projectileMeshes[instance.meshIndex];
      this.drawMesh(gl, mesh, instance.model, instance.color, instance.alpha, instance.cracks);
    }
    this.drawBlob(gl);
    this.drawWater(gl, waterPositions, waterNormals, waterColor, waterAlpha);
  }

  private drawBlob(gl: WebGL2RenderingContext): void {
    if (!this.blobVao || this.blobCount === 0) {
      return;
    }
    const program = this.meshProgram!;
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModel'), false, IDENTITY);
    gl.uniform3f(gl.getUniformLocation(program, 'uColor'), BLOB_COLOR[0], BLOB_COLOR[1], BLOB_COLOR[2]);
    gl.uniform1f(gl.getUniformLocation(program, 'uAlpha'), BLOB_ALPHA);
    gl.uniform1f(gl.getUniformLocation(program, 'uCracks'), 0);
    gl.uniform1f(gl.getUniformLocation(program, 'uGel'), 1);
    gl.bindVertexArray(this.blobVao);
    gl.drawElements(gl.TRIANGLES, this.blobCount, gl.UNSIGNED_INT, 0);
  }

  private hingeModel(hinge: readonly [number, number, number], angle: number): Float32Array {
    return Mat4.compose(hinge, Quat.fromAxisAngle(1, 0, 0, angle), [1, 1, 1]);
  }

  public destroy(): void {
    const gl = this.gl;
    if (!gl) {
      return;
    }
    if (this.meshProgram) {
      gl.deleteProgram(this.meshProgram);
    }
    if (this.floorProgram) {
      gl.deleteProgram(this.floorProgram);
    }
    this.gl = null;
    this.toilet = null;
    this.floor = null;
    this.seat = null;
    this.lid = null;
    this.projectileMeshes = [];
    this.water = null;
    this.blobVao = null;
    this.blobBuffers = [];
    this.blobCount = 0;
  }

  private drawFloor(gl: WebGL2RenderingContext): void {
    if (!this.floorProgram || !this.floor) {
      return;
    }
    gl.useProgram(this.floorProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.floorProgram, 'uViewProj'), false, this.viewProj);
    gl.bindVertexArray(this.floor.vao);
    gl.drawElements(gl.TRIANGLES, this.floor.count, gl.UNSIGNED_INT, 0);
  }

  private beginMeshProgram(gl: WebGL2RenderingContext, camera: ToiletCameraService): void {
    const program = this.meshProgram!;
    gl.useProgram(program);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewProj'), false, this.viewProj);
    const eye = camera.eye();
    gl.uniform3f(gl.getUniformLocation(program, 'uCameraPos'), eye[0], eye[1], eye[2]);
    gl.uniform3f(gl.getUniformLocation(program, 'uLightDir'), LIGHT_DIR[0], LIGHT_DIR[1], LIGHT_DIR[2]);
    gl.uniform1f(gl.getUniformLocation(program, 'uTime'), this.time);
  }

  private drawMesh(
    gl: WebGL2RenderingContext,
    object: DrawObject | null,
    model: Float32Array,
    color: readonly [number, number, number],
    alpha: number,
    cracks: number,
  ): void {
    if (!object) {
      return;
    }
    const program = this.meshProgram!;
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModel'), false, model);
    gl.uniform3f(gl.getUniformLocation(program, 'uColor'), color[0], color[1], color[2]);
    gl.uniform1f(gl.getUniformLocation(program, 'uAlpha'), alpha);
    gl.uniform1f(gl.getUniformLocation(program, 'uCracks'), cracks);
    gl.uniform1f(gl.getUniformLocation(program, 'uGel'), 0);
    gl.bindVertexArray(object.vao);
    gl.drawElements(gl.TRIANGLES, object.count, gl.UNSIGNED_INT, 0);
  }

  private drawWater(
    gl: WebGL2RenderingContext,
    positions: Float32Array,
    normals: Float32Array,
    color: readonly [number, number, number],
    alpha: number,
  ): void {
    const water = this.water;
    if (!water) {
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, water.positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
    gl.bindBuffer(gl.ARRAY_BUFFER, water.normalBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, normals);

    const program = this.meshProgram!;
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModel'), false, IDENTITY);
    gl.uniform3f(gl.getUniformLocation(program, 'uColor'), color[0], color[1], color[2]);
    gl.uniform1f(gl.getUniformLocation(program, 'uAlpha'), alpha);
    gl.uniform1f(gl.getUniformLocation(program, 'uCracks'), 0);
    gl.uniform1f(gl.getUniformLocation(program, 'uGel'), 0);
    gl.depthMask(false);
    gl.bindVertexArray(water.vao);
    gl.drawElements(gl.TRIANGLES, water.count, gl.UNSIGNED_INT, 0);
    gl.depthMask(true);
  }

  private createObject(mesh: MeshData): DrawObject {
    const gl = this.gl!;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    this.bindAttribute(gl, 0, new Float32Array(mesh.positions), 3);
    this.bindAttribute(gl, 1, new Float32Array(mesh.normals), 3);
    this.bindAttribute(gl, 2, new Float32Array(mesh.colors), 3);
    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.indices), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: mesh.indices.length };
  }

  private bindAttribute(
    gl: WebGL2RenderingContext,
    location: number,
    data: Float32Array,
    size: number,
  ): void {
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }

  private bindDynamicAttribute(
    gl: WebGL2RenderingContext,
    location: number,
    vertexCount: number,
  ): WebGLBuffer {
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexCount * 3 * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    return buffer;
  }

  private createProgram(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string,
  ): WebGLProgram | null {
    const vertex = this.compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) {
      return null;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPos');
    gl.bindAttribLocation(program, 1, 'aNormal');
    gl.bindAttribLocation(program, 2, 'aColor');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return null;
    }
    return program;
  }

  private compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string,
  ): WebGLShader | null {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return null;
    }
    return shader;
  }
}
