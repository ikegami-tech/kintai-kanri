// ==========================================
// 1. ログイン・ログアウト処理
// ==========================================
document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('.btn-login');
  btn.textContent = 'ログイン中...';
  btn.disabled = true;

  const loginId = document.getElementById('login-id').value;
  const loginPw = document.getElementById('login-pw').value;
  console.log('[API MOCK] POST /api/auth/login', { loginId, loginPw });
  
  await new Promise(resolve => setTimeout(resolve, 600));

  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');

  // ログイン時は常にダッシュボードを表示
  location.hash = '#/dashboard';
  handleRouting();

  btn.textContent = 'ログイン';
  btn.disabled = false;
});

function logout() {
  document.getElementById('app-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
  location.hash = ''; // ★追加：ログアウト時にURLのパスを綺麗にリセットする
}

// ==========================================
// 2. UI制御 & URLルーティング (SPA画面切り替え)
// ==========================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
}

function toggleAttendanceMenu() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('collapsed')) {
    toggleSidebar();
  }
  const submenu = document.getElementById('attendance-sub');
  const arrow = document.getElementById('attendance-arrow');
  submenu.classList.toggle('open');
  arrow.classList.toggle('open');
}

// ▼ URL（ハッシュ）が変更された時や「戻る/進む」を押した時に自動で発火するルーター
window.addEventListener('hashchange', handleRouting);

function handleRouting() {
  const path = location.hash.replace(/^#\//, '') || 'dashboard';
  
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));

  const targetElement = document.getElementById('page-' + path);
  if (targetElement) {
    targetElement.classList.remove('hidden');
    if (path === 'dashboard') {
      renderDashboard();
    }
    // ★追加：日表示が開かれた時も最新の打刻データを再描画する
    if (path === 'daily') {
      renderDailyTable();
    }
    if (path === 'holiday-setting') {
      renderHolidayCalendar();
    }
    // ★追加：残業集計表が開かれた時も最新データで再計算する
    if (path === 'overtime') {
      renderOvertimeTable();
    }
  }

  const titles = {
    'dashboard': 'ダッシュボード',
    'monthly': '月表示 (マトリクス表)',
    'daily': '日表示',
    'overtime': '残業時間集計',
    'employees': '従業員一覧',
    'web-timeclock': 'Web打刻アプリ',
    'employee-detail': '従業員管理 (詳細)',
    'employee-edit': '従業員管理 (編集)',
    'employee-create': '新しい従業員を作成',
    'timeline-detail': '詳細タイムライン',
    'holiday-setting': '休日設定'
  };
  document.getElementById('page-title').textContent = titles[path] || '勤怠管理';

  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeMenu = Array.from(document.querySelectorAll('.nav-item')).find(item => {
    if (path === 'dashboard' && item.textContent.includes('ダッシュボード')) return true;
    if (path === 'monthly' && item.textContent.includes('月表示')) return true;
    if (path === 'daily' && item.textContent.includes('日表示')) return true;
    if ((path === 'employees' || path.includes('employee-')) && item.textContent.includes('従業員')) return true;
    if (path === 'overtime' && item.textContent.includes('集計')) return true;
    return false;
  });
  
  if (activeMenu) {
    activeMenu.classList.add('active');
    if (path === 'monthly' || path === 'daily') {
      document.getElementById('attendance-sub').classList.add('open');
      document.getElementById('attendance-arrow').classList.add('open');
    }
  }
}

function switchPage(pageId) {
  location.hash = '#/' + pageId;
}

function openWebTimeclock() {
  location.hash = '#/web-timeclock';
  const sidebar = document.getElementById('sidebar');
  if (!sidebar.classList.contains('collapsed')) toggleSidebar();
}

// ==========================================
// 3. モーダル・ポップオーバー・トースト共通制御
// ==========================================
function showModal(title, msg) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-msg').textContent = msg;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function showToast(msg) {
  const toast = document.getElementById('toast-message');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.classList.add('hidden'), 500);
  }, 2500);
}

function toggleEmpMenu(buttonEl) {
  const popover = buttonEl.nextElementSibling;
  document.querySelectorAll('.emp-popover-menu').forEach(menu => {
    if (menu !== popover) menu.classList.add('hidden');
  });
  popover.classList.toggle('hidden');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.emp-action-menu')) {
    document.querySelectorAll('.emp-popover-menu').forEach(menu => menu.classList.add('hidden'));
  }
  if (!e.target.closest('#cell-action-menu') && !e.target.closest('.cell-click')) {
    const cellMenu = document.getElementById('cell-action-menu');
    if (cellMenu) cellMenu.classList.add('hidden');
  }
  if (!e.target.closest('#modal-month-picker') && !e.target.closest('.btn-sub')) {
    closeMonthPicker();
  }
  // サイドバー外のどこかをクリックした際に自動で折りたたむ
  if (!e.target.closest('#sidebar')) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.classList.contains('collapsed')) {
      sidebar.classList.add('collapsed');
    }
  }
});

function toggleMailAccordion() {
  const body = document.getElementById('mail-content');
  const arrow = document.getElementById('mail-arrow');
  body.classList.toggle('hidden');
  arrow.textContent = body.classList.contains('hidden') ? '▼' : '▲';
}

// 直行・直帰のチェック状態に合わせてメール送信内容表示エリアの表示/非表示を切り替える関数
function toggleDirectMailArea(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
  let isChecked = false;
  checkboxes.forEach(cb => {
    if (cb.checked) isChecked = true;
  });

  const mailContent = modal.querySelector('#mail-content');
  const mailArea = mailContent ? (mailContent.closest('.form-group') || mailContent.parentElement) : modal.querySelector('.mail-accordion-area');
  
  if (mailArea) {
    if (isChecked) {
      mailArea.classList.remove('hidden');
    } else {
      mailArea.classList.add('hidden');
    }
  }
}

function openMapModal(empName, actionStr, addressStr, emailContent = '') {
  // 打刻種別と従業員名を組み合わせてタイトルに設定（例: "直行出勤 (五十嵐 由樹)"）
  document.getElementById('map-modal-title').textContent = `${actionStr || '出勤'} (${empName})`;
  document.getElementById('map-modal-address').textContent = `住所: ${addressStr}`;
  
  const mapIframe = document.getElementById('map-iframe');
  if (mapIframe) {
    mapIframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(addressStr)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }

  const modalBody = document.getElementById('map-modal-body');
  const emailArea = document.getElementById('map-modal-email-area');
  const emailText = document.getElementById('map-modal-email-text');

  // 「直行」または「直帰」が含まれる場合のみメール内容を表示して幅を広げる
  if (actionStr.includes('直行') || actionStr.includes('直帰')) {
    modalBody.classList.add('map-modal-wide');
    emailArea.classList.remove('hidden');
    emailText.textContent = emailContent || '※メール内容が登録されていません。';
  } else {
    modalBody.classList.remove('map-modal-wide');
    emailArea.classList.add('hidden');
    emailText.textContent = '';
  }

  document.getElementById('map-modal').classList.remove('hidden');
}

function closeMapModal() {
  document.getElementById('map-modal').classList.add('hidden');
}

// ==========================================
// 4. アクション・APIモック処理 (セルクリック・従業員操作など)
// ==========================================
let currentEmpName = '';
let currentDate = '';
let currentCellElement = null; // ★追加：クリックしたセルを記憶する変数

function openCellMenu(event, empName, dateStr) {
  event.stopPropagation();
  currentEmpName = empName;
  currentDate = `2026/09/${dateStr.split('/')[1].padStart(2, '0')}`;
  currentCellElement = event.currentTarget; // ★追加：クリックされたHTML要素を保存
  
  const menu = document.getElementById('cell-action-menu');
  document.getElementById('cell-menu-title').textContent = `${empName} - ${dateStr}`;
  menu.style.left = `${event.pageX}px`;
  menu.style.top = `${event.pageY}px`;
  menu.classList.remove('hidden');
}

