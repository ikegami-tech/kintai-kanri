import React from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from './constants/theme';

import LoginScreen from './screens/LoginScreen';
import EmployeeSelectScreen from './screens/EmployeeSelectScreen';
import TimeClockScreen from './screens/TimeClockScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator(); 

// ★追加：カスタムドロワーコンテンツ（ログアウトボタンをメニューの一番下に配置）
function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props}>
      {/* 既存のメニュー項目 */}
      <DrawerItemList {...props} />
      
      {/* ログアウトボタン */}
      <DrawerItem
        label="🚪 ログアウト"
        labelStyle={{
          fontSize: 16,
          fontWeight: '600',
          marginLeft: 10,
          color: 'rgba(255,255,255,0.7)',
        }}
        style={{
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.1)',
          borderRadius: 0,
          marginHorizontal: 0,
          marginVertical: 0,
        }}
        onPress={() => {
          Alert.alert('ログアウト', 'ログアウトしますか？', [
            { text: 'キャンセル', style: 'cancel' },
            { 
              text: 'ログアウト', 
              style: 'destructive',
              onPress: async () => {
                // 記憶しているユーザー情報を削除
                await AsyncStorage.removeItem('@logged_in_user');
                // ルートのスタックナビゲーターをリセットしてログイン画面に戻す
                props.navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            }
          ]);
        }}
      />
    </DrawerContentScrollView>
  );
}

// タイムカード（従業員選択 ➔ 打刻画面 ➔ 個人履歴画面）のスタック
function TimecardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeeSelect" component={EmployeeSelectScreen} />
      <Stack.Screen name="TimeClock" component={TimeClockScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
}

// ドロワーナビゲーション（メインアプリ部分）
function MainDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Timecard"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary || '#0073ea' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
        drawerStyle: {
          backgroundColor: '#002a5c',
          width: 280,
        },
        drawerActiveTintColor: '#ffffff',
        drawerActiveBackgroundColor: 'rgba(255,255,255,0.15)',
        drawerInactiveTintColor: 'rgba(255,255,255,0.7)',
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '600',
          marginLeft: 10,
        },
        drawerItemStyle: {
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.1)',
          borderRadius: 0,
          marginHorizontal: 0,
          marginVertical: 0,
        },
      }}
    >
      <Drawer.Screen 
        name="Timecard" 
        component={TimecardStack} 
        options={{ title: '🕒 タイムカード' }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: '⚙️ 設定' }}
      />
    </Drawer.Navigator>
  );
}

// アプリ全体のルートナビゲーション
export default function App() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {/* 初期画面をログイン画面に設定 */}
        <RootStack.Screen name="Login" component={LoginScreen} />
        {/* ログイン成功後に遷移するメイン画面 */}
        <RootStack.Screen name="Main" component={MainDrawer} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}