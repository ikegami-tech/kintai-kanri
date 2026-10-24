import json
import time
import unicodedata
import re
from datetime import date
from collections import Counter
import pyotp
import pymysql
from playwright.sync_api import sync_playwright

# ==================== 設定情報 ====================
# 全社共通の認証情報（指定がない店舗で使われます）
COMMON_LOGIN_ID = "admin"
COMMON_LOGIN_PASS = "00thnxadmin2309"
COMMON_TOTP_SECRET = "YYNGPV7XOBDPJXHIXNXKDCXVVL7FTSA3EFOFWCMDLKXWG722V73SNLFMBN6CFC6NOARQE3E75PK7CW3O4CUF7XUQH4HNXBGJEQQCC3Y"
COMMON_BASIC_USER = "sec_user_9k8x2p1"
COMMON_BASIC_PASS = "k9#mP4$vR7!zL2@qW8Xn"

DB_CONFIG = {
    'host': 'apb.cha6sci863bs.ap-northeast-1.rds.amazonaws.com',
    'port': 3306,
    'user': 'admin',
    'password': 'ike31415926',
    'database': 'kintai',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

# ★取得対象の個社リスト（テスト用にNEXTのみ有効化、他はコメントアウト）
TARGET_SHOPS = [
    {
        "name": "NEXT", 
        "path": "next",
        "login_id": "ikegami",
        "login_pass": "31415926"
    },
    # {"name": "国分寺", "path": "kokubunji"},
    # {"name": "立川", "path": "tachikawa"},
    # {"name": "大田東京", "path": "otatokyo"},
    # {"name": "品川", "path": "shinagawa"},
    # {"name": "練馬", "path": "nerima"},
    # {"name": "城東", "path": "joto"},
    # {"name": "武蔵野", "path": "musashino"},
    # {"name": "町田", "path": "machida"},
    # {"name": "溝の口", "path": "mizonokuchi"},
    # {"name": "横浜", "path": "yokohama"},
    # {"name": "湘南", "path": "shonan"},
    # {"name": "川口", "path": "kawaguchi"},
    # {"name": "浦和", "path": "urawa"},
    # {"name": "新都心", "path": "shintoshin"},
    # {"name": "船橋", "path": "funabashi"},
    # {"name": "新小岩", "path": "shinkoiwa"},
    # {"name": "杉並", "path": "suginami"},
    # {"name": "世田谷", "path": "setagaya"},
    # {"name": "横浜西口", "path": "yokohamawest"},
    # {"name": "松戸", "path": "matsudo"},
    # {"name": "調布", "path": "chofu"},
    # {"name": "王子", "path": "oji"},
    # {"name": "横浜戸塚", "path": "yokohamatotsuka"},
    # {"name": "逗子・葉山リゾート", "path": "zushihayama"},
    # {"name": "東京", "path": "tokyo"},
    # {"name": "新横浜", "path": "shinyokohama"},
    # {"name": "江坂", "path": "esaka"},
    # {"name": "名古屋城東", "path": "nagoyajoto"},
    # {"name": "名古屋中央", "path": "nagoyacenter"},
    # {"name": "柏", "path": "kashiwa"},
]

NAME_ALIASES = {
    "佐藤": "佐藤学",
    "渡邉": "渡邉南"
}

EXCLUDE_KEYWORDS = [
    "NEXT LP", "NEXTLP", "小浦", "馬面", "HOME", 
    "メンテナンス", "研修", "会議室", "フリー"
]
# =================================================

def clean_name(name_str):
    if not name_str:
        return ""
    normalized = unicodedata.normalize('NFKC', str(name_str))
    return "".join(normalized.split())

def fetch_toho_data(shop):
    shop_name = shop["name"]
    shop_path = shop["path"]
    
    login_id = shop.get("login_id", COMMON_LOGIN_ID)
    login_pass = shop.get("login_pass", COMMON_LOGIN_PASS)
    totp_secret = shop.get("totp_secret", COMMON_TOTP_SECRET)

    totp = pyotp.TOTP(totp_secret)
    fetched_schedules = []
    fetched_users = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-gpu",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--window-size=1920,1080"
            ]
        )
        
        context = browser.new_context(
            http_credentials={
                "username": COMMON_BASIC_USER,
                "password": COMMON_BASIC_PASS
            }
        )
        page = context.new_page()

        def handle_response(response):
            url = response.url
            if "calendar-api/get-schedule" in url:
                try:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        fetched_schedules.extend(data)
                except Exception:
                    pass
            elif "calendar-api/get-user" in url:
                try:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        fetched_users.extend(data)
                except Exception:
                    pass

        page.on("response", handle_response)

        target_url = f"https://toho-ss.jp/es/login/{shop_path}"
        print(f"[Step 1] {shop_name} ({target_url}) にアクセス中...")
        page.goto(target_url)

        print(f"[Step 2] アカウント ({login_id}) でログイン...")
        page.locator('input[type="text"], input[name*="user"], input[name*="login"]').first.fill(login_id)
        page.locator('input[type="password"]').fill(login_pass)
        page.click('button[type="submit"], input[type="submit"], .btn')

        page.wait_for_url("**/estate/users/mfa**", timeout=15000)
        page.wait_for_timeout(1000)

        print("[Step 3] TOTP認証を処理中...")
        totp_select = page.locator('div:has-text("アプリ認証")').locator('text="選択"').first
        if totp_select.is_visible():
            totp_select.click()
        else:
            page.locator('text="選択"').first.click()

        page.wait_for_timeout(1500)

        current_code = totp.now()
        inputs = page.locator('input').all()
        if len(inputs) >= 6:
            for i in range(6):
                inputs[i].fill(current_code[i])
                page.wait_for_timeout(50)
        else:
            page.locator('input').first.click()
            page.keyboard.type(current_code, delay=100)

        page.locator('button:has-text("確認"), input[value="確認"]').first.click()

        print("[Step 4] トップ画面遷移中...")
        page.wait_for_url("**/estate/home**", timeout=20000)
        page.wait_for_timeout(2000)

        print(f"[Step 5] {shop_name} のスケジュールデータをロード中...")
        try:
            page.get_by_text("全員", exact=True).click()
            with page.expect_response(lambda response: "calendar-api/get-schedule" in response.url, timeout=15000):
                pass 
        except Exception as e:
            print(f"API待機中にタイムアウトまたはエラーが発生: {e}")
            pass

        page.wait_for_timeout(3000)

        context.close()
        browser.close()

    return fetched_schedules, fetched_users

