'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

export default function ChatInput() {
  const [input, setInput] = useState('');
  const { sendMessage, isLoading } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      await sendMessage(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask me anything... (Shift+Enter for new line)"
        disabled={isLoading}
        rows={1}
        className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none max-h-30"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Thinking...
          </>
        ) : (
          <>
            Send
            <span>→</span>
          </>
        )}
      </button>
    </form>
  );
}
