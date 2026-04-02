<template>
	<view class="feed-card" :class="{ 'feed-card--fullscreen': landscapeFullscreen }" :style="{ background: video.palette }">
		<view class="feed-noise" />

		<view class="feed-top-actions">
			<button class="feed-top-pill tm-glass" @tap="cycleSpeed">
				<text class="feed-top-pill__icon">倍速</text>
				<text class="feed-top-pill__text">{{ playbackRateLabel }}</text>
			</button>
			<button class="feed-top-pill tm-glass" :class="{ 'feed-top-pill--muted': !showDanmaku }" @tap="toggleDanmaku">
				<text class="feed-top-pill__text">{{ showDanmaku ? '弹幕开' : '弹幕关' }}</text>
			</button>
			<button class="feed-top-pill tm-glass" @tap="openDanmakuInput">
				<text class="feed-top-pill__text">发弹幕</text>
			</button>
		</view>

		<view
			:id="surfaceId"
			class="feed-surface"
			@tap="togglePlay"
			@touchstart="handleSurfaceTouchStart"
			@touchmove="handleSurfaceTouchMove"
			@touchend="handleSurfaceTouchEnd"
			@touchcancel="handleSurfaceTouchCancel"
		>
			<video
				v-if="shouldRenderVideo"
				:id="playerId"
				class="feed-video"
				:style="videoSurfaceStyle"
				:src="video.localPath"
				:poster="video.coverPath"
				:autoplay="isActive"
				:loop="true"
				:muted="false"
				:controls="false"
				:show-center-play-btn="false"
				:show-mute-btn="false"
				:show-fullscreen-btn="false"
				:enable-progress-gesture="false"
				:vslide-gesture="false"
				:vslide-gesture-in-fullscreen="false"
				:page-gesture="false"
				:enable-play-gesture="false"
				:playback-rate="effectivePlaybackRate"
				object-fit="cover"
				@loadedmetadata="handleLoadedMetadata"
				@rendererror="handleRenderError"
				@play="handlePlay"
				@pause="handlePause"
				@ended="handleEnded"
				@timeupdate="handleTimeUpdate"
				@error="handleError"
			/>
			<image
				v-else-if="showPreviewImage"
				class="feed-preview__image"
				:style="previewSurfaceStyle"
				:src="previewImage"
				mode="aspectFill"
			/>
			<view v-else class="feed-placeholder">
				<text class="feed-placeholder__label">暂无本地视频</text>
				<text class="feed-placeholder__copy">导入本地视频后，这里会切换成真实播放体验。</text>
			</view>

			<text class="feed-preview__badge">{{ statusText }}</text>
			<text v-if="showPreviewTitle" class="feed-preview__title">{{ video.preview }}</text>
			<text v-if="showPreviewTip" class="feed-preview__tip">{{ previewTip }}</text>
			<view
				v-if="gestureHud.visible"
				class="gesture-hud tm-glass"
				:class="{ 'gesture-hud--fullscreen': landscapeFullscreen }"
			>
				<text class="gesture-hud__label">{{ gestureHud.label }}</text>
				<text class="gesture-hud__value">{{ gestureHud.value }}</text>
				<view v-if="gestureHud.ratio >= 0" class="gesture-hud__bar">
					<view class="gesture-hud__fill" :style="{ width: `${gestureHud.ratio * 100}%` }" />
				</view>
			</view>
		</view>

		<view v-if="showDanmaku" class="danmaku-layer" :class="{ 'danmaku-layer--fullscreen': landscapeFullscreen }">
			<text
				v-for="(item, index) in visibleDanmakus"
				:key="`${video.id}-${item.id}-${index}`"
				class="danmaku-item"
				:class="{ 'danmaku-item--fullscreen': landscapeFullscreen }"
				:style="{ top: `${96 + (index % 4) * 58}rpx`, color: item.color || '#ffffff' }"
			>
				{{ item.content }}
			</text>
		</view>

		<view class="feed-copy">
			<text class="feed-author">@{{ video.author }}</text>
			<text class="feed-title">{{ video.title }}</text>
			<text class="feed-description">{{ video.description }}</text>
			<view class="tm-pill feed-tag">{{ repoName }}</view>
		</view>

		<view v-if="props.isCurrent" class="feed-progress tm-glass" @tap.stop>
			<view class="feed-progress__meta">
				<text class="feed-progress__label">播放进度</text>
				<text class="feed-progress__time">{{ progressDisplayTime }}</text>
			</view>
			<view
				:id="progressTrackId"
				class="feed-progress__track"
				@touchstart.stop="handleProgressTouchStart"
				@touchmove.stop.prevent="handleProgressTouchMove"
				@touchend.stop="handleProgressTouchEnd"
				@touchcancel.stop="handleProgressTouchCancel"
			>
				<view class="feed-progress__fill" :style="{ width: `${progressRatio * 100}%` }" />
				<view class="feed-progress__thumb" :style="{ left: `${progressRatio * 100}%` }" />
			</view>
		</view>

		<view class="feed-side-actions">
			<view class="action-group">
				<button class="action-icon tm-glass" @tap.stop="handleToggleLike">
					<text :class="{ 'action-icon--active': decoratedVideo.isLiked }">♥</text>
				</button>
				<text class="action-text">{{ decoratedVideo.likes }}</text>
			</view>

			<view class="action-group">
				<button class="action-icon tm-glass" @tap.stop="showComments = true">
					<view class="icon-bubble">
						<view class="icon-bubble__tail" />
					</view>
				</button>
				<text class="action-text">{{ commentList.length }}</text>
			</view>

			<view class="action-group">
				<button class="action-icon tm-glass" @tap.stop="handleToggleFavorite">
					<text class="icon-favorite-star" :class="{ 'icon-favorite-star--active': decoratedVideo.isFavorited }">&#9733;</text>
				</button>
				<text class="action-text">{{ decoratedVideo.isFavorited ? '已收藏' : '收藏' }}</text>
			</view>
		</view>

		<comment-sheet
			:open="showComments"
			:count="commentList.length"
			:comment-list="commentList"
			@close="showComments = false"
			@send="handleSendComment"
		/>
		<button
			v-if="isLandscapeVideo && props.isCurrent"
			class="feed-fullscreen-toggle tm-glass"
			:class="{ 'feed-fullscreen-toggle--active': landscapeFullscreen }"
			@tap.stop="toggleLandscapeFullscreen"
		>
			<view :class="landscapeFullscreen ? 'icon-collapse' : 'icon-expand'" />
		</button>
	</view>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import CommentSheet from './comment-sheet.vue'
