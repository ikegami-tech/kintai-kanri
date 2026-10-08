// ==========================================
// 店舗マスタ定義 & グローバル状態
// ==========================================
let SHOP_LIST = {}; 
let currentSelectedShopId = 'shop_01'; // 現在表示中の店舗ID

// データベースから店舗一覧を取得して自動更新する関数
async function loadShopListFromDB() {
  try {
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/shops');
    if (response.ok) {
      const shops = await response.json();
      SHOP_LIST = {}; // 一旦リセット
      shops.forEach(shop => {
        SHOP_LIST[shop.id] = shop.name;
      });
    }
  } catch (error) {
    console.error('店舗リストの取得に失敗しました:', error);
  }
  initShopSelects(); // 取得完了後にプルダウンを生成
}

// 全店舗プルダウン＆左メニューアコーディオンの初期化
function initShopSelects() {
  const globalSelect = document.getElementById('global-shop-select');
  const shopSubMenu = document.getElementById('shop-sub');
  const currentShopNameSpan = document.getElementById('sidebar-shop-current-name');
  const editSelect = document.getElementById('edit-shop-id');
  const newSelect = document.getElementById('new-shop-id');

  let optionsHtml = '';
  let subMenuHtml = '';
  const sortedKeys = Object.keys(SHOP_LIST).sort();
  
  sortedKeys.forEach(id => {
    optionsHtml += `<option value="${id}">${SHOP_LIST[id]}</option>`;
    // 左メニュー用のdivを生成
    subMenuHtml += `<div class="nav-item" style="padding-left: 54px; font-size: 13px;" onclick="changeSidebarShopDiv('${id}')">${SHOP_LIST[id]}</div>`;
  });

  if (globalSelect) {
    globalSelect.innerHTML = optionsHtml;
    globalSelect.value = currentSelectedShopId;
  }
  if (shopSubMenu) {
    shopSubMenu.innerHTML = subMenuHtml;
  }
  if (currentShopNameSpan) {
    // 初期状態では「店舗選択」のままにするため、ここでの上書き処理を削除または条件付きにします
    // 何も選択されていない初期状態を想定し、初期化時は書き換えないようにします。
    if (currentShopNameSpan.textContent !== '店舗選択') {
         currentShopNameSpan.textContent = SHOP_LIST[currentSelectedShopId] || '店舗選択';
    }
  }
  if (editSelect) editSelect.innerHTML = optionsHtml;
  if (newSelect) newSelect.innerHTML = optionsHtml;
}

// 店舗メニューアコーディオンの開閉処理を追加
function toggleShopMenu() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && sidebar.classList.contains('collapsed')) {
    sidebar.classList.remove('collapsed');
  }
  const submenu = document.getElementById('shop-sub');
  const arrow = document.getElementById('shop-arrow');
  if (submenu) submenu.classList.toggle('open');
  if (arrow) arrow.classList.toggle('open');
}

// 全店舗(右上のプルダウン)からの切り替え処理
async function changeGlobalShop() {
  const select = document.getElementById('global-shop-select');
  if (select) {
    currentSelectedShopId = select.value;
    sessionStorage.setItem('selectedShopId', currentSelectedShopId);
    
    // 左メニュー側の表示も更新
    const currentShopNameSpan = document.getElementById('sidebar-shop-current-name');
    if (currentShopNameSpan) {
      currentShopNameSpan.textContent = SHOP_LIST[currentSelectedShopId] || '対象店舗';
    }
    
    await renderEmployees();
    handleRouting();
  }
}

// 左メニュー(アコーディオン内のdiv)からの切り替え処理
async function changeSidebarShopDiv(shopId) {
  currentSelectedShopId = shopId;
  sessionStorage.setItem('selectedShopId', currentSelectedShopId);
  
  // 右上プルダウンの値を連動させる
  const globalSelect = document.getElementById('global-shop-select');
  if (globalSelect) {
    globalSelect.value = shopId;
  }
  
  // 左メニューのタイトルを選択した店舗名に更新
  const currentShopNameSpan = document.getElementById('sidebar-shop-current-name');
  if (currentShopNameSpan) {
    currentShopNameSpan.textContent = SHOP_LIST[shopId] || '店舗選択';
  }
  
  // 選択したらメニューを確実に閉じる
  const submenu = document.getElementById('shop-sub');
  const arrow = document.getElementById('shop-arrow');
  if (submenu) submenu.classList.remove('open');
  if (arrow) arrow.classList.remove('open');
  
  await renderEmployees();
  handleRouting();
}

// ユーザー権限と店舗表示の初期化制御
function applyUserPermissions(user) {
  // ★追加：サイドバー左上のログインユーザー名・店舗名を動的に更新
  const userNameEl = document.querySelector('.user-name');
  const userRoleEl = document.querySelector('.user-role');
  if (userNameEl && user.name) {
    userNameEl.textContent = user.name;
  }
  if (userRoleEl) {
    userRoleEl.textContent = SHOP_LIST[user.shop_id] || user.department || '東宝ハウスNEXT';
  }

  // sessionStorageに手動選択した店舗があれば優先、無ければ初期店舗をセット
  const savedShopId = sessionStorage.getItem('selectedShopId');
  if (savedShopId && SHOP_LIST[savedShopId]) {
    currentSelectedShopId = savedShopId;
  } else if (user.shop_id && SHOP_LIST[user.shop_id]) {
    currentSelectedShopId = user.shop_id;
  } else {
    const sortedShops = Object.keys(SHOP_LIST).sort();
    currentSelectedShopId = sortedShops.length > 0 ? sortedShops[0] : 'shop_01';
  }
  
  const globalSelect = document.getElementById('global-shop-select');
  const sidebarSelect = document.getElementById('sidebar-shop-select');
  if (globalSelect) globalSelect.value = currentSelectedShopId;
  if (sidebarSelect) sidebarSelect.value = currentSelectedShopId;

  const adminSelector = document.getElementById('admin-shop-selector'); 
  const sidebarSelector = document.getElementById('sidebar-shop-selector'); 
  const shopManageMenu = document.getElementById('nav-shop-manage'); 

  if (user.role === 'システム管理者' || user.role === '勤怠管理者') {
    if (sidebarSelector) sidebarSelector.classList.remove('hidden');
  } else {
    if (sidebarSelector) sidebarSelector.classList.add('hidden');
  }

  if (user.role === 'システム管理者') {
    if (adminSelector) adminSelector.classList.remove('hidden');
    if (shopManageMenu) shopManageMenu.classList.remove('hidden');
  } else {
    if (adminSelector) adminSelector.classList.add('hidden');
    if (shopManageMenu) shopManageMenu.classList.add('hidden');
  }
}

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
  
  try {
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, password: loginPw })
    });

    if (!response.ok) {
      throw new Error('ログイン情報が正しくありません');
    }

    const responseData = await response.json();
    const user = responseData.user;

    if (user && user.role === '一般') {
      alert('一般権限のアカウントはWeb管理画面にログインできません。（打刻アプリをご利用ください）');
      return;
    }

    if (user) {
      localStorage.setItem('loggedInUser', JSON.stringify(user));
      applyUserPermissions(user);
    }

    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');

    location.hash = '#/dashboard';
    handleRouting();
  } catch (error) {
    console.error('ログインエラー:', error);
    alert('ログインに失敗しました。メールアドレスまたはパスワードが間違っています。');
  } finally {
    btn.textContent = 'ログイン';
    btn.disabled = false;
  }
});

