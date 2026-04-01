<template>
	<view class="tm-page tm-safe-bottom profile-page">
		<view class="profile-hero">
			<image v-if="profileInfo.backgroundPath" class="profile-hero__image" :src="profileInfo.backgroundPath" mode="aspectFill" />
			<view class="profile-hero__overlay" />
			<text class="profile-hero__label">我的本地画像</text>
		</view>

		<view class="profile-main">
			<view class="profile-head">
				<view class="avatar">
					<image v-if="profileInfo.avatarPath" class="avatar__image" :src="profileInfo.avatarPath" mode="aspectFill" />
					<text v-else>{{ profileInfo.initials }}</text>
				</view>
				<view class="profile-head__actions">
					<button class="edit-button" @tap="openEditor">编辑资料</button>
					<button class="settings-button settings-button--inline tm-glass" @tap="goSettings">设置</button>
				</view>
			</view>

			<text class="profile-name">{{ profileInfo.name }}</text>
			<text class="profile-bio">{{ profileInfo.bio }}</text>

			<view class="stats-grid">
				<view class="stat-card tm-card">
					<text class="stat-card__value">{{ profileStats.likedCount }}</text>
					<text class="stat-card__label">点赞视频</text>
				</view>
				<view class="stat-card tm-card">
					<text class="stat-card__value">{{ profileStats.favoritedCount }}</text>
					<text class="stat-card__label">收藏视频</text>
				</view>
				<view class="stat-card tm-card">
					<text class="stat-card__value">{{ profileStats.totalPlayCount }}</text>
					<text class="stat-card__label">总播放次数</text>
				</view>
				<view class="stat-card tm-card">
					<text class="stat-card__value">{{ profileStats.totalWatchLabel }}</text>
					<text class="stat-card__label">累计观看时长</text>
				</view>
			</view>

			<view class="focus-card tm-card">
				<text class="focus-card__eyebrow">最近最常看的仓库</text>
				<text class="focus-card__title">{{ profileStats.topRepositoryName }}</text>
				<text class="focus-card__copy">基于播放、停留、点赞与收藏形成的本地偏好聚合。</text>
			</view>
		</view>

		<view class="profile-tabs">
			<button class="profile-tab" :class="{ 'profile-tab--active': activeTab === 'likes' }" @tap="activeTab = 'likes'">点赞</button>
			<button class="profile-tab" :class="{ 'profile-tab--active': activeTab === 'favorites' }" @tap="activeTab = 'favorites'">收藏</button>
			<button class="profile-tab" :class="{ 'profile-tab--active': activeTab === 'recent' }" @tap="activeTab = 'recent'">最近互动</button>
		</view>

		<view v-if="activeCards.length" class="poster-grid">
			<view v-for="item in activeCards" :key="item.id" class="poster-card" :style="{ background: item.palette }">
				<image v-if="item.coverPath" class="poster-card__image" :src="item.coverPath" mode="aspectFill" />
				<view class="poster-card__overlay" />
				<text class="poster-badge">{{ item.badge }}</text>
				<view class="poster-footer">
					<text class="poster-title">{{ item.title }}</text>
					<text class="poster-meta">{{ item.metaPrimary }}</text>
					<text class="poster-meta poster-meta--muted">{{ item.metaSecondary }}</text>
				</view>
			</view>
		</view>

		<view v-else class="profile-empty">
			<text class="profile-empty__title">{{ emptyState.title }}</text>
			<text class="profile-empty__copy">{{ emptyState.copy }}</text>
		</view>

		<tikmy-tab-bar current="profile" />

		<edit-profile-popup
			:open="editorOpen"
			:profile="editingProfile"
			:saving="savingProfile"
			@close="closeEditor"
			@save="handleSaveProfile"
			@pick-avatar="handlePickImage('avatarPath')"
			@pick-background="handlePickImage('backgroundPath')"
			@clear-avatar="handleClearImage('avatarPath')"
			@clear-background="handleClearImage('backgroundPath')"
		/>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import EditProfilePopup from '../../components/edit-profile-popup.vue'
import TikmyTabBar from '../../components/tikmy-tab-bar.vue'
import { useTikmyStore } from '../../store/tikmy-store'

