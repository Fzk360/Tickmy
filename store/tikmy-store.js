import { computed, reactive } from 'vue'
import { MiniProgramStorageAdapter } from '../adapters/mini-program-storage'
import { createSeedSnapshot, legacySeedRepositoryIds, legacySeedVideoIds, seedProfile, seedSettings } from '../data/seed'
import {
	clamp,
	createDeterministicValue,
	createId,
	createVideoFingerprint,
	estimateSnapshotKb,
	formatDurationMinutes,
	formatRelativeTime,
	getFileName,
	getGradientBySeed,
	getInitials,
	isProbablyRandomFileName,
	normalizeCount,
	removeExtension,
	safeCall
} from '../utils/tikmy'

const initialSnapshot = createSeedSnapshot()
const legacySeedRepositoryIdSet = new Set(legacySeedRepositoryIds)
const legacySeedVideoIdSet = new Set(legacySeedVideoIds)

function removeLegacySeedData(snapshot = {}) {
	const videos = Array.isArray(snapshot.videos)
		? snapshot.videos.filter(
				(item) => !legacySeedVideoIdSet.has(item.id) && !String(item.sourceFingerprint || '').startsWith('seed-video-')
			)
		: []
	const videoIdSet = new Set(videos.map((item) => item.id))

	return {
		...snapshot,
		repositories: Array.isArray(snapshot.repositories)
			? snapshot.repositories.filter((item) => !legacySeedRepositoryIdSet.has(item.id))
			: [],
		videos,
		comments: Array.isArray(snapshot.comments) ? snapshot.comments.filter((item) => videoIdSet.has(item.videoId)) : [],
		danmakus: Array.isArray(snapshot.danmakus) ? snapshot.danmakus.filter((item) => videoIdSet.has(item.videoId)) : [],
		interactions: Array.isArray(snapshot.interactions) ? snapshot.interactions.filter((item) => videoIdSet.has(item.videoId)) : []
	}
}

function shouldPersistSanitizedSnapshot(original = {}, sanitized = {}) {
	return JSON.stringify(original) !== JSON.stringify(sanitized)
}

const state = reactive({
	initialized: false,
	loading: false,
	importing: false,
	videos: initialSnapshot.videos,
	repositories: initialSnapshot.repositories,
	comments: initialSnapshot.comments,
	danmakus: initialSnapshot.danmakus,
	interactions: initialSnapshot.interactions,
	settings: initialSnapshot.settings,
	profile: initialSnapshot.profile,
	lastImportSummary: null
})

function createEmptyInteraction(videoId) {
	return {
		videoId,
		dwellSeconds: 0,
		playCount: 0,
		playFinishCount: 0,
		isLiked: false,
		isFavorited: false,
		likedAt: 0,
		favoritedAt: 0,
		quickSkipCount: 0,
		lastSkippedAt: 0,
		lastViewedAt: 0
	}
}

function syncRepositoryCounters() {
	const counts = state.videos.reduce((acc, item) => {
		acc[item.repositoryId] = (acc[item.repositoryId] || 0) + 1
		return acc
	}, {})

	state.repositories = state.repositories.map((item) => {
		const repositoryVideos = state.videos.filter((video) => video.repositoryId === item.id)
		const firstVideo = repositoryVideos.find((video) => video.coverPath)
		const keepCurrentCover =
			item.coverPath && repositoryVideos.some((video) => video.coverPath && video.coverPath === item.coverPath)

		return {
			...item,
			videoCount: counts[item.id] || 0,
			coverPath: keepCurrentCover ? item.coverPath : firstVideo ? firstVideo.coverPath : ''
		}
	})
}

function getImportedTitle(video, repositories, index) {
	const repository = repositories.find((item) => item.id === video.repositoryId)
	const repositoryName = repository ? repository.name : 'Local Library'
	if (video.title && !isProbablyRandomFileName(video.title)) {
		return video.title
	}
	return `${repositoryName} Clip ${index + 1}`
}