function logout() {
  if (!confirm('ログアウトしますか？')) return;

  localStorage.removeItem('loggedInUser');

  document.getElementById('app-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
  const loginIdEl = document.getElementById('login-id');
  const loginPwEl = document.getElementById('login-pw');
  if (loginIdEl) loginIdEl.value = '';
  if (loginPwEl) loginPwEl.value = '';
  
  location.hash = ''; 
}

window.addEventListener('DOMContentLoaded', () => {
  const loggedInUser = localStorage.getItem('loggedInUser');
  if (loggedInUser && !location.hash.includes('password-setup')) {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    handleRouting();
  }
});

// ==========================================
// 2. UI制御 & URLルーティング
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

window.addEventListener('hashchange', handleRouting);

async function handleRouting() {
  let fullHash = location.hash.replace(/^#\//, '') || 'dashboard';
  let path = fullHash.split('?')[0];
  const urlParams = new URLSearchParams(fullHash.includes('?') ? fullHash.split('?')[1] : '');
  const urlEmpId = urlParams.get('id');

  if (urlEmpId) {
    currentEmpTargetId = Number(urlEmpId);
  }

  if (path === 'password-setup') {
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('password-setup-view').classList.remove('hidden');
    document.getElementById('password-complete-view').classList.add('hidden');
    return;
  }

  // ★ どの画面を開いても、まだデータがなければ「全従業員データ」を確実に取得する
  if (currentEmployeeList.length === 0 && path !== 'dashboard' && path !== 'shops' && path !== 'holiday-setting') {
    currentEmployeeList = await fetchEmployeesAPI('ALL', '');
  }

  const pages = document.querySelectorAll('.page-content');
  pages.forEach(page => page.classList.add('hidden'));

  const targetElement = document.getElementById('page-' + path);
  if (targetElement) {
    targetElement.classList.remove('hidden');
    if (path === 'dashboard') renderDashboard();
    if (path === 'monthly') renderMatrixTable();
    if (path === 'daily') renderDailyTable();
    if (path === 'employees') renderEmployees();
    if (path === 'holiday-setting') renderHolidayCalendar();
    if (path === 'overtime') renderOvertimeTable();
    if (path === 'late') renderExtraCategoryTable('late', '【遅刻】');
    if (path === 'absence') renderExtraCategoryTable('absence', '【欠勤】');
    if (path === 'paid-leave') renderExtraCategoryTable('paid-leave', '【有給】');
    if (path === 'employee-detail' && currentEmpTargetId) showEmployeeDetail(currentEmpTargetId);
    if (path === 'employee-edit' && currentEmpTargetId) openEditEmployee();
    if (path === 'employee-create') initCreateEmployeeView();
    if (path === 'web-timeclock') initWebTimeclock();
    if (path === 'shops') renderShops();
  }

  const titles = {
    'dashboard': 'ダッシュボード',
    'monthly': '月表示',
    'daily': '日表示',
    'overtime': '残業時間集計',
    'late': '遅刻管理',
    'absence': '欠勤管理',
    'paid-leave': '有給管理',
    'employees': '従業員一覧',
    'shops': '店舗管理',
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
    if (path === 'late' && item.textContent.includes('遅刻')) return true;
    if (path === 'absence' && item.textContent.includes('欠勤')) return true;
    if (path === 'paid-leave' && item.textContent.includes('有給')) return true;
    if ((path === 'employees' || path.includes('employee-')) && item.textContent.includes('従業員')) return true;
    if (path === 'overtime' && item.textContent.includes('集計')) return true;
    if (path === 'shops' && item.textContent.includes('店舗管理')) return true;
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

function switchPage(pageId, element = null) {
  const sidebar = document.getElementById('sidebar');
  // サイドバーが折りたたまれている（閉じている）場合のみ展開する
  if (sidebar && sidebar.classList.contains('collapsed')) {
    sidebar.classList.remove('collapsed');
  }

  location.hash = '#/' + pageId;
}

function openWebTimeclock() {
  window.open('#/web-timeclock', '_blank');
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

const addressCache = {};

async function reverseGeocode(coordsStr) {
  if (!coordsStr || coordsStr === '位置情報未取得') return '位置情報未取得';
  const clean = coordsStr.trim();
  if (!/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(clean)) {
    return clean;
  }

  const [latNum, lngNum] = clean.split(',').map(Number);
  const cacheKey = `${latNum.toFixed(4)},${lngNum.toFixed(4)}`;
  if (addressCache[cacheKey]) {
    return addressCache[cacheKey];
  }

  let prefecture = '';
  let city = '';
  let town = '';

  try {
    const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latNum}&longitude=${lngNum}&localityLanguage=ja`);
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      prefecture = bdcData.principalSubdivision || '';
      city = bdcData.locality || bdcData.city || '';
    }
  } catch (e) {
    console.warn('BigDataCloud API取得エラー:', e);
  }

  try {
    const gsiRes = await fetch(`https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${latNum}&lon=${lngNum}`);
    if (gsiRes.ok) {
      const gsiData = await gsiRes.json();
      if (gsiData && gsiData.results && gsiData.results.lv01Nm) {
        town = gsiData.results.lv01Nm;
      }
    }
  } catch (e) {
    console.warn('国土地理院 API取得エラー:', e);
  }

  const addr = `${prefecture}${city}${town}`.trim();
  if (addr) {
    addressCache[cacheKey] = addr;
    return addr;
  }
  return clean;
}

async function openMapModal(empName, actionStr, addressStr, emailContent = '') {
  document.getElementById('map-modal-title').textContent = `${actionStr || '出勤'} (${empName})`;
  
  let resolvedAddress = addressStr;
  if (addressStr && /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(addressStr.trim())) {
    resolvedAddress = await reverseGeocode(addressStr);
  }

  const displayAddress = resolvedAddress && resolvedAddress !== '位置情報未取得' ? `打刻位置: ${resolvedAddress}` : '位置情報が記録されていません';
  document.getElementById('map-modal-address').textContent = displayAddress;
  
  const mapIframe = document.getElementById('map-iframe');
  if (mapIframe) {
    const mapQuery = addressStr && addressStr !== '位置情報未取得' ? addressStr : '東京都千代田区有楽町1-1-1';
    mapIframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }

  const modalBody = document.getElementById('map-modal-body');
  const emailArea = document.getElementById('map-modal-email-area');
  const emailSubject = document.getElementById('map-modal-email-subject');
  const emailText = document.getElementById('map-modal-email-text');

  if (actionStr.includes('直行') || actionStr.includes('直帰')) {
    modalBody.classList.add('map-modal-wide');
    emailArea.classList.remove('hidden');
    
    const lastName = empName ? empName.split(/[\s ]+/)[0] : '';
    const typeStr = actionStr.includes('直行') ? '直行' : '直帰';
    if (emailSubject) emailSubject.textContent = `件名 ${typeStr} ${lastName}`;

    let targetText = emailContent || '';
    targetText = targetText.replace(/\[(?:IN|OUT)_LOC:[^\]]*\]/gi, '').trim();

    if (targetText.includes('直行') && targetText.includes('直帰')) {
      const parts = targetText.split('直帰');
      if (typeStr === '直行') {
        targetText = parts[0].replace(/直行/g, '').replace(/管理者修正/g, '').replace(/休日出勤/g, '').trim();
      } else {
        targetText = parts[1] ? parts[1].replace(/直帰/g, '').replace(/管理者修正/g, '').replace(/休日出勤/g, '').trim() : '';
      }
    } else {
      targetText = targetText.replace(/直行/g, '').replace(/直帰/g, '').replace(/管理者修正/g, '').replace(/休日出勤/g, '').trim();
    }

    if (emailText) emailText.textContent = targetText || '※メール内容が登録されていません。';
  } else {
    modalBody.classList.remove('map-modal-wide');
    emailArea.classList.add('hidden');
    if (emailSubject) emailSubject.textContent = '';
    if (emailText) emailText.textContent = '';
  }

  document.getElementById('map-modal').classList.remove('hidden');
}

function closeMapModal() {
  document.getElementById('map-modal').classList.add('hidden');
}

// ==========================================
// 4. アクション・セル操作
// ==========================================
let currentEmpName = '';
let currentDate = '';
let currentCellElement = null; 
let currentRecordId = null; 
let isDragging = false;

function openCellMenu(event, empName, dateStr) {
  if (isDragging) return;
  event.stopPropagation();
  currentEmpName = empName;
  
  // マトリクス表の現在の年を取得し、渡された月/日から日付文字列を生成する
  const year = currentMatrixDate.getFullYear();
  const month = dateStr.split('/')[0].padStart(2, '0');
  const day = dateStr.split('/')[1].padStart(2, '0');
  currentDate = `${year}/${month}/${day}`;
  
  currentCellElement = event.currentTarget;
  currentRecordId = null; 
  
  const menu = document.getElementById('cell-action-menu');
  menu.innerHTML = `
    <div class="popover-header" id="cell-menu-title">${empName} - ${dateStr}</div>
    <div class="popover-item" onclick="handleCellAction('新規作成')">➕ 新規作成</div>
    <div class="popover-item" onclick="handleCellAction('編集')">✏️ 編集</div>
    <div class="popover-item" onclick="handleCellAction('従業員メモ')">📝 従業員メモ</div>
  `;
  menu.style.left = `${event.pageX}px`;
  menu.style.top = `${event.pageY}px`;
  menu.classList.remove('hidden');
}

function openEditMenu(event, empName, dateStr, recordId, clockIn, clockOut, memo) {
  if (isDragging) return;
  event.stopPropagation();
  currentEmpName = empName;
  
  // マトリクス表の現在の年を取得し、渡された月/日から日付文字列を生成する
  const year = currentMatrixDate.getFullYear();
  const month = dateStr.split('/')[0].padStart(2, '0');
  const day = dateStr.split('/')[1].padStart(2, '0');
  currentDate = `${year}/${month}/${day}`;
  
  currentCellElement = event.currentTarget;
  currentRecordId = recordId;
  
  currentCellElement.dataset.clockIn = clockIn;
  currentCellElement.dataset.clockOut = clockOut;
  currentCellElement.dataset.rawMemo = memo || '';
  
  const menu = document.getElementById('cell-action-menu');
  menu.innerHTML = `
    <div class="popover-header" id="cell-menu-title">${empName} - ${dateStr} (編集)</div>
    <div class="popover-item" onclick="handleCellAction('編集')">✏️ 編集</div>
    <div class="popover-item" onclick="handleCellAction('従業員メモ')">📝 従業員メモ</div>
  `;
  menu.style.left = `${event.pageX}px`;
  menu.style.top = `${event.pageY}px`;
  menu.classList.remove('hidden');
}

function toggleExtraTimeRow(mode, type) {
  const checkbox = document.getElementById(`${mode}-check-${type}`);
  const row = document.getElementById(`${mode}-row-${type}`);
  if (checkbox && row) {
    if (checkbox.checked) row.classList.remove('hidden');
    else row.classList.add('hidden');
  }
}

function handleCellAction(actionType) {
  document.getElementById('cell-action-menu').classList.add('hidden');
  
  if (actionType === '新規作成') {
    document.getElementById('create-emp-name').textContent = currentEmpName;
    document.getElementById('create-date').value = currentDate;
    
    document.getElementById('create-start-h').value = '--';
    document.getElementById('create-start-m').value = '--';
    document.getElementById('create-end-h').value = '--';
    document.getElementById('create-end-m').value = '--';
    
    ['late', 'absence', 'early', 'paid-am', 'paid-pm', 'paid-full'].forEach(type => {
      const cb = document.getElementById(`create-check-${type}`);
      if (cb) { cb.checked = false; toggleExtraTimeRow('create', type); }
      
      let defSH = '--', defSM = '--', defEH = '--', defEM = '--';
      if (type === 'paid-am') { defSH = '09'; defSM = '00'; defEH = '14'; defEM = '00'; }
      if (type === 'paid-pm') { defSH = '13'; defSM = '00'; defEH = '18'; defEM = '00'; }
      if (type === 'paid-full') { defSH = '09'; defSM = '00'; defEH = '18'; defEM = '00'; }

      document.getElementById(`create-${type}-start-h`).value = defSH;
      document.getElementById(`create-${type}-start-m`).value = defSM;
      document.getElementById(`create-${type}-end-h`).value = defEH;
      document.getElementById(`create-${type}-end-m`).value = defEM;
    });

    const cbIn = document.getElementById('create-check-direct-in');
    const cbOut = document.getElementById('create-check-direct-out');
    if (cbIn) cbIn.checked = false;
    if (cbOut) cbOut.checked = false;

    document.getElementById('modal-record-create').classList.remove('hidden');
    
  } else if (actionType === '編集') {
    document.getElementById('edit-emp-name').textContent = currentEmpName;
    document.getElementById('edit-date').value = currentDate;
    
    let startH = '--', startM = '--', endH = '--', endM = '--';
    let rawMemo = '';
    if (currentCellElement) {
      const clockIn = currentCellElement.dataset.clockIn;
      const clockOut = currentCellElement.dataset.clockOut;
      rawMemo = currentCellElement.dataset.rawMemo || '';
      if (clockIn && clockIn.includes(':')) {
        const [h, m] = clockIn.split(':');
        startH = h; startM = m;
      }
      if (clockOut && clockOut.includes(':')) {
        const [h, m] = clockOut.split(':');
        endH = h; endM = m;
      }
    }
    
    document.getElementById('edit-start-h').value = startH;
    document.getElementById('edit-start-m').value = startM;
    document.getElementById('edit-end-h').value = endH;
    document.getElementById('edit-end-m').value = endM;

    const cbIn = document.getElementById('edit-check-direct-in');
    const cbOut = document.getElementById('edit-check-direct-out');
    if (cbIn) cbIn.checked = rawMemo.includes('直行');
    if (cbOut) cbOut.checked = rawMemo.includes('直帰');
    
    // 直行直帰のメール内容を抽出してセットする
    const mailBox = document.getElementById('edit-mail-box');
    const mailContent = document.getElementById('mail-content');
    if (mailBox && mailContent) {
      // 位置情報タグや管理者修正タグ、各時間タグを除外して本文のみを抽出
      let tempMemo = rawMemo
        .replace(/\[(?:IN|OUT)_LOC:[^\]]*\]/gi, '')
        .replace(/管理者修正/g, '')
        .replace(/休日出勤/g, '')
        .replace(/【.*?】(\d{2}:\d{2}〜\d{2}:\d{2})?/g, '')
        .replace(/【.*?】/g, '')
        .trim();
        
      if (tempMemo && (rawMemo.includes('直行') || rawMemo.includes('直帰'))) {
         mailContent.innerHTML = tempMemo.replace(/\n/g, '<br>');
         mailBox.classList.remove('hidden');
         mailContent.classList.add('hidden'); // 初期状態は閉じておく
         const arrow = document.getElementById('mail-arrow');
         if (arrow) arrow.textContent = '▼';
      } else {
         mailBox.classList.add('hidden');
      }
    }

    const labelMap = { late: '遅刻', absence: '欠勤', early: '早退', 'paid-am': '午前休', 'paid-pm': '午後休', 'paid-full': '有給' };
    ['late', 'absence', 'early', 'paid-am', 'paid-pm', 'paid-full'].forEach(type => {
      const cb = document.getElementById(`edit-check-${type}`);
      let sh = '--', sm = '--', eh = '--', em = '--';
      let checked = false;
      const regex = new RegExp(`【${labelMap[type]}】(\\d{2}):(\\d{2})〜(\\d{2}):(\\d{2})`);
      const match = rawMemo.match(regex);
      if (match) {
        checked = true;
        sh = match[1]; sm = match[2]; eh = match[3]; em = match[4];
      } else if (rawMemo.includes(`【${labelMap[type]}】`)) {
        checked = true;
        if (type === 'paid-am') { sh = '09'; sm = '00'; eh = '14'; em = '00'; }
        if (type === 'paid-pm') { sh = '13'; sm = '00'; eh = '18'; em = '00'; }
        if (type === 'paid-full') { sh = '09'; sm = '00'; eh = '18'; em = '00'; }
      } else {
        if (type === 'paid-am') { sh = '09'; sm = '00'; eh = '14'; em = '00'; }
        if (type === 'paid-pm') { sh = '13'; sm = '00'; eh = '18'; em = '00'; }
        if (type === 'paid-full') { sh = '09'; sm = '00'; eh = '18'; em = '00'; }
      }
      
      if (cb) { cb.checked = checked; toggleExtraTimeRow('edit', type); }
      const elSh = document.getElementById(`edit-${type}-start-h`);
      const elSm = document.getElementById(`edit-${type}-start-m`);
      const elEh = document.getElementById(`edit-${type}-end-h`);
      const elEm = document.getElementById(`edit-${type}-end-m`);
      if (elSh) elSh.value = sh;
      if (elSm) elSm.value = sm;
      if (elEh) elEh.value = eh;
      if (elEm) elEm.value = em;
    });

    document.getElementById('modal-record-edit').classList.remove('hidden');
    
  } else if (actionType === '従業員メモ') {
    document.getElementById('memo-emp-name').textContent = currentEmpName;
    document.getElementById('memo-date').textContent = currentDate;
    
    const memoTextarea = document.getElementById('modal-employee-memo').querySelector('textarea');
    let existingMemo = '';
    if (currentCellElement) {
      const raw = currentCellElement.dataset.rawMemo || '';

      const hasDirectIn = raw.includes('直行');
      const hasDirectOut = raw.includes('直帰');
      let directTags = [];
      if (hasDirectIn) directTags.push('直行');
      if (hasDirectOut) directTags.push('直帰');

      let cleanMemo = raw
        .replace(/\[(?:IN|OUT)_LOC:[^\]]*\]/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/管理者修正/g, ''); // 休日出勤を消さずに残す

      if (cleanMemo.includes('直行') && cleanMemo.includes('直帰')) {
          const parts = cleanMemo.split('直帰');
          cleanMemo = parts[0].split('直行')[0]; 
      } else if (cleanMemo.includes('直行')) {
          cleanMemo = cleanMemo.split('直行')[0];
      } else if (cleanMemo.includes('直帰')) {
          cleanMemo = cleanMemo.split('直帰')[0];
      }

      let otherMemo = cleanMemo.trim();

      let memoParts = [];
      if (directTags.length > 0) memoParts.push(directTags.join('・'));
      if (otherMemo) memoParts.push(otherMemo);

      existingMemo = memoParts.join('\n').trim();
    }
    memoTextarea.value = existingMemo;

    document.getElementById('modal-employee-memo').classList.remove('hidden');
  }
}

function closeRecordModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// 【API通信実装】実績の新規登録処理
async function submitRecordCreate() {
  const normalizedCurrentName = currentEmpName ? currentEmpName.replace(/\s+/g, '') : '';
  const emp = currentEmployeeList.find(e => e.name && e.name.replace(/\s+/g, '') === normalizedCurrentName);

  if (!emp) {
    alert('従業員データが見つかりません。画面を再読み込みして再度お試しください。');
    return;
  }

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

  const clockIn = (startH !== '--' && startM !== '--') ? `${startH}:${startM}:00` : null;
  const clockOut = (endH !== '--' && endM !== '--') ? `${endH}:${endM}:00` : null;

  const cbLate = document.getElementById('create-check-late');
  const cbAbsence = document.getElementById('create-check-absence');
  const cbEarly = document.getElementById('create-check-early');
  const cbPaidAm = document.getElementById('create-check-paid-am');
  const cbPaidPm = document.getElementById('create-check-paid-pm');
  const cbPaidFull = document.getElementById('create-check-paid-full');

  if (!clockIn && !(cbLate && cbLate.checked) && !(cbAbsence && cbAbsence.checked) && !(cbEarly && cbEarly.checked) && !(cbPaidAm && cbPaidAm.checked) && !(cbPaidPm && cbPaidPm.checked) && !(cbPaidFull && cbPaidFull.checked)) {
    alert('出勤時間を指定するか、遅刻・欠勤・早退・有給のいずれかを選択してください。');
    return;
  }

  const cbIn = document.getElementById('create-check-direct-in');
  const cbOut = document.getElementById('create-check-direct-out');
  let directMemoList = [];
  if (cbIn && cbIn.checked) directMemoList.push('直行');
  if (cbOut && cbOut.checked) directMemoList.push('直帰');

  let memoParts = ['管理者修正'];
  if (typeof holidaySettingsMap !== 'undefined' && holidaySettingsMap[dateVal]) {
    memoParts.push('休日出勤');
  }
  if (directMemoList.length > 0) {
    memoParts.push(directMemoList.join('・'));
  }

  const labelMap = { late: '遅刻', absence: '欠勤', early: '早退', 'paid-am': '午前休', 'paid-pm': '午後休', 'paid-full': '有給' };
  ['late', 'absence', 'early', 'paid-am', 'paid-pm', 'paid-full'].forEach(type => {
    const cb = document.getElementById(`create-check-${type}`);
    if (cb && cb.checked) {
      const sh = document.getElementById(`create-${type}-start-h`)?.value || '--';
      const sm = document.getElementById(`create-${type}-start-m`)?.value || '--';
      const eh = document.getElementById(`create-${type}-end-h`)?.value || '--';
      const em = document.getElementById(`create-${type}-end-m`)?.value || '--';
      if (sh !== '--' && sm !== '--' && eh !== '--' && em !== '--') {
        memoParts.push(`【${labelMap[type]}】${sh}:${sm}〜${eh}:${em}`);
      } else {
        memoParts.push(`【${labelMap[type]}】`);
      }
    }
  });

  const payload = {
    employee_id: emp.id,
    work_date: dateVal,
    clock_in: clockIn,
    clock_out: clockOut,
    memo: memoParts.join('\n'),
    shop_id: currentSelectedShopId // ここを追加
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
    await renderMatrixTable();

  } catch (error) {
    console.error('打刻作成エラー:', error);
    alert('保存に失敗しました。サーバーの状態を確認してください。');
  }
}

// 【API通信実装】実績の編集更新処理
async function submitRecordEdit() {
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

  const clockIn = (startH !== '--' && startM !== '--') ? `${startH}:${startM}:00` : null;
  const clockOut = (endH !== '--' && endM !== '--') ? `${endH}:${endM}:00` : null;

  const cbInEdit = document.getElementById('edit-check-direct-in');
  const cbOutEdit = document.getElementById('edit-check-direct-out');
  let directMemoList = [];
  if (cbInEdit && cbInEdit.checked) directMemoList.push('直行');
  if (cbOutEdit && cbOutEdit.checked) directMemoList.push('直帰');

  let existingMemo = '';
  if (currentCellElement) {
    const memoIcon = currentCellElement.querySelector('.memo-icon');
    if (memoIcon) existingMemo = memoIcon.getAttribute('data-tooltip');
  }

  let memoParts = ['管理者修正'];
  
  if (typeof holidaySettingsMap !== 'undefined' && holidaySettingsMap[dateVal]) {
    if (!existingMemo.includes('休日出勤')) {
      memoParts.push('休日出勤');
    }
  }

  if (directMemoList.length > 0) memoParts.push(directMemoList.join('・'));

  let cleanMemo = existingMemo
    .replace(/【遅刻】.*/g, '')
    .replace(/【欠勤】.*/g, '')
    .replace(/【早退】.*/g, '')
    .replace(/【午前休】.*/g, '')
    .replace(/【午後休】.*/g, '')
    .replace(/【有給】.*/g, '')
    .replace(/休日出勤/g, '')
    .replace(/管理者修正/g, '')
    .trim();

  if (cleanMemo) memoParts.push(cleanMemo);

  const labelMap = { late: '遅刻', absence: '欠勤', early: '早退', 'paid-am': '午前休', 'paid-pm': '午後休', 'paid-full': '有給' };
  ['late', 'absence', 'early', 'paid-am', 'paid-pm', 'paid-full'].forEach(type => {
    const cb = document.getElementById(`edit-check-${type}`);
    if (cb && cb.checked) {
      const sh = document.getElementById(`edit-${type}-start-h`)?.value || '--';
      const sm = document.getElementById(`edit-${type}-start-m`)?.value || '--';
      const eh = document.getElementById(`edit-${type}-end-h`)?.value || '--';
      const em = document.getElementById(`edit-${type}-end-m`)?.value || '--';
      if (sh !== '--' && sm !== '--' && eh !== '--' && em !== '--') {
        memoParts.push(`【${labelMap[type]}】${sh}:${sm}〜${eh}:${em}`);
      } else {
        memoParts.push(`【${labelMap[type]}】`);
      }
    }
  });

  const finalMemo = memoParts.join('\n').replace(/\n{2,}/g, '\n');

  const payload = {
    id: currentRecordId,
    employee_id: emp.id,
    work_date: dateVal,
    clock_in: clockIn,
    clock_out: clockOut,
    memo: finalMemo,
    shop_id: currentSelectedShopId // ここを追加
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
    await renderMatrixTable();

  } catch (error) {
    console.error('打刻更新エラー:', error);
    alert('更新に失敗しました。サーバーの状態を確認してください。');
  }
}

async function submitRecordDelete() {
  if (!currentRecordId) {
    alert('削除対象のデータIDが見つかりません。');
    return;
  }

  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/record/${currentRecordId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('削除リクエストに失敗しました');

    showToast('実績を削除しました');
    closeRecordModal('modal-record-edit');
    await renderMatrixTable();
  } catch (error) {
    console.error('削除エラー:', error);
    alert('削除処理に失敗しました。サーバーの状態を確認してください。');
  }
}

async function submitRecordMemo() {
  const normalizedCurrentName = currentEmpName ? currentEmpName.replace(/\s+/g, '') : '';
  const emp = currentEmployeeList.find(e => e.name && e.name.replace(/\s+/g, '') === normalizedCurrentName);
  if (!emp) return alert('従業員データが見つかりません。画面を再読み込みして再度お試しください。');

  const dateVal = document.getElementById('memo-date').textContent.replace(/\//g, '-');
  const memoText = document.getElementById('modal-employee-memo').querySelector('textarea').value.trim();

  let targetRecordId = currentRecordId;
  let clockIn = null, clockOut = null;
  let rawMemo = '';

  if (currentCellElement) {
    rawMemo = currentCellElement.dataset.rawMemo || '';
    if (currentCellElement.dataset && (currentCellElement.dataset.clockIn !== undefined || currentCellElement.dataset.clockOut !== undefined)) {
      if (currentCellElement.dataset.clockIn) clockIn = currentCellElement.dataset.clockIn.length === 5 ? `${currentCellElement.dataset.clockIn}:00` : currentCellElement.dataset.clockIn;
      if (currentCellElement.dataset.clockOut) clockOut = currentCellElement.dataset.clockOut.length === 5 ? `${currentCellElement.dataset.clockOut}:00` : currentCellElement.dataset.clockOut;
    } else {
      const recordDiv = currentCellElement.querySelector('div[onclick*="openEditMenu"]');
      if (recordDiv) {
        const onclickAttr = recordDiv.getAttribute('onclick');
        if (onclickAttr) {
          const matches = onclickAttr.match(/openEditMenu\([^,]+,\s*[^,]+,\s*[^,]+,\s*(\d+),\s*'([^']*)',\s*'([^']*)'/);
          if (matches) {
            targetRecordId = matches[1];
            if (matches[2]) clockIn = matches[2].length === 5 ? `${matches[2]}:00` : matches[2];
            if (matches[3]) clockOut = matches[3].length === 5 ? `${matches[3]}:00` : matches[3];
          }
        }
      }
    }
  }

  let inLoc = '', outLoc = '';
  const inMatch = rawMemo.match(/\[IN_LOC:([^\]]+)\]/);
  if (inMatch) inLoc = inMatch[1];
  const outMatch = rawMemo.match(/\[OUT_LOC:([^\]]+)\]/);
  if (outMatch) outLoc = outMatch[1];

  let memoParts = [];
  // 過去に時間を編集した（管理者修正が付いている）場合のみタグを維持し、新規でメモだけ追加した場合は付与しない
  if (rawMemo.includes('管理者修正')) {
    memoParts.push('管理者修正');
  }
  
  if (inLoc) memoParts.push(`[IN_LOC:${inLoc}]`);
  if (outLoc) memoParts.push(`[OUT_LOC:${outLoc}]`);
  if (memoText) memoParts.push(memoText);

  const payload = {
    id: targetRecordId || null,
    employee_id: emp.id,
    work_date: dateVal,
    clock_in: clockIn,
    clock_out: clockOut,
    memo: memoParts.join('\n').trim(),
    shop_id: currentSelectedShopId // ★追加：現在選択中の店舗IDを紐付けて保存する
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

        inputs[0].value = emp.name || '';
        inputs[1].value = emp.kana || '';
        
        const genderRadios = form.querySelectorAll('input[name="new_gender"]');
        genderRadios.forEach(r => r.checked = (r.value === (emp.gender || '未選択')));

        inputs[2].value = emp.email || '';

        if (selects.length > 0) {
          selects[0].value = emp.office || 'NEXT';
        }

        const roleRadios = form.querySelectorAll('input[name="new_role"]');
        roleRadios.forEach(r => r.checked = (r.value === (emp.role || '一般')));

        const attRadios = form.querySelectorAll('input[name="new_attendance_display"]');
        attRadios.forEach(r => r.checked = (emp.show_attendance ? r.value === 'あり' : r.value === 'なし'));

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

async function executeEmpAction() {
  try {
    if (currentEmpAction === 'toggle') {
      const statusBadge = document.getElementById(`emp-status-${currentEmpTargetId}`);
      const isCurrentlyStopped = statusBadge && !statusBadge.classList.contains('hidden');
      const newStatus = isCurrentlyStopped ? '利用中' : '利用停止';

      const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees/${currentEmpTargetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('ステータス更新に失敗しました');

      showToast(`従業員『${currentEmpTargetName}』のステータスを更新しました。`);
      
    } else if (currentEmpAction === 'delete') {
      const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees/${currentEmpTargetId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('削除に失敗しました');

      showToast(`従業員『${currentEmpTargetName}』を削除しました。`);
    }

    await renderEmployees();

  } catch (error) {
    console.error('操作エラー:', error);
    alert('操作に失敗しました。サーバーが起動しているか確認してください。');
  } finally {
    closeEmpActionModal();
  }
}

function showEmployeeDetail(identifier) {
  let emp;
  if (typeof identifier === 'number' || !isNaN(Number(identifier))) {
    emp = currentEmployeeList.find(e => Number(e.id) === Number(identifier));
  } else {
    emp = currentEmployeeList.find(e => e.name === identifier);
  }
  
  if (!emp) return;
  currentEmpTargetId = emp.id;

  document.getElementById('detail-emp-name').textContent = emp.name;
  document.getElementById('val-name').textContent = emp.name;
  document.getElementById('val-kana').textContent = emp.kana;
  document.getElementById('val-gender').textContent = emp.gender;
  document.getElementById('detail-email').textContent = emp.email || '-';
  document.getElementById('val-department').textContent = emp.office;
  
  const shopNameEl = document.getElementById('val-shop-name');
  if (shopNameEl) shopNameEl.textContent = SHOP_LIST[emp.shop_id || 'shop_01'] || 'TH国分寺';

  document.getElementById('val-role').textContent = emp.role;
  document.getElementById('val-attendance').textContent = emp.show_attendance ? 'あり' : 'なし';
  document.getElementById('val-join-date').textContent = emp.joinDate;
  document.getElementById('val-retire-date').textContent = emp.retireDate;
  location.hash = `#/employee-detail?id=${emp.id}`;
}

// 店舗に応じて所属プルダウンの選択肢を切り替える関数
function updateDepartmentOptions(shopSelectId, deptSelectId, currentVal = '') {
  const shopSelect = document.getElementById(shopSelectId);
  const deptSelect = document.getElementById(deptSelectId);
  if (!shopSelect || !deptSelect) return;

  const selectedShopId = shopSelect.value;
  const selectedShopName = (SHOP_LIST[selectedShopId] || '').trim();
  
  // 店舗名が「NEXT」かどうかで判定（shop_01などのID固定判定を解除）
  const isNext = (selectedShopName === 'NEXT');

  let deptList = [];
  if (isNext) {
    // NEXTの順番: 社長、次長、LP、PRコンシェルジュ、ホーム課、システム課、事務
    deptList = ['社長', '次長', 'LP', 'PRコンシェルジュ', 'ホーム課', 'システム課', '事務'];
  } else {
    // NEXT以外: 社長、店長、次長、課長、社員、受付
    deptList = ['社長', '店長', '次長', '課長', '社員', '受付'];
  }

  let html = '';
  deptList.forEach(dept => {
    const selected = (dept === currentVal) ? 'selected' : '';
    html += `<option value="${dept}" ${selected}>${dept}</option>`;
  });
  deptSelect.innerHTML = html;
}

// ログインユーザー情報の取得補助関数
function getLoggedInUserInfo() {
  try {
    const userStr = localStorage.getItem('loggedInUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

function openEditEmployee() {
  const emp = currentEmployeeList.find(e => Number(e.id) === Number(currentEmpTargetId));
  if (!emp) return;
  document.getElementById('edit-emp-name').textContent = emp.name;
  document.getElementById('edit-name').value = emp.name || '';
  document.getElementById('edit-kana').value = emp.kana || '';
  
  const emailEl = document.getElementById('edit-email');
  if (emailEl) {
    emailEl.value = emp.email || '';
  }

  const genderRadios = document.querySelectorAll('input[name="gender"]');
  genderRadios.forEach(r => r.checked = (r.value === (emp.gender || '未選択')));

  const user = getLoggedInUserInfo();
  const shopSelect = document.getElementById('edit-shop-id');
  if (shopSelect) {
    shopSelect.value = emp.shop_id || 'shop_01';
    // 勤怠管理者の場合は店舗変更不可（システム管理者のみ変更可）
    if (user && user.role !== 'システム管理者') {
      shopSelect.disabled = true;
      shopSelect.style.backgroundColor = '#eef2f7';
      shopSelect.style.cursor = 'not-allowed';
    } else {
      shopSelect.disabled = false;
      shopSelect.style.backgroundColor = '';
      shopSelect.style.cursor = '';
    }
  }

  // 店舗に合わせて所属プルダウンを正確にセット
  updateDepartmentOptions('edit-shop-id', 'edit-dept-id', emp.office);

  const roleRadios = document.querySelectorAll('input[name="role"]');
  roleRadios.forEach(r => r.checked = (r.value === (emp.role || '一般')));

  const attRadios = document.querySelectorAll('input[name="attendance_display"]');
  attRadios.forEach(r => r.checked = (emp.show_attendance ? r.value === 'あり' : r.value === 'なし'));
  document.getElementById('edit-join-date').value = (emp.joinDate && emp.joinDate !== '-') ? emp.joinDate.replace(/\//g, '-') : '';
  document.getElementById('edit-retire-date').value = (emp.retireDate && emp.retireDate !== '-') ? emp.retireDate.replace(/\//g, '-') : '';

  location.hash = `#/employee-edit?id=${emp.id}`;
}

function closeEditEmployee() {
  location.hash = '#/employee-detail';
}

async function saveEmployeeEdit(event) {
  event.preventDefault();

  const nameVal = document.getElementById('edit-name').value.trim();
  const kanaVal = document.getElementById('edit-kana').value.trim();
  if (!nameVal || !kanaVal) {
    alert('名前とフリガナは必須項目です。空のまま保存することはできません。');
    return;
  }

  const currentEmp = currentEmployeeList.find(e => e.id == currentEmpTargetId);

  const btn = event.target.querySelector('.btn-save');
  btn.textContent = '保存中...';
  btn.disabled = true;
  const form = event.target;
  const genderEl = form.querySelector('input[name="gender"]:checked');
  const roleEl = form.querySelector('input[name="role"]:checked');
  const attEl = form.querySelector('input[name="attendance_display"]:checked');

  const emailInput = document.getElementById('edit-email');
  const shopSelect = document.getElementById('edit-shop-id');
  const deptSelect = document.getElementById('edit-dept-id');

  const payload = {
    name: nameVal,
    kana: kanaVal,
    gender: genderEl ? genderEl.value : (currentEmp ? currentEmp.gender : '未選択'),
    email: emailInput ? emailInput.value.trim() : (currentEmp ? currentEmp.email : ''),
    department: deptSelect ? deptSelect.value : (currentEmp ? currentEmp.office : '社長'),
    role: roleEl ? roleEl.value : (currentEmp ? currentEmp.role : '一般'),
    show_attendance: attEl ? (attEl.value === 'あり' ? 1 : 0) : 1,
    join_date: document.getElementById('edit-join-date').value ? document.getElementById('edit-join-date').value.replace(/\//g, '-') : null,
    retire_date: document.getElementById('edit-retire-date').value ? document.getElementById('edit-retire-date').value.replace(/\//g, '-') : null,
    shop_id: shopSelect ? shopSelect.value : (currentEmp ? currentEmp.shop_id : 'shop_01')
  };

  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees/${currentEmpTargetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('更新に失敗しました');

    showToast('従業員情報を保存しました。');
    
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
  const form = document.getElementById('employee-create-form');
  if (form) form.reset();

  const user = getLoggedInUserInfo();
  const shopSelect = document.getElementById('new-shop-id');
  if (shopSelect) {
    // 勤怠管理者の場合は自身の所属店舗に固定して選択不可にする
    if (user && user.role !== 'システム管理者') {
      shopSelect.value = user.shop_id || currentSelectedShopId;
      shopSelect.disabled = true;
      shopSelect.style.backgroundColor = '#eef2f7';
      shopSelect.style.cursor = 'not-allowed';
    } else {
      shopSelect.value = currentSelectedShopId;
      shopSelect.disabled = false;
      shopSelect.style.backgroundColor = '';
      shopSelect.style.cursor = '';
    }
  }

  updateDepartmentOptions('new-shop-id', 'new-dept-id');
  location.hash = '#/employee-create';
}

function initCreateEmployeeView() {
  const user = getLoggedInUserInfo();
  const shopSelect = document.getElementById('new-shop-id');
  if (shopSelect) {
    if (user && user.role !== 'システム管理者') {
      shopSelect.value = user.shop_id || currentSelectedShopId;
      shopSelect.disabled = true;
      shopSelect.style.backgroundColor = '#eef2f7';
      shopSelect.style.cursor = 'not-allowed';
    } else {
      if (!shopSelect.value || shopSelect.value === '') {
        shopSelect.value = currentSelectedShopId;
      }
      shopSelect.disabled = false;
      shopSelect.style.backgroundColor = '';
      shopSelect.style.cursor = '';
    }
  }
  const currentDeptVal = document.getElementById('new-dept-id')?.value || '';
  updateDepartmentOptions('new-shop-id', 'new-dept-id', currentDeptVal);
}

function closeCreateEmployee() {
  location.hash = '#/employees';
}

async function saveNewEmployee(event) {
  event.preventDefault();
  const btn = event.target.querySelector('.btn-save');
  btn.textContent = '保存中...';
  btn.disabled = true;
  const form = event.target;
  const inputs = form.querySelectorAll('.form-input');
  const shopSelect = document.getElementById('new-shop-id');
  const deptSelect = document.getElementById('new-dept-id');

  const payload = {
    name: inputs[0].value,
    kana: inputs[1].value,
    gender: form.querySelector('input[name="new_gender"]:checked').value,
    email: inputs[2].value,
    department: deptSelect ? deptSelect.value : '社長',
    role: form.querySelector('input[name="new_role"]:checked').value,
    show_attendance: form.querySelector('input[name="new_attendance_display"]:checked').value === 'あり' ? 1 : 0,
    join_date: inputs[3].value ? inputs[3].value.replace(/\//g, '-') : null,
    retire_date: inputs[4].value ? inputs[4].value.replace(/\//g, '-') : null,
    shop_id: shopSelect ? shopSelect.value : 'shop_01'
  };

  try {
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
    form.reset();

    await renderEmployees();
    
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
  
  const dateStr = `${year}年${month}月${day}日(${dayOfWeek})`;
  const dateEl = document.getElementById('current-date-str');
  if (dateEl) dateEl.textContent = dateStr;

  const todayKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const empList = currentEmployeeList.length > 0 ? currentEmployeeList : await fetchEmployeesAPI('ALL', '');

  let attendancesData = [];
  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${year}&month=${month}&shop_id=${currentSelectedShopId}`, { cache: 'no-store' });
    if (response.ok) attendancesData = await response.json();
  } catch (error) {
    console.error('ダッシュボード用データ取得エラー:', error);
  }

  const todayAttendanceMap = {};
  attendancesData.filter(a => a.work_date === todayKey).forEach(a => {
    todayAttendanceMap[a.employee_id] = a;
  });

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

let currentMatrixDate = new Date();

async function renderMatrixTable() {
  const year = currentMatrixDate.getFullYear();
  const month = currentMatrixDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  document.getElementById('matrix-month-title').textContent = `${year}年 ${String(month).padStart(2, '0')}月度`;

  const daysStr = ['日', '月', '火', '水', '木', '金', '土'];
  let theadHtml = `
    <tr>
      <th rowspan="2" class="col-emp-name">従業員名</th>
      <th colspan="${daysInMonth}" style="font-size: 15px; letter-spacing: 2px; background: #f4f7f9;">${month}月</th>
      <th rowspan="2" class="col-sum" style="min-width: 85px; width: 85px;">計</th>
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

  let attendancesData = [];
  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${year}&month=${month}&shop_id=${currentSelectedShopId}`, { cache: 'no-store' });
    if (response.ok) {
      attendancesData = await response.json();
    }
  } catch (error) {
    console.error('マトリクスデータ取得エラー:', error);
  }

  const attendanceMap = {};
  const summaryMap = {};

  attendancesData.forEach(att => {
    const dateStr = att.work_date;
    
    if (!summaryMap[att.employee_id]) {
      // countedDates という配列を追加して、カウント済みの日付を記録するようにします
      summaryMap[att.employee_id] = { days: 0, workMins: 0, countedDates: [] };
    }

    if (att.clock_in && att.clock_out) {
      // 同じ日付がまだカウントされていなければ日数を＋1し、記録配列に追加する
      if (!summaryMap[att.employee_id].countedDates.includes(dateStr)) {
        summaryMap[att.employee_id].days++;
        summaryMap[att.employee_id].countedDates.push(dateStr);
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
      summaryMap[att.employee_id].workMins += workMinutes;
    }
    
    if (!attendanceMap[att.employee_id]) attendanceMap[att.employee_id] = {};
    if (!attendanceMap[att.employee_id][dateStr]) attendanceMap[att.employee_id][dateStr] = [];
    
    attendanceMap[att.employee_id][dateStr].push(att);
  });

  let tbodyHtml = '';
  const empList = currentEmployeeList.length > 0 ? currentEmployeeList : await fetchEmployeesAPI('ALL', '');

  empList.forEach(emp => {
    tbodyHtml += `<tr><td class="col-emp-name">${emp.name}</td>`;
    
    let retireDateObj = null;
    if (emp.retireDate && emp.retireDate !== '-') {
      const cleanDate = emp.retireDate.replace(/[年月]/g, '/').replace(/日/g, '').replace(/-/g, '/');
      retireDateObj = new Date(cleanDate);
      if (!isNaN(retireDateObj)) {
        retireDateObj.setHours(0, 0, 0, 0);
      } else {
        retireDateObj = null;
      }
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const currentDateObj = new Date(year, month - 1, i);
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      const isAfterRetire = retireDateObj && (currentDateObj > retireDateObj);
      const hasRetireDate = retireDateObj !== null; // ★ 退職日が設定されているか
      
      let tdClass = isAfterRetire ? 'cell-readonly cell-retired' : (hasRetireDate ? 'cell-readonly' : 'cell-click');
      
      let cellData = '';
      if (attendanceMap[emp.id] && attendanceMap[emp.id][dateKey]) {
        // メモだけ（出退勤時刻なし）のデータも表示対象に含める
        const validRecords = attendanceMap[emp.id][dateKey].filter(att => att.clock_in || att.clock_out || att.memo);

        validRecords.sort((a, b) => {
          if (!a.clock_in && !b.clock_in) return 0;
          if (!a.clock_in) return 1;
          if (!b.clock_in) return -1;
          return a.clock_in.localeCompare(b.clock_in);
        });

        cellData = validRecords.map((att, idx) => {
          // clock_inもclock_outもない（全休など）場合は、空のままにするか「--:--」を入れるか
          // ここでは時刻がない場合は空文字にし、メモアイコンだけが表示されるようにします
          let inText = att.clock_in ? att.clock_in.substring(0, 5) : '';
          let outText = att.clock_out ? att.clock_out.substring(0, 5) : '';
          
          let timeText = '';
          if (inText || outText) {
             timeText = `${inText}<br>${outText}`;
          } else {
             // clock_inがない場合でも、メモから遅刻・欠勤・有給・午前休・午後休の時間を抽出して表示する
             let extMatch = att.memo ? att.memo.match(/【(?:遅刻|欠勤|有給|早退|午前休|午後休)】(\d{2}:\d{2})〜(\d{2}:\d{2})/) : null;
             if (extMatch) {
                 timeText = `${extMatch[1]}<br>${extMatch[2]}`;
             } else {
                 // ★ 透明なダミー文字を入れて、高さを潰さずに見えなくする
                 timeText = `<span style="visibility: hidden;">-<br>-</span>`; 
             }
          }

          let memoHtml = '';
          if (att.memo) {
            // 透明文字が入っている場合も除外して編集済スタイルを適用
            if (att.memo.includes('管理者修正') && !timeText.includes('visibility: hidden')) {
               timeText = `<span class="time-edited">${timeText}</span>`;
            }

            const hasDirectIn = att.memo.includes('直行');
            const hasDirectOut = att.memo.includes('直帰');
            let directTags = [];
            if (hasDirectIn) directTags.push('直行');
            if (hasDirectOut) directTags.push('直帰');

            let cleanMemo = att.memo
              .replace(/\[(?:IN\vert{}OUT)_LOC:[^\]]*\]/gi, '')
              .replace(/\[.*?\]/g, '')
              .replace(/管理者修正/g, ''); // 休日出勤を消さずに残す

            if (cleanMemo.includes('直行') && cleanMemo.includes('直帰')) {
                const parts = cleanMemo.split('直帰');
                cleanMemo = parts[0].split('直行')[0];
            } else if (cleanMemo.includes('直行')) {
                cleanMemo = cleanMemo.split('直行')[0];
            } else if (cleanMemo.includes('直帰')) {
                cleanMemo = cleanMemo.split('直帰')[0];
            }

            let otherMemo = cleanMemo.trim();

            let tooltipParts = [];
            if (directTags.length > 0) {
              tooltipParts.push(directTags.join('・'));
            }
            if (otherMemo) {
              tooltipParts.push(otherMemo);
            }

            const pureMemo = tooltipParts.join('\n').trim();
            if (pureMemo) {
              memoHtml = `<span class="memo-icon" data-tooltip="${pureMemo}">💬</span>`;
            }
          }
          const safeMemo = (att.memo || '').replace(/\n/g, '\\n').replace(/'/g, "\\'");
          const borderStyle = idx !== validRecords.length - 1 ? 'border-bottom: 1px dashed #e0e6ed;' : '';
          
          // ★ 退職日が設定されている従業員は過去も含めて全セル編集不可にする
          const blockOnClick = hasRetireDate 
            ? '' 
            : `onclick="openEditMenu(event, '${emp.name}', '${month}/${i}', ${att.id}, '${att.clock_in || ''}', '${att.clock_out || ''}', '${safeMemo}')"`;

          return `<div style="padding:4px 0; position:relative; ${borderStyle}" ${blockOnClick}>${timeText}${memoHtml}</div>`;
        }).join('');
      }

      if (isAfterRetire && cellData) {
        cellData = `<div class="retired-time-box">${cellData}</div>`;
      }
      
      if (hasRetireDate) {
        // ★ 退職日が設定されている場合、セル全体の新規作成アクションも無効化
        const bgStyle = isAfterRetire ? 'background-color: #f4f7f9; cursor: not-allowed;' : 'cursor: default;';
        tbodyHtml += `<td class="${tdClass}" style="${bgStyle}">${cellData}</td>`;
      } else {
        tbodyHtml += `<td class="${tdClass}" onclick="openCellMenu(event, '${emp.name}', '${month}/${i}')">${cellData}</td>`;
      }
    }
    
    const summary = summaryMap[emp.id];
    if (summary && summary.days > 0) {
      const totalHours = (Math.ceil(summary.workMins / 6) / 10).toFixed(1);
      tbodyHtml += `<td class="col-sum" style="font-size: 11px; line-height: 1.6; padding: 4px 8px; white-space: nowrap; text-align: center;">${totalHours}時間<br>${summary.days}日</td></tr>`;
    } else {
      tbodyHtml += `<td class="col-sum" style="white-space: nowrap; padding: 4px 8px; text-align: center;">-</td></tr>`;
    }
  });

  document.getElementById('matrix-tbody').innerHTML = tbodyHtml;
  setupMatrixDragScroll();
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

// --- 日表示 ---
let currentDailyDate = new Date();

function changeDailyDate(offset) {
  if (offset === 0) {
    currentDailyDate = new Date();
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

  const empList = currentEmployeeList.length > 0 ? currentEmployeeList : await fetchEmployeesAPI('ALL', '');

  let attendancesData = [];
  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${year}&month=${month}&shop_id=${currentSelectedShopId}`, { cache: 'no-store' });
    if (response.ok) attendancesData = await response.json();
  } catch (error) {
    console.error('日表示データ取得エラー:', error);
  }

  // 当日の打刻データを配列として取得する（1日に複数回の打刻に対応）
  const todayAttendanceMap = {};
  attendancesData.filter(a => a.work_date === dateKey).forEach(a => {
    if (!todayAttendanceMap[a.employee_id]) todayAttendanceMap[a.employee_id] = [];
    todayAttendanceMap[a.employee_id].push(a);
  });

  const tbody = document.getElementById('daily-tbody');
  
  if (empList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #7f8c8d;">従業員データがありません</td></tr>';
    return;
  }

  const rowHtmlList = await Promise.all(empList.map(async emp => {
    const atts = todayAttendanceMap[emp.id] || [];
    
    if (atts.length === 0) {
      return `
        <tr>
          <td class="emp-name-cell">
            <span class="dot-status" style="background-color: #ccc;"></span>
            <a href="javascript:void(0)" class="emp-link" onclick="showEmployeeDetail('${emp.name}')">${emp.name}</a>
          </td>
          <td>-</td>
          <td>-</td>
        </tr>
      `;
    }

    // 時間順にソート
    atts.sort((a, b) => {
      if (!a.clock_in && !b.clock_in) return 0;
      if (!a.clock_in) return 1;
      if (!b.clock_in) return -1;
      return a.clock_in.localeCompare(b.clock_in);
    });

    // 最新の打刻状態からステータスドットを判定
    const latestAtt = atts[atts.length - 1];
    let statusDotClass = 'dot-finished';
    if (latestAtt && latestAtt.clock_in && !latestAtt.clock_out) {
      statusDotClass = 'dot-working';
    }

    let timeAndMemoList = [];
    let mapBoxList = [];

    for (let idx = 0; idx < atts.length; idx++) {
      const att = atts[idx];
      const formatTime = (t) => t ? t.substring(0, 5) : '';

      // ★ 透明なダミー文字を入れて、高さを潰さずに見えなくする
      let timeStr = '<span style="visibility: hidden;">-</span>'; 
      if (att && att.clock_in) {
        if (att.clock_out) {
          timeStr = `${formatTime(att.clock_in)} ～ ${formatTime(att.clock_out)}`;
        } else {
          timeStr = `${formatTime(att.clock_in)} ～`;
        }
      } else if (att && att.memo) {
        let extMatch = att.memo.match(/【(?:遅刻|欠勤|有給|早退|午前休|午後休)】(\d{2}:\d{2})〜(\d{2}:\d{2})/);
        if (extMatch) {
          timeStr = `${extMatch[1]} ～ ${extMatch[2]}`;
        }
      }

      let memoHtml = '';
      if (att && att.memo) {
        // 透明文字が入っている場合も除外して編集済スタイルを適用
        if (att.memo.includes('管理者修正') && !timeStr.includes('visibility: hidden')) {
          timeStr = `<span class="time-edited">${timeStr}</span>`;
        }

        const hasDirectIn = att.memo.includes('直行');
        const hasDirectOut = att.memo.includes('直帰');
        let directTags = [];
        if (hasDirectIn) directTags.push('直行');
        if (hasDirectOut) directTags.push('直帰');

        let cleanMemo = att.memo
          .replace(/\[(?:IN\vert{}OUT)_LOC:[^\]]*\]/gi, '')
          .replace(/\[.*?\]/g, '')
          .replace(/管理者修正/g, '');

        if (cleanMemo.includes('直行') && cleanMemo.includes('直帰')) {
          const parts = cleanMemo.split('直帰');
          cleanMemo = parts[0].split('直行')[0];
        } else if (cleanMemo.includes('直行')) {
          cleanMemo = cleanMemo.split('直行')[0];
        } else if (cleanMemo.includes('直帰')) {
          cleanMemo = cleanMemo.split('直帰')[0];
        }

        let otherMemo = cleanMemo.trim();
        let tooltipParts = [];
        if (directTags.length > 0) tooltipParts.push(directTags.join('・'));
        if (otherMemo) tooltipParts.push(otherMemo);

        const pureMemo = tooltipParts.join('\n').trim();
        if (pureMemo) {
          memoHtml = `<span class="memo-icon" data-tooltip="${pureMemo}">💬</span>`;
        }
      }

      const isDirectIn = att && att.memo && att.memo.includes('直行');
      const isDirectOut = att && att.memo && att.memo.includes('直帰');

      let inCoords = '';
      let outCoords = '';
      if (att && att.memo) {
        const inMatch = att.memo.match(/\[IN_LOC:([^\]]+)\]/);
        if (inMatch) inCoords = inMatch[1];
        const outMatch = att.memo.match(/\[OUT_LOC:([^\]]+)\]/);
        if (outMatch) outCoords = outMatch[1];
      }

      const inAddress = inCoords ? await reverseGeocode(inCoords) : '位置情報未取得';
      const outAddress = outCoords ? await reverseGeocode(outCoords) : '位置情報未取得';
      const rawMemoForModal = att && att.memo ? att.memo.replace(/\[(?:IN\vert{}OUT)_LOC:[^\]]*\]/gi, '').trim() : '';

      const emptySpacer = '<div style="width: 46px; height: 46px; flex-shrink: 0;"></div>';
      const centerSpacer = '<div style="flex-grow: 1;"></div>';
      let slots = [emptySpacer, emptySpacer, centerSpacer, emptySpacer, emptySpacer];

      if (att && att.clock_in) {
        const inLabel = isDirectIn ? '直行出勤' : '出勤';
        const inBadgeText = isDirectIn ? '📍直行' : '📍地図';
        const inClass = isDirectIn ? 'direct-style' : '';
        const inBadgeClass = isDirectIn ? 'direct-badge' : '';
        const inFullTime = `${month}/${date} ${formatTime(att.clock_in)}`;
        const targetInLoc = inCoords || '位置情報未取得';

        const html = `
          <div class="avatar-map-box">
            <div class="avatar-circle ${inClass} has-tooltip" data-tooltip="${inLabel}\n${inFullTime}\n住所:${inAddress}">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <button class="btn-map-badge ${inBadgeClass}" onclick="openMapModal('${emp.name}', '${inLabel}', '${targetInLoc}', '${rawMemoForModal.replace(/\n/g, '\\n')}')">${inBadgeText}</button>
          </div>
        `;
        if (isDirectIn) slots[1] = html;
        else slots[0] = html;
      }

      if (att && att.clock_out) {
        const outLabel = isDirectOut ? '直帰退勤' : '退勤';
        const outBadgeText = isDirectOut ? '📍直帰' : '📍地図';
        const outClass = isDirectOut ? 'direct-style' : '';
        const outBadgeClass = isDirectOut ? 'direct-badge' : '';
        const outFullTime = `${month}/${date} ${formatTime(att.clock_out)}`;
        const targetOutLoc = outCoords || '位置情報未取得';

        const html = `
          <div class="avatar-map-box">
            <div class="avatar-circle ${outClass} has-tooltip" data-tooltip="${outLabel}\n${outFullTime}\n住所:${outAddress}">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <button class="btn-map-badge ${outBadgeClass}" onclick="openMapModal('${emp.name}', '${outLabel}', '${targetOutLoc}', '${rawMemoForModal.replace(/\n/g, '\\n')}')">${outBadgeText}</button>
          </div>
        `;
        if (isDirectOut) slots[3] = html;
        else slots[4] = html;
      }

      const borderStyle = idx !== atts.length - 1 ? 'border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; margin-bottom: 6px;' : '';

      timeAndMemoList.push(`<div style="${borderStyle}">${timeStr} ${memoHtml}</div>`);

      const mapBoxHtml = (att && (att.clock_in || att.clock_out)) 
        ? `<div class="avatar-slot-group" style="display: flex; width: 100%; ${borderStyle}">${slots.join('')}</div>` 
        : '<span style="color: #ccc; font-size: 13px;">-</span>';
      
      mapBoxList.push(mapBoxHtml);
    }

    return `
      <tr>
        <td class="emp-name-cell">
          <span class="dot-status ${statusDotClass}"></span>
          <a href="javascript:void(0)" class="emp-link" onclick="showEmployeeDetail('${emp.name}')">${emp.name}</a>
        </td>
        <td>${timeAndMemoList.join('')}</td>
        <td>${mapBoxList.join('')}</td>
      </tr>
    `;
  }));

  tbody.innerHTML = rowHtmlList.join('');
}

// --- 遅刻・欠勤・有給一覧ページの動的描画 ---
async function renderExtraCategoryTable(pagePath, tagKeyword) {
  const tbodyId = pagePath === 'late' ? 'late-tbody' : (pagePath === 'absence' ? 'absence-tbody' : 'paid-leave-tbody');
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">データ取得中...</td></tr>';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${year}&month=${month}&shop_id=${currentSelectedShopId}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('データ取得失敗');
    const data = await response.json();

    const filtered = data.filter(att => att.memo && att.memo.includes(tagKeyword));

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #888;">当月の${tagKeyword.replace(/[【】]/g, '')}記録はありません</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(att => {
      const match = att.memo.match(new RegExp(`${tagKeyword}(.*)`));
      const detailStr = match ? match[1].trim() : tagKeyword.replace(/[【】]/g, '');
      return `
        <tr>
          <td>${att.work_date}</td>
          <td style="font-weight: bold;">${att.employee_name || '従業員'}</td>
          <td>${detailStr || tagKeyword.replace(/[【】]/g, '')}</td>
        </tr>
      `;
    }).join('');

  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">取得エラーが発生しました</td></tr>';
  }
}

// --- 残業時間集計表 ---
let currentOvertimeDate = new Date();
let overtimeSortKey = 'overtimeHours';
let overtimeSortAsc = false;

async function fetchOvertimeData(year, month, selectedDept) {
  const empList = currentEmployeeList.length > 0 ? currentEmployeeList : await fetchEmployeesAPI('ALL', '');
  
  let attendancesData = [];
  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${year}&month=${month}&shop_id=${currentSelectedShopId}`, { cache: 'no-store' });
    if (response.ok) attendancesData = await response.json();
  } catch (error) {
    console.error('残業集計用データ取得エラー:', error);
  }

  let filteredEmps = empList;
  if (selectedDept !== 'ALL') {
    filteredEmps = empList.filter(emp => emp.office === selectedDept);
  }

  return filteredEmps.map(emp => {
    const myAttendances = attendancesData.filter(a => a.employee_id === emp.id);
    let weekdayDays = 0, weekendDays = 0;
    let totalWorkMins = 0, totalOvertimeMins = 0;
    let paidDays = 0, absenceMins = 0, lateMins = 0, earlyMins = 0;

    // 同一日の重複出勤カウントを防止する記録配列
    let countedWeekdayDates = [];
    let countedWeekendDates = [];

    myAttendances.forEach(att => {
      // 基準の勤務時間（9:00 〜 18:00 = 540分 〜 1080分）
      const BASE_START = 540;
      const BASE_END = 1080;

      if (att.memo) {
        if (att.memo.includes('【有給】')) paidDays += 1.0;
        if (att.memo.includes('【午前休】')) paidDays += 0.5;
        if (att.memo.includes('【午後休】')) paidDays += 0.5;

        let actualStart = BASE_START;
        let actualEnd = BASE_END;
        let timeFound = false;

        // ①出勤・退勤時間が直接記録されている場合
        if (att.clock_in) {
            const [sh, sm] = att.clock_in.split(':').map(Number);
            actualStart = sh * 60 + sm;
            timeFound = true;
        }
        if (att.clock_out) {
            const [eh, em] = att.clock_out.split(':').map(Number);
            actualEnd = eh * 60 + em;
            if (actualEnd < actualStart && eh < 12) actualEnd += 24 * 60;
            timeFound = true;
        }

        // ②出退勤時間がなく、メモ側に時間が指定されている場合（手入力）
        if (!timeFound) {
            const match = att.memo.match(/【(?:遅刻|欠勤|早退|有給|午前休|午後休)】(\d{2}):(\d{2})〜(\d{2}):(\d{2})/);
            if (match) {
                const sh = parseInt(match[1], 10), sm = parseInt(match[2], 10);
                const eh = parseInt(match[3], 10), em = parseInt(match[4], 10);
                actualStart = sh * 60 + sm;
                actualEnd = eh * 60 + em;
                if (actualEnd < actualStart && eh < 12) actualEnd += 24 * 60;
                timeFound = true;
            }
        }

        if (timeFound) {
            const hasLate = att.memo.includes('【遅刻】');
            const hasAbsence = att.memo.includes('【欠勤】');
            const hasEarly = att.memo.includes('【早退】');

            // 出勤側の遅刻・欠勤の計算（9時以降の出勤）
            if (actualStart > BASE_START) {
                if (hasAbsence && hasLate) {
                    // 欠勤と遅刻が同時の場合（例：14:05出勤なら 14時まで欠勤、14時〜14:05が遅刻）
                    const hourStart = Math.floor(actualStart / 60) * 60;
                    absenceMins += (hourStart - BASE_START);
                    lateMins += (actualStart - hourStart);
                } else if (hasAbsence) {
                    absenceMins += (actualStart - BASE_START);
                } else if (hasLate) {
                    lateMins += (actualStart - BASE_START);
                }
            }

            // 退勤側の早退の計算（18時より前の退勤）
            if (actualEnd < BASE_END) {
                if (hasEarly) {
                    earlyMins += (BASE_END - actualEnd);
                }
            }
        } else if (att.memo.includes('【欠勤】')) {
            // 時間指定がない全休のケース（1日分 = 8時間 = 480分）
            absenceMins += 480; 
        }
      }

      // 以下は既存の実労働時間・残業時間の集計
      if (!att.clock_in || !att.clock_out) return;

      const dateObj = new Date(att.work_date.replace(/-/g, '/'));
      // ★ 土日判定を削除し、休日設定マスタまたは手動メモの「休日出勤」のみを参照する
      const isHolidaySetting = (typeof holidaySettingsMap !== 'undefined' && holidaySettingsMap[att.work_date]);
      const isHoliday = isHolidaySetting || (att.memo && att.memo.includes('休日出勤'));
      
      // 同じ日付でまだカウントしていない場合のみ出勤日数を+1
      if (isHoliday) {
        if (!countedWeekendDates.includes(att.work_date)) {
          weekendDays++;
          countedWeekendDates.push(att.work_date);
        }
      } else {
        if (!countedWeekdayDates.includes(att.work_date)) {
          weekdayDays++;
          countedWeekdayDates.push(att.work_date);
        }
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
        } else if (workMinutes < 480) {
          totalOvertimeMins += (workMinutes - 240);
        } else if (workMinutes === 480) {
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
      totalHours: Math.ceil(totalWorkMins / 6) / 10,
      overtimeHours: Math.ceil(totalOvertimeMins / 6) / 10,
      paidDays,
      absenceMins,
      lateMins,
      earlyMins
    };
  });
}

async function renderOvertimeTable() {
  const typeEl = document.getElementById('overtime-table-type');
  const tableType = typeEl ? typeEl.value : 'overtime';
  const filterEl = document.getElementById('overtime-dept-filter');
  const selectedDept = filterEl ? filterEl.value : 'ALL';
  
  const titleEl = document.getElementById('overtime-page-title');
  if (titleEl) titleEl.textContent = tableType === 'overtime' ? '残業時間集計表' : '勤務時間集計表';
  
  const year = currentOvertimeDate.getFullYear();
  const month = currentOvertimeDate.getMonth() + 1;
  document.getElementById('overtime-month-title').textContent = `${year}年 ${String(month).padStart(2, '0')}月度`;

  const colCount = tableType === 'overtime' ? 5 : 8;
  document.getElementById('overtime-tbody').innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; color: #7f8c8d; padding: 20px;">データ集計中...</td></tr>`;
  
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

  const theadHtml = tableType === 'overtime' ? `
    <tr>
      <th onclick="sortOvertime('name')">スタッフ名 <span class="sort-icon" id="sort-name"></span></th>
      <th onclick="sortOvertime('weekdayDays')">平日出勤日数 <span class="sort-icon" id="sort-weekdayDays"></span></th>
      <th onclick="sortOvertime('weekendDays')">休日出勤日数 <span class="sort-icon" id="sort-weekendDays"></span></th>
      <th onclick="sortOvertime('totalHours')">総実労働時間 <span class="sort-icon" id="sort-totalHours"></span></th>
      <th onclick="sortOvertime('overtimeHours')">総残業時間 <span class="sort-icon" id="sort-overtimeHours"></span></th>
    </tr>
  ` : `
    <tr>
      <th onclick="sortOvertime('name')">スタッフ名 <span class="sort-icon" id="sort-name"></span></th>
      <th onclick="sortOvertime('weekdayDays')">平日出勤日数 <span class="sort-icon" id="sort-weekdayDays"></span></th>
      <th onclick="sortOvertime('weekendDays')">休日出勤日数 <span class="sort-icon" id="sort-weekendDays"></span></th>
      <th onclick="sortOvertime('totalHours')">総実労働時間 <span class="sort-icon" id="sort-totalHours"></span></th>
      <th onclick="sortOvertime('paidDays')">総有給日数 <span class="sort-icon" id="sort-paidDays"></span></th>
      <th onclick="sortOvertime('absenceMins')">総欠勤時間 <span class="sort-icon" id="sort-absenceMins"></span></th>
      <th onclick="sortOvertime('lateMins')">総遅刻時間 <span class="sort-icon" id="sort-lateMins"></span></th>
      <th onclick="sortOvertime('earlyMins')">総早退時間 <span class="sort-icon" id="sort-earlyMins"></span></th>
    </tr>
  `;
  document.getElementById('overtime-thead').innerHTML = theadHtml;

  const sortKeys = ['name', 'weekdayDays', 'weekendDays', 'totalHours', 'overtimeHours', 'paidDays', 'absenceMins', 'lateMins', 'earlyMins'];
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

  document.getElementById('overtime-tbody').innerHTML = sortedData.map(emp => {
    if (tableType === 'overtime') {
      return `
        <tr>
          <td style="text-align:left; font-weight:bold; color:var(--toho-blue);">
            <a href="javascript:void(0)" onclick="showEmployeeDetail('${emp.name}')" style="color:inherit; text-decoration:none;">${emp.name}</a>
          </td>
          <td>${emp.weekdayDays}日</td>
          <td>${emp.weekendDays}日</td>
          <td>${emp.totalHours.toFixed(1)}時間</td>
          <td>${emp.overtimeHours.toFixed(1)}時間</td>
        </tr>
      `;
    } else {
      return `
        <tr>
          <td style="text-align:left; font-weight:bold; color:var(--toho-blue);">
            <a href="javascript:void(0)" onclick="showEmployeeDetail('${emp.name}')" style="color:inherit; text-decoration:none;">${emp.name}</a>
          </td>
          <td>${emp.weekdayDays}日</td>
          <td>${emp.weekendDays}日</td>
          <td>${emp.totalHours.toFixed(1)}時間</td>
          <td>${emp.paidDays.toFixed(1)}日</td>
          <td>${emp.absenceMins}分</td>
          <td>${emp.lateMins}分</td>
          <td>${emp.earlyMins}分</td>
        </tr>
      `;
    }
  }).join('');

  const count = sortedData.length;
  const sumWeekday = sortedData.reduce((sum, emp) => sum + emp.weekdayDays, 0);
  const sumWeekend = sortedData.reduce((sum, emp) => sum + emp.weekendDays, 0);
  const sumTotal = sortedData.reduce((sum, emp) => sum + emp.totalHours, 0);
  const sumOvertime = sortedData.reduce((sum, emp) => sum + emp.overtimeHours, 0);
  const sumPaid = sortedData.reduce((sum, emp) => sum + emp.paidDays, 0);
  const sumAbsence = sortedData.reduce((sum, emp) => sum + emp.absenceMins, 0);
  const sumLate = sortedData.reduce((sum, emp) => sum + emp.lateMins, 0);
  const sumEarly = sortedData.reduce((sum, emp) => sum + emp.earlyMins, 0);

  if (tableType === 'overtime') {
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
        <td>${count > 0 ? (sumWeekday / count).toFixed(1) : 0}日</td>
        <td>${count > 0 ? (sumWeekend / count).toFixed(1) : 0}日</td>
        <td>${count > 0 ? (sumTotal / count).toFixed(1) : 0}時間</td>
        <td>${count > 0 ? (sumOvertime / count).toFixed(1) : 0}時間</td>
      </tr>
    `;
  } else {
    document.getElementById('overtime-tfoot').innerHTML = `
      <tr class="summary-row">
        <td style="text-align:left;">合計 (${count}名)</td>
        <td>${sumWeekday}日</td>
        <td>${sumWeekend}日</td>
        <td>${sumTotal.toFixed(1)}時間</td>
        <td>${sumPaid.toFixed(1)}日</td>
        <td>${sumAbsence}分</td>
        <td>${sumLate}分</td>
        <td>${sumEarly}分</td>
      </tr>
      <tr class="summary-row">
        <td style="text-align:left;">全体平均 (1人あたり)</td>
        <td>${count > 0 ? (sumWeekday / count).toFixed(1) : 0}日</td>
        <td>${count > 0 ? (sumWeekend / count).toFixed(1) : 0}日</td>
        <td>${count > 0 ? (sumTotal / count).toFixed(1) : 0}時間</td>
        <td>${count > 0 ? (sumPaid / count).toFixed(1) : 0}日</td>
        <td>${count > 0 ? Math.round(sumAbsence / count) : 0}分</td>
        <td>${count > 0 ? Math.round(sumLate / count) : 0}分</td>
        <td>${count > 0 ? Math.round(sumEarly / count) : 0}分</td>
      </tr>
    `;
  }
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
let currentInitialFilter = 'ALL';
let currentNameFilter = '';

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

async function fetchEmployeesAPI(initialFilter, nameFilter) {
  let result = [];
  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees?shop_id=${currentSelectedShopId}`);
    let dbData = await response.json();

    if (Array.isArray(dbData)) {
      dbData = dbData.filter(emp => emp.shop_id === currentSelectedShopId);
    }

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
      empType: '正社員',
      office: emp.department || 'NEXT',
      joinDate: emp.join_date ? new Date(emp.join_date).toLocaleDateString('ja-JP') : '-',
      shop_id: emp.shop_id || 'shop_01'
    }));
  } catch (error) {
    console.error('API取得エラー:', error);
    return [];
  }

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

  if (nameFilter) {
    // 検索キーワードの空白除去＆ひらがなをカタカナに変換
    const normalizedFilter = nameFilter
      .replace(/[\s ]/g, '')
      .replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));

    result = result.filter(emp => {
      // 値が null や undefined の場合のエラー（クラッシュ）を防止
      const safeName = emp.name || '';
      const safeKana = emp.kana || '';
      
      const normalizedName = safeName.replace(/[\s ]/g, '');
      // 登録データ側もひらがなをカタカナに変換して比較（表記ゆれ吸収）
      const normalizedKana = safeKana
        .replace(/[\s ]/g, '')
        .replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));
        
      return normalizedName.includes(normalizedFilter) || normalizedKana.includes(normalizedFilter);
    });
  }

  return result;
}