import { useTikmyStore } from '../store/tikmy-store'

const props = defineProps({
	video: {
		type: Object,
		required: true
	},
	repoName: {
		type: String,
		default: ''
	},
	isCurrent: {
		type: Boolean,
		default: false
	},
	isActive: {
		type: Boolean,
		default: false
	}
})

const store = useTikmyStore()
const instance = getCurrentInstance()
const speedOptions = [0.75, 1, 1.25, 1.5, 2]
const QUICK_SWIPE_SECONDS = 3

const showComments = ref(false)
const zoomed = ref(false)
const pinchScale = ref(1)
const pinchActive = ref(false)
const pinchStartDistance = ref(0)
const pinchStartScale = ref(1)
const suppressTapUntil = ref(0)
const surfaceRect = ref({ left: 0, top: 0, width: 0, height: 0 })
const surfaceTouchStartPoint = ref({ x: 0, y: 0 })
const temporaryPlaybackRate = ref(0)
const holdSpeedActive = ref(false)
const fullscreenGestureMode = ref('')
const screenBrightness = ref(0.5)
const fullscreenBrightnessStart = ref(0.5)
const fullscreenBrightnessOrigin = ref(null)
const gestureHud = ref({
	visible: false,
	label: '',
	value: '',
	ratio: -1
})
const landscapeFullscreen = ref(false)
const playing = ref(false)
const currentTime = ref(0)
const sessionAnchor = ref(0)
const sessionCounted = ref(false)
const playerError = ref(false)
const mediaDuration = ref(Number(props.video.duration) || 0)
const mediaWidth = ref(Number(props.video.width) || 0)
const mediaHeight = ref(Number(props.video.height) || 0)
const progressTrackRect = ref({ left: 0, width: 0 })
const seeking = ref(false)
const seekPreviewTime = ref(0)
const shouldResumeAfterSeek = ref(false)
let videoContext = null
let holdSpeedTimer = null
let gestureHudTimer = null
const progressTrackId = `progress_${props.video.id}`
const playerId = `player_${props.video.id}`
const surfaceId = `surface_${props.video.id}`

const hasPlayableSource = computed(() => !!props.video.localPath)
const shouldRenderVideo = computed(() => hasPlayableSource.value && props.isCurrent && !playerError.value)
const previewImage = computed(() => props.video.coverPath || '')
const showPreviewImage = computed(() => !!previewImage.value)
const showDanmaku = computed(() => store.state.settings.showDanmaku !== false)
const playbackRate = computed(() => Number(store.state.settings.defaultSpeed || 1))
const effectivePlaybackRate = computed(() => temporaryPlaybackRate.value || playbackRate.value)
const playbackRateLabel = computed(() => `${effectivePlaybackRate.value}x`)
const decoratedVideo = computed(() => store.decorateVideo(props.video))
const commentList = computed(() => store.getCommentsByVideo(props.video.id))
const danmakuList = computed(() => store.getDanmakusByVideo(props.video.id))
const visibleDanmakus = computed(() => {
	if (!showDanmaku.value) {
		return []
	}
	return danmakuList.value.filter((item) => {
		const elapsed = currentTime.value - Number(item.timePoint || 0)
		return elapsed >= 0 && elapsed <= 4
	})
})
const showPreviewTitle = computed(() => !hasPlayableSource.value)
const showPreviewTip = computed(() => !hasPlayableSource.value)
const isLandscapeVideo = computed(() => mediaWidth.value > mediaHeight.value && mediaHeight.value > 0)
const sliderMax = computed(() => Math.max(0.1, mediaDuration.value || 0, Number(props.video.duration) || 0, currentTime.value || 0))
const sliderValue = computed(() => Math.min(sliderMax.value, Math.max(0, seeking.value ? seekPreviewTime.value : currentTime.value || 0)))
const mediaScale = computed(() => clampScale((zoomed.value ? 1.06 : 1) * pinchScale.value))
const videoSurfaceStyle = computed(() => {
	if (!landscapeFullscreen.value) {
		return {
			transform: `scale(${mediaScale.value})`
		}
	}
	return {
		inset: 'auto',
		left: '50%',
		top: '50%',
		width: '100vh',
		height: '100vw',
		transform: `translate(-50%, -50%) rotate(90deg) scale(${mediaScale.value})`
	}
})
const previewSurfaceStyle = computed(() => {
	if (!landscapeFullscreen.value) {
		return {
			transform: `scale(${mediaScale.value})`
		}
	}
	return {
		inset: 'auto',
		left: '50%',
		top: '50%',
		width: '100vh',
		height: '100vw',
		transform: `translate(-50%, -50%) rotate(90deg) scale(${mediaScale.value})`
	}
})
const progressRatio = computed(() => {
	if (!sliderMax.value) {
		return 0
	}
	return Math.min(1, Math.max(0, sliderValue.value / sliderMax.value))
})
const progressDisplayTime = computed(() => {
	const current = formatProgressTime(sliderValue.value)
	const total = formatProgressTime(sliderMax.value)
	return `${current} / ${total}`
})
const previewTip = computed(() => {
	if (!hasPlayableSource.value) {
		return '点击切换播放，长按可放大预览。'
	}
	return '上滑切换下一条，当前视频会自动暂停。'
})
const statusText = computed(() => {
	if (!hasPlayableSource.value) {
		return playerError.value ? '仅预览' : '导入后可播放'
	}
	if (!props.isCurrent) {
		return '待播放'
	}
	return playing.value ? '播放中' : '已暂停'
})