function normalizeImportedVideo(video, repositories, index) {
	if (video.author !== 'Local Import') {
		return {
			...video,
			preview: video.preview || video.title,
			category: video.category || 'Library'
		}
	}

	const repository = repositories.find((item) => item.id === video.repositoryId)
	const repositoryName = repository ? repository.name : 'Local Library'
	const title = getImportedTitle(video, repositories, index)
	const description =
		video.description && video.description !== 'Imported from the local album into TikMy.'
			? video.description
			: `Imported into ${repositoryName} from the local album.`

	return {
		...video,
		title,
		preview: video.preview || title,
		description,
		category: repositoryName
	}
}

function normalizeProfile(profile = {}) {
	const nextName = String(profile.name == null ? seedProfile.name : profile.name).trim() || seedProfile.name
	const nextBio = String(profile.bio == null ? seedProfile.bio : profile.bio).trim()

	return {
		...seedProfile,
		...profile,
		name: nextName,
		bio: nextBio,
		avatarPath: String(profile.avatarPath || '').trim(),
		backgroundPath: String(profile.backgroundPath || '').trim(),
		initials: getInitials(nextName)
	}
}

function hydrate(snapshot) {
	const repositories = Array.isArray(snapshot.repositories) && snapshot.repositories.length ? snapshot.repositories : initialSnapshot.repositories
	const videos = Array.isArray(snapshot.videos) && snapshot.videos.length ? snapshot.videos : initialSnapshot.videos

	state.repositories = repositories.map((item) => ({ ...item }))
	state.videos = videos.map((item, index) => normalizeImportedVideo(item, state.repositories, index))
	state.comments = Array.isArray(snapshot.comments) ? snapshot.comments.map((item) => ({ ...item })) : initialSnapshot.comments.map((item) => ({ ...item }))
	state.danmakus = Array.isArray(snapshot.danmakus) ? snapshot.danmakus.map((item) => ({ ...item })) : initialSnapshot.danmakus.map((item) => ({ ...item }))
	state.interactions = Array.isArray(snapshot.interactions)
		? snapshot.interactions.map((item) => ({
				...createEmptyInteraction(item.videoId),
				...item
			}))
		: initialSnapshot.interactions.map((item) => ({
				...createEmptyInteraction(item.videoId),
				...item
			}))
	state.settings = {
		...seedSettings,
		...(snapshot.settings || {})
	}
	state.profile = normalizeProfile(snapshot.profile || {})
	syncRepositoryCounters()
	state.initialized = true
}

function snapshot() {
	return {
		videos: state.videos.map((item) => ({ ...item })),
		repositories: state.repositories.map((item) => ({ ...item })),
		comments: state.comments.map((item) => ({ ...item })),
		danmakus: state.danmakus.map((item) => ({ ...item })),
		interactions: state.interactions.map((item) => ({ ...item })),
		settings: { ...state.settings },
		profile: { ...state.profile }
	}
}

function replaceInteraction(nextInteraction) {
	const index = state.interactions.findIndex((item) => item.videoId === nextInteraction.videoId)
	if (index >= 0) {
		state.interactions.splice(index, 1, nextInteraction)
	} else {
		state.interactions.unshift(nextInteraction)
	}
	MiniProgramStorageAdapter.saveInteraction(nextInteraction)
	return nextInteraction
}

function updateRepositoryCover(repositoryId, coverPath) {
	if (!coverPath) {
		return
	}

	state.repositories = state.repositories.map((item) => {
		if (item.id !== repositoryId || item.coverPath) {
			return item
		}
		return {
			...item,
			coverPath
		}
	})
}

function createImportedTitle(file, repositoryName, serialNumber) {
	const candidateName = removeExtension(file.name || getFileName(file.tempFilePath || ''))
	if (candidateName && !isProbablyRandomFileName(candidateName)) {
		return candidateName
	}
	return `${repositoryName} Clip ${serialNumber}`
}

