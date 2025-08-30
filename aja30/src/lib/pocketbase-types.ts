// Auto-generated placeholder. Replace with the official export from PocketBase UI when available.
// This file types the known collections for TypedPocketBase usage.

import type PocketBase from 'pocketbase';
import type { RecordModel, RecordService } from 'pocketbase';

export type BaseSystemFields<Texpand = unknown> = {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
  expand?: Texpand;
};

export type AuthSystemFields<Texpand = unknown> = BaseSystemFields<Texpand> & {
  email?: string;
  emailVisibility?: boolean;
  username: string;
  verified: boolean;
};

// Collections
export type Collections = {
  song_choices: SongChoicesResponse;
  users: UsersResponse;
};

// Records
export type SongChoicesRecord = {
  user: string; // relation to users.id
  round: number; // 1..5
  artist: string;
  song_title: string;
  confirmed: boolean;
  apple_music_song_id?: string;
};

export type UsersRecord = {
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  name: string;
  avatar: string;
  first_name: string;
  last_name: string;
};

// Responses
export type SongChoicesResponse<Texpand = unknown> = SongChoicesRecord & BaseSystemFields<Texpand>;
export type UsersResponse<Texpand = unknown> = UsersRecord & AuthSystemFields<Texpand>;

// Typed PocketBase instance
export interface TypedPocketBase extends PocketBase {
  collection(idOrName: 'song_choices'): RecordService<SongChoicesResponse>;
  collection(idOrName: 'users'): RecordService<UsersResponse>;
  collection(idOrName: string): RecordService<RecordModel>;
}

