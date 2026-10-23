import json
import time
import pyotp
from playwright.sync_api import sync_playwright

SECRET_KEY = "YYNGPV7XOBDPJXHIXNXKDCXVVL7FTSA3EFOFWCMDLKXWG722V73SNLFMBN6CFC6NOARQE3E75PK7CW3O4CUF7XUQH4HNXBGJEQQCC3Y"
totp = pyotp.TOTP(SECRET_KEY)

USER_ID = "ikegami"
PASSWORD = "31415926"

def run(playwright):
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()

    # 送信パラメータ（Request payload）の記録
    def handle_request(request):
        if "calendar-api" in request.url and request.method == "POST":
            print(f"\n[送信リクエスト検知] {request.url}")
            print(f"  └ 送信パラメータ: {request.post_data}")

    # 受信データ（Response JSON）のファイル保存
    def handle_response(response):
        url = response.url
        if "calendar-api/get-schedule" in url:
            try:
                data = response.json()
                with open("schedules.json", "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print(f"\n★ スケジュールデータを保存しました (件数: {len(data)}件 -> schedules.json)")
            except Exception as e:
                print(f"スケジュール保存失敗: {e}")

        elif "calendar-api/get-user" in url:
            try:
                data = response.json()
                if len(data) > 0:
                    with open("users.json", "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    print(f"\n★ ユーザー一覧データを保存しました (件数: {len(data)}件 -> users.json)")
            except Exception as e:
                print(f"ユーザー保存失敗: {e}")

    page.on("request", handle_request)
    page.on("response", handle_response)

    print("1. ログイン画面へアクセス...")
    page.goto("https://toho-ss.jp/es/login/next")

    print("2. 認証情報を自動入力...")
    page.locator('input[type="text"], input[name*="user"], input[name*="login"]').first.fill(USER_ID)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.click('button[type="submit"], input[type="submit"], .btn')

    page.wait_for_url("**/estate/users/mfa**", timeout=10000)
    page.wait_for_timeout(1000)

    print("3. TOTP認証選択...")
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

    print("4. ログイン後トップ画面へ遷移中...")
    page.wait_for_url("**/estate/home**", timeout=15000)
    page.wait_for_timeout(2000)

    print("5. 「全員」ボタンを押下して全データをロード...")
    try:
        page.get_by_text("全員", exact=True).click()
    except Exception:
        pass

    page.wait_for_timeout(4000)
    print("\nデータ取得完了。VS Code左側のエクスプローラーにファイルが出力されたか確認してください。")
    page.pause()

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)