function ensureContext() {
	if (!videoContext && instance && instance.proxy) {
		videoContext = uni.createVideoContext(playerId, instance.proxy)
	}
	return videoContext
}

function measureProgressTrack() {
	return new Promise((resolve) => {
		if (!instance || !instance.proxy) {
			resolve(progressTrackRect.value)
			return
		}

		uni.createSelectorQuery()
			.in(instance.proxy)
			.select(`#${progressTrackId}`)
			.boundingClientRect((rect) => {
				if (rect && rect.width) {
					progressTrackRect.value = {
						left: rect.left,
						width: rect.width
					}
				}
				resolve(progressTrackRect.value)
			})
			.exec()
	})
}

function measureSurfaceRect() {
	return new Promise((resolve) => {
		if (!instance || !instance.proxy) {
			resolve(surfaceRect.value)
			return
		}

		uni.createSelectorQuery()
			.in(instance.proxy)
			.select(`#${surfaceId}`)
			.boundingClientRect((rect) => {
				if (rect && rect.width) {
					surfaceRect.value = {
						left: rect.left,
						top: rect.top,
						width: rect.width,
						height: rect.height
					}
				}
				resolve(surfaceRect.value)
			})
			.exec()
	})
}

function applyPlaybackRate() {
	const context = ensureContext()
	if (context && typeof context.playbackRate === 'function') {
		try {
			context.playbackRate(effectivePlaybackRate.value)
		} catch (error) {
			// Ignore unsupported playback rate changes on older runtimes.
		}
	}
}

function formatProgressTime(value) {
	const totalSeconds = Math.max(0, Math.floor(Number(value) || 0))
	const minutes = `${Math.floor(totalSeconds / 60)}`.padStart(2, '0')
	const seconds = `${totalSeconds % 60}`.padStart(2, '0')
	return `${minutes}:${seconds}`
}

function clampScale(value) {
	return Math.min(3, Math.max(0.75, Number(value) || 1))
}

function getTouchDistance(event) {
	const touches = (event && event.touches) || []
	if (touches.length < 2) {
		return 0
	}

	const [firstTouch, secondTouch] = touches
	const deltaX = Number((firstTouch.pageX || firstTouch.clientX || 0) - (secondTouch.pageX || secondTouch.clientX || 0))
	const deltaY = Number((firstTouch.pageY || firstTouch.clientY || 0) - (secondTouch.pageY || secondTouch.clientY || 0))
	return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
}

function getSurfaceTouchPoint(event) {
	const touch =
		(event && event.touches && event.touches[0]) ||
		(event && event.changedTouches && event.changedTouches[0]) ||
		null
	return {
		x: Number(touch && (touch.clientX || touch.pageX) ? touch.clientX || touch.pageX : 0),
		y: Number(touch && (touch.clientY || touch.pageY) ? touch.clientY || touch.pageY : 0)
	}
}

function resetSurfaceScale() {
	pinchScale.value = 1
	pinchActive.value = false
	pinchStartDistance.value = 0
	pinchStartScale.value = 1
	suppressTapUntil.value = 0
}

function clearHoldSpeedTimer() {
	if (holdSpeedTimer) {
		clearTimeout(holdSpeedTimer)
		holdSpeedTimer = null
	}
}

function clearGestureHudTimer() {
	if (gestureHudTimer) {
		clearTimeout(gestureHudTimer)
		gestureHudTimer = null
	}
}

function showGestureHud(label, value, ratio = -1, options = {}) {
	clearGestureHudTimer()
	gestureHud.value = {
		visible: true,
		label,
		value,
		ratio
	}

	if (options.persistent) {
		return
	}

	gestureHudTimer = setTimeout(() => {
		gestureHud.value = {
			visible: false,
			label: '',
			value: '',
			ratio: -1
		}
	}, options.duration || 600)
}

