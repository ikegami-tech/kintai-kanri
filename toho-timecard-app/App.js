import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from './constants/theme';

import EmployeeSelectScreen from './screens/EmployeeSelectScreen';
import TimeClockScreen from './screens/TimeClockScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// タイムカード（従業員選択 ➔ 打刻画面）のスタック
function TimecardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeeSelect" component={EmployeeSelectScreen} />
      <Stack.Screen name="TimeClock" component={TimeClockScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
}

// メインのナビゲーション（サイドメニュー）
export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="Timecard"
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary || '#0073ea' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
          /* ドロワー（左メニュー）全体のスタイル */
          drawerStyle: {
            backgroundColor: '#002a5c', // TOHOブルーの深いネイビー
            width: 280,
          },
          drawerActiveTintColor: '#ffffff',
          drawerActiveBackgroundColor: 'rgba(255,255,255,0.15)',
          drawerInactiveTintColor: 'rgba(255,255,255,0.7)',
          /* テキストと余白（窮屈さの解消） */
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
          name="History" 
          component={HistoryScreen} 
          options={{ title: '📋 出勤履歴' }}
        />
        <Drawer.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ title: '⚙️ 設定' }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}