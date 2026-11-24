export const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;
export type QuackMood = (typeof QUACK_MOODS)[number];

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 10;
export const POLL_OPTION_MAX_LENGTH = 50;

export type PollOption = { id: string; text: string; votes: number };

// myOptionId is the viewer's own vote, so a Poll is always read for someone.
export type Poll = { options: PollOption[]; myOptionId: string | null };

// What the live stream pushes: counts only, never who voted.
export type PollCounts = {
  quackId: string;
  options: Pick<PollOption, 'id' | 'votes'>[];
};

// A quack's likes as one viewer sees them (ADR 0005).
export type Likes = { likeCount: number; likedByMe: boolean };

export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export type Quack = {
  id: string;
  text: string;
  mood: QuackMood | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  poll: Poll | null;
  parentId: string | null;
  // A tombstone: content wiped, row kept for its replies (ADR 0004).
  deleted: boolean;
  // Live replies only.
  replyCount: number;
  // For a reply: who it answers; username null when that quack was deleted.
  replyTo: { username: string | null } | null;
};

// The facts the service checks before acting on a quack.
export type QuackRef = {
  userId: string;
  parentId: string | null;
  deleted: boolean;
};