function handleCellAction(actionType) {
  document.getElementById('cell-action-menu').classList.add('hidden');
  
  if (actionType === '新規作成') {
    document.getElementById('create-emp-name').textContent = currentEmpName;
    document.getElementById('create-date').value = currentDate;
    
    // ★追加：フォームを完全にリセット（空にする）
    document.getElementById('create-start-h').value = '09';
    document.getElementById('create-start-m').value = '00';
    document.getElementById('create-end-h').value = '18';
    document.getElementById('create-end-m').value = '00';
    const createCheckboxes = document.querySelectorAll('#modal-record-create input[type="checkbox"]');
    createCheckboxes.forEach(cb => {
      cb.checked = false;
      cb.onchange = () => toggleDirectMailArea('modal-record-create');
    });
    toggleDirectMailArea('modal-record-create');

    document.getElementById('modal-record-create').classList.remove('hidden');
    
  } else if (actionType === '編集') {
    document.getElementById('edit-emp-name').textContent = currentEmpName;
    document.getElementById('edit-date').value = currentDate;
    
    // ★追加：セルの内容から時間を読み取ってセット。空ならデフォルト値でリセット
    let startH = '09', startM = '00', endH = '18', endM = '00';
    if (currentCellElement) {
      // innerTextを使ってHTMLタグ（赤文字設定など）を除外した「純粋な時間テキスト」を取得
      const text = currentCellElement.innerText.trim();
      if (text) {
        // 改行や空白で分割して、出勤・退勤時間に割り当て
        const lines = text.split(/\r?\n|\s+/);
        if (lines.length >= 1 && lines[0].includes(':')) {
          const [h, m] = lines[0].split(':');
          startH = h.padStart(2, '0');
          startM = m.padStart(2, '0');
        }
        if (lines.length >= 2 && lines[1].includes(':')) {
          const [h, m] = lines[1].split(':');
          endH = h.padStart(2, '0');
          endM = m.padStart(2, '0');
        }
      }
    }
    
    // 抽出した時間をフォームに適用
    document.getElementById('edit-start-h').value = startH;
    document.getElementById('edit-start-m').value = startM;
    document.getElementById('edit-end-h').value = endH;
    document.getElementById('edit-end-m').value = endM;
    const editCheckboxes = document.querySelectorAll('#modal-record-edit input[type="checkbox"]');
    editCheckboxes.forEach(cb => {
      cb.checked = false;
      cb.onchange = () => toggleDirectMailArea('modal-record-edit');
    });
    toggleDirectMailArea('modal-record-edit');

    document.getElementById('modal-record-edit').classList.remove('hidden');
    
  } else if (actionType === '従業員メモ') {
    document.getElementById('memo-emp-name').textContent = currentEmpName;
    document.getElementById('memo-date').textContent = currentDate;
    
    // ★追加：既存の吹き出しがあれば内容をセットし、なければ空にする
    const memoTextarea = document.getElementById('modal-employee-memo').querySelector('textarea');
    let existingMemo = '';
    if (currentCellElement) {
      const memoIcon = currentCellElement.querySelector('.memo-icon');
      if (memoIcon) {
        existingMemo = memoIcon.getAttribute('data-tooltip');
      }
    }
    memoTextarea.value = existingMemo;

    document.getElementById('modal-employee-memo').classList.remove('hidden');
  } else if (actionType === '詳細へ') {
    document.getElementById('timeline-title').textContent = `${currentDate} 詳細タイムライン`;
    renderTimeline(currentDate);
    location.hash = '#/timeline-detail';
  }
}

function closeRecordModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// 【API通信実装】実績の新規登録処理
async function submitRecordCreate() {
  // 全角・半角スペースを除去して一致判定（表記ブレ対策）
  const normalizedCurrentName = currentEmpName ? currentEmpName.replace(/\s+/g, '') : '';
  const emp = currentEmployeeList.find(e => e.name && e.name.replace(/\s+/g, '') === normalizedCurrentName);

  if (!emp) {
    alert('従業員データが見つかりません。画面を再読み込みして再度お試しください。');
    return;
  }

  // 2026/09/05 や 2026/9/5 などの形式を、SQL標準の YYYY-MM-DD に厳格に変換
  const rawDate = document.getElementById('create-date').value;
  const dateParts = rawDate.replace(/\//g, '-').split('-');
  let dateVal = rawDate;
  if (dateParts.length === 3) {
    const y = dateParts[0];
    const m = String(dateParts[1]).padStart(2, '0');
    const d = String(dateParts[2]).padStart(2, '0');
    dateVal = `${y}-${m}-${d}`;
  }

  const startH = document.getElementById('create-start-h').value;
  const startM = document.getElementById('create-start-m').value;
  const endH = document.getElementById('create-end-h').value;
  const endM = document.getElementById('create-end-m').value;

  // 新規作成モーダル(#modal-record-create)から直行・直帰のチェック状態を取得
  const createCheckboxes = document.querySelectorAll('#modal-record-create input[type="checkbox"]');
  let directMemoList = [];
  if (createCheckboxes[0] && createCheckboxes[0].checked) directMemoList.push('直行');
  if (createCheckboxes[1] && createCheckboxes[1].checked) directMemoList.push('直帰');

  let memoParts = [];
  
  // 休日設定されている日付なら自動で「休日出勤」を付与
  if (typeof holidaySettingsMap !== 'undefined' && holidaySettingsMap[dateVal]) {
    memoParts.push('休日出勤');
  }
  if (directMemoList.length > 0) {
    memoParts.push(directMemoList.join('・'));
  }

  const payload = {
    employee_id: emp.id,
    work_date: dateVal,
    clock_in: `${startH}:${startM}:00`,
    clock_out: `${endH}:${endM}:00`,
    memo: memoParts.join('\n')
  };

  try {
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('保存に失敗しました');

    showToast('実績を新規作成しました');
    closeRecordModal('modal-record-create');
    await renderMatrixTable(); // 最新状態に再描画

  } catch (error) {
    console.error('打刻作成エラー:', error);
    alert('保存に失敗しました。サーバーの状態を確認してください。');
  }
}

// 【API通信実装】実績の編集更新処理
async function submitRecordEdit() {
  // 全角・半角スペースを除去して一致判定（表記ブレ対策）
  const normalizedCurrentName = currentEmpName ? currentEmpName.replace(/\s+/g, '') : '';
  const emp = currentEmployeeList.find(e => e.name && e.name.replace(/\s+/g, '') === normalizedCurrentName);

  if (!emp) {
    alert('従業員データが見つかりません。画面を再読み込みして再度お試しください。');
    return;
  }

  const dateVal = document.getElementById('edit-date').value.replace(/\//g, '-');
  const startH = document.getElementById('edit-start-h').value;
  const startM = document.getElementById('edit-start-m').value;
  const endH = document.getElementById('edit-end-h').value;
  const endM = document.getElementById('edit-end-m').value;

  // 直行・直帰チェック状態を取得
  const editCheckboxes = document.querySelectorAll('#modal-record-edit input[type="checkbox"]');
  let directMemoList = [];
  if (editCheckboxes[0] && editCheckboxes[0].checked) directMemoList.push('直行');
  if (editCheckboxes[1] && editCheckboxes[1].checked) directMemoList.push('直帰');

  let existingMemo = '';
  if (currentCellElement) {
    const memoIcon = currentCellElement.querySelector('.memo-icon');
    if (memoIcon) existingMemo = memoIcon.getAttribute('data-tooltip');
  }

  let memoParts = ['管理者修正'];
  
  // 休日設定されている日付なら自動で「休日出勤」を付与（既存メモにまだ無ければ）
  if (typeof holidaySettingsMap !== 'undefined' && holidaySettingsMap[dateVal]) {
    if (!existingMemo.includes('休日出勤')) {
      memoParts.push('休日出勤');
    }
  }

  if (directMemoList.length > 0) memoParts.push(directMemoList.join('・'));
  if (existingMemo) memoParts.push(existingMemo);

  const finalMemo = memoParts.join('\n');

  const payload = {
    employee_id: emp.id,
    work_date: dateVal,
    clock_in: `${startH}:${startM}:00`,
    clock_out: `${endH}:${endM}:00`,
    memo: finalMemo
  };

  try {
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('更新に失敗しました');

    showToast('実績を更新しました');
    closeRecordModal('modal-record-edit');
    await renderMatrixTable(); // マトリクス表を最新表示に更新

  } catch (error) {
    console.error('打刻更新エラー:', error);
    alert('更新に失敗しました。サーバーの状態を確認してください。');
  }
}

async function submitRecordDelete() {
  const normalizedCurrentName = currentEmpName ? currentEmpName.replace(/\s+/g, '') : '';
  const emp = currentEmployeeList.find(e => e.name && e.name.replace(/\s+/g, '') === normalizedCurrentName);
  
  if (!emp) {
    alert('従業員データが見つかりません');
    return;
  }

  const dateVal = document.getElementById('edit-date').value.replace(/\//g, '-');

  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/${emp.id}/${dateVal}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      // DELETEが未実装の場合はPOSTでデータ消去
      await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: emp.id,
          work_date: dateVal,
          clock_in: null,
          clock_out: null,
          memo: null
        })
      });
    }

    showToast('実績を削除しました');
    closeRecordModal('modal-record-edit');
    await renderMatrixTable();
  } catch (error) {
    console.error('削除エラー:', error);
    alert('削除処理に失敗しました。');
  }
}

