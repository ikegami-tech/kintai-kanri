import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  AppState,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';
import { CONFIG } from '../constants/config'; // ★追加

export default function TimeClockScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  const empId = route.params?.empId;
  const empName = route.params?.empName || '未選択';

  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(''); // ★追加: ローディング中のテキスト用

  const [isWorking, setIsWorking] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

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

  const [dailySchedules, setDailySchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [scheduleDropdownOpen, setScheduleDropdownOpen] = useState(false);

  const [currentCoords, setCurrentCoords] = useState(null);
  const [isModalScrolling, setIsModalScrolling] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchLocation = async () => {
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) return;

        let permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== 'granted' && permission.canAskAgain) {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (permission.status !== 'granted') return;

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 5000, 
        });
        
        if (location && location.coords && isMounted) {
          setCurrentCoords(`${location.coords.latitude},${location.coords.longitude}`);
        }
      } catch (error) {
        console.warn('GPS事前取得エラー:', error);
      }
    };

    fetchLocation();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        fetchLocation(); 
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchTodayStatus = async () => {
      try {
        setStatusLoading(true);

        const token = await AsyncStorage.getItem('@auth_token');
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
        // ★修正: CONFIG.apiUrl に変更
        const res = await fetch(`${CONFIG.apiUrl}/attendances/monthly?year=${yyyy}&month=${mm}&shop_id=${currentShopId}`, {
          cache: 'no-store',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          allData = await res.json();
        }

        if (now.getDate() <= 5) {
          let prevM = now.getMonth();
          let prevY = yyyy;
          if (prevM === 0) { prevM = 12; prevY--; }
          // ★修正: CONFIG.apiUrl に変更
          const resPrev = await fetch(`${CONFIG.apiUrl}/attendances/monthly?year=${prevY}&month=${String(prevM).padStart(2, '0')}&shop_id=${currentShopId}`, {
            cache: 'no-store',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (resPrev.ok) {
            const prevData = await resPrev.json();
            allData = [...prevData, ...allData];
          }
        }

        const empAtts = Array.isArray(allData) ? allData.filter(a => Number(a.employee_id) === Number(empId)) : [];
        
        const activeAtt = empAtts.find(a => {
          const hasIn = a.clock_in && String(a.clock_in).trim() !== '' && a.clock_in !== '--:--';
          const noOut = !a.clock_out || String(a.clock_out).trim() === '' || a.clock_out === '--:--';
          return hasIn && noOut;
        });

        if (isMounted) {
          setIsWorking(Boolean(activeAtt));
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
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert('エラー', '端末の位置情報（GPS）がOFFになっています。端末の設定からONにしてください。');
        return null;
      }

      let permission = await Location.getForegroundPermissionsAsync();
      
      if (permission.status !== 'granted' && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        Alert.alert(
          'エラー', 
          'アプリへの位置情報の利用が許可されていません。端末の設定アプリから、このアプリの位置情報を「許可」に変更してください。'
        );
        return null;
      }

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

  const fetchDailySchedules = async (targetEmpId) => {
    try {
      // ★修正: CONFIG.apiUrl に変更
      const res = await fetch(`${CONFIG.apiUrl}/daily-schedules?employee_id=${targetEmpId}`);
      if (res.ok) {
        const data = await res.json();
        setDailySchedules(data);
        return data;
      }
    } catch (error) {
      console.warn('本日のスケジュール取得エラー:', error);
    }
    return [];
  };

  const applyScheduleToMailBody = (schedule, currentBody, type) => {
    if (!schedule) return currentBody;
    let newBody = currentBody;
    const timeText = schedule.start_time || '';
    
    let rawTitle = schedule.title || '';
    let contentText = rawTitle;
    let locationText = '';

    const atIndex = rawTitle.lastIndexOf('@');
    if (atIndex !== -1) {
      locationText = rawTitle.substring(atIndex + 1).trim(); 
      contentText = rawTitle.substring(0, atIndex).trim();   
    }

    if (type === '直行') {
      if (timeText) newBody = newBody.replace(/(業務開始時間\s*[:：])([^\n]*)/g, `$1 ${timeText}`);
      if (locationText) newBody = newBody.replace(/(開始場所\s*[:：])([^\n]*)/g, `$1 ${locationText}`);
      if (contentText) newBody = newBody.replace(/(業務内容\s*[:：])([^\n]*)/g, `$1 ${contentText}`);
    } else if (type === '直帰') {
      const endTimeText = schedule.end_time || schedule.start_time || '';
      if (endTimeText) newBody = newBody.replace(/(業務終了時間\s*[:：])([^\n]*)/g, `$1 ${endTimeText}`);
      if (locationText) newBody = newBody.replace(/(終了場所\s*[:：])([^\n]*)/g, `$1 ${locationText}`);
      if (contentText) newBody = newBody.replace(/(業務相手\s*[:：])([^\n]*)/g, `$1 ${contentText}`);
    }
    return newBody;
  };

  const handleSelectSchedule = (sch) => {
    setSelectedScheduleId(sch ? sch.id : null);
    if (!sch) return;
    setMailBody((prev) => applyScheduleToMailBody(sch, prev, actionType));
  };

  const loadTemplatesAndSetBody = async (type, hhmm) => {
    const footer = '\n\n--------------------\n※このメールは勤怠管理システムからの自動送信です。';
    const defaultTemplateBody = type === '直行'
      ? `おはようございます。\n\n業務開始時間：\n開始場所：\n業務内容：\n打刻：${hhmm}\nその他：\n\n以上にて直行します。\n本日もよろしくお願いします。${footer}`
      : `お疲れ様です。\n\n業務終了時間：\n終了場所：\n業務相手：\n打刻：${hhmm}\nその他：\n\n以上にて直帰します。${footer}`;

    let loadedTemplates = [];
    try {
      // ★修正: CONFIG.apiUrl に変更
      const res = await fetch(`${CONFIG.apiUrl}/mail-templates?employee_id=${empId}&type=${encodeURIComponent(type)}`);
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
      setLoadingMsg('テンプレートを保存中...'); // ★追加
      setLoading(true);

      if (tplEditMode === 'add' && templates.length === 1 && templates[0].id === 'default') {
        const defaultPayload = {
          id: null,
          employee_id: empId,
          type: actionType,
          name: templates[0].name,
          body: templates[0].body,
        };
        // ★修正: CONFIG.apiUrl に変更
        await fetch(`${CONFIG.apiUrl}/mail-templates`, {
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

      // ★修正: CONFIG.apiUrl に変更
      const res = await fetch(`${CONFIG.apiUrl}/mail-templates`, {
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

    setSelectedScheduleId(null);
    setScheduleDropdownOpen(false);
    await fetchDailySchedules(empId);

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
      setLoadingMsg('位置情報を取得＆送信中...'); // ★追加
      setLoading(true);

      const requireGpsStr = await AsyncStorage.getItem('@require_gps');
      const isGpsRequired = requireGpsStr !== 'false';

      if (!isGpsRequired) {
        setLoading(false);
        setMailModalVisible(false);
        Alert.alert('エラー', 'アプリの設定で位置情報がOFFになっているため打刻できません。設定画面から位置情報をONにしてください。');
        return; 
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

      let coords = currentCoords;
      if (!coords) {
        coords = await getGpsCoords();
      }

      if (!coords || typeof coords !== 'string' || coords.trim() === '') {
        setLoading(false);
        setMailModalVisible(false);
        return; 
      }

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const workDate = `${yyyy}-${mm}-${dd}`;
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');

      let existingAtt = null;
      let targetWorkDate = workDate; 

      try {
        const token = await AsyncStorage.getItem('@auth_token');

        let allData = [];
        // ★修正: CONFIG.apiUrl に変更
        const checkRes = await fetch(`${CONFIG.apiUrl}/attendances/monthly?year=${yyyy}&month=${mm}&shop_id=${currentShopId}`, {
          cache: 'no-store',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (checkRes.ok) {
          allData = await checkRes.json();
        }

        if (now.getDate() <= 5) {
          let prevM = now.getMonth();
          let prevY = yyyy;
          if (prevM === 0) { prevM = 12; prevY--; }
          // ★修正: CONFIG.apiUrl に変更
          const checkResPrev = await fetch(`${CONFIG.apiUrl}/attendances/monthly?year=${prevY}&month=${String(prevM).padStart(2, '0')}&shop_id=${currentShopId}`, {
            cache: 'no-store',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (checkResPrev.ok) {
            const prevData = await checkResPrev.json();
            allData = [...prevData, ...allData];
          }
        }

        const myAtts = Array.isArray(allData) ? allData.filter(a => Number(a.employee_id) === Number(empId)) : [];
          
        if (type === '出勤' || type === '直行') {
          existingAtt = myAtts.find(a => a.work_date === workDate && a.clock_in && (!a.clock_out || a.clock_out === '' || a.clock_out === '--:--'));
        } else {
          const activeAtt = myAtts.find(a => {
            const hasIn = a.clock_in && String(a.clock_in).trim() !== '' && a.clock_in !== '--:--';
            const noOut = !a.clock_out || String(a.clock_out).trim() === '' || a.clock_out === '--:--';
            return hasIn && noOut;
          });

          if (activeAtt) {
            existingAtt = activeAtt;
            targetWorkDate = activeAtt.work_date; 
          } else {
            existingAtt = myAtts.find(a => a.work_date === workDate);
          }
        }
      } catch (checkErr) {
        console.warn('既存打刻の確認失敗:', checkErr);
      }

      let clockInVal = existingAtt ? existingAtt.clock_in : null;
      let clockOutVal = existingAtt ? existingAtt.clock_out : null;

      const timeVal = `${String(hours).padStart(2, '0')}:${minutes}:00`;

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
      if (existingMemo.includes('休日出勤')) memoParts.push('休日出勤');

      let isNextDay = false;
      if ((type === '退勤' || type === '直帰') && existingAtt && targetWorkDate && targetWorkDate !== workDate) {
        isNextDay = true;
      }
      if (existingMemo.includes('【翌日】')) {
        isNextDay = true;
      }

      if (inLoc) memoParts.push(`[IN_LOC:${inLoc}]`);
      if (outLoc) memoParts.push(`[OUT_LOC:${outLoc}]`);

      let cleanExistingMemo = existingMemo
        .replace(/\[(?:IN\vert{}OUT)_LOC:[^\]]*\]/gi, '')
        .replace(/管理者修正|休日出勤|【翌日】/g, '')
        .trim();

      if (type === '直行' || type === '直帰') {
        if (cleanExistingMemo) memoParts.push(cleanExistingMemo);
        memoParts.push(`${type}\n${bodyText}`);
      } else if (cleanExistingMemo) {
        memoParts.push(cleanExistingMemo);
      }

      if (isNextDay) memoParts.push('【翌日】');

      const payload = {
        id: existingAtt ? existingAtt.id : null,
        employee_id: Number(empId),
        shop_id: currentShopId, 
        work_date: targetWorkDate, 
        clock_in: clockInVal,
        clock_out: clockOutVal,
        memo: memoParts.join('\n').trim(),
        mail_to: (type === '直行' || type === '直帰') ? mailTo : null,
        mail_subject: (type === '直行' || type === '直帰') ? mailSubject : null,
        mail_body: (type === '直行' || type === '直帰') ? bodyText : null,
        mail_from_name: empName,
      };

      // ★修正: CONFIG.apiUrl に変更
      const response = await fetch(`${CONFIG.apiUrl}/attendances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('打刻処理に失敗しました');

      if (type === '出勤' || type === '直行') {
        setIsWorking(true);
      } else if (type === '退勤' || type === '直帰') {
        setIsWorking(false);
      }

      navigation.goBack();

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
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnBox}>
          <Text style={styles.backBtn}>＜ 従業員選択へ</Text>
        </TouchableOpacity>
        <Text style={styles.empTitle}>{empName} 様</Text>
        <View style={styles.backBtnBox}>
          <Text style={[styles.backBtn, { color: 'transparent' }]}>履歴</Text>
        </View>
      </View>

      <View style={styles.clockContainer}>
        <Text style={styles.clockDateStr}>
          {time.getFullYear()}年{time.getMonth() + 1}月{time.getDate()}日
        </Text>
        <Text style={styles.clockText}>{formatTime(time)}</Text>
      </View>

      <View style={[styles.actionGridSquare, { height: isTablet ? width / 5.5 : 80 }]}>
        <TouchableOpacity 
          style={[styles.actionBtnSquare, (isWorking || statusLoading) && styles.btnDisabled]} 
          activeOpacity={0.7} 
          onPress={() => handleSimpleClock('出勤')}
          disabled={isWorking || statusLoading}
        >
          <Text style={[styles.btnLabelSquare, isTablet && { fontSize: 26 }, (isWorking || statusLoading) && styles.btnLabelDisabled]}>出勤</Text>
        </TouchableOpacity>
        
        <View style={styles.btnDivider} />
        
        <TouchableOpacity 
          style={[styles.actionBtnSquare, (!isWorking || statusLoading) && styles.btnDisabled]} 
          activeOpacity={0.7} 
          onPress={() => handleSimpleClock('退勤')}
          disabled={!isWorking || statusLoading}
        >
          <Text style={[styles.btnLabelSquare, isTablet && { fontSize: 26 }, (!isWorking || statusLoading) && styles.btnLabelDisabled]}>退勤</Text>
        </TouchableOpacity>
        
        <View style={styles.btnDivider} />
        
        <TouchableOpacity 
          style={[styles.actionBtnSquare, (isWorking || statusLoading) && styles.btnDisabled]} 
          activeOpacity={0.7} 
          onPress={() => handleDirectClock('直行')}
          disabled={isWorking || statusLoading}
        >
          <Text style={[styles.btnLabelSquare, isTablet && { fontSize: 26 }, (isWorking || statusLoading) && styles.btnLabelDisabled]}>直行</Text>
        </TouchableOpacity>
        
        <View style={styles.btnDivider} />
        
        <TouchableOpacity 
          style={[styles.actionBtnSquare, (!isWorking || statusLoading) && styles.btnDisabled]} 
          activeOpacity={0.7} 
          onPress={() => handleDirectClock('直帰')}
          disabled={!isWorking || statusLoading}
        >
          <Text style={[styles.btnLabelSquare, isTablet && { fontSize: 26 }, (!isWorking || statusLoading) && styles.btnLabelDisabled]}>直帰</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
        </View>
      )}

      <Modal visible={mailModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalContent, isKeyboardVisible && styles.modalContentKeyboardOpen]}>
            {modalMode === 'mail' ? (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitleText}>{actionType}連絡メールの確認</Text>
                  {isKeyboardVisible && (
                    <TouchableOpacity
                      style={styles.kbDoneBtn}
                      onPress={() => Keyboard.dismiss()}
                    >
                      <Text style={styles.kbDoneBtnText}>完了</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView
                  style={styles.modalBodyScroll}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                >
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

                      {dailySchedules.length > 0 && (
                        <View style={styles.scheduleSection}>
                          <Text style={styles.scheduleSectionTitle}>📅 本日の予定 (TOHO SS):</Text>
                          <TouchableOpacity
                            style={styles.dropdownHeader}
                            onPress={() => setScheduleDropdownOpen(!scheduleDropdownOpen)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.dropdownHeaderText} numberOfLines={1}>
                              {(() => {
                                const selected = dailySchedules.find(s => s.id === selectedScheduleId);
                                if (!selected) return '-- スケジュールを選択してください --';
                                const badge = selected.start_time ? `[${selected.start_time}] ` : '';
                                return `${badge}${selected.title || '無題'}`;
                              })()}
                            </Text>
                            <Text style={styles.dropdownArrow}>{scheduleDropdownOpen ? '▲' : '▼'}</Text>
                          </TouchableOpacity>

                          {scheduleDropdownOpen && (
                            <View style={styles.dropdownList}>
                              {dailySchedules.map((sch) => {
                                const isSelected = selectedScheduleId === sch.id;
                                const timeBadge = sch.start_time ? `[${sch.start_time}] ` : '';
                                return (
                                  <TouchableOpacity
                                    key={String(sch.id)}
                                    style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                                    onPress={() => {
                                      handleSelectSchedule(sch);
                                      setScheduleDropdownOpen(false);
                                    }}
                                  >
                                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                                      {timeBadge}{sch.title || '無題の予定'}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      )}

                      <Text style={styles.inputLabel}>メール本文（必要に応じて調整してください）</Text>
                      <TextInput
                        style={styles.textInputMulti}
                        value={mailBody}
                        onChangeText={setMailBody}
                        multiline={true}
                        scrollEnabled={false}
                        textAlignVertical="top"
                      />

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
                <>
                  <Text style={styles.modalTitle}>
                    {tplEditMode === 'edit' ? 'テンプレートの編集' : '新規テンプレート追加'}
                  </Text>
                  <ScrollView
                    style={styles.modalBodyScroll}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                  >
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
                        style={[styles.textInputMulti, { minHeight: 140 }]}
                        value={tplBodyInput}
                        onChangeText={setTplBodyInput}
                        multiline={true}
                        scrollEnabled={false}
                        textAlignVertical="top"
                      />
                    </View>
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
          </View>
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
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  /* ★追加: キーボード表示中は高さを制限して画面上部に固定する */
  modalContentKeyboardOpen: {
    maxHeight: '55%',
    marginTop: -80, 
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.textMain,
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
  kbDoneBtn: {
    backgroundColor: COLORS.primary || '#0073ea',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  kbDoneBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalBodyScroll: {
    flexShrink: 1,
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
    minHeight: 140,
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
  /* ★TOHO SS スケジュール プルダウンスタイル */
  scheduleSection: {
    marginTop: 10,
    marginBottom: 6,
  },
  scheduleSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 6,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.border || '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownHeaderText: {
    fontSize: 13,
    color: '#1e293b',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  dropdownList: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.border || '#cbd5e1',
    borderTopWidth: 0,
    borderRadius: 6,
    marginTop: -2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#eef6fc',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#334155',
  },
  dropdownItemTextActive: {
    color: COLORS.primary || '#0073ea',
    fontWeight: 'bold',
  },
});