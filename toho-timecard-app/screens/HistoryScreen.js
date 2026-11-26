import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import { CONFIG } from '../constants/config';

const SmileIcon = () => {
  const color = COLORS.primary || '#0073ea';
  return (
    <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 14, marginBottom: 3, alignItems: 'center' }}>
        <View style={{ width: 5, height: 3, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderTopLeftRadius: 3, borderTopRightRadius: 3, borderColor: color }} />
        <View style={{ width: 5, height: 3, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderTopLeftRadius: 3, borderTopRightRadius: 3, borderColor: color }} />
      </View>
      <View style={{ width: 10, height: 5, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, borderColor: color }} />
    </View>
  );
};

export default function HistoryScreen() {
  const isFocused = useIsFocused();
  const [targetDate, setTargetDate] = useState(new Date());
  const [dailyRecords, setDailyRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const formatDateKey = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchDailyHistory = async (dateObj) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const userStr = await AsyncStorage.getItem('@logged_in_user');
      let shopId = 'shop_01';
      if (userStr) {
        const user = JSON.parse(userStr);
        shopId = user.shop_id || 'shop_01';
      }

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dateKey = formatDateKey(dateObj);

      const res = await fetch(
        `${CONFIG.apiUrl}/attendances/monthly?year=${year}&month=${month}&shop_id=${shopId}`,
        {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        // 対象日の出勤打刻があるレコードのみ抽出し、出勤時間が早い順に並び替え
        const filtered = (Array.isArray(data) ? data : [])
          .filter((item) => item.work_date === dateKey && item.clock_in)
          .sort((a, b) => (a.clock_in || '').localeCompare(b.clock_in || ''));

        setDailyRecords(filtered);
      }
    } catch (error) {
      console.error('出勤履歴取得エラー:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      setLoading(true);
      fetchDailyHistory(targetDate);
    }
  }, [isFocused, targetDate]);

  const changeDate = (offset) => {
    const next = new Date(targetDate);
    next.setDate(next.getDate() + offset);
    setTargetDate(next);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDailyHistory(targetDate);
  };

  const formatOutTime = (clockOut, memo) => {
    if (!clockOut) return '出勤中';
    let [h, m] = clockOut.substring(0, 5).split(':').map(Number);
    if (memo && memo.includes('【翌日】') && h < 24) h += 24;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const renderItem = ({ item, index }) => {
    const numStr = String(index + 1).padStart(2, '0');
    const clockInStr = item.clock_in ? item.clock_in.substring(0, 5) : '--:--';

    return (
      <TouchableOpacity
        style={styles.rowItem}
        activeOpacity={0.7}
        onPress={() => setSelectedRecord(item)}
      >
        <Text style={styles.rowNum}>{numStr}</Text>
        <View style={styles.iconBox}>
          <SmileIcon />
        </View>
        <Text style={styles.empName} numberOfLines={1}>
          {item.employee_name || '従業員'}
        </Text>
        <Text style={styles.timeText}>{clockInStr}</Text>
        <Text style={styles.chevron}>＞</Text>
      </TouchableOpacity>
    );
  };

  const headerDateLabel = `${targetDate.getMonth() + 1}/${targetDate.getDate()} の出勤`;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 日付切り替えバー */}
      <View style={styles.dateBar}>
        <TouchableOpacity style={styles.dateArrowBtn} onPress={() => changeDate(-1)}>
          <Text style={styles.dateArrowText}>＜</Text>
        </TouchableOpacity>
        <Text style={styles.dateBarTitle}>{headerDateLabel}</Text>
        <TouchableOpacity style={styles.dateArrowBtn} onPress={() => changeDate(1)}>
          <Text style={styles.dateArrowText}>＞</Text>
        </TouchableOpacity>
      </View>

      {/* 出勤者リスト */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary || '#0073ea'} />
        </View>
      ) : (
        <FlatList
          data={dailyRecords}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary || '#0073ea']}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>この日の出勤記録はありません</Text>
            </View>
          }
        />
      )}

      {/* 詳細確認モーダル（タップ時に出勤〜退勤時間を表示） */}
      <Modal
        visible={!!selectedRecord}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedRecord(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedRecord(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                {selectedRecord && (
                  <>
                    <Text style={styles.modalName}>{selectedRecord.employee_name}</Text>
                    <Text style={styles.modalDate}>
                      {selectedRecord.work_date.replace(/-/g, '/')} の勤務実績
                    </Text>

                    <View style={styles.modalTimeRow}>
                      <View style={styles.modalTimeBox}>
                        <Text style={styles.modalTimeLabel}>出勤</Text>
                        <Text style={styles.modalTimeVal}>
                          {selectedRecord.clock_in ? selectedRecord.clock_in.substring(0, 5) : '--:--'}
                        </Text>
                      </View>
                      <Text style={styles.modalTimeDivider}>〜</Text>
                      <View style={styles.modalTimeBox}>
                        <Text style={styles.modalTimeLabel}>退勤</Text>
                        <Text
                          style={[
                            styles.modalTimeVal,
                            !selectedRecord.clock_out && { color: COLORS.primary || '#0073ea' },
                          ]}
                        >
                          {formatOutTime(selectedRecord.clock_out, selectedRecord.memo)}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.modalCloseBtn}
                      onPress={() => setSelectedRecord(null)}
                    >
                      <Text style={styles.modalCloseText}>閉じる</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary || '#0073ea',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateArrowBtn: { paddingHorizontal: 14, paddingVertical: 4 },
  dateArrowText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  dateBarTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  rowNum: { width: 28, fontSize: 15, color: '#334155', fontWeight: '500' },
  iconBox: { marginRight: 12 },
  empName: { flex: 1, fontSize: 16, color: '#1e293b', fontWeight: '500' },
  timeText: { fontSize: 16, color: '#334155', marginRight: 10, fontVariant: ['tabular-nums'] },
  chevron: { fontSize: 14, color: '#cbd5e1', fontWeight: 'bold' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: '#94a3b8' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  modalDate: { fontSize: 13, color: '#64748b', marginBottom: 18 },
  modalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 20,
  },
  modalTimeBox: { alignItems: 'center', minWidth: 90 },
  modalTimeLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  modalTimeVal: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  modalTimeDivider: { fontSize: 18, color: '#94a3b8' },
  modalCloseBtn: {
    width: '100%',
    backgroundColor: COLORS.primary || '#0073ea',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
});