export const repositories = [
	{
		id: 'repo1',
		name: '必吃榜单',
		videoCount: 12,
		description: '收藏最值得反复回看的餐厅与小店。',
		cover: 'linear-gradient(135deg, #f97316 0%, #fb7185 48%, #312e81 100%)'
	},
	{
		id: 'repo2',
		name: '周末去哪儿',
		videoCount: 8,
		description: '公园、街区、展览和适合慢逛的本地路线。',
		cover: 'linear-gradient(135deg, #22c55e 0%, #0f766e 46%, #164e63 100%)'
	},
	{
		id: 'repo3',
		name: '摄影灵感',
		videoCount: 5,
		description: '适合取景、夜拍和记录城市氛围的镜头灵感。',
		cover: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 45%, #1d4ed8 100%)'
	}
]

export const videos = [
	{
		id: '1',
		title: '城市夜游灵感记录',
		author: '夜行猫',
		description: '发现城市角落里的赛博夜生活美学，路灯、招牌和人群都很出片。',
		likes: '1.2k',
		comments: 32,
		category: '探店',
		repositoryId: 'repo1',
		palette: 'linear-gradient(180deg, #2b1b55 0%, #171717 32%, #0f172a 100%)',
		preview: '霓虹街角',
		danmakus: ['这一段灯光太绝了', '收藏下次去拍', '仓库封面预定']
	},
	{
		id: '2',
		title: '秋日公园慢步地图',
		author: '自然之友',
		description: '午后四点的金色树影最适合散步，低饱和的秋景会让画面特别安静。',
		likes: '856',
		comments: 18,
		category: '风景',
		repositoryId: 'repo2',
		palette: 'linear-gradient(180deg, #365314 0%, #14532d 38%, #052e16 100%)',
		preview: '秋天公园',
		danmakus: ['这颜色像电影截图', '好想周末去走走', '这个仓库很治愈']
	},
	{
		id: '3',
		title: '周末早午餐推荐',
		author: '美食猎人',
		description: '蜂蜜松饼和蓝莓酸奶的组合很稳，适合一个人慢慢吃完整个上午。',
		likes: '2.3k',
		comments: 45,
		category: '美食',
		repositoryId: 'repo1',
		palette: 'linear-gradient(180deg, #7c2d12 0%, #9a3412 34%, #431407 100%)',
		preview: '松饼餐桌',
		danmakus: ['看饿了', '这家我要放进必吃榜单', '镜头质感真好']
	},
	{
		id: '4',
		title: '展览馆的光影时刻',
		author: '胶片玩家',
		description: '白墙和投影交错的时候很适合拍人物剪影，氛围感非常完整。',
		likes: '674',
		comments: 14,
		category: '展览',
		repositoryId: 'repo3',
		palette: 'linear-gradient(180deg, #0f172a 0%, #334155 36%, #020617 100%)',
		preview: '光影展馆',
		danmakus: ['这个转角好高级', '做头像背景很合适', '已经加入摄影灵感']
	}
]

export const comments = [
	{ id: '1', author: '小王', content: '这家店我也去过，晚上去拍真的更有感觉。', time: '2 小时前' },
	{ id: '2', author: '阿青', content: '求具体位置，想周末带朋友一起去。', time: '5 小时前' },
	{ id: '3', author: '木木', content: '画面比例和色彩都很舒服，仓库分类也太实用了。', time: '1 天前' }
]

export const profile = {
	name: '本地生活探店官',
	bio: '分享城市角落的美食与风景 | 资深探店博主 | 合作请私信',
	initials: 'T'
}

export const settings = {
	version: '1.0.0',
	storageMode: '本地优先',
	storageDescription: '所有视频、仓库分类和互动记录默认仅保存在当前设备中，未经过你的主动操作不会上传到任何云端服务。'
}

export function getRepositoryMap() {
	return repositories.reduce((acc, item) => {
		acc[item.id] = item
		return acc
	}, {})
}

export function getRepositoryById(id) {
	return repositories.find((item) => item.id === id)
}

export function getVideosByRepo(id) {
	return videos.filter((item) => item.repositoryId === id)
}

export function estimateStorageKb() {
	return (JSON.stringify(videos).length + JSON.stringify(repositories).length) / 1024
}