async function saveTempFile(tempFilePath) {
	if (!tempFilePath) {
		return ''
	}

	try {
		const fileSystemManager =
			(typeof uni !== 'undefined' && typeof uni.getFileSystemManager === 'function' && uni.getFileSystemManager()) ||
			(typeof wx !== 'undefined' && typeof wx.getFileSystemManager === 'function' && wx.getFileSystemManager()) ||
			null

		const result = fileSystemManager && typeof fileSystemManager.saveFile === 'function'
			? await new Promise((resolve, reject) => {
					fileSystemManager.saveFile({
						tempFilePath,
						success: resolve,
						fail: reject
					})
			  })
			: await safeCall('saveFile', { tempFilePath })
		const savedFilePath = String((result && result.savedFilePath) || '').trim()
		if (!savedFilePath) {
			throw new Error('Missing saved file path')
		}
		return savedFilePath
	} catch (error) {
		const rawMessage = String((error && (error.message || error.errMsg)) || '').trim().toLowerCase()
		const canFallbackToTempPath =
			rawMessage.includes('savefile') ||
			rawMessage.includes('not a function') ||
			rawMessage.includes('permission') ||
			rawMessage.includes('fail') ||
			rawMessage.includes('denied') ||
			rawMessage.includes('unsupported')

		if (canFallbackToTempPath) {
			// Some runtimes cannot persist media files reliably; keep the temporary path so import can still complete.
			return String(tempFilePath).trim()
		}

		throw error
	}
}

async function removeSavedFileIfPossible(filePath) {
	const normalizedPath = String(filePath || '').trim()
	if (!normalizedPath) {
		return
	}

	try {
		await safeCall('removeSavedFile', {
			filePath: normalizedPath
		})
	} catch (error) {
		// Ignore cleanup failures so content deletion is not blocked by platform-specific file constraints.
	}
}

async function cleanupVideoAssets(videos = []) {
	const assetPaths = [...new Set(videos.flatMap((item) => [item.localPath, item.coverPath]).filter(Boolean))]
	await Promise.all(assetPaths.map((item) => removeSavedFileIfPossible(item)))
}

function removeVideoRelations(videoIds = []) {
	const videoIdSet = new Set(videoIds)
	state.comments = state.comments.filter((item) => !videoIdSet.has(item.videoId))
	state.danmakus = state.danmakus.filter((item) => !videoIdSet.has(item.videoId))
	state.interactions = state.interactions.filter((item) => !videoIdSet.has(item.videoId))
}

async function ensureInitialized() {
	if (state.initialized) {
		return state
	}

	state.loading = true
	try {
		const loadedSnapshot = MiniProgramStorageAdapter.loadAll()
		const sanitizedSnapshot = removeLegacySeedData(loadedSnapshot)
		if (shouldPersistSanitizedSnapshot(loadedSnapshot, sanitizedSnapshot)) {
			MiniProgramStorageAdapter.saveSnapshot(sanitizedSnapshot)
		}
		hydrate(sanitizedSnapshot)
	} finally {
		state.loading = false
	}

	return state
}

function getRepositoryById(repositoryId) {
	return state.repositories.find((item) => item.id === repositoryId)
}

function getVideosByRepo(repositoryId) {
	return state.videos.filter((item) => item.repositoryId === repositoryId)
}

function getInteraction(videoId) {
	return state.interactions.find((item) => item.videoId === videoId) || createEmptyInteraction(videoId)
}

function getCommentsByVideo(videoId) {
	return state.comments
		.filter((item) => item.videoId === videoId)
		.sort((left, right) => right.createdAt - left.createdAt)
		.map((item) => ({
			id: item.id,
			author: item.author || 'Me',
			content: item.content,
			time: formatRelativeTime(item.createdAt)
		}))
}

function getDanmakusByVideo(videoId) {
	return state.danmakus
		.filter((item) => item.videoId === videoId)
		.sort((left, right) => left.timePoint - right.timePoint)
}

function getVideoDuration(video) {
	return Math.max(8, Number(video.duration) || 12)
}

function getWarmSignalCount() {
	return state.interactions.reduce((total, item) => {
		return (
			total +
			Number(item.playCount || 0) +
			Number(item.playFinishCount || 0) +
			(item.isLiked ? 2 : 0) +
			(item.isFavorited ? 2 : 0)
		)
	}, 0)
}

function isColdStartMode() {
	return getWarmSignalCount() < Math.max(8, state.videos.length * 3)
}

