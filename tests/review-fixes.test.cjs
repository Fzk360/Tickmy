const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function assert(condition, message) {
	if (!condition) {
		throw new Error(message)
	}
}

function read(relativePath) {
	return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function verifyImportSheet() {
	const source = read('components/import-sheet.vue')
	assert(source.includes(':disabled="props.importing || !props.selectedRepoId"'), 'import-sheet should bind a real disabled state')
	assert(source.includes('if (props.importing || !props.selectedRepoId)'), 'import-sheet should ignore taps while disabled')
}

function verifyStore() {
	const source = read('store/tikmy-store.js')
	assert(/if \(!repositoryId\) \{\s*throw new Error\(/.test(source), 'store.importVideos should reject empty repository ids')
	assert(/if \(state\.importing\) \{\s*throw new Error\(/.test(source), 'store.importVideos should guard concurrent imports')
	assert(source.includes('const activityDiff = Number(rightInteraction.lastViewedAt || 0) - Number(leftInteraction.lastViewedAt || 0)'), 'recommendedVideos should prefer more recent interactions')
	assert(!source.includes('return result.savedFilePath || tempFilePath'), 'saveTempFile should not silently fall back to temp paths')
	assert(source.includes('coverFailed: coverSaveFailed.length'), 'import summary should expose cover persistence failures')
}

function verifyRepoDetailStateIsolation() {
	const source = read('pages/repo/detail.vue')
	assert(source.includes("const currentRepositoryId = ref('')"), 'repo detail should track the current repository independently')
	assert(source.includes("const importTargetRepoId = ref('')"), 'repo detail should track import target repository independently')
	assert(source.includes(':selected-repo-id="importTargetRepoId"'), 'repo detail import sheet should bind to the import target state')
}

function verifyAdapterOrder() {
	let source = read('adapters/mini-program-storage.js')
	source = source.replace(
		"import { createSeedSnapshot } from '../data/seed'",
		"const createSeedSnapshot = () => ({ videos: [], repositories: [], comments: [], danmakus: [], interactions: [], settings: {}, profile: {} })"
	)
	source = source.replace('export const MiniProgramStorageAdapter =', 'const MiniProgramStorageAdapter =')
	source += '\nmodule.exports = { MiniProgramStorageAdapter }\n'

	const storage = {}
	const uni = {
		getStorageSync(key) {
			return storage[key]
		},
		setStorageSync(key, value) {
			storage[key] = value
		}
	}

	const moduleObject = { exports: {} }
	new Function('module', 'exports', 'uni', source)(moduleObject, moduleObject.exports, uni)

	const { MiniProgramStorageAdapter } = moduleObject.exports
	MiniProgramStorageAdapter.saveVideos([
		{ id: 'video-2', title: 'second' },
		{ id: 'video-1', title: 'first' },
		{ id: 'video-3', title: 'third' }
	])

	const snapshot = MiniProgramStorageAdapter.loadAll()
	assert(snapshot.videos.map((item) => item.id).join(',') === 'video-2,video-1,video-3', 'saveVideos should preserve input order')
}

verifyImportSheet()
verifyStore()
verifyRepoDetailStateIsolation()
verifyAdapterOrder()

console.log('review fixes verification passed')
