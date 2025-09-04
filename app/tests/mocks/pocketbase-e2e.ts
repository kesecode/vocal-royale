import type {
	UsersResponse,
	RatingsResponse,
	SongChoicesResponse,
	CompetitionStateResponse,
	SettingsResponse,
	SongChoicesRecord
} from '../../src/lib/pocketbase-types'

/**
 * E2E Mock for PocketBase
 * Complete tournament simulation for end-to-end testing
 */
export class E2EPocketBaseMock {
	private users = new Map<string, UsersResponse>()
	private ratings = new Map<string, RatingsResponse>()
	private songChoices = new Map<string, SongChoicesResponse>()

	// App settings
	private settings: SettingsResponse = {
		id: 'settings1',
		maxParticipantCount: 10,
		maxJurorCount: 3,
		totalRounds: 5,
		numberOfFinalSongs: 2,
		songChoiceDeadline: undefined,
		roundEliminationPattern: '5,3,3,2',
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		collectionId: 'settings',
		collectionName: 'settings'
	}

	private competitionState: CompetitionStateResponse = {
		id: 'state1',
		competitionStarted: false,
		roundState: 'singing_phase',
		round: 1,
		competitionFinished: false,
		activeParticipant: undefined,
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		collectionId: 'competitionState',
		collectionName: 'competitionState'
	}

	/**
	 * Initialize with test data
	 */
	seed() {
		this.users.clear()
		this.ratings.clear()
		this.songChoices.clear()

		// Admin user
		this.users.set('admin1', {
			id: 'admin1',
			email: 'admin@test.com',
			emailVisibility: true,
			verified: true,
			username: 'admin',
			name: 'Admin User',
			avatar: '',
			firstName: 'Admin',
			lastName: 'User',
			role: 'admin',
			artistName: '',
			eliminated: false,
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
			collectionId: 'users',
			collectionName: 'users'
		})

		// Participants
		for (let i = 1; i <= 3; i++) {
			this.users.set(`participant${i}`, {
				id: `participant${i}`,
				email: `participant${i}@test.com`,
				emailVisibility: true,
				verified: true,
				username: `participant${i}`,
				name: `Participant ${i}`,
				avatar: '',
				firstName: `Participant`,
				lastName: `${i}`,
				artistName: `Artist ${i}`,
				role: 'participant',
				eliminated: false,
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				collectionId: 'users',
				collectionName: 'users'
			})
		}

		// Jurors
		for (let i = 1; i <= 2; i++) {
			this.users.set(`juror${i}`, {
				id: `juror${i}`,
				email: `juror${i}@test.com`,
				emailVisibility: true,
				verified: true,
				username: `juror${i}`,
				name: `Juror ${i}`,
				avatar: '',
				firstName: `Juror`,
				lastName: `${i}`,
				role: 'juror',
				artistName: '',
				eliminated: false,
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				collectionId: 'users',
				collectionName: 'users'
			})
		}

		// Sample songs for participants
		const sampleSongs = [
			{ artist: 'Queen', songTitle: 'Bohemian Rhapsody' },
			{ artist: 'The Beatles', songTitle: 'Hey Jude' },
			{ artist: 'Led Zeppelin', songTitle: 'Stairway to Heaven' }
		]

		this.getUsersByRole('participant').forEach((participant, index) => {
			for (let round = 1; round <= 5; round++) {
				const song = sampleSongs[index % sampleSongs.length]
				this.songChoices.set(`choice-${participant.id}-${round}`, {
					id: `choice-${participant.id}-${round}`,
					user: participant.id,
					round,
					confirmed: true,
					artist: song.artist,
					songTitle: song.songTitle,
					appleMusicSongId: undefined,
					created: new Date().toISOString(),
					updated: new Date().toISOString(),
					collectionId: 'songChoices',
					collectionName: 'songChoices'
				})
			}
		})
	}

	// User management
	getUsers(): UsersResponse[] {
		return Array.from(this.users.values())
	}

	getUserById(id: string): UsersResponse | undefined {
		return this.users.get(id)
	}

	getUsersByRole(role: string): UsersResponse[] {
		return this.getUsers().filter((user) => user.role === role)
	}

	updateUser(userId: string, data: Partial<UsersResponse>): UsersResponse {
		const user = this.users.get(userId)
		if (!user) throw new Error(`User ${userId} not found`)

		const updated = { ...user, ...data, updated: new Date().toISOString() }
		this.users.set(userId, updated)
		return updated
	}

	// Rating management
	getRatings(round?: number, author?: string): RatingsResponse[] {
		const ratings = Array.from(this.ratings.values())
		return ratings.filter((rating) => {
			if (round && rating.round !== round) return false
			if (author && rating.author !== author) return false
			return true
		})
	}

