import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

export default function LoginScreen({ navigation }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // 起動時にすでにログインしているか（記憶されているか）をチェック
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('@logged_in_user');
      if (savedUser) {
        // ログイン情報があれば、そのままメイン画面（ドロワー）へ遷移
        navigation.replace('Main');
      } else {
        setChecking(false);
      }
    } catch (e) {
      setChecking(false);
    }
  };

  // ログインボタンを押したときの処理
  const handleLogin = async () => {
    if (!loginId.trim() || !password.trim()) {
      Alert.alert('エラー', 'ログインIDとパスワードを入力してください。');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ログインに失敗しました');
      }

      // ログイン成功時、ユーザー情報を端末に記憶してメイン画面へ
      await AsyncStorage.setItem('@logged_in_user', JSON.stringify(data.user));
      navigation.replace('Main');

    } catch (error) {
      Alert.alert('ログインエラー', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 状態チェック中はローディング表示
  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary || '#0073ea'} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* ロゴ・タイトルエリア */}
        <View style={styles.headerBox}>
          <Text style={styles.title}>勤怠管理</Text>
          <Text style={styles.badge}>TIME CARD</Text>
        </View>

        <Text style={styles.subTitle}>ログイン</Text>

        {/* 入力フォーム */}
        <View style={styles.formGroup}>
          <TextInput
            style={styles.input}
            placeholder="ログインID (またはメールアドレス)"
            placeholderTextColor="#94a3b8"
            value={loginId}
            onChangeText={setLoginId}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.formGroup}>
          <TextInput
            style={styles.input}
            placeholder="パスワード"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* ログインボタン */}
        <TouchableOpacity 
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginBtnText}>ログイン</Text>
          )}
        </TouchableOpacity>

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>クラウドサービス 勤怠管理シリーズ</Text>
          <Text style={styles.footerText}>© TOHO Systems Inc.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7f9',
  },
  container: {
    flex: 1,
    backgroundColor: '#f4f7f9',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  headerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#002a5c', // TOHOネイビー
  },
  badge: {
    backgroundColor: COLORS.primary || '#0073ea',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 10,
    overflow: 'hidden',
  },
  subTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  loginBtn: {
    backgroundColor: COLORS.primary || '#0073ea',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0073ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  loginBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 60,
    alignItems: 'center',
  },
  footerText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 20,
  },
});