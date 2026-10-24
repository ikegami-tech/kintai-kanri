import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  useWindowDimensions,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native'; // ★修正: useIsFocusedを追加
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 10) / 4;

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
];

const SmaregiFaceIcon = ({ isWorking }) => {
  const color = isWorking ? '#ffffff' : '#788d9e';
  return (
    <View style={{ position: 'relative', width: 42, height: 42, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 18, marginBottom: 4, alignItems: 'center' }}>
          {isWorking ? (
            <>
              {/* 出勤中：両目ともにっこり (⌒ ⌒) */}
              <View style={{ width: 7, height: 4, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderColor: color }} />
              <View style={{ width: 7, height: 4, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderColor: color }} />
            </>
          ) : (
            <>
              {/* 出勤前：両目寝てる (︶ ︶) */}
              <View style={{ width: 7, height: 4, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderColor: color, marginTop: 2 }} />
              <View style={{ width: 7, height: 4, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderColor: color, marginTop: 2 }} />
            </>
          )}
        </View>
        {isWorking ? (
          /* 出勤中：大きく開いた口 (▽) */
          <View style={{ alignItems: 'center', marginTop: 1 }}>
            <View style={{ width: 12, height: 1.5, backgroundColor: color, zIndex: 2 }} />
            <View style={{ width: 9, height: 9, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: color, transform: [{ rotate: '45deg' }], marginTop: -4.5, zIndex: 1 }} />
          </View>
        ) : (
          /* 出勤前：お口ぽかん (o) */
          <View style={{ width: 4, height: 4, borderRadius: 2, borderWidth: 1.5, borderColor: color, marginTop: 1 }} />
        )}
      </View>
      {!isWorking && (
        /* 出勤前：右上の zZ マーク */
        <View style={{ position: 'absolute', top: -2, right: -4, flexDirection: 'row', alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 10, color: '#788d9e', fontWeight: 'bold', marginTop: 4, marginRight: 1 }}>z</Text>
          <Text style={{ fontSize: 14, color: '#788d9e', fontWeight: 'bold' }}>Z</Text>
        </View>
      )}
    </View>
  );
};

