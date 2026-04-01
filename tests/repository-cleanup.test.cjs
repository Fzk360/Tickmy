const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const archiveRoot = path.join(root, 'archive')
const generatedRoot = path.join(root, 'unpackage')

function assert(condition, message) {
	if (!condition) {
		throw new Error(message)
	}
}

function walk(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true })
	let files = []
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			files = files.concat(walk(fullPath))
			continue
		}
		files.push(fullPath)
	}
	return files
}

function isLegacySnapshot(filePath) {
	return (
		/\.(next|phase3|clean|fixed|ascii)\.(vue|js|json)$/i.test(filePath) ||
		/__new\.(vue|json)$/i.test(filePath) ||
		/test_patch\.txt$/i.test(filePath)
	)
}

function verifyActiveEntrypoints() {
	const expectedFiles = [
		'App.vue',
		'main.js',
		'pages.json',
		'store/tikmy-store.js',
		'adapters/mini-program-storage.js',
		'data/seed.js'
	]

	for (const relativePath of expectedFiles) {
		assert(fs.existsSync(path.join(root, relativePath)), `missing active source file: ${relativePath}`)
	}
}

function verifyLegacySnapshotsArchived() {
	const files = walk(root).filter((filePath) => {
		if (filePath.startsWith(archiveRoot)) {
			return false
		}
		if (filePath.startsWith(generatedRoot)) {
			return false
		}
		return isLegacySnapshot(filePath)
	})

	assert(files.length === 0, `legacy snapshot files still exist in active source tree: ${files.join(', ')}`)
}

function verifyArchiveExists() {
	const archiveSnapshotDir = path.join(root, 'archive', 'legacy-snapshots-2026-04-01')
	assert(fs.existsSync(archiveSnapshotDir), 'archive snapshot directory should exist')
}

verifyActiveEntrypoints()
verifyLegacySnapshotsArchived()
verifyArchiveExists()

console.log('repository cleanup verification passed')
