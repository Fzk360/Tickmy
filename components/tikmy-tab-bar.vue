<template>
	<view class="tabbar-wrap">
		<view class="tabbar tm-glass">
			<button
				v-for="item in items"
				:key="item.key"
				class="tabbar-item"
				:class="{ 'tabbar-item--active': current === item.key }"
				@tap="go(item)"
			>
				<text class="tabbar-icon">{{ item.icon }}</text>
				<text class="tabbar-label">{{ item.label }}</text>
			</button>
		</view>
	</view>
</template>

<script setup>
const props = defineProps({
	current: {
		type: String,
		default: 'home'
	}
})

const items = [
	{ key: 'repo', label: '仓库', icon: '[]', url: '/pages/repo/index' },
	{ key: 'home', label: '首页', icon: '^', url: '/pages/home/index' },
	{ key: 'profile', label: '我的', icon: 'O', url: '/pages/profile/index' }
]

function go(item) {
	if (item.key === props.current) {
		return
	}

	uni.switchTab({
		url: item.url
	})
}
</script>

<style lang="scss" scoped>
.tabbar-wrap {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 60;
	padding: 0 28rpx calc(24rpx + env(safe-area-inset-bottom));
}

.tabbar {
	display: flex;
	align-items: center;
	justify-content: space-around;
	height: 112rpx;
	border-radius: 32rpx;
}

.tabbar-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	width: 180rpx;
	height: 96rpx;
	color: rgba(255, 255, 255, 0.42);
	border-radius: 24rpx;
}

.tabbar-item--active {
	color: #ffffff;
}

.tabbar-icon {
	font-size: 34rpx;
	font-weight: 600;
	line-height: 1;
}

.tabbar-label {
	font-size: 20rpx;
	font-weight: 700;
	line-height: 1;
}
</style>