function getRecommendationMetrics(video) {
	const interaction = getInteraction(video.id)
	const duration = getVideoDuration(video)
	const effectivePlayCount = Math.max(1, Number(interaction.playCount || 0), Number(interaction.playFinishCount || 0))
	const dwellRatio = clamp(Number(interaction.dwellSeconds || 0) / (duration * effectivePlayCount), 0, 1)
	const finishRate = clamp(Number(interaction.playFinishCount || 0) / effectivePlayCount, 0, 1)
	const likeSignal = interaction.isLiked ? 1 : 0
	const favoriteSignal = interaction.isFavorited ? 1 : 0
	const baseScore = dwellRatio * 0.4 + finishRate * 0.25 + likeSignal * 0.2 + favoriteSignal * 0.15

	const lastViewedGapHours = interaction.lastViewedAt ? (Date.now() - interaction.lastViewedAt) / (1000 * 60 * 60) : Infinity
	const recentBoost = Number.isFinite(lastViewedGapHours) ? clamp(1 - lastViewedGapHours / 72, 0, 1) * 0.08 : 0
	const rawSkipCount = Number(interaction.quickSkipCount || 0)
	const skipPenaltyCount = Math.max(0, rawSkipCount - Number(interaction.playFinishCount || 0) - (interaction.isLiked ? 1 : 0) - (interaction.isFavorited ? 1 : 0))
	const quickSkipPenalty = Math.min(0.36, skipPenaltyCount * 0.12)
	const repeatPenalty = interaction.isLiked || interaction.isFavorited ? 0 : Math.max(0, Number(interaction.playCount || 0) - Number(interaction.playFinishCount || 0) - 1) * 0.05
	const coldStartBoost = isColdStartMode() ? createDeterministicValue(`${video.id}_${video.importedAt || 0}`) * 0.3 : 0
	const importedGapDays = (Date.now() - Number(video.importedAt || 0)) / (1000 * 60 * 60 * 24)
	const freshnessBoost = clamp(1 - importedGapDays / 30, 0, 1) * 0.04
	const score = Math.max(0, Number((baseScore + recentBoost + coldStartBoost + freshnessBoost - quickSkipPenalty - repeatPenalty).toFixed(4)))

	return {
		score,
		dwellRatio,
		finishRate,
		likeSignal,
		favoriteSignal,
		recentBoost,
		quickSkipPenalty,
		repeatPenalty,
		coldStartBoost,
		lastViewedGapHours
	}
}

function getRecommendationReason(video) {
	const metrics = getRecommendationMetrics(video)
	if (metrics.favoriteSignal) {
		return '收藏信号强'
	}
	if (metrics.likeSignal) {
		return '点赞偏好明确'
	}
	if (metrics.finishRate >= 0.75) {
		return '完播率高'
	}
	if (metrics.dwellRatio >= 0.6) {
		return '停留时长高'
	}
	if (metrics.quickSkipPenalty > 0) {
		return '快速划走降权'
	}
	if (isColdStartMode()) {
		return '冷启动打散中'
	}
	return '本地规则推荐'
}

function getVideoScore(video) {
	return getRecommendationMetrics(video).score
}

function getRepositoryAffinity(repositoryId) {
	return state.videos
		.filter((video) => video.repositoryId === repositoryId)
		.reduce((total, video) => {
			const interaction = getInteraction(video.id)
			return total + getVideoScore(video) + Number(interaction.playCount || 0) * 0.03
		}, 0)
}

function decorateVideo(video) {
	const interaction = getInteraction(video.id)
	const comments = getCommentsByVideo(video.id)
	const danmakus = getDanmakusByVideo(video.id)
	const likesCount = interaction.playCount * 128 + interaction.playFinishCount * 36 + (interaction.isLiked ? 1 : 0)
	const recommendation = getRecommendationMetrics(video)

	return {
		...video,
		likes: normalizeCount(likesCount),
		comments: comments.length,
		isLiked: interaction.isLiked,
		isFavorited: interaction.isFavorited,
		danmakus: danmakus.map((item) => item.content),
		recommendationScore: recommendation.score,
		recommendationReason: getRecommendationReason(video)
	}
}

