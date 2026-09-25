const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
// ▼ ここから追加
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const bcrypt = require('bcryptjs');
const sesClient = new SESClient({ region: "ap-northeast-1" }); // 東京リージョン
// ▲ ここまで追加

const app = express();
const port = 3000;

// フロントエンドからの通信を許可する設定
app.use(cors());
// JSONデータを扱えるようにする設定
app.use(express.json());

// データベース接続設定 (AWS Lambda用に接続プールを使用)
const db = mysql.createPool({
  host: 'apb.cha6sci863bs.ap-northeast-1.rds.amazonaws.com',
  user: 'admin',
  password: 'ike31415926',
  database: 'kintai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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
  
  const cleanJoinDate = (join_date && join_date.trim() !== '' && join_date !== '-') ? join_date : null;
  const cleanRetireDate = (retire_date && retire_date.trim() !== '' && retire_date !== '-') ? retire_date : null;

  const values = [name, kana, gender, email, department, role, show_attendance, cleanJoinDate, cleanRetireDate, req.params.id];
  
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('更新SQLエラー:', err);
      return res.status(500).json({ error: err.message });
    }
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
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  // DATE_FORMATを使って、日付や時間を完全に文字列化して返す（タイムゾーンのズレ防止）
  const sql = `
    SELECT 
      a.id,
      a.employee_id,
      e.name AS employee_name,
      DATE_FORMAT(a.work_date, '%Y-%m-%d') AS work_date,
      DATE_FORMAT(a.clock_in, '%H:%i') AS clock_in,
      DATE_FORMAT(a.clock_out, '%H:%i') AS clock_out,
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

// 打刻の新規作成または更新 (1日複数予定・個別編集対応 & 直行直帰SES自動メール送信)
app.post('/api/attendances', (req, res) => {
  const { id, employee_id, work_date, clock_in, clock_out, memo, mail_to, mail_subject, mail_body, mail_from_name } = req.body;
  
  // 直行・直帰メール送信関数（送信元表示名を実際の従業員名に変更）
  const sendTcEmail = async () => {
    if (mail_to && mail_subject && mail_body) {
      const fromName = mail_from_name || "勤怠管理";
      const emailParams = {
        Source: `"${fromName}" <kintai-kanri@toho-next.com>`, // ★送信元表示名を「従業員名」に設定
        Destination: {
          ToAddresses: [mail_to],
        },
        Message: {
          Subject: { Data: mail_subject, Charset: "UTF-8" },
          Body: { Text: { Data: mail_body, Charset: "UTF-8" } },
        },
      };
      try {
        await sesClient.send(new SendEmailCommand(emailParams));
        console.log("直行直帰メールをSESで送信しました:", mail_to);
      } catch (emailError) {
        console.error("SESメール送信エラー:", emailError);
      }
    }
  };

  if (id) {
    // 既存レコードの更新
    const sql = `UPDATE attendances SET clock_in = ?, clock_out = ?, memo = ? WHERE id = ?`;
    db.query(sql, [clock_in || null, clock_out || null, memo || null, id], async (err) => {
      if (err) return res.status(500).json({ error: err.message });
      await sendTcEmail();
      res.json({ message: '更新しました' });
    });
  } else {
    // 新規レコードの追加
    const sql = `INSERT INTO attendances (employee_id, work_date, clock_in, clock_out, memo) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [employee_id, work_date, clock_in || null, clock_out || null, memo || null], async (err) => {
      if (err) return res.status(500).json({ error: err.message });
      await sendTcEmail();
      res.json({ message: '作成しました' });
    });
  }
});

// レコードID指定の削除API
app.delete('/api/attendances/record/:id', (req, res) => {
  const sql = 'DELETE FROM attendances WHERE id = ?';
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '削除成功' });
  });
});

// ==========================================
// 認証・パスワード設定API (★復活・修正部分)
// ==========================================

