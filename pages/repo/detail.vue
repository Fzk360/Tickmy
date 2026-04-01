<template>
	<view class="tm-page detail-page">
		<view class="detail-header" :style="detailHeaderStyle">
			<view class="detail-left">
				<button class="back-button" @tap="goBack">‹</button>
				<view class="detail-heading">
					<text class="detail-title">{{ selectionMode ? '批量选择视频' : repositoryName }}</text>
					<text class="detail-meta">{{ selectionMode ? `已选 ${selectedVideoIds.length} 个视频` : `${videosList.length} 个视频` }}</text>
				</view>
			</view>
			<view class="detail-actions">
				<template v-if="selectionMode">
					<button class="ghost-button" @tap="toggleSelectAllVideos">{{ allVideosSelected ? '取消全选' : '全选' }}</button>
					<button class="danger-button" @tap="confirmDeleteVideos">删除</button>
					<button class="ghost-button" @tap="exitSelectionMode">取消</button>
				</template>
				<template v-else>
					<button class="primary-button" @tap="openImport">导入</button>
				</template>
			</view>
		</view>

		<view class="detail-list">
			<view
				v-for="item in videosList"
				:key="item.id"
				class="detail-item tm-card"
				:class="{
					'detail-item--selecting': selectionMode,
					'detail-item--selected': isVideoSelected(item.id)
				}"
				@tap="handleVideoTap(item)"
				@longpress="enterVideoSelectionMode(item)"
			>
				<view v-if="selectionMode" class="detail-check">
					<view class="detail-check__icon" :class="{ 'detail-check__icon--active': isVideoSelected(item.id) }" />
				</view>
				<view class="detail-poster" :style="{ background: item.palette }">
					<image v-if="item.coverPath" class="detail-poster__image" :src="item.coverPath" mode="aspectFill" />
					<view class="detail-poster__play">▶</view>
				</view>

				<view class="detail-copy">
					<view class="detail-copy__top">
						<text class="detail-copy__title tm-line-clamp-1">{{ item.title }}</text>
						<button v-if="!selectionMode" class="detail-edit" @tap.stop="openEditor(item)">编辑</button>
					</view>
					<text class="detail-copy__desc tm-line-clamp-2">{{ item.description }}</text>
					<text class="detail-copy__date">{{ formatDate(item.importedAt) }}</text>
				</view>
			</view>
		</view>

		<import-sheet
			:open="showImport"
			:repositories="repositoriesList"
			:selected-repo-id="importTargetRepoId"
			:importing="store.state.importing"
			@close="showImport = false"
			@select-repo="handleImportRepoSelect"
			@create-repo="createRepository"
			@import="handleImport"
		/>
		<edit-video-popup :open="!!editingVideo" :video="editingVideo" @close="editingVideo = null" @save="handleSave" />
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import EditVideoPopup from '../../components/edit-video-popup.vue'
import ImportSheet from '../../components/import-sheet.vue'
import { useTikmyStore } from '../../store/tikmy-store'

const store = useTikmyStore()
const showImport = ref(false)
const editingVideo = ref(null)
const currentRepositoryId = ref('')
const importTargetRepoId = ref('')
const selectedVideoIds = ref([])
const detailHeaderTop = ref(0)

const repositoriesList = computed(() => store.state.repositories)
const repository = computed(() => store.getRepositoryById(currentRepositoryId.value))
const repositoryName = computed(() => (repository.value ? repository.value.name : '仓库详情'))
const videosList = computed(() => store.getVideosByRepo(currentRepositoryId.value))
const selectionMode = computed(() => selectedVideoIds.value.length > 0)
const allVideosSelected = computed(() => videosList.value.length > 0 && selectedVideoIds.value.length === videosList.value.length)
const detailHeaderStyle = computed(() => ({
	paddingTop: `${detailHeaderTop.value}px`
}))

onLoad(async (options) => {
	await store.ensureInitialized()
	updateHeaderInset()
	currentRepositoryId.value = (options && options.id) || (repositoriesList.value[0] && repositoriesList.value[0].id) || ''
	importTargetRepoId.value = currentRepositoryId.value
})

onShow(async () => {
	await store.ensureInitialized()
	updateHeaderInset()
	if (!currentRepositoryId.value && repositoriesList.value.length) {
		currentRepositoryId.value = repositoriesList.value[0].id
	}
	if (!importTargetRepoId.value) {
		importTargetRepoId.value = currentRepositoryId.value
	}
})

