import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { COLORS } from '../constants/theme';

// 五十音タブの定義
const INITIAL_TABS = [
  { label: 'ALL', regex: null },
  { label: 'ア', regex: /^[ア-オあ-お]/ },
  { label: 'カ', regex: /^[カ-ゴか-ご]/ },
  { label: 'サ', regex: /^[サ-ゾさ-ぞ]/ },
  { label: 'タ', regex: /^[タ-ドた-ど]/ },
  { label: 'ナ', regex: /^[ナ-ノな-の]/ },
  { label: 'ハ', regex: /^[ハ-ポは-ぽ]/ },
  { label: 'マ', regex: /^[マ-モま-も]/ },
  { label: 'ヤ', regex: /^[ヤ-ヨや-よ]/ },
  { label: 'ラ', regex: /^[ラ-ロら-ろ]/ },
  { label: 'ワ', regex: /^[ワ-ンわ-ん]/ },
  { label: 'A-Z', regex: /^[A-Za-z]/ },
];

export default function EmployeeSelectScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [time, setTime] = useState(new Date());

  // 1秒刻みのリアルタイム時計
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // バックエンドAPIから従業員一覧 & 本日の打刻データを取得
  useEffect(() => {
    fetchEmployees();
    fetchTodayAttendances();
  }, []);

  const fetchTodayAttendances = async () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    try {
      const res = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${yyyy}&month=${mm}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const todayData = data.filter(item => item.work_date === todayStr);
        setAttendances(todayData);
      }
    } catch (e) {
      console.warn('本日の打刻取得エラー:', e);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees');
      const data = await response.json();
      if (Array.isArray(data)) {
        // 利用中の従業員のみ表示（退職者などを除く）
        const activeEmps = data.filter(e => e.status !== '利用停止');
        setEmployees(activeEmps);
      }
    } catch (error) {
      console.error('従業員データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 各タブごとの該当人数を計算
  const getCountForTab = (tab) => {
    if (!tab.regex) return employees.length;
    return employees.filter(e => e.kana && tab.regex.test(e.kana.trim())).length;
  };

  // 選択中タブに基づく従業員リストの絞り込み
  const currentTabObj = INITIAL_TABS.find(t => t.label === selectedTab);
  const filteredEmployees = employees.filter(e => {
    if (!currentTabObj || !currentTabObj.regex) return true;
    return e.kana && currentTabObj.regex.test(e.kana.trim());
  });

  // 曜日表示のフォーマット
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dateStr = `${String(time.getMonth() + 1).padStart(2, '0')}/${String(time.getDate()).padStart(2, '0')}`;
  const dayStr = dayNames[time.getDay()];
  const hhmmStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  const ssStr = `:${String(time.getSeconds()).padStart(2, '0')}`;

  // スマレジ風 4列カードのレンダリング
  const renderEmployeeItem = ({ item }) => {
    const att = attendances.find(a => Number(a.employee_id) === Number(item.id));
    const isWorking = att && att.clock_in && !att.clock_out;
    const clockInTime = att && att.clock_in ? att.clock_in.substring(0, 5) : '';

    return (
      <TouchableOpacity
        style={[styles.cardItem, isWorking ? styles.cardWorking : styles.cardOff]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('TimeClock', { empId: item.id, empName: item.name })}
      >
        {/* 出勤中時刻バッジ */}
        {isWorking ? (
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>○ {clockInTime}</Text>
          </View>
        ) : (
          <View style={styles.timeBadgePlaceholder} />
        )}

        {/* スマレジ風 表情アイコン (出勤中: 😉 / 未出勤: 😌) */}
        <View style={styles.faceIconBox}>
          <Text style={styles.faceIcon}>{isWorking ? '😉' : '😌'}</Text>
        </View>

        {/* 従業員名 */}
        <Text style={styles.empNameText} numberOfLines={2}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 上部：日付 & リアルタイムデジタル時計 */}
      <View style={styles.headerClockBar}>
        <Text style={styles.headerDateText}>{dateStr}<Text style={styles.headerDayText}>{dayStr}</Text></Text>
        <View style={styles.clockBox}>
          <Text style={styles.clockMainText}>{hhmmStr}</Text>
          <Text style={styles.clockSecText}>{ssStr}</Text>
        </View>
      </View>

      {/* メイン：スマレジ風 4列グリッド従業員一覧 */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary || '#0073ea'} />
          <Text style={styles.loadingText}>従業員データを読み込み中...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEmployeeItem}
          numColumns={4}
          contentContainerStyle={styles.gridContainer}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>該当する従業員がいません</Text>
            </View>
          }
        />
      )}

      {/* 画面下部：スマレジ風 五十音別人数カウントタブ */}
      <View style={styles.bottomTabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {INITIAL_TABS.map((tab) => {
            const count = getCountForTab(tab);
            const isActive = selectedTab === tab.label;
            return (
              <TouchableOpacity
                key={tab.label}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setSelectedTab(tab.label)}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>({count}人)</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef4f9',
  },
  /* 上部ヘッダー時計 */
  headerClockBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe5ef',
    gap: 16,
  },
  headerDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
  },
  headerDayText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  clockBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  clockMainText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.primary || '#0073ea',
    fontFamily: 'monospace',
  },
  clockSecText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary || '#0073ea',
    fontFamily: 'monospace',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textSub || '#666666',
  },
  /* 4列グリッドリスト */
  gridContainer: {
    padding: 6,
    paddingBottom: 20,
  },
  cardItem: {
    flex: 1,
    margin: 4,
    height: 110,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  /* 出勤中: TOHOブルー鮮やか背景 */
  cardWorking: {
    backgroundColor: '#80c2ff',
    borderColor: '#0073ea',
  },
  /* 未出勤: 明るいブルーグレー背景 */
  cardOff: {
    backgroundColor: '#dbe7f2',
    borderColor: '#c0d3e5',
  },
  timeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary || '#0073ea',
  },
  timeBadgePlaceholder: {
    height: 16,
  },
  faceIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceIcon: {
    fontSize: 32,
  },
  empNameText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSub || '#666666',
  },
  /* 下部五十音タブ */
  bottomTabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#dbe5ef',
    paddingVertical: 6,
  },
  tabScroll: {
    paddingHorizontal: 8,
    gap: 6,
  },
  tabBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    minWidth: 55,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary || '#0073ea',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  tabCount: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  tabCountActive: {
    color: '#ffffff',
  },
});