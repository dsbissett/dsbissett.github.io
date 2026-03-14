import { ClothPoint } from '../classes/cloth-point.class';

export interface ClothScene {
  points: ClothPoint[];
  spacing: number;
  tearDistance: number;
}
