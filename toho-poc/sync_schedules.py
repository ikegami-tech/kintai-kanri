import json
import pymysql
import unicodedata
import re
from datetime import date
from collections import Counter

DB_CONFIG = {
    'host': 'apb.cha6sci863bs.ap-northeast-1.rds.amazonaws.com',
    'port': 3306,
    'user': 'admin',
    'password': 'ike31415926',
    'database': 'kintai',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

# 修正箇所：大川和さんへの誤った変換を削除し、苗字のみ対策として大川和さんへ紐付け
NAME_ALIASES = {
    "大川": "大川和",     # 苗字のみ「大川」の場合の救済
    "佐藤": "佐藤学",     # 同姓対策
    "渡邉": "渡邉南"
}

# 個人スケジュールではない除外キーワード
EXCLUDE_KEYWORDS = [
    "NEXT LP", "NEXTLP", "小浦", "馬面", "HOME", 
    "メンテナンス", "研修", "会議室", "フリー"
]

def clean_name(name_str):
    """空白・特殊文字を除去した比較用文字列を作成"""
    if not name_str:
        return ""
    normalized = unicodedata.normalize('NFKC', str(name_str))
    return "".join(normalized.split())

def sync_to_db(target_date_str=None):
    if not target_date_str:
        target_date_str = date.today().strftime('%Y-%m-%d')
    
    print(f"==================================================")
    print(f"📅 処理対象日: {target_date_str} のスケジュールを同期します")
    print(f"==================================================")

    try:
        with open("schedules.json", "r", encoding="utf-8") as f:
            schedules = json.load(f)
    except FileNotFoundError:
        print("エラー: schedules.json が見つかりません。")
        return

    toho_user_map = {}
    try:
        with open("users.json", "r", encoding="utf-8") as f:
            toho_users = json.load(f)
            for u in toho_users:
                toho_user_map[str(u.get("id"))] = u.get("title", "")
    except FileNotFoundError:
        pass

    connection = pymysql.connect(**DB_CONFIG)
    
    try:
        with connection.cursor() as cursor:
            # 1. 勤怠システムの全従業員を取得
            cursor.execute("SELECT id, name FROM employees")
            employees = cursor.fetchall()
            
            # フルネーム辞書
            full_name_dict = {clean_name(emp['name']): emp['id'] for emp in employees}
            
            # 苗字辞書（社内で同姓が1人の場合は苗字だけでも特定可能にする）
            last_name_counter = Counter()
            for emp in employees:
                clean_n = clean_name(emp['name'])
                parts = emp['name'].split()
                l_name = clean_name(parts[0]) if parts else clean_n[:2]
                last_name_counter[l_name] += 1
            
            unique_last_name_dict = {}
            for emp in employees:
                parts = emp['name'].split()
                l_name = clean_name(parts[0]) if parts else clean_name(emp['name'])[:2]
                if last_name_counter[l_name] == 1:
                    unique_last_name_dict[l_name] = emp['id']

            print(f"勤怠DB登録社員数: {len(full_name_dict)} 名 (苗字自動判別対応: {len(unique_last_name_dict)} 姓)")
            
            success_count = 0
            skipped_reasons = Counter()
            skipped_names = Counter()

            for row in schedules:
                start_raw = row.get("start", "")
                row_date = start_raw[:10] if len(start_raw) >= 10 else None
                
                # 対象日（本日当日）以外のデータは除外
                if row_date != target_date_str:
                    continue

                schedule_uid = str(row.get("schedule_user_id", ""))
                raw_name = row.get("name", "")
                resolved_name = toho_user_map.get(schedule_uid) or raw_name
                
                if not resolved_name:
                    continue
                
                if any(kw in resolved_name for kw in EXCLUDE_KEYWORDS):
                    continue

                name_list = re.split(r'[/／,，、]', resolved_name)
                
                for individual_name in name_list:
                    individual_name = individual_name.strip()
                    if not individual_name or any(kw in individual_name for kw in EXCLUDE_KEYWORDS):
                        continue

                    c_name = clean_name(individual_name)
                    
                    # 1. 手動エイリアス確認
                    if c_name in NAME_ALIASES:
                        c_name = clean_name(NAME_ALIASES[c_name])

                    # 2. フルネーム一致判定
                    emp_id = full_name_dict.get(c_name)
                    
                    # 3. 苗字のみ一致判定
                    if not emp_id and c_name in unique_last_name_dict:
                        emp_id = unique_last_name_dict[c_name]

                    if not emp_id:
                        skipped_reasons["未登録・判別不能"] += 1
                        skipped_names[individual_name] += 1
                        continue

                    end_raw = row.get("end", "")
                    start_time = "" if row.get("allDay") == "true" else start_raw[11:16]
                    end_time = "" if row.get("allDay") == "true" else end_raw[11:16]
                    schedule_type = row.get("kind", "")
                    title = row.get("title", "")

                    # 洗い替え（UPSERT）
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
                    cursor.execute(sql, (target_date_str, emp_id, individual_name, start_time, end_time, schedule_type, title))
                    success_count += 1

        connection.commit()
        
        print("\n==================【本日同期結果レポート】==================")
        print(f"✅ 本日分 DB登録・更新成功 : {success_count} 件")
        print("⚠️ 本日分 スキップ内訳:")
        for reason, count in skipped_reasons.items():
            print(f"   - {reason}: {count} 件")
            
        if skipped_names:
            print("\n🔍 本日分 スキップされた氏名:")
            for name, count in skipped_names.most_common(10):
                print(f"   - {name}: {count} 件")
        else:
            print("🎉 スキップされた氏名はありません（全件一致）")
        print("============================================================")

    except Exception as e:
        print(f"データベース処理エラー: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    sync_to_db()