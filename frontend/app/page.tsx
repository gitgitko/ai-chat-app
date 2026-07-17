'use client';

import { useEffect, useState } from 'react';
import ChatContainer from './components/ChatContainer';
import SettingsPanel from './components/SettingsPanel';
import { useChatStore } from './store/chatStore';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const initializeStore = useChatStore((state) => state.initialize);

  useEffect(() => {
    setMounted(true);
    initializeStore();
  }, [initializeStore]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-gray-950">
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Advanced AI Chat
          </h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            ⚙️
          </button>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <ChatContainer />
          </div>
          {showSettings && (
            <div className="w-64 border-l border-gray-700 overflow-y-auto">
              <SettingsPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
