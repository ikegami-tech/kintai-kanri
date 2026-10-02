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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';

export default function SettingsScreen() {
  const [user, setUser] = useState(null);
  const [shopName, setShopName] = useState('未設定');
  const [defaultEmail, setDefaultEmail] = useState('kintai@toho-next.com');
  const [requireGps, setRequireGps] = useState(true); // デフォルトON
  const [preventSleep, setPreventSleep] = useState(false);
  
  const [activeModal, setActiveModal] = useState(null);
  const [tplType, setTplType] = useState('直行');
  const [templates, setTemplates] = useState([]);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [tplNameInput, setTplNameInput] = useState('');
  const [tplBodyInput, setTplBodyInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  // ユーザー情報かタブが切り替わったらテンプレートを再取得
  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user, tplType]);

  const loadSettings = async () => {
    try {
      const userStr = await AsyncStorage.getItem('@logged_in_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setUser(u);
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
        setShopName(shopList[u.shop_id || 'shop_01'] || '店舗未設定');
      }

      const savedEmail = await AsyncStorage.getItem('@default_mail_to');
      if (savedEmail) setDefaultEmail(savedEmail);
      
      const savedGps = await AsyncStorage.getItem('@require_gps');
      if (savedGps !== null) setRequireGps(savedGps === 'true');

      // スリープ防止設定の読み込みと適用
      const savedSleep = await AsyncStorage.getItem('@prevent_sleep');
      if (savedSleep !== null) {
        const isPrevent = savedSleep === 'true';
        setPreventSleep(isPrevent);
        if (isPrevent) activateKeepAwakeAsync();
      }
    } catch (e) {
      console.warn('設定読み込みエラー:', e);
    }
  };

  const toggleRequireGps = async (value) => {
    setRequireGps(value);
    await AsyncStorage.setItem('@require_gps', String(value));
  };

  const togglePreventSleep = async (value) => {
    setPreventSleep(value);
    await AsyncStorage.setItem('@prevent_sleep', String(value));
    if (value) {
      activateKeepAwakeAsync(); // 画面を常時点灯
    } else {
      deactivateKeepAwake(); // システム標準に戻す
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

  const getDefaultTemplateBody = (type) => {
    const footer = '\n\n--------------------\n※このメールは勤怠管理システムからの自動送信です。';
    return type === '直行'
      ? `おはようございます。\n\n業務開始時間：\n開始場所：\n業務内容：\n打刻：\nその他：\n\n以上にて直行します。\n本日もよろしくお願いします。${footer}`
      : `お疲れ様です。\n\n業務終了時間：\n終了場所：\n業務相手：\n打刻：\nその他：\n\n以上にて直帰します。${footer}`;
  };

  // APIからログイン中のユーザー専用のテンプレートを取得
  const loadTemplates = async () => {
    if (!user) return;
    try {
      const res = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/mail-templates?employee_id=${user.id}&type=${encodeURIComponent(tplType)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setTemplates(data);
        } else {
          // まだ作成されていない場合はWeb版と同じデフォルト表示をセット
          setTemplates([{ id: 'default', name: 'テンプレ1', body: getDefaultTemplateBody(tplType) }]);
        }
      } else {
        setTemplates([{ id: 'default', name: 'テンプレ1', body: getDefaultTemplateBody(tplType) }]);
      }
    } catch (e) {
      console.error('テンプレート取得エラー:', e);
    }
  };

  // テンプレートの保存（DBへ更新）
  const saveTemplateEdit = async () => {
    if (!tplNameInput.trim()) {
      Alert.alert('エラー', 'テンプレート名を入力してください。');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        // 'default'（初期表示用の未保存データ）を編集した場合は新規(null)として保存する
        id: (selectedTpl && selectedTpl.id && selectedTpl.id !== 'default') ? selectedTpl.id : null,
        employee_id: user.id,
        type: tplType,
        name: tplNameInput.trim(),
        body: tplBodyInput.trim()
      };
      const res = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/mail-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('保存エラー');
      
      Alert.alert('保存完了', 'テンプレートを保存しました。');
      setSelectedTpl(null);
      await loadTemplates();
    } catch (e) {
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const addNewTemplate = () => {
    setSelectedTpl({ id: null }); // nullは新規作成フラグ
    const nextNum = templates.length > 0 && templates[0].id !== 'default' ? templates.length + 1 : 1;
    setTplNameInput(`テンプレ${nextNum}`);
    setTplBodyInput(getDefaultTemplateBody(tplType));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* メール設定 */}
        <Text style={styles.sectionHeader}>メール設定</Text>
        <View style={styles.listGroup}>
          <TouchableOpacity onPress={() => setActiveModal('mailTpl')} style={styles.listItem}>
            <Text style={styles.listTitle}>直行・直帰テンプレート設定</Text>
            <View style={styles.listRight}>
              <Text style={styles.listValue}>編集・追加</Text>
              <Text style={styles.chevron}>＞</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 事業所 */}
        <Text style={styles.sectionHeader}>事業所</Text>
        <View style={styles.listGroup}>
          <View style={styles.listItem}>
            <Text style={styles.listTitle}>事業所名</Text>
            <View style={styles.listRight}>
              <Text style={styles.listValue}>{shopName}</Text>
            </View>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.listTitle}>位置情報を必須にする</Text>
            <View style={styles.listRight}>
              <Switch 
                value={requireGps} 
                onValueChange={toggleRequireGps} 
                trackColor={{ true: COLORS.primary || '#0073ea', false: '#dcdfe6' }} 
              />
            </View>
          </View>
        </View>
        <Text style={styles.subFooterText}>
          位置情報を必須にすると、端末のGPSがOFFの場合に出退勤できなくなります。
        </Text>

        {/* 自動ロック */}
        <Text style={styles.sectionHeader}>その他（自動ロック）</Text>
        <View style={[styles.listGroup, { marginBottom: 10 }]}>
          <View style={styles.listItem}>
            <Text style={styles.listTitle}>スリープさせない (常にON)</Text>
            <View style={styles.listRight}>
              <Switch 
                value={preventSleep} 
                onValueChange={togglePreventSleep} 
                trackColor={{ true: COLORS.primary || '#0073ea', false: '#dcdfe6' }} 
              />
            </View>
          </View>
        </View>
        <Text style={[styles.subFooterText, { marginBottom: 40 }]}>
          ONにすると、アプリを開いている間は端末の画面が暗くならなくなります（店頭用タブレット等に便利です）。
        </Text>

      </ScrollView>

      {/* メールテンプレート設定モーダル */}
      <Modal visible={activeModal === 'mailTpl'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setActiveModal(null); setSelectedTpl(null); }} style={styles.backBtnBox}>
              <Text style={styles.backBtn}>＜ 戻る</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>メールテンプレート設定</Text>
            <View style={styles.backBtnBox}/>
          </View>

          <ScrollView style={styles.modalBody}>
            {user && user.role === 'システム管理者' && (
              <View style={[styles.detailCard, { marginBottom: 16 }]}>
                <Text style={styles.inputLabel}>デフォルト送信先メールアドレス</Text>
                <TextInput 
                  style={styles.textInput} 
                  value={defaultEmail} 
                  onChangeText={setDefaultEmail} 
                  keyboardType="email-address" 
                  autoCapitalize="none" 
                />
                <TouchableOpacity onPress={saveEmailSetting} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>送信先を保存</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.tabHeaderRow}>
              <TouchableOpacity onPress={() => { setTplType('直行'); setSelectedTpl(null); }} style={[styles.typeTab, tplType === '直行' && styles.typeTabActive]}>
                <Text style={[styles.typeTabText, tplType === '直行' && styles.typeTabTextActive]}>直行</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setTplType('直帰'); setSelectedTpl(null); }} style={[styles.typeTab, tplType === '直帰' && styles.typeTabActive]}>
                <Text style={[styles.typeTabText, tplType === '直帰' && styles.typeTabTextActive]}>直帰</Text>
              </TouchableOpacity>
            </View>

            {selectedTpl ? (
              <View style={styles.detailCard}>
                <Text style={styles.inputLabel}>テンプレート名</Text>
                <TextInput style={styles.textInput} value={tplNameInput} onChangeText={setTplNameInput} />
                <Text style={styles.inputLabel}>文章内容</Text>
                <TextInput 
                  style={[styles.textInput, { height: 140 }]} 
                  value={tplBodyInput} 
                  onChangeText={setTplBodyInput} 
                  multiline 
                  textAlignVertical="top" 
                />
                <View style={styles.btnRow}>
                  <TouchableOpacity onPress={() => setSelectedTpl(null)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>一覧に戻る</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={saveTemplateEdit} style={styles.primaryBtn} disabled={loading}>
                    <Text style={styles.primaryBtnText}>{loading ? '保存中...' : '保存して反映'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.detailCard}>
                {templates.map((tpl) => (
                  <TouchableOpacity 
                    key={String(tpl.id)} 
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
                <TouchableOpacity onPress={addNewTemplate} style={styles.addTplBtn}>
                  <Text style={styles.addTplBtnText}>＋ 新しいテンプレートを追加</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f9' },
  scrollContent: { paddingTop: 12 },
  sectionHeader: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginLeft: 16, marginBottom: 6, marginTop: 18 },
  subFooterText: { fontSize: 11.5, color: '#888888', marginHorizontal: 16, marginTop: 6, lineHeight: 17 },
  listGroup: { backgroundColor: '#ffffff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  listTitle: { fontSize: 14.5, color: '#1e293b' },
  listRight: { flexDirection: 'row', alignItems: 'center' },
  listValue: { fontSize: 13.5, color: '#64748b', marginRight: 8 },
  chevron: { fontSize: 14, color: '#cbd5e1', fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: '#f4f7f9' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.primary || '#0073ea', paddingHorizontal: 16, paddingVertical: 12 },
  backBtnBox: { width: 80 },
  backBtn: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  modalHeaderTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  modalBody: { padding: 16 },
  detailCard: { backgroundColor: '#ffffff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#334155', marginBottom: 6, marginTop: 10 },
  textInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 10, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc', marginBottom: 12 },
  primaryBtn: { backgroundColor: COLORS.primary || '#0073ea', paddingVertical: 12, borderRadius: 6, alignItems: 'center', flex: 1 },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  tabHeaderRow: { flexDirection: 'row', marginBottom: 10, backgroundColor: '#e2e8f0', borderRadius: 6, padding: 2 },
  typeTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 5 },
  typeTabActive: { backgroundColor: COLORS.primary || '#0073ea' },
  typeTabText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  typeTabTextActive: { color: '#ffffff' },
  tplListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tplListTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  addTplBtn: { marginTop: 14, paddingVertical: 12, borderRadius: 6, borderWidth: 1, borderColor: COLORS.primary || '#0073ea', alignItems: 'center', backgroundColor: '#f0f7ff' },
  addTplBtnText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary || '#0073ea' },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontSize: 14, fontWeight: 'bold' }
});