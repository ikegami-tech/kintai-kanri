import pymysql
from datetime import datetime

# データベース接続情報
DB_CONFIG = {
    'host': 'apb.cha6sci863bs.ap-northeast-1.rds.amazonaws.com',
    'port': 3306,
    'user': 'admin',
    'password': 'ike31415926',
    'database': 'kintai',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def clean_daily_schedules():
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{now_str}] スケジュールデータの削除処理を開始します...")

    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            # テーブル内のスケジュールデータをリセット
            sql = "DELETE FROM DailySchedules;"
            deleted_rows = cursor.execute(sql)
            connection.commit()
            print(f"✅ 削除完了: {deleted_rows} 件のスケジュールを削除しました。")
    except Exception as e:
        print(f"❌ 削除処理中にエラーが発生しました: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    clean_daily_schedules()