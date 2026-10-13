import { QuackMood } from '@/modules/quack/domain/quack';

export type Profile = {
  username: string;
  name: string;
  bio: string | null;
  defaultMood: QuackMood | null;
};