const store = useTikmyStore()
const activeTab = ref('likes')
const editorOpen = ref(false)
const savingProfile = ref(false)
const editingProfile = ref(null)

const profileInfo = computed(() => store.state.profile)
const profileStats = computed(() => store.profileStats.value)
const emptyState = computed(() => {
	if (activeTab.value === 'likes') {
		return {
			title: '还没有点赞的视频',
			copy: '在首页双击点赞后，这里会沉淀你偏好的高热内容。'
		}
	}
	if (activeTab.value === 'favorites') {
		return {
			title: '还没有收藏的视频',
			copy: '收藏后的内容会在这里形成稳定的本地片库。'
		}
	}
	return {
		title: '最近互动还很安静',
		copy: '浏览、点赞、收藏、评论和弹幕都会逐步形成你的本地互动轨迹。'
	}
})
const activeCards = computed(() => {
	if (activeTab.value === 'recent') {
		return store.recentInteractionVideos.value.map((item) => ({
			...item,
			badge: item.recommendationReason,
			metaPrimary: item.activityLabel,
			metaSecondary: item.activityTime
		}))
	}

	const list = activeTab.value === 'likes' ? store.likedVideos.value : store.favoritedVideos.value
	return list.map((item) => {
		const decorated = store.decorateVideo(item)
		return {
			...item,
			badge: activeTab.value === 'likes' ? '已点赞' : '已收藏',
			metaPrimary: activeTab.value === 'likes' ? decorated.likes + ' 热度' : store.getRecommendationReason(item),
			metaSecondary: activeTab.value === 'likes' ? store.getRecommendationReason(item) : decorated.likes + ' 热度'
		}
	})
})

function goSettings() {
	uni.navigateTo({
		url: '/pages/settings/index'
	})
}

function openEditor() {
	editingProfile.value = {
		...store.state.profile
	}
	editorOpen.value = true
}

function closeEditor() {
	if (savingProfile.value) {
		return
	}
	editorOpen.value = false
	editingProfile.value = null
}

async function handlePickImage(field) {
	try {
		const localPath = await store.pickProfileImage(field)
		if (!localPath) {
			return
		}
		editingProfile.value = {
			...(editingProfile.value || store.state.profile),
			[field]: localPath
		}
		uni.showToast({
			title: field === 'avatarPath' ? '头像已更新' : '背景图已更新',
			icon: 'success'
		})
	} catch (error) {
		if (String(error && error.errMsg ? error.errMsg : error).toLowerCase().includes('cancel')) {
			return
		}
		uni.showToast({
			title: (error && error.message) || '选择图片失败',
			icon: 'none'
		})
	}
}

async function handleClearImage(field) {
	editingProfile.value = {
		...(editingProfile.value || store.state.profile),
		[field]: ''
	}
}

async function handleSaveProfile(payload) {
	if (!String(payload.name || '').trim()) {
		uni.showToast({
			title: '昵称不能为空',
			icon: 'none'
		})
		return
	}

	savingProfile.value = true
	try {
		await store.updateProfile({
			name: payload.name,
			bio: payload.bio,
			avatarPath: payload.avatarPath,
			backgroundPath: payload.backgroundPath
		})
		editorOpen.value = false
		editingProfile.value = null
		uni.showToast({
			title: '资料已保存',
			icon: 'success'
		})
	} finally {
		savingProfile.value = false
	}
}

onShow(async () => {
	await store.ensureInitialized()
	uni.hideTabBar({
		animation: false
	})
})
</script>

<style lang="scss" scoped>
.profile-page {
	background: #0a0a0d;
}

.profile-hero {
	position: relative;
	height: 360rpx;
	background:
		radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.16), transparent 16%),
		linear-gradient(135deg, #1d4ed8 0%, #7c3aed 50%, #ec4899 100%);
}

.profile-hero__image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.profile-hero__label {
	position: absolute;
	left: 32rpx;
	top: 74rpx;
	z-index: 10;
	padding: 12rpx 20rpx;
	border-radius: 999rpx;
	background: rgba(9, 9, 11, 0.26);
	font-size: 22rpx;
	font-weight: 700;
}

.profile-hero__overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, rgba(9, 9, 11, 0) 0%, rgba(9, 9, 11, 0.92) 100%);
}

