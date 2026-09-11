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