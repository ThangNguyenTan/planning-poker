import React from "react";

interface StatsProps {
  average: number;
  median: number;
  mode: number[];
}

export const Stats = React.memo(({ average, median, mode }: StatsProps) => {
  return (
    <div className="stats-container">
      <div className="stat-item">
        <span className="stat-label">Average</span>
        <span className="stat-value">{average}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Median</span>
        <span className="stat-value">{median}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Mode</span>
        <span className="stat-value">
          {mode.length > 0 ? mode.join(", ") : "-"}
        </span>
      </div>
    </div>
  );
});

Stats.displayName = "Stats";
