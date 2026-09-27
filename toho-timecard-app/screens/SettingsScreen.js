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
  Switch,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';

export default function SettingsScreen() {
  const [defaultEmail, setDefaultEmail] = useState('kintai@toho-next.com');
  const [locationStatus, setLocationStatus] = useState('確認中...');
  const [testingGps, setTestingGps] = useState(false);
  const [gpsResult, setGpsResult] = useState('');

  // 起動時に保存された設定を読み込み
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

  // メールアドレス設定の保存
  const saveEmailSetting = async () => {
    if (!defaultEmail.trim()) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください。');
      return;
    }
    try {
      await AsyncStorage.setItem('@default_mail_to', defaultEmail.trim());
      Alert.alert('保存完了', 'デフォルトの送信先メールアドレスを保存しました。');
    } catch (e) {
      console.error('設定保存エラー:', e);
      Alert.alert('エラー', '設定の保存に失敗しました。');
    }
  };

  // 位置情報権限のチェック
  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationStatus('許可済み (ON)');
      } else {
        setLocationStatus('未許可 (OFF)');
      }
    } catch (e) {
      setLocationStatus('取得失敗');
    }
  };

  // GPSテスト取得
  const testGpsLocation = async () => {
    setTestingGps(true);
    setGpsResult('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('未許可 (OFF)');
        setGpsResult('位置情報の利用が許可されていません。端末の設定から許可してください。');
        return;
      }
      setLocationStatus('許可済み (ON)');
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
        {/* セクション1: メール設定 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📧 メール送信設定</Text>
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

        {/* セクション2: 位置情報 (GPS) テスト */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📍 位置情報 (GPS) 診断</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>権限ステータス:</Text>
            <Text style={[
              styles.statusVal,
              locationStatus.includes('許可済み') ? styles.statusOk : styles.statusNg
            ]}>
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

        {/* セクション3: アプリ情報 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ℹ️ アプリ情報</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>アプリ名</Text>
            <Text style={styles.infoVal}>TOHO勤怠管理タイムカード</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>バージョン</Text>
            <Text style={styles.infoVal}>v1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f9',
  },
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    paddingBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#dcdfe6',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: COLORS.primary || '#0073ea',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 13,
    color: '#555555',
  },
  statusVal: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusOk: {
    color: '#2ecc71',
  },
  statusNg: {
    color: '#e74c3c',
  },
  testBtn: {
    backgroundColor: '#34495e',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  testBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  resultBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoLabel: {
    fontSize: 13,
    color: '#666666',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333333',
  },
});