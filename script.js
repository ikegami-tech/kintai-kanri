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

  btn.textContent = 'ログイン';
  btn.disabled = false;
});

function logout() {
  document.getElementById('app-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
}

// ==========================================
// 2. UI制御 (サイドバー・SPA画面切り替え)
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

function switchPage(pageId, element) {
  const sidebar = document.getElementById('sidebar');
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
    'overtime': '残業時間集計',
    'employees': '従業員一覧'
  };
  document.getElementById('page-title').textContent = titles[pageId] || '勤怠管理';

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  if (element) element.classList.add('active');

  if (sidebar.classList.contains('collapsed')) {
    toggleSidebar();
  }
}

// --- Web打刻アプリ画面を開く処理 ---
function openWebTimeclock() {
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById('page-web-timeclock').classList.remove('hidden');
  document.getElementById('page-title').textContent = 'Web打刻アプリ';
  
  // サイドバーが開いていれば閉じる（アプリ画面を広く見せるため）
  const sidebar = document.getElementById('sidebar');
  if (!sidebar.classList.contains('collapsed')) {
    toggleSidebar();
  }
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

function openMapModal(empName, actionStr, addressStr, emailContent = '') {
  document.getElementById('map-modal-title').textContent = actionStr || '出勤';
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

function openCellMenu(event, empName, dateStr) {
  event.stopPropagation();
  currentEmpName = empName;
  currentDate = `2026/09/${dateStr.split('/')[1].padStart(2, '0')}`;
  
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
    document.getElementById('modal-record-create').classList.remove('hidden');
  } else if (actionType === '編集') {
    document.getElementById('edit-emp-name').textContent = currentEmpName;
    document.getElementById('edit-date').value = currentDate;
    document.getElementById('modal-record-edit').classList.remove('hidden');
  } else if (actionType === '従業員メモ') {
    document.getElementById('memo-emp-name').textContent = currentEmpName;
    document.getElementById('memo-date').textContent = currentDate;
    document.getElementById('modal-employee-memo').classList.remove('hidden');
  } else if (actionType === '詳細へ') {
    document.getElementById('timeline-title').textContent = `${currentDate} 詳細タイムライン`;
    renderTimeline(currentDate);
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.classList.add('hidden'));
    document.getElementById('page-timeline-detail').classList.remove('hidden');
  }
}

function closeRecordModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

async function submitRecordCreate() {
  const date = document.getElementById('create-date').value;
  console.log(`[API MOCK] POST /api/attendance`, { empName: currentEmpName, date: date, action: 'create' });
  closeRecordModal('modal-record-create');
  showToast('実績を新規作成しました');
}

async function submitRecordEdit() {
  const date = document.getElementById('edit-date').value;
  console.log(`[API MOCK] PUT /api/attendance/${currentEmpName}/${date}`);
  closeRecordModal('modal-record-edit');
  showToast('実績を更新しました（赤文字で表示されます）');
}

async function submitRecordDelete() {
  const date = document.getElementById('edit-date').value;
  console.log(`[API MOCK] DELETE /api/attendance/${currentEmpName}/${date}`);
  closeRecordModal('modal-record-edit');
  showToast('実績を削除しました');
}

async function submitRecordMemo() {
  const date = document.getElementById('memo-date').textContent;
  console.log(`[API MOCK] POST /api/attendance/${currentEmpName}/${date}/memo`);
  closeRecordModal('modal-employee-memo');
  showToast('従業員メモを保存しました');
}

// 従業員操作関連
let currentEmpAction = null;
let currentEmpTargetId = null;
let currentEmpTargetName = '';