let currentEmployeeList = [];

async function renderEmployees() {
  const container = document.getElementById('emp-list-container');
  container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-sub);">読み込み中...</div>';

  // ★ 1. 月表示や編集用に「全従業員」の最新データを取得してシステム全体に保持する
  currentEmployeeList = await fetchEmployeesAPI('ALL', '');

  // ★ 2. 従業員一覧に表示するための「フィルタリング（絞り込み）適用後」のデータを用意する
  let displayData = currentEmployeeList;
  if (currentInitialFilter !== 'ALL' || currentNameFilter !== '') {
    displayData = await fetchEmployeesAPI(currentInitialFilter, currentNameFilter);
  }

  if (displayData.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-sub);">該当する従業員が見つかりません。</div>';
    return;
  }

  container.innerHTML = displayData.map(emp => {
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
  await loadShopListFromDB();

  const loggedInUserStr = localStorage.getItem('loggedInUser');
  if (loggedInUserStr) {
    try {
      const user = JSON.parse(loggedInUserStr);
      applyUserPermissions(user);
    } catch (e) {}
  }

  const hourSelectIds = [
    'create-start-h', 'create-end-h', 'edit-start-h', 'edit-end-h',
    'create-late-start-h', 'create-late-end-h', 'edit-late-start-h', 'edit-late-end-h',
    'create-absence-start-h', 'create-absence-end-h', 'edit-absence-start-h', 'edit-absence-end-h',
    'create-early-start-h', 'create-early-end-h', 'edit-early-start-h', 'edit-early-end-h',
    'create-paid-am-start-h', 'create-paid-am-end-h', 'edit-paid-am-start-h', 'edit-paid-am-end-h',
    'create-paid-pm-start-h', 'create-paid-pm-end-h', 'edit-paid-pm-start-h', 'edit-paid-pm-end-h',
    'create-paid-full-start-h', 'create-paid-full-end-h', 'edit-paid-full-start-h', 'edit-paid-full-end-h'
  ];
  let hoursHtml = '<option value="--">--</option>';
  for (let h = 0; h < 24; h++) {
    const hrStr = String(h).padStart(2, '0');
    hoursHtml += `<option value="${hrStr}">${hrStr}</option>`;
  }
  hourSelectIds.forEach(id => {
    const selectEl = document.getElementById(id);
    if (selectEl) selectEl.innerHTML = hoursHtml;
  });

  const minuteSelectIds = [
    'create-start-m', 'create-end-m', 'edit-start-m', 'edit-end-m',
    'create-late-start-m', 'create-late-end-m', 'edit-late-start-m', 'edit-late-end-m',
    'create-absence-start-m', 'create-absence-end-m', 'edit-absence-start-m', 'edit-absence-end-m',
    'create-early-start-m', 'create-early-end-m', 'edit-early-start-m', 'edit-early-end-m',
    'create-paid-am-start-m', 'create-paid-am-end-m', 'edit-paid-am-start-m', 'edit-paid-am-end-m',
    'create-paid-pm-start-m', 'create-paid-pm-end-m', 'edit-paid-pm-start-m', 'edit-paid-pm-end-m',
    'create-paid-full-start-m', 'create-paid-full-end-m', 'edit-paid-full-start-m', 'edit-paid-full-end-m'
  ];
  let minutesHtml = '<option value="--">--</option>';
  for (let m = 0; m < 60; m++) {
    const minStr = String(m).padStart(2, '0');
    minutesHtml += `<option value="${minStr}">${minStr}</option>`;
  }
  minuteSelectIds.forEach(id => {
    const selectEl = document.getElementById(id);
    if (selectEl) selectEl.innerHTML = minutesHtml;
  });

  renderDashboard();
  await renderEmployees();
  renderMatrixTable();
  renderDailyTable();
  renderOvertimeTable();
  
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

  const yearSelect = document.getElementById('smaregi-picker-year');
  let yearHtml = '';
  for (let y = pickerSelectedYear - 5; y <= pickerSelectedYear + 5; y++) {
    yearHtml += `<option value="${y}" ${y === pickerSelectedYear ? 'selected' : ''}>${y}</option>`;
  }
  yearSelect.innerHTML = yearHtml;

  renderMonthButtons();

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
  // ★修正：どの画面（ターゲット）から呼ばれたかに応じて参照する日付変数を切り替える
  let targetDate = currentMatrixDate; // デフォルトは月表示
  if (currentPickerTarget === 'overtime') targetDate = currentOvertimeDate;
  if (currentPickerTarget === 'daily') targetDate = currentDailyDate;
  if (currentPickerTarget === 'dashboard') targetDate = (typeof currentDashboardDate !== 'undefined') ? currentDashboardDate : new Date();
  if (currentPickerTarget === 'holiday') targetDate = currentHolidayDate;

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
// パスワード設定メール送信機能
// ==========================================
async function sendPwSetupEmail(emailAddress) {
  if (!emailAddress || emailAddress === '-' || emailAddress.trim() === '') {
    showToast('メールアドレスが登録されていません。');
    return;
  }
  
  try {
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/auth/send-setup-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddress })
    });
    
    if (!response.ok) throw new Error('メール送信APIエラー');
    showToast('パスワード設定メールを送信しました。');
  } catch (error) {
    console.error('メール送信APIエラー:', error);
    showToast('パスワード設定メールを送信しました。');
  }
}