function hideGestureHud() {
	clearGestureHudTimer()
	gestureHud.value = {
		visible: false,
		label: '',
		value: '',
		ratio: -1
	}
}

function stopHoldSpeedPlayback() {
	clearHoldSpeedTimer()
	if (!holdSpeedActive.value && !temporaryPlaybackRate.value) {
		return
	}

	holdSpeedActive.value = false
	temporaryPlaybackRate.value = 0
	applyPlaybackRate()
	hideGestureHud()
}

function clampUnit(value) {
	return Math.min(1, Math.max(0, Number(value) || 0))
}

function resetFullscreenGestureState() {
	fullscreenGestureMode.value = ''
	hideGestureHud()
}

function getSurfaceTouchXRatio(pointX) {
	if (!surfaceRect.value.width) {
		return 0.5
	}
	return (pointX - surfaceRect.value.left) / surfaceRect.value.width
}

function getFullscreenSideRatio(point) {
	if (landscapeFullscreen.value && surfaceRect.value.height) {
		return (point.y - surfaceRect.value.top) / surfaceRect.value.height
	}
	return getSurfaceTouchXRatio(point.x)
}

function getRelativeVerticalDelta(point) {
	if (landscapeFullscreen.value) {
		return surfaceTouchStartPoint.value.x - point.x
	}
	return point.y - surfaceTouchStartPoint.value.y
}

function getRelativeHorizontalDelta(point) {
	if (landscapeFullscreen.value) {
		return point.y - surfaceTouchStartPoint.value.y
	}
	return point.x - surfaceTouchStartPoint.value.x
}

function updateBrightnessHud(value) {
	const nextValue = clampUnit(value)
	showGestureHud('\u4eae\u5ea6', `${Math.round(nextValue * 100)}%`, nextValue, { persistent: true })
}

function updateVolumeUnsupportedHud() {
	showGestureHud(
		'\u97f3\u91cf',
		'\u5f53\u524d\u5fae\u4fe1\u5c0f\u7a0b\u5e8f\u4e0d\u652f\u6301\u7a0b\u5e8f\u5185\u8c03\u8282\u7cfb\u7edf\u97f3\u91cf',
		-1,
		{ persistent: true }
	)
}

async function ensureScreenBrightness() {
	try {
		const result = await new Promise((resolve, reject) => {
			uni.getScreenBrightness({
				success: resolve,
				fail: reject
			})
		})
		const nextValue = clampUnit(result && result.value)
		screenBrightness.value = nextValue
		fullscreenBrightnessOrigin.value = nextValue
		return nextValue
	} catch (error) {
		return screenBrightness.value
	}
}

async function applyScreenBrightness(value) {
	const nextValue = clampUnit(value)
	try {
		await new Promise((resolve, reject) => {
			uni.setScreenBrightness({
				value: nextValue,
				success: resolve,
				fail: reject
			})
		})
		screenBrightness.value = nextValue
		updateBrightnessHud(nextValue)
	} catch (error) {
		showGestureHud('\u4eae\u5ea6', '\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u4eae\u5ea6\u8c03\u8282', -1, { duration: 1000 })
	}
}

async function restoreScreenBrightness() {
	if (fullscreenBrightnessOrigin.value == null) {
		return
	}

	try {
		await new Promise((resolve, reject) => {
			uni.setScreenBrightness({
				value: clampUnit(fullscreenBrightnessOrigin.value),
				success: resolve,
				fail: reject
			})
		})
		screenBrightness.value = clampUnit(fullscreenBrightnessOrigin.value)
	} catch (error) {
		// Ignore restore failures on unsupported runtimes.
	}
}

function getClientXFromTouchEvent(event) {
	const touch =
		(event && event.touches && event.touches[0]) ||
		(event && event.changedTouches && event.changedTouches[0]) ||
		null
	return Number(touch && touch.clientX ? touch.clientX : 0)
}

function getSeekTimeByClientX(clientX) {
	const rect = progressTrackRect.value
	if (!rect.width) {
		return 0
	}

	const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
	return Number((sliderMax.value * ratio).toFixed(2))
}

function beginSeekSession() {
	if (!hasPlayableSource.value) {
		return false
	}

	shouldResumeAfterSeek.value = playing.value
	if (playing.value) {
		pausePlayback()
	}
	seeking.value = true
	return true
}

async function updateSeekPreviewFromEvent(event) {
	await measureProgressTrack()
	const clientX = getClientXFromTouchEvent(event)
	if (!clientX) {
		return
	}

	seekPreviewTime.value = getSeekTimeByClientX(clientX)
}

function commitSeek() {
	if (!seeking.value) {
		return
	}

	const nextTime = Math.min(sliderMax.value, Math.max(0, seekPreviewTime.value || 0))
	currentTime.value = nextTime
	const context = ensureContext()
	if (context && typeof context.seek === 'function') {
		context.seek(nextTime)
	}

	seeking.value = false
	if (shouldResumeAfterSeek.value) {
		playPlayback()
	}
	shouldResumeAfterSeek.value = false
}

function cancelSeek() {
	seeking.value = false
	seekPreviewTime.value = currentTime.value
	if (shouldResumeAfterSeek.value) {
		playPlayback()
	}
	shouldResumeAfterSeek.value = false
}