function handleEmpAction(action, empId, empName, toggleType = '') {
  document.querySelectorAll('.emp-popover-menu').forEach(menu => menu.classList.add('hidden'));

  if (action === 'copy') {
    console.log(`[API MOCK] GET /api/employees/${empId} (既存設定の取得)`);
    openCreateEmployee();
    setTimeout(() => {
      const inputs = document.querySelectorAll('#employee-create-form .form-input');
      if (inputs.length > 0) inputs[0].value = `${empName} (コピー)`;
    }, 100);
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

async function executeEmpAction() {
  if (currentEmpAction === 'toggle') {
    console.log(`[API MOCK] PATCH /api/employees/${currentEmpTargetId}/status`);
    showToast(`従業員『${currentEmpTargetName}』のステータスを更新しました。`);
    const statusBadge = document.getElementById(`emp-status-${currentEmpTargetId}`);
    if (statusBadge) statusBadge.classList.toggle('hidden');
  } else if (currentEmpAction === 'delete') {
    console.log(`[API MOCK] DELETE /api/employees/${currentEmpTargetId}`);
    showToast(`従業員『${currentEmpTargetName}』を削除しました。`);
    const cardEl = document.getElementById(`emp-card-${currentEmpTargetId}`);
    if (cardEl) cardEl.remove();
  }
  closeEmpActionModal();
}

function showEmployeeDetail(empName) {
  document.getElementById('detail-emp-name').textContent = empName;
  document.getElementById('val-name').textContent = empName;
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById('page-employee-detail').classList.remove('hidden');
  document.getElementById('page-title').textContent = '従業員管理';
}

function openEditEmployee() {
  const currentName = document.getElementById('detail-emp-name').textContent;
  document.getElementById('edit-emp-name').textContent = currentName;
  document.getElementById('edit-name').value = currentName;
  
  // モックデータ連携：マトリクス表データから退職日を取得して入力欄にセット
  const matrixEmp = matrixData.find(e => e.name === currentName);
  if (matrixEmp && matrixEmp.retireDate) {
    document.getElementById('edit-retire-date').value = matrixEmp.retireDate.replace(/-/g, '/');
  } else {
    document.getElementById('edit-retire-date').value = '';
  }

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

  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());
  console.log(`[API MOCK] PUT /api/employees/${currentEmpTargetId || 'current'}`, payload);
  
  await new Promise(resolve => setTimeout(resolve, 500));

  const newName = document.getElementById('edit-name').value;
  const oldName = document.getElementById('detail-emp-name').textContent;
  const retireDateInput = document.getElementById('edit-retire-date').value;

  // ===== 【DB連携モック】全画面のデータを一括で書き換える =====
  // 1. 従業員DB (employeesDB) の更新
  const dbEmp = employeesDB.find(e => e.name === oldName);
  if (dbEmp) dbEmp.name = newName;

  // 2. マトリクス表 (matrixData) の更新
  const matrixEmp = matrixData.find(e => e.name === oldName);
  if (matrixEmp) {
    matrixEmp.name = newName;
    // 退職日を YYYY/MM/DD から YYYY-MM-DD に変換して保存
    matrixEmp.retireDate = retireDateInput ? retireDateInput.replace(/\//g, '-') : null;
  }
  
  // 変更を即座に各画面へ反映（再描画）
  renderEmployees();
  renderMatrixTable();
  // =========================================================

  document.getElementById('detail-emp-name').textContent = newName;
  document.getElementById('val-name').textContent = newName;
  
  showToast('従業員情報を保存しました。');
  closeEditEmployee();
  btn.textContent = '設定を保存';
  btn.disabled = false;
}

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

  await new Promise(resolve => setTimeout(resolve, 500));

  showToast('新しい従業員を作成しました。');
  closeCreateEmployee();
  btn.textContent = '設定を保存';
  btn.disabled = false;

  // メールアドレスが入力されていればパスワード設定メールを送信
  const newEmail = document.getElementById('new-email').value;
  if (newEmail) {
    sendPwSetupEmail(newEmail);
  }
}
// --- ダッシュボード ---
async function renderDashboard() {
  console.log('[API MOCK] GET /api/dashboard/status');
  
  // 今後のバックエンド連携を想定したAPIレスポンスのモックデータ
  const rawData = [
    { name: '池上 裕士', status: '未出勤', timeStr: '-' },
    { name: '石井 秀龍', status: '未出勤', timeStr: '-' },
    { name: '山田 太郎', status: '出勤', timeStr: '08:55 -' },
    { name: '岡田 光平', status: '直行', timeStr: '09:00 -' },
    { name: '佐野 真知子', status: '出勤', timeStr: '09:12 -' },
    { name: '佐藤 花子', status: '退勤', timeStr: '09:00 - 18:00' },
    { name: '高橋 健太', status: '直帰', timeStr: '10:00 - 19:30' }
  ];

  // 打刻ステータスによる振り分け
  const notStarted = rawData.filter(emp => emp.status === '未出勤' || !emp.status);
  const working = rawData.filter(emp => emp.status === '出勤' || emp.status === '直行');
  const finished = rawData.filter(emp => emp.status === '退勤' || emp.status === '直帰');

  document.getElementById('dash-not-started-count').textContent = `${notStarted.length}名`;
  document.getElementById('dash-not-started-list').innerHTML = notStarted.map(emp => `
    <li class="member-item">
      <span class="member-name"><span class="dot-status" style="background-color: #f39c12;"></span>${emp.name}</span>
      <span class="time-text">${emp.timeStr}</span>
    </li>
  `).join('');

  document.getElementById('dash-working-count').textContent = `${working.length}名`;
  document.getElementById('dash-working-list').innerHTML = working.map(emp => `
    <li class="member-item">
      <span class="member-name"><span class="dot-status dot-working"></span>${emp.name}</span>
      <span class="time-text">${emp.timeStr}</span>
    </li>
  `).join('');

  document.getElementById('dash-finished-count').textContent = `${finished.length}名`;
  document.getElementById('dash-finished-list').innerHTML = finished.map(emp => `
    <li class="member-item">
      <span class="member-name"><span class="dot-status dot-finished"></span>${emp.name}</span>
      <span class="time-text">${emp.timeStr}</span>
    </li>
  `).join('');
}

// --- 月表示 (マトリクス表) ---
let currentMatrixDate = new Date(2026, 8, 1);
const matrixData = [
  {
    name: '安藤 健太郎', sum: '55.85<br><small>(8日)</small>',
    retireDate: '2026-09-15', // デモ用：9月15日を退職日に設定
    data: {
      '2026-09-03': '08:33<br>18:28', '2026-09-04': '08:38<br>18:16', '2026-09-05': '08:40<br>18:14', '2026-09-06': '08:45<br>18:35', '2026-09-07': '08:32<br>18:16', '2026-09-08': '<div class="time-edited">18:28<br>21:43</div><span class="memo-icon" data-tooltip="[NEXTメモ]\n残業申請承認済み">💬</span>', '2026-09-10': '08:32<br>18:34', '2026-09-11': '08:29<br>-', '2026-09-19': '<span class="memo-icon" data-tooltip="[NEXTメモ]\n休日出勤">💬</span>'
    }
  },
  {
    name: '五十嵐 由樹', sum: '58.78<br><small>(8日)</small>',
    retireDate: null,
    data: {
      '2026-09-02': '16:41<br>18:28<span class="memo-icon" data-tooltip="[NEXTメモ]\n直帰打刻">💬</span>', '2026-09-03': '08:54<br>18:20', '2026-09-04': '08:59<br>19:11', '2026-09-05': '08:56<br>18:56', '2026-09-06': '08:56<br>19:41', '2026-09-07': '08:48<br>20:23', '2026-09-10': '08:57<br>19:00', '2026-09-11': '08:52<br>20:06'
    }
  },
  {
    name: '池上 裕士', sum: '65.87<br><small>(9日)</small>',
    retireDate: '2026-09-08', // デモ用：9月8日を退職日に設定
    data: {
      '2026-09-01': '08:48<br>18:03', '2026-09-02': '08:49<br>18:01<span class="memo-icon" data-tooltip="[NEXTメモ]\n直行">💬</span>', '2026-09-03': '08:52<br>18:06', '2026-09-04': '08:40<br>18:01', '2026-09-06': '08:36<br>18:01<span class="memo-icon" data-tooltip="[NEXTメモ]\n休日出勤">💬</span>', '2026-09-07': '08:59<br>18:06', '2026-09-08': '08:52<br>18:12<span class="memo-icon" data-tooltip="[NEXTメモ]\n管理者修正">💬</span>', '2026-09-10': '09:00<br>18:01', '2026-09-11': '08:27<br>18:01', '2026-09-20': '<span class="memo-icon" data-tooltip="[NEXTメモ]\n休日出勤">💬</span>'
    }
  },
  {
    name: '石井 秀龍', sum: '60.60<br><small>(9日)</small>',
    retireDate: null,
    data: {
      '2026-09-02': '12:59<br>19:16<span class="memo-icon" data-tooltip="[NEXTメモ]\n午後出勤">💬</span>', '2026-09-03': '08:37<br>19:01', '2026-09-04': '08:44<br>18:02', '2026-09-05': '08:44<br>18:06', '2026-09-06': '14:00<br>18:00', '2026-09-07': '08:43<br>18:36', '2026-09-08': '08:52<br>18:12<span class="memo-icon" data-tooltip="[NEXTメモ]\n打ち合わせ打刻">💬</span>', '2026-09-10': '08:53<br>18:02', '2026-09-11': '08:59<br>18:02'
    }
  }
];

function renderMatrixTable() {
  const year = currentMatrixDate.getFullYear();
  const month = currentMatrixDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  document.getElementById('matrix-month-title').textContent = `${year}年 ${String(month).padStart(2, '0')}月度`;

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

  let tbodyHtml = '';
  matrixData.forEach(emp => {
    tbodyHtml += `<tr><td class="col-emp-name">${emp.name}</td>`;
    
    // 退職日オブジェクトを作成
    let retireDateObj = null;
    if (emp.retireDate) {
      retireDateObj = new Date(emp.retireDate);
      retireDateObj.setHours(0, 0, 0, 0);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const currentDateObj = new Date(year, month - 1, i);
      const dayOfWeek = currentDateObj.getDay();
      
      // 退職者の場合はホバー時のハイライト(cell-click)を外し、位置調整用のクラスを付与
      let tdClass = retireDateObj ? 'cell-readonly' : 'cell-click';

      const isAfterRetire = retireDateObj && (currentDateObj > retireDateObj);
      let cellData = '';

      if (isAfterRetire) {
        // 退職日以降：カーソルを禁止マークにするクラスを追加
        tdClass += ' cell-retired';
      } else {
        // 在籍期間中：実績データがあれば取得
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        cellData = emp.data[dateKey] || '';
        
        // 退職者で、かつ実績データが入力されている場合、数字部分のみをグレー枠で囲む
        if (retireDateObj && cellData) {
          cellData = `<div class="retired-time-box">${cellData}</div>`;
        }
      }
      
      // クリックイベントの出し分け
      if (isAfterRetire) {
        // 退職日以降の空セル
        tbodyHtml += `<td class="${tdClass}"></td>`;
      } else if (retireDateObj) {
        // 退職者の退職日以前のセル（データは表示するがクリック不可）
        tbodyHtml += `<td class="${tdClass}">${cellData}</td>`;
      } else {
        // 通常の従業員のセル（クリック可能）
        tbodyHtml += `<td class="${tdClass}" onclick="openCellMenu(event, '${emp.name}', '${month}/${i}')">${cellData}</td>`;
      }
    }
    const sumVal = (year === 2026 && month === 9) ? emp.sum : '-';
    tbodyHtml += `<td class="col-sum">${sumVal}</td></tr>`;
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
let currentDailyDate = new Date(2026, 8, 11);

function changeDailyDate(offset) {
  if (offset === 0) {
    currentDailyDate = new Date(2026, 8, 11); // 本日（初期値）へリセット
  } else {
    currentDailyDate.setDate(currentDailyDate.getDate() + offset);
  }
  renderDailyTable();
}

const dailyData = [
  { id: 1, name: '安藤 健太郎', time: '08:29 ～', memo: '[NEXTメモ]\n通常出勤', action: '出勤', fullTime: '9/11 08:29:00', address: '東京都千代田区有楽町1-1-1', email: '' },
  { id: 2, name: '五十嵐 由樹', time: '08:52 ～', memo: '[NEXTメモ]\n直行打刻', action: '直行出勤', fullTime: '9/11 08:52:14', address: '東京都新宿区西新宿2-8-1', email: '訪問先：株式会社〇〇\n業務内容：システム導入の打ち合わせ\n\nそのまま直行いたします。' },
  { id: 3, name: '池上 裕士', time: '08:27 ～', memo: '', action: '出勤', fullTime: '9/11 08:27:45', address: '東京都中央区銀座4-1-2', email: '' },
  { id: 4, name: '池谷 あや子', time: '08:56 ～', memo: '', action: '出勤', fullTime: '9/11 08:56:22', address: '東京都港区南青山3-1-1', email: '' },
  { id: 5, name: '石井 秀龍', time: '08:59 ～', memo: '[NEXTメモ]\n管理者修正済み', action: '出勤', fullTime: '9/11 08:59:10', address: '東京都港区六本木6-10-1', email: '' }
];

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

  console.log(`[API MOCK] GET /api/attendance/daily?date=${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`);
  const tbody = document.getElementById('daily-tbody');
  tbody.innerHTML = dailyData.map(emp => {
    const memoHtml = emp.memo ? `<span class="memo-icon" data-tooltip="${emp.memo}">💬</span>` : '';
    return `
      <tr>
        <td class="emp-name-cell">
          <span class="dot-status dot-working"></span>
          <a href="#" class="emp-link" onclick="showEmployeeDetail('${emp.name}')">${emp.name}</a>
        </td>
        <td>${emp.time} ${memoHtml}</td>
        <td>
          <div class="avatar-map-box">
            <div class="avatar-circle has-tooltip" data-tooltip="${emp.action}\n${emp.fullTime}\n住所:${emp.address}">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <button class="btn-map-badge" onclick="openMapModal('${emp.name}', '${emp.action}', '${emp.address}', '${(emp.email || '').replace(/\n/g, '\\n')}')">📍地図</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// --- 残業時間集計表 ---
let currentOvertimeDate = new Date(2026, 8, 1);
let overtimeSortKey = 'overtimeHours';
let overtimeSortAsc = false;

const overtimeDataMock = [
  { id: 1, name: '安藤 健太郎', dept: '営業', weekdayDays: 20, weekendDays: 1, totalHours: 165.5, overtimeHours: 15.5 },
  { id: 2, name: '五十嵐 由樹', dept: '課長', weekdayDays: 19, weekendDays: 0, totalHours: 155.0, overtimeHours: 5.0 },
  { id: 3, name: '池上 裕士', dept: '課', weekdayDays: 22, weekendDays: 2, totalHours: 190.0, overtimeHours: 30.0 },
  { id: 4, name: '池谷 あや子', dept: '営業', weekdayDays: 20, weekendDays: 0, totalHours: 160.0, overtimeHours: 10.0 },
  { id: 5, name: '石井 秀龍', dept: '課', weekdayDays: 21, weekendDays: 1, totalHours: 175.5, overtimeHours: 20.5 }
];

async function renderOvertimeTable() {
  const filterEl = document.getElementById('overtime-dept-filter');
  const selectedDept = filterEl ? filterEl.value : 'ALL';
  console.log(`[API MOCK] GET /api/attendance/overtime?year=${currentOvertimeDate.getFullYear()}&month=${currentOvertimeDate.getMonth() + 1}&dept=${selectedDept}`);
  
  const year = currentOvertimeDate.getFullYear();
  const month = currentOvertimeDate.getMonth() + 1;
  document.getElementById('overtime-month-title').textContent = `${year}年 ${String(month).padStart(2, '0')}月度`;

  // 選択された区分（課/課長/営業）で絞り込み
  let displayData = overtimeDataMock;
  if (selectedDept !== 'ALL') {
    displayData = overtimeDataMock.filter(emp => emp.dept === selectedDept);
  }

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
        <a href="#" onclick="showEmployeeDetail('${emp.name}')" style="color:inherit; text-decoration:none;">${emp.name}</a>
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

// 2. 【API通信モック】将来 fetch() でエンドポイントを叩く処理に差し替える関数
async function fetchEmployeesAPI(initialFilter, nameFilter) {
  // バックエンドへイニシャルと名前の両方をクエリパラメータとして送信する想定
  console.log(`[API MOCK] GET /api/employees?initial=${initialFilter}&name=${nameFilter}`);
  
  // ネットワーク通信の遅延をシミュレート（300ms）
  await new Promise(resolve => setTimeout(resolve, 300));

  let result = employeesDB;

  // ① イニシャルによる絞り込み（DBのWHERE句を想定）
  if (initialFilter !== 'ALL') {
    const initialMap = {
      'ア': /^[ア-オ]/, 'カ': /^[カ-ゴ]/, 'サ': /^[サ-ゾ]/,
      'タ': /^[タ-ド]/, 'ナ': /^[ナ-ノ]/, 'ハ': /^[ハ-ポ]/,
      'マ': /^[マ-モ]/, 'ヤ': /^[ヤ-ヨ]/, 'ラ': /^[ラ-ロ]/,
      'ワ': /^[ワ-ン]/, 'A-Z': /^[A-Za-z]/
    };
    const regex = initialMap[initialFilter];
    if (regex) {
      result = result.filter(emp => regex.test(emp.kana));
    } else {
      result = [];
    }
  }

  // ② 名前（漢字・フリガナ）による部分一致絞り込み（DBのLIKE検索を想定）
  if (nameFilter) {
    // 検索キーワードの空白(全角/半角)を除去し、ひらがなをカタカナに変換する
    const normalizedFilter = nameFilter
      .replace(/[\s ]/g, '')
      .replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));

    result = result.filter(emp => {
      // データの名前とフリガナからも空白を除去して比較する
      const normalizedName = emp.name.replace(/[\s ]/g, '');
      const normalizedKana = emp.kana.replace(/[\s ]/g, '');
      
      return normalizedName.includes(normalizedFilter) || normalizedKana.includes(normalizedFilter);
    });
  }

  return result;
}

// 3. 画面描画処理（データの取得完了を待ってからレンダリング）
async function renderEmployees() {
  const container = document.getElementById('emp-list-container');
  
  // データ取得中のローディング表示
  container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-sub);">読み込み中...</div>';

  // APIから非同期でデータを取得 (検索パラメータを2つ渡す)
  const data = await fetchEmployeesAPI(currentInitialFilter, currentNameFilter);

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
            <a href="#" class="emp-name" onclick="showEmployeeDetail('${emp.name}')">${emp.name}</a>
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
document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  renderMatrixTable();
  renderDailyTable();
  renderOvertimeTable();
  renderEmployees();
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