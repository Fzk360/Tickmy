export const legacySeedRepositoryIds = ['repo_food', 'repo_weekend', 'repo_visual']
export const legacySeedVideoIds = ['video_city_night', 'video_park', 'video_brunch', 'video_gallery']

export const seedRepositories = []

export const seedVideos = []

export const seedInteractions = []

export const seedComments = []

export const seedDanmakus = []

export const seedSettings = {
	showDanmaku: true,
	defaultSpeed: 1,
	soundEnabled: false,
	storageMode: 'Local Only'
}

export const seedProfile = {
	name: 'TikMy Local Curator',
	bio: 'Collecting places, clips, and everyday visual references on device.',
	initials: 'T',
	avatarPath: '',
	backgroundPath: ''
}

export function createSeedSnapshot() {
	return {
		videos: seedVideos.map((item) => ({ ...item })),
		repositories: seedRepositories.map((item) => ({ ...item })),
		comments: seedComments.map((item) => ({ ...item })),
		danmakus: seedDanmakus.map((item) => ({ ...item })),
		interactions: seedInteractions.map((item) => ({ ...item })),
		settings: { ...seedSettings },
		profile: { ...seedProfile }
	}
}
