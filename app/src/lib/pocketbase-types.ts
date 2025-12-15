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
	emailTemplates: EmailTemplatesResponse
	uiContent: UiContentResponse
	appSettings: AppSettingsResponse
	appAssets: AppAssetsResponse
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

export type UserRole = 'default' | 'participant' | 'juror' | 'spectator' | 'admin'

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
	eliminatedInRound?: number // round in which participant was eliminated (for final rankings)
	sangThisRound?: boolean // performed in the current round
	checkedIn?: boolean // checked in by admin
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
	roundEliminationPattern?: string // e.g. "5,3,3,2" (number of eliminations per round)
	registrationPassword?: string // password required for registration
}

// Competition State
export type RoundState =
	| 'singing_phase'
	| 'rating_phase'
	| 'result_phase'
	| 'publish_result'
	| 'result_locked'
	| 'break'
	| 'rating_refinement'
export type CompetitionStateRecord = {
	competitionStarted: boolean
	roundState: RoundState
	round: number // 1..5
	activeParticipant?: string // relation to users.id (currently active performer)
	// Indicates that the competition is fully finished (post finale)
	competitionFinished?: boolean
}

// Email Templates
export type EmailTemplateType = 'verification' | 'password_reset' | 'email_change'
export type CollectionRef = 'users' | '_superusers'

export type EmailTemplatesRecord = {
	template_type: EmailTemplateType
	subject: string
	body: string
	collection_ref: CollectionRef
	is_active?: boolean
}

// UI Content
export type UiContentRecord = {
	key: string
	value: string
	category: string
	description?: string
	variables?: string[]
	is_active?: boolean
}

// App Settings
export type AppSettingsRecord = {
	key: 'app_name' | 'app_url'
	value: string
	description?: string
}

// App Assets
export type AssetType = 'favicon' | 'logo'
export type AppAssetsRecord = {
	asset_type: AssetType
	file: string
	is_active?: boolean
}

// Responses
export type SongChoicesResponse<Texpand = unknown> = SongChoicesRecord & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = UsersRecord & AuthSystemFields<Texpand>
export type RatingsResponse<Texpand = unknown> = RatingsRecord & BaseSystemFields<Texpand>
export type CompetitionStateResponse<Texpand = unknown> = CompetitionStateRecord &
	BaseSystemFields<Texpand>
export type SettingsResponse<Texpand = unknown> = SettingsRecord & BaseSystemFields<Texpand>
export type EmailTemplatesResponse<Texpand = unknown> = EmailTemplatesRecord &
	BaseSystemFields<Texpand>
export type UiContentResponse<Texpand = unknown> = UiContentRecord & BaseSystemFields<Texpand>
export type AppSettingsResponse<Texpand = unknown> = AppSettingsRecord & BaseSystemFields<Texpand>
export type AppAssetsResponse<Texpand = unknown> = AppAssetsRecord & BaseSystemFields<Texpand>

// Typed PocketBase instance
export interface TypedPocketBase extends PocketBase {
	collection(idOrName: 'song_choices'): RecordService<SongChoicesResponse>
	collection(idOrName: 'ratings'): RecordService<RatingsResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
	collection(idOrName: 'competition_state'): RecordService<CompetitionStateResponse>
	collection(idOrName: 'settings'): RecordService<SettingsResponse>
	collection(idOrName: 'email_templates'): RecordService<EmailTemplatesResponse>
	collection(idOrName: 'ui_content'): RecordService<UiContentResponse>
	collection(idOrName: 'app_settings'): RecordService<AppSettingsResponse>
	collection(idOrName: 'app_assets'): RecordService<AppAssetsResponse>
	collection(idOrName: string): RecordService<RecordModel>
}
