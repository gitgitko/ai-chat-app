import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tokensUsed?: number;
}

interface ChatSettings {
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
}

interface ChatStore {
  messages: Message[];
  settings: ChatSettings;
  isLoading: boolean;
  error: string | null;

  initialize: () => void;
  sendMessage: (content: string) => Promise<void>;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  clearHistory: () => void;
  newConversation: () => void;
  exportChat: () => void;
  setError: (error: string | null) => void;
}

const DEFAULT_SETTINGS: ChatSettings = {
  model: 'llama2',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 512,
  systemPrompt: 'You are a helpful, honest, and harmless AI assistant.',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useChatStore = create<ChatStore>(
  persist(
    (set, get) => ({
      messages: [],
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      error: null,

      initialize: () => {
        const stored = localStorage.getItem('chat-store');
        if (stored) {
          const { state } = JSON.parse(stored);
          set({
            messages: state.messages || [],
            settings: { ...DEFAULT_SETTINGS, ...state.settings },
          });
        }
      },

      sendMessage: async (content: string) => {
        const { settings, messages } = get();

        if (!content.trim()) return;

        const userMessage: Message = {
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        };

        set({ messages: [...messages, userMessage], isLoading: true, error: null });

        try {
          let fullResponse = '';
          let tokensUsed = 0;

          const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: content,
              system_prompt: settings.systemPrompt,
              temperature: settings.temperature,
              top_p: settings.topP,
              max_tokens: settings.maxTokens,
              model: settings.model,
            }),
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.error) {
                    set((s) => ({
                      error: data.error,
                    }));
                    break;
                  }

                  if (data.token) {
                    fullResponse += data.token;
                    set((s) => {
                      const msgs = [...s.messages];
                      const lastMsg = msgs[msgs.length - 1];
                      if (lastMsg?.role === 'assistant') {
                        lastMsg.content = fullResponse;
                      }
                      return { messages: msgs };
                    });
                  }

                  if (data.done && data.tokens) {
                    tokensUsed = data.tokens.input + data.tokens.output;
                  }
                } catch (e) {
                  // Continue on parse error
                }
              }
            }
          }

          set((s) => {
            const msgs = [...s.messages];
            const lastMsg = msgs[msgs.length - 1];

            if (lastMsg?.role === 'assistant') {
              lastMsg.tokensUsed = tokensUsed;
            } else {
              msgs.push({
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date().toISOString(),
                tokensUsed,
              });
            }
            return { messages: msgs };
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to get response';
          set({ error: errorMsg });
          console.error('Chat error:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      updateSettings: (newSettings: Partial<ChatSettings>) => {
        set((s) => ({
          settings: { ...s.settings, ...newSettings },
        }));
      },

      clearHistory: () => {
        set({ messages: [] });
      },

      newConversation: () => {
        set({ messages: [] });
      },

      exportChat: () => {
        const { messages, settings } = get();
        const data = {
          timestamp: new Date().toISOString(),
          settings,
          messages,
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        messages: state.messages,
        settings: state.settings,
      }),
    }
  )
);
