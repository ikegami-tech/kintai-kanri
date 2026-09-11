// 1. ログイン処理
document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');
});

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

  // 同じメニューをクリックした場合はサイドバーを縮小して処理を終了
  if (element && element.classList.contains('active')) {
    if (!sidebar.classList.contains('collapsed')) {
      toggleSidebar();
    }
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

  // メニュー選択後は画面を広く使うためサイドバーを自動で縮小する
  if (!sidebar.classList.contains('collapsed')) {
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

function saveEmployeeEdit(event) {
  event.preventDefault(); // 画面リロード防止
  
  // 入力された名前を詳細画面へ反映
  const newName = document.getElementById('edit-name').value;
  document.getElementById('detail-emp-name').textContent = newName;
  document.getElementById('val-name').textContent = newName;
  
  // トースト通知を表示
  const toast = document.getElementById('toast-message');
  toast.classList.remove('hidden');
  toast.style.opacity = '1';

  // 一旦詳細画面へ戻す
  closeEditEmployee();

  // 2.5秒後にトーストをフェードアウトして非表示
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 500);
  }, 2500);
}
// ==========================================
// 新規従業員作成画面 制御
// ==========================================
function openCreateEmployee() {
  // フォームの内容をクリア
  document.getElementById('employee-create-form').reset();
  
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById('page-employee-create').classList.remove('hidden');
}

function closeCreateEmployee() {
  // 従業員一覧画面に戻る
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById('page-employees').classList.remove('hidden');
}

function saveNewEmployee(event) {
  event.preventDefault(); // 画面リロード防止
  
  // トースト通知を表示
  const toast = document.getElementById('toast-message');
  toast.textContent = '新しい従業員を作成しました。';
  toast.classList.remove('hidden');
  toast.style.opacity = '1';

  // 一覧画面へ戻す
  closeCreateEmployee();

  // 2.5秒後にトーストをフェードアウト
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.textContent = '従業員を保存しました。'; // メッセージを元に戻す
    }, 500);
  }, 2500);
}
// ==========================================
// 縮小時にメニューバー自体をクリックすると大きく表示する処理
// ==========================================
document.getElementById('sidebar').addEventListener('click', function(e) {
  // メニュー項目をクリックした際は、ここでの展開処理をキャンセル（switchPage等に任せる）
  if (e.target.closest('.nav-item')) {
    return;
  }
  // すでに展開済みの場合、または「フッターボタン」を直接押した場合は二重起動を防ぐ
  if (this.classList.contains('collapsed') && 
      !e.target.closest('.sidebar-footer')) {
    toggleSidebar();
  }
});