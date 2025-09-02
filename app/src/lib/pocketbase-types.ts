// Auto-generated placeholder. Replace with the official export from PocketBase UI when available.
// This file types the known collections for TypedPocketBase usage.

import type PocketBase from 'pocketbase'
import type { RecordModel, RecordService } from 'pocketbase'

export type BaseSystemFields<Texpand = unknown> = {
	id: string
	created: string
	updated: string
	collectionId: string
	collectionName: string
	expand?: Texpand
}

export type AuthSystemFields<Texpand = unknown> = BaseSystemFields<Texpand> & {
	email?: string
	emailVisibility?: boolean
	username: string
	verified: boolean
}

// Collections
export type Collections = {
	songChoices: SongChoicesResponse
	ratings: RatingsResponse
	users: UsersResponse
	competitionState: CompetitionStateResponse
	settings: SettingsResponse
}

// Records
export type SongChoicesRecord = {
	user: string // relation to users.id
	round: number // 1..5
	artist: string
	songTitle: string
	confirmed: boolean
	appleMusicSongId?: string
}

export type UserRole = 'default' | 'participant' | 'spectator' | 'juror' | 'admin'

export type UsersRecord = {
	email: string
	emailVisibility: boolean
	verified: boolean
	name: string
	avatar: string
	firstName: string
	lastName: string
	artistName: string
	role: UserRole
	eliminated?: boolean // eliminated from competition
	sangThisRound?: boolean // performed in the current round
}

export type RatingsRecord = {
	author: string // relation to users.id (who rated)
	ratedUser: string // relation to users.id (who was rated)
	round: number 
	rating: number 
	comment?: string // max 100 chars
	performanceRating?: number
	vocalRating?: number 
	difficultyRating?: number 
}

// Settings
export type SettingsRecord = {
	maxParticipantCount?: number
	maxJurorCount?: number
	totalRounds?: number
	numberOfFinalSongs?: number
	songChoiceDeadline?: string // datetime
	roundEliminationPattern?: string // e.g. "3,2,1,0,0" (number of eliminations per round)
}

// Competition State
export type RoundState =
	| 'singing_phase'
	| 'rating_phase'
	| 'result_phase'
	| 'result_locked'
	| 'break'
export type CompetitionStateRecord = {
	competitionStarted: boolean
	roundState: RoundState
	round: number // 1..5
	activeParticipant?: string // relation to users.id (currently active performer)
	// Indicates that the competition is fully finished (post finale)
	competitionFinished?: boolean
}

// Responses
export type SongChoicesResponse<Texpand = unknown> = SongChoicesRecord & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = UsersRecord & AuthSystemFields<Texpand>
export type RatingsResponse<Texpand = unknown> = RatingsRecord & BaseSystemFields<Texpand>
export type CompetitionStateResponse<Texpand = unknown> = CompetitionStateRecord &
	BaseSystemFields<Texpand>
export type SettingsResponse<Texpand = unknown> = SettingsRecord & BaseSystemFields<Texpand>

// Typed PocketBase instance
export interface TypedPocketBase extends PocketBase {
	collection(idOrName: 'song_choices'): RecordService<SongChoicesResponse>
	collection(idOrName: 'ratings'): RecordService<RatingsResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
	collection(idOrName: 'competition_state'): RecordService<CompetitionStateResponse>
	collection(idOrName: 'settings'): RecordService<SettingsResponse>
	collection(idOrName: string): RecordService<RecordModel>
}
