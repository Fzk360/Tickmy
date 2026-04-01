<template>
	<view class="feed-card" :class="{ 'feed-card--fullscreen': landscapeFullscreen }" :style="{ background: video.palette }">
		<view class="feed-noise" />

		<view class="feed-top-actions">
			<button
				v-if="isLandscapeVideo && !landscapeFullscreen"
				class="feed-top-pill feed-top-pill--icon tm-glass"
				@tap.stop="toggleLandscapeFullscreen"
			>
				<view class="icon-expand" />
			</button>
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

		<view class="feed-surface" @tap="togglePlay" @longpress="zoomed = !zoomed">
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
				:page-gesture="true"
				:playback-rate="playbackRate"
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
				:class="{ 'feed-progress__track--disabled': true }"
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
					<view class="icon-bookmark" :class="{ 'icon-bookmark--active': decoratedVideo.isFavorited }" />
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
		<button v-if="landscapeFullscreen" class="feed-fullscreen-exit tm-glass" @tap.stop="toggleLandscapeFullscreen">
			<view class="icon-collapse" />
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
let videoContext = null
const progressTrackId = `progress_${props.video.id}`
const playerId = `player_${props.video.id}`

const hasPlayableSource = computed(() => !!props.video.localPath)
const shouldRenderVideo = computed(() => hasPlayableSource.value && props.isCurrent && !playerError.value)
const previewImage = computed(() => props.video.coverPath || '')
const showPreviewImage = computed(() => !!previewImage.value)
const showDanmaku = computed(() => store.state.settings.showDanmaku !== false)
const playbackRate = computed(() => Number(store.state.settings.defaultSpeed || 1))
const playbackRateLabel = computed(() => `${playbackRate.value}x`)
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
const sliderValue = computed(() => Math.min(sliderMax.value, Math.max(0, currentTime.value || 0)))
const mediaScale = computed(() => (zoomed.value ? 1.06 : 1))
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
	const current = formatProgressTime(currentTime.value)
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

function applyPlaybackRate() {
	const context = ensureContext()
	if (context && typeof context.playbackRate === 'function') {
		try {
			context.playbackRate(playbackRate.value)
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
	uni.$emit('tikmy:landscape-fullscreen', {
		active: landscapeFullscreen.value,
		videoId: props.video.id
	})
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
		setTimeout(() => {
			measureProgressTrack()
		}, 200)
	})
})

onUnmounted(() => {
	landscapeFullscreen.value = false
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
	top: 180rpx;
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

.feed-fullscreen-exit {
	position: fixed;
	top: calc(44rpx + env(safe-area-inset-top));
	right: 24rpx;
	z-index: 170;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 84rpx;
	height: 84rpx;
	border-radius: 42rpx;
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

.icon-bookmark {
	position: relative;
	width: 28rpx;
	height: 38rpx;
	border: 3rpx solid #ffffff;
	border-bottom: none;
	border-radius: 10rpx 10rpx 0 0;
}

.icon-bookmark::after {
	content: '';
	position: absolute;
	left: -3rpx;
	right: -3rpx;
	bottom: -3rpx;
	margin: auto;
	width: 0;
	height: 0;
	border-left: 17rpx solid transparent;
	border-right: 17rpx solid transparent;
	border-top: 16rpx solid #ffffff;
}

.icon-bookmark--active {
	border-color: #fb7185;
}

.icon-bookmark--active::after {
	border-top-color: #fb7185;
}

.action-text {
	font-size: 20rpx;
	font-weight: 700;
}
</style>