function updateHeaderInset() {
	try {
		const systemInfo = typeof uni.getSystemInfoSync === 'function' ? uni.getSystemInfoSync() : {}
		const menuButtonRect =
			(typeof uni.getMenuButtonBoundingClientRect === 'function' && uni.getMenuButtonBoundingClientRect()) ||
			(typeof wx !== 'undefined' && typeof wx.getMenuButtonBoundingClientRect === 'function' && wx.getMenuButtonBoundingClientRect()) ||
			null

		const statusBarHeight = Number(systemInfo.statusBarHeight || 0)
		if (menuButtonRect && menuButtonRect.top) {
			const menuBottom = Number(menuButtonRect.bottom || 0)
			const gap = Math.max(12, Math.round(menuButtonRect.top - statusBarHeight))
			detailHeaderTop.value = Math.max(96, Math.round(menuBottom + gap))
			return
		}

		detailHeaderTop.value = Math.max(96, statusBarHeight + 44)
	} catch (error) {
		detailHeaderTop.value = 108
	}
}

function isVideoSelected(videoId) {
	return selectedVideoIds.value.includes(videoId)
}

function exitSelectionMode() {
	selectedVideoIds.value = []
}

function goBack() {
	if (selectionMode.value) {
		exitSelectionMode()
		return
	}

	uni.navigateBack({
		fail() {
			uni.reLaunch({
				url: '/pages/repo/index'
			})
		}
	})
}

function handleVideoTap(video) {
	if (!selectionMode.value) {
		return
	}

	toggleVideoSelection(video)
}

function enterVideoSelectionMode(video) {
	if (!video || !video.id) {
		return
	}

	if (!isVideoSelected(video.id)) {
		selectedVideoIds.value = [...selectedVideoIds.value, video.id]
	}
}

function toggleVideoSelection(video) {
	if (!video || !video.id) {
		return
	}

	if (isVideoSelected(video.id)) {
		selectedVideoIds.value = selectedVideoIds.value.filter((item) => item !== video.id)
		return
	}

	selectedVideoIds.value = [...selectedVideoIds.value, video.id]
}

function toggleSelectAllVideos() {
	if (allVideosSelected.value) {
		selectedVideoIds.value = []
		return
	}

	selectedVideoIds.value = videosList.value.map((item) => item.id)
}

function openEditor(video) {
	editingVideo.value = { ...video }
}

function openImport() {
	if (!importTargetRepoId.value) {
		importTargetRepoId.value = currentRepositoryId.value || (repositoriesList.value[0] && repositoriesList.value[0].id) || ''
	}
	showImport.value = true
}

function handleImportRepoSelect(nextRepositoryId) {
	importTargetRepoId.value = nextRepositoryId
}

async function handleSave(video) {
	await store.updateVideo(video)
	editingVideo.value = null
	uni.showToast({
		title: '已保存',
		icon: 'success'
	})
}

async function createRepository() {
	try {
		const result = await new Promise((resolve, reject) => {
			uni.showModal({
				title: '新建仓库',
				editable: true,
				placeholderText: '输入仓库名称',
				success: resolve,
				fail: reject
			})
		})

		if (!result.confirm) {
			return
		}

		const repo = await store.createRepository(result.content)
		importTargetRepoId.value = repo.id
		if (!currentRepositoryId.value) {
			currentRepositoryId.value = repo.id
		}
		uni.showToast({
			title: '仓库已创建',
			icon: 'success'
		})
	} catch (error) {
		uni.showToast({
			title: error.message || '创建失败',
			icon: 'none'
		})
	}
}

async function confirmDeleteVideos() {
	if (!selectedVideoIds.value.length) {
		uni.showToast({
			title: '请先选择视频',
			icon: 'none'
		})
		return
	}

	const result = await new Promise((resolve, reject) => {
		uni.showModal({
			title: '删除视频',
			content: `将删除 ${selectedVideoIds.value.length} 个视频，是否继续？`,
			confirmColor: '#ef4444',
			success: resolve,
			fail: reject
		})
	})

	if (!result.confirm) {
		return
	}

	const selectedVideoIdSet = new Set(selectedVideoIds.value)
	await store.deleteVideos(selectedVideoIds.value)
	if (editingVideo.value && selectedVideoIdSet.has(editingVideo.value.id)) {
		editingVideo.value = null
	}
	exitSelectionMode()
	uni.showToast({
		title: '视频已删除',
		icon: 'success'
	})
}

