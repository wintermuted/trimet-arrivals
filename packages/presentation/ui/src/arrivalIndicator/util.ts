export function timeDiff(base: number, compare: number) {
  const totalSeconds = Math.trunc((base - compare) / 1000);
  const minutes = Math.trunc(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { seconds, minutes };
}
