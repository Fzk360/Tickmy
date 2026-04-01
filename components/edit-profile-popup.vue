<template>
	<view v-if="open && profile">
		<view class="tm-modal-mask" @tap="emit('close')" />
		<view class="tm-modal-card profile-popup" @tap.stop>
			<view class="profile-popup__header">
				<text class="profile-popup__title">编辑资料</text>
				<button class="profile-popup__close" @tap="emit('close')">x</button>
			</view>

			<scroll-view scroll-y class="profile-popup__body">
				<view class="asset-block">
					<text class="asset-block__label">背景图</text>
					<view class="asset-preview asset-preview--hero" :style="heroStyle">
						<image v-if="backgroundPath" class="asset-preview__image" :src="backgroundPath" mode="aspectFill" />
						<view class="asset-preview__overlay" />
						<text class="asset-preview__text">{{ backgroundPath ? '已选择本地背景图' : '未设置背景图' }}</text>
					</view>
					<view class="asset-actions">
						<button class="asset-button" @tap="emit('pick-background')">更换背景图</button>
						<button v-if="backgroundPath" class="asset-button asset-button--ghost" @tap="handleClearBackground">移除背景图</button>
					</view>
				</view>

				<view class="asset-block">
					<text class="asset-block__label">头像</text>
					<view class="avatar-row">
						<view class="avatar-preview">
							<image v-if="avatarPath" class="avatar-preview__image" :src="avatarPath" mode="aspectFill" />
							<text v-else class="avatar-preview__initials">{{ initials }}</text>
						</view>
						<view class="avatar-actions">
							<button class="asset-button" @tap="emit('pick-avatar')">更换头像</button>
							<button v-if="avatarPath" class="asset-button asset-button--ghost" @tap="handleClearAvatar">移除头像</button>
						</view>
					</view>
				</view>

				<view class="field">
					<text class="field-label">昵称</text>
					<input
						v-model="name"
						class="field-input field-input--single"
						maxlength="20"
						placeholder="输入你的昵称"
						placeholder-class="field-placeholder"
					/>
				</view>

				<view class="field">
					<text class="field-label">个性签名</text>
					<textarea
						v-model="bio"
						class="field-input field-input--textarea"
						maxlength="80"
						placeholder="写一句介绍你自己的话"
						placeholder-class="field-placeholder"
					/>
				</view>
			</scroll-view>

			<view class="profile-popup__actions">
				<button class="action action--ghost" @tap="emit('close')">取消</button>
				<button class="action action--solid" :disabled="saving" @tap="handleSave">{{ saving ? '保存中...' : '保存' }}</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getInitials } from '../utils/tikmy'

const props = defineProps({
	open: {
		type: Boolean,
		default: false
	},
	profile: {
		type: Object,
		default: null
	},
	saving: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['close', 'save', 'pick-avatar', 'pick-background', 'clear-avatar', 'clear-background'])
const name = ref('')
const bio = ref('')
const avatarPath = ref('')
const backgroundPath = ref('')

const initials = computed(() => getInitials(name.value || (props.profile && props.profile.name) || 'T'))
const heroStyle = computed(() => ({
	background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 50%, #ec4899 100%)'
}))

watch(
	() => props.profile,
	(profile) => {
		name.value = profile ? profile.name || '' : ''
		bio.value = profile ? profile.bio || '' : ''
		avatarPath.value = profile ? profile.avatarPath || '' : ''
		backgroundPath.value = profile ? profile.backgroundPath || '' : ''
	},
	{ immediate: true, deep: true }
)

function handleClearAvatar() {
	avatarPath.value = ''
	emit('clear-avatar')
}

function handleClearBackground() {
	backgroundPath.value = ''
	emit('clear-background')
}

function handleSave() {
	emit('save', {
		name: name.value.trim(),
		bio: bio.value.trim(),
		avatarPath: avatarPath.value,
		backgroundPath: backgroundPath.value
	})
}
</script>

<style lang="scss" scoped>
.profile-popup {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	max-height: calc(100vh - 96rpx);
}

.profile-popup__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 32rpx;
	border-bottom: 1rpx solid rgba(255, 255, 255, 0.06);
}