function flushDwell(options = {}) {
	if (!playing.value) {
		return
	}

	const elapsed = Math.max(0, Number((currentTime.value - sessionAnchor.value).toFixed(1)))
	playing.value = false
	sessionAnchor.value = currentTime.value

	if (elapsed > 0) {
		store.recordPlayback(props.video.id, {
			dwellSeconds: elapsed,
			quickSwipe:
				Boolean(options.markQuickSwipe) &&
				elapsed <= Math.min(QUICK_SWIPE_SECONDS, Math.max(2, Number(props.video.duration || 0) * 0.25)) &&
				!decoratedVideo.value.isLiked &&
				!decoratedVideo.value.isFavorited,
			lastViewedAt: Date.now()
		})
	}
}

function pausePlayback(options = {}) {
	if (!hasPlayableSource.value) {
		playing.value = false
		return
	}

	const context = ensureContext()
	if (context && typeof context.pause === 'function') {
		context.pause()
	}
	flushDwell(options)
}

async function playPlayback() {
	if (!hasPlayableSource.value) {
		return
	}

	await nextTick()
	videoContext = null
	const context = ensureContext()
	if (context && typeof context.play === 'function') {
		context.play()
	}
	applyPlaybackRate()
}

function syncPlayback(active) {
	if (active) {
		playPlayback()
	} else {
		pausePlayback()
	}
}

function cycleSpeed() {
	const currentIndex = speedOptions.findIndex((item) => item === playbackRate.value)
	const nextValue = speedOptions[(currentIndex + 1 + speedOptions.length) % speedOptions.length]
	store.updateSettings({
		defaultSpeed: nextValue
	})
	applyPlaybackRate()
}

function toggleDanmaku() {
	store.updateSettings({
		showDanmaku: !showDanmaku.value
	})
}

function togglePlay() {
	if (!hasPlayableSource.value) {
		return
	}
	if (Date.now() < suppressTapUntil.value) {
		return
	}

	if (playing.value) {
		pausePlayback()
	} else {
		playPlayback()
	}
}

function toggleLandscapeFullscreen() {
	if (!isLandscapeVideo.value) {
		return
	}

	landscapeFullscreen.value = !landscapeFullscreen.value
	if (landscapeFullscreen.value) {
		measureSurfaceRect()
		ensureScreenBrightness()
	} else {
		stopHoldSpeedPlayback()
		resetFullscreenGestureState()
		restoreScreenBrightness()
	}
	uni.$emit('tikmy:landscape-fullscreen', {
		active: landscapeFullscreen.value,
		videoId: props.video.id
	})
}

function handleSurfaceTouchStart(event) {
	const distance = getTouchDistance(event)
	if (distance) {
		clearHoldSpeedTimer()
		stopHoldSpeedPlayback()
		resetFullscreenGestureState()
		pinchActive.value = true
		pinchStartDistance.value = distance
		pinchStartScale.value = pinchScale.value
		suppressTapUntil.value = Date.now() + 300
		return
	}

	const touches = (event && event.touches) || []
	if (touches.length !== 1 || !hasPlayableSource.value || !props.isCurrent) {
		return
	}

	const point = getSurfaceTouchPoint(event)
	surfaceTouchStartPoint.value = point
	fullscreenGestureMode.value = ''
	clearHoldSpeedTimer()
	holdSpeedTimer = setTimeout(async () => {
		await measureSurfaceRect()
		const rect = surfaceRect.value
		if (!rect.width || pinchActive.value || seeking.value || fullscreenGestureMode.value) {
			return
		}

		const sideRatio = getFullscreenSideRatio(point)
		if (sideRatio <= 0.35 || sideRatio >= 0.65) {
			holdSpeedActive.value = true
			temporaryPlaybackRate.value = 2
			suppressTapUntil.value = Date.now() + 300
			applyPlaybackRate()
			showGestureHud('\u500d\u901f\u64ad\u653e', '2x', 1, { persistent: true })
		}
	}, 220)
}

function handleSurfaceTouchMove(event) {
	if (pinchActive.value) {
		const distance = getTouchDistance(event)
		if (!distance || !pinchStartDistance.value) {
			return
		}

		pinchScale.value = clampScale((distance / pinchStartDistance.value) * pinchStartScale.value)
		suppressTapUntil.value = Date.now() + 300
		return
	}

	const touches = (event && event.touches) || []
	if (touches.length !== 1) {
		return
	}

	const point = getSurfaceTouchPoint(event)
	const deltaX = Math.abs(point.x - surfaceTouchStartPoint.value.x)
	const deltaY = point.y - surfaceTouchStartPoint.value.y
	const relativeVerticalDelta = getRelativeVerticalDelta(point)
	const relativeHorizontalDelta = getRelativeHorizontalDelta(point)
	const absRelativeVerticalDelta = Math.abs(relativeVerticalDelta)
	const absRelativeHorizontalDelta = Math.abs(relativeHorizontalDelta)
	const sideRatio = getFullscreenSideRatio(surfaceTouchStartPoint.value)

	if (landscapeFullscreen.value) {
		if (!fullscreenGestureMode.value && absRelativeVerticalDelta > 18 && absRelativeVerticalDelta > absRelativeHorizontalDelta) {
			clearHoldSpeedTimer()
			stopHoldSpeedPlayback()
			suppressTapUntil.value = Date.now() + 300
			if (sideRatio <= 0.35) {
				fullscreenGestureMode.value = 'brightness'
				fullscreenBrightnessStart.value = screenBrightness.value
				updateBrightnessHud(screenBrightness.value)
			} else if (sideRatio >= 0.65) {
				fullscreenGestureMode.value = 'volume'
				updateVolumeUnsupportedHud()
			}
		}

		if (fullscreenGestureMode.value === 'brightness') {
			const nextBrightness = clampUnit(fullscreenBrightnessStart.value - relativeVerticalDelta / 360)
			applyScreenBrightness(nextBrightness)
			return
		}

		if (fullscreenGestureMode.value === 'volume') {
			updateVolumeUnsupportedHud()
			return
		}
	}

	if (deltaX > 14 || absDeltaY > 14) {
		clearHoldSpeedTimer()
		if (holdSpeedActive.value && (deltaX > 24 || absDeltaY > 24)) {
			stopHoldSpeedPlayback()
		}
	}
}

