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

// ==========================================
// 勤怠打刻API (取得・登録・更新)
// ==========================================

// 【月表示用API】指定された年月の打刻実績一覧を取得する
app.get('/api/attendances/monthly', (req, res) => {
  const { year, month } = req.query;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  
  // 該当月の最終日を自動で計算してセットする (9月31日などのエラーを防ぐ)
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const sql = `
    SELECT 
      a.id,
      a.employee_id,
      e.name AS employee_name,
      a.work_date,
      a.clock_in,
      a.clock_out,
      a.memo
    FROM attendances a
    JOIN employees e ON a.employee_id = e.id
    WHERE a.work_date BETWEEN ? AND ?
    ORDER BY e.kana ASC, a.work_date ASC
  `;

  db.query(sql, [startDate, endDate], (err, results) => {
    if (err) {
      console.error('打刻データ取得エラー:', err);
      return res.status(500).json({ error: 'データ取得に失敗しました' });
    }
    res.json(results);
  });
});

// 打刻の新規作成または更新 (UPSERT)
app.post('/api/attendances', (req, res) => {
  const { employee_id, work_date, clock_in, clock_out, memo } = req.body;
  
  const sql = `
    INSERT INTO attendances (employee_id, work_date, clock_in, clock_out, memo)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      clock_in = VALUES(clock_in),
      clock_out = VALUES(clock_out),
      memo = VALUES(memo)
  `;

  db.query(sql, [employee_id, work_date, clock_in || null, clock_out || null, memo || null], (err, result) => {
    if (err) {
      console.error('打刻保存エラー:', err);
      return res.status(500).json({ error: '打刻の保存に失敗しました' });
    }
    res.json({ message: '打刻データを保存しました' });
  });
});

// ==========================================
// サーバー起動 (すべてのAPI定義の最後に記述)
// ==========================================
app.listen(port, () => {
  console.log(`🚀 サーバーが起動しました: http://localhost:${port}`);
});