// 各種サブミット処理 (API連携想定: async/await)
async function submitRecordCreate() {
  const date = document.getElementById('create-date').value;
  console.log(`[API MOCK] POST /api/attendance`, { empName: currentEmpName, date: date, action: 'create' });
  // await fetch('/api/attendance', { method: 'POST', ... });
  
  closeRecordModal('modal-record-create');
  showToast('実績を新規作成しました');
}

async function submitRecordEdit() {
  const date = document.getElementById('edit-date').value;
  console.log(`[API MOCK] PUT /api/attendance/${currentEmpName}/${date}`);
  // await fetch(`/api/attendance/${currentEmpName}/${date}`, { method: 'PUT', ... });
  
  closeRecordModal('modal-record-edit');
  showToast('実績を更新しました（赤文字で表示されます）');
}

async function submitRecordDelete() {
  const date = document.getElementById('edit-date').value;
  console.log(`[API MOCK] DELETE /api/attendance/${currentEmpName}/${date}`);
  // await fetch(`/api/attendance/${currentEmpName}/${date}`, { method: 'DELETE' });
  
  closeRecordModal('modal-record-edit');
  showToast('実績を削除しました');
}

async function submitRecordMemo() {
  const date = document.getElementById('memo-date').textContent;
  console.log(`[API MOCK] POST /api/attendance/${currentEmpName}/${date}/memo`);
  // await fetch(`/api/attendance/${currentEmpName}/${date}/memo`, { method: 'POST', ... });
  
  closeRecordModal('modal-employee-memo');
  showToast('従業員メモを保存しました');
}

// 2. ログアウト処理
function logout() {
  document.getElementById('app-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
}

// 3. サイドバーの折りたたみ切替 (スマレジ風)
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const icon = document.getElementById('collapse-icon');
  const text = document.getElementById('collapse-text');
  
  sidebar.classList.toggle('collapsed');
  
  if (sidebar.classList.contains('collapsed')) {
    icon.textContent = '→';
    text.textContent = '';
  } else {
    icon.textContent = '←';
    text.textContent = '閉じる';
  }
}

// 4. 勤怠管理アコーディオン切替
function toggleAttendanceMenu() {
  const sidebar = document.getElementById('sidebar');
  
  // 折りたたみ中にクリックされたら自動で展開する
  if (sidebar.classList.contains('collapsed')) {
    toggleSidebar();
  }

  const submenu = document.getElementById('attendance-sub');
  const arrow = document.getElementById('attendance-arrow');

  submenu.classList.toggle('open');
  arrow.classList.toggle('open');
}

// 5. 画面切り替え (SPA)
function switchPage(pageId, element) {
  const sidebar = document.getElementById('sidebar');

  // 同じメニュー（アクティブな状態）をクリックした場合は、開閉を切り替える
  if (element && element.classList.contains('active')) {
    toggleSidebar();
    return;
  }

  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById('page-' + pageId).classList.remove('hidden');

  const titles = {
    'dashboard': 'ダッシュボード',
    'monthly': '月表示 (マトリクス表)',
    'daily': '日表示',
    'employees': '従業員一覧',
    'settings': 'システム設定'
  };
  document.getElementById('page-title').textContent = titles[pageId] || '勤怠管理';

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  if (element) element.classList.add('active');

  // 別のメニューを選んで切り替わった場合は、サイドバーを展開して広く表示する
  if (sidebar.classList.contains('collapsed')) {
    toggleSidebar();
  }
}

// 6. モーダル制御
function showModal(title, msg) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-msg').textContent = msg;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

// 従業員一覧「...」ポップオーバーメニュー制御
function toggleEmpMenu(buttonEl) {
  const popover = buttonEl.nextElementSibling;
  
  // 他の開いているポップオーバーを一旦閉じる
  document.querySelectorAll('.emp-popover-menu').forEach(menu => {
    if (menu !== popover) menu.classList.add('hidden');
  });

  popover.classList.toggle('hidden');
}

// 外部クリック時に操作メニューを自動で閉じる
document.addEventListener('click', function(e) {
  if (!e.target.closest('.emp-action-menu')) {
    document.querySelectorAll('.emp-popover-menu').forEach(menu => menu.classList.add('hidden'));
  }
});
// ==========================================
// セルクリック時のポップアップ＆モーダル制御（仕様書要件）
// ==========================================
let currentEmpName = '';
let currentDate = '';

