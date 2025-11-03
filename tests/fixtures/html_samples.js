/**
 * テストで使用するHTML文字列のサンプル
 */

// 高校生データのサンプルHTML
const highSchoolSample = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>高校生プロ志望届</title>
</head>
<body>
  <h1>高校生プロ志望届一覧</h1>
  <table class="c-table c-table--no-margin">
    <thead>
      <tr>
        <th>都道府県</th>
        <th>学校名</th>
        <th>名前</th>
        <th>提出日</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>東京都</td>
        <td>サンプル高校</td>
        <td>山田太郎</td>
        <td>2024/03/01</td>
      </tr>
      <tr>
        <td>大阪府</td>
        <td>テスト高校</td>
        <td>佐藤次郎</td>
        <td>2024/03/02</td>
      </tr>
      <tr>
        <td>北海道</td>
        <td>北海道高校</td>
        <td>鈴木三郎</td>
        <td>2024/03/03</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

// 大学生データのサンプルHTML
const universitySample = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>大学生プロ志望届</title>
</head>
<body>
  <h1>大学生プロ志望届一覧</h1>
  <table class="bodytext" width="100%" border="0" cellpadding="4" cellspacing="1" bgcolor="#808080">
    <thead>
      <tr align="center" bgcolor="#ffffff">
        <th>地域</th>
        <th>大学名</th>
        <th>名前</th>
        <th>ポジション</th>
        <th>提出日</th>
      </tr>
    </thead>
    <tbody>
      <tr align="center" bgcolor="#ffffff">
        <td><font color="#000000">関東</font></td>
        <td><font color="#000000">サンプル大学</font></td>
        <td><font color="#000000">山田太郎</font></td>
        <td><font color="#000000">投手</font></td>
        <td><font color="#000000">2024/03/01</font></td>
      </tr>
      <tr align="center" bgcolor="#ffffff">
        <td><font color="#000000">関西</font></td>
        <td><font color="#000000">テスト大学</font></td>
        <td><font color="#000000">佐藤次郎</font></td>
        <td><font color="#000000">外野手</font></td>
        <td><font color="#000000">2024/03/02</font></td>
      </tr>
      <tr align="center" bgcolor="#ffffff">
        <td><font color="#000000">九州</font></td>
        <td><font color="#000000">九州大学</font></td>
        <td><font color="#000000">高橋三郎</font></td>
        <td><font color="#000000">内野手</font></td>
        <td><font color="#000000">2024/03/03</font></td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

// エラーページのサンプルHTML
const errorSample = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>エラー</title>
</head>
<body>
  <h1>ページが見つかりません</h1>
  <p>404 Not Found</p>
</body>
</html>
`;

// データ欠損サンプル（高校生）
const incompleteHighSchoolSample = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>高校生プロ志望届</title>
</head>
<body>
  <h1>高校生プロ志望届一覧</h1>
  <table class="c-table c-table--no-margin">
    <thead>
      <tr>
        <th>都道府県</th>
        <th>学校名</th>
        <th>名前</th>
        <th>提出日</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>東京都</td>
        <td>サンプル高校</td>
        <td>山田太郎</td>
        <td></td> <!-- 提出日欠損 -->
      </tr>
      <tr>
        <td>大阪府</td>
        <td></td> <!-- 学校名欠損 -->
        <td>佐藤次郎</td>
        <td>2024/03/02</td>
      </tr>
      <tr>
        <td>北海道</td>
        <td>北海道高校</td>
        <td>鈴木三郎</td>
        <td>2024/03/03</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

// データ欠損サンプル（大学生）
const incompleteUniversitySample = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>大学生プロ志望届</title>
</head>
<body>
  <h1>大学生プロ志望届一覧</h1>
  <table class="bodytext" width="100%" border="0" cellpadding="4" cellspacing="1" bgcolor="#808080">
    <thead>
      <tr align="center" bgcolor="#ffffff">
        <th>地域</th>
        <th>大学名</th>
        <th>名前</th>
        <th>ポジション</th>
        <th>提出日</th>
      </tr>
    </thead>
    <tbody>
      <tr align="center" bgcolor="#ffffff">
        <td><font color="#000000">関東</font></td>
        <td><font color="#000000">サンプル大学</font></td>
        <td><font color="#000000">山田太郎</font></td>
        <td><font color="#000000"></font></td> <!-- ポジション欠損 -->
        <td><font color="#000000">2024/03/01</font></td>
      </tr>
      <tr align="center" bgcolor="#ffffff">
        <td><font color="#000000">関西</font></td>
        <td><font color="#000000"></font></td> <!-- 大学名欠損 -->
        <td><font color="#000000">佐藤次郎</font></td>
        <td><font color="#000000">外野手</font></td>
        <td><font color="#000000">2024/03/02</font></td>
      </tr>
      <tr align="center" bgcolor="#ffffff">
        <td><font color="#000000">九州</font></td>
        <td><font color="#000000">九州大学</font></td>
        <td><font color="#000000">高橋三郎</font></td>
        <td><font color="#000000">内野手</font></td>
        <td><font color="#000000">2024/03/03</font></td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

// 特殊文字を含むサンプル
const specialCharactersSample = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>特殊文字サンプル</title>
</head>
<body>
  <h1>特殊文字を含むデータ</h1>
  <table class="c-table c-table--no-margin">
    <tbody>
      <tr>
        <td>東京都</td>
        <td>サンプル&amp;テスト高校</td>
        <td>山田 "エース" 太郎</td>
        <td>2024/03/01</td>
      </tr>
      <tr>
        <td>大阪府</td>
        <td>大阪<script>alert('XSS');</script>高校</td>
        <td>佐藤 &lt;選手&gt; 次郎</td>
        <td>2024/03/02</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

module.exports = {
  highSchoolSample,
  universitySample,
  errorSample,
  incompleteHighSchoolSample,
  incompleteUniversitySample,
  specialCharactersSample
};
