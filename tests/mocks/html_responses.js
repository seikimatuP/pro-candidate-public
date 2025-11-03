/**
 * スクレイピングテスト用のHTMLレスポンス
 */

// 高校生ページのモックHTML
const highSchoolHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>高校生 プロ志望届 2025年度</title>
</head>
<body>
  <div class="content">
    <table class="draft-table">
      <tbody>
        <tr>
          <th>学校名</th>
          <th>選手名</th>
          <th>提出日</th>
        </tr>
        <tr>
          <td>東京高校</td>
          <td>山田太郎</td>
          <td>2025/03/01</td>
        </tr>
        <tr>
          <td>大阪高校</td>
          <td>佐藤次郎</td>
          <td>2025/03/01</td>
        </tr>
        <tr>
          <td>名古屋高校</td>
          <td>鈴木三郎</td>
          <td>2025/02/28</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>
`;

// 大学生ページのモックHTML
const universityHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>大学生 プロ志望届 2025年度</title>
</head>
<body>
  <div class="content">
    <table class="draft-table">
      <tbody>
        <tr>
          <th>大学名</th>
          <th>選手名</th>
          <th>ポジション</th>
          <th>提出日</th>
        </tr>
        <tr>
          <td>東京大学</td>
          <td>田中一郎</td>
          <td>投手</td>
          <td>2025/03/01</td>
        </tr>
        <tr>
          <td>京都大学</td>
          <td>高橋二郎</td>
          <td>内野手</td>
          <td>2025/03/01</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>
`;

module.exports = {
  highSchoolHtml,
  universityHtml,
};
