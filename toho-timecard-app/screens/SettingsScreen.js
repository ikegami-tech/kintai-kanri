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
  Modal,
  Switch,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';

export default function SettingsScreen() {
  // 設定ステート
  const [defaultEmail, setDefaultEmail] = useState('kintai@toho-next.com');
  const [useSecurityLock, setUseSecurityLock] = useState(false);
  const [requireGps, setRequireGps] = useState(true);
  const [enableGpsService, setEnableGpsService] = useState(true);
  
  // モーダル表示ステート ('account', 'mailTpl', 'security', 'calc', null)
  const [activeModal, setActiveModal] = useState(null);

  // メールテンプレート設定用（直行 / 直帰 タブ）
  const [tplType, setTplType] = useState('直行');
  const [templates, setTemplates] = useState([
    { id: '1', name: 'テンプレ1', body: 'おはようございます。\n打刻：09:00\n以上にて直行します。' },
    { id: '2', name: 'テンプレ2', body: '直行連絡です。\n本日もよろしくお願いします。' },
    { id: '3', name: 'テンプレ3', body: '直行にて業務開始いたします。' },
  ]);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [tplNameInput, setTplNameInput] = useState('');
  const [tplBodyInput, setTplBodyInput] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('@default_mail_to');
      if (savedEmail) setDefaultEmail(savedEmail);
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
      Alert.alert('保存完了', '送信先メールアドレスを保存しました。');
    } catch (e) {
      Alert.alert('エラー', '保存に失敗しました。');
    }
  };

  // テンプレート編集の保存
  const saveTemplateEdit = () => {
    if (!tplNameInput.trim()) {
      Alert.alert('エラー', 'テンプレート名を入力してください。');
      return;
    }
    setTemplates(prev => prev.map(t => t.id === selectedTpl.id ? { ...t, name: tplNameInput, body: tplBodyInput } : t));
    setSelectedTpl(null);
    Alert.alert('保存完了', 'テンプレートを更新しました。');
  };

  // テンプレート新規追加
  const addNewTemplate = () => {
    const newId = String(Date.now());
    const newTpl = {
      id: newId,
      name: `テンプレ${templates.length + 1}`,
      body: tplType === '直行' ? '直行連絡です。' : '直帰連絡です。',
    };
    setTemplates([...templates, newTpl]);
    Alert.alert('追加完了', `${newTpl.name}を追加しました。`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* 1. アカウント情報 */}
        <Text style={styles.sectionHeader}>アカウント情報</Text>
        <View style={styles.listGroup}>
          <TouchableOpacity style={styles.listItem} onPress={() => setActiveModal('account')}>
            <Text style={styles.listTitle}>アカウント詳細・端末情報</Text>
            <View style={styles.listRight}>
              <Text style={styles.listValue}>sra272v7</Text>
              <Text style={styles.chevron}>＞</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 2. メール（直行・直帰テンプレート設定） */}
        <Text style={styles.sectionHeader}>メール設定</Text>
        <View style={styles.listGroup}>
          <TouchableOpacity style={styles.listItem} onPress={() => setActiveModal('mailTpl')}>
            <Text style={styles.listTitle}>直行・直帰テンプレート設定</Text>
            <View style={styles.listRight}>
              <Text style={styles.listValue}>編集・追加</Text>
              <Text style={styles.chevron}>＞</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. 端末セキュリティロック */}
        <Text style={styles.sectionHeader}>端末セキュリティロック</Text>
        <View style={styles.listGroup}>
          <View style={styles.listItem}>
            <Text style={styles.listTitle}>利用する</Text>
            <View style={styles.listRight}>
              <Switch
                value={useSecurityLock}
                onValueChange={setUseSecurityLock}
                trackColor={{ true: COLORS.primary || '#0073ea', false: '#dcdfe6' }}
              />
            </View>
          </View>
          {useSecurityLock && (
            <>
              <TouchableOpacity style={styles.listItem} onPress={() => Alert.alert('セキュリティコード', 'コードを変更します。')}>
                <Text style={styles.listTitle}>セキュリティコード変更</Text>
                <Text style={styles.chevron}>＞</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.listItem} onPress={() => Alert.alert('警告', '全データを削除しますか？', [{ text: 'キャンセル' }, { text: '削除', style: 'destructive' }])}>
                <Text style={[styles.listTitle, { color: '#e74c3c' }]}>データ削除</Text>
                <Text style={styles.chevron}>＞</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        <Text style={styles.subFooterText}>
          セキュリティコード入力を5回間違えると、アプリ内の全データを削除します。
        </Text>

        {/* 4. 事業所 */}
        <Text style={styles.sectionHeader}>事業所</Text>
        <View style={styles.listGroup}>
          <View style={styles.listItem}>
            <Text style={styles.listTitle}>事業所名</Text>
            <View style={styles.listRight}>
              <Text style={styles.listValue}>東宝ハウス NEXT 事業部</Text>
            </View>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.listTitle}>位置情報を必須にする</Text>
            <View style={styles.listRight}>
              <Switch
                value={requireGps}
                onValueChange={setRequireGps}
                trackColor={{ true: COLORS.primary || '#0073ea', false: '#dcdfe6' }}
              />
            </View>
          </View>
        </View>
        <Text style={styles.subFooterText}>
          位置情報の必須設定は [管理画面 ＞ 事業所 ＞ [設定したい事業所] ＞ 設定を編集] から設定することができます。
        </Text>

        {/* 5. 位置情報サービス */}
        <Text style={styles.sectionHeader}>位置情報サービス</Text>
        <View style={styles.listGroup}>
          <View style={styles.listItem}>
            <Text style={styles.listTitle}>位置情報サービス</Text>
            <View style={styles.listRight}>
              <Switch
                value={enableGpsService}
                onValueChange={setEnableGpsService}
                trackColor={{ true: COLORS.primary || '#0073ea', false: '#dcdfe6' }}
              />
            </View>
          </View>
        </View>
        <Text style={styles.subFooterText}>
          位置情報サービスを有効にすると従業員の位置情報を送信します。
        </Text>

        {/* 6. 計算方法 */}
        <Text style={styles.sectionHeader}>計算方法</Text>
        <View style={styles.listGroup}>
          <TouchableOpacity style={styles.listItem} onPress={() => setActiveModal('calc')}>
            <Text style={styles.listTitle}>端数処理ルール・例一覧</Text>
            <View style={styles.listRight}>
              <Text style={styles.listValue}>出勤/退勤/直行/直帰</Text>
              <Text style={styles.chevron}>＞</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.subFooterText}>
          出勤：1分を切り上げ {'\n'}
          退勤：1分を切り捨て {'\n'}
          直行：1分を切り上げ {'\n'}
          直帰：1分を切り捨て {'\n\n'}
          勤務時間の計算は、以上の設定で計算されます。例) 出勤[15分↑] 退勤[15分↓] 休憩[15分↓] 復帰[15分↑] の場合、計算前 勤務 08:46〜18:44 (休憩 12:10〜13:10) が 計算後 勤務 09:00〜18:30 (休憩 12:00〜13:15) となり 勤務時間は8時間15分となります。丸めの設定は、管理画面 ＞ 事業所 ＞ [設定したい事業所] ＞ 設定を編集 から変更することができます。
        </Text>

        {/* 7. その他（自動ロック） */}
        <Text style={styles.sectionHeader}>その他（自動ロック）</Text>
        <View style={[styles.listGroup, { marginBottom: 10 }]}>
          <TouchableOpacity style={styles.listItem} onPress={() => Alert.alert('自動ロック設定', '端末のスリープ設定を変更します。')}>
            <Text style={styles.listTitle}>自動スリープ設定</Text>
            <View style={styles.listRight}>
              <Text style={styles.listValue}>システム標準</Text>
              <Text style={styles.chevron}>＞</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={[styles.subFooterText, { marginBottom: 40 }]}>
          自動ロックを変更することで端末のスリープ/スリープ解除を設定できます。
        </Text>

      </ScrollView>

      {/* --- 詳細表示モーダル群 --- */}
      <Modal visible={activeModal !== null} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          {/* モーダルヘッダー */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setActiveModal(null); setSelectedTpl(null); }} style={styles.backBtnBox}>
              <Text style={styles.backBtn}>＜ 戻る</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>
              {activeModal === 'account' ? 'アカウント情報' :
               activeModal === 'mailTpl' ? 'メールテンプレート設定' :
               activeModal === 'calc' ? '計算方法の指定' : '詳細'}
            </Text>
            <View style={styles.backBtnBox} />
          </View>

          <ScrollView style={styles.modalBody}>
            {/* 1. アカウント情報詳細 */}
            {activeModal === 'account' && (
              <View style={styles.detailCard}>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>管理画面URL</Text><Text style={styles.infoVal}>kintai.thnsys.com</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>メールアドレス</Text><Text style={styles.infoVal}>kintai@toho-next.com</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>契約ID</Text><Text style={styles.infoVal}>sra272v7</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>端末名</Text><Text style={styles.infoVal}>社用iPad / iPhone</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>端末識別番号</Text><Text style={styles.infoVal}>DEV-9920184-NEXT</Text></View>

                <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={() => Alert.alert('完了', '最新データを取得しました。')}>
                  <Text style={styles.primaryBtnText}>データ再取得</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.dangerBtn, { marginTop: 12 }]} onPress={() => Alert.alert('ログアウト', 'ログアウトしました。')}>
                  <Text style={styles.dangerBtnText}>ログアウト</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 2. メール（直行・直帰テンプレート設定） */}
            {activeModal === 'mailTpl' && (
              <View>
                {/* 送信先メール変更 */}
                <View style={[styles.detailCard, { marginBottom: 16 }]}>
                  <Text style={styles.inputLabel}>デフォルト送信先メールアドレス</Text>
                  <TextInput style={styles.textInput} value={defaultEmail} onChangeText={setDefaultEmail} keyboardType="email-address" />
                  <TouchableOpacity style={styles.primaryBtn} onPress={saveEmailSetting}>
                    <Text style={styles.primaryBtnText}>送信先を保存</Text>
                  </TouchableOpacity>
                </View>

                {/* 直行 / 直帰 切替タブ */}
                <View style={styles.tabHeaderRow}>
                  <TouchableOpacity style={[styles.typeTab, tplType === '直行' && styles.typeTabActive]} onPress={() => setTplType('直行')}>
                    <Text style={[styles.typeTabText, tplType === '直行' && styles.typeTabTextActive]}>直行</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeTab, tplType === '直帰' && styles.typeTabActive]} onPress={() => setTplType('直帰')}>
                    <Text style={[styles.typeTabText, tplType === '直帰' && styles.typeTabTextActive]}>直帰</Text>
                  </TouchableOpacity>
                </View>

                {selectedTpl ? (
                  /* 編集画面 */
                  <View style={styles.detailCard}>
                    <Text style={styles.inputLabel}>テンプレート名</Text>
                    <TextInput style={styles.textInput} value={tplNameInput} onChangeText={setTplNameInput} />
                    <Text style={styles.inputLabel}>文章内容</Text>
                    <TextInput style={[styles.textInput, { height: 120 }]} value={tplBodyInput} onChangeText={setTplBodyInput} multiline textAlignVertical="top" />
                    <View style={styles.btnRow}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedTpl(null)}><Text style={styles.cancelBtnText}>戻る</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.primaryBtn} onPress={saveTemplateEdit}><Text style={styles.primaryBtnText}>保存</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* テンプレート一覧 */
                  <View style={styles.detailCard}>
                    {templates.map((tpl) => (
                      <TouchableOpacity
                        key={tpl.id}
                        style={styles.tplListItem}
                        onPress={() => {
                          setSelectedTpl(tpl);
                          setTplNameInput(tpl.name);
                          setTplBodyInput(tpl.body);
                        }}
                      >
                        <Text style={styles.tplListTitle}>{tpl.name}</Text>
                        <Text style={styles.chevron}>編集 ＞</Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity style={styles.addTplBtn} onPress={addNewTemplate}>
                      <Text style={styles.addTplBtnText}>＋ 新しいテンプレートを追加</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* 3. 計算方法詳細 */}
            {activeModal === 'calc' && (
              <View style={styles.detailCard}>
                <Text style={styles.inputLabel}>端数処理の定義</Text>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>出勤</Text><Text style={styles.infoVal}>1分を切り上げ</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>退勤</Text><Text style={styles.infoVal}>1分を切り捨て</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>直行</Text><Text style={styles.infoVal}>1分を切り上げ</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>直帰</Text><Text style={styles.infoVal}>1分を切り捨て</Text></View>

                <Text style={[styles.inputLabel, { marginTop: 20 }]}>計算例</Text>
                <Text style={styles.calcExampleText}>
                  【計算前】{'\n'}
                  勤務: 08:46 〜 18:44 (休憩 12:10〜13:10){'\n\n'}
                  【計算後】{'\n'}
                  勤務: 09:00 〜 18:30 (休憩 12:00〜13:15){'\n'}
                  ⇒ 勤務時間: 8時間15分
                </Text>
              </View>
            )}
          </ScrollView>
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
    paddingTop: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
    marginLeft: 16,
    marginBottom: 6,
    marginTop: 18,
  },
  subFooterText: {
    fontSize: 11.5,
    color: '#888888',
    marginHorizontal: 16,
    marginTop: 6,
    lineHeight: 17,
  },
  listGroup: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listTitle: {
    fontSize: 14.5,
    color: '#1e293b',
  },
  listRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listValue: {
    fontSize: 13.5,
    color: '#64748b',
    marginRight: 8,
  },
  chevron: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },

  /* モーダル用スタイル */
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
    fontSize: 14,
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
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 13.5,
    color: '#64748b',
  },
  infoVal: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary || '#0073ea',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dangerBtn: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  /* テンプレート切替タブ */
  tabHeaderRow: {
    flexDirection: 'row',
    marginBottom: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    padding: 2,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 5,
  },
  typeTabActive: {
    backgroundColor: COLORS.primary || '#0073ea',
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
  },
  typeTabTextActive: {
    color: '#ffffff',
  },
  tplListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tplListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addTplBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary || '#0073ea',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
  },
  addTplBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary || '#0073ea',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  calcExampleText: {
    fontSize: 12.5,
    color: '#334155',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    lineHeight: 18,
  },
});