.profile-popup__title {
	font-size: 34rpx;
	font-weight: 700;
}

.profile-popup__close {
	width: 56rpx;
	height: 56rpx;
	border-radius: 28rpx;
	font-size: 32rpx;
	line-height: 56rpx;
	color: rgba(255, 255, 255, 0.58);
	text-align: center;
}

.profile-popup__body {
	flex: 1;
	height: 0;
	min-height: 0;
	padding: 32rpx;
	box-sizing: border-box;
}

.asset-block {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.asset-block + .asset-block,
.asset-block + .field,
.field + .field {
	margin-top: 24rpx;
}

.asset-block__label,
.field-label {
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 2rpx;
	color: rgba(255, 255, 255, 0.4);
}

.asset-preview {
	position: relative;
	overflow: hidden;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.06);
}

.asset-preview--hero {
	height: 220rpx;
}

.asset-preview__image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.asset-preview__overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, rgba(9, 9, 11, 0.1) 0%, rgba(9, 9, 11, 0.72) 100%);
}

.asset-preview__text {
	position: absolute;
	left: 24rpx;
	right: 24rpx;
	bottom: 20rpx;
	z-index: 2;
	font-size: 24rpx;
	font-weight: 700;
}

.asset-actions,
.avatar-actions {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16rpx;
}

.asset-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 76rpx;
	padding: 0 20rpx;
	border-radius: 22rpx;
	background: rgba(255, 255, 255, 0.08);
	font-size: 24rpx;
	font-weight: 700;
	line-height: 1.2;
	text-align: center;
	white-space: nowrap;
	color: #ffffff;
}

.asset-button--ghost {
	background: rgba(255, 255, 255, 0.04);
	color: rgba(255, 255, 255, 0.68);
}

.avatar-row {
	display: grid;
	grid-template-columns: 152rpx minmax(0, 1fr);
	align-items: center;
	gap: 24rpx;
}

.avatar-actions {
	grid-template-columns: minmax(0, 1fr);
	min-width: 0;
}

.avatar-preview {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 152rpx;
	height: 152rpx;
	border-radius: 76rpx;
	overflow: hidden;
	background: linear-gradient(135deg, #f97316, #fb7185);
	border: 4rpx solid rgba(255, 255, 255, 0.08);
	flex-shrink: 0;
}

.avatar-preview__image {
	width: 100%;
	height: 100%;
}

.avatar-preview__initials {
	font-size: 56rpx;
	font-weight: 700;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.field-input {
	width: 100%;
	padding: 24rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.06);
	font-size: 26rpx;
	line-height: 1.55;
	color: rgba(255, 255, 255, 0.92);
	box-sizing: border-box;
}

.field-input--single {
	height: 88rpx;
	padding: 0 24rpx;
	line-height: 88rpx;
}

.field-input--textarea {
	min-height: 160rpx;
}

.field-placeholder {
	color: rgba(255, 255, 255, 0.3);
}

.profile-popup__actions {
	display: flex;
	gap: 20rpx;
	padding: 20rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
	border-top: 1rpx solid rgba(255, 255, 255, 0.06);
	background: #18181b;
}

.action {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 88rpx;
	padding: 0 24rpx;
	border-radius: 24rpx;
	font-size: 28rpx;
	font-weight: 700;
	line-height: 1.2;
	text-align: center;
}

.action--ghost {
	background: rgba(255, 255, 255, 0.08);
	color: #ffffff;
}

.action--solid {
	background: #ffffff;
	color: #09090b;
}

@media screen and (max-width: 360px) {
	.profile-popup__body {
		padding: 24rpx;
	}

	.asset-actions {
		grid-template-columns: minmax(0, 1fr);
	}

	.avatar-row {
		grid-template-columns: minmax(0, 1fr);
	}

	.avatar-actions {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
