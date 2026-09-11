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
// セルクリック時のポップアップ制御（仕様書要件）
let selectedTargetInfo = '';

function openCellMenu(event, empName, dateStr) {
  event.stopPropagation();
  selectedTargetInfo = `${empName} (${dateStr})`;
  
  const menu = document.getElementById('cell-action-menu');
  const title = document.getElementById('cell-menu-title');
  
  title.textContent = selectedTargetInfo;
  
  // クリック位置に合わせてメニューを表示
  menu.style.left = `${event.pageX}px`;
  menu.style.top = `${event.pageY}px`;
  menu.classList.remove('hidden');
}

function handleCellAction(actionName) {
  document.getElementById('cell-action-menu').classList.add('hidden');
  showModal(actionName, `${selectedTargetInfo} の${actionName}処理画面を開きます。`);
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