const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

// フロントエンドからの通信を許可する設定
app.use(cors());
// JSONデータを扱えるようにする設定
app.use(express.json());

// データベース接続設定 (RDSの情報)
const db = mysql.createConnection({
  host: 'apb.cha6sci863bs.ap-northeast-1.rds.amazonaws.com', // エンドポイント
  user: 'admin',                                             // ユーザー名
  password: 'ike31415926',                // ←★ここを実際のパスワードに変更！
  database: 'kintai'                                         // 今回作ったデータベース名
});

// データベースに接続
db.connect((err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
    return;
  }
  console.log('🎉 RDSのMySQLデータベースに接続成功しました！');
});

// 【テスト用API】従業員一覧を取得する
app.get('/api/employees', (req, res) => {
  const sql = 'SELECT * FROM employees';
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('データ取得エラー:', err);
      res.status(500).json({ error: 'データ取得に失敗しました' });
      return;
    }
    // 取得したデータをそのままフロントエンドに返す
    res.json(results);
  });
});

// サーバーを起動
app.listen(port, () => {
  console.log(`🚀 サーバーが起動しました: http://localhost:${port}`);
});