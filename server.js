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
  const sql = 'SELECT * FROM employees ORDER BY kana ASC';
  
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

// ==========================================
// 従業員管理API (追加・更新・削除・ステータス変更)
// ==========================================

// 1. 【新規追加】
app.post('/api/employees', (req, res) => {
  const { name, kana, gender, email, department, role, show_attendance, join_date, retire_date } = req.body;
  const sql = `INSERT INTO employees (name, kana, gender, email, department, role, show_attendance, join_date, retire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [name, kana, gender, email, department, role, show_attendance, join_date || null, retire_date || null];
  
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '追加成功', id: result.insertId });
  });
});

// 2. 【編集(更新)】
app.put('/api/employees/:id', (req, res) => {
  const { name, kana, gender, email, department, role, show_attendance, join_date, retire_date } = req.body;
  const sql = `UPDATE employees SET name=?, kana=?, gender=?, email=?, department=?, role=?, show_attendance=?, join_date=?, retire_date=? WHERE id=?`;
  const values = [name, kana, gender, email, department, role, show_attendance, join_date || null, retire_date || null, req.params.id];
  
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '更新成功' });
  });
});

// 3. 【削除】
app.delete('/api/employees/:id', (req, res) => {
  const sql = 'DELETE FROM employees WHERE id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '削除成功' });
  });
});

// 4. 【ステータス更新 (利用停止/再開)】
app.patch('/api/employees/:id/status', (req, res) => {
  const { status } = req.body;
  const sql = 'UPDATE employees SET status = ? WHERE id = ?';
  db.query(sql, [status, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'ステータス更新成功' });
  });
});

// サーバーを起動
app.listen(port, () => {
  console.log(`🚀 サーバーが起動しました: http://localhost:${port}`);
});