	createRating(
		data: Omit<RatingsResponse, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>
	): RatingsResponse {
		const id = `rating-${data.author}-${data.ratedUser}-${data.round}`
		const rating: RatingsResponse = {
			id,
			...data,
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
			collectionId: 'ratings',
			collectionName: 'ratings'
		}
		this.ratings.set(id, rating)
		return rating
	}

	// Song choice management
	getSongChoices(userId?: string, round?: number): SongChoicesResponse[] {
		const choices = Array.from(this.songChoices.values())
		return choices.filter((choice) => {
			if (userId && choice.user !== userId) return false
			if (round && choice.round !== round) return false
			return true
		})
	}

	updateSongChoice(
		userId: string,
		round: number,
		data: Partial<SongChoicesRecord>
	): SongChoicesResponse {
		const id = `choice-${userId}-${round}`
		const existing = this.songChoices.get(id)
		const choice: SongChoicesResponse = {
			id,
			user: userId,
			round,
			confirmed: true,
			artist: data.artist || '',
			songTitle: data.songTitle || '',
			appleMusicSongId: data.appleMusicSongId,
			created: existing?.created || new Date().toISOString(),
			updated: new Date().toISOString(),
			collectionId: 'songChoices',
			collectionName: 'songChoices'
		}
		this.songChoices.set(id, choice)
		return choice
	}

	// Competition state management
	getCompetitionState(): CompetitionStateResponse {
		return this.competitionState
	}

	getSettings(): SettingsResponse {
		return this.settings
	}

	updateCompetitionState(updates: Partial<CompetitionStateResponse>): CompetitionStateResponse {
		this.competitionState = {
			...this.competitionState,
			...updates,
			updated: new Date().toISOString()
		}
		return this.competitionState
	}

	// Tournament flow methods
	startCompetition(): CompetitionStateResponse {
		return this.updateCompetitionState({
			competitionStarted: true,
			roundState: 'singing_phase',
			activeParticipant: this.getUsersByRole('participant')[0]?.id
		})
	}

	activateRatingPhase(): CompetitionStateResponse {
		return this.updateCompetitionState({
			roundState: 'rating_phase'
		})
	}

	nextParticipant(): CompetitionStateResponse {
		const participants = this.getUsersByRole('participant').filter((p) => !p.eliminated)
		const currentActiveId = this.competitionState.activeParticipant
		const currentIndex = participants.findIndex((p) => p.id === currentActiveId)
		const nextIndex = (currentIndex + 1) % participants.length

		return this.updateCompetitionState({
			activeParticipant: participants[nextIndex]?.id,
			roundState: nextIndex === 0 ? 'break' : 'rating_phase'
		})
	}

	finalizeRatings(): CompetitionStateResponse {
		return this.updateCompetitionState({
			roundState: 'result_locked'
		})
	}

	showResults(): {
		state: CompetitionStateResponse
		results: Array<{
			participant: UsersResponse
			averageRating: number
			totalVotes: number
		}>
	} {
		const state = this.updateCompetitionState({
			roundState: 'result_phase'
		})

		// Calculate results
		const participants = this.getUsersByRole('participant').filter((p) => !p.eliminated)
		const results = participants.map((participant) => {
			const ratings = this.getRatings(this.competitionState.round).filter(
				(r) => r.ratedUser === participant.id
			)

			const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0)
			const avgRating = ratings.length > 0 ? totalRating / ratings.length : 0

			return {
				id: participant.id,
				name: participant.name,
				artistName: participant.artistName,
				avg: Math.round(avgRating * 100) / 100,
				sum: totalRating,
				count: ratings.length,
				eliminated: participant.eliminated
			}
		})

		const formattedResults = results.map((r) => ({
			participant: this.getUserById(r.id)!,
			averageRating: r.avg,
			totalVotes: r.count
		}))
		return { state, results: formattedResults }
	}

	startNextRound(): CompetitionStateResponse {
		const nextRound = this.competitionState.round + 1
		const isFinished = nextRound > (this.settings.totalRounds || 5)

		return this.updateCompetitionState({
			round: nextRound,
			roundState: 'singing_phase',
			competitionFinished: isFinished,
			activeParticipant: isFinished ? undefined : this.getUsersByRole('participant')[0]?.id
		})
	}

	resetGame(): CompetitionStateResponse {
		// Reset all users elimination status
		this.getUsers().forEach((user) => {
			if (user.role === 'participant') {
				this.updateUser(user.id, { eliminated: false })
			}
		})

		// Clear ratings and competition state
		this.ratings.clear()

		return this.updateCompetitionState({
			competitionStarted: false,
			roundState: 'singing_phase',
			round: 1,
			competitionFinished: false,
			activeParticipant: undefined
		})
	}
}

// Export singleton instance
export const e2eMock = new E2EPocketBaseMock()
