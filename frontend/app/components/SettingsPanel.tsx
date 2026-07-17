'use client';

import { useChatStore } from '../store/chatStore';

export default function SettingsPanel() {
  const {
    settings,
    updateSettings,
    clearHistory,
    exportChat,
  } = useChatStore();

  return (
    <div className="bg-gray-800 p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-bold mb-4 text-white">Settings</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Model
        </label>
        <select
          value={settings.model}
          onChange={(e) => updateSettings({ model: e.target.value })}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="llama2:7b">Llama 2 7B (Fast)</option>
          <option value="llama2:13b">Llama 2 13B (Balanced)</option>
          <option value="llama2:70b">Llama 2 70B (Quality)</option>
          <option value="mistral">Mistral 7B</option>
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Temperature: {settings.temperature.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={settings.temperature}
          onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">Lower = focused, Higher = creative</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Top P: {settings.topP.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.topP}
          onChange={(e) => updateSettings({ topP: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Max Tokens
        </label>
        <input
          type="number"
          min="128"
          max="2048"
          value={settings.maxTokens}
          onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) })}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          System Prompt
        </label>
        <textarea
          value={settings.systemPrompt}
          onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
          rows={4}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
        />
      </div>

      <div className="space-y-2 pt-4 border-t border-gray-700">
        <button
          onClick={exportChat}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          📥 Export Chat
        </button>
        <button
          onClick={clearHistory}
          className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          🗑️ Clear History
        </button>
      </div>
    </div>
  );
}
