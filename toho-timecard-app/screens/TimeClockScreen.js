import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';

export default function TimeClockScreen({ route, navigation }) {
  const empId = route.params?.empId;
  const empName = route.params?.empName || '未選択';

  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // 直行・直帰メール用ステート
  const [mailModalVisible, setMailModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('mail'); // 'mail'(メール確認) または 'tplEdit'(テンプレ編集)
  const [actionType, setActionType] = useState(''); // '直行' or '直帰'
  const [actionTimeStr, setActionTimeStr] = useState('');
  const [mailTo, setMailTo] = useState('kintai@toho-next.com');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');

  // テンプレート関連ステート
  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  // テンプレート編集・追加用ステート
  const [tplEditMode, setTplEditMode] = useState('edit'); // 'edit' or 'add'
  const [tplNameInput, setTplNameInput] = useState('');
  const [tplBodyInput, setTplBodyInput] = useState('');

  // リアルタイム時計（1秒更新）
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  // GPS位置情報（緯度・経度）を取得するヘルパー関数
  const getGpsCoords = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('位置情報エラー', '打刻には位置情報の許可が必要です。端末の設定をご確認ください。');
        return null;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return `${location.coords.latitude},${location.coords.longitude}`;
    } catch (error) {
      console.warn('GPS取得失敗:', error);
      return '';
    }
  };

  // テンプレート読み込み＆打刻時間の置換処理
  const loadTemplatesAndSetBody = async (type, hhmm) => {
    const footer = '\n\n--------------------\n※このメールは勤怠管理システムからの自動送信です。';
    const defaultTemplateBody = type === '直行'
      ? `おはようございます。\n\n業務開始時間：\n開始場所：\n業務内容：\n打刻：${hhmm}\nその他：\n\n以上にて直行します。\n本日もよろしくお願いします。${footer}`
      : `お疲れ様です。\n\n業務終了時間：\n終了場所：\n業務相手：\n打刻：${hhmm}\nその他：\n\n以上にて直帰します。${footer}`;

    let loadedTemplates = [];
    try {
      const res = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/mail-templates?employee_id=${empId}&type=${encodeURIComponent(type)}`);
      if (res.ok) {
        loadedTemplates = await res.json();
      }
    } catch (e) {
      console.warn('テンプレート取得エラー:', e);
    }

    if (!loadedTemplates || loadedTemplates.length === 0) {
      loadedTemplates = [{ id: 'default', name: 'テンプレ1', body: defaultTemplateBody }];
    }

    setTemplates(loadedTemplates);
    const firstTpl = loadedTemplates[0];
    setActiveTemplateId(firstTpl.id);

    // 打刻時間の置換
    let bodyText = firstTpl.body || defaultTemplateBody;
    if (bodyText.includes('打刻：') || bodyText.includes('打刻 :')) {
      bodyText = bodyText.replace(/(打刻\s*[:：])([^\n]*)/g, `$1 ${hhmm}`);
    } else {
      bodyText = defaultTemplateBody;
    }
    setMailBody(bodyText);
  };

  // テンプレート切替処理
  const handleSelectTemplate = (tpl) => {
    setActiveTemplateId(tpl.id);
    let bodyText = tpl.body || '';
    if (actionTimeStr) {
      bodyText = bodyText.replace(/(打刻\s*[:：])([^\n]*)/g, `$1 ${actionTimeStr}`);
    }
    setMailBody(bodyText);
  };

  // テンプレート編集・追加モードに切り替える
  const openTemplateEditModal = (mode) => {
    setTplEditMode(mode);
    if (mode === 'add') {
      setTplNameInput(`テンプレ${templates.length + 1}`);
      setTplBodyInput(mailBody || '');
    } else {
      const activeTpl = templates.find((t) => t.id === activeTemplateId);
      setTplNameInput(activeTpl ? activeTpl.name : 'テンプレ1');
      setTplBodyInput(mailBody || '');
    }
    setModalMode('tplEdit');
  };

  // テンプレート保存処理 (API送信)
  const saveTemplate = async () => {
    if (!tplNameInput.trim()) {
      Alert.alert('エラー', 'ボタン名を入力してください。');
      return;
    }

    const payload = {
      id: tplEditMode === 'edit' && activeTemplateId !== 'default' ? activeTemplateId : null,
      employee_id: empId,
      type: actionType,
      name: tplNameInput.trim(),
      body: tplBodyInput.trim(),
    };

    try {
      setLoading(true);
      const res = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/mail-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('保存に失敗しました');

      await loadTemplatesAndSetBody(actionType, actionTimeStr);
      setModalMode('mail');
      setLoading(false);

      Alert.alert('完了', tplEditMode === 'edit' ? 'テンプレートを更新しました。' : '新しいテンプレートを追加しました。');

    } catch (e) {
      console.error('テンプレート保存エラー:', e);
      setLoading(false);
      Alert.alert('エラー', 'テンプレートの保存に失敗しました。');
    }
  };

  // 出勤・退勤ボタン押下時
  const handleSimpleClock = async (type) => {
    Alert.alert('打刻確認', `${type}します。よろしいですか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'はい',
        onPress: () => submitAttendance(type, ''),
      },
    ]);
  };

  // 直行・直帰ボタン押下時（メール確認モーダルを開く）
  const handleDirectClock = async (type) => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setActionType(type);
    setActionTimeStr(hhmm);
    setMailTo('kintai@toho-next.com');

    const lastName = empName ? empName.split(/[\s ]+/)[0] : '';
    setMailSubject(`${type} ${lastName}`);

    await loadTemplatesAndSetBody(type, hhmm);
    setModalMode('mail');
    setMailModalVisible(true);
  };

  // APIへ打刻データを送信
  const submitAttendance = async (type, bodyText) => {
    if (!empId) {
      Alert.alert('エラー', '従業員情報が正しく取得できていません。一覧から選び直してください。');
      return;
    }

    try {
      setLoading(true);

      const coords = await getGpsCoords();

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const workDate = `${yyyy}-${mm}-${dd}`;
      const timeVal = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

      // 1. 当日の既存打刻レコードがあるか確認
      let existingAtt = null;
      try {
        const checkRes = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${yyyy}&month=${mm}`, { cache: 'no-store' });
        if (checkRes.ok) {
          const monthData = await checkRes.json();
          existingAtt = monthData.find(a => Number(a.employee_id) === Number(empId) && a.work_date === workDate);
        }
      } catch (checkErr) {
        console.warn('既存打刻の確認失敗:', checkErr);
      }

      // 2. 出勤時間・退勤時間の更新判定（既存データがあれば維持して統合）
      let clockInVal = existingAtt ? existingAtt.clock_in : null;
      let clockOutVal = existingAtt ? existingAtt.clock_out : null;

      if (type === '出勤' || type === '直行') {
        clockInVal = timeVal;
      } else if (type === '退勤' || type === '直帰') {
        clockOutVal = timeVal;
      }

      // 3. メモ & GPS位置情報タグの統合・重複防止ロジック
      let existingMemo = existingAtt ? (existingAtt.memo || '') : '';
      let inLoc = '';
      let outLoc = '';

      const inMatch = existingMemo.match(/\[IN_LOC:([^\]]+)\]/);
      if (inMatch) inLoc = inMatch[1];
      const outMatch = existingMemo.match(/\[OUT_LOC:([^\]]+)\]/);
      if (outMatch) outLoc = outMatch[1];

      if (type === '出勤' || type === '直行') {
        if (coords) inLoc = coords;
      } else {
        if (coords) outLoc = coords;
      }

      let memoParts = [];
      if (existingMemo.includes('管理者修正')) memoParts.push('管理者修正');
      if (existingMemo.includes('休日出勤')) memoParts.push('休日出勤');

      if (inLoc) memoParts.push(`[IN_LOC:${inLoc}]`);
      if (outLoc) memoParts.push(`[OUT_LOC:${outLoc}]`);

      // タグ・システム文字を除去した既存メモ本文を抽出して維持
      let cleanExistingMemo = existingMemo
        .replace(/\[(?:IN|OUT)_LOC:[^\]]*\]/gi, '')
        .replace(/管理者修正|休日出勤/g, '')
        .trim();

      if (type === '直行' || type === '直帰') {
        if (cleanExistingMemo) memoParts.push(cleanExistingMemo);
        memoParts.push(`${type}\n${bodyText}`);
      } else if (cleanExistingMemo) {
        memoParts.push(cleanExistingMemo);
      }

      // 4. 送信ペイロード構築 (既存IDがあれば指定して上書き更新)
      const payload = {
        id: existingAtt ? existingAtt.id : null,
        employee_id: Number(empId),
        work_date: workDate,
        clock_in: clockInVal,
        clock_out: clockOutVal,
        memo: memoParts.join('\n').trim(),
        mail_to: (type === '直行' || type === '直帰') ? mailTo : null,
        mail_subject: (type === '直行' || type === '直帰') ? mailSubject : null,
        mail_body: (type === '直行' || type === '直帰') ? bodyText : null,
        mail_from_name: empName,
      };

      const response = await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('打刻処理に失敗しました');

      Alert.alert('打刻完了', `『${empName}』様の【${type}】を完了しました。`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);

    } catch (error) {
      console.error('打刻エラー:', error);
      Alert.alert('エラー', '打刻処理に失敗しました。ネットワークの状態を確認してください。');
    } finally {
      setLoading(false);
      setMailModalVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 画面上部バー */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnBox}>
          <Text style={styles.backBtn}>＜ 従業員選択へ</Text>
        </TouchableOpacity>
        <Text style={styles.empTitle}>{empName} 様</Text>
      </View>

      {/* 中央：リアルタイム時計 */}
      <View style={styles.clockContainer}>
        <Text style={styles.clockDateStr}>
          {time.getFullYear()}年{time.getMonth() + 1}月{time.getDate()}日
        </Text>
        <Text style={styles.clockText}>{formatTime(time)}</Text>
      </View>

      {/* 下部：4つの打刻ボタン */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.statusWorking }]}
          activeOpacity={0.8}
          onPress={() => handleSimpleClock('出勤')}
        >
          <Text style={styles.btnIcon}>☀️</Text>
          <Text style={styles.btnLabel}>出勤</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
          activeOpacity={0.8}
          onPress={() => handleSimpleClock('退勤')}
        >
          <Text style={styles.btnIcon}>🌙</Text>
          <Text style={styles.btnLabel}>退勤</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.statusDirect }]}
          activeOpacity={0.8}
          onPress={() => handleDirectClock('直行')}
        >
          <Text style={styles.btnIcon}>🚶‍♂️</Text>
          <Text style={styles.btnLabel}>直行</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.statusDirect }]}
          activeOpacity={0.8}
          onPress={() => handleDirectClock('直帰')}
        >
          <Text style={styles.btnIcon}>🏠</Text>
          <Text style={styles.btnLabel}>直帰</Text>
        </TouchableOpacity>
      </View>

      {/* ローディング表示 */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>位置情報を取得＆送信中...</Text>
        </View>
      )}

      {/* 直行・直帰用 メール確認 / テンプレ編集 共通モーダル */}
      <Modal visible={mailModalVisible} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={styles.modalContent}>
                {modalMode === 'mail' ? (
                  /* --- 1. メール確認・送信画面 --- */
                  <>
                    <Text style={styles.modalTitle}>{actionType}連絡メールの確認</Text>

                    <ScrollView
                      style={styles.modalBodyScroll}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="on-drag"
                    >
                      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        <View>
                          <Text style={styles.inputLabel}>宛先</Text>
                          <TextInput
                            style={styles.textInputSingle}
                            value={mailTo}
                            onChangeText={setMailTo}
                            keyboardType="email-address"
                            autoCapitalize="none"
                          />

                          <Text style={styles.inputLabel}>件名</Text>
                          <TextInput
                            style={styles.textInputSingle}
                            value={mailSubject}
                            onChangeText={setMailSubject}
                          />

                          <Text style={styles.inputLabel}>メール本文（必要に応じて調整してください）</Text>
                          <TextInput
                            style={styles.textInputMulti}
                            value={mailBody}
                            onChangeText={setMailBody}
                            multiline={true}
                            numberOfLines={8}
                            textAlignVertical="top"
                          />

                          {/* テンプレート切り替えボタンセクション */}
                          <View style={styles.templateSection}>
                            <Text style={styles.templateSectionTitle}>テンプレート切り替え:</Text>
                            <View style={styles.templateList}>
                              {templates.map((tpl) => {
                                const isActive = tpl.id === activeTemplateId;
                                return (
                                  <TouchableOpacity
                                    key={String(tpl.id)}
                                    style={[styles.tplBtn, isActive && styles.tplBtnActive]}
                                    onPress={() => handleSelectTemplate(tpl)}
                                  >
                                    <Text style={[styles.tplBtnText, isActive && styles.tplBtnTextActive]}>
                                      {tpl.name}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>

                            <View style={styles.tplActionRow}>
                              <TouchableOpacity
                                style={styles.tplActionBtn}
                                onPress={() => openTemplateEditModal('edit')}
                              >
                                <Text style={styles.tplActionBtnText}>✏️ 編集</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.tplActionBtn}
                                onPress={() => openTemplateEditModal('add')}
                              >
                                <Text style={styles.tplActionBtnText}>＋ テンプレ追加</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </TouchableWithoutFeedback>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setMailModalVisible(false)}
                      >
                        <Text style={styles.cancelBtnText}>キャンセル</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={() => submitAttendance(actionType, mailBody)}
                      >
                        <Text style={styles.submitBtnText}>送信＆打刻</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  /* --- 2. テンプレート編集・追加画面 --- */
                  <>
                    <Text style={styles.modalTitle}>
                      {tplEditMode === 'edit' ? 'テンプレートの編集' : '新規テンプレート追加'}
                    </Text>

                    <ScrollView
                      style={styles.modalBodyScroll}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="on-drag"
                    >
                      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        <View>
                          <Text style={styles.inputLabel}>ボタン名</Text>
                          <TextInput
                            style={styles.textInputSingle}
                            value={tplNameInput}
                            onChangeText={setTplNameInput}
                            placeholder="例) テンプレ1"
                          />

                          <Text style={styles.inputLabel}>本文内容</Text>
                          <TextInput
                            style={[styles.textInputMulti, { height: 140 }]}
                            value={tplBodyInput}
                            onChangeText={setTplBodyInput}
                            multiline={true}
                            numberOfLines={6}
                            textAlignVertical="top"
                          />
                        </View>
                      </TouchableWithoutFeedback>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setModalMode('mail')}
                      >
                        <Text style={styles.cancelBtnText}>戻る</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={saveTemplate}
                      >
                        <Text style={styles.submitBtnText}>保存</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  backBtnBox: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtn: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  empTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockDateStr: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 8,
    letterSpacing: 1,
  },
  clockText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 40,
    paddingHorizontal: 10,
  },
  actionBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  btnIcon: {
    fontSize: 24,
  },
  btnLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 14,
    fontWeight: 'bold',
  },
  /* モーダルスタイル */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  modalBodyScroll: {
    maxHeight: 380,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSub,
    marginBottom: 6,
    marginTop: 10,
  },
  textInputSingle: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: COLORS.textMain,
    backgroundColor: COLORS.bgMain,
  },
  textInputMulti: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 10,
    fontSize: 13,
    color: COLORS.textMain,
    backgroundColor: COLORS.bgMain,
    height: 140,
  },
  /* テンプレートボタンエリアスタイル */
  templateSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderStyle: 'dashed',
  },
  templateSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSub,
    marginBottom: 8,
  },
  templateList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tplBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgMain,
  },
  tplBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tplBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  tplBtnTextActive: {
    color: '#ffffff',
  },
  /* ✏️ 編集 & ＋ テンプレ追加 行スタイル */
  tplActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  tplActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgMain,
  },
  tplActionBtnText: {
    fontSize: 11,
    color: COLORS.textMain,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});