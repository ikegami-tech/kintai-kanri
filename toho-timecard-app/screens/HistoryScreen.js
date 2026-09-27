import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS } from '../constants/theme';

export default function HistoryScreen({ route, navigation }) {
  const empId = route.params?.empId;
  const empName = route.params?.empName || '従業員未選択';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 対象年月のデータ取得
  const fetchMonthlyHistory = async (targetDate) => {
    if (!empId) return;

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;

    try {
      setLoading(true);
      const res = await fetch(
        `https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${year}&month=${month}`,
        { cache: 'no-store' }
      );

      if (res.ok) {
        const data = await res.json();
        // 該当従業員のデータのみ抽出して日付順にソート
        const empData = data
          .filter((item) => Number(item.employee_id) === Number(empId))
          .sort((a, b) => b.work_date.localeCompare(a.work_date));

        setAttendances(empData);
      }
    } catch (error) {
      console.error('履歴取得エラー:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMonthlyHistory(currentDate);
  }, [currentDate, empId]);

  // 月切り替え処理
  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
  };

  // 引っ張り更新（Pull to Refresh）
  const onRefresh = () => {
    setRefreshing(true);
    fetchMonthlyHistory(currentDate);
  };

  // 労働時間 & 出勤日数の自動集計計算
  const calculateSummary = () => {
    let daysCount = 0;
    let totalWorkMinutes = 0;

    attendances.forEach((att) => {
      if (att.clock_in && att.clock_out) {
        daysCount++;
        const [inH, inM] = att.clock_in.split(':').map(Number);
        const [outH, outM] = att.clock_out.split(':').map(Number);

        let inMins = inH * 60 + inM;
        if (inMins < 540) inMins = 540; // 9:00以前は9:00に補正

        let outMins = outH * 60 + outM;
        if (outMins < inMins && outH < 12) outMins += 24 * 60;

        let stayMins = Math.max(0, outMins - inMins);
        let workMins = stayMins;
        if (stayMins > 360) {
          workMins = Math.max(360, stayMins - 60); // 1時間休憩引き
        }
        totalWorkMinutes += workMins;
      } else if (att.clock_in) {
        daysCount++;
      }
    });

    const totalHours = (Math.ceil(totalWorkMinutes / 6) / 10).toFixed(1);
    return { daysCount, totalHours };
  };

  const summary = calculateSummary();

  // カード項目のレンダリング
  const renderItem = ({ item }) => {
    const dateObj = new Date(item.work_date);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = dateObj.getDay();
    const dayStr = dayNames[dayOfWeek];

    const isSun = dayOfWeek === 0;
    const isSat = dayOfWeek === 6;

    const clockInStr = item.clock_in ? item.clock_in.substring(0, 5) : '--:--';
    const clockOutStr = item.clock_out ? item.clock_out.substring(0, 5) : '--:--';

    const isDirectIn = item.memo && item.memo.includes('直行');
    const isDirectOut = item.memo && item.memo.includes('直帰');

    // システムタグなどを除いた純粋なメモ本文
    const cleanMemo = (item.memo || '')
      .replace(/\[(?:IN\vert{}OUT)_LOC:[^\]]*\]/gi, '')
      .replace(/管理者修正|休日出勤|直行|直帰/g, '')
      .trim();

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.dateBox}>
            <Text style={[styles.dateText, isSun && styles.sunText, isSat && styles.satText]}>
              {item.work_date.replace(/-/g, '/')} ({dayStr})
            </Text>
          </View>
          <View style={styles.badgeGroup}>
            {isDirectIn && <View style={styles.directBadge}><Text style={styles.badgeText}>📍直行</Text></View>}
            {isDirectOut && <View style={styles.directBadge}><Text style={styles.badgeText}>📍直帰</Text></View>}
          </View>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>出勤</Text>
            <Text style={styles.timeVal}>{clockInStr}</Text>
          </View>
          <Text style={styles.timeDivider}>～</Text>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>退勤</Text>
            <Text style={styles.timeVal}>{clockOutStr}</Text>
          </View>
        </View>

        {cleanMemo !== '' && (
          <View style={styles.memoBox}>
            <Text style={styles.memoText}>📝 {cleanMemo}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 画面ヘッダー */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnBox}>
          <Text style={styles.backBtn}>＜ 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{empName} 様の履歴</Text>
      </View>

      {/* 対象月切り替えヘッダー */}
      <View style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthBtn} onPress={() => changeMonth(-1)}>
          <Text style={styles.monthBtnText}>＜ 前月</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {currentDate.getFullYear()}年 {String(currentDate.getMonth() + 1).padStart(2, '0')}月
        </Text>
        <TouchableOpacity style={styles.monthBtn} onPress={() => changeMonth(1)}>
          <Text style={styles.monthBtnText}>次月 ＞</Text>
        </TouchableOpacity>
      </View>

      {/* 月間集計サマリーカード */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>出勤日数</Text>
          <Text style={styles.summaryValue}>{summary.daysCount} <Text style={styles.summaryUnit}>日</Text></Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>合計勤務時間</Text>
          <Text style={styles.summaryValue}>{summary.totalHours} <Text style={styles.summaryUnit}>時間</Text></Text>
        </View>
      </View>

      {/* 打刻履歴リスト */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>打刻履歴を読み込み中...</Text>
        </View>
      ) : (
        <FlatList
          data={attendances}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>この月の打刻データはありません</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain || '#f4f7f9',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark || '#005bb5',
  },
  backBtnBox: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtn: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  monthBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f4f8',
  },
  monthBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary || '#0073ea',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e0e6ed',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary || '#0073ea',
  },
  summaryUnit: {
    fontSize: 12,
    color: '#333333',
    fontWeight: 'normal',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333333',
  },
  sunText: { color: '#e74c3c' },
  satText: { color: '#3498db' },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  directBadge: {
    backgroundColor: '#e8f4fd',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b3d8f8',
  },
  badgeText: {
    fontSize: 11,
    color: COLORS.primary || '#0073ea',
    fontWeight: 'bold',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    borderRadius: 6,
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 10,
    color: '#888888',
    marginBottom: 2,
  },
  timeVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  timeDivider: {
    fontSize: 16,
    color: '#aaaaaa',
  },
  memoBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f4f8',
  },
  memoText: {
    fontSize: 12,
    color: '#555555',
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666666',
    fontSize: 13,
  },
  emptyText: {
    color: '#999999',
    fontSize: 14,
  },
});