export interface ClothPointerState {
  isDown: boolean;
  button: number;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  influenceRadius: number;
  cutRadius: number;
}
