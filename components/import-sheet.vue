<template>
	<view v-if="props.open">
		<view class="tm-modal-mask" @tap="emit('close')" />
		<view class="tm-sheet import-sheet" @tap.stop>
			<view class="import-header">
				<text class="import-title">导入视频</text>
				<button class="import-close" @tap="emit('close')">x</button>
			</view>

			<view class="import-body">
				<view class="upload-badge">+</view>

				<view class="import-copy">
					<text class="copy-title">从相册选择视频</text>
					<text class="copy-subtitle">支持批量导入，并在导入前指定目标仓库</text>
				</view>

				<button
					class="import-button"
					:class="{ 'import-button--disabled': props.importing || !props.selectedRepoId }"
					:disabled="props.importing || !props.selectedRepoId"
					@tap="handleImport"
				>
					{{ props.importing ? '正在导入...' : '一键导入' }}
				</button>

				<view class="repo-pick">
					<text class="repo-label">选择仓库</text>
					<view class="repo-grid">
						<button
							v-for="item in props.repositories"
							:key="item.id"
							class="repo-tag"
							:class="{ 'repo-tag--active': props.selectedRepoId === item.id }"
							@tap="emit('select-repo', item.id)"
						>
							{{ item.name }}
						</button>
						<button class="repo-tag repo-tag--ghost" @tap="emit('create-repo')">+ 新建</button>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
const props = defineProps({
	open: {
		type: Boolean,
		default: false
	},
	repositories: {
		type: Array,
		default: () => []
	},
	selectedRepoId: {
		type: String,
		default: ''
	},
	importing: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['close', 'select-repo', 'create-repo', 'import'])

function handleImport() {
	if (props.importing || !props.selectedRepoId) {
		return
	}
	emit('import')
}
</script>

<style lang="scss" scoped>
.import-sheet {
	padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

.import-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 32rpx;
	border-bottom: 1rpx solid rgba(255, 255, 255, 0.06);
}

.import-title {
	font-size: 34rpx;
	font-weight: 700;
}

.import-close {
	width: 56rpx;
	height: 56rpx;
	border-radius: 28rpx;
	font-size: 32rpx;
	line-height: 56rpx;
	color: rgba(255, 255, 255, 0.58);
	text-align: center;
}

.import-body {
	padding: 40rpx 32rpx 0;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.upload-badge {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 168rpx;
	height: 168rpx;
	border-radius: 84rpx;
	border: 2rpx dashed rgba(255, 255, 255, 0.16);
	background: rgba(255, 255, 255, 0.04);
	font-size: 72rpx;
	color: rgba(255, 255, 255, 0.34);
}

.import-copy {
	margin-top: 32rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
	text-align: center;
}

.copy-title {
	font-size: 30rpx;
	font-weight: 700;
}

.copy-subtitle {
	font-size: 24rpx;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.44);
}

.import-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 92rpx;
	margin-top: 36rpx;
	border-radius: 28rpx;
	background: #ffffff;
	color: #09090b;
	font-size: 28rpx;
	font-weight: 700;
	line-height: 1.2;
	text-align: center;
}

.import-button--disabled {
	opacity: 0.6;
}

.repo-pick {
	width: 100%;
	margin-top: 32rpx;
}

.repo-label {
	display: block;
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 6rpx;
	color: rgba(255, 255, 255, 0.4);
	text-transform: uppercase;
}

.repo-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
	margin-top: 20rpx;
}

.repo-tag {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 18rpx 24rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.08);
	font-size: 24rpx;
	line-height: 1.2;
	text-align: center;
	color: #ffffff;
}

.repo-tag--active {
	background: #ffffff;
	color: #09090b;
}

.repo-tag--ghost {
	border: 1rpx dashed rgba(255, 255, 255, 0.18);
	background: rgba(255, 255, 255, 0.02);
	color: rgba(255, 255, 255, 0.4);
}
</style>