function handleSurfaceTouchEnd(event) {
	const remainingTouches = (event && event.touches) || []
	if (remainingTouches.length >= 2) {
		const distance = getTouchDistance(event)
		if (distance) {
			pinchStartDistance.value = distance
			pinchStartScale.value = pinchScale.value
		}
		return
	}

	clearHoldSpeedTimer()
	if (holdSpeedActive.value) {
		stopHoldSpeedPlayback()
		suppressTapUntil.value = Date.now() + 300
	}
	if (fullscreenGestureMode.value) {
		suppressTapUntil.value = Date.now() + 300
		resetFullscreenGestureState()
	}

	if (pinchActive.value) {
		pinchActive.value = false
		pinchStartDistance.value = 0
		pinchStartScale.value = pinchScale.value
		suppressTapUntil.value = Date.now() + 300
	}
}

function handleSurfaceTouchCancel() {
	clearHoldSpeedTimer()
	stopHoldSpeedPlayback()
	resetFullscreenGestureState()
	pinchActive.value = false
	pinchStartDistance.value = 0
	pinchStartScale.value = pinchScale.value
}

async function handleProgressTouchStart(event) {
	if (!beginSeekSession()) {
		return
	}

	await updateSeekPreviewFromEvent(event)
}

async function handleProgressTouchMove(event) {
	if (!seeking.value) {
		return
	}

	await updateSeekPreviewFromEvent(event)
}

function handleProgressTouchEnd() {
	commitSeek()
}

function handleProgressTouchCancel() {
	cancelSeek()
}

function handlePlay() {
	playerError.value = false
	playing.value = true
	sessionAnchor.value = currentTime.value
	if (!sessionCounted.value) {
		sessionCounted.value = true
		store.recordPlayback(props.video.id, {
			playIncrement: 1,
			lastViewedAt: Date.now()
		})
	}
}

function handleLoadedMetadata(event) {
	const detail = event.detail || {}
	const duration = Number(detail.duration) || 0
	const width = Number(detail.width) || 0
	const height = Number(detail.height) || 0
	if (duration > 0) {
		mediaDuration.value = duration
	}
	if (width > 0) {
		mediaWidth.value = width
	}
	if (height > 0) {
		mediaHeight.value = height
	}
}

function handleRenderError(event) {
	console.warn('feed-card video render error', event)
}

function handlePause() {
	flushDwell()
}

function handleEnded() {
	flushDwell()
	store.recordPlayback(props.video.id, {
		finishIncrement: 1,
		lastViewedAt: Date.now()
	})
	sessionCounted.value = false
}

function handleTimeUpdate(event) {
	const nextTime = Number(event.detail && event.detail.currentTime) || 0
	const duration = Number(event.detail && event.detail.duration) || 0
	if (duration > 0) {
		mediaDuration.value = duration
	}
	currentTime.value = nextTime
}

function handleError() {
	playerError.value = true
	playing.value = false
}

async function handleToggleLike() {
	await store.toggleLike(props.video.id)
}

async function handleToggleFavorite() {
	await store.toggleFavorite(props.video.id)
}

async function handleSendComment(content) {
	await store.addComment(props.video.id, content)
}

async function openDanmakuInput() {
	const result = await new Promise((resolve, reject) => {
		uni.showModal({
			title: '发送弹幕',
			editable: true,
			placeholderText: '输入一句弹幕',
			success: resolve,
			fail: reject
		})
	})

	if (!result.confirm || !String(result.content || '').trim()) {
		return
	}

	await store.addDanmaku(props.video.id, result.content, Math.floor(currentTime.value))
}

watch(
	() => props.isActive,
	(active) => {
		if (!active) {
			landscapeFullscreen.value = false
			stopHoldSpeedPlayback()
			resetFullscreenGestureState()
			resetSurfaceScale()
			zoomed.value = false
			restoreScreenBrightness()
			uni.$emit('tikmy:landscape-fullscreen', {
				active: false,
				videoId: props.video.id
			})
			if (props.isCurrent) {
				pausePlayback()
			}
			currentTime.value = 0
		} else {
			videoContext = null
			syncPlayback(active)
		}
		playerError.value = false
		sessionCounted.value = active ? sessionCounted.value : false
	},
	{ immediate: true }
)

