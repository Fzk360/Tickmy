<template>
	<view class="tm-page settings-page">
		<view class="settings-header">
			<button class="back-button" @tap="goBack" aria-label="返回">
				<view class="back-icon" />
			</button>
			<text class="settings-title">设置与本地数据</text>
		</view>

		<view class="settings-body">
			<view class="settings-section">
				<text class="tm-section-title">数据主权</text>
				<view class="settings-card tm-card">
					<view class="settings-row">
						<view>
							<text class="settings-row__title">{{ store.state.settings.storageMode }}</text>
							<text class="settings-row__subtitle">所有视频和互动记录默认保存在当前设备</text>
						</view>
						<view class="status-switch">
							<view class="status-switch__dot" />
						</view>
					</view>
					<text class="settings-copy">
						TikMy 一期不接入云端同步与服务端推荐。仓库、导入视频索引、点赞、收藏、评论、弹幕与播放轨迹都优先保存在本地。
					</text>
				</view>
			</view>

			<view class="settings-section">
				<text class="tm-section-title">推荐系统</text>
				<view class="settings-card tm-card settings-card--highlight">
					<view class="settings-row">
						<view>
							<text class="settings-row__title">{{ recommendationSummary.modeLabel }}</text>
							<text class="settings-row__subtitle">依据停留时长、完播、点赞、收藏与快速划走进行本地排序</text>
						</view>
						<view class="settings-badge">{{ recommendationSummary.signalCount }}</view>
					</view>
					<view class="settings-metrics">
						<view class="settings-metric">
							<text class="settings-metric__value">{{ recommendationSummary.signalCount }}</text>
							<text class="settings-metric__label">信号总量</text>
						</view>
						<view class="settings-metric">
							<text class="settings-metric__value">{{ recommendationSummary.quickSkipCount }}</text>
							<text class="settings-metric__label">快速划走</text>
						</view>
					</view>
					<text class="settings-copy">当前主导推荐依据：{{ recommendationSummary.topReason }}</text>
				</view>
			</view>

			<view class="settings-section">
				<text class="tm-section-title">播放偏好</text>
				<view class="settings-card tm-card">
					<view class="settings-row">
						<view>
							<text class="settings-row__title">默认倍速</text>
							<text class="settings-row__subtitle">当视频成为当前卡片时自动应用</text>
						</view>
						<button class="settings-chip" @tap="cycleSpeed">{{ store.state.settings.defaultSpeed }}x</button>
					</view>
					<view class="settings-row settings-row--spaced">
						<view>
							<text class="settings-row__title">弹幕显示</text>
							<text class="settings-row__subtitle">记住你上一次的显示状态</text>
						</view>
						<button class="settings-chip" @tap="toggleDanmaku">
							{{ store.state.settings.showDanmaku ? '开启' : '关闭' }}
						</button>
					</view>
				</view>
			</view>

			<view class="settings-section">
				<text class="tm-section-title">存储管理</text>
				<view class="settings-card tm-card">
					<view class="storage-overview">
						<view>
							<text class="storage-overview__value">{{ storageStats.totalKbLabel }}</text>
							<text class="storage-overview__copy">本地快照估算占用，最近活跃于 {{ storageStats.lastActiveLabel }}</text>
						</view>
						<view class="settings-badge">{{ storageStats.totalRecords }}</view>
					</view>

					<view class="storage-list">
						<view v-for="item in storageStats.sections" :key="item.key" class="storage-row">
							<view>
								<text class="storage-row__title">{{ item.label }}</text>
								<text class="storage-row__subtitle">{{ item.count }} 条记录</text>
							</view>
							<text class="storage-row__value">{{ item.kbLabel }}</text>
						</view>
					</view>
				</view>
				<view class="settings-stack">
					<button class="danger-button" @tap="handleReset">清除本地缓存并恢复示例数据</button>
					<text class="storage-note">总占用约 {{ store.storageKb.value }} KB，重置后会回到初始演示状态。</text>
				</view>
			</view>

			<view class="settings-section">
				<text class="tm-section-title">关于</text>
				<view class="settings-card tm-card">
					<text class="version-text">版本 1.0.0 · Offline First Edition</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useTikmyStore } from '../../store/tikmy-store'

const store = useTikmyStore()
const speedOptions = [0.75, 1, 1.25, 1.5, 2]
const recommendationSummary = computed(() => store.recommendationSummary.value)
const storageStats = computed(() => store.storageStats.value)

function goBack() {
	uni.navigateBack({
		fail() {
			uni.reLaunch({
				url: '/pages/profile/index'
			})
		}
	})
}

