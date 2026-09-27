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
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('ALL');

  // バックエンドAPIから従業員一覧を取得
  useEffect(() => {
    fetchEmployees();
  }, []);

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

  // 従業員カード（パネル）のレンダリング
  const renderEmployeeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.empCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('TimeClock', { empId: item.id, empName: item.name })}
    >
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>👤</Text>
      </View>
      <Text style={styles.empName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.empOffice} numberOfLines={1}>{item.department || 'NEXT'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 画面上部：タイトル & 総人数表示 */}
      <View style={styles.topHeader}>
        <Text style={styles.topTitle}>従業員を選択してください</Text>
        <Text style={styles.totalBadge}>全 {employees.length} 名</Text>
      </View>

      {/* メイン：従業員パネル一覧 */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>従業員データを読み込み中...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEmployeeItem}
          numColumns={2} // 2列のパネル（グリッド）配置
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>該当する従業員がいません</Text>
            </View>
          }
        />
      )}

      {/* 画面下部：五十音絞り込みタブ */}
      <View style={styles.tabContainer}>
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
                <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>({count})</Text>
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
    backgroundColor: COLORS.bgMain,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  totalBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textSub,
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  empCard: {
    width: '48%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 24,
  },
  empName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  empOffice: {
    fontSize: 12,
    color: COLORS.textSub,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSub,
  },
  /* 下部五十音タブ */
  tabContainer: {
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
  },
  tabScroll: {
    paddingHorizontal: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.bgMain,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  tabCount: {
    fontSize: 10,
    color: COLORS.textSub,
  },
  tabCountActive: {
    color: '#ffffff',
  },
});