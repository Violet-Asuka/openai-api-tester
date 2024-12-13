import { create } from 'zustand'

export type Language = 'en' | 'zh-CN' | 'zh-TW' | 'ja'

interface I18nState {
  language: Language
  setLanguage: (lang: Language) => void
}

export const translations = {
  'en': {
    title: 'OpenAI API Tester',
    subtitle: 'A simple tool to test and validate your OpenAI API endpoints',
    config: {
      title: 'Configuration',
      quickSetup: 'Quick Setup',
      quickSetupPlaceholder: 'Paste both URL and API Key here for automatic detection (Press Enter to process, Shift+Enter for new line)',
      baseUrl: 'Base URL',
      baseUrlPlaceholder: 'https://api.openai.com/v1',
      apiKey: 'API Key',
      apiKeyPlaceholder: 'sk-...',
      savedCredentials: 'Saved Credentials',
      hideSavedCredentials: 'Hide',
      showSavedCredentials: 'Show',
      saveCurrent: 'Save Current',
      model: 'Model',
      availableModels: 'Available Models',
      modelInputPlaceholder: 'Enter model names (Press Enter to add, Shift+Enter for new line)',
      refreshModels: 'Refresh Models',
      loading: 'Loading...',
      prompt: 'Prompt',
      promptPlaceholder: 'Enter your prompt here (Press Enter to add, Shift+Enter for new line)',
      imageUpload: 'Image Upload',
      noImageSelected: 'No image selected. Default image will be used for image tests.',
      buttons: {
        connectionTest: 'Connection Test',
        chatTest: 'Chat Test',
        streamTest: 'Stream Test',
        functionTest: 'Function Test',
        latencyTest: 'Latency Test',
        temperatureTest: 'Temperature Test',
        mathTest: 'Math Test',
        reasoningTest: 'Reasoning Test',
        abortTest: 'Abort Test'
      },
      defaultPrompt: 'Tell me an interesting fact about the Roman Empire',
    }
  },
  'zh-CN': {
    title: 'OpenAI API 测试工具',
    subtitle: '一个简单的工具，用于测试和验证您的 OpenAI API 端点',
    config: {
      title: '配置',
      quickSetup: '快速设置',
      quickSetupPlaceholder: '在此粘贴 URL 和 API Key 以自动检测（按回车处理，Shift+回车换行）',
      baseUrl: '基础 URL',
      baseUrlPlaceholder: 'https://api.openai.com/v1',
      apiKey: 'API 密钥',
      apiKeyPlaceholder: 'sk-...',
      savedCredentials: '已保存的凭证',
      hideSavedCredentials: '隐藏',
      showSavedCredentials: '显示',
      saveCurrent: '保存当前',
      model: '模型',
      availableModels: '可用模型',
      modelInputPlaceholder: '输入模型名称（按回车添加，Shift+回车换行）',
      refreshModels: '刷新模型',
      loading: '加载中...',
      prompt: '提示词',
      promptPlaceholder: '在此输入您的提示词（按回车添加，Shift+回车换行）',
      imageUpload: '图片上传',
      noImageSelected: '未选择图片。图像测试将使用默认图片。',
      buttons: {
        connectionTest: '连接测试',
        chatTest: '对话测试',
        streamTest: '流式测试',
        functionTest: '函数测试',
        latencyTest: '延迟测试',
        temperatureTest: '温度测试',
        mathTest: '数学测试',
        reasoningTest: '推理测试',
        abortTest: '中止测试'
      },
      defaultPrompt: '告诉我一个关于罗马帝国的趣事',
    }
  },
  'zh-TW': {
    title: 'OpenAI API 測試工具',
    subtitle: '一個簡單的工具，用於測試和驗證您的 OpenAI API 端點',
    config: {
      title: '配置',
      quickSetup: '快速設置',
      quickSetupPlaceholder: '在此貼上 URL 和 API Key 以自動檢測（按回車處理，Shift+回車換行）',
      baseUrl: '基礎 URL',
      baseUrlPlaceholder: 'https://api.openai.com/v1',
      apiKey: 'API 密鑰',
      apiKeyPlaceholder: 'sk-...',
      savedCredentials: '已保存的憑證',
      hideSavedCredentials: '隱藏',
      showSavedCredentials: '顯示',
      saveCurrent: '保存當前',
      model: '模型',
      availableModels: '可用模型',
      modelInputPlaceholder: '輸入模型名稱（按回車添加，Shift+回車換行）',
      refreshModels: '刷新模型',
      loading: '載入中...',
      prompt: '提示詞',
      promptPlaceholder: '在此輸入您的提示詞（按回車添加，Shift+回車換行）',
      imageUpload: '圖片上傳',
      noImageSelected: '未選擇圖片。圖像測試將使用預設圖片。',
      buttons: {
        connectionTest: '連接測試',
        chatTest: '對話測試',
        streamTest: '流式測試',
        functionTest: '函數測試',
        latencyTest: '延遲測試',
        temperatureTest: '溫度測試',
        mathTest: '數學測試',
        reasoningTest: '推理測試',
        abortTest: '中止測試'
      },
      defaultPrompt: '告訴我一個關於羅馬帝國的趣事',
    }
  },
  'ja': {
    title: 'OpenAI API テストツール',
    subtitle: 'OpenAI APIエンドポイントをテストおよび検証するためのシンプルなツール',
    config: {
      title: '設定',
      quickSetup: 'クイックセットアップ',
      quickSetupPlaceholder: 'URLとAPIキーをここに貼り付けて自動検出（Enterで処理、Shift+Enterで改行）',
      baseUrl: 'ベースURL',
      baseUrlPlaceholder: 'https://api.openai.com/v1',
      apiKey: 'APIキー',
      apiKeyPlaceholder: 'sk-...',
      savedCredentials: '保存された認証情報',
      hideSavedCredentials: '非表示',
      showSavedCredentials: '表示',
      saveCurrent: '現在の設定を保存',
      model: 'モデル',
      availableModels: '利用可能なモデル',
      modelInputPlaceholder: 'モデル名を入力（Enterで追加、Shift+Enterで改行）',
      refreshModels: 'モデルを更新',
      loading: '読み込み中...',
      prompt: 'プロンプト',
      promptPlaceholder: 'プロンプトをここに入力（Enterで追加、Shift+Enterで改行）',
      imageUpload: '画像アップロード',
      noImageSelected: '画像が選択されていません。画像テストではデフォルト画像が使用されます。',
      buttons: {
        connectionTest: '接続テスト',
        chatTest: 'チャットテスト',
        streamTest: 'ストリームテスト',
        functionTest: '関数テスト',
        latencyTest: 'レイテンシーテスト',
        temperatureTest: '温度テスト',
        mathTest: '数学テスト',
        reasoningTest: '推論テスト',
        abortTest: 'テスト中止'
      },
      defaultPrompt: 'ローマ帝国についての面白い話を教えてください',
    }
  }
} as const

export const useI18nStore = create<I18nState>()((set) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang })
})) 