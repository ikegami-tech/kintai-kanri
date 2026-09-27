import React from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { COLORS } from '../constants/theme';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>設定</Text>
        <Text style={styles.subtitle}>メールテンプレート、セキュリティ等の設定を行います</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 5 },
  subtitle: { fontSize: 13, color: COLORS.textSub },
});