export class PianoMidiReader {
  private position = 0;
  private readonly data: DataView;

  constructor(buffer: ArrayBuffer) {
    this.data = new DataView(buffer);
  }

  get pos(): number {
    return this.position;
  }

  set pos(value: number) {
    this.position = value;
  }

  readString(n: number): string {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += String.fromCharCode(this.data.getUint8(this.position++));
    }
    return s;
  }

  readUint32(): number {
    const v = this.data.getUint32(this.position);
    this.position += 4;
    return v;
  }

  readUint16(): number {
    const v = this.data.getUint16(this.position);
    this.position += 2;
    return v;
  }

  readUint8(): number {
    return this.data.getUint8(this.position++);
  }

  readVariable(): number {
    let v = 0;
    let b: number;
    do {
      b = this.readUint8();
      v = (v << 7) | (b & 0x7f);
    } while (b & 0x80);
    return v;
  }

  skip(n: number): void {
    this.position += n;
  }
}
