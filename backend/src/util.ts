export function shuffle<T>(array: T[]): T[] {
  const length = array.length;

  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    const temp = array[i]!;
    array[i] = array[j]!;
    array[j] = temp;
  }

  return array;
}
