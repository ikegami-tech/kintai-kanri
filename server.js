const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const bcrypt = require('bcryptjs');

const sesClient = new SESClient({ region: "ap-northeast-1" });

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: 'apb.cha6sci863bs.ap-northeast-1.rds.amazonaws.com',
  user: 'admin',
  password: 'ike31415926',
  database: 'kintai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ==========================================
// 【新規】店舗(事業所) 管理API
// ==========================================
app.get('/api/shops', (req, res) => {
  db.query('SELECT * FROM shops ORDER BY created_at ASC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/shops', (req, res) => {
  const { id, name } = req.body;
  const sql = 'INSERT INTO shops (id, name) VALUES (?, ?)';
  db.query(sql, [id, name], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '店舗を追加しました' });
  });
});

// ==========================================
// 従業員管理API (拡張: shop_id, login_id 対応)
// ==========================================
app.get('/api/employees', (req, res) => {
  const { shop_id } = req.query;
  let sql = 'SELECT * FROM employees';
  const params = [];
  
  // 店舗IDが指定されている場合は絞り込む（システム管理者は指定なしで全件取得）
  if (shop_id) {
    sql += ' WHERE shop_id = ?';
    params.push(shop_id);
  }
  sql += ' ORDER BY kana ASC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('データ取得エラー:', err);
      return res.status(500).json({ error: 'データ取得に失敗しました' });
    }
    res.json(results);
  });
});

app.post('/api/employees', (req, res) => {
  const { name, kana, gender, email, department, role, show_attendance, join_date, retire_date, shop_id, login_id } = req.body;
  const sql = `INSERT INTO employees (name, kana, gender, email, department, role, show_attendance, join_date, retire_date, shop_id, login_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [name, kana, gender, email, department, role, show_attendance, join_date || null, retire_date || null, shop_id || 'shop_01', login_id || null];
  
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '追加成功', id: result.insertId });
  });
});

app.put('/api/employees/:id', (req, res) => {
  const { name, kana, gender, email, department, role, show_attendance, join_date, retire_date, shop_id, login_id } = req.body;
  const sql = `UPDATE employees SET name=?, kana=?, gender=?, email=?, department=?, role=?, show_attendance=?, join_date=?, retire_date=?, shop_id=?, login_id=? WHERE id=?`;
  
  const cleanJoinDate = (join_date && join_date.trim() !== '' && join_date !== '-') ? join_date : null;
  const cleanRetireDate = (retire_date && retire_date.trim() !== '' && retire_date !== '-') ? retire_date : null;

  const values = [name, kana, gender, email, department, role, show_attendance, cleanJoinDate, cleanRetireDate, shop_id || 'shop_01', login_id || null, req.params.id];
  
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '更新成功' });
  });
});

app.delete('/api/employees/:id', (req, res) => {
  const sql = 'DELETE FROM employees WHERE id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '削除成功' });
  });
});

app.patch('/api/employees/:id/status', (req, res) => {
  const { status } = req.body;
  const sql = 'UPDATE employees SET status = ? WHERE id = ?';
  db.query(sql, [status, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'ステータス更新成功' });
  });
});

// ==========================================
// 勤怠打刻API (拡張: shop_id 対応)
// ==========================================
app.get('/api/attendances/monthly', (req, res) => {
  const { year, month, shop_id } = req.query;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  let sql = `
    SELECT 
      a.id, a.employee_id, e.name AS employee_name, DATE_FORMAT(a.work_date, '%Y-%m-%d') AS work_date, DATE_FORMAT(a.clock_in, '%H:%i') AS clock_in, DATE_FORMAT(a.clock_out, '%H:%i') AS clock_out, a.memo, a.shop_id
    FROM attendances a
    JOIN employees e ON a.employee_id = e.id
    WHERE a.work_date BETWEEN ? AND ?
  `;
  const params = [startDate, endDate];

  if (shop_id) {
    sql += ` AND a.shop_id = ?`;
    params.push(shop_id);
  }

  sql += ` ORDER BY e.kana ASC, a.work_date ASC`;

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'データ取得に失敗しました' });
    res.json(results);
  });
});

app.post('/api/attendances', (req, res) => {
  const { id, employee_id, work_date, clock_in, clock_out, memo, mail_to, mail_subject, mail_body, mail_from_name, shop_id } = req.body;
  
  const sendTcEmail = async () => {
    if (mail_to && mail_subject && mail_body) {
      const fromName = mail_from_name || "勤怠管理";
      const emailParams = {
        Source: `"${fromName}" <kintai-kanri@toho-next.com>`, 
        Destination: { ToAddresses: [mail_to] },
        Message: {
          Subject: { Data: mail_subject, Charset: "UTF-8" },
          Body: { Text: { Data: mail_body, Charset: "UTF-8" } },
        },
      };
      try {
        await sesClient.send(new SendEmailCommand(emailParams));
      } catch (emailError) {
        console.error("SESメール送信エラー:", emailError);
      }
    }
  };

  if (id) {
    const sql = `UPDATE attendances SET clock_in = ?, clock_out = ?, memo = ? WHERE id = ?`;
    db.query(sql, [clock_in || null, clock_out || null, memo || null, id], async (err) => {
      if (err) return res.status(500).json({ error: err.message });
      await sendTcEmail();
      res.json({ message: '更新しました' });
    });
  } else {
    const sql = `INSERT INTO attendances (employee_id, work_date, clock_in, clock_out, memo, shop_id) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(sql, [employee_id, work_date, clock_in || null, clock_out || null, memo || null, shop_id || 'shop_01'], async (err) => {
      if (err) return res.status(500).json({ error: err.message });
      await sendTcEmail();
      res.json({ message: '作成しました' });
    });
  }
});