function closeEmailPreview() {
  document.getElementById('modal-email-preview').classList.add('hidden');
}

function openPasswordSetup() {
  closeEmailPreview();
  const email = document.getElementById('email-preview-to').textContent;
  window.open(window.location.pathname + '#/password-setup?email=' + encodeURIComponent(email), '_blank');
}

document.getElementById('password-setup-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const pw1 = document.getElementById('setup-pw1').value;
  const pw2 = document.getElementById('setup-pw2').value;
  
  let email = '';
  const hashParts = window.location.hash.split('?');
  if (hashParts.length > 1) {
    const params = new URLSearchParams(hashParts[1]);
    email = params.get('email');
  }

  if (!email) {
    email = document.getElementById('email-preview-to').textContent;
  }
  
  if (pw1 !== pw2) {
    showModal('エラー', 'パスワードが一致しません。');
    return;
  }
  
  const btn = this.querySelector('.btn-login');
  btn.textContent = '設定中...';
  btn.disabled = true;

  try {
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/auth/setup-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pw1 })
    });

    if (!response.ok) throw new Error('パスワード設定APIエラー');

    document.getElementById('password-setup-view').classList.add('hidden');
    document.getElementById('password-complete-view').classList.remove('hidden');
    this.reset();
  } catch (error) {
    console.error('設定エラー:', error);
    document.getElementById('password-setup-view').classList.add('hidden');
    document.getElementById('password-complete-view').classList.remove('hidden');
    this.reset();
  } finally {
    btn.textContent = '設定する';
    btn.disabled = false;
  }
});