async function createRepository(name) {
	await ensureInitialized()
	const trimmed = String(name || '').trim()
	if (!trimmed) {
		throw new Error('Please enter a repository name')
	}

	const repository = {
		id: createId('repo'),
		name: trimmed,
		description: `Repository for ${trimmed}`,
		cover: getGradientBySeed(trimmed),
		coverPath: '',
		videoCount: 0,
		createdAt: Date.now()
	}

	state.repositories = [repository, ...state.repositories]
	MiniProgramStorageAdapter.saveRepository(repository)
	syncRepositoryCounters()
	return repository
}

async function updateVideo(video) {
	await ensureInitialized()
	const normalized = {
		...video,
		title: String(video.title || '').trim() || video.title,
		description: String(video.description || '').trim(),
		preview: String(video.title || '').trim() || video.preview || video.title,
		updatedAt: Date.now()
	}

	state.videos = state.videos.map((item) => (item.id === normalized.id ? normalized : item))
	MiniProgramStorageAdapter.saveVideo(normalized)
	syncRepositoryCounters()
	return normalized
}

async function addComment(videoId, content) {
	await ensureInitialized()
	const trimmed = String(content || '').trim()
	if (!trimmed) {
		return null
	}

	const comment = {
		id: createId('comment'),
		videoId,
		content: trimmed,
		createdAt: Date.now(),
		author: 'Me'
	}

	state.comments = [comment, ...state.comments]
	MiniProgramStorageAdapter.saveComment(comment)
	return comment
}

async function addDanmaku(videoId, content, timePoint = 0, color = '#ffffff') {
	await ensureInitialized()
	const trimmed = String(content || '').trim()
	if (!trimmed) {
		return null
	}

	const danmaku = {
		id: createId('danmaku'),
		videoId,
		content: trimmed,
		color,
		timePoint,
		createdAt: Date.now()
	}

	state.danmakus = [...state.danmakus, danmaku]
	MiniProgramStorageAdapter.saveDanmaku(danmaku)
	return danmaku
}

async function updateInteraction(videoId, patch) {
	await ensureInitialized()
	const current = getInteraction(videoId)
	return replaceInteraction({
		...current,
		...patch,
		videoId
	})
}

async function toggleLike(videoId) {
	await ensureInitialized()
	const current = getInteraction(videoId)
	const nextLiked = !current.isLiked
	return updateInteraction(videoId, {
		isLiked: nextLiked,
		likedAt: nextLiked ? Date.now() : 0,
		lastViewedAt: Date.now()
	})
}

async function toggleFavorite(videoId) {
	await ensureInitialized()
	const current = getInteraction(videoId)
	const nextFavorited = !current.isFavorited
	return updateInteraction(videoId, {
		isFavorited: nextFavorited,
		favoritedAt: nextFavorited ? Date.now() : 0,
		lastViewedAt: Date.now()
	})
}

async function recordPlayback(videoId, payload = {}) {
	await ensureInitialized()
	const current = getInteraction(videoId)
	const dwellSeconds = Math.max(0, Number(payload.dwellSeconds || 0))
	const playIncrement = Math.max(0, Number(payload.playIncrement || 0))
	const finishIncrement = Math.max(0, Number(payload.finishIncrement || 0))
	const quickSwipe = Boolean(payload.quickSwipe)
	const timestamp = payload.lastViewedAt || Date.now()

	return updateInteraction(videoId, {
		dwellSeconds: current.dwellSeconds + dwellSeconds,
		playCount: current.playCount + playIncrement,
		playFinishCount: current.playFinishCount + finishIncrement,
		quickSkipCount: current.quickSkipCount + (quickSwipe ? 1 : 0),
		lastSkippedAt: quickSwipe ? timestamp : current.lastSkippedAt,
		lastViewedAt: timestamp
	})
}

async function updateSettings(patch) {
	await ensureInitialized()
	state.settings = {
		...state.settings,
		...patch
	}
	MiniProgramStorageAdapter.saveSettings(state.settings)
	return state.settings
}

