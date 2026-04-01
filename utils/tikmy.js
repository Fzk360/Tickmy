const gradients = [
	'linear-gradient(135deg, #f97316 0%, #fb7185 48%, #312e81 100%)',
	'linear-gradient(135deg, #22c55e 0%, #0f766e 46%, #164e63 100%)',
	'linear-gradient(135deg, #a855f7 0%, #3b82f6 45%, #1d4ed8 100%)',
	'linear-gradient(135deg, #f59e0b 0%, #ef4444 55%, #7c2d12 100%)',
	'linear-gradient(135deg, #06b6d4 0%, #2563eb 52%, #312e81 100%)'
]

export function createId(prefix = 'id') {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function getGradientBySeed(seed) {
	let sum = 0
	const text = String(seed || 'tikmy')
	for (let index = 0; index < text.length; index += 1) {
		sum += text.charCodeAt(index)
	}
	return gradients[sum % gradients.length]
}

export function getInitials(name = 'T') {
	return String(name).slice(0, 1).toUpperCase()
}

export function getFileName(path = '') {
	const parts = String(path).split('/')
	return parts[parts.length - 1] || `video-${Date.now()}.mp4`
}

export function removeExtension(fileName = '') {
	return String(fileName).replace(/\.[^.]+$/, '')
}

export function isProbablyRandomFileName(fileName = '') {
	const normalized = removeExtension(fileName)
	if (!normalized) {
		return true
	}

	if (normalized.length < 12) {
		return false
	}

	return /^[a-z0-9_-]+$/i.test(normalized)
}

export function createVideoFingerprint(file = {}) {
	const name = file.name || getFileName(file.tempFilePath || '')
	return [name, file.size || 0, file.duration || 0, file.width || 0, file.height || 0].join('|')
}

export function normalizeCount(value) {
	if (value >= 1000) {
		return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace('.0', '')}k`
	}
	return String(value)
}

export function clamp(value, min = 0, max = 1) {
	return Math.min(Math.max(value, min), max)
}

export function formatRelativeTime(timestamp) {
	if (!timestamp) {
		return '刚刚'
	}

	const diff = Math.max(0, Date.now() - Number(timestamp))
	const minute = 60 * 1000
	const hour = 60 * minute
	const day = 24 * hour

	if (diff < minute) {
		return '刚刚'
	}
	if (diff < hour) {
		return `${Math.max(1, Math.round(diff / minute))} 分钟前`
	}
	if (diff < day) {
		return `${Math.max(1, Math.round(diff / hour))} 小时前`
	}
	return `${Math.max(1, Math.round(diff / day))} 天前`
}

export function formatDurationMinutes(seconds = 0) {
	const totalSeconds = Math.max(0, Number(seconds) || 0)
	if (totalSeconds < 60) {
		return `${Math.max(1, Math.round(totalSeconds))} 秒`
	}

	const minutes = totalSeconds / 60
	if (minutes < 60) {
		return `${minutes.toFixed(minutes >= 10 ? 0 : 1).replace('.0', '')} 分钟`
	}

	const hours = minutes / 60
	return `${hours.toFixed(hours >= 10 ? 0 : 1).replace('.0', '')} 小时`
}

export function createDeterministicValue(seed = 'tikmy') {
	let hash = 0
	const text = String(seed)
	for (let index = 0; index < text.length; index += 1) {
		hash = (hash * 31 + text.charCodeAt(index)) % 1000003
	}
	return (hash % 1000) / 1000
}

export function estimateSnapshotKb(snapshot) {
	return JSON.stringify(snapshot).length / 1024
}

export function safeCall(apiName, options = {}) {
	return new Promise((resolve, reject) => {
		uni[apiName]({
			...options,
			success: resolve,
			fail: reject
		})
	})
}