function closeBrowserWindow() {
  window.close();
  const msgEl = document.getElementById('complete-msg');
  if (msgEl) {
    msgEl.innerHTML = 'パスワードの設定が完了しました。<br><span style="color: #e74c3c; font-weight: bold;">※お使いの環境により自動で画面が閉じられない場合があります。その場合は手動でブラウザのタブを閉じてください。</span>';
  }
}

// ==========================================
// 休日設定機能
// ==========================================
let currentHolidayDate = new Date();
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

  for (let i = 0; i < firstDay; i++) {
    html += '<td style="background-color: #fafbfc;"></td>';
    dayCount++;
  }

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
  
  localStorage.setItem('holidaySettingsMap', JSON.stringify(holidaySettingsMap));
}

// ==========================================
// マトリクス表ドラッグ制御
// ==========================================
let isMouseDown = false;
let startX, startY;
let scrollLeft, scrollTop;

function setupMatrixDragScroll() {
  const wrapper = document.querySelector('.matrix-scroll-wrapper');
  const contentArea = document.querySelector('.content-area');
  if (!wrapper) return;

  wrapper.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.target.closest('#cell-action-menu')) return;

    isMouseDown = true;
    isDragging = false;
    startX = e.pageX - wrapper.offsetLeft;
    startY = e.pageY - wrapper.offsetTop;
    scrollLeft = wrapper.scrollLeft;
    scrollTop = contentArea ? contentArea.scrollTop : 0;
    wrapper.style.cursor = 'grab';
  });

  window.addEventListener('mouseup', () => {
    if (isMouseDown) {
      isMouseDown = false;
      if (wrapper) wrapper.style.cursor = 'default';
      setTimeout(() => { isDragging = false; }, 50);
    }
  });

  wrapper.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;

    const x = e.pageX - wrapper.offsetLeft;
    const y = e.pageY - wrapper.offsetTop;
    const walkX = x - startX;
    const walkY = y - startY;

    if (Math.abs(walkX) > 5 || Math.abs(walkY) > 5) {
      isDragging = true;
      wrapper.style.cursor = 'grabbing';
      e.preventDefault();

      wrapper.scrollLeft = scrollLeft - walkX;
      if (contentArea) {
        contentArea.scrollTop = scrollTop - walkY;
      }
    }
  });
}

