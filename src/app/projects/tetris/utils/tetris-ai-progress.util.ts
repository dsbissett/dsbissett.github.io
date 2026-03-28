export function appendWindow(values: number[], value: number, maxSize: number): number[] {
  const next = [...values, value];
  return next.length > maxSize ? next.slice(next.length - maxSize) : next;
}

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
