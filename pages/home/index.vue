<template>
	<view class="tm-page home-page">
		<swiper v-if="feedVideos.length" class="home-swiper" vertical circular :current="currentIndex" @change="handleChange">
			<swiper-item v-for="(item, index) in feedVideos" :key="item.id">
				<feed-card
					:video="item"
					:repo-name="getRepoName(item)"
					:is-current="index === currentIndex"
					:is-active="pageVisible && index === currentIndex && !resumePaused"
				/>
			</swiper-item>
		</swiper>

		<view v-else class="empty-state">
			<text class="empty-title">还没有可推荐的视频</text>
			<text class="empty-copy">先去仓库页创建仓库并从相册导入本地视频，推荐流会根据你的停留、完播、点赞和收藏逐步变化。</text>
		</view>

		<tikmy-tab-bar v-if="!landscapeFullscreenActive" current="home" />
	</view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import FeedCard from '../../components/feed-card.vue'
import TikmyTabBar from '../../components/tikmy-tab-bar.vue'
import { useTikmyStore } from '../../store/tikmy-store'

const store = useTikmyStore()
const currentIndex = ref(0)
const pageVisible = ref(false)
const resumePaused = ref(false)
const hasShownOnce = ref(false)
const activeVideoId = ref('')
const landscapeFullscreenActive = ref(false)

const feedVideos = computed(() => store.recommendedVideos.value.map((item) => store.decorateVideo(item)))

watch(
	feedVideos,
	(nextList, previousList) => {
		if (!nextList.length) {
			currentIndex.value = 0
			activeVideoId.value = ''
			return
		}

		const fallbackId = previousList && previousList[currentIndex.value] ? previousList[currentIndex.value].id : ''
		const targetId = activeVideoId.value || fallbackId
		const nextIndex = targetId ? nextList.findIndex((item) => item.id === targetId) : -1
		currentIndex.value = nextIndex >= 0 ? nextIndex : Math.min(currentIndex.value, nextList.length - 1)
		activeVideoId.value = nextList[currentIndex.value] ? nextList[currentIndex.value].id : ''
	},
	{ immediate: true }
)

function handleChange(event) {
	currentIndex.value = event.detail.current
	activeVideoId.value = feedVideos.value[currentIndex.value] ? feedVideos.value[currentIndex.value].id : ''
	resumePaused.value = false
}

function getRepoName(item) {
	const repository = store.getRepositoryById(item.repositoryId)
	return repository ? repository.name : item.category
}

function handleLandscapeFullscreen(event = {}) {
	landscapeFullscreenActive.value = Boolean(event.active)
}

onShow(async () => {
	await store.ensureInitialized()
	if (currentIndex.value >= feedVideos.value.length) {
		currentIndex.value = 0
	}
	activeVideoId.value = feedVideos.value[currentIndex.value] ? feedVideos.value[currentIndex.value].id : ''
	pageVisible.value = true
	if (hasShownOnce.value) {
		resumePaused.value = true
	} else {
		hasShownOnce.value = true
		resumePaused.value = false
	}
	uni.hideTabBar({
		animation: false
	})
})

onHide(() => {
	pageVisible.value = false
	resumePaused.value = true
	landscapeFullscreenActive.value = false
})

onMounted(() => {
	uni.$on('tikmy:landscape-fullscreen', handleLandscapeFullscreen)
})

onUnmounted(() => {
	uni.$off('tikmy:landscape-fullscreen', handleLandscapeFullscreen)
})
</script>

<style lang="scss" scoped>
.home-page {
	height: 100vh;
	overflow: hidden;
}

.home-swiper {
	width: 100%;
	height: 100vh;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100vh;
	padding: 0 64rpx;
	text-align: center;
}

.empty-title {
	font-size: 40rpx;
	font-weight: 700;
}

.empty-copy {
	margin-top: 18rpx;
	font-size: 24rpx;
	line-height: 1.7;
	color: rgba(255, 255, 255, 0.56);
}
</style>