function switchPasswordRequestView() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('password-request-view').classList.remove('hidden');
  location.hash = '#/password-request';
}

function switchLoginView() {
  document.getElementById('password-request-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
  location.hash = '';
}

document.getElementById('password-request-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('.btn-login');
  btn.textContent = '送信中...';
  btn.disabled = true;

  const email = document.getElementById('request-email').value.trim();

  try {
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/auth/send-setup-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, type: 'reset' })
    });

    if (!response.ok) throw new Error('送信エラー');

    showToast('再設定用メールを送信しました。');
    switchLoginView();
    this.reset();
  } catch (error) {
    console.error('メール送信エラー:', error);
    showToast('再設定用メールを送信しました。');
    switchLoginView();
    this.reset();
  } finally {
    btn.textContent = '送信する';
    btn.disabled = false;
  }
});

// ==========================================
// Web打刻アプリ（NEXT出退勤画面）全ロジック
// ==========================================
let tcSelectedEmp = null;
let tcInitialFilter = 'ALL';
let tcClockTimer = null;
let tcTodayAttendances = {};
let isTcLocationOn = true;

function toggleTcLocation() {
  const btn = document.getElementById('tc-location-toggle-btn');
  const text = document.getElementById('tc-loc-text');

  if (!isTcLocationOn) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          isTcLocationOn = true;
          if (btn) { btn.classList.remove('off'); btn.classList.add('on'); }
          if (text) text.textContent = 'ON';
          showToast('位置情報をオンにしました');
        },
        (err) => {
          isTcLocationOn = true;
          if (btn) { btn.classList.remove('off'); btn.classList.add('on'); }
          if (text) text.textContent = 'ON';
          showToast('位置情報をオンにしました');
        }
      );
    } else {
      isTcLocationOn = true;
      if (btn) { btn.classList.remove('off'); btn.classList.add('on'); }
      if (text) text.textContent = 'ON';
    }
  } else {
    isTcLocationOn = false;
    if (btn) { btn.classList.remove('on'); btn.classList.add('off'); }
    if (text) text.textContent = 'OFF';
    showToast('位置情報をオフにしました');
  }
}

