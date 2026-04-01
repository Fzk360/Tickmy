<template>
	<view class="tm-page tm-safe-bottom repo-page">
		<view class="repo-header">
			<view class="repo-heading">
				<text class="repo-title">{{ selectionMode ? '批量选择仓库' : '我的仓库' }}</text>
				<text v-if="selectionMode" class="repo-subtitle">已选 {{ selectedRepositoryIds.length }} 个仓库</text>
			</view>
			<view class="repo-header-actions">
				<template v-if="selectionMode">
					<button class="ghost-button" @tap="toggleSelectAllRepositories">
						{{ allRepositoriesSelected ? '取消全选' : '全选' }}
					</button>
					<button class="danger-button" @tap="confirmDeleteRepositories">删除</button>
					<button class="ghost-button" @tap="exitSelectionMode">取消</button>
				</template>
				<template v-else>
					<button class="primary-button" @tap="openImport">导入</button>
					<button class="ghost-button" @tap="createRepository">新建</button>
				</template>
			</view>
		</view>

		<view class="repo-grid">
			<repo-card
				v-for="item in repositoriesList"
				:key="item.id"
				:repo="item"
				:selection-mode="selectionMode"
				:selected="isRepositorySelected(item.id)"
				@select="openDetail"
				@toggle="toggleRepositorySelection"
				@longpress="enterSelectionMode"
			/>

			<button v-if="!selectionMode" class="repo-create" @tap="createRepository">
				<text class="repo-create__plus">+</text>
				<text class="repo-create__label">创建新仓库</text>
			</button>
		</view>

		<import-sheet
			:open="showImport"
			:repositories="repositoriesList"
			:selected-repo-id="selectedRepoId"
			:importing="store.state.importing"
			@close="showImport = false"
			@select-repo="handleRepoSelect"
			@create-repo="createRepository"
			@import="handleImport"
		/>
		<tikmy-tab-bar current="repo" />
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ImportSheet from '../../components/import-sheet.vue'
import RepoCard from '../../components/repo-card.vue'
import TikmyTabBar from '../../components/tikmy-tab-bar.vue'
import { useTikmyStore } from '../../store/tikmy-store'

const store = useTikmyStore()
const showImport = ref(false)
const selectedRepoId = ref('')
const selectedRepositoryIds = ref([])

const repositoriesList = computed(() => store.state.repositories)
const selectionMode = computed(() => selectedRepositoryIds.value.length > 0)
const allRepositoriesSelected = computed(
	() => repositoriesList.value.length > 0 && selectedRepositoryIds.value.length === repositoriesList.value.length
)

function isRepositorySelected(repositoryId) {
	return selectedRepositoryIds.value.includes(repositoryId)
}

function openDetail(repo) {
	if (selectionMode.value) {
		toggleRepositorySelection(repo)
		return
	}

	uni.navigateTo({
		url: `/pages/repo/detail?id=${repo.id}`
	})
}

function handleRepoSelect(repositoryId) {
	selectedRepoId.value = repositoryId
}

function enterSelectionMode(repo) {
	if (!repo || !repo.id) {
		return
	}

	if (!isRepositorySelected(repo.id)) {
		selectedRepositoryIds.value = [...selectedRepositoryIds.value, repo.id]
	}
}

function toggleRepositorySelection(repo) {
	if (!repo || !repo.id) {
		return
	}

	if (isRepositorySelected(repo.id)) {
		selectedRepositoryIds.value = selectedRepositoryIds.value.filter((item) => item !== repo.id)
		return
	}

	selectedRepositoryIds.value = [...selectedRepositoryIds.value, repo.id]
}

function exitSelectionMode() {
	selectedRepositoryIds.value = []
}

function toggleSelectAllRepositories() {
	if (allRepositoriesSelected.value) {
		selectedRepositoryIds.value = []
		return
	}

	selectedRepositoryIds.value = repositoriesList.value.map((item) => item.id)
}

async function openImport() {
	await store.ensureInitialized()
	if (!selectedRepoId.value && repositoriesList.value.length) {
		selectedRepoId.value = repositoriesList.value[0].id
	}
	showImport.value = true
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

		const repository = await store.createRepository(result.content)
		selectedRepoId.value = repository.id
		uni.showToast({
			title: '仓库已创建',
			icon: 'success'
		})
	} catch (error) {
		if (error && error.message) {
			uni.showToast({
				title: error.message,
				icon: 'none'
			})
		}
	}
}

async function confirmDeleteRepositories() {
	if (!selectedRepositoryIds.value.length) {
		uni.showToast({
			title: '请先选择仓库',
			icon: 'none'
		})
		return
	}

	const selectedRepositories = repositoriesList.value.filter((item) => selectedRepositoryIds.value.includes(item.id))
	const nonEmptyRepositories = selectedRepositories.filter((item) => Number(item.videoCount || 0) > 0)
	if (nonEmptyRepositories.length) {
		uni.showToast({
			title: '仅支持删除空仓库，请先清空仓库中的视频',
			icon: 'none'
		})
		return
	}

	const result = await new Promise((resolve, reject) => {
		uni.showModal({
			title: '删除仓库',
			content: `将删除 ${selectedRepositoryIds.value.length} 个空仓库，是否继续？`,
			confirmColor: '#ef4444',
			success: resolve,
			fail: reject
		})
	})

	if (!result.confirm) {
		return
	}

	const removedIdSet = new Set(selectedRepositoryIds.value)
	let summary
	try {
		summary = await store.deleteRepositories(selectedRepositoryIds.value)
	} catch (error) {
		uni.showToast({
			title: (error && error.message) || '删除失败',
			icon: 'none'
		})
		return
	}
	if (removedIdSet.has(selectedRepoId.value)) {
		selectedRepoId.value = repositoriesList.value[0] ? repositoriesList.value[0].id : ''
	}
	selectedRepositoryIds.value = []
	uni.showToast({
		title: `已删除 ${summary.deletedRepositories} 个仓库`,
		icon: 'success'
	})
}

async function handleImport() {
	if (store.state.importing) {
		return
	}

	try {
		const targetRepoId =
			selectedRepoId.value && repositoriesList.value.some((item) => item.id === selectedRepoId.value)
				? selectedRepoId.value
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

		selectedRepoId.value = targetRepoId
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
			title: error.message || '导入失败',
			icon: 'none'
		})
	}
}

onShow(async () => {
	await store.ensureInitialized()
	if (!selectedRepoId.value && repositoriesList.value.length) {
		selectedRepoId.value = repositoriesList.value[0].id
	}
	uni.hideTabBar({
		animation: false
	})
})
</script>

<style lang="scss" scoped>
.repo-page {
	padding: 150rpx 28rpx 0;
}

.repo-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24rpx;
	margin-bottom: 40rpx;
}

.repo-heading {
	flex: 1;
	min-width: 0;
}

.repo-title {
	font-size: 52rpx;
	font-weight: 700;
}

.repo-subtitle {
	display: block;
	margin-top: 12rpx;
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.48);
}

.repo-header-actions {
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

.repo-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 24rpx;
}

.repo-create {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 320rpx;
	border-radius: 36rpx;
	border: 2rpx dashed rgba(255, 255, 255, 0.14);
	background: rgba(255, 255, 255, 0.02);
}

.repo-create__plus {
	font-size: 56rpx;
	color: rgba(255, 255, 255, 0.42);
}

.repo-create__label {
	margin-top: 16rpx;
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.38);
}
</style>
