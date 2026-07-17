'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import Message from './Message';
import ChatInput from './ChatInput';

export default function ChatContainer() {
  const { messages, isLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
              <p className="text-sm">Ask me anything. I'm powered by Llama 3.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <Message key={idx} message={msg} />
            ))}
            {isLoading && (
              <div className="flex gap-2 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  AI
                </div>
                <div className="bg-gray-800 rounded-lg px-4 py-3 max-w-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t border-gray-700 bg-gray-800 p-4">
        <ChatInput />
      </div>
    </div>
  );
}
