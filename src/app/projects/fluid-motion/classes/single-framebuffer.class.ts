export class SingleFramebuffer {
  public constructor(
    public readonly texture: WebGLTexture,
    public readonly framebuffer: WebGLFramebuffer,
    public readonly textureUnit: number
  ) {}
}