export default function EmployeeSelectScreen({ navigation }) {
  const { width: currentWidth, height: currentHeight } = useWindowDimensions();
  // ★横向き判定
  const isLandscape = currentWidth > currentHeight;
  const isTablet = currentWidth >= 600 || currentHeight >= 600;

  // ★横向き時は左側バー（幅72px）の分を引いた幅でカードを均等割り
  const availableWidth = isLandscape ? currentWidth - 72 : currentWidth;
  const currentCardWidth = isTablet ? (availableWidth - 12) / 5 : (availableWidth - 10) / 4;

  const [employees, setEmployees] = useState([]);

  // ★追加: スクリーンセーバー（待機画面）用のステートとRef
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef(null);
  
  const IDLE_TIMEOUT = 5 * 60 * 1000; // 5分（300,000ミリ秒）で時計画面を表示

  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (isIdle) setIsIdle(false);
    idleTimer.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT);
  };

  // 画面のどこをタッチしてもタイマーをリセットする監視役
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetIdleTimer();
        return false;
      },
      onMoveShouldSetPanResponderCapture: () => {
        resetIdleTimer();
        return false;
      },
    })
  ).current;
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [time, setTime] = useState(new Date());

  // ★修正: 画面が手前にあるかを判定するフックを追加
  const isFocused = useIsFocused();

  // 現在ログイン中の店舗情報
  const [currentShopId, setCurrentShopId] = useState('shop_01');

  useEffect(() => {
    resetIdleTimer(); // 画面が開いたらタイマー開始
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => {
      clearInterval(timer);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  const fetchEmployees = async (shopId) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');

      const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees?shop_id=${shopId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // ★追加: 認証エラー(401)の場合は自動ログアウト処理をしてログイン画面へ戻す
      if (response.status === 401) {
        Alert.alert('セッション切れ', 'ログインの有効期限が切れました。再度ログインしてください。');
        await AsyncStorage.removeItem('@auth_token');
        await AsyncStorage.removeItem('@logged_in_user');
        navigation.replace('Login');
        return;
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        // ★修正: タイムゾーンのズレを防ぐため、今日の日付を YYYY-MM-DD 形式の文字列で取得する
        const todayDate = new Date();
        const yyyy = todayDate.getFullYear();
        const mm = String(todayDate.getMonth() + 1).padStart(2, '0');
        const dd = String(todayDate.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // 利用停止中のユーザー、および「社長」「次長」を除外してセット
        const activeEmps = data.filter((e) => {
          if (e.status === '利用停止' || e.status === '削除') return false;
          
          // ★修正: 退職日が設定されていて、かつ「今日(todayStr)」が「退職日」よりも大きい（過ぎている）場合は非表示にする
          if (e.retire_date && e.retire_date !== '-') {
            // 例: "2026/10/11" や "2026年10月11日" を "2026-10-11" に変換する
            const cleanRetireDate = String(e.retire_date)
              .replace(/[年月]/g, '-')
              .replace(/日/g, '')
              .replace(/\//g, '-');
            
            // 文字列同士での比較 (例: "2026-10-12" > "2026-10-11" であれば除外)
            if (todayStr > cleanRetireDate) {
              return false;
            }
          }

          const dept = e.department || e.office || '';
          if (dept === '社長' || dept === '次長') return false;
          
          return true;
        });
        setEmployees(activeEmps);
      }
    } catch (error) {
      console.error('従業員取得エラー:', error);
    }
  };

  const fetchTodayAttendances = async (shopId) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    try {
      const token = await AsyncStorage.getItem('@auth_token');

      let allData = [];
      const res = await fetch(
        `https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${yyyy}&month=${mm}&shop_id=${shopId}`,
        { 
          cache: 'no-store',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (res.ok) {
        allData = await res.json();
      }

      // 日跨ぎ（月末月初）対応：1日〜5日の場合は前月データも取得して最新状態を正確に判定する
      if (now.getDate() <= 5) {
        let prevM = now.getMonth();
        let prevY = yyyy;
        if (prevM === 0) { prevM = 12; prevY--; }
        const resPrev = await fetch(
          `https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${prevY}&month=${String(prevM).padStart(2, '0')}&shop_id=${shopId}`,
          { 
            cache: 'no-store',
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        if (resPrev.ok) {
          const prevData = await resPrev.json();
          allData = [...prevData, ...allData];
        }
      }

      // 今日だけのフィルタリングを外し、月全体（＋前月）のデータをセットして最新状態を維持
      setAttendances(allData);
    } catch (e) {
      console.warn('本日の打刻取得エラー:', e);
    }
  };

  // ★修正: useFocusEffectをuseEffectに置き換え、isFocusedを監視する
  useEffect(() => {
    let isMounted = true;
    let shopIdForTimer = 'shop_01';

    const initData = async () => {
      // 画面がアクティブでない時は何もしない
      if (!isFocused) return;

      setLoading(true);
      
      try {
        const locEnabled = await Location.hasServicesEnabledAsync();
        if (!locEnabled) {
          Alert.alert(
            '位置情報がオフになっています',
            '出退勤の打刻を行うには、端末の位置情報サービスをオンにしてから操作してください。'
          );
        }
      } catch (e) {
        console.warn('位置情報チェックエラー', e);
      }

      try {
        const userStr = await AsyncStorage.getItem('@logged_in_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          shopIdForTimer = user.shop_id || 'shop_01';
          
          const shopList = {
            'shop_01': 'TH国分寺', 'shop_02': 'TH立川', 'shop_03': 'TH品川', 'shop_04': 'TH大田東京',
            'shop_05': 'TH練馬', 'shop_06': 'TH城東', 'shop_07': 'TH武蔵野', 'shop_08': 'TH町田',
            'shop_09': 'TH溝の口', 'shop_10': 'TH横浜', 'shop_11': 'TH湘南', 'shop_12': 'TH川口',
            'shop_13': 'TH浦和', 'shop_14': 'TH新都心', 'shop_15': 'TH船橋', 'shop_16': 'TH新小岩',
            'shop_17': 'TH杉並', 'shop_18': 'TH世田谷', 'shop_19': 'TH横浜西口', 'shop_20': 'TH松戸',
            'shop_21': 'TH調布', 'shop_22': 'TH王子', 'shop_23': 'TH横浜戸塚', 'shop_24': 'TH逗子・葉山リゾート',
            'shop_25': 'TH東京', 'shop_26': 'TH新横浜', 'shop_27': 'TH江坂', 'shop_28': 'TH名古屋城東',
            'shop_29': 'TH名古屋中央', 'shop_30': 'TH柏', 'shop_31': 'NEXT'
          };
          const shopName = shopList[shopIdForTimer] || '店舗未設定';
          setCurrentShopId(shopIdForTimer);
          navigation.getParent()?.setOptions({ title: `🕒 ${shopName}` });
        }
      } catch (e) {
        console.warn('ログイン情報読み込みエラー:', e);
      }

      await Promise.all([
        fetchEmployees(shopIdForTimer),
        fetchTodayAttendances(shopIdForTimer)
      ]);
      if (isMounted) setLoading(false);
    };

    initData();

    // 画面が手前に来た直後と、API反映待ちの2.5秒後に再取得する
    const timer1 = setTimeout(() => {
      if (isMounted && isFocused) fetchTodayAttendances(shopIdForTimer);
    }, 1000);
    const timer2 = setTimeout(() => {
      if (isMounted && isFocused) fetchTodayAttendances(shopIdForTimer);
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isFocused, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEmployees(currentShopId), fetchTodayAttendances(currentShopId)]);
    setRefreshing(false);
  };

  const getCountForTab = (tab) => {
    if (!tab.regex) return employees.length;
    return employees.filter((e) => e.kana && tab.regex.test(e.kana.trim())).length;
  };

  const currentTabObj = INITIAL_TABS.find((t) => t.label === selectedTab);
  const filteredEmployees = employees.filter((e) => {
    if (!currentTabObj || !currentTabObj.regex) return true;
    return e.kana && currentTabObj.regex.test(e.kana.trim());
  });

  const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  const dateStr = `${String(time.getMonth() + 1).padStart(2, '0')}/${String(time.getDate()).padStart(2, '0')}`;
  const dayStr = dayNames[time.getDay()];
  const hhmmStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  const ssStr = `:${String(time.getSeconds()).padStart(2, '0')}`;

  const renderEmployeeItem = ({ item }) => {
    // 当日の打刻履歴をすべて取得
    const empAtts = attendances.filter((a) => Number(a.employee_id) === Number(item.id));
    
    // ★ 複数回の打刻があっても、「退勤していない（clock_outが空）データ」が1つでもあれば出勤中とする
    const activeAtt = empAtts.find(a => a.clock_in && !a.clock_out);
    const isWorking = !!activeAtt;
    
    // 出勤時刻は、現在出勤中のデータがあればそれを表示。なければ最後の打刻の出勤時刻を表示。
    let clockInTime = '';
    if (activeAtt) {
      clockInTime = activeAtt.clock_in.substring(0, 5);
    } else if (empAtts.length > 0) {
      const lastAtt = empAtts[empAtts.length - 1];
      clockInTime = lastAtt.clock_in ? lastAtt.clock_in.substring(0, 5) : '';
    }

    return (
      <TouchableOpacity
        style={[
          styles.cardItem,
          {
            width: currentCardWidth,
            height: isTablet ? currentCardWidth : 96, // ★高さを横幅と同じにして正方形（1:1）にする
            paddingVertical: isTablet ? 10 : 4, // 上下の余白を少し広げる
          },
          isWorking ? styles.cardWorking : styles.cardOff,
        ]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('TimeClock', { empId: item.id, empName: item.name })}
      >
        {isWorking ? (
          <View style={[styles.timeBadge, isTablet && { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }]}>
            <Text style={[styles.timeBadgeText, isTablet && { fontSize: 12 }]}>○ {clockInTime}</Text>
          </View>
        ) : (
          <View style={styles.timeBadgePlaceholder} />
        )}
        
        {/* ★正方形の中でアイコンが綺麗に中央に配置されるよう flex: 1 を追加し、さらに拡大 */}
        <View style={[{ transform: [{ scale: isTablet ? 2.5 : 1 }] }, isTablet && { flex: 1, justifyContent: 'center' }]}>
          <SmaregiFaceIcon isWorking={isWorking} />
        </View>

        <Text style={[styles.empNameText, isTablet && { fontSize: 14, fontWeight: 'bold', marginBottom: 2 }, isWorking && styles.empNameWorkingText]} numberOfLines={2}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.headerClockBar}>
        <View style={styles.headerDateBox}>
          <Text style={styles.headerDateText}>
            {dateStr}
            <Text style={styles.headerDayText}>{dayStr}</Text>
          </Text>
        </View>
        <View style={styles.clockBox}>
          <Text style={styles.clockMainText}>{hhmmStr}</Text>
          <Text style={styles.clockSecText}>{ssStr}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.6}>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* メインエリア：横向き時は左右横並び、縦向き時は上下並び */}
      <View style={isLandscape ? styles.bodyLandscape : styles.bodyPortrait}>
        {/* ★横向きの時は左側に五十音バーを配置 */}
        {isLandscape && (
          <View style={styles.leftTabBar}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.tabScrollVertical}
            >
              {INITIAL_TABS.map((tab) => {
                const count = getCountForTab(tab);
                const isActive = selectedTab === tab.label;
                return (
                  <TouchableOpacity
                    key={tab.label}
                    style={[styles.tabBtnVertical, isActive && styles.tabBtnActive]}
                    onPress={() => setSelectedTab(tab.label)}
                  >
                    <Text style={[styles.tabLabelVertical, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                    <Text style={[styles.tabCountVertical, isActive && styles.tabCountActive]}>({count})</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 従業員グリッド */}
        <View style={styles.gridWrapper}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={COLORS.primary || '#0073ea'} />
            </View>
          ) : (
            <FlatList
              key={isTablet ? (isLandscape ? 'cols-5-land' : 'cols-5-port') : 'cols-4'}
              data={filteredEmployees}
              extraData={currentWidth}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderEmployeeItem}
              numColumns={isTablet ? 5 : 4}
              contentContainerStyle={styles.gridContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary || '#0073ea']} />
              }
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>該当する従業員がいません</Text>
                </View>
              }
            />
          )}
        </View>

        {/* ★縦向きの時は従来通り下部に配置 */}
        {!isLandscape && (
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
        )}
      </View>

      {/* ★追加: 5分放置時のスクリーンセーバー（時計画面） */}
      <Modal visible={isIdle} animationType="fade" transparent={false}>
        <TouchableWithoutFeedback onPress={resetIdleTimer}>
          <View style={styles.idleScreen}>
            <View style={styles.idleContent}>
              <Ionicons name="time-outline" size={screenWidth >= 600 ? 140 : 80} color="#ffffff" style={styles.idleIcon} />
              <View style={styles.idleTextContainer}>
                <Text style={styles.idleDate}>
                  {dateStr} {dayStr}
                </Text>
                <View style={styles.idleTimeRow}>
                  <Text style={styles.idleTime}>{hhmmStr}</Text>
                  <Text style={styles.idleSeconds}>{ssStr}</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eaf1f8' },
  headerClockBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#d6e2ee' },
  headerDateBox: { minWidth: 110 },
  headerDateText: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  headerDayText: { fontSize: 12, color: '#64748b', marginLeft: 3 },
  clockBox: { flexDirection: 'row', alignItems: 'baseline' },
  clockMainText: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary || '#0073ea', fontFamily: 'monospace' },
  clockSecText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary || '#0073ea', fontFamily: 'monospace' },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  refreshIcon: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary || '#0073ea', marginTop: -2 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gridContainer: { paddingHorizontal: 3, paddingTop: 4, paddingBottom: 20 },
  cardItem: { width: cardWidth, height: 96, margin: 1, borderRadius: 3, padding: 4, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  cardWorking: { backgroundColor: COLORS.primary || '#0073ea', borderColor: '#005bb5' },
  cardOff: { backgroundColor: '#dce7f2', borderColor: '#b8ccdf' },
  timeBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingVertical: 1, paddingHorizontal: 5, borderRadius: 8 },
  timeBadgeText: { fontSize: 9.5, fontWeight: 'bold', color: COLORS.primary || '#0073ea' },
  timeBadgePlaceholder: { height: 14 },
  faceCircle: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  faceEyesRow: { flexDirection: 'row', justifyContent: 'space-between', width: 18, marginBottom: 4, alignItems: 'center' },
  winkEye: { width: 6, height: 3, borderTopWidth: 1.5, borderRadius: 3 },
  openEye: { width: 4, height: 4, borderRadius: 2 },
  closedEye: { width: 5, height: 3, borderBottomWidth: 1.5, borderRadius: 2 },
  smileMouth: { width: 14, height: 6, borderBottomWidth: 1.5, borderRadius: 7 },
  empNameText: { fontSize: 11, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
  empNameWorkingText: { color: '#ffffff' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#666666' },
  /* ★追加: 横向き・縦向きのコンテナスタイル */
  bodyLandscape: { flex: 1, flexDirection: 'row' },
  bodyPortrait: { flex: 1, flexDirection: 'column' },
  gridWrapper: { flex: 1 },
  /* ★追加: 左側五十音バースタイル */
  leftTabBar: {
    width: 72,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    paddingVertical: 4,
  },
  tabScrollVertical: {
    paddingVertical: 4,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  tabBtnVertical: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    marginVertical: 2,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tabLabelVertical: { fontSize: 13, fontWeight: 'bold', color: '#475569' },
  tabCountVertical: { fontSize: 9.5, color: '#64748b', marginTop: 1 },
  bottomTabBar: { backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingVertical: 6 },
  tabScroll: { paddingHorizontal: 6, flexGrow: 1, flexDirection: 'row' },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: screenWidth >= 600 ? 2 : 8,
    borderRadius: 5,
    backgroundColor: '#f1f5f9',
    marginHorizontal: screenWidth >= 600 ? 2 : 3,
    minWidth: screenWidth >= 600 ? 0 : 52,
    flex: screenWidth >= 600 ? 1 : 0,
    aspectRatio: screenWidth >= 600 ? 1 : undefined, // iPadの時のみ正方形（1:1）にする
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tabBtnActive: { backgroundColor: COLORS.primary || '#0073ea', borderColor: COLORS.primary || '#0073ea' },
  tabLabel: { fontSize: screenWidth >= 600 ? 16 : 11, fontWeight: 'bold', color: '#475569' },
  tabLabelActive: { color: '#ffffff' },
  tabCount: { fontSize: screenWidth >= 600 ? 12 : 9.5, color: '#64748b', marginTop: screenWidth >= 600 ? 4 : 1 },
  tabCountActive: { color: '#ffffff' },
  /* ★追加: スクリーンセーバースタイル（TOHOカラー版・スマホ/タブレット自動調整） */
  idleScreen: {
    flex: 1,
    backgroundColor: COLORS.primary || '#005bb5', // TOHOカラーの背景
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  idleContent: {
    flexDirection: screenWidth >= 600 ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleIcon: {
    marginRight: screenWidth >= 600 ? 40 : 0,
    marginBottom: screenWidth >= 600 ? 0 : 16,
    opacity: 0.9,
  },
  idleTextContainer: {
    justifyContent: 'center',
    alignItems: screenWidth >= 600 ? 'flex-start' : 'center',
  },
  idleDate: {
    color: '#ffffff',
    fontSize: screenWidth >= 600 ? 40 : 22,
    fontWeight: '300',
    marginBottom: screenWidth >= 600 ? -10 : 4,
    letterSpacing: screenWidth >= 600 ? 2 : 1,
    opacity: 0.9,
    textAlign: screenWidth >= 600 ? 'left' : 'center',
  },
  idleTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  idleTime: {
    color: '#ffffff',
    fontSize: screenWidth >= 600 ? 140 : 68,
    fontWeight: '200',
    letterSpacing: screenWidth >= 600 ? 2 : 1,
  },
  idleSeconds: {
    color: '#ffffff',
    fontSize: screenWidth >= 600 ? 50 : 26,
    fontWeight: '200',
    marginLeft: screenWidth >= 600 ? 8 : 6,
    opacity: 0.9,
  },
});