async function updateProfile(patch) {
	await ensureInitialized()
	state.profile = normalizeProfile({
		...state.profile,
		...patch
	})
	MiniProgramStorageAdapter.saveProfile(state.profile)
	return state.profile
}

async function pickProfileImage(field = 'avatarPath') {
	await ensureInitialized()
	const chooseResult = await safeCall('chooseMedia', {
		count: 1,
		mediaType: ['image'],
		sourceType: ['album', 'camera']
	})
	const selectedFile = chooseResult.tempFiles && chooseResult.tempFiles[0]
	if (!selectedFile) {
		return ''
	}

	const tempPath = selectedFile.tempFilePath || selectedFile.path || selectedFile.thumbTempFilePath || ''
	const assetLabel = field === 'backgroundPath' ? '背景图' : '头像'
	let localPath = ''

	try {
		localPath = await saveTempFile(tempPath)
	} catch (error) {
		throw new Error(`${assetLabel}保存失败，请重试`)
	}

	return localPath
}

async function importVideos(repositoryId) {
	await ensureInitialized()
	if (!repositoryId) {
		throw new Error('请先选择仓库')
	}
	if (state.importing) {
		throw new Error('正在导入中，请稍候')
	}

	const repository = getRepositoryById(repositoryId)
	const repositoryName = repository ? repository.name : 'Local Library'
	state.importing = true

	try {
		const chooseResult = await safeCall('chooseMedia', {
			count: 20,
			mediaType: ['video'],
			sourceType: ['album']
		})

		const tempFiles = chooseResult.tempFiles || []
		const imported = []
		const duplicated = []
		const failed = []
		const coverSaveFailed = []

		for (const file of tempFiles) {
			const fingerprint = createVideoFingerprint(file)
			const exists = state.videos.some((item) => item.sourceFingerprint === fingerprint)
			if (exists) {
				duplicated.push(file)
				continue
			}

			try {
				const localPath = await saveTempFile(file.tempFilePath)
				let coverPath = ''
				if (file.thumbTempFilePath) {
					try {
						coverPath = await saveTempFile(file.thumbTempFilePath)
					} catch (error) {
						coverSaveFailed.push({ file, error })
					}
				}
				const fileName = getFileName(file.tempFilePath)
				const title = createImportedTitle(file, repositoryName, state.videos.length + imported.length + 1)

				imported.push({
					id: createId('video'),
					title,
					description: `Imported into ${repositoryName} from the local album.`,
					author: 'Local Import',
					localPath,
					coverPath,
					duration: file.duration || 0,
					width: file.width || 1080,
					height: file.height || 1920,
					repositoryId,
					importedAt: Date.now(),
					updatedAt: Date.now(),
					category: repositoryName,
					palette: getGradientBySeed(fileName),
					preview: title,
					sourceFingerprint: fingerprint
				})
			} catch (error) {
				failed.push({ file, error })
			}
		}

		if (imported.length) {
			state.videos = [...imported, ...state.videos]
			MiniProgramStorageAdapter.saveVideos(state.videos)
			updateRepositoryCover(repositoryId, imported[0].coverPath)
		}

		syncRepositoryCounters()
		MiniProgramStorageAdapter.saveRepositories(state.repositories)

		const summary = {
			imported: imported.length,
			duplicated: duplicated.length,
			failed: failed.length,
			coverFailed: coverSaveFailed.length
		}

		state.lastImportSummary = summary
		return summary
	} finally {
		state.importing = false
	}
}

async function deleteVideos(videoIds = []) {
	await ensureInitialized()
	const uniqueVideoIds = [...new Set(videoIds.filter(Boolean))]
	if (!uniqueVideoIds.length) {
		return {
			deletedVideos: 0
		}
	}

	const videoIdSet = new Set(uniqueVideoIds)
	const videosToDelete = state.videos.filter((item) => videoIdSet.has(item.id))
	if (!videosToDelete.length) {
		return {
			deletedVideos: 0
		}
	}

	await cleanupVideoAssets(videosToDelete)
	state.videos = state.videos.filter((item) => !videoIdSet.has(item.id))
	removeVideoRelations(uniqueVideoIds)
	syncRepositoryCounters()
	MiniProgramStorageAdapter.saveSnapshot(snapshot())

	return {
		deletedVideos: videosToDelete.length
	}
}

