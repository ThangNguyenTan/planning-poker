export type VoteValue = number | "?" | "☕";

export interface Participant {
  id: string;
  name: string;
  vote?: VoteValue;
}

export interface SessionState {
  participants: Participant[];
  isRevealed: boolean;
  currentUser: Participant | null;
}
