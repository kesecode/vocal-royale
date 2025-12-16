/**
 * Test Data Fixtures for E2E Tests
 * Contains common test data used across multiple tests
 */

export const TEST_SONGS = [
	{ artist: 'Queen', songTitle: 'Bohemian Rhapsody' },
	{ artist: 'The Beatles', songTitle: 'Hey Jude' },
	{ artist: 'Led Zeppelin', songTitle: 'Stairway to Heaven' },
	{ artist: 'Pink Floyd', songTitle: 'Comfortably Numb' },
	{ artist: 'The Rolling Stones', songTitle: 'Paint It Black' }
] as const

export const TEST_USERS = {
	admin: {
		email: 'admin@test.com',
		username: 'admin',
		password: 'password123',
		name: 'Test Admin'
	},
	participants: [
		{
			email: 'participant1@test.com',
			username: 'participant1',
			password: 'password123',
			name: 'Participant 1',
			artistName: 'Artist 1'
		},
		{
			email: 'participant2@test.com',
			username: 'participant2',
			password: 'password123',
			name: 'Participant 2',
			artistName: 'Artist 2'
		},
		{
			email: 'participant3@test.com',
			username: 'participant3',
			password: 'password123',
			name: 'Participant 3',
			artistName: 'Artist 3'
		},
		{
			email: 'participant4@test.com',
			username: 'participant4',
			password: 'password123',
			name: 'Participant 4',
			artistName: 'Artist 4'
		},
		{
			email: 'participant5@test.com',
			username: 'participant5',
			password: 'password123',
			name: 'Participant 5',
			artistName: 'Artist 5'
		}
	],
	jurors: [
		{
			email: 'juror1@test.com',
			username: 'juror1',
			password: 'password123',
			name: 'Juror 1'
		},
		{
			email: 'juror2@test.com',
			username: 'juror2',
			password: 'password123',
			name: 'Juror 2'
		},
		{
			email: 'juror3@test.com',
			username: 'juror3',
			password: 'password123',
			name: 'Juror 3'
		}
	],
	spectators: [
		{
			email: 'spectator1@test.com',
			username: 'spectator1',
			password: 'password123',
			name: 'Spectator 1'
		},
		{
			email: 'spectator2@test.com',
			username: 'spectator2',
			password: 'password123',
			name: 'Spectator 2'
		}
	]
} as const

export const TOURNAMENT_SETTINGS = {
	maxParticipants: 10,
	maxJurors: 3,
	totalRounds: 5,
	numberOfFinalSongs: 2,
	roundEliminationPattern: '5,3,3,2'
} as const

// Common test ratings for consistent testing
export const TEST_RATINGS = [
	{ participant: 'participant1', stars: 5, comment: 'Excellent performance!' },
	{ participant: 'participant2', stars: 4, comment: 'Very good singing' },
	{ participant: 'participant3', stars: 3, comment: 'Good effort' }
] as const

// Tournament phases for testing state transitions
export const TOURNAMENT_PHASES = [
	'result_locked',
	'singing_phase',
	'rating_phase',
	'break',
	'publish_result',
	'rating_refinement'
] as const

// Common error messages for validation
export const ERROR_MESSAGES = {
	invalidCredentials: 'Invalid credentials',
	passwordMismatch: 'Passwörter stimmen nicht überein',
	requiredFields: 'Bitte alle Felder ausfüllen',
	noPlacesLeft: 'Keine Plätze mehr frei',
	ratingClosed: 'Bewertungen sind derzeit geschlossen',
	selfRating: 'Selbstbewertung ist nicht erlaubt'
} as const

// Success messages
export const SUCCESS_MESSAGES = {
	passwordChanged: 'Passwort erfolgreich aktualisiert',
	artistNameSaved: 'Künstlername gespeichert',
	roleSaved: 'Rolle erfolgreich geändert',
	songSaved: 'Gespeichert!',
	ratingSaved: 'Gespeichert!',
	competitionStarted: 'Wettbewerb gestartet',
	ratingPhaseActivated: 'Bewertungsphase aktiviert'
} as const
