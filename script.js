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

// 3. サイドバーの展開 / 縮小
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('expanded');
}

// 4. 勤怠管理メニュー（クリックでメニュー幅を自動拡張してアコーディオン開閉）
function handleAttendanceMenuClick(element) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar.classList.contains('expanded')) {
    sidebar.classList.add('expanded');
  }
  const submenu = document.getElementById('attendance-sub');
  submenu.classList.toggle('open');
}

// 5. 画面切り替え (SPA)
function switchPage(pageId, element) {
  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById('page-' + pageId).classList.remove('hidden');

  const titles = {
    'dashboard': 'ダッシュボード',
    'monthly': '月別勤怠 (マトリクス表)',
    'weekly': '週別勤怠',
    'employees': '従業員管理',
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