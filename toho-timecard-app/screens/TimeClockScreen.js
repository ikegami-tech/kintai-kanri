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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';

export default function TimeClockScreen({ route, navigation }) {
  const empId = route.params?.empId;
  const empName = route.params?.empName || '未選択';

  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // 追加：ボタンのグレーアウト制御用ステート
  const [isWorking, setIsWorking] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  // 直行・直帰メール用ステート
  const [mailModalVisible, setMailModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('mail'); 
  const [actionType, setActionType] = useState(''); 
  const [actionTimeStr, setActionTimeStr] = useState('');
  const [mailTo, setMailTo] = useState('kintai@toho-next.com');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');

  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [tplEditMode, setTplEditMode] = useState('edit'); 
  const [tplNameInput, setTplNameInput] = useState('');
  const [tplBodyInput, setTplBodyInput] = useState('');

  // リアルタイム時計
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 追加：画面を開いた時に「現在出勤中か」を判定する
  useEffect(() => {
    let isMounted = true;
    const fetchTodayStatus = async () => {
      try {
        let currentShopId = 'shop_01';
        const userStr = await AsyncStorage.getItem('@logged_in_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          currentShopId = user.shop_id || 'shop_01';
        }

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');

        let allData = [];
        const res = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${yyyy}&month=${mm}&shop_id=${currentShopId}`, { cache: 'no-store' });
        if (res.ok) {
          allData = await res.json();
        }

        // 月末月初の日跨ぎ対応
        if (now.getDate() <= 5) {
          let prevM = now.getMonth();
          let prevY = yyyy;
          if (prevM === 0) { prevM = 12; prevY--; }
          const resPrev = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${prevY}&month=${String(prevM).padStart(2, '0')}&shop_id=${currentShopId}`, { cache: 'no-store' });
          if (resPrev.ok) {
            const prevData = await resPrev.json();
            allData = [...prevData, ...allData];
          }
        }

        // 今日だけでなく、全ての履歴から最新の1件を取得する
        const empAtts = allData.filter(a => Number(a.employee_id) === Number(empId));
        if (empAtts.length > 0) {
          const latestAtt = empAtts[empAtts.length - 1];
          // 最新の打刻が未退勤なら、日付が変わっていても「出勤中」とする
          if (isMounted) setIsWorking(latestAtt.clock_in && !latestAtt.clock_out);
        } else {
          if (isMounted) setIsWorking(false);
        }
      } catch (e) {
        console.warn('出勤状態の取得失敗:', e);
      } finally {
        if (isMounted) setStatusLoading(false);
      }
    };
    
    fetchTodayStatus();
    return () => { isMounted = false; };
  }, [empId]);

  const formatTime = (date) => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

