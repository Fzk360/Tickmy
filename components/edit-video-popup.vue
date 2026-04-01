<template>
	<view v-if="open && video">
		<view class="tm-modal-mask" @tap="emit('close')" />
		<view class="tm-modal-card edit-popup" @tap.stop>
			<view class="edit-header">
				<text class="edit-title">Edit Video</text>
				<button class="edit-close" @tap="emit('close')">x</button>
			</view>

			<view class="edit-body">
				<view class="field">
					<text class="field-label">Title</text>
					<input
						v-model="title"
						class="field-input"
						maxlength="40"
						placeholder="Title"
						placeholder-class="field-placeholder"
					/>
				</view>

				<view class="field">
					<text class="field-label">Description</text>
					<textarea
						v-model="description"
						class="field-input field-input--textarea"
						maxlength="120"
						placeholder="Description"
						placeholder-class="field-placeholder"
					/>
				</view>
			</view>

			<view class="edit-actions">
				<button class="action action--ghost" @tap="emit('close')">Cancel</button>
				<button class="action action--solid" @tap="handleSave">Save</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
	open: {
		type: Boolean,
		default: false
	},
	video: {
		type: Object,
		default: null
	}
})

const emit = defineEmits(['close', 'save'])
const title = ref('')
const description = ref('')

watch(
	() => props.video,
	(video) => {
		title.value = video ? video.title || '' : ''
		description.value = video ? video.description || '' : ''
	},
	{ immediate: true }
)

function handleSave() {
	if (!props.video) {
		return
	}

	emit('save', {
		...props.video,
		title: title.value.trim() || props.video.title,
		description: description.value.trim()
	})
}
</script>

<style lang="scss" scoped>
.edit-popup {
	overflow: hidden;
}

.edit-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 32rpx;
	border-bottom: 1rpx solid rgba(255, 255, 255, 0.06);
}

.edit-title {
	font-size: 34rpx;
	font-weight: 700;
}

.edit-close {
	width: 56rpx;
	height: 56rpx;
	border-radius: 28rpx;
	font-size: 32rpx;
	line-height: 56rpx;
	color: rgba(255, 255, 255, 0.58);
	text-align: center;
}

.edit-body {
	padding: 32rpx;
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.field-label {
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 6rpx;
	color: rgba(255, 255, 255, 0.4);
	text-transform: uppercase;
}

.field-input {
	width: 100%;
	padding: 24rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.06);
	font-size: 26rpx;
	line-height: 1.55;
	color: rgba(255, 255, 255, 0.92);
}

.field-input--textarea {
	min-height: 180rpx;
}

.field-placeholder {
	color: rgba(255, 255, 255, 0.3);
}

.edit-actions {
	display: flex;
	gap: 20rpx;
	padding: 0 32rpx 32rpx;
}

.action {
	flex: 1;
	height: 88rpx;
	border-radius: 24rpx;
	font-size: 28rpx;
	font-weight: 700;
}

.action--ghost {
	background: rgba(255, 255, 255, 0.08);
	color: #ffffff;
}

.action--solid {
	background: #ffffff;
	color: #09090b;
}
</style>
