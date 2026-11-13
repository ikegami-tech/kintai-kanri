// eas.jsonで設定した環境変数を受け取る
const IS_STAGING = process.env.APP_ENV === 'staging';

// ★修正: export default ではなく module.exports = を使用する
module.exports = {
  expo: {
    // ステージングの時は名前の末尾に (stg) をつける
    name: IS_STAGING ? "勤怠管理(stg)" : "勤怠管理",
    slug: "toho-timecard-app",
    version: "1.3.2",
    icon: "./assets/icon.png",
    orientation: "portrait",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      // ステージングの時はIDの末尾に .staging をつける
      bundleIdentifier: IS_STAGING ? "com.tohonext.timecard.staging" : "com.tohonext.timecard",
      buildNumber: "17",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: IS_STAGING ? "com.tohonext.timecard.staging" : "com.tohonext.timecard",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    extra: {
      eas: {
        projectId: "d972d5fa-7dcd-4a1a-bb17-4c641677cd26"
      },
      appEnv: process.env.APP_ENV || 'development'
    },
    plugins: [
      "expo-status-bar"
    ]
  }
};