function openCellMenu(event, empName, dateStr) {
  event.stopPropagation();
  currentEmpName = empName;
  currentDate = `2026/09/${dateStr.split('/')[1].padStart(2, '0')}`; // YYYY/MM/DD形式へ変換
  
  const menu = document.getElementById('cell-action-menu');
  document.getElementById('cell-menu-title').textContent = `${empName} - ${dateStr}`;
  
  menu.style.left = `${event.pageX}px`;
  menu.style.top = `${event.pageY}px`;
  menu.classList.remove('hidden');
}

// メニューからアクションを選択した際の振り分け
function handleCellAction(actionType) {
  document.getElementById('cell-action-menu').classList.add('hidden');
  
  if (actionType === '新規作成') {
    document.getElementById('create-emp-name').textContent = currentEmpName;
    document.getElementById('create-date').value = currentDate;
    document.getElementById('modal-record-create').classList.remove('hidden');
  } 
  else if (actionType === '編集') {
    document.getElementById('edit-emp-name').textContent = currentEmpName;
    document.getElementById('edit-date').value = currentDate;
    document.getElementById('modal-record-edit').classList.remove('hidden');
  } 
  else if (actionType === '従業員メモ') {
    document.getElementById('memo-emp-name').textContent = currentEmpName;
    document.getElementById('memo-date').textContent = currentDate;
    document.getElementById('modal-employee-memo').classList.remove('hidden');
  } 
  else if (actionType === '詳細へ') {
    document.getElementById('timeline-title').textContent = `${currentDate} 詳細タイムライン`;
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.classList.add('hidden'));
    document.getElementById('page-timeline-detail').classList.remove('hidden');
  }
}

// 共通モーダル閉じる処理
function closeRecordModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// アコーディオンメール表示切替
function toggleMailAccordion() {
  const body = document.getElementById('mail-content');
  const arrow = document.getElementById('mail-arrow');
  body.classList.toggle('hidden');
  arrow.textContent = body.classList.contains('hidden') ? '▼' : '▲';
}

// 各種サブミットダミー処理
function submitRecordCreate() { closeRecordModal('modal-record-create'); showToast('実績を新規作成しました'); }
function submitRecordEdit() { closeRecordModal('modal-record-edit'); showToast('実績を更新しました（赤文字で表示されます）'); }
function submitRecordDelete() { closeRecordModal('modal-record-edit'); showToast('実績を削除しました'); }
function submitRecordMemo() { closeRecordModal('modal-employee-memo'); showToast('従業員メモを保存しました'); }

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

// 画面外クリック時にセルメニューを閉じる
document.addEventListener('click', function(e) {
  const cellMenu = document.getElementById('cell-action-menu');
  if (cellMenu && !e.target.closest('#cell-action-menu')) {
    cellMenu.classList.add('hidden');
  }
});
// 日表示：位置情報（地図）モーダル制御 (仕様書要件)
function openMapModal(empName, timeStr, addressStr) {
  document.getElementById('map-modal-title').textContent = `${empName} の打刻位置`;
  document.getElementById('map-modal-subtitle').textContent = `打刻時刻: ${timeStr}`;
  document.getElementById('map-modal-address').textContent = `📍 取得住所: ${addressStr}`;
  document.getElementById('map-modal').classList.remove('hidden');
}

function closeMapModal() {
  document.getElementById('map-modal').classList.add('hidden');
}
// 従業員詳細画面への遷移処理
function showEmployeeDetail(empName) {
  // 名前を詳細画面のタイトルに反映
  document.getElementById('detail-emp-name').textContent = empName;
  document.getElementById('val-name').textContent = empName;
  
  // 画面を詳細ページへ切り替え
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById('page-employee-detail').classList.remove('hidden');

  // ヘッダータイトル更新
  document.getElementById('page-title').textContent = '従業員管理';
}
// ==========================================
// 従業員編集画面 制御 & トースト通知
// ==========================================
function openEditEmployee() {
  const currentName = document.getElementById('detail-emp-name').textContent;
  document.getElementById('edit-emp-name').textContent = currentName;
  document.getElementById('edit-name').value = currentName;
  
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById('page-employee-edit').classList.remove('hidden');
}

function closeEditEmployee() {
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById('page-employee-detail').classList.remove('hidden');
}