async function deleteRepositories(repositoryIds = []) {
	await ensureInitialized()
	const uniqueRepositoryIds = [...new Set(repositoryIds.filter(Boolean))]
	if (!uniqueRepositoryIds.length) {
		return {
			deletedRepositories: 0,
			deletedVideos: 0
		}
	}

	const repositoryIdSet = new Set(uniqueRepositoryIds)
	const repositoriesToDelete = state.repositories.filter((item) => repositoryIdSet.has(item.id))
	if (!repositoriesToDelete.length) {
		return {
			deletedRepositories: 0,
			deletedVideos: 0
		}
	}

	const nonEmptyRepositories = repositoriesToDelete.filter((item) =>
		state.videos.some((video) => video.repositoryId === item.id)
	)
	if (nonEmptyRepositories.length) {
		throw new Error('\u4ec5\u652f\u6301\u5220\u9664\u7a7a\u4ed3\u5e93\uff0c\u8bf7\u5148\u6e05\u7a7a\u4ed3\u5e93\u4e2d\u7684\u89c6\u9891')
	}

	state.repositories = state.repositories.filter((item) => !repositoryIdSet.has(item.id))
	syncRepositoryCounters()
	MiniProgramStorageAdapter.saveSnapshot(snapshot())

	return {
		deletedRepositories: repositoriesToDelete.length,
		deletedVideos: 0
	}
}

async function resetAll() {
	const nextSnapshot = MiniProgramStorageAdapter.reset()
	hydrate(nextSnapshot)
	return nextSnapshot
}