function cycleSpeed() {
	const currentIndex = speedOptions.findIndex((item) => item === Number(store.state.settings.defaultSpeed || 1))
	const nextValue = speedOptions[(currentIndex + 1 + speedOptions.length) % speedOptions.length]
	store.updateSettings({
		defaultSpeed: nextValue
	})
}

function toggleDanmaku() {
	store.updateSettings({
		showDanmaku: !store.state.settings.showDanmaku
	})
}

async function handleReset() {
	const result = await new Promise((resolve, reject) => {
		uni.showModal({
			title: '确认重置',
			content: '这会清除当前设备上的本地数据，并恢复为初始示例内容。',
			success: resolve,
			fail: reject
		})
	})

	if (!result.confirm) {
		return
	}

	await store.resetAll()
	uni.showToast({
		title: '已重置',
		icon: 'success'
	})
}

onShow(async () => {
	await store.ensureInitialized()
})
</script>

<style lang="scss" scoped>
.settings-page {
	padding: 70rpx 28rpx 48rpx;
}

.settings-header {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.back-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 72rpx;
	height: 72rpx;
	border-radius: 36rpx;
	background: rgba(255, 255, 255, 0.06);
}

.back-icon {
	position: relative;
	width: 24rpx;
	height: 24rpx;
}

.back-icon::before {
	content: '';
	position: absolute;
	left: 5rpx;
	top: 50%;
	width: 12rpx;
	height: 12rpx;
	border-left: 3rpx solid rgba(255, 255, 255, 0.92);
	border-bottom: 3rpx solid rgba(255, 255, 255, 0.92);
	transform: translateY(-50%) rotate(45deg);
}

.settings-title {
	font-size: 40rpx;
	font-weight: 700;
}

.settings-body {
	display: flex;
	flex-direction: column;
	gap: 42rpx;
	margin-top: 34rpx;
}

.settings-section {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.settings-card {
	padding: 28rpx;
	border-radius: 32rpx;
}

.settings-card--highlight {
	background:
		radial-gradient(circle at top right, rgba(249, 115, 22, 0.18), transparent 32%),
		rgba(255, 255, 255, 0.06);
}

.settings-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
}

.settings-row--spaced {
	margin-top: 28rpx;
	padding-top: 28rpx;
	border-top: 1rpx solid rgba(255, 255, 255, 0.06);
}

.settings-row__title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
}

.settings-row__subtitle {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.48);
}

.status-switch {
	position: relative;
	width: 88rpx;
	height: 48rpx;
	border-radius: 999rpx;
	background: #fb7185;
}

.status-switch__dot {
	position: absolute;
	right: 8rpx;
	top: 8rpx;
	width: 32rpx;
	height: 32rpx;
	border-radius: 16rpx;
	background: #ffffff;
}

.settings-copy {
	display: block;
	margin-top: 24rpx;
	padding-top: 24rpx;
	border-top: 1rpx solid rgba(255, 255, 255, 0.06);
	font-size: 24rpx;
	line-height: 1.7;
	color: rgba(255, 255, 255, 0.68);
}

.settings-badge {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 72rpx;
	height: 72rpx;
	padding: 0 20rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.1);
	font-size: 24rpx;
	font-weight: 700;
}

.settings-metrics {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 18rpx;
	margin-top: 24rpx;
}

.settings-metric {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	padding: 22rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.05);
}

.settings-metric__value {
	font-size: 34rpx;
	font-weight: 700;
}

.settings-metric__label {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.52);
}

.settings-chip {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 112rpx;
	height: 68rpx;
	padding: 0 22rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.08);
	border: 1rpx solid rgba(255, 255, 255, 0.08);
	font-size: 24rpx;
	font-weight: 700;
	line-height: 1.2;
	text-align: center;
	color: #ffffff;
}

.settings-stack {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.storage-overview {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
}

.storage-overview__value {
	display: block;
	font-size: 40rpx;
	font-weight: 700;
}

.storage-overview__copy {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.56);
}

.storage-list {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	margin-top: 28rpx;
	padding-top: 28rpx;
	border-top: 1rpx solid rgba(255, 255, 255, 0.06);
}

.storage-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
}

.storage-row__title {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
}

.storage-row__subtitle {
	display: block;
	margin-top: 8rpx;
	font-size: 20rpx;
	color: rgba(255, 255, 255, 0.48);
}

.storage-row__value {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.74);
}

.danger-button {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 92rpx;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.06);
	border: 1rpx solid rgba(255, 255, 255, 0.08);
	color: #fb7185;
	font-size: 28rpx;
	font-weight: 700;
	line-height: 1.2;
	text-align: center;
}

.storage-note {
	font-size: 20rpx;
	text-align: center;
	color: rgba(255, 255, 255, 0.3);
}

.version-text {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.62);
}
</style>