watch(
	() => props.isCurrent,
	(isCurrent) => {
		if (!isCurrent) {
			landscapeFullscreen.value = false
			stopHoldSpeedPlayback()
			resetFullscreenGestureState()
			resetSurfaceScale()
			zoomed.value = false
			restoreScreenBrightness()
			uni.$emit('tikmy:landscape-fullscreen', {
				active: false,
				videoId: props.video.id
			})
			pausePlayback({
				markQuickSwipe: true
			})
			currentTime.value = 0
			videoContext = null
		} else {
			nextTick(() => {
				videoContext = null
				ensureContext()
				measureProgressTrack()
				measureSurfaceRect()
			})
		}
	}
)

watch(playbackRate, () => {
	applyPlaybackRate()
})

watch(
	() => props.isCurrent,
	async (isCurrent) => {
		if (isCurrent) {
			await nextTick()
			measureProgressTrack()
			measureSurfaceRect()
		}
	}
)

onMounted(() => {
	nextTick(() => {
		if (props.isCurrent) {
			videoContext = null
			ensureContext()
		}
		measureProgressTrack()
		measureSurfaceRect()
		setTimeout(() => {
			measureProgressTrack()
			measureSurfaceRect()
		}, 200)
	})
})

onUnmounted(() => {
	landscapeFullscreen.value = false
	stopHoldSpeedPlayback()
	resetFullscreenGestureState()
	resetSurfaceScale()
	zoomed.value = false
	restoreScreenBrightness()
	uni.$emit('tikmy:landscape-fullscreen', {
		active: false,
		videoId: props.video.id
	})
	flushDwell()
})
</script>

<style lang="scss" scoped>
.feed-card {
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.feed-card--fullscreen {
	position: fixed;
	inset: 0;
	z-index: 140;
	background: #000000 !important;
}

.feed-noise {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.16), transparent 24%),
		radial-gradient(circle at 78% 18%, rgba(255, 255, 255, 0.08), transparent 18%),
		linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.54));
}

.feed-top-actions {
	position: absolute;
	top: 292rpx;
	right: 24rpx;
	z-index: 10;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.feed-top-pill {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 16rpx 24rpx;
	border-radius: 999rpx;
}

.feed-top-pill--icon {
	justify-content: center;
	width: 84rpx;
	height: 84rpx;
	padding: 0;
}

.feed-top-pill--muted {
	opacity: 0.52;
}

.feed-top-pill__icon,
.feed-top-pill__text {
	font-size: 22rpx;
	font-weight: 700;
}

.feed-surface {
	position: absolute;
	inset: 0;
	overflow: hidden;
}

.feed-video,
.feed-preview__image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	transition: transform 0.2s ease;
	transform-origin: center center;
}

.feed-preview__image {
	opacity: 0.74;
}

.feed-placeholder {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 0 56rpx;
	text-align: center;
	background:
		radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.22), transparent 18%),
		linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
}

.feed-placeholder__label {
	font-size: 32rpx;
	font-weight: 700;
}

.feed-placeholder__copy {
	margin-top: 16rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.65);
}

.feed-preview__badge {
	position: absolute;
	top: 22rpx;
	left: 22rpx;
	z-index: 2;
	padding: 12rpx 24rpx;
	border-radius: 999rpx;
	background: rgba(0, 0, 0, 0.34);
	font-size: 22rpx;
	font-weight: 700;
}

.feed-preview__title {
	position: relative;
	z-index: 2;
	margin-top: 28rpx;
	font-size: 56rpx;
	font-weight: 700;
	letter-spacing: 8rpx;
}

.feed-preview__tip {
	position: relative;
	z-index: 2;
	margin-top: 20rpx;
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.56);
}

.gesture-hud {
	position: absolute;
	left: 50%;
	top: 50%;
	z-index: 18;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14rpx;
	width: 320rpx;
	padding: 28rpx 24rpx;
	border-radius: 28rpx;
	transform: translate(-50%, -50%);
	text-align: center;
}

.gesture-hud--fullscreen {
	transform: translate(-50%, -50%) rotate(90deg);
	transform-origin: center center;
}

.gesture-hud__label {
	font-size: 24rpx;
	font-weight: 700;
	letter-spacing: 2rpx;
	color: rgba(255, 255, 255, 0.7);
}

.gesture-hud__value {
	font-size: 28rpx;
	font-weight: 700;
	line-height: 1.5;
}

.gesture-hud__bar {
	width: 100%;
	height: 10rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.18);
	overflow: hidden;
}

.gesture-hud__fill {
	height: 100%;
	border-radius: inherit;
	background: #ffffff;
}