const getGpsCoords = async () => {
    try {
      // ① 端末自体のGPS（位置情報サービス）がONになっているか確認
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert('エラー', '端末の位置情報（GPS）がOFFになっています。端末の設定からONにしてください。');
        return null;
      }

      // ② まず現在のアプリ権限ステータスを確認
      let permission = await Location.getForegroundPermissionsAsync();
      
      // 権限が確定していない場合はリクエストダイアログを出す
      if (permission.status !== 'granted' && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      // 最終的に権限が「granted（許可）」になっていない場合は完全にブロック
      if (permission.status !== 'granted') {
        Alert.alert(
          'エラー', 
          'アプリへの位置情報の利用が許可されていません。端末の設定アプリから、このアプリの位置情報を「許可」に変更してください。'
        );
        return null;
      }

      // ③ 実際に位置情報を取得
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000
      });
      
      if (!location || !location.coords) {
        Alert.alert('エラー', '位置情報の座標が取得できませんでした。');
        return null;
      }
      
      return `${location.coords.latitude},${location.coords.longitude}`;
      
    } catch (error) {
      console.warn('GPS取得失敗例外:', error);
      Alert.alert('エラー', '位置情報の取得中にエラーが発生しました。設定が許可されているか確認してください。');
      return null;
    }
  };

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

    let bodyText = firstTpl.body || defaultTemplateBody;
    if (bodyText.includes('打刻：') || bodyText.includes('打刻 :')) {
      bodyText = bodyText.replace(/(打刻\s*[:：])([^\n]*)/g, `$1 ${hhmm}`);
    } else {
      bodyText = defaultTemplateBody;
    }
    setMailBody(bodyText);
  };

  const handleSelectTemplate = (tpl) => {
    setActiveTemplateId(tpl.id);
    let bodyText = tpl.body || '';
    if (actionTimeStr) {
      bodyText = bodyText.replace(/(打刻\s*[:：])([^\n]*)/g, `$1 ${actionTimeStr}`);
    }
    setMailBody(bodyText);
  };

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

  const saveTemplate = async () => {
    if (!tplNameInput.trim()) {
      Alert.alert('エラー', 'ボタン名を入力してください。');
      return;
    }

    try {
      setLoading(true);

      if (tplEditMode === 'add' && templates.length === 1 && templates[0].id === 'default') {
        const defaultPayload = {
          id: null,
          employee_id: empId,
          type: actionType,
          name: templates[0].name,
          body: templates[0].body,
        };
        await fetch('https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/mail-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultPayload),
        });
      }

      const payload = {
        id: tplEditMode === 'edit' && activeTemplateId !== 'default' ? activeTemplateId : null,
        employee_id: empId,
        type: actionType,
        name: tplNameInput.trim(),
        body: tplBodyInput.trim(),
      };

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

  const handleSimpleClock = async (type) => {
    Alert.alert('打刻確認', `${type}します。よろしいですか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'はい',
        onPress: () => submitAttendance(type, ''),
      },
    ]);
  };

  const handleDirectClock = async (type) => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setActionType(type);
    setActionTimeStr(hhmm);

    try {
      const savedEmail = await AsyncStorage.getItem('@default_mail_to');
      let targetEmail = savedEmail || 'kintai@toho-next.com';

      const userStr = await AsyncStorage.getItem('@logged_in_user');
      if (userStr) {
        const loggedInUser = JSON.parse(userStr);
        if (loggedInUser.email && loggedInUser.email.includes('ikegami')) {
          targetEmail = 'ikegami@toho-next.com'; 
        }
      }

      setMailTo(targetEmail);
    } catch (e) {
      setMailTo('kintai@toho-next.com');
    }

    const lastName = empName ? empName.split(/[\s ]+/)[0] : '';
    setMailSubject(`${type} ${lastName}`);

    await loadTemplatesAndSetBody(type, hhmm);
    setModalMode('mail');
    setMailModalVisible(true);
  };

const submitAttendance = async (type, bodyText) => {
    if (!empId) {
      Alert.alert('エラー', '従業員情報が正しく取得できていません。一覧から選び直してください。');
      return;
    }

    try {
      setLoading(true);

      // ★追加：SettingsScreenで設定した「位置情報を必須にする」状態を読み込む
      const requireGpsStr = await AsyncStorage.getItem('@require_gps');
      // 設定が存在しない場合はデフォルトで true（必須）とする
      const isGpsRequired = requireGpsStr !== 'false';

      // ★修正：アプリ側の設定（トグルスイッチ）がOFFの場合はエラーにして弾く
      if (!isGpsRequired) {
        setLoading(false);
        setMailModalVisible(false);
        Alert.alert('エラー', 'アプリの設定で位置情報がOFFになっているため打刻できません。設定画面から位置情報をONにしてください。');
        return; // ここで処理を終了し、打刻させない
      }

      let currentShopId = 'shop_01';
      try {
        const userStr = await AsyncStorage.getItem('@logged_in_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          currentShopId = user.shop_id || 'shop_01';
        }
      } catch (e) {
        console.warn('店舗ID取得エラー:', e);
      }

      // 位置情報を取得
      const coords = await getGpsCoords();

      // ★修正：位置情報が取得できなかった場合は、一切の打刻通信を行わずに処理を強制終了する
      if (!coords || typeof coords !== 'string' || coords.trim() === '') {
        setLoading(false);
        setMailModalVisible(false);
        return; // エラーアラートは getGpsCoords 内で表示済みのため、ここで処理を止める
      }

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const workDate = `${yyyy}-${mm}-${dd}`;
      const timeVal = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

      let existingAtt = null;
      let targetWorkDate = workDate; // 保存対象の「日付」

      try {
        let allData = [];
        const checkRes = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${yyyy}&month=${mm}&shop_id=${currentShopId}`, { cache: 'no-store' });
        if (checkRes.ok) {
          allData = await checkRes.json();
        }

        if (now.getDate() <= 5) {
          let prevM = now.getMonth();
          let prevY = yyyy;
          if (prevM === 0) { prevM = 12; prevY--; }
          const checkResPrev = await fetch(`https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api/attendances/monthly?year=${prevY}&month=${String(prevM).padStart(2, '0')}&shop_id=${currentShopId}`, { cache: 'no-store' });
          if (checkResPrev.ok) {
            const prevData = await checkResPrev.json();
            allData = [...prevData, ...allData];
          }
        }

        const myAtts = allData.filter(a => Number(a.employee_id) === Number(empId));
          
        if (myAtts.length > 0) {
          const latestAtt = myAtts[myAtts.length - 1];
          if (type === '出勤' || type === '直行') {
            if (latestAtt.work_date === workDate && !latestAtt.clock_out) {
              existingAtt = latestAtt;
            }
          } else {
            // 退勤・直帰の場合：過去日であっても「未退勤」のデータがあればその日をターゲットにする
            if (latestAtt.clock_in && !latestAtt.clock_out) {
              existingAtt = latestAtt;
              targetWorkDate = latestAtt.work_date; // ★ 日跨ぎ対応：出勤した日をターゲットにする
            } else if (latestAtt.work_date === workDate) {
              existingAtt = latestAtt;
            }
          }
        }
      } catch (checkErr) {
        console.warn('既存打刻の確認失敗:', checkErr);
      }

      let clockInVal = existingAtt ? existingAtt.clock_in : null;
      let clockOutVal = existingAtt ? existingAtt.clock_out : null;

      if (type === '出勤' || type === '直行') {
        clockInVal = timeVal;
      } else if (type === '退勤' || type === '直帰') {
        clockOutVal = timeVal;
      }

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
      
      // ★ 土日判定を削除。既存メモに「休日出勤」がある場合（管理画面で付与された等）のみ維持する
      if (existingMemo.includes('休日出勤')) {
        memoParts.push('休日出勤');
      }

      if (inLoc) memoParts.push(`[IN_LOC:${inLoc}]`);
      if (outLoc) memoParts.push(`[OUT_LOC:${outLoc}]`);

      let cleanExistingMemo = existingMemo
        .replace(/\[(?:IN\vert{}OUT)_LOC:[^\]]*\]/gi, '')
        .replace(/管理者修正|休日出勤/g, '')
        .trim();

      if (type === '直行' || type === '直帰') {
        if (cleanExistingMemo) memoParts.push(cleanExistingMemo);
        memoParts.push(`${type}\n${bodyText}`);
      } else if (cleanExistingMemo) {
        memoParts.push(cleanExistingMemo);
      }

      const payload = {
        id: existingAtt ? existingAtt.id : null,
        employee_id: Number(empId),
        shop_id: currentShopId, 
        work_date: targetWorkDate, // ★ workDate から targetWorkDate に変更
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
        {/* 履歴ボタンを削除し、レイアウトを保つためのダミー要素に変更 */}
        <View style={styles.backBtnBox}>
          <Text style={[styles.backBtn, { color: 'transparent' }]}>履歴</Text>
        </View>
      </View>

      {/* 中央：リアルタイム時計 */}
      <View style={styles.clockContainer}>
        <Text style={styles.clockDateStr}>
          {time.getFullYear()}年{time.getMonth() + 1}月{time.getDate()}日
        </Text>
        <Text style={styles.clockText}>{formatTime(time)}</Text>
      </View>

      {/* 下部：スマレジ風 4等分フラットボタン（グレーアウト制御を追加） */}
      <View style={styles.actionGridSquare}>
        <TouchableOpacity 
          style={[styles.actionBtnSquare, (isWorking || statusLoading) && styles.btnDisabled]} 
          activeOpacity={0.7} 
          onPress={() => handleSimpleClock('出勤')}
          disabled={isWorking || statusLoading}
        >
          <Text style={[styles.btnLabelSquare, (isWorking || statusLoading) && styles.btnLabelDisabled]}>出勤</Text>
        </TouchableOpacity>
        
        <View style={styles.btnDivider} />
        
        <TouchableOpacity 
          style={[styles.actionBtnSquare, (!isWorking || statusLoading) && styles.btnDisabled]} 
          activeOpacity={0.7} 
          onPress={() => handleSimpleClock('退勤')}
          disabled={!isWorking || statusLoading}
        >
          <Text style={[styles.btnLabelSquare, (!isWorking || statusLoading) && styles.btnLabelDisabled]}>退勤</Text>
        </TouchableOpacity>
        
        <View style={styles.btnDivider} />
        
        <TouchableOpacity 
          style={[styles.actionBtnSquare, (isWorking || statusLoading) && styles.btnDisabled]} 
          activeOpacity={0.7} 
          onPress={() => handleDirectClock('直行')}
          disabled={isWorking || statusLoading}
        >
          <Text style={[styles.btnLabelSquare, (isWorking || statusLoading) && styles.btnLabelDisabled]}>直行</Text>
        </TouchableOpacity>
        
        <View style={styles.btnDivider} />
        
        <TouchableOpacity 
          style={[styles.actionBtnSquare, (!isWorking || statusLoading) && styles.btnDisabled]} 
          activeOpacity={0.7} 
          onPress={() => handleDirectClock('直帰')}
          disabled={!isWorking || statusLoading}
        >
          <Text style={[styles.btnLabelSquare, (!isWorking || statusLoading) && styles.btnLabelDisabled]}>直帰</Text>
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
  /* スマレジ風 下部4等分ボタン */
  actionGridSquare: {
    flexDirection: 'row',
    width: '100%',
    height: 80,
    backgroundColor: COLORS.primary || '#0073ea',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
  actionBtnSquare: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* 追加: グレーアウト用のスタイル */
  btnDisabled: {
    backgroundColor: '#94a3b8', 
  },
  btnLabelDisabled: {
    color: '#e2e8f0', 
  },
  btnDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  btnLabelSquare: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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