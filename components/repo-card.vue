<template>
	<button
		class="repo-card"
		:class="{
			'repo-card--selecting': selectionMode,
			'repo-card--selected': selected
		}"
		:style="{ background: repo.cover }"
		@tap="handleTap"
		@longpress="handleLongpress"
	>
		<image v-if="repo.coverPath" class="repo-image" :src="repo.coverPath" mode="aspectFill" />
		<view v-if="selectionMode" class="repo-check">
			<view class="repo-check__icon" :class="{ 'repo-check__icon--active': selected }" />
		</view>
		<view class="repo-overlay">
			<text class="repo-name">{{ repo.name }}</text>
			<text class="repo-meta">{{ repo.videoCount }} 个视频</text>
		</view>
	</button>
</template>

<script setup>
const props = defineProps({
	repo: {
		type: Object,
		required: true
	},
	selectionMode: {
		type: Boolean,
		default: false
	},
	selected: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['select', 'toggle', 'longpress'])

function handleTap() {
	if (props.selectionMode) {
		emit('toggle', props.repo)
		return
	}

	emit('select', props.repo)
}

function handleLongpress() {
	emit('longpress', props.repo)
}
</script>

<style lang="scss" scoped>
.repo-card {
	position: relative;
	height: 320rpx;
	border-radius: 36rpx;
	overflow: hidden;
	box-shadow: inset 0 -120rpx 140rpx rgba(0, 0, 0, 0.34), 0 28rpx 90rpx rgba(0, 0, 0, 0.22);
}

.repo-card--selecting {
	transform: scale(0.98);
}

.repo-card--selected {
	box-shadow: inset 0 0 0 4rpx rgba(255, 255, 255, 0.92), inset 0 -120rpx 140rpx rgba(0, 0, 0, 0.34),
		0 28rpx 90rpx rgba(0, 0, 0, 0.22);
}

.repo-image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.repo-check {
	position: absolute;
	top: 20rpx;
	right: 20rpx;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 46rpx;
	height: 46rpx;
	border-radius: 50%;
	background: rgba(9, 9, 11, 0.58);
	border: 2rpx solid rgba(255, 255, 255, 0.5);
}

.repo-check__icon {
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	background: transparent;
	transition: background 0.2s ease;
}

.repo-check__icon--active {
	background: #ffffff;
}

.repo-overlay {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 28rpx;
	background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.72) 100%);
}

.repo-name {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
}

.repo-meta {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.68);
}
</style>