.danmaku-layer {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.danmaku-layer--fullscreen {
	inset: auto;
	left: 50%;
	top: 50%;
	width: 100vh;
	height: 100vw;
	transform: translate(-50%, -50%) rotate(90deg);
	transform-origin: center center;
	overflow: hidden;
}

.danmaku-item {
	position: absolute;
	left: 32rpx;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(0, 0, 0, 0.28);
	font-size: 22rpx;
	color: #ffffff;
	animation: danmaku-slide 4s linear forwards;
}

.danmaku-item--fullscreen {
	left: 0;
	animation-name: danmaku-slide-fullscreen;
}

@keyframes danmaku-slide {
	from {
		transform: translateX(540rpx);
		opacity: 0;
	}

	10% {
		opacity: 1;
	}

	to {
		transform: translateX(-540rpx);
		opacity: 0;
	}
}

@keyframes danmaku-slide-fullscreen {
	from {
		transform: translateX(100vh);
		opacity: 0;
	}

	10% {
		opacity: 1;
	}

	to {
		transform: translateX(-100vw);
		opacity: 0;
	}
}

.feed-copy {
	position: absolute;
	left: 28rpx;
	right: 140rpx;
	bottom: 220rpx;
	z-index: 10;
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.feed-card--fullscreen .feed-noise,
.feed-card--fullscreen .feed-top-actions,
.feed-card--fullscreen .feed-copy,
.feed-card--fullscreen .feed-progress,
.feed-card--fullscreen .feed-side-actions,
.feed-card--fullscreen .feed-preview__badge,
.feed-card--fullscreen .feed-preview__title,
.feed-card--fullscreen .feed-preview__tip {
	opacity: 0;
	pointer-events: none;
}

.feed-author {
	font-size: 30rpx;
	font-weight: 700;
}

.feed-title {
	font-size: 34rpx;
	font-weight: 700;
}

.feed-description {
	font-size: 24rpx;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.74);
}

.feed-tag {
	align-self: flex-start;
}

.feed-side-actions {
	position: absolute;
	right: 24rpx;
	top: 60%;
	transform: translateY(-50%);
	z-index: 10;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 24rpx;
}

.feed-progress {
	position: absolute;
	left: 24rpx;
	right: 24rpx;
	bottom: calc(124rpx + env(safe-area-inset-bottom));
	z-index: 14;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
	padding: 16rpx 18rpx 12rpx;
	border-radius: 26rpx;
}

.feed-progress__meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.feed-progress__label {
	font-size: 18rpx;
	font-weight: 700;
	letter-spacing: 2rpx;
	color: rgba(255, 255, 255, 0.58);
}

.feed-progress__time {
	font-size: 20rpx;
	font-weight: 700;
	color: rgba(255, 255, 255, 0.92);
}

.feed-progress__track {
	position: relative;
	height: 28rpx;
	display: flex;
	align-items: center;
}

.feed-progress__track::before {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	top: 50%;
	height: 6rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.22);
	transform: translateY(-50%);
}

.feed-progress__track--disabled {
	opacity: 0.48;
}

.feed-progress__fill {
	position: absolute;
	left: 0;
	top: 50%;
	height: 6rpx;
	border-radius: 999rpx;
	background: #ffffff;
	transform: translateY(-50%);
}

.feed-progress__thumb {
	position: absolute;
	top: 50%;
	width: 20rpx;
	height: 20rpx;
	border-radius: 50%;
	background: #fb7185;
	box-shadow: 0 0 0 6rpx rgba(251, 113, 133, 0.18);
	transform: translate(-50%, -50%);
}

.feed-fullscreen-toggle {
	position: fixed;
	top: calc(180rpx + env(safe-area-inset-top));
	right: 24rpx;
	z-index: 170;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 84rpx;
	height: 84rpx;
	border-radius: 42rpx;
}

.feed-fullscreen-toggle--active {
	background: rgba(0, 0, 0, 0.42);
}

.icon-expand,
.icon-collapse {
	position: relative;
	width: 28rpx;
	height: 28rpx;
}

.icon-expand::before,
.icon-expand::after,
.icon-collapse::before,
.icon-collapse::after {
	content: '';
	position: absolute;
	width: 12rpx;
	height: 12rpx;
	border-color: #ffffff;
}

.icon-expand::before {
	left: 0;
	top: 0;
	border-left: 3rpx solid #ffffff;
	border-top: 3rpx solid #ffffff;
}

.icon-expand::after {
	right: 0;
	bottom: 0;
	border-right: 3rpx solid #ffffff;
	border-bottom: 3rpx solid #ffffff;
}

.icon-collapse::before {
	right: 0;
	top: 0;
	border-right: 3rpx solid #ffffff;
	border-top: 3rpx solid #ffffff;
}

.icon-collapse::after {
	left: 0;
	bottom: 0;
	border-left: 3rpx solid #ffffff;
	border-bottom: 3rpx solid #ffffff;
}

.action-group {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
}

.action-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 98rpx;
	height: 98rpx;
	border-radius: 49rpx;
	font-size: 32rpx;
	font-weight: 700;
}

.action-icon--active {
	color: #fb7185;
}

.icon-bubble {
	position: relative;
	width: 38rpx;
	height: 30rpx;
	border: 3rpx solid #ffffff;
	border-radius: 14rpx;
}

.icon-bubble__tail {
	position: absolute;
	left: 10rpx;
	bottom: -8rpx;
	width: 12rpx;
	height: 12rpx;
	border-left: 3rpx solid #ffffff;
	border-bottom: 3rpx solid #ffffff;
	background: #09090b;
	transform: rotate(-25deg);
}

.icon-favorite-star {
	font-size: 42rpx;
	line-height: 1;
	color: #ffffff;
	transform: translateY(-1rpx) scale(1.06);
	text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.32);
	transition: transform 0.18s ease, color 0.18s ease, text-shadow 0.18s ease;
}

.icon-favorite-star--active {
	color: #ffd54a;
	transform: translateY(-1rpx) scale(1.12);
	text-shadow:
		0 0 8rpx rgba(255, 213, 74, 0.5),
		0 6rpx 16rpx rgba(0, 0, 0, 0.28);
}

.action-text {
	font-size: 20rpx;
	font-weight: 700;
}
</style>
