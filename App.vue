<script>
export default {
	onLaunch() {
		console.log('TikMy App Launch')
	}
}
</script>

<style lang="scss">
page {
	background: #09090b;
	color: #ffffff;
	font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

view,
text,
button {
	box-sizing: border-box;
}

button {
	margin: 0;
	padding: 0;
	background: transparent;
	border: 0;
	border-radius: 0;
	color: inherit;
	line-height: 1;
}

button::after {
	border: none;
}

.tm-page {
	min-height: 100vh;
	background: #09090b;
	color: #ffffff;
}

.tm-safe-bottom {
	padding-bottom: calc(168rpx + env(safe-area-inset-bottom));
}

.tm-card {
	background: rgba(255, 255, 255, 0.06);
	border: 1rpx solid rgba(255, 255, 255, 0.08);
	box-shadow: 0 28rpx 80rpx rgba(0, 0, 0, 0.22);
}

.tm-glass {
	background: rgba(0, 0, 0, 0.34);
	border: 1rpx solid rgba(255, 255, 255, 0.12);
	backdrop-filter: blur(24rpx);
}

.tm-pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 10rpx 24rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.12);
	border: 1rpx solid rgba(255, 255, 255, 0.14);
	font-size: 22rpx;
	line-height: 1;
}

.tm-section-title {
	font-size: 22rpx;
	font-weight: 700;
	letter-spacing: 8rpx;
	color: rgba(255, 255, 255, 0.35);
	text-transform: uppercase;
}

.tm-modal-mask {
	position: fixed;
	inset: 0;
	z-index: 90;
	background: rgba(0, 0, 0, 0.65);
}

.tm-sheet {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 100;
	border-radius: 40rpx 40rpx 0 0;
	background: #16161a;
	border-top: 1rpx solid rgba(255, 255, 255, 0.08);
	box-shadow: 0 -24rpx 80rpx rgba(0, 0, 0, 0.36);
}

.tm-modal-card {
	position: fixed;
	left: 50%;
	top: 50%;
	z-index: 110;
	width: calc(100vw - 64rpx);
	max-width: 640rpx;
	transform: translate(-50%, -50%);
	border-radius: 36rpx;
	background: #18181b;
	border: 1rpx solid rgba(255, 255, 255, 0.1);
	box-shadow: 0 32rpx 120rpx rgba(0, 0, 0, 0.42);
}

.tm-line-clamp-1,
.tm-line-clamp-2 {
	overflow: hidden;
	display: -webkit-box;
	-webkit-box-orient: vertical;
}

.tm-line-clamp-1 {
	-webkit-line-clamp: 1;
}

.tm-line-clamp-2 {
	-webkit-line-clamp: 2;
}
</style>
