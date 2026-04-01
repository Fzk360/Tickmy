<template>
	<view v-if="open">
		<view class="tm-modal-mask" @tap="emit('close')" />
		<view class="tm-sheet comment-sheet" @tap.stop>
			<view class="sheet-header">
				<view>
					<text class="sheet-title">{{ displayedCount }} Comments</text>
					<text class="sheet-subtitle">Stored on this device only</text>
				</view>
				<button class="sheet-close" @tap="emit('close')">x</button>
			</view>

			<scroll-view scroll-y class="sheet-body">
				<view v-for="item in commentList" :key="item.id" class="comment-item">
					<view class="comment-avatar">{{ item.author.slice(0, 1) }}</view>
					<view class="comment-content">
						<text class="comment-author">{{ item.author }}</text>
						<text class="comment-text">{{ item.content }}</text>
						<text class="comment-time">{{ item.time }}</text>
					</view>
				</view>
				<view v-if="!commentList.length" class="comment-empty">
					<text class="comment-empty__title">No comments yet</text>
					<text class="comment-empty__copy">The next comment you send will be saved locally.</text>
				</view>
			</scroll-view>

			<view class="sheet-input">
				<input
					v-model="draft"
					class="input-box"
					placeholder="Add a comment"
					placeholder-class="input-placeholder"
					confirm-type="send"
					@confirm="handleSend"
				/>
				<button class="send-button" :class="{ 'send-button--disabled': !canSend }" @tap="handleSend">Send</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
	open: {
		type: Boolean,
		default: false
	},
	count: {
		type: Number,
		default: 0
	},
	commentList: {
		type: Array,
		default: () => []
	}
})

const emit = defineEmits(['close', 'send'])
const draft = ref('')

const displayedCount = computed(() => props.commentList.length || props.count)
const canSend = computed(() => !!draft.value.trim())

watch(
	() => props.open,
	(open) => {
		if (!open) {
			draft.value = ''
		}
	}
)

function handleSend() {
	if (!canSend.value) {
		return
	}
	emit('send', draft.value.trim())
	draft.value = ''
}
</script>

<style lang="scss" scoped>
.comment-sheet {
	height: 76vh;
	padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.sheet-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 32rpx;
	border-bottom: 1rpx solid rgba(255, 255, 255, 0.06);
}

.sheet-title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
}

.sheet-subtitle {
	display: block;
	margin-top: 8rpx;
	font-size: 20rpx;
	color: rgba(255, 255, 255, 0.38);
}

.sheet-close {
	width: 56rpx;
	height: 56rpx;
	border-radius: 28rpx;
	font-size: 28rpx;
	line-height: 56rpx;
	color: rgba(255, 255, 255, 0.58);
	text-align: center;
}

.sheet-body {
	height: calc(76vh - 220rpx);
	padding: 20rpx 32rpx;
}

.comment-item {
	display: flex;
	gap: 20rpx;
	padding: 18rpx 0;
}

.comment-avatar {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 72rpx;
	height: 72rpx;
	border-radius: 36rpx;
	background: linear-gradient(135deg, #52525b, #27272a);
	font-size: 28rpx;
	font-weight: 700;
}

.comment-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.comment-author {
	font-size: 22rpx;
	font-weight: 700;
	color: rgba(255, 255, 255, 0.55);
}

.comment-text {
	font-size: 26rpx;
	line-height: 1.5;
	color: rgba(255, 255, 255, 0.92);
}

.comment-time {
	font-size: 20rpx;
	color: rgba(255, 255, 255, 0.35);
}

.comment-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	text-align: center;
}

.comment-empty__title {
	font-size: 28rpx;
	font-weight: 700;
}

.comment-empty__copy {
	margin-top: 12rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(255, 255, 255, 0.4);
}

.sheet-input {
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 20rpx 32rpx 8rpx;
	border-top: 1rpx solid rgba(255, 255, 255, 0.06);
}

.input-box {
	flex: 1;
	height: 84rpx;
	padding: 0 28rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.06);
	font-size: 24rpx;
	color: #ffffff;
}

.input-placeholder {
	color: rgba(255, 255, 255, 0.34);
}

.send-button {
	font-size: 26rpx;
	font-weight: 700;
	color: #fb7185;
}

.send-button--disabled {
	opacity: 0.45;
}
</style>
