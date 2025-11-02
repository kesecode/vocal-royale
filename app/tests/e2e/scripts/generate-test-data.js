#!/usr/bin/env node
/**
 * Generate comprehensive test data for Vocal Royale
 * Creates users (participants, jurors, spectators) and song choices for all rounds
 *
 * Usage:
 *   node generate-test-data.js --participants 5 --jurors 2 --spectators 4 --rounds 4 --finalSongs 2
 *
 * Options:
 *   --participants <number>  Number of participants to create (default: 5)
 *   --jurors <number>        Number of jurors to create (default: 2)
 *   --spectators <number>    Number of spectators to create (default: 4)
 *   --rounds <number>        Total number of rounds (default: 4)
 *   --finalSongs <number>    Number of final songs (default: 2)
 *   --confirmed              Set song choices as confirmed (default: false)
 *
 * @file This is a JavaScript file, not TypeScript
 */
import PocketBase from 'pocketbase'

// Predefined list of songs for test data
const SONG_POOL = [
	{ artist: 'Queen', title: 'Bohemian Rhapsody' },
	{ artist: 'The Beatles', title: 'Hey Jude' },
	{ artist: 'Led Zeppelin', title: 'Stairway to Heaven' },
	{ artist: 'Pink Floyd', title: 'Wish You Were Here' },
	{ artist: 'David Bowie', title: 'Heroes' },
	{ artist: 'Elton John', title: 'Your Song' },
	{ artist: 'Fleetwood Mac', title: 'Dreams' },
	{ artist: 'Eagles', title: 'Hotel California' },
	{ artist: 'The Rolling Stones', title: 'Paint It Black' },
	{ artist: 'Bob Dylan', title: 'Like a Rolling Stone' },
	{ artist: 'Simon & Garfunkel', title: 'The Sound of Silence' },
	{ artist: 'The Doors', title: 'Light My Fire' },
	{ artist: 'Nirvana', title: 'Smells Like Teen Spirit' },
	{ artist: 'Radiohead', title: 'Creep' },
	{ artist: 'Oasis', title: 'Wonderwall' },
	{ artist: 'Coldplay', title: 'Fix You' },
	{ artist: 'U2', title: 'With or Without You' },
	{ artist: 'R.E.M.', title: 'Losing My Religion' },
	{ artist: 'The Smiths', title: 'There Is a Light That Never Goes Out' },
	{ artist: 'Joy Division', title: 'Love Will Tear Us Apart' },
	{ artist: 'The Cure', title: 'Just Like Heaven' },
	{ artist: 'Depeche Mode', title: 'Enjoy the Silence' },
	{ artist: 'New Order', title: 'Blue Monday' },
	{ artist: 'The Police', title: 'Every Breath You Take' },
	{ artist: 'Bruce Springsteen', title: 'Born to Run' },
	{ artist: 'Prince', title: 'Purple Rain' },
	{ artist: 'Michael Jackson', title: 'Billie Jean' },
	{ artist: 'Whitney Houston', title: 'I Will Always Love You' },
	{ artist: 'Adele', title: 'Someone Like You' },
	{ artist: 'Amy Winehouse', title: 'Back to Black' }
]

// Parse CLI arguments
function parseArgs() {
	const args = process.argv.slice(2)
	const config = {
		participants: 5,
		jurors: 2,
		spectators: 4,
		rounds: 4,
		finalSongs: 2,
		confirmed: false
	}

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		switch (arg) {
			case '--participants':
				config.participants = parseInt(args[++i], 10)
				break
			case '--jurors':
				config.jurors = parseInt(args[++i], 10)
				break
			case '--spectators':
				config.spectators = parseInt(args[++i], 10)
				break
			case '--rounds':
				config.rounds = parseInt(args[++i], 10)
				break
			case '--finalSongs':
				config.finalSongs = parseInt(args[++i], 10)
				break
			case '--confirmed':
				config.confirmed = true
				break
			case '--help':
			case '-h':
				console.log(`
Usage: node generate-test-data.js [options]

Options:
  --participants <number>  Number of participants to create (default: 5)
  --jurors <number>        Number of jurors to create (default: 2)
  --spectators <number>    Number of spectators to create (default: 4)
  --rounds <number>        Total number of rounds (default: 4)
  --finalSongs <number>    Number of final songs (default: 2)
  --confirmed              Set song choices as confirmed (default: false)
  --help, -h               Show this help message

Examples:
  node generate-test-data.js
  node generate-test-data.js --participants 10 --jurors 3 --spectators 5
  node generate-test-data.js --rounds 5 --finalSongs 2 --confirmed
				`)
				process.exit(0)
		}
	}

	return config
}

// Calculate total songs needed (same formula as frontend)
function calculateTotalSongs(totalRounds, numberOfFinalSongs) {
	return totalRounds + numberOfFinalSongs - 1
}