async function handleImport() {
	if (store.state.importing) {
		return
	}

	try {
		const targetRepoId =
			importTargetRepoId.value && repositoriesList.value.some((item) => item.id === importTargetRepoId.value)
				? importTargetRepoId.value
				: currentRepositoryId.value && repositoriesList.value.some((item) => item.id === currentRepositoryId.value)
				? currentRepositoryId.value
				: repositoriesList.value[0]
				? repositoriesList.value[0].id
				: ''

		if (!targetRepoId) {
			uni.showToast({
				title: '请先创建仓库',
				icon: 'none'
			})
			return
		}

		importTargetRepoId.value = targetRepoId
		const summary = await store.importVideos(targetRepoId)
		showImport.value = false
		const messageParts = [`已导入 ${summary.imported} 条`]
		if (summary.failed) {
			messageParts.push(`${summary.failed} 条失败`)
		}
		if (summary.coverFailed) {
			messageParts.push(`${summary.coverFailed} 条封面未保存`)
		}
		if (summary.duplicated) {
			messageParts.push(`${summary.duplicated} 条重复`)
		}
		uni.showToast({
			title: messageParts.join('，'),
			icon: summary.failed || summary.coverFailed ? 'none' : 'success'
		})
	} catch (error) {
		if (error && /cancel/i.test((error.errMsg || error.message || '').toLowerCase())) {
			return
		}
		uni.showToast({
			title: (error && error.message) || '导入失败',
			icon: 'none'
		})
	}
}

function formatDate(timestamp) {
	const date = new Date(timestamp)
	const month = `${date.getMonth() + 1}`.padStart(2, '0')
	const day = `${date.getDate()}`.padStart(2, '0')
	return `${date.getFullYear()}-${month}-${day}`
}
</script>

<style lang="scss" scoped>
.detail-page {
	padding: 28rpx 28rpx 40rpx;
}

.detail-header {
	position: sticky;
	top: 0;
	z-index: 20;
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20rpx;
	padding: 72rpx 0 24rpx;
	background: rgba(9, 9, 11, 0.94);
}

.detail-left {
	display: flex;
	align-items: center;
	gap: 24rpx;
	flex: 1;
	min-width: 0;
}

.detail-heading {
	flex: 1;
	min-width: 0;
}

.back-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 72rpx;
	height: 72rpx;
	border-radius: 36rpx;
	background: rgba(255, 255, 255, 0.06);
	font-size: 40rpx;
	line-height: 1;
}

.detail-title {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
}

.detail-meta {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.46);
}

.detail-actions {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 16rpx;
}

.primary-button,
.ghost-button,
.danger-button {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 72rpx;
	padding: 0 30rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
	font-weight: 700;
	line-height: 1.2;
	text-align: center;
}

.primary-button {
	background: #ffffff;
	color: #09090b;
}

.ghost-button {
	background: rgba(255, 255, 255, 0.06);
	color: rgba(255, 255, 255, 0.64);
}

.danger-button {
	background: rgba(239, 68, 68, 0.16);
	color: #fecaca;
}

.detail-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
	margin-top: 16rpx;
}

.detail-item {
	position: relative;
	display: flex;
	gap: 20rpx;
	padding: 18rpx;
	border-radius: 28rpx;
}

.detail-item--selecting {
	transform: scale(0.995);
}

.detail-item--selected {
	box-shadow: inset 0 0 0 3rpx rgba(255, 255, 255, 0.9);
}

.detail-check {
	position: absolute;
	top: 18rpx;
	right: 18rpx;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44rpx;
	height: 44rpx;
	border-radius: 50%;
	background: rgba(9, 9, 11, 0.58);
	border: 2rpx solid rgba(255, 255, 255, 0.5);
}

.detail-check__icon {
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	background: transparent;
}

.detail-check__icon--active {
	background: #ffffff;
}

.detail-poster {
	position: relative;
	width: 164rpx;
	height: 212rpx;
	border-radius: 24rpx;
	overflow: hidden;
}

.detail-poster__image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.detail-poster__play {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	font-size: 42rpx;
}

.detail-copy {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.detail-copy__top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16rpx;
}

.detail-copy__title {
	flex: 1;
	font-size: 30rpx;
	font-weight: 700;
	line-height: 1.4;
}

.detail-edit {
	min-width: 88rpx;
	height: 48rpx;
	padding: 0 18rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
	line-height: 48rpx;
	color: rgba(255, 255, 255, 0.72);
	background: rgba(255, 255, 255, 0.06);
}

.detail-copy__desc {
	margin-top: 14rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.56);
}

.detail-copy__date {
	margin-top: auto;
	font-size: 20rpx;
	color: rgba(255, 255, 255, 0.3);
}
</style>