async function saveEmployeeEdit(event) {
  event.preventDefault();
  const btn = event.target.querySelector('.btn-save');
  btn.textContent = '保存中...';
  btn.disabled = true;

  // FormDataを用いたAPI送信ペイロードの生成想定
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());
  console.log(`[API MOCK] PUT /api/employees/${currentEmpTargetId || 'current'}`, payload);
  
  // 実際の通信想定: await fetch(`/api/employees/...`, { method: 'PUT', body: JSON.stringify(payload) });
  await new Promise(resolve => setTimeout(resolve, 500));

  const newName = document.getElementById('edit-name').value;
  document.getElementById('detail-emp-name').textContent = newName;
  document.getElementById('val-name').textContent = newName;
  
  showToast('従業員情報を保存しました。');
  closeEditEmployee();

  btn.textContent = '設定を保存';
  btn.disabled = false;
}

// ==========================================
// 新規従業員作成画面 制御
// ==========================================
function openCreateEmployee() {
  document.getElementById('employee-create-form').reset();
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById('page-employee-create').classList.remove('hidden');
}

function closeCreateEmployee() {
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById('page-employees').classList.remove('hidden');
}

async function saveNewEmployee(event) {
  event.preventDefault();
  const btn = event.target.querySelector('.btn-save');
  btn.textContent = '保存中...';
  btn.disabled = true;

  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());
  console.log(`[API MOCK] POST /api/employees`, payload);

  // 実際の通信想定: await fetch(`/api/employees`, { method: 'POST', body: JSON.stringify(payload) });
  await new Promise(resolve => setTimeout(resolve, 500));

  showToast('新しい従業員を作成しました。');
  closeCreateEmployee();

  btn.textContent = '設定を保存';
  btn.disabled = false;
}
// ==========================================
// 月表示（マトリクス表）のカレンダー動的生成
// ==========================================
let currentMatrixDate = new Date(2026, 8, 1); // 初期表示: 2026年9月

// これまでのダミーデータをJS配列として保持
const matrixData = [
  {
    name: '安藤 健太郎', sum: '55.85<br><small>(8日)</small>',
    data: {
      '2026-09-03': '08:33<br>18:28', '2026-09-04': '08:38<br>18:16', '2026-09-05': '08:40<br>18:14', '2026-09-06': '08:45<br>18:35', '2026-09-07': '08:32<br>18:16', '2026-09-08': '<div class="time-edited">18:28<br>21:43</div><span class="memo-icon" data-tooltip="[NEXTメモ]\n残業申請承認済み">💬</span>', '2026-09-10': '08:32<br>18:34', '2026-09-11': '08:29<br>-', '2026-09-19': '<span class="memo-icon" data-tooltip="[NEXTメモ]\n休日出勤">💬</span>'
    }
  },
  {
    name: '五十嵐 由樹', sum: '58.78<br><small>(8日)</small>',
    data: {
      '2026-09-02': '16:41<br>18:28<span class="memo-icon" data-tooltip="[NEXTメモ]\n直帰打刻">💬</span>', '2026-09-03': '08:54<br>18:20', '2026-09-04': '08:59<br>19:11', '2026-09-05': '08:56<br>18:56', '2026-09-06': '08:56<br>19:41', '2026-09-07': '08:48<br>20:23', '2026-09-10': '08:57<br>19:00', '2026-09-11': '08:52<br>20:06'
    }
  },
  {
    name: '池上 裕士', sum: '65.87<br><small>(9日)</small>',
    data: {
      '2026-09-01': '08:48<br>18:03', '2026-09-02': '08:49<br>18:01<span class="memo-icon" data-tooltip="[NEXTメモ]\n直行">💬</span>', '2026-09-03': '08:52<br>18:06', '2026-09-04': '08:40<br>18:01', '2026-09-06': '08:36<br>18:01<span class="memo-icon" data-tooltip="[NEXTメモ]\n休日出勤">💬</span>', '2026-09-07': '08:59<br>18:06', '2026-09-08': '08:52<br>18:12<span class="memo-icon" data-tooltip="[NEXTメモ]\n管理者修正">💬</span>', '2026-09-10': '09:00<br>18:01', '2026-09-11': '08:27<br>18:01', '2026-09-20': '<span class="memo-icon" data-tooltip="[NEXTメモ]\n休日出勤">💬</span>'
    }
  },
  {
    name: '石井 秀龍', sum: '60.60<br><small>(9日)</small>',
    data: {
      '2026-09-02': '12:59<br>19:16<span class="memo-icon" data-tooltip="[NEXTメモ]\n午後出勤">💬</span>', '2026-09-03': '08:37<br>19:01', '2026-09-04': '08:44<br>18:02', '2026-09-05': '08:44<br>18:06', '2026-09-06': '14:00<br>18:00', '2026-09-07': '08:43<br>18:36', '2026-09-08': '08:52<br>18:12<span class="memo-icon" data-tooltip="[NEXTメモ]\n打ち合わせ打刻">💬</span>', '2026-09-10': '08:53<br>18:02', '2026-09-11': '08:59<br>18:02'
    }
  }
];

