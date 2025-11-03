/**
 * テスト用のフィクスチャデータ
 */

// 高校生選手データのフィクスチャ
const highSchoolPlayers = [
  {
    school: '東京高校',
    name: '山田太郎',
    prefecture: '東京都',
    filingDate: '2024/03/01',
  },
  {
    school: '大阪高校',
    name: '佐藤次郎',
    prefecture: '大阪府',
    filingDate: '2024/03/01',
  },
  {
    school: '名古屋高校',
    name: '鈴木三郎',
    prefecture: '愛知県',
    filingDate: '2024/02/28',
  },
];

// 大学生選手データのフィクスチャ
const universityPlayers = [
  {
    school: '東京大学',
    name: '田中一郎',
    position: '投手',
    filingDate: '2024/03/01',
  },
  {
    school: '京都大学',
    name: '高橋二郎',
    position: '内野手',
    filingDate: '2024/03/01',
  },
];

module.exports = {
  highSchoolPlayers,
  universityPlayers,
};