// 1. パスワード設定・再設定メールの送信 (AWS SES経由)
app.post('/api/auth/send-setup-email', async (req, res) => {
  const { email, type } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'メールアドレスが指定されていません' });
  }

  const setupUrl = `https://kintai.thnsys.com/#/password-setup?email=${encodeURIComponent(email)}`; 

  // 再設定時と新規登録時で件名・文面を切り替え
  const isReset = (type === 'reset');
  const subjectText = isReset 
    ? "【勤怠管理システム】パスワード再設定のご案内" 
    : "【勤怠管理システム】パスワード設定のお願い";
    
  const bodyText = isReset
    ? `パスワード再設定のリクエストを受け付けました。\n以下のリンクより新しいパスワードの再設定を行ってください。\n\n${setupUrl}\n\n※このリンクの有効期限は24時間です。\n※心当たりのない場合は本メールを破棄してください。`
    : `従業員登録が完了しました。\n以下のリンクよりパスワードの設定を行ってください。\n\n${setupUrl}\n\n※このリンクの有効期限は24時間です。`;

  const params = {
    Source: "kintai-kanri@toho-next.com", 
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: subjectText,
        Charset: "UTF-8",
      },
      Body: {
        Text: {
          Data: bodyText,
          Charset: "UTF-8",
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    await sesClient.send(command);
    res.status(200).json({ message: 'メールを送信しました' });
  } catch (error) {
    console.error("SESメール送信エラー:", error);
    res.status(500).json({ error: 'メールの送信に失敗しました' });
  }
});

// 2. パスワードの設定処理 (DBへ保存・★ハッシュ化)
app.post('/api/auth/setup-password', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // パスワードをハッシュ化 (不可逆の暗号文字に変換)
    const hashedPassword = await bcrypt.hash(password, 10);

    // ハッシュ化したパスワードを保存
    const sql = 'UPDATE employees SET password = ? WHERE email = ?';
    db.query(sql, [hashedPassword, email], (err, result) => {
      if (err) {
        console.error('パスワード更新エラー:', err);
        return res.status(500).json({ error: 'データベースの更新に失敗しました' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: '指定されたメールアドレスの従業員が見つかりません' });
      }
      res.json({ message: 'パスワードを設定しました' });
    });
  } catch (error) {
    console.error('ハッシュ化エラー:', error);
    res.status(500).json({ error: 'パスワード処理に失敗しました' });
  }
});

// 3. ログイン処理 (DBと照合・★ハッシュ比較)
app.post('/api/auth/login', (req, res) => {
  const { loginId, password } = req.body;
  
  // まずはメールアドレスだけでユーザーを検索し、ハッシュ化されたパスワードも取り出す
  const sql = 'SELECT id, name, email, role, password FROM employees WHERE email = ?';
  db.query(sql, [loginId], async (err, results) => {
    if (err) {
      console.error('ログイン照合エラー:', err);
      return res.status(500).json({ error: 'データベースの照合に失敗しました' });
    }
    
    if (results.length === 0) {
      return res.status(401).json({ error: 'ログインIDまたはパスワードが間違っています' });
    }
    
    const user = results[0];

    if (!user.password) {
      return res.status(401).json({ error: 'パスワードが設定されていません。' });
    }

    try {
      // 入力されたパスワードと、DBに保存されているハッシュ文字を比較
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: 'ログインIDまたはパスワードが間違っています' });
      }

      // ログイン成功 (セキュリティのため、フロントへ返す情報からパスワードを消す)
      delete user.password;
      res.json({ message: 'ログイン成功', user: user });

    } catch (error) {
      console.error('パスワード比較エラー:', error);
      res.status(500).json({ error: 'ログイン処理中にエラーが発生しました' });
    }
  });
});

// ==========================================
// メールテンプレートAPI (ユーザー別取得・保存)
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

// ==========================================
// AWS Lambda 用のエクスポート設定
// ==========================================
const serverless = require('serverless-http');
module.exports.handler = serverless(app);