// Create users for a specific role
async function createUsers(pb, role, count, emailPrefix) {
	const users = []
	const roleName = role.charAt(0).toUpperCase() + role.slice(1)

	for (let i = 1; i <= count; i++) {
		const userData = {
			email: `${emailPrefix}${i}@test.de`,
			password: 'test1234',
			passwordConfirm: 'test1234',
			name: `${roleName} ${i}`,
			role: role,
			// ArtistName must be unique, so set it for all roles
			artistName: role === 'participant' ? `Artist ${i}` : `${roleName} ${i}`
		}

		try {
			// Check if user already exists
			await pb.collection('users').getFirstListItem(`email="${userData.email}"`)
			console.log(`⚠️  User ${userData.email} already exists, skipping`)
			// Get the user to add to our list
			const existingUser = await pb
				.collection('users')
				.getFirstListItem(`email="${userData.email}"`)
			users.push(existingUser)
		} catch {
			// User doesn't exist, create it
			try {
				const newUser = await pb.collection('users').create(userData)
				console.log(`✅ Created ${role}: ${userData.email} (${userData.name})`)
				users.push(newUser)
			} catch (createError) {
				console.error(
					`❌ Error creating user ${userData.email}:`,
					createError.response || createError
				)
				throw createError
			}
		}
	}

	return users
}

// Simple hash function for string
function simpleHash(str) {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i)
		hash = hash & hash // Convert to 32-bit integer
	}
	return Math.abs(hash)
}

// Create song choices for a participant
async function createSongChoices(pb, participant, totalSongs, confirmed) {
	const choices = []

	for (let round = 1; round <= totalSongs; round++) {
		// Use different songs for each participant and round
		const songIndex = (simpleHash(participant.id) + round) % SONG_POOL.length
		const song = SONG_POOL[songIndex]

		const choiceData = {
			user: participant.id,
			round: round,
			artist: song.artist,
			songTitle: song.title,
			confirmed: confirmed,
			appleMusicSongId: null
		}

		try {
			// Check if song choice already exists for this user and round
			const existing = await pb
				.collection('song_choices')
				.getFirstListItem(`user="${participant.id}" && round=${round}`)
			console.log(`⚠️  Song choice for ${participant.name} round ${round} already exists, skipping`)
			choices.push(existing)
		} catch {
			// Doesn't exist, create it
			const choice = await pb.collection('song_choices').create(choiceData)
			console.log(
				`✅ Created song choice for ${participant.name} round ${round}: ${song.artist} - ${song.title}`
			)
			choices.push(choice)
		}
	}

	return choices
}

// Update competition settings
async function updateSettings(pb, rounds, finalSongs) {
	try {
		// Get existing settings
		const settingsList = await pb.collection('settings').getFullList()

		const settingsData = {
			totalRounds: rounds,
			numberOfFinalSongs: finalSongs,
			maxParticipantCount: 15,
			maxJurorCount: 5,
			roundEliminationPattern: '5,3,3,2',
			songChoiceDeadline: null,
			registrationPassword: null
		}

		if (settingsList.length > 0) {
			// Update existing settings
			const settings = settingsList[0]
			await pb.collection('settings').update(settings.id, settingsData)
			console.log(`✅ Updated settings: ${rounds} rounds, ${finalSongs} final songs`)
		} else {
			// Create new settings
			await pb.collection('settings').create(settingsData)
			console.log(`✅ Created settings: ${rounds} rounds, ${finalSongs} final songs`)
		}
	} catch (error) {
		console.error('❌ Error updating settings:', error)
		throw error
	}
}

// Main function
async function generateTestData() {
	const config = parseArgs()

	console.log('🚀 Generating test data with configuration:')
	console.log(`   Participants: ${config.participants}`)
	console.log(`   Jurors: ${config.jurors}`)
	console.log(`   Spectators: ${config.spectators}`)
	console.log(`   Rounds: ${config.rounds}`)
	console.log(`   Final Songs: ${config.finalSongs}`)
	console.log(`   Song Choices Confirmed: ${config.confirmed}`)
	console.log()

	const totalSongs = calculateTotalSongs(config.rounds, config.finalSongs)
	console.log(`📊 Total songs per participant: ${totalSongs}`)
	console.log()

	try {
		const pb = new PocketBase('http://127.0.0.1:8090')

		// Login as admin
		await pb.admins.authWithPassword('admin_db@vocal.royale', 'vocal_royale_2025')
		console.log('✅ Connected to PocketBase as admin')
		console.log()

		// Update settings first
		console.log('⚙️  Updating competition settings...')
		await updateSettings(pb, config.rounds, config.finalSongs)
		console.log()

		// Create users
		console.log('👥 Creating users...')
		const participants = await createUsers(pb, 'participant', config.participants, 't')
		const jurors = await createUsers(pb, 'juror', config.jurors, 'j')
		const spectators = await createUsers(pb, 'spectator', config.spectators, 'z')
		console.log()

		// Create song choices for participants
		console.log('🎵 Creating song choices for participants...')
		for (const participant of participants) {
			await createSongChoices(pb, participant, totalSongs, config.confirmed)
		}
		console.log()

		// Summary
		console.log('🎉 Test data generation completed!')
		console.log()
		console.log('📊 Summary:')
		console.log(`   ✅ ${participants.length} participants created`)
		console.log(`   ✅ ${jurors.length} jurors created`)
		console.log(`   ✅ ${spectators.length} spectators created`)
		console.log(`   ✅ ${participants.length * totalSongs} song choices created`)
		console.log()
		console.log('🔐 Login credentials:')
		console.log('   Email pattern: t1@test.de, j1@test.de, z1@test.de, etc.')
		console.log('   Password: test1234')
	} catch (error) {
		console.error('❌ Error generating test data:', error)
		process.exit(1)
	}
}

// Run the script
generateTestData()
