import { createSeedSnapshot } from '../data/seed'

const STORAGE_KEY = 'tikmy_snapshot_v1'

function cloneSnapshot(snapshot) {
	return JSON.parse(JSON.stringify(snapshot))
}

function readSnapshot() {
	try {
		const stored = uni.getStorageSync(STORAGE_KEY)
		if (!stored) {
			return createSeedSnapshot()
		}
		return { ...createSeedSnapshot(), ...stored }
	} catch (error) {
		return createSeedSnapshot()
	}
}

function writeSnapshot(snapshot) {
	uni.setStorageSync(STORAGE_KEY, cloneSnapshot(snapshot))
	return snapshot
}

export const MiniProgramStorageAdapter = {
	loadAll() {
		return cloneSnapshot(readSnapshot())
	},

	saveSnapshot(snapshot) {
		return writeSnapshot({
			...createSeedSnapshot(),
			...cloneSnapshot(snapshot)
		})
	},

	saveVideo(video) {
		const snapshot = readSnapshot()
		const index = snapshot.videos.findIndex((item) => item.id === video.id)
		if (index >= 0) {
			snapshot.videos.splice(index, 1, { ...snapshot.videos[index], ...video })
		} else {
			snapshot.videos.unshift(video)
		}
		writeSnapshot(snapshot)
		return video
	},

	saveVideos(videos) {
		const snapshot = readSnapshot()
		snapshot.videos = videos.reduce((acc, item) => {
			if (!acc.some((existing) => existing.id === item.id)) {
				acc.push({ ...item })
			}
			return acc
		}, [])
		writeSnapshot(snapshot)
		return videos
	},

	saveRepository(repository) {
		const snapshot = readSnapshot()
		const index = snapshot.repositories.findIndex((item) => item.id === repository.id)
		if (index >= 0) {
			snapshot.repositories.splice(index, 1, { ...snapshot.repositories[index], ...repository })
		} else {
			snapshot.repositories.unshift(repository)
		}
		writeSnapshot(snapshot)
		return repository
	},

	saveRepositories(repositories) {
		const snapshot = readSnapshot()
		snapshot.repositories = repositories.map((item) => ({ ...item }))
		writeSnapshot(snapshot)
		return repositories
	},

	saveComment(comment) {
		const snapshot = readSnapshot()
		const index = snapshot.comments.findIndex((item) => item.id === comment.id)
		if (index >= 0) {
			snapshot.comments.splice(index, 1, { ...snapshot.comments[index], ...comment })
		} else {
			snapshot.comments.unshift(comment)
		}
		writeSnapshot(snapshot)
		return comment
	},

	saveDanmaku(danmaku) {
		const snapshot = readSnapshot()
		const index = snapshot.danmakus.findIndex((item) => item.id === danmaku.id)
		if (index >= 0) {
			snapshot.danmakus.splice(index, 1, { ...snapshot.danmakus[index], ...danmaku })
		} else {
			snapshot.danmakus.unshift(danmaku)
		}
		writeSnapshot(snapshot)
		return danmaku
	},

	saveInteraction(interaction) {
		const snapshot = readSnapshot()
		const index = snapshot.interactions.findIndex((item) => item.videoId === interaction.videoId)
		if (index >= 0) {
			snapshot.interactions.splice(index, 1, { ...snapshot.interactions[index], ...interaction })
		} else {
			snapshot.interactions.unshift(interaction)
		}
		writeSnapshot(snapshot)
		return interaction
	},

	saveSettings(settings) {
		const snapshot = readSnapshot()
		snapshot.settings = { ...snapshot.settings, ...settings }
		writeSnapshot(snapshot)
		return snapshot.settings
	},

	saveProfile(profile) {
		const snapshot = readSnapshot()
		snapshot.profile = { ...(snapshot.profile || {}), ...profile }
		writeSnapshot(snapshot)
		return snapshot.profile
	},

	reset() {
		const snapshot = createSeedSnapshot()
		writeSnapshot(snapshot)
		return snapshot
	},

	exportableSnapshot() {
		return cloneSnapshot(readSnapshot())
	}
}
