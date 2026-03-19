export interface HistoricalRanking {
  rankLabel: string;
  dateLabel: string;
  spreadLabel: string;
  isCurrent?: boolean;
  isTightest?: boolean;
}

export const HISTORICAL_RANKINGS: HistoricalRanking[] = [
  { rankLabel: "#13", dateLabel: "Dec 1, 117", spreadLabel: "81.9°" },
  { rankLabel: "#3", dateLabel: "Jan 24, 449", spreadLabel: "57.7°" },
  { rankLabel: "#4", dateLabel: "Jan 26, 628", spreadLabel: "65.1°" },
  { rankLabel: "#11", dateLabel: "Feb 6, 949", spreadLabel: "80.0°" },
  { rankLabel: "#5", dateLabel: "Jul 4, 987", spreadLabel: "66.1°" },
  { rankLabel: "#9", dateLabel: "Jun 13, 989", spreadLabel: "75.6°" },
  { rankLabel: "#1", dateLabel: "Apr 18, 1128", spreadLabel: "40.7°", isTightest: true },
  { rankLabel: "#7", dateLabel: "Sep 8, 1166", spreadLabel: "72.8°" },
  { rankLabel: "#2", dateLabel: "Apr 23, 1307", spreadLabel: "46.8°" },
  { rankLabel: "#15", dateLabel: "Jun 9, 1817", spreadLabel: "82.9°" },
  { rankLabel: "#6", dateLabel: "May 19, 2161", spreadLabel: "68.8°", isCurrent: true },
  { rankLabel: "#10", dateLabel: "Nov 8, 2176", spreadLabel: "77.5°" },
  { rankLabel: "#12", dateLabel: "Sep 30, 2851", spreadLabel: "81.7°" },
  { rankLabel: "#14", dateLabel: "Jan 7, 2892", spreadLabel: "82.7°" },
  { rankLabel: "#8", dateLabel: "Jul 22, 2992", spreadLabel: "73.0°" },
];
