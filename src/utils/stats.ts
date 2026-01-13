import type { VoteValue } from "../types";

export const calculateStats = (votes: VoteValue[]) => {
  const numericVotes = votes.filter((v): v is number => typeof v === "number");

  if (numericVotes.length === 0) {
    return { average: 0, median: 0, mode: [] as number[] };
  }

  // Average
  const sum = numericVotes.reduce((acc, curr) => acc + curr, 0);
  const average = Number((sum / numericVotes.length).toFixed(1));

  // Median
  const sorted = [...numericVotes].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0
      ? sorted[mid]
      : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));

  // Mode
  const counts: Record<number, number> = {};
  let maxCount = 0;
  numericVotes.forEach((v) => {
    counts[v] = (counts[v] || 0) + 1;
    if (counts[v] > maxCount) maxCount = counts[v];
  });

  const mode = Object.entries(counts)
    .filter(([, count]) => count === maxCount)
    .map(([val]) => Number(val));

  return { average, median, mode };
};