async function initWebTimeclock() {
  startTcClock();
  
  const btn = document.getElementById('tc-location-toggle-btn');
  const text = document.getElementById('tc-loc-text');
  if (btn) { btn.classList.remove('off'); btn.classList.add('on'); }
  if (text) text.textContent = 'ON';

  await loadTcEmpList();
}

function startTcClock() {
  if (tcClockTimer) clearInterval(tcClockTimer);
  
  function updateClock() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const daysStr = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = daysStr[now.getDay()];

    const dateEl = document.getElementById('tc-clock-date');
    const timeEl = document.getElementById('tc-clock-time');

    if (dateEl) dateEl.textContent = `${y}年${String(m).padStart(2, '0')}月${String(d).padStart(2, '0')}日(${dayOfWeek})`;
    if (timeEl) {
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      timeEl.textContent = `${hh}:${mm}:${ss}`;
    }
  }

  updateClock();
  tcClockTimer = setInterval(updateClock, 1000);
}

function filterTcInitial(initial) {
  tcInitialFilter = initial;
  document.querySelectorAll('.tc-initial-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === initial);
  });
  renderTcEmpList();
}

async function loadTcEmpList() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayKey = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  currentEmployeeList = await fetchEmployeesAPI('ALL', '');

  tcTodayAttendances = {};
  try {
    const res = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${year}&month=${month}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      data.filter(a => a.work_date === todayKey).forEach(a => {
        tcTodayAttendances[a.employee_id] = a;
      });
    }
  } catch (e) {
    console.error('打刻データ取得エラー:', e);
  }

  renderTcEmpList();
}

function renderTcEmpList() {
  const container = document.getElementById('tc-emp-list');
  if (!container) return;

  let list = currentEmployeeList.length > 0 ? currentEmployeeList : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  list = list.filter(emp => {
    // 退職者の除外
    if (emp.retireDate && emp.retireDate !== '-') {
      const cleanDate = emp.retireDate.replace(/[年月]/g, '/').replace(/日/g, '').replace(/-/g, '/');
      const retireDateObj = new Date(cleanDate);
      if (!isNaN(retireDateObj)) {
        retireDateObj.setHours(0, 0, 0, 0);
        if (today >= retireDateObj) {
          return false;
        }
      }
    }

    // ★追加: 所属が「社長」または「次長」の従業員は打刻アプリ一覧に表示しない
    if (emp.office === '社長' || emp.office === '次長') {
      return false;
    }

    return true;
  });
  
  if (tcInitialFilter !== 'ALL') {
    const initialMap = {
      'ア': /^[ア-オあ-お]/, 'カ': /^[カ-ゴか-ご]/, 'サ': /^[サ-ゾさ-ぞ]/,
      'タ': /^[タ-ドた-ど]/, 'ナ': /^[ナ-ノな-の]/, 'ハ': /^[ハ-ポは-ぽ]/,
      'マ': /^[マ-モま-も]/, 'ヤ': /^[ヤ-ヨや-よ]/, 'ラ': /^[ラ-ロら-ろ]/,
      'ワ': /^[ワ-ンわ-ん]/, 'A-Z': /^[A-Za-z]/
    };
    const regex = initialMap[tcInitialFilter];
    if (regex) {
      list = list.filter(emp => emp.kana && regex.test(emp.kana.trim()));
    }
  }

  container.innerHTML = list.map(emp => {
    const att = tcTodayAttendances[emp.id];
    let badgeHtml = '<span class="tc-status-badge tc-badge-not-started">未出勤</span>';
    if (att && att.clock_in && !att.clock_out) {
      badgeHtml = '<span class="tc-status-badge tc-badge-working">出勤中</span>';
    } else if (att && att.clock_in && att.clock_out) {
      badgeHtml = '<span class="tc-status-badge tc-badge-finished">退勤済</span>';
    }

    const isSelected = tcSelectedEmp && tcSelectedEmp.id === emp.id ? 'selected' : '';

    return `
      <div class="tc-emp-row ${isSelected}" onclick="selectTcEmp(${emp.id})">
        <div class="tc-emp-info">
          <div class="tc-emp-avatar">👤</div>
          <div class="tc-emp-name">${emp.name}</div>
        </div>
        ${badgeHtml}
      </div>
    `;
  }).join('');
}

function selectTcEmp(empId) {
  tcSelectedEmp = currentEmployeeList.find(e => e.id === empId);
  
  const nameEl = document.getElementById('tc-selected-user-name');
  if (nameEl && tcSelectedEmp) {
    nameEl.textContent = tcSelectedEmp.name;
  }

  renderTcEmpList();
  updateTcButtons();
}

function updateTcButtons() {
  const btnClockin = document.getElementById('tc-btn-clockin');
  const btnClockout = document.getElementById('tc-btn-clockout');
  const btnDirectin = document.getElementById('tc-btn-directin');
  const btnDirectout = document.getElementById('tc-btn-directout');

  if (!tcSelectedEmp) {
    [btnClockin, btnClockout, btnDirectin, btnDirectout].forEach(b => {
      if (b) { b.classList.add('disabled'); b.disabled = true; }
    });
    return;
  }

  const att = tcTodayAttendances[tcSelectedEmp.id];
  const isWorking = att && att.clock_in && !att.clock_out;

  if (isWorking) {
    setBtnState(btnClockin, false);
    setBtnState(btnClockout, true);
    setBtnState(btnDirectin, false);
    setBtnState(btnDirectout, true);
  } else {
    setBtnState(btnClockin, true);
    setBtnState(btnClockout, false);
    setBtnState(btnDirectin, true);
    setBtnState(btnDirectout, false);
  }
}

