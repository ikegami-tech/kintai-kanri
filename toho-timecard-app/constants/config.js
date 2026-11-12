import Constants from 'expo-constants';

// app.config.js で設定した extra.appEnv を取得（未設定時はdevelopment）
const ENV = Constants.expoConfig?.extra?.appEnv || 'development';

// 環境別のAPI接続先URLを定義
const ENV_CONFIG = {
  development: {
    apiUrl: 'https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api', 
  },
  staging: {
    // ★ステージング環境（テスト用）のAPI URL。
    apiUrl: 'https://lsfii4b9m7.execute-api.ap-northeast-1.amazonaws.com/default/kintai_staging',
  },
  production: {
    apiUrl: 'https://ehc00bp6rb.execute-api.ap-northeast-1.amazonaws.com/api',
  },
};

export const CONFIG = ENV_CONFIG[ENV];
export const IS_STAGING = ENV === 'staging';