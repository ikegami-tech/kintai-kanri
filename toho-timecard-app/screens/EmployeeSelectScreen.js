import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    <View style={[styles.faceCircle, { borderColor: color }]}>
      <View style={styles.faceEyesRow}>
        {isWorking ? (
          <>
            <View style={[styles.winkEye, { borderColor: color }]} />
            <View style={[styles.openEye, { backgroundColor: color }]} />
          </>
        ) : (
          <>
            <View style={[styles.closedEye, { borderColor: color }]} />
            <View style={[styles.closedEye, { borderColor: color }]} />
          </>
        )}
      </View>
      <View style={[styles.smileMouth, { borderColor: color }]} />
    </View>
  );
};

export default function EmployeeSelectScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [time, setTime] = useState(new Date());

  // 現在ログイン中の店舗情報
  const [currentShopId, setCurrentShopId] = useState('shop_01');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchEmployees = async (shopId) => {
    try {
      const response = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/employees?shop_id=${shopId}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const activeEmps = data.filter((e) => e.status !== '利用停止');
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
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    try {
      const res = await fetch(
        `https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${yyyy}&month=${mm}&shop_id=${shopId}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const todayData = data.filter((item) => item.work_date === todayStr);
        setAttendances(todayData);
      }
    } catch (e) {
      console.warn('本日の打刻取得エラー:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      let shopIdForTimer = 'shop_01';

      const initData = async () => {
        setLoading(true);
        try {
          const userStr = await AsyncStorage.getItem('@logged_in_user');
          if (userStr) {
            const user = JSON.parse(userStr);
            shopIdForTimer = user.shop_id || 'shop_01';
            
            // 店舗名の判定とヘッダータイトルの書き換え (全31店舗対応)
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

      const timer = setTimeout(() => {
        if (isMounted) fetchTodayAttendances(shopIdForTimer);
      }, 1200);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }, [navigation])
  );

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

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dateStr = `${String(time.getMonth() + 1).padStart(2, '0')}/${String(time.getDate()).padStart(2, '0')}`;
  const dayStr = dayNames[time.getDay()];
  const hhmmStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  const ssStr = `:${String(time.getSeconds()).padStart(2, '0')}`;

  const renderEmployeeItem = ({ item }) => {
    const att = attendances.find((a) => Number(a.employee_id) === Number(item.id));
    const isWorking = att && att.clock_in && !att.clock_out;
    const clockInTime = att && att.clock_in ? att.clock_in.substring(0, 5) : '';

    return (
      <TouchableOpacity
        style={[styles.cardItem, isWorking ? styles.cardWorking : styles.cardOff]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('TimeClock', { empId: item.id, empName: item.name })}
      >
        {isWorking ? (
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>○ {clockInTime}</Text>
          </View>
        ) : (
          <View style={styles.timeBadgePlaceholder} />
        )}
        <SmaregiFaceIcon isWorking={isWorking} />
        <Text style={[styles.empNameText, isWorking && styles.empNameWorkingText]} numberOfLines={2}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary || '#0073ea'} />
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEmployeeItem}
          numColumns={4}
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
  container: { flex: 1, backgroundColor: '#eaf1f8' },
  headerClockBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#d6e2ee' },
  headerDateBox: { width: 80 },
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
  bottomTabBar: { backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingVertical: 6 },
  tabScroll: { paddingHorizontal: 6 },
  tabBtn: { alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 5, backgroundColor: '#f1f5f9', marginHorizontal: 3, minWidth: 52, borderWidth: 1, borderColor: '#cbd5e1' },
  tabBtnActive: { backgroundColor: COLORS.primary || '#0073ea', borderColor: COLORS.primary || '#0073ea' },
  tabLabel: { fontSize: 11, fontWeight: 'bold', color: '#475569' },
  tabLabelActive: { color: '#ffffff' },
  tabCount: { fontSize: 9.5, color: '#64748b', marginTop: 1 },
  tabCountActive: { color: '#ffffff' },
});