'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCallback, useState } from 'react';

interface MessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    tokensUsed?: number;
  };
}

export default function Message({ message }: MessageProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [message.content]);

  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          AI
        </div>
      )}

      <div
        className={`max-w-2xl rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-100 border border-gray-700'
        }`}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <div className="prose prose-invert max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        <div className="flex items-center justify-between mt-2 text-xs text-gray-400 gap-2">
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          {message.tokensUsed && <span>~{message.tokensUsed} tokens</span>}
          {!isUser && (
            <button
              onClick={copyToClipboard}
              className="hover:text-gray-300 transition-colors"
            >
              {copied ? '✓' : '📋'}
            </button>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-sm font-bold flex-shrink-0">
          U
        </div>
      )}
    </div>
  );
}