function renderMatrixTable() {
  const year = currentMatrixDate.getFullYear();
  const month = currentMatrixDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  // タイトル更新
  document.getElementById('matrix-month-title').textContent = `${year}年 ${String(month).padStart(2, '0')}月度`;

  const daysStr = ['日', '月', '火', '水', '木', '金', '土'];

  // thead生成 (その月の日数に応じて列を自動生成)
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

  // tbody生成
  let tbodyHtml = '';
  matrixData.forEach(emp => {
    tbodyHtml += `<tr><td class="col-emp-name">${emp.name}</td>`;
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month - 1, i);
      const dayOfWeek = d.getDay();
      let tdClass = 'cell-click';
      if (dayOfWeek === 0) tdClass += ' sun-bg';
      if (dayOfWeek === 6) tdClass += ' sat-bg';

      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const cellData = emp.data[dateKey] || '';
      
      tbodyHtml += `<td class="${tdClass}" onclick="openCellMenu(event, '${emp.name}', '${month}/${i}')">${cellData}</td>`;
    }
    // 月が9月以外の場合は、合計値を一旦ダミー（-）にする
    const sumVal = (year === 2026 && month === 9) ? emp.sum : '-';
    tbodyHtml += `<td class="col-sum">${sumVal}</td></tr>`;
  });
  
  document.getElementById('matrix-tbody').innerHTML = tbodyHtml;
}

// 月の切り替え関数
function changeMatrixMonth(offset) {
  if (offset === 0) {
    const now = new Date(); // 現在日時に戻る
    currentMatrixDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    currentMatrixDate.setMonth(currentMatrixDate.getMonth() + offset);
  }
  renderMatrixTable();
}

// 初期ロード時に描画を実行
document.addEventListener('DOMContentLoaded', () => {
  renderMatrixTable();
});
// ==========================================
// 従業員一覧 操作系機能 (API連携想定)
// ==========================================
let currentEmpAction = null;
let currentEmpTargetId = null;
let currentEmpTargetName = '';

function handleEmpAction(action, empId, empName, toggleType = '') {
  // ポップオーバーを閉じる
  document.querySelectorAll('.emp-popover-menu').forEach(menu => menu.classList.add('hidden'));

  // コピー作成: バックエンドから設定値を取得し、新規作成画面へ遷移・反映する想定
  if (action === 'copy') {
    console.log(`[API MOCK] GET /api/employees/${empId} (既存設定の取得)`);
    openCreateEmployee();
    
    // UIモック: 名前欄にコピー元をセット
    setTimeout(() => {
      const inputs = document.querySelectorAll('#employee-create-form .form-input');
      if (inputs.length > 0) inputs[0].value = `${empName} (コピー)`;
    }, 100);
    return;
  }

  // ステータス変更・削除: 専用モーダルの表示設定 (仕様書要件)
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
    msgEl.style.color = '#e74c3c'; // 赤色テキスト指定
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

// モーダルで「はい / 削除」を押した際の実行処理
async function executeEmpAction() {
  if (currentEmpAction === 'toggle') {
    // API送信想定: const response = await fetch(`/api/employees/${currentEmpTargetId}/status`, { method: 'PATCH' });
    console.log(`[API MOCK] PATCH /api/employees/${currentEmpTargetId}/status`);
    showToast(`従業員『${currentEmpTargetName}』のステータスを更新しました。`);
    
    // フロントエンドUIへの即時反映 (モック)
    const statusBadge = document.getElementById(`emp-status-${currentEmpTargetId}`);
    if (statusBadge) statusBadge.classList.toggle('hidden');
    
  } else if (currentEmpAction === 'delete') {
    // API送信想定: const response = await fetch(`/api/employees/${currentEmpTargetId}`, { method: 'DELETE' });
    console.log(`[API MOCK] DELETE /api/employees/${currentEmpTargetId}`);
    showToast(`従業員『${currentEmpTargetName}』を削除しました。`);
    
    // フロントエンドUIへの即時反映 (DOMからカードを削除)
    const cardEl = document.getElementById(`emp-card-${currentEmpTargetId}`);
    if (cardEl) cardEl.remove();
  }

  closeEmpActionModal();
}