import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';

export default function SettingsScreen() {
  const [defaultEmail, setDefaultEmail] = useState('kintai@toho-next.com');
  const [locationStatus, setLocationStatus] = useState('確認中...');
  const [testingGps, setTestingGps] = useState(false);
  const [gpsResult, setGpsResult] = useState('');
  
  // 開いている詳細モーダルの種類 ('mail', 'gps', 'info', null)
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    loadSettings();
    checkLocationPermission();
  }, []);

  const loadSettings = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('@default_mail_to');
      if (savedEmail) {
        setDefaultEmail(savedEmail);
      }
    } catch (e) {
      console.warn('設定読み込みエラー:', e);
    }
  };

  const saveEmailSetting = async () => {
    if (!defaultEmail.trim()) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください。');
      return;
    }
    try {
      await AsyncStorage.setItem('@default_mail_to', defaultEmail.trim());
      Alert.alert('保存完了', 'デフォルトの送信先メールアドレスを保存しました。');
      setActiveModal(null); // 保存後にモーダルを閉じる
    } catch (e) {
      console.error('設定保存エラー:', e);
      Alert.alert('エラー', '設定の保存に失敗しました。');
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationStatus('許可済み');
      } else {
        setLocationStatus('未許可');
      }
    } catch (e) {
      setLocationStatus('取得失敗');
    }
  };

  const testGpsLocation = async () => {
    setTestingGps(true);
    setGpsResult('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('未許可');
        setGpsResult('位置情報の利用が許可されていません。端末の設定から許可してください。');
        return;
      }
      setLocationStatus('許可済み');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGpsResult(`取得成功！\n緯度: ${loc.coords.latitude.toFixed(6)}\n経度: ${loc.coords.longitude.toFixed(6)}`);
    } catch (e) {
      setGpsResult('GPS座標の取得に失敗しました。屋内や電波の状態を確認してください。');
    } finally {
      setTestingGps(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* スマレジ風 リスト形式の設定メニュー */}
        <Text style={styles.sectionHeader}>アプリ設定</Text>
        <View style={styles.listGroup}>
          <TouchableOpacity style={styles.listItem} onPress={() => setActiveModal('mail')}>
            <Text style={styles.listTitle}>メール送信設定</Text>
            <View style={styles.listRight}>
              <Text style={styles.listValue} numberOfLines={1}>{defaultEmail}</Text>
              <Text style={styles.chevron}>＞</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem} onPress={() => setActiveModal('gps')}>
            <Text style={styles.listTitle}>位置情報 (GPS) 診断</Text>
            <View style={styles.listRight}>
              <Text style={[styles.listValue, locationStatus === '許可済み' ? styles.statusOk : styles.statusNg]}>
                {locationStatus}
              </Text>
              <Text style={styles.chevron}>＞</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>システム</Text>
        <View style={styles.listGroup}>
          <TouchableOpacity style={styles.listItem} onPress={() => setActiveModal('info')}>
            <Text style={styles.listTitle}>アプリ情報</Text>
            <View style={styles.listRight}>
              <Text style={styles.listValue}>v1.0.0</Text>
              <Text style={styles.chevron}>＞</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* --- 詳細設定モーダル群 --- */}
      <Modal visible={activeModal !== null} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          {/* モーダルヘッダー */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backBtnBox}>
              <Text style={styles.backBtn}>＜ 戻る</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>
              {activeModal === 'mail' ? 'メール送信設定' : activeModal === 'gps' ? '位置情報 (GPS) 診断' : 'アプリ情報'}
            </Text>
            <View style={styles.backBtnBox} /> {/* レイアウト調整用 */}
          </View>

          <View style={styles.modalBody}>
            {/* 1. メール送信設定の詳細 */}
            {activeModal === 'mail' && (
              <View style={styles.detailCard}>
                <Text style={styles.inputLabel}>直行・直帰連絡のデフォルト送信先</Text>
                <TextInput
                  style={styles.textInput}
                  value={defaultEmail}
                  onChangeText={setDefaultEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.saveBtn} onPress={saveEmailSetting}>
                  <Text style={styles.saveBtnText}>設定を保存</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 2. GPS診断の詳細 */}
            {activeModal === 'gps' && (
              <View style={styles.detailCard}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>現在の権限ステータス:</Text>
                  <Text style={[styles.statusVal, locationStatus === '許可済み' ? styles.statusOk : styles.statusNg]}>
                    {locationStatus}
                  </Text>
                </View>

                <TouchableOpacity style={styles.testBtn} onPress={testGpsLocation} disabled={testingGps}>
                  {testingGps ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.testBtnText}>GPS取得テストを実行</Text>
                  )}
                </TouchableOpacity>

                {gpsResult !== '' && (
                  <View style={styles.resultBox}>
                    <Text style={styles.resultText}>{gpsResult}</Text>
                  </View>
                )}
              </View>
            )}

            {/* 3. アプリ情報の詳細 */}
            {activeModal === 'info' && (
              <View style={styles.detailCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>アプリ名</Text>
                  <Text style={styles.infoVal}>TOHO勤怠管理タイムカード</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>バージョン</Text>
                  <Text style={styles.infoVal}>v1.0.0</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>開発 / 提供</Text>
                  <Text style={styles.infoVal}>株式会社東宝ハウス NEXT</Text>
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f9',
  },
  scrollContent: {
    paddingTop: 10,
  },
  sectionHeader: {
    fontSize: 13,
    color: '#666666',
    marginLeft: 16,
    marginBottom: 6,
    marginTop: 16,
  },
  listGroup: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e6ed',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  listTitle: {
    fontSize: 15,
    color: '#333333',
  },
  listRight: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  listValue: {
    fontSize: 14,
    color: '#888888',
    marginRight: 10,
  },
  chevron: {
    fontSize: 16,
    color: '#cccccc',
    fontWeight: 'bold',
  },
  statusOk: {
    color: '#0073ea',
    fontWeight: 'bold',
  },
  statusNg: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  
  /* --- モーダル (詳細画面) 用スタイル --- */
  modalContainer: {
    flex: 1,
    backgroundColor: '#f4f7f9',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary || '#0073ea',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtnBox: {
    width: 60,
  },
  backBtn: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e6ed',
  },
  inputLabel: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#dcdfe6',
    borderRadius: 6,
    padding: 12,
    fontSize: 15,
    color: '#333333',
    backgroundColor: '#f8fafc',
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: COLORS.primary || '#0073ea',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#333333',
  },
  statusVal: {
    fontSize: 15,
  },
  testBtn: {
    backgroundColor: '#34495e',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  testBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
});