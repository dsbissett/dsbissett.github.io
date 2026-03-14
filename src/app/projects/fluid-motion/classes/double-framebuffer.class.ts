import { SingleFramebuffer } from './single-framebuffer.class';

export class DoubleFramebuffer {
  public constructor(
    private primary: SingleFramebuffer,
    private secondary: SingleFramebuffer
  ) {}

  public get read(): SingleFramebuffer {
    return this.primary;
  }

  public swap(): void {
    const previousRead = this.primary;
    this.primary = this.secondary;
    this.secondary = previousRead;
  }

  public get write(): SingleFramebuffer {
    return this.secondary;
  }
}
