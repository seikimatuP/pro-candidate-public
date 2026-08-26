// Design Lab用のフィクスチャデータ
export const mockStats = {
  totalPlayers: 156,
  highschoolPlayers: 98,
  universityPlayers: 58,
  totalSchools: 42,
  totalPrefectures: 28,
  topPrefecture: '大阪',
  topPrefectureCount: 12,
  lastUpdated: '2026-02-06T10:30:00Z',
  yearOverYear: {
    totalChange: +23,
    totalChangePercent: +17.3,
    highschoolChange: +15,
    universityChange: +8,
  },
};

export const mockRecentPlayers = [
  { id: '1', name: '田中 太郎', school: '大阪桐蔭高校', prefecture: '大阪', type: 'highschool' as const, filingDate: '2026-02-05' },
  { id: '2', name: '佐藤 健太', school: '東洋大学', prefecture: '東京', type: 'university' as const, filingDate: '2026-02-05' },
  { id: '3', name: '鈴木 一郎', school: '横浜高校', prefecture: '神奈川', type: 'highschool' as const, filingDate: '2026-02-04' },
  { id: '4', name: '高橋 翔太', school: '慶應義塾大学', prefecture: '東京', type: 'university' as const, filingDate: '2026-02-04' },
  { id: '5', name: '渡辺 拓海', school: '報徳学園高校', prefecture: '兵庫', type: 'highschool' as const, filingDate: '2026-02-03' },
];

export const mockPrefectureRanking = [
  { prefecture: '大阪', count: 12, percentage: 100 },
  { prefecture: '東京', count: 10, percentage: 83 },
  { prefecture: '神奈川', count: 8, percentage: 67 },
  { prefecture: '兵庫', count: 7, percentage: 58 },
  { prefecture: '愛知', count: 6, percentage: 50 },
];

export const mockTrendData = [
  { date: '2026-01-15', highschool: 12, university: 5, total: 17 },
  { date: '2026-01-22', highschool: 28, university: 14, total: 42 },
  { date: '2026-01-29', highschool: 55, university: 30, total: 85 },
  { date: '2026-02-03', highschool: 82, university: 48, total: 130 },
  { date: '2026-02-06', highschool: 98, university: 58, total: 156 },
];

// 選手一覧ページ用
export const mockPlayerList = [
  { id: '1', name: '田中 太郎', school: '大阪桐蔭高校', prefecture: '大阪', filingDate: '2026-02-05', position: '投手' },
  { id: '2', name: '山田 次郎', school: '横浜高校', prefecture: '神奈川', filingDate: '2026-02-04', position: '捕手' },
  { id: '3', name: '鈴木 一郎', school: '智辯和歌山高校', prefecture: '和歌山', filingDate: '2026-02-04', position: '内野手' },
  { id: '4', name: '佐藤 三郎', school: '花咲徳栄高校', prefecture: '埼玉', filingDate: '2026-02-03', position: '外野手' },
  { id: '5', name: '高橋 四郎', school: '東海大相模高校', prefecture: '神奈川', filingDate: '2026-02-03', position: '投手' },
  { id: '6', name: '渡辺 五郎', school: '報徳学園高校', prefecture: '兵庫', filingDate: '2026-02-02', position: '内野手' },
  { id: '7', name: '伊藤 六郎', school: '履正社高校', prefecture: '大阪', filingDate: '2026-02-02', position: '外野手' },
  { id: '8', name: '加藤 七郎', school: '中京大中京高校', prefecture: '愛知', filingDate: '2026-02-01', position: '投手' },
];

export const mockFilterOptions = {
  prefectures: ['大阪', '東京', '神奈川', '兵庫', '愛知', '埼玉', '和歌山'],
};