def sync_to_db(schedules, users, target_date_str=None):
    if not target_date_str:
        target_date_str = date.today().strftime('%Y-%m-%d')

    print(f"[Step 6] データベースへの同期を開始します（対象日: {target_date_str}）")

    if not schedules:
        print("⚠️ スケジュールデータが取得できなかったため、同期をスキップします。")
        return

    toho_user_map = {str(u.get("id")): u.get("title", "") for u in users if u.get("id")}

    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM employees")
            employees = cursor.fetchall()

            full_name_dict = {clean_name(emp['name']): emp['id'] for emp in employees}

            last_name_counter = Counter()
            for emp in employees:
                parts = emp['name'].split()
                l_name = clean_name(parts[0]) if parts else clean_name(emp['name'])[:2]
                last_name_counter[l_name] += 1

            unique_last_name_dict = {}
            for emp in employees:
                parts = emp['name'].split()
                l_name = clean_name(parts[0]) if parts else clean_name(emp['name'])[:2]
                if last_name_counter[l_name] == 1:
                    unique_last_name_dict[l_name] = emp['id']

            success_count = 0
            skipped_names = []

            for row in schedules:
                start_raw = row.get("start", "")
                row_date = start_raw[:10] if len(start_raw) >= 10 else None

                if row_date != target_date_str:
                    continue

                schedule_uid = str(row.get("schedule_user_id", ""))
                raw_name = row.get("name", "")
                resolved_name = toho_user_map.get(schedule_uid) or raw_name

                if not resolved_name or any(kw in resolved_name for kw in EXCLUDE_KEYWORDS):
                    continue

                name_list = re.split(r'[/／,，、]', resolved_name)
                for ind_name in name_list:
                    ind_name = ind_name.strip()
                    if not ind_name or any(kw in ind_name for kw in EXCLUDE_KEYWORDS):
                        continue

                    c_name = clean_name(ind_name)
                    if c_name in NAME_ALIASES:
                        c_name = clean_name(NAME_ALIASES[c_name])

                    emp_id = full_name_dict.get(c_name)
                    if not emp_id and c_name in unique_last_name_dict:
                        emp_id = unique_last_name_dict[c_name]

                    if not emp_id:
                        skipped_names.append(ind_name)
                        continue

                    end_raw = row.get("end", "")
                    start_time = "" if row.get("allDay") == "true" else start_raw[11:16]
                    end_time = "" if row.get("allDay") == "true" else end_raw[11:16]
                    schedule_type = row.get("kind", "")
                    
                    title = row.get("title", "").strip()
                    place = row.get("place", "").strip()

                    if not title:
                        if schedule_type == "estate_consulting":
                            title = "損害保険"
                        else:
                            title = schedule_type

                    if place and f"@{place}" not in title:
                        title = f"{title} @{place}".strip()

                    sql = """
                        INSERT INTO DailySchedules (target_date, employee_id, employee_name, start_time, end_time, schedule_type, title)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            employee_name = VALUES(employee_name),
                            start_time = VALUES(start_time),
                            end_time = VALUES(end_time),
                            schedule_type = VALUES(schedule_type),
                            title = VALUES(title)
                    """
                    cursor.execute(sql, (target_date_str, emp_id, ind_name, start_time, end_time, schedule_type, title))
                    success_count += 1

        connection.commit()
        print(f"🎉 {success_count} 件のスケジュールをDBへ登録・更新しました")
        if skipped_names:
            print(f"⚠️ スキップされた氏名: {set(skipped_names)}")

    finally:
        connection.close()

if __name__ == "__main__":
    print("=== 全社SS スケジュール自動同期バッチ開始 ===")
    
    for shop in TARGET_SHOPS:
        print(f"\n{'='*50}")
        schedules, users = fetch_toho_data(shop)
        print(f"取得データ: スケジュール {len(schedules)} 件 / ユーザー {len(users)} 件")
        
        sync_to_db(schedules, users)
        
    print(f"\n{'='*50}")
    print("=== 全店舗のスケジュール同期が完了しました ===")