app.delete('/api/attendances/record/:id', (req, res) => {
  const sql = 'DELETE FROM attendances WHERE id = ?';
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '削除成功' });
  });
});

// ==========================================
// 認証・パスワード設定API
// ==========================================
app.post('/api/auth/send-setup-email', async (req, res) => {
  const { email, type } = req.body;
  if (!email) return res.status(400).json({ error: 'メールアドレスが指定されていません' });

  const setupUrl = `https://kintai.thnsys.com/#/password-setup?email=${encodeURIComponent(email)}`; 
  const isReset = (type === 'reset');
  const subjectText = isReset ? "【勤怠管理システム】パスワード再設定のご案内" : "【勤怠管理システム】パスワード設定のお願い";
  const bodyText = isReset
    ? `パスワード再設定のリクエストを受け付けました。\n以下のリンクより新しいパスワードの再設定を行ってください。\n\n${setupUrl}\n\n※このリンクの有効期限は24時間です。\n※心当たりのない場合は本メールを破棄してください。`
    : `従業員登録が完了しました。\n以下のリンクよりパスワードの設定を行ってください。\n\n${setupUrl}\n\n※このリンクの有効期限は24時間です。`;

  const params = {
    Source: "kintai-kanri@toho-next.com", 
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: subjectText, Charset: "UTF-8" },
      Body: { Text: { Data: bodyText, Charset: "UTF-8" } },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    res.status(200).json({ message: 'メールを送信しました' });
  } catch (error) {
    res.status(500).json({ error: 'メールの送信に失敗しました' });
  }
});

app.post('/api/auth/setup-password', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'UPDATE employees SET password = ? WHERE email = ?';
    db.query(sql, [hashedPassword, email], (err, result) => {
      if (err) return res.status(500).json({ error: 'データベースの更新に失敗しました' });
      if (result.affectedRows === 0) return res.status(404).json({ error: '従業員が見つかりません' });
      res.json({ message: 'パスワードを設定しました' });
    });
  } catch (error) {
    res.status(500).json({ error: 'パスワード処理に失敗しました' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { loginId, password } = req.body;
  
  // ログインID または メールアドレスで検索
  const sql = 'SELECT id, name, email, login_id, role, password, shop_id FROM employees WHERE login_id = ? OR email = ?';
  db.query(sql, [loginId, loginId], async (err, results) => {
    if (err) return res.status(500).json({ error: 'データベースの照合に失敗しました' });
    if (results.length === 0) return res.status(401).json({ error: 'ログインIDまたはパスワードが間違っています' });
    
    const user = results[0];
    if (!user.password) return res.status(401).json({ error: 'パスワードが設定されていません。' });

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: 'ログインIDまたはパスワードが間違っています' });

      delete user.password;
      res.json({ message: 'ログイン成功', user: user });
    } catch (error) {
      res.status(500).json({ error: 'ログイン処理中にエラーが発生しました' });
    }
  });
});

// ==========================================
// メールテンプレートAPI
// ==========================================
app.get('/api/mail-templates', (req, res) => {
  const { employee_id, type } = req.query;
  const sql = 'SELECT * FROM mail_templates WHERE employee_id = ? AND type = ? ORDER BY id ASC';
  db.query(sql, [employee_id, type], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/mail-templates', (req, res) => {
  const { id, employee_id, type, name, body } = req.body;
  if (id) {
    const sql = 'UPDATE mail_templates SET name = ?, body = ? WHERE id = ?';
    db.query(sql, [name, body, id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'テンプレートを更新しました' });
    });
  } else {
    const sql = 'INSERT INTO mail_templates (employee_id, type, name, body) VALUES (?, ?, ?, ?)';
    db.query(sql, [employee_id, type, name, body], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'テンプレートを作成しました', id: result.insertId });
    });
  }
});

app.delete('/api/shops/:id', (req, res) => {
  db.query('DELETE FROM shops WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '削除成功' });
  });
});

// AWS Lambda エクスポート設定
const serverless = require('serverless-http');
module.exports.handler = serverless(app);