// 【API通信実装】従業員メモの保存処理
async function submitRecordMemo() {
  const normalizedCurrentName = currentEmpName ? currentEmpName.replace(/\s+/g, '') : '';
  const emp = currentEmployeeList.find(e => e.name && e.name.replace(/\s+/g, '') === normalizedCurrentName);
  if (!emp) return alert('従業員データが見つかりません。画面を再読み込みして再度お試しください。');

  const dateVal = document.getElementById('memo-date').textContent.replace(/\//g, '-');
  const memoText = document.getElementById('modal-employee-memo').querySelector('textarea').value.trim();

  // 既存の時間と「管理者修正」の赤文字フラグを維持する
  let startH = '', startM = '', endH = '', endM = '';
  let isEdited = false;

  if (currentCellElement) {
    const text = currentCellElement.innerText.trim();
    if (text) {
      const lines = text.split(/\r?\n|\s+/);
      if (lines.length >= 1 && lines[0].includes(':')) {
        const [h, m] = lines[0].split(':');
        startH = h; startM = m;
      }
      if (lines.length >= 2 && lines[1].includes(':')) {
        const [h, m] = lines[1].split(':');
        endH = h; endM = m;
      }
    }
    if (currentCellElement.querySelector('.time-edited')) {
      isEdited = true;
    }
  }

  // DBに保存するメモ内容（赤文字フラグと結合）
  let finalMemo = memoText;
  if (isEdited && memoText) finalMemo = `管理者修正\n${memoText}`;
  else if (isEdited && !memoText) finalMemo = `管理者修正`;

  const payload = {
    employee_id: emp.id,
    work_date: dateVal,
    clock_in: startH ? `${startH}:${startM}:00` : null,
    clock_out: endH ? `${endH}:${endM}:00` : null,
    memo: finalMemo
  };

  try {
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('保存に失敗しました');

    showToast('従業員メモを保存しました');
    closeRecordModal('modal-employee-memo');
    await renderMatrixTable();
  } catch (error) {
    console.error('メモ保存エラー:', error);
    alert('保存に失敗しました。');
  }
}

// 従業員操作関連
let currentEmpAction = null;
let currentEmpTargetId = null;
let currentEmpTargetName = '';

function handleEmpAction(action, empId, empName, toggleType = '') {
  document.querySelectorAll('.emp-popover-menu').forEach(menu => menu.classList.add('hidden'));

  if (action === 'copy') {
    const emp = currentEmployeeList.find(e => e.id === empId);
    openCreateEmployee();
    
    if (emp) {
      setTimeout(() => {
        const form = document.getElementById('employee-create-form');
        const inputs = form.querySelectorAll('.form-input');
        const selects = form.querySelectorAll('.form-select');

        // 名前とフリガナ
        inputs[0].value = emp.name || '';
        inputs[1].value = emp.kana || '';
        
        // 性別
        const genderRadios = form.querySelectorAll('input[name="new_gender"]');
        genderRadios.forEach(r => r.checked = (r.value === (emp.gender || '未選択')));

        // メールアドレス
        inputs[2].value = emp.email || '';

        // 所属
        if (selects.length > 0) {
          selects[0].value = emp.office || 'NEXT';
        }

        // 権限
        const roleRadios = form.querySelectorAll('input[name="new_role"]');
        roleRadios.forEach(r => r.checked = (r.value === (emp.role || '一般')));

        // 勤怠表示
        const attRadios = form.querySelectorAll('input[name="new_attendance_display"]');
        attRadios.forEach(r => r.checked = (emp.show_attendance ? r.value === 'あり' : r.value === 'なし'));

        // 入社日・退職日
        inputs[3].value = (emp.joinDate && emp.joinDate !== '-') ? emp.joinDate : '';
        inputs[4].value = (emp.retireDate && emp.retireDate !== '-') ? emp.retireDate : '';
      }, 50);
    }
    return;
  }

  currentEmpAction = action;
  currentEmpTargetId = empId;
  currentEmpTargetName = empName;

  const modal = document.getElementById('modal-emp-action');
  const msgEl = document.getElementById('emp-action-msg');
  const btnEl = document.getElementById('emp-action-execute-btn');

  if (action === 'toggle') {
    msgEl.textContent = `従業員『${empName}』の利用を${toggleType}しますか？`;
    msgEl.style.color = 'var(--text-main)';
    btnEl.textContent = 'はい';
    btnEl.className = 'btn-primary';
  } else if (action === 'delete') {
    msgEl.textContent = `従業員『${empName}』を削除しますか？`;
    msgEl.style.color = '#e74c3c';
    btnEl.textContent = '削除';
    btnEl.className = 'btn-danger';
  }
  modal.classList.remove('hidden');
}

function closeEmpActionModal() {
  document.getElementById('modal-emp-action').classList.add('hidden');
  currentEmpAction = null;
  currentEmpTargetId = null;
}

// 【API通信実装】実際のデータベース（バックエンド）で削除・ステータス更新を行う
async function executeEmpAction() {
  try {
    if (currentEmpAction === 'toggle') {
      // 1. 現在のステータスバッジの状態から、新しいステータスを判定
      const statusBadge = document.getElementById(`emp-status-${currentEmpTargetId}`);
      const isCurrentlyStopped = statusBadge && !statusBadge.classList.contains('hidden');
      const newStatus = isCurrentlyStopped ? '利用中' : '利用停止';

      // 2. ローカルサーバー(API)へPATCHリクエスト（ステータス更新）
      const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees/${currentEmpTargetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('ステータス更新に失敗しました');

      showToast(`従業員『${currentEmpTargetName}』のステータスを更新しました。`);
      
    } else if (currentEmpAction === 'delete') {
      // 1. ローカルサーバー(API)へDELETEリクエスト（削除）
      const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees/${currentEmpTargetId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('削除に失敗しました');

      showToast(`従業員『${currentEmpTargetName}』を削除しました。`);
    }

    // 処理成功後、一覧データを再取得して画面を最新状態に更新！
    await renderEmployees();

  } catch (error) {
    console.error('操作エラー:', error);
    alert('操作に失敗しました。サーバーが起動しているか確認してください。');
  } finally {
    closeEmpActionModal();
  }
}

function showEmployeeDetail(identifier) {
  // IDまたは名前で該当の従業員データを探す
  let emp;
  if (typeof identifier === 'number') {
    emp = currentEmployeeList.find(e => e.id === identifier);
  } else {
    emp = currentEmployeeList.find(e => e.name === identifier);
  }
  
  if (!emp) return;

  currentEmpTargetId = emp.id; // 現在選択中の従業員IDを記録

  // 画面の各項目を実際のデータで書き換える
  document.getElementById('detail-emp-name').textContent = emp.name;
  document.getElementById('val-name').textContent = emp.name;
  document.getElementById('val-kana').textContent = emp.kana;
  document.getElementById('val-gender').textContent = emp.gender;
  document.getElementById('detail-email').textContent = emp.email || '-';
  document.getElementById('val-department').textContent = emp.office;
  document.getElementById('val-role').textContent = emp.role;
  document.getElementById('val-attendance').textContent = emp.show_attendance ? 'あり' : 'なし';
  document.getElementById('val-join-date').textContent = emp.joinDate;
  document.getElementById('val-retire-date').textContent = emp.retireDate;

  location.hash = '#/employee-detail';
}

function openEditEmployee() {
  const emp = currentEmployeeList.find(e => e.id === currentEmpTargetId);
  if (!emp) return;

  document.getElementById('edit-emp-name').textContent = emp.name;
  document.getElementById('edit-name').value = emp.name;
  document.getElementById('edit-kana').value = emp.kana;
  
  // 性別のラジオボタン
  const genderRadios = document.querySelectorAll('input[name="gender"]');
  genderRadios.forEach(r => r.checked = (r.value === emp.gender));

  // 所属
  const deptSelect = document.querySelector('#employee-edit-form .form-select');
  if (deptSelect) deptSelect.value = emp.office;

  // 権限
  const roleRadios = document.querySelectorAll('input[name="role"]');
  roleRadios.forEach(r => r.checked = (r.value === emp.role));

  // 勤怠表示
  const attRadios = document.querySelectorAll('input[name="attendance_display"]');
  attRadios.forEach(r => r.checked = (emp.show_attendance ? r.value === 'あり' : r.value === 'なし'));

  // 入社日・退職日
  document.getElementById('edit-join-date').value = emp.joinDate !== '-' ? emp.joinDate : '';
  document.getElementById('edit-retire-date').value = emp.retireDate !== '-' ? emp.retireDate : '';

  location.hash = '#/employee-edit';
}

function closeEditEmployee() {
  location.hash = '#/employee-detail';
}

// 【API通信実装】実際のデータベース（バックエンド）へ編集内容を更新保存する
async function saveEmployeeEdit(event) {
  event.preventDefault();
  const btn = event.target.querySelector('.btn-save');
  btn.textContent = '保存中...';
  btn.disabled = true;

  const form = event.target;
  const currentEmp = currentEmployeeList.find(e => e.id === currentEmpTargetId);

  const genderEl = form.querySelector('input[name="gender"]:checked');
  const roleEl = form.querySelector('input[name="role"]:checked');
  const attEl = form.querySelector('input[name="attendance_display"]:checked');

  const payload = {
    name: document.getElementById('edit-name').value,
    kana: document.getElementById('edit-kana').value,
    gender: genderEl ? genderEl.value : (currentEmp ? currentEmp.gender : '未選択'),
    email: currentEmp ? currentEmp.email : '',
    department: form.querySelector('.form-select') ? form.querySelector('.form-select').value : 'NEXT',
    role: roleEl ? roleEl.value : (currentEmp ? currentEmp.role : '一般'),
    show_attendance: attEl ? (attEl.value === 'あり' ? 1 : 0) : 1,
    join_date: document.getElementById('edit-join-date').value ? document.getElementById('edit-join-date').value.replace(/\//g, '-') : null,
    retire_date: document.getElementById('edit-retire-date').value ? document.getElementById('edit-retire-date').value.replace(/\//g, '-') : null
  };

  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees/${currentEmpTargetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('更新に失敗しました');

    showToast('従業員情報を保存しました。');
    
    // 一覧データを再取得して詳細画面と一覧画面を即座に更新
    await renderEmployees();
    showEmployeeDetail(currentEmpTargetId);
    closeEditEmployee();

  } catch (error) {
    console.error('更新エラー:', error);
    alert('保存に失敗しました。サーバーが起動しているか確認してください。');
  } finally {
    btn.textContent = '設定を保存';
    btn.disabled = false;
  }
}

function openCreateEmployee() {
  document.getElementById('employee-create-form').reset();
  location.hash = '#/employee-create';
}

function closeCreateEmployee() {
  location.hash = '#/employees';
}

// 【API通信実装】実際のデータベース（バックエンド）へ従業員データを保存する
async function saveNewEmployee(event) {
  event.preventDefault();
  const btn = event.target.querySelector('.btn-save');
  btn.textContent = '保存中...';
  btn.disabled = true;

  const form = event.target;
  const inputs = form.querySelectorAll('.form-input');
  const selects = form.querySelectorAll('.form-select');

  // 入力フォームからデータを抽出してペイロード（送信データ）を作成
  const payload = {
    name: inputs[0].value,
    kana: inputs[1].value,
    gender: form.querySelector('input[name="new_gender"]:checked').value,
    email: inputs[2].value,
    department: selects[0].value,
    role: form.querySelector('input[name="new_role"]:checked').value,
    show_attendance: form.querySelector('input[name="new_attendance_display"]:checked').value === 'あり' ? 1 : 0,
    join_date: inputs[3].value ? inputs[3].value.replace(/\//g, '-') : null, // 2026/09/11 を 2026-09-11 に変換
    retire_date: inputs[4].value ? inputs[4].value.replace(/\//g, '-') : null
  };

  try {
    // 立ち上げているローカルサーバー(API)へPOSTリクエスト
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('サーバーエラーが発生しました');
    }

    showToast('新しい従業員を作成しました。');
    closeCreateEmployee();
    form.reset(); // フォームを空に戻す

    // 保存後に一覧データを再取得して画面を更新！
    await renderEmployees();

    // メール送信処理（今回はモックのまま）
    if (payload.email) {
      sendPwSetupEmail(payload.email);
    }
  } catch (error) {
    console.error('保存エラー:', error);
    alert('保存に失敗しました。サーバーが起動しているか確認してください。');
  } finally {
    btn.textContent = '設定を保存';
    btn.disabled = false;
  }
}
// --- ダッシュボード ---
let currentDashboardDate = new Date();

// 前日(-1)・翌日(+1)への日付切り替え処理
function changeDashboardDate(offset) {
  currentDashboardDate.setDate(currentDashboardDate.getDate() + offset);
  renderDashboard();
}

async function renderDashboard() {
  const today = currentDashboardDate;
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const daysStr = ['日', '月', '火', '水', '木', '金', '土'];
  const dayOfWeek = daysStr[today.getDay()];
  
  // 右上の日付表示を本日の日付に更新
  const dateStr = `${year}年${month}月${day}日(${dayOfWeek})`;
  const dateEl = document.getElementById('current-date-str');
  if (dateEl) dateEl.textContent = dateStr;

  const todayKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // 1. 全従業員一覧を取得
  const empList = currentEmployeeList.length > 0 ? currentEmployeeList : await fetchEmployeesAPI('ALL', '');

  // 2. 本日が含まれる年月の打刻データをRDSから取得
  let attendancesData = [];
  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${year}&month=${month}`, { cache: 'no-store' });
    if (response.ok) attendancesData = await response.json();
  } catch (error) {
    console.error('ダッシュボード用データ取得エラー:', error);
  }

  // 3. 今日の打刻データをマップ化
  const todayAttendanceMap = {};
  attendancesData.filter(a => a.work_date === todayKey).forEach(a => {
    todayAttendanceMap[a.employee_id] = a;
  });

  // 4. 従業員ごとの当日の出退勤ステータス判定
  const notStarted = [];
  const working = [];
  const finished = [];

  empList.forEach(emp => {
    const att = todayAttendanceMap[emp.id];
    const formatTime = (t) => t ? t.substring(0, 5) : '';

    if (!att || !att.clock_in) {
      notStarted.push({ name: emp.name, timeStr: '-' });
    } else if (att.clock_in && !att.clock_out) {
      working.push({ name: emp.name, timeStr: `${formatTime(att.clock_in)} -` });
    } else if (att.clock_in && att.clock_out) {
      finished.push({ name: emp.name, timeStr: `${formatTime(att.clock_in)} - ${formatTime(att.clock_out)}` });
    }
  });

  // 5. DOM描画
  document.getElementById('dash-not-started-count').textContent = `${notStarted.length}名`;
  document.getElementById('dash-not-started-list').innerHTML = notStarted.length > 0 ? notStarted.map(emp => `
    <li class="member-item">
      <span class="member-name"><span class="dot-status" style="background-color: #f39c12;"></span>${emp.name}</span>
      <span class="time-text">${emp.timeStr}</span>
    </li>
  `).join('') : '<li class="member-item" style="color:#999; justify-content:center;">該当者なし</li>';

  document.getElementById('dash-working-count').textContent = `${working.length}名`;
  document.getElementById('dash-working-list').innerHTML = working.length > 0 ? working.map(emp => `
    <li class="member-item">
      <span class="member-name"><span class="dot-status dot-working"></span>${emp.name}</span>
      <span class="time-text">${emp.timeStr}</span>
    </li>
  `).join('') : '<li class="member-item" style="color:#999; justify-content:center;">該当者なし</li>';

  document.getElementById('dash-finished-count').textContent = `${finished.length}名`;
  document.getElementById('dash-finished-list').innerHTML = finished.length > 0 ? finished.map(emp => `
    <li class="member-item">
      <span class="member-name"><span class="dot-status dot-finished"></span>${emp.name}</span>
      <span class="time-text">${emp.timeStr}</span>
    </li>
  `).join('') : '<li class="member-item" style="color:#999; justify-content:center;">該当者なし</li>';
}

let currentMatrixDate = new Date(); // 現在の年月で初期化

// 【API通信実装】RDSから指定月の打刻データを取得してマトリクス表を描画する
async function renderMatrixTable() {
  const year = currentMatrixDate.getFullYear();
  const month = currentMatrixDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  document.getElementById('matrix-month-title').textContent = `${year}年 ${String(month).padStart(2, '0')}月度`;

  // 1. ヘッダー(日付行)の生成
  const daysStr = ['日', '月', '火', '水', '木', '金', '土'];
  let theadHtml = `
    <tr>
      <th rowspan="2" class="col-emp-name">従業員名</th>
      <th colspan="${daysInMonth}" style="font-size: 15px; letter-spacing: 2px; background: #f4f7f9;">${month}月</th>
      <th rowspan="2" class="col-sum">計</th>
    </tr>
    <tr>
  `;
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month - 1, i);
    const dayOfWeek = d.getDay();
    let thClass = dayOfWeek === 0 ? 'sun' : (dayOfWeek === 6 ? 'sat' : '');
    theadHtml += `<th class="${thClass}">${i}<br><small>(${daysStr[dayOfWeek]})</small></th>`;
  }
  theadHtml += `</tr>`;
  document.getElementById('matrix-thead').innerHTML = theadHtml;

  // 2. バックエンドAPIから実際の打刻データを取得 (cache: 'no-store' でキャッシュによる未反映を完全ブロック)
  let attendancesData = [];
  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${year}&month=${month}`, { cache: 'no-store' });
    if (response.ok) {
      attendancesData = await response.json();
    }
  } catch (error) {
    console.error('マトリクスデータ取得エラー:', error);
  }

  // 3. 取得した打刻データを「従業員ID別・日付別」に整理（マップ化）
  const attendanceMap = {};
  attendancesData.forEach(att => {
    // バックエンドから "YYYY-MM-DD" で返ってくるので、JSでの変換を省いてそのままキーにする
    const dateStr = att.work_date;
    
    if (!attendanceMap[att.employee_id]) {
      attendanceMap[att.employee_id] = {};
    }
    // 時間も "HH:mm" で返ってくるのでそのまま使用
    let timeText = `${att.clock_in || ''}<br>${att.clock_out || ''}`;
    let memoHtml = '';

    if (att.memo) {
      // 1. 「管理者修正」が含まれていれば時間を赤文字にする
      if (att.memo.includes('管理者修正')) {
        timeText = `<span class="time-edited">${timeText}</span>`;
      }
      
      // 2. システム用の判定テキスト（管理者修正・直行・直帰）を除外した純粋なメモを取り出す
      const pureMemo = att.memo
        .replace(/管理者修正/g, '')
        .replace(/直行/g, '')
        .replace(/直帰/g, '')
        .replace(/・/g, '')
        .trim();
      
      // 3. 純粋なユーザーメモが残っている場合のみ吹き出しアイコン（💬）を表示する
      if (pureMemo) {
        memoHtml = `<span class="memo-icon" data-tooltip="${pureMemo}">💬</span>`;
      }
    }

    attendanceMap[att.employee_id][dateStr] = `${timeText}${memoHtml}`;
  });

  // 4. 従業員一覧（currentEmployeeList）をもとに表の行を生成
  let tbodyHtml = '';
  const empList = currentEmployeeList.length > 0 ? currentEmployeeList : await fetchEmployeesAPI('ALL', '');

  empList.forEach(emp => {
    tbodyHtml += `<tr><td class="col-emp-name">${emp.name}</td>`;
    
    let retireDateObj = emp.retireDate && emp.retireDate !== '-' ? new Date(emp.retireDate) : null;
    if (retireDateObj) retireDateObj.setHours(0, 0, 0, 0);

    for (let i = 1; i <= daysInMonth; i++) {
      const currentDateObj = new Date(year, month - 1, i);
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      let tdClass = retireDateObj ? 'cell-readonly' : 'cell-click';
      const isAfterRetire = retireDateObj && (currentDateObj > retireDateObj);
      let cellData = '';

      if (isAfterRetire) {
        tdClass += ' cell-retired';
      } else {
        cellData = (attendanceMap[emp.id] && attendanceMap[emp.id][dateKey]) || '';
        if (retireDateObj && cellData) {
          cellData = `<div class="retired-time-box">${cellData}</div>`;
        }
      }
      
      if (isAfterRetire || retireDateObj) {
        tbodyHtml += `<td class="${tdClass}">${cellData}</td>`;
      } else {
        tbodyHtml += `<td class="${tdClass}" onclick="openCellMenu(event, '${emp.name}', '${month}/${i}')">${cellData}</td>`;
      }
    }
    tbodyHtml += `<td class="col-sum">-</td></tr>`;
  });

  document.getElementById('matrix-tbody').innerHTML = tbodyHtml;
}

function changeMatrixMonth(offset) {
  if (offset === 0) {
    const now = new Date();
    currentMatrixDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    currentMatrixDate.setMonth(currentMatrixDate.getMonth() + offset);
  }
  renderMatrixTable();
}

// --- 詳細タイムライン (ガントチャート) ---
async function renderTimeline(dateStr) {
  console.log(`[API MOCK] GET /api/attendance/timeline?date=${dateStr}`);
  const data = [
    { name: '安藤 健太郎', memo: '[NEXTメモ]\n休日出勤', barLeft: '70.4%', barWidth: '14.7%', timeText: '18:28-21:43', hasRest: false },
    { name: '五十嵐 由樹', memo: '', barLeft: '0', barWidth: '0', timeText: '', hasRest: false },
    { name: '池上 裕士', memo: '[NEXTメモ]\n休憩あり', barLeft: '26.8%', barWidth: '42.4%', timeText: '08:52-18:12 [休08:53-09:53]', hasRest: true },
    { name: '池谷 あや子', memo: '', barLeft: '0', barWidth: '0', timeText: '', hasRest: false },
    { name: '石井 秀龍', memo: '[NEXTメモ]\n修正済み', barLeft: '26.8%', barWidth: '42.4%', timeText: '08:52-18:12 [休08:53-09:53]', hasRest: true },
    { name: '岩本 勇祐', memo: '[NEXTメモ]\n午後出勤', barLeft: '40.5%', barWidth: '25.5%', timeText: '11:54-17:31', hasRest: false },
    { name: '岡田 光平', memo: '[NEXTメモ]\n午前中のみ', barLeft: '31.3%', barWidth: '7.1%', timeText: '09:52-11:26', hasRest: false }
  ];

  document.getElementById('gantt-tbody').innerHTML = data.map(emp => {
    const memoHtml = emp.memo ? `<span class="memo-icon" data-tooltip="${emp.memo}">💬</span>` : '';
    const barHtml = emp.barWidth !== '0' ? `
      <div class="gantt-bar" style="left: ${emp.barLeft}; width: ${emp.barWidth};">${emp.timeText}</div>
      ${emp.hasRest ? `<div class="gantt-bar-stripe" style="left: ${emp.barLeft}; width: 4.5%;"></div>` : ''}
    ` : '';
    return `
      <tr>
        <td class="gantt-emp-col">${emp.name} ${memoHtml}</td>
        <td colspan="22" class="gantt-track">${barHtml}</td>
      </tr>
    `;
  }).join('');
}

// --- 日表示 ---
let currentDailyDate = new Date(); // 本日の日付で初期化

function changeDailyDate(offset) {
  if (offset === 0) {
    currentDailyDate = new Date(); // 今日へリセット
  } else {
    currentDailyDate.setDate(currentDailyDate.getDate() + offset);
  }
  renderDailyTable();
}

async function renderDailyTable() {
  const year = currentDailyDate.getFullYear();
  const month = currentDailyDate.getMonth() + 1;
  const date = currentDailyDate.getDate();
  const daysStr = ['日', '月', '火', '水', '木', '金', '土'];
  const dayOfWeek = daysStr[currentDailyDate.getDay()];
  
  const titleEl = document.getElementById('daily-date-title');
  if (titleEl) {
    titleEl.textContent = `${year}年${String(month).padStart(2, '0')}月${String(date).padStart(2, '0')}日(${dayOfWeek})`;
  }

  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

  // 1. 全従業員一覧の取得
  const empList = currentEmployeeList.length > 0 ? currentEmployeeList : await fetchEmployeesAPI('ALL', '');

  // 2. 指定年月の打刻データをRDSから取得
  let attendancesData = [];
  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${year}&month=${month}`, { cache: 'no-store' });
    if (response.ok) attendancesData = await response.json();
  } catch (error) {
    console.error('日表示データ取得エラー:', error);
  }

  // 3. 当日の打刻データをマップ化
  const todayAttendanceMap = {};
  attendancesData.filter(a => a.work_date === dateKey).forEach(a => {
    todayAttendanceMap[a.employee_id] = a;
  });

  const tbody = document.getElementById('daily-tbody');
  
  if (empList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #7f8c8d;">従業員データがありません</td></tr>';
    return;
  }

  tbody.innerHTML = empList.map(emp => {
    const att = todayAttendanceMap[emp.id];
    const formatTime = (t) => t ? t.substring(0, 5) : '';
    
    let timeStr = '-';
    let statusDotClass = '';
    let actionStr = '出勤';
    let fullTimeStr = `${month}/${date} -`;
    
    if (att && att.clock_in) {
      if (att.clock_out) {
        timeStr = `${formatTime(att.clock_in)} ～ ${formatTime(att.clock_out)}`;
        statusDotClass = 'dot-finished';
        actionStr = '退勤';
        fullTimeStr = `${month}/${date} ${formatTime(att.clock_in)} - ${formatTime(att.clock_out)}`;
      } else {
        timeStr = `${formatTime(att.clock_in)} ～`;
        statusDotClass = 'dot-working';
        actionStr = '出勤';
        fullTimeStr = `${month}/${date} ${formatTime(att.clock_in)}`;
      }
    }

    // メモと管理者修正の判定
    let memoHtml = '';
    let pureMemo = '';
    if (att && att.memo) {
      if (att.memo.includes('管理者修正')) {
        timeStr = `<span class="time-edited">${timeStr}</span>`;
      }
      // システム用の判定テキスト（管理者修正・直行・直帰）を除外して純粋なメモを取り出す
      pureMemo = att.memo
        .replace(/管理者修正/g, '')
        .replace(/直行/g, '')
        .replace(/直帰/g, '')
        .replace(/・/g, '')
        .trim();

      if (pureMemo) {
        memoHtml = `<span class="memo-icon" data-tooltip="${pureMemo}">💬</span>`;
      }
    }

    // 直行・直帰の判定
    const isDirectIn = att && att.memo && att.memo.includes('直行');
    const isDirectOut = att && att.memo && att.memo.includes('直帰');
    const addressStr = '東京都千代田区有楽町1-1-1';

    // スロット1: 出勤 / 直行出勤
    let inSlotHtml = '<div class="avatar-empty"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
    
    if (att && att.clock_in) {
      const inLabel = isDirectIn ? '直行出勤' : '出勤';
      const inBadgeText = isDirectIn ? '📍直行' : '📍地図';
      const inClass = isDirectIn ? 'direct-style' : '';
      const inBadgeClass = isDirectIn ? 'direct-badge' : '';
      const inFullTime = `${month}/${date} ${formatTime(att.clock_in)}`;

      inSlotHtml = `
        <div class="avatar-map-box">
          <div class="avatar-circle ${inClass} has-tooltip" data-tooltip="${inLabel}\n${inFullTime}\n住所:${addressStr}">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <button class="btn-map-badge ${inBadgeClass}" onclick="openMapModal('${emp.name}', '${inLabel}', '${addressStr}', '${pureMemo.replace(/\n/g, '\\n')}')">${inBadgeText}</button>
        </div>
      `;
    }

    // スロット2〜5: 空白アバター枠（スマレジ再現）
    const emptySlotHtml = '<div class="avatar-empty"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
    const middleSlots = `${emptySlotHtml}${emptySlotHtml}${emptySlotHtml}${emptySlotHtml}`;

    // スロット6: 退勤 / 直帰退勤
    let outSlotHtml = emptySlotHtml;
    if (att && att.clock_out) {
      const outLabel = isDirectOut ? '直帰退勤' : '退勤';
      const outBadgeText = isDirectOut ? '📍直帰' : '📍地図';
      const outClass = isDirectOut ? 'direct-style' : '';
      const outBadgeClass = isDirectOut ? 'direct-badge' : '';
      const outFullTime = `${month}/${date} ${formatTime(att.clock_out)}`;

      outSlotHtml = `
        <div class="avatar-map-box">
          <div class="avatar-circle ${outClass} has-tooltip" data-tooltip="${outLabel}\n${outFullTime}\n住所:${addressStr}">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <button class="btn-map-badge ${outBadgeClass}" onclick="openMapModal('${emp.name}', '${outLabel}', '${addressStr}', '${pureMemo.replace(/\n/g, '\\n')}')">${outBadgeText}</button>
        </div>
      `;
    }

    const mapBoxHtml = `<div class="avatar-slot-group">${inSlotHtml}${middleSlots}${outSlotHtml}</div>`;

    return `
      <tr>
        <td class="emp-name-cell">
          ${statusDotClass ? `<span class="dot-status ${statusDotClass}"></span>` : '<span class="dot-status" style="background-color: #ccc;"></span>'}
          <a href="javascript:void(0)" class="emp-link" onclick="showEmployeeDetail('${emp.name}')">${emp.name}</a>
        </td>
        <td>${timeStr} ${memoHtml}</td>
        <td>${mapBoxHtml}</td>
      </tr>
    `;
  }).join('');
}

// --- 残業時間集計表 ---
let currentOvertimeDate = new Date();
let overtimeSortKey = 'overtimeHours';
let overtimeSortAsc = false;

// 【API連携】打刻データを取得し、出勤日数・実労働時間・残業時間を自動計算する関数
async function fetchOvertimeData(year, month, selectedDept) {
  // 1. 全従業員データを取得
  const empList = currentEmployeeList.length > 0 ? currentEmployeeList : await fetchEmployeesAPI('ALL', '');
  
  // 2. 指定された年月の打刻データを取得
  let attendancesData = [];
  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${year}&month=${month}`, { cache: 'no-store' });
    if (response.ok) attendancesData = await response.json();
  } catch (error) {
    console.error('残業集計用データ取得エラー:', error);
  }

  // 3. 部署(所属)で絞り込み
  let filteredEmps = empList;
  if (selectedDept !== 'ALL') {
    filteredEmps = empList.filter(emp => emp.office === selectedDept);
  }

  // 4. 従業員ごとに集計計算を実行
  return filteredEmps.map(emp => {
            const myAttendances = attendancesData.filter(a => a.employee_id === emp.id);
            
            let weekdayDays = 0, weekendDays = 0;
            let totalWorkMins = 0, totalOvertimeMins = 0; // 浮動小数点誤差を防ぐため「分」で集計

            myAttendances.forEach(att => {
              if (!att.clock_in || !att.clock_out) return;

              const isHoliday = (typeof holidaySettingsMap !== 'undefined' && holidaySettingsMap[att.work_date]);
              
              if (isHoliday) {
                weekendDays++;
              } else {
                weekdayDays++;
              }

              const [inH, inM] = att.clock_in.split(':').map(Number);
              const [outH, outM] = att.clock_out.split(':').map(Number);
              
              let inMinutes = inH * 60 + inM;
              if (inMinutes < 540) inMinutes = 540;

              let outMinutes = outH * 60 + outM;
              if (outMinutes < inMinutes && outH < 12) outMinutes += 24 * 60;
              
              let stayMinutes = outMinutes - inMinutes;
              if (stayMinutes < 0) stayMinutes = 0;

              let workMinutes = stayMinutes;
              if (stayMinutes > 360) {
                workMinutes = stayMinutes - 60;
                if (workMinutes < 360) workMinutes = 360;
              }

              totalWorkMins += workMinutes;

              if (isHoliday) {
                if (workMinutes <= 240) {
                  // 4時間までは残業0
                } else if (workMinutes < 480) {
                  totalOvertimeMins += (workMinutes - 240);
                } else if (workMinutes === 480) {
                  // 8時間は代休のため残業0
                } else {
                  totalOvertimeMins += (workMinutes - 480);
                }
              } else {
                if (workMinutes > 480) {
                  totalOvertimeMins += (workMinutes - 480);
                }
              }
            });

            return {
              id: emp.id,
              name: emp.name,
              dept: emp.office,
              weekdayDays,
              weekendDays,
              // 合計分数から6分単位で切り上げ(Math.ceil)、10で割って0.1単位の時間にする
              totalHours: Math.ceil(totalWorkMins / 6) / 10,
              overtimeHours: Math.ceil(totalOvertimeMins / 6) / 10
            };
          });
}

async function renderOvertimeTable() {
  const filterEl = document.getElementById('overtime-dept-filter');
  const selectedDept = filterEl ? filterEl.value : 'ALL';
  
  const year = currentOvertimeDate.getFullYear();
  const month = currentOvertimeDate.getMonth() + 1;
  document.getElementById('overtime-month-title').textContent = `${year}年 ${String(month).padStart(2, '0')}月度`;

  // 取得と計算の実行 (ローディング表示を追加)
  document.getElementById('overtime-tbody').innerHTML = '<tr><td colspan="5" style="text-align: center; color: #7f8c8d; padding: 20px;">データ集計中...</td></tr>';
  const displayData = await fetchOvertimeData(year, month, selectedDept);

  const sortedData = [...displayData].sort((a, b) => {
    let valA = a[overtimeSortKey];
    let valB = b[overtimeSortKey];
    if (typeof valA === 'string') {
      return overtimeSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      return overtimeSortAsc ? valA - valB : valB - valA;
    }
  });

  const sortKeys = ['name', 'weekdayDays', 'weekendDays', 'totalHours', 'overtimeHours'];
  sortKeys.forEach(k => {
    const el = document.getElementById(`sort-${k}`);
    if (el) {
      if (k === overtimeSortKey) {
        el.textContent = overtimeSortAsc ? ' ▲' : ' ▼';
        el.style.opacity = '1';
      } else {
        el.textContent = ' ↕';
        el.style.opacity = '0.35';
      }
    }
  });

  document.getElementById('overtime-tbody').innerHTML = sortedData.map(emp => `
    <tr>
      <td style="text-align:left; font-weight:bold; color:var(--toho-blue);">
        <a href="javascript:void(0)" onclick="showEmployeeDetail('${emp.name}')" style="color:inherit; text-decoration:none;">${emp.name}</a>
      </td>
      <td>${emp.weekdayDays}日</td>
      <td>${emp.weekendDays}日</td>
      <td>${emp.totalHours.toFixed(1)}時間</td>
      <td>${emp.overtimeHours.toFixed(1)}時間</td>
    </tr>
  `).join('');

  const count = sortedData.length;
  const sumWeekday = sortedData.reduce((sum, emp) => sum + emp.weekdayDays, 0);
  const sumWeekend = sortedData.reduce((sum, emp) => sum + emp.weekendDays, 0);
  const sumTotal = sortedData.reduce((sum, emp) => sum + emp.totalHours, 0);
  const sumOvertime = sortedData.reduce((sum, emp) => sum + emp.overtimeHours, 0);

  document.getElementById('overtime-tfoot').innerHTML = `
    <tr class="summary-row">
      <td style="text-align:left;">合計 (${count}名)</td>
      <td>${sumWeekday}日</td>
      <td>${sumWeekend}日</td>
      <td>${sumTotal.toFixed(1)}時間</td>
      <td>${sumOvertime.toFixed(1)}時間</td>
    </tr>
    <tr class="summary-row">
      <td style="text-align:left;">全体平均 (1人あたり)</td>
      <td>${(sumWeekday / count).toFixed(1)}日</td>
      <td>${(sumWeekend / count).toFixed(1)}日</td>
      <td>${(sumTotal / count).toFixed(1)}時間</td>
      <td>${(sumOvertime / count).toFixed(1)}時間</td>
    </tr>
  `;
}

function sortOvertime(key) {
  if (overtimeSortKey === key) {
    overtimeSortAsc = !overtimeSortAsc;
  } else {
    overtimeSortKey = key;
    overtimeSortAsc = true;
  }
  renderOvertimeTable();
}

function changeOvertimeMonth(offset) {
  if (offset === 0) {
    const now = new Date();
    currentOvertimeDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    currentOvertimeDate.setMonth(currentOvertimeDate.getMonth() + offset);
  }
  renderOvertimeTable();
}

// --- 従業員一覧 ---

// 【DBモック】本来はバックエンドのデータベースに保存されているデータ
const employeesDB = [
  { id: 2, name: '阿久津 幸一', kana: 'アクツ コウイチ', role: 'システム管理者', roleClass: 'badge-admin', status: '利用停止', empType: '管理職', office: 'NEXT (事業所管理者)', joinDate: '-' },
  { id: 69, name: '安藤 健太郎', kana: 'アンドウ ケンタロウ', role: '正社員', roleClass: 'badge-regular', status: '利用中', empType: '正社員', office: 'NEXT (従業員)', joinDate: '2024年08月01日' },
  { id: 81, name: '五十嵐 由樹', kana: 'イガラシ ユキ', role: '正社員', roleClass: 'badge-regular', status: '利用中', empType: '正社員', office: 'NEXT (従業員)', joinDate: '2025年02月03日' },
  { id: 101, name: '加藤 健人', kana: 'カトウ ケント', role: '正社員', roleClass: 'badge-regular', status: '利用中', empType: '正社員', office: 'NEXT (従業員)', joinDate: '2026年04月01日' },
  { id: 102, name: '佐藤 花子', kana: 'サトウ ハナコ', role: '正社員', roleClass: 'badge-regular', status: '利用中', empType: 'パート', office: 'NEXT (従業員)', joinDate: '2026年05月01日' }
];

let currentInitialFilter = 'ALL';
let currentNameFilter = ''; // 追加：名前検索用の変数

// 1. UIのタブ切り替え・検索と再描画トリガー
function filterInitial(initial) {
  currentInitialFilter = initial;
  const tabs = document.querySelectorAll('.initial-tabs .tab-btn');
  tabs.forEach(tab => {
    if (tab.textContent === initial) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  renderEmployees();
}

function filterByName(nameStr) {
  currentNameFilter = nameStr.trim();
  renderEmployees();
}

// 2. 【API通信実装】Node.jsのバックエンドから本物の従業員データを取得する関数
async function fetchEmployeesAPI(initialFilter, nameFilter) {
  let result = [];
  try {
    // ① 先ほど立ち上げたローカルサーバー(ポート3000)からデータを取得！
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees');
    const dbData = await response.json();

    // ② RDSの生データを、画面表示用の形式に変換（マッピング）
    if (!Array.isArray(dbData)) {
      console.error('APIレスポンスが配列ではありません:', dbData);
      return [];
    }
    result = dbData.map(emp => ({
      id: emp.id,
      name: emp.name,
      kana: emp.kana,
      gender: emp.gender || '未選択',
      email: emp.email || '',
      show_attendance: emp.show_attendance,
      retireDate: emp.retire_date ? new Date(emp.retire_date).toLocaleDateString('ja-JP') : '-',
      role: emp.role || '一般',
      roleClass: emp.role === 'システム管理者' ? 'badge-admin' : 'badge-regular',
      status: emp.status || '利用中',
      empType: '正社員', // ※ひとまず固定
      office: emp.department || 'NEXT',
      joinDate: emp.join_date ? new Date(emp.join_date).toLocaleDateString('ja-JP') : '-'
    }));
  } catch (error) {
    console.error('API取得エラー:', error);
    return [];
  }

  // ③ イニシャルによる絞り込み（ひらがな・カタカナ両対応）
  if (initialFilter !== 'ALL') {
    const initialMap = {
      'ア': /^[ア-オあ-お]/, 'カ': /^[カ-ゴか-ご]/, 'サ': /^[サ-ゾさ-ぞ]/,
      'タ': /^[タ-ドた-ど]/, 'ナ': /^[ナ-ノな-の]/, 'ハ': /^[ハ-ポは-ぽ]/,
      'マ': /^[マ-モま-も]/, 'ヤ': /^[ヤ-ヨや-よ]/, 'ラ': /^[ラ-ロら-ろ]/,
      'ワ': /^[ワ-ンわ-ん]/, 'A-Z': /^[A-Za-z]/
    };
    const regex = initialMap[initialFilter];
    if (regex) {
      result = result.filter(emp => emp.kana && regex.test(emp.kana.trim()));
    } else {
      result = [];
    }
  }

  // ④ 名前（漢字・フリガナ）による部分一致絞り込み
  if (nameFilter) {
    const normalizedFilter = nameFilter
      .replace(/[\s ]/g, '')
      .replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));

    result = result.filter(emp => {
      const normalizedName = emp.name.replace(/[\s ]/g, '');
      const normalizedKana = emp.kana.replace(/[\s ]/g, '');
      return normalizedName.includes(normalizedFilter) || normalizedKana.includes(normalizedFilter);
    });
  }

  return result;
}

let currentEmployeeList = []; // 取得したデータを一時保存する変数

// 3. 画面描画処理（データの取得完了を待ってからレンダリング）
async function renderEmployees() {
  const container = document.getElementById('emp-list-container');
  
  // データ取得中のローディング表示
  container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-sub);">読み込み中...</div>';

  // APIから非同期でデータを取得 (検索パラメータを2つ渡す)
  const data = await fetchEmployeesAPI(currentInitialFilter, currentNameFilter);
  currentEmployeeList = data; // データを変数に保存

  // 取得結果が0件の場合のハンドリング
  if (data.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-sub);">該当する従業員が見つかりません。</div>';
    return;
  }

  // 取得したデータをもとにHTMLを構築
  container.innerHTML = data.map(emp => {
    const statusClass = emp.status === '利用停止' ? '' : 'hidden';
    const toggleAction = emp.status === '利用停止' ? '再開' : '停止';
    return `
      <div class="emp-card-item" id="emp-card-${emp.id}">
        <div class="emp-avatar">👤</div>
        <div class="emp-info-main">
          <div class="emp-name-row">
            <a href="javascript:void(0)" class="emp-name" onclick="showEmployeeDetail(${emp.id})">${emp.name}</a>
            <span class="badge-tag ${emp.roleClass}">${emp.role}</span>
            <span class="badge-tag badge-disabled ${statusClass}" id="emp-status-${emp.id}">利用停止</span>
          </div>
          <div class="emp-meta-row">
            <span>従業員区分: ${emp.empType}</span>
            ${emp.joinDate !== '-' ? `<span>入社日: ${emp.joinDate}</span>` : ''}
            <span>事業所: ${emp.office}</span>
            <span>従業員ID: ${emp.id}</span>
          </div>
        </div>
        <div class="emp-action-menu">
          <button class="btn-more" onclick="toggleEmpMenu(this)">•••</button>
          <div class="emp-popover-menu hidden">
            <div onclick="handleEmpAction('copy', ${emp.id}, '${emp.name}')">コピーして新しい従業員を作成</div>
            <div onclick="handleEmpAction('toggle', ${emp.id}, '${emp.name}', '${toggleAction}')">利用${toggleAction}</div>
            <div class="text-danger" onclick="handleEmpAction('delete', ${emp.id}, '${emp.name}')">削除</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 6. 初期化
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // 実績登録・編集モーダルの「分」選択肢を1分単位(00〜59)で生成
  const minuteSelectIds = ['create-start-m', 'create-end-m', 'edit-start-m', 'edit-end-m'];
  let minutesHtml = '';
  for (let m = 0; m < 60; m++) {
    const minStr = String(m).padStart(2, '0');
    minutesHtml += `<option value="${minStr}">${minStr}</option>`;
  }
  minuteSelectIds.forEach(id => {
    const selectEl = document.getElementById(id);
    if (selectEl) selectEl.innerHTML = minutesHtml;
  });

  renderDashboard();
  // 1. 先に従業員一覧（最新データ）を取得して保存
  await renderEmployees();
  // 2. その後にマトリクス表を描画
  renderMatrixTable();
  renderDailyTable();
  renderOvertimeTable();
  
  // ▼追加：初期アクセス時にURLから画面を判断してルーティング
  if (!location.hash) {
    location.hash = '#/dashboard';
  } else {
    handleRouting();
  }
});
// ==========================================
// 7. スマレジ風 対象月変更専用モーダル機能
// ==========================================
let currentPickerTarget = ''; 
let pickerSelectedYear = 2026;

function openMonthPicker(e, target) {
  if (e && e.stopPropagation) {
    e.stopPropagation();
  }
  
  // 引数が1つだけ渡された場合のフォールバック処理
  if (typeof e === 'string' && !target) {
    target = e;
    e = window.event;
  }

  currentPickerTarget = target;
  
  let targetDate = currentMatrixDate;
  if (target === 'overtime') targetDate = currentOvertimeDate;
  if (target === 'daily') targetDate = currentDailyDate;
  if (target === 'dashboard') targetDate = (typeof currentDashboardDate !== 'undefined') ? currentDashboardDate : new Date();
  if (target === 'holiday') targetDate = currentHolidayDate;
  pickerSelectedYear = targetDate.getFullYear();

  // 年セレクトボックスの生成
  const yearSelect = document.getElementById('smaregi-picker-year');
  let yearHtml = '';
  for (let y = pickerSelectedYear - 5; y <= pickerSelectedYear + 5; y++) {
    yearHtml += `<option value="${y}" ${y === pickerSelectedYear ? 'selected' : ''}>${y}</option>`;
  }
  yearSelect.innerHTML = yearHtml;

  renderMonthButtons();

  // クリックされた📅ボタンの直下にポップオーバーを配置
  const picker = document.getElementById('modal-month-picker');
  const targetEl = (e && e.currentTarget) ? e.currentTarget : (e && e.target ? e.target : null);

  if (targetEl && targetEl.getBoundingClientRect) {
    const btnRect = targetEl.getBoundingClientRect();
    picker.style.top = `${btnRect.bottom + window.scrollY + 8}px`;
    picker.style.left = `${btnRect.left + window.scrollX - 100}px`;
  }
  
  picker.classList.remove('hidden');
}

function closeMonthPicker() {
  document.getElementById('modal-month-picker').classList.add('hidden');
}

function changePickerYear(offset) {
  const select = document.getElementById('smaregi-picker-year');
  let newYear = parseInt(select.value) + offset;
  select.value = newYear;
  renderMonthButtons();
}

function renderMonthButtons() {
  const year = parseInt(document.getElementById('smaregi-picker-year').value);
  const grid = document.getElementById('smaregi-month-grid');
  
  let activeMonth = -1;
  let targetDate = (currentPickerTarget === 'matrix') ? currentMatrixDate : currentOvertimeDate;
  if (targetDate.getFullYear() === year) {
    activeMonth = targetDate.getMonth() + 1;
  }

  let html = '';
  for (let m = 1; m <= 12; m++) {
    const activeClass = (m === activeMonth) ? 'active' : '';
    html += `<button class="smaregi-month-btn ${activeClass}" onclick="selectSmaregiMonth(${year}, ${m})">${m}月</button>`;
  }
  grid.innerHTML = html;
}

function selectSmaregiMonth(year, month) {
  const newDate = new Date(year, month - 1, 1);
  
  if (currentPickerTarget === 'matrix') {
    currentMatrixDate = newDate;
    renderMatrixTable();
  } else if (currentPickerTarget === 'overtime') {
    currentOvertimeDate = newDate;
    renderOvertimeTable();
  } else if (currentPickerTarget === 'daily') {
    currentDailyDate = newDate;
    renderDailyTable();
  } else if (currentPickerTarget === 'dashboard') {
    currentDashboardDate = newDate;
    renderDashboard();
  } else if (currentPickerTarget === 'holiday') {
    currentHolidayDate = newDate;
    renderHolidayCalendar();
  }
  
  closeMonthPicker();
}

// ==========================================
// パスワード設定メール送信機能 (バックエンド連携モック)
// ==========================================
function sendPwSetupEmail(emailAddress) {
  if (!emailAddress || emailAddress === '-' || emailAddress.trim() === '') {
    showToast('メールアドレスが登録されていません。');
    return;
  }
  
  // バックエンドAPIへの送信リクエストを想定
  console.log(`[API MOCK] POST /api/auth/send-setup-email`, { email: emailAddress });
  
  // UI上で送信されたメール内容を確認できるプレビューモーダルを表示
  document.getElementById('email-preview-to').textContent = emailAddress;
  document.getElementById('modal-email-preview').classList.remove('hidden');
}

function closeEmailPreview() {
  document.getElementById('modal-email-preview').classList.add('hidden');
}

function openPasswordSetup() {
  // デモ用：メール内のURLをクリックした想定で設定画面へ遷移
  closeEmailPreview();
  document.getElementById('app-view').classList.add('hidden');
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('password-setup-view').classList.remove('hidden');
}

// パスワード設定完了処理
document.getElementById('password-setup-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const pw1 = document.getElementById('setup-pw1').value;
  const pw2 = document.getElementById('setup-pw2').value;
  
  if (pw1 !== pw2) {
    showModal('エラー', 'パスワードが一致しません。');
    return;
  }
  
  const btn = this.querySelector('.btn-login');
  btn.textContent = '設定中...';
  btn.disabled = true;

  // パスワード更新APIへの送信を想定
  console.log('[API MOCK] POST /api/auth/setup-password', { password: pw1 });
  await new Promise(resolve => setTimeout(resolve, 800));

  // 完了画面へ遷移
  document.getElementById('password-setup-view').classList.add('hidden');
  document.getElementById('password-complete-view').classList.remove('hidden');
  this.reset();
  
  btn.textContent = '設定する';
  btn.disabled = false;
});

// 完了画面からブラウザタブを閉じる処理
function closeBrowserWindow() {
  window.close();
  
  // ブラウザのセキュリティ仕様により自動で閉じられなかった場合の案内
  const msgEl = document.getElementById('complete-msg');
  if (msgEl) {
    msgEl.innerHTML = 'パスワードの設定が完了しました。<br><span style="color: #e74c3c; font-weight: bold;">※お使いの環境により自動で画面が閉じられない場合があります。その場合は手動でブラウザのタブを閉じてください。</span>';
  }
}
// ==========================================
// 休日設定機能
// ==========================================
let currentHolidayDate = new Date();
// クライアント側で設定状態を保持 (API実装前のため localStorage に保存)
let holidaySettingsMap = JSON.parse(localStorage.getItem('holidaySettingsMap')) || {};

function changeHolidayMonth(offset) {
  if (offset === 0) {
    currentHolidayDate = new Date();
  } else {
    currentHolidayDate.setMonth(currentHolidayDate.getMonth() + offset);
  }
  renderHolidayCalendar();
}

function renderHolidayCalendar() {
  const year = currentHolidayDate.getFullYear();
  const month = currentHolidayDate.getMonth() + 1;
  document.getElementById('holiday-month-title').textContent = `${year}年 ${String(month).padStart(2, '0')}月度`;

  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();

  let html = '<tr>';
  let dayCount = 0;

  // 空白セル
  for (let i = 0; i < firstDay; i++) {
    html += '<td style="background-color: #fafbfc;"></td>';
    dayCount++;
  }

  // 日付セル
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isHoliday = holidaySettingsMap[dateStr] ? 'is-holiday' : '';
    
    html += `
      <td class="holiday-cell ${isHoliday}" onclick="toggleHoliday('${dateStr}', this)">
        <span class="holiday-date-num">${d}</span>
        <span class="holiday-label">休日</span>
      </td>
    `;
    
    dayCount++;
    if (dayCount % 7 === 0 && d !== lastDate) {
      html += '</tr><tr>';
    }
  }
  
  // 末尾の空白セル
  while (dayCount % 7 !== 0) {
    html += '<td style="background-color: #fafbfc;"></td>';
    dayCount++;
  }
  html += '</tr>';

  document.getElementById('holiday-tbody').innerHTML = html;
}

function toggleHoliday(dateStr, cellElement) {
  const isCurrentlyHoliday = holidaySettingsMap[dateStr] || false;
  holidaySettingsMap[dateStr] = !isCurrentlyHoliday;
  
  if (holidaySettingsMap[dateStr]) {
    cellElement.classList.add('is-holiday');
  } else {
    cellElement.classList.remove('is-holiday');
  }
  
  // クリックした瞬間に即座に自動保存する
  localStorage.setItem('holidaySettingsMap', JSON.stringify(holidaySettingsMap));
}

// ※ saveHolidaySettings() 関数は不要になったため削除