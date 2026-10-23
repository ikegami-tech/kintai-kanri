import json

# 1. ユーザーデータの確認
print("=== ユーザーデータのサンプル（先頭3件） ===")
with open("users.json", "r", encoding="utf-8") as f:
    users = json.load(f)
    print(f"総ユーザー数: {len(users)}")
    print(json.dumps(users[:3], ensure_ascii=False, indent=2))

# 2. スケジュールデータの確認
print("\n=== スケジュールデータのサンプル（先頭3件） ===")
with open("schedules.json", "r", encoding="utf-8") as f:
    schedules = json.load(f)
    print(f"総スケジュール数: {len(schedules)}")
    print(json.dumps(schedules[:3], ensure_ascii=False, indent=2))

# 3. スケジュールデータに含まれる全キー一覧
if schedules:
    print("\n=== スケジュールオブジェクトのキー一覧 ===")
    print(list(schedules[0].keys()))