.settings-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 72rpx;
	height: 72rpx;
	border-radius: 36rpx;
	font-size: 28rpx;
}

.profile-main {
	position: relative;
	z-index: 5;
	margin-top: -84rpx;
	padding: 0 32rpx;
}

.profile-head {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
}

.profile-head__actions {
	display: flex;
	align-items: center;
	gap: 16rpx;
	flex: 0 0 auto;
	margin-right: 12rpx;
}

.avatar {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 152rpx;
	height: 152rpx;
	border-radius: 76rpx;
	border: 8rpx solid #09090b;
	background: linear-gradient(135deg, #f97316, #fb7185);
	font-size: 62rpx;
	font-weight: 700;
	overflow: hidden;
}

.avatar__image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.edit-button {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	min-width: 168rpx;
	height: 72rpx;
	padding: 0 32rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.08);
	border: 1rpx solid rgba(255, 255, 255, 0.1);
	font-size: 24rpx;
	font-weight: 700;
	line-height: 1.2;
	text-align: center;
	white-space: nowrap;
}

.settings-button--inline {
	position: static;
	flex: 0 0 72rpx;
}

.profile-name {
	display: block;
	margin-top: 28rpx;
	font-size: 46rpx;
	font-weight: 700;
}

.profile-bio {
	display: block;
	margin-top: 18rpx;
	font-size: 24rpx;
	line-height: 1.7;
	color: rgba(255, 255, 255, 0.7);
}

.stats-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 18rpx;
	margin-top: 34rpx;
}

.stat-card {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
	padding: 24rpx;
	border-radius: 28rpx;
}

.stat-card__value {
	font-size: 36rpx;
	font-weight: 700;
}

.stat-card__label {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.56);
}

.focus-card {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	margin-top: 18rpx;
	padding: 28rpx;
	border-radius: 30rpx;
	background:
		radial-gradient(circle at top right, rgba(251, 113, 133, 0.16), transparent 32%),
		rgba(255, 255, 255, 0.06);
}

.focus-card__eyebrow {
	font-size: 20rpx;
	letter-spacing: 2rpx;
	color: rgba(255, 255, 255, 0.5);
}

.focus-card__title {
	font-size: 34rpx;
	font-weight: 700;
}

.focus-card__copy {
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.64);
}

.profile-tabs {
	position: sticky;
	top: 0;
	z-index: 15;
	display: flex;
	margin-top: 40rpx;
	background: rgba(10, 10, 13, 0.96);
	border-bottom: 1rpx solid rgba(255, 255, 255, 0.06);
}

.profile-tab {
	position: relative;
	flex: 1;
	height: 88rpx;
	font-size: 26rpx;
	font-weight: 700;
	color: rgba(255, 255, 255, 0.4);
}

.profile-tab--active {
	color: #ffffff;
}

.profile-tab--active::after {
	content: '';
	position: absolute;
	left: 50%;
	bottom: 0;
	width: 52rpx;
	height: 6rpx;
	border-radius: 999rpx;
	background: #ffffff;
	transform: translateX(-50%);
}

.poster-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 2rpx;
	margin-top: 2rpx;
}

.poster-card {
	position: relative;
	height: 332rpx;
	overflow: hidden;
}

.poster-card__overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, rgba(9, 9, 11, 0) 0%, rgba(9, 9, 11, 0.88) 100%);
}

.poster-card__image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.poster-badge {
	position: absolute;
	left: 14rpx;
	top: 14rpx;
	z-index: 2;
	max-width: 80%;
	padding: 10rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(9, 9, 11, 0.52);
	font-size: 18rpx;
	font-weight: 700;
}

.poster-footer {
	position: absolute;
	left: 16rpx;
	right: 16rpx;
	bottom: 16rpx;
	z-index: 2;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 6rpx;
}

.poster-title {
	font-size: 22rpx;
	font-weight: 700;
}

.poster-meta {
	font-size: 20rpx;
	line-height: 1.4;
}

.poster-meta--muted {
	color: rgba(255, 255, 255, 0.62);
}

.profile-empty {
	padding: 120rpx 64rpx 0;
	text-align: center;
}

.profile-empty__title {
	font-size: 34rpx;
	font-weight: 700;
}

.profile-empty__copy {
	display: block;
	margin-top: 18rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.5);
}
</style>