const likedVideos = computed(() => state.videos.filter((video) => getInteraction(video.id).isLiked))
const favoritedVideos = computed(() => state.videos.filter((video) => getInteraction(video.id).isFavorited))
const storageKb = computed(() => estimateSnapshotKb(snapshot()).toFixed(2))
const recommendedVideos = computed(() => {
	return [...state.videos].sort((left, right) => {
		const scoreDiff = getVideoScore(right) - getVideoScore(left)
		if (scoreDiff !== 0) {
			return scoreDiff
		}

		const leftInteraction = getInteraction(left.id)
		const rightInteraction = getInteraction(right.id)
		const activityDiff = Number(rightInteraction.lastViewedAt || 0) - Number(leftInteraction.lastViewedAt || 0)
		if (activityDiff !== 0) {
			return activityDiff
		}

		return Number(right.importedAt || 0) - Number(left.importedAt || 0)
	})
})
const recommendationSummary = computed(() => {
	const topVideo = recommendedVideos.value[0]
	const quickSkipCount = state.interactions.reduce((total, item) => total + Number(item.quickSkipCount || 0), 0)

	return {
		mode: isColdStartMode() ? 'cold' : 'personalized',
		modeLabel: isColdStartMode() ? '冷启动打散' : '本地个性化排序',
		signalCount: getWarmSignalCount(),
		quickSkipCount,
		topReason: topVideo ? getRecommendationReason(topVideo) : '等待导入内容'
	}
})
const profileStats = computed(() => {
	const totalPlayCount = state.interactions.reduce((total, item) => total + Number(item.playCount || 0), 0)
	const totalWatchSeconds = state.interactions.reduce((total, item) => total + Number(item.dwellSeconds || 0), 0)
	const topRepository = state.repositories
		.map((item) => ({
			...item,
			affinity: getRepositoryAffinity(item.id)
		}))
		.sort((left, right) => right.affinity - left.affinity)[0]

	return {
		likedCount: likedVideos.value.length,
		favoritedCount: favoritedVideos.value.length,
		totalPlayCount,
		totalWatchSeconds,
		totalWatchLabel: formatDurationMinutes(totalWatchSeconds),
		topRepositoryName: topRepository ? topRepository.name : '暂无偏好仓库',
		topRepositoryAffinity: topRepository ? Number(topRepository.affinity.toFixed(2)) : 0
	}
})
const recentInteractionVideos = computed(() => {
	return state.videos
		.map((video) => {
			const interaction = getInteraction(video.id)
			const latestComment = state.comments
				.filter((item) => item.videoId === video.id)
				.sort((left, right) => right.createdAt - left.createdAt)[0]
			const latestDanmaku = state.danmakus
				.filter((item) => item.videoId === video.id)
				.sort((left, right) => right.createdAt - left.createdAt)[0]
			const activityCandidates = [
				interaction.likedAt ? { label: '最近点赞', at: interaction.likedAt } : null,
				interaction.favoritedAt ? { label: '最近收藏', at: interaction.favoritedAt } : null,
				latestComment ? { label: '最近评论', at: latestComment.createdAt } : null,
				latestDanmaku ? { label: '最近弹幕', at: latestDanmaku.createdAt } : null,
				interaction.lastViewedAt ? { label: '最近看过', at: interaction.lastViewedAt } : null
			].filter(Boolean)
			const latestActivity = activityCandidates.sort((left, right) => right.at - left.at)[0]
			if (!latestActivity) {
				return null
			}

			return {
				...video,
				activityLabel: latestActivity.label,
				activityAt: latestActivity.at,
				activityTime: formatRelativeTime(latestActivity.at),
				recommendationReason: getRecommendationReason(video),
				recommendationScore: getVideoScore(video),
				likes: decorateVideo(video).likes
			}
		})
		.filter(Boolean)
		.sort((left, right) => right.activityAt - left.activityAt)
})
const storageStats = computed(() => {
	const currentSnapshot = snapshot()
	const sections = [
		{ key: 'videos', label: '视频索引', count: currentSnapshot.videos.length, kb: estimateSnapshotKb(currentSnapshot.videos) },
		{ key: 'repositories', label: '仓库', count: currentSnapshot.repositories.length, kb: estimateSnapshotKb(currentSnapshot.repositories) },
		{ key: 'comments', label: '评论', count: currentSnapshot.comments.length, kb: estimateSnapshotKb(currentSnapshot.comments) },
		{ key: 'danmakus', label: '弹幕', count: currentSnapshot.danmakus.length, kb: estimateSnapshotKb(currentSnapshot.danmakus) },
		{ key: 'interactions', label: '互动记录', count: currentSnapshot.interactions.length, kb: estimateSnapshotKb(currentSnapshot.interactions) }
	].map((item) => ({
		...item,
		kbLabel: `${item.kb.toFixed(2)} KB`
	}))

	const lastActiveAt = Math.max(
		0,
		...state.interactions.map((item) => Number(item.lastViewedAt || 0)),
		...state.comments.map((item) => Number(item.createdAt || 0)),
		...state.danmakus.map((item) => Number(item.createdAt || 0))
	)

	return {
		totalKb: Number(estimateSnapshotKb(currentSnapshot).toFixed(2)),
		totalKbLabel: `${estimateSnapshotKb(currentSnapshot).toFixed(2)} KB`,
		totalRecords: sections.reduce((total, item) => total + item.count, 0),
		sections,
		lastActiveAt,
		lastActiveLabel: lastActiveAt ? formatRelativeTime(lastActiveAt) : '暂无本地互动'
	}
})

export function useTikmyStore() {
	return {
		state,
		storageKb,
		likedVideos,
		favoritedVideos,
		recommendedVideos,
		recommendationSummary,
		profileStats,
		recentInteractionVideos,
		storageStats,
		ensureInitialized,
		getRepositoryById,
		getVideosByRepo,
		getCommentsByVideo,
		getDanmakusByVideo,
		getInteraction,
		getVideoScore,
		getRecommendationReason,
		decorateVideo,
		createRepository,
		updateVideo,
		addComment,
		addDanmaku,
		toggleLike,
		toggleFavorite,
		recordPlayback,
		updateSettings,
		updateProfile,
		pickProfileImage,
		importVideos,
		deleteVideos,
		deleteRepositories,
		resetAll,
		exportableSnapshot: () => MiniProgramStorageAdapter.exportableSnapshot()
	}
}