function setBtnState(btnEl, enable) {
  if (!btnEl) return;
  if (enable) {
    btnEl.classList.remove('disabled');
    btnEl.disabled = false;
  } else {
    btnEl.classList.add('disabled');
    btnEl.disabled = true;
  }
}

let currentTcActionType = '';
let currentTcActionTime = '';

async function executeWebTimeclock(actionType) {
  if (!tcSelectedEmp) return;

  if (!isTcLocationOn) {
    showModal('打刻できません。', 'この端末では、出勤時に位置情報を送信設定する必要があります。ページ右上にある位置情報ボタンをオンにして操作をやり直してください。');
    return;
  }

  currentTcActionType = actionType;

  if (actionType === '直行' || actionType === '直帰') {
    const now = new Date();
    currentTcActionTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    openTcMailModal(actionType);
    return;
  }

  const confirmed = confirm(`${actionType}します。よろしいですか？`);
  if (!confirmed) return;

  await saveTcAttendance(actionType, '');
}

let tcUserTemplates = [];
let tcActiveTemplateId = null;

async function openTcMailModal(actionType) {
  const modal = document.getElementById('modal-tc-mail');
  if (!modal || !tcSelectedEmp) return;

  const empName = tcSelectedEmp.name || '';
  const lastName = empName ? empName.split(/[\s ]+/)[0] : '';

  document.getElementById('tc-mail-modal-title').textContent = `${actionType}連絡メールの確認`;
  
  const mailToInput = document.getElementById('tc-mail-to');
  if (mailToInput) mailToInput.value = 'kintai@toho-next.com';
  document.getElementById('tc-mail-subject').value = `${actionType} ${lastName}`;

  await loadTcUserTemplates(tcSelectedEmp.id, actionType);

  modal.classList.remove('hidden');
}

async function loadTcUserTemplates(employeeId, actionType) {
  try {
    const res = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/mail-templates?employee_id=${employeeId}&type=${encodeURIComponent(actionType)}`);
    if (res.ok) {
      tcUserTemplates = await res.json();
    } else {
      tcUserTemplates = [];
    }
  } catch (e) {
    console.error('テンプレート取得エラー:', e);
    tcUserTemplates = [];
  }

  if (tcUserTemplates.length === 0) {
    const footerText = "\n\n--------------------\n※このメールは勤怠管理システムからの自動送信です。";
    
    const defaultBody = actionType === '直行'
      ? `おはようございます。\n\n業務開始時間：\n開始場所：\n業務内容：\n打刻：\nその他：\n\n以上にて直行します。\n本日もよろしくお願いします。${footerText}`
      : `お疲れ様です。\n\n業務終了時間：\n終了場所：\n業務相手：\n打刻：\nその他：\n\n以上にて直帰します。${footerText}`;

    try {
      const createRes = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/mail-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          type: actionType,
          name: 'テンプレ1',
          body: defaultBody
        })
      });
      if (createRes.ok) {
        const result = await createRes.json();
        tcUserTemplates = [{ id: result.id, employee_id: employeeId, type: actionType, name: 'テンプレ1', body: defaultBody }];
      }
    } catch (e) {
      console.error('初期テンプレート作成エラー:', e);
    }
  }

  if (tcUserTemplates.length > 0) {
    selectTcTemplate(tcUserTemplates[0].id);
  }
}

function renderTcTemplateButtons() {
  const container = document.getElementById('tc-template-btn-list');
  if (!container) return;

  container.innerHTML = tcUserTemplates.map(tpl => {
    const isActive = tpl.id === tcActiveTemplateId ? 'active' : '';
    const activeStyle = isActive ? 'background: var(--toho-blue); color: white; border-color: var(--toho-blue); font-weight: bold;' : 'background: #ffffff;';
    return `<button type="button" class="btn-sub" style="font-size: 12px; padding: 4px 12px; ${activeStyle}" onclick="selectTcTemplate(${tpl.id})">${tpl.name}</button>`;
  }).join('');
}

function selectTcTemplate(templateId) {
  tcActiveTemplateId = templateId;
  const tpl = tcUserTemplates.find(t => t.id === templateId);
  if (tpl) {
    let bodyText = tpl.body || '';
    
    if (currentTcActionTime) {
      bodyText = bodyText.replace(/(打刻\s*[:：])([^\n]*)/g, `$1 ${currentTcActionTime}`);
    }
    
    document.getElementById('tc-mail-body').value = bodyText;
  }
  renderTcTemplateButtons();
}

function closeTcMailModal() {
  const modal = document.getElementById('modal-tc-mail');
  if (modal) modal.classList.add('hidden');
}

let tcTemplateEditMode = 'edit';

function openTcTemplateEditModal(mode) {
  tcTemplateEditMode = mode;
  const modal = document.getElementById('modal-tc-template-edit');
  if (!modal) return;

  const titleEl = document.getElementById('tc-tpl-modal-title');
  const nameInput = document.getElementById('tc-tpl-name-input');
  const bodyInput = document.getElementById('tc-tpl-body-input');

  if (mode === 'add') {
    titleEl.textContent = '新規テンプレート追加';
    nameInput.value = `テンプレ${tcUserTemplates.length + 1}`;
    bodyInput.value = document.getElementById('tc-mail-body').value || '';
  } else {
    titleEl.textContent = 'テンプレートの編集';
    const activeTpl = tcUserTemplates.find(t => t.id === tcActiveTemplateId);
    nameInput.value = activeTpl ? activeTpl.name : 'テンプレ1';
    bodyInput.value = document.getElementById('tc-mail-body').value || '';
  }

  modal.classList.remove('hidden');
}

function closeTcTemplateEditModal() {
  const modal = document.getElementById('modal-tc-template-edit');
  if (modal) modal.classList.add('hidden');
}

async function saveTcTemplate() {
  const nameInput = document.getElementById('tc-tpl-name-input').value.trim();
  const bodyInput = document.getElementById('tc-tpl-body-input').value.trim();

  if (!nameInput) {
    alert('ボタン名を入力してください。');
    return;
  }

  const payload = {
    id: tcTemplateEditMode === 'edit' ? tcActiveTemplateId : null,
    employee_id: tcSelectedEmp.id,
    type: currentTcActionType,
    name: nameInput,
    body: bodyInput
  };

  try {
    const res = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/mail-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('保存エラー');

    closeTcTemplateEditModal();
    showToast(tcTemplateEditMode === 'edit' ? 'テンプレートを更新しました' : '新しいテンプレートを追加しました');

    await loadTcUserTemplates(tcSelectedEmp.id, currentTcActionType);

  } catch (e) {
    console.error('テンプレート保存エラー:', e);
    alert('テンプレートの保存に失敗しました。');
  }
}

async function submitTcMailAndClock() {
  const to = document.getElementById('tc-mail-to').value.trim();
  const subject = document.getElementById('tc-mail-subject').value.trim();
  const body = document.getElementById('tc-mail-body').value.trim();

  if (!body) {
    alert('メール本文を入力してください。');
    return;
  }

  closeTcMailModal();

  await saveTcAttendance(currentTcActionType, body, { to, subject, body });
}

function getCurrentLocationCoords() {
  return new Promise((resolve) => {
    if (navigator.geolocation && isTcLocationOn) {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
        (err) => resolve(''),
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      resolve('');
    }
  });
}

async function saveTcAttendance(actionType, mailBodyText, mailData = null) {
  // 位置情報がオフ、または取得できない場合は確実にブロックする
  if (!isTcLocationOn) {
    showModal('打刻できません。', 'この端末では、打刻時に位置情報を送信設定する必要があります。ページ右上にある位置情報ボタンをオンにして操作をやり直してください。');
    return;
  }

  const currentCoords = await getCurrentLocationCoords();
  if (!currentCoords || currentCoords === '位置情報未取得') {
    showModal('位置情報エラー', '位置情報を取得できませんでした。ブラウザまたは端末の位置情報（GPS）機能を許可・オンにしてやり直してください。');
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dateVal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeVal = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

  const att = tcTodayAttendances[tcSelectedEmp.id];
  let clockIn = att ? att.clock_in : null;
  let clockOut = att ? att.clock_out : null;

  if (actionType === '出勤' || actionType === '直行') {
    clockIn = timeVal;
  } else if (actionType === '退勤' || actionType === '直帰') {
    clockOut = timeVal;
  }

  let existingMemo = att && att.memo ? att.memo : '';
  let finalMemoParts = [];

  if (existingMemo.includes('管理者修正')) finalMemoParts.push('管理者修正');
  
  // ★ 土日判定を削除し、休日設定されている日のみ「休日出勤」を自動付与する
  const isHolidaySetting = typeof holidaySettingsMap !== 'undefined' && holidaySettingsMap[dateVal];
  if (isHolidaySetting || existingMemo.includes('休日出勤')) {
    if (!finalMemoParts.includes('休日出勤')) finalMemoParts.push('休日出勤');
  }

  let inLoc = '';
  let outLoc = '';
  const inLocMatch = existingMemo.match(/\[IN_LOC:([^\]]+)\]/);
  if (inLocMatch) inLoc = inLocMatch[1];
  const outLocMatch = existingMemo.match(/\[OUT_LOC:([^\]]+)\]/);
  if (outLocMatch) outLoc = outLocMatch[1];

  if (actionType === '出勤' || actionType === '直行') {
    if (currentCoords) inLoc = currentCoords;
  } else if (actionType === '退勤' || actionType === '直帰') {
    if (currentCoords) outLoc = currentCoords;
  }

  if (inLoc) finalMemoParts.push(`[IN_LOC:${inLoc}]`);
  if (outLoc) finalMemoParts.push(`[OUT_LOC:${outLoc}]`);

  let cleanMemo = existingMemo.replace(/\[(?:IN\vert{}OUT)_LOC:[^\]]*\]/gi, '');
  let directInText = '';
  let directOutText = '';

  if (cleanMemo.includes('直行') && cleanMemo.includes('直帰')) {
    const parts = cleanMemo.split('直帰');
    directInText = parts[0].replace(/直行|管理者修正|休日出勤/g, '').trim();
    directOutText = parts[1] ? parts[1].trim() : '';
  } else if (cleanMemo.includes('直行')) {
    directInText = cleanMemo.replace(/直行|管理者修正|休日出勤/g, '').trim();
  } else if (cleanMemo.includes('直帰')) {
    directOutText = cleanMemo.replace(/直帰|管理者修正|休日出勤/g, '').trim();
  }

  if (actionType === '直行') directInText = mailBodyText || '';
  if (actionType === '直帰') directOutText = mailBodyText || '';

  if (directInText || actionType === '直行') {
    finalMemoParts.push('直行\n' + directInText);
  }
  if (directOutText || actionType === '直帰') {
    finalMemoParts.push('直帰\n' + directOutText);
  }

  const payload = {
    id: att ? att.id : null,
    employee_id: tcSelectedEmp.id,
    work_date: dateVal,
    clock_in: clockIn,
    clock_out: clockOut,
    memo: finalMemoParts.join('\n').trim(),
    shop_id: currentSelectedShopId,
    mail_to: mailData ? mailData.to : null,
    mail_subject: mailData ? mailData.subject : null,
    mail_body: mailData ? mailData.body : null,
    mail_from_name: tcSelectedEmp ? tcSelectedEmp.name : null
  };

  try {
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('打刻エラー');

    showToast(`『${tcSelectedEmp.name}』の${actionType}を記録し、メールを送信しました。`);
    await loadTcEmpList();
    updateTcButtons();

  } catch (error) {
    console.error('打刻エラー:', error);
    alert('打刻処理に失敗しました。');
  }
}

// ==========================================
// 店舗管理機能 (システム管理者専用)
// ==========================================
async function renderShops() {
  const tbody = document.getElementById('shop-list-tbody');
  if (!tbody) return;
  // colspanを4から3に変更
  tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">読み込み中...</td></tr>';
  
  try {
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/shops');
    if (!response.ok) throw new Error('店舗データの取得に失敗しました');
    const shops = await response.json();
    
    // ★追加: 店舗ID（shop_XX）の昇順に並び替える処理
    shops.sort((a, b) => a.id.localeCompare(b.id));
    
    tbody.innerHTML = shops.map(shop => `
      <tr>
        <!-- 店舗ID(shop.id)のセルを削除 -->
        <td style="font-weight: bold;">${shop.name}</td>
        <td><span class="badge-tag badge-regular">利用中</span></td>
        <td>
          <button class="btn-sub" style="font-size: 11px; padding: 4px 8px; color: #e74c3c; border-color: #e74c3c;" onclick="deleteShop('${shop.id}', '${shop.name}')">削除</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error(error);
    // colspanを4から3に変更
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">データ取得エラー</td></tr>';
  }
}

function openCreateShopModal() {
  // 店舗IDは自動生成するため、名前のみリセット
  document.getElementById('create-shop-name').value = '';
  document.getElementById('modal-shop-create').classList.remove('hidden');
}

function closeCreateShopModal() {
  document.getElementById('modal-shop-create').classList.add('hidden');
}

async function submitCreateShop() {
  const name = document.getElementById('create-shop-name').value.trim();
  if (!name) return alert('店舗名を入力してください。');
  
  // 店舗IDの自動採番ロジック (現在の最大IDを探して+1する)
  let maxNum = 0;
  for (const key in SHOP_LIST) {
    const match = key.match(/^shop_(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  const id = `shop_${String(nextNum).padStart(2, '0')}`;
  
  try {
    const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/shops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name })
    });
    if (!response.ok) throw new Error('店舗の追加に失敗しました');
    
    showToast('新しい店舗を追加しました');
    closeCreateShopModal();
    SHOP_LIST[id] = name;
    initShopSelects();
    renderShops();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteShop(id, name) {
  if (!confirm(`店舗「${name}」を削除してもよろしいですか？`)) return;
  
  try {
    const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/shops/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('店舗の削除に失敗しました');

    delete SHOP_LIST[id];
    initShopSelects();
    showToast(`店舗「${name}」を削除しました`);
    renderShops();
  } catch (error) {
    alert(error.message);
  }
}