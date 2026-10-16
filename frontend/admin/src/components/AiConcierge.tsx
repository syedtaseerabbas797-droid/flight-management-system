import React, { useState, useRef, useEffect } from 'react';
import { aviationStore } from '../services/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestions?: string[];
  relatedFlight?: string;
}

export const AiConcierge: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-0',
      sender: 'assistant',
      text: 'AeroNexus AI Flight Ops & Guest Concierge online. I can provide real-time flight telemetry, explain our automated waitlist clearing algorithm, answer baggage questions, or check oceanic sector statuses.',
      timestamp: 'Now',
      suggestions: [
        'Flight status of AP-104',
        'How does the waitlist algorithm clear seats?',
        'Baggage allowance for Club Suite',
        'LHR de-icing delay restrictions',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Build conversation history for context-aware responses
      const history = messages
        .filter((m) => m.id !== 'msg-0') // skip initial greeting
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const response = await aviationStore.askSupport(query, history);
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.suggestions,
        relatedFlight: response.relatedFlight,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: 'Telemetry comms momentary timeout. Please check sector AP-104 or AP-882 in the Operations Grid.',
        timestamp: 'Now',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Expanded Widget Window */}
      {isOpen ? (
        <div className="w-96 max-w-[calc(100vw-2rem)] h-[520px] bg-white border border-[#c4c6ce] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 mb-2">
          {/* Header */}
          <div className="h-12 px-3.5 bg-[#0a2540] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <div>
                <span className="font-headline text-[13px] font-bold block leading-none">
                  AeroNexus Concierge
                </span>
                <span className="font-mono text-[9px] text-[#b0c8eb] leading-none">
                  POST /support/ask • AI FLIGHT OPS
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-white transition-colors"
                title="Minimize Concierge"
              >
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-3 bg-[#f9f9f8]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-2.5 rounded-lg text-xs font-body leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#005cba] text-white'
                      : 'bg-white border border-[#c4c6ce] text-[#000f22] shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>

                <span className="font-mono text-[9px] text-gray-400 mt-1 px-1">
                  {m.timestamp}
                </span>

                {/* Suggestions chips */}
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 max-w-[90%]">
                    {m.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(s)}
                        className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-[#c4c6ce] hover:border-[#005cba] hover:text-[#005cba] text-[#43474d] transition-colors text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center space-x-1.5 p-2 bg-white border border-[#c4c6ce] rounded-lg w-24">
                <span className="w-1.5 h-1.5 rounded-full bg-[#005cba] animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#005cba] animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#005cba] animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-[#c4c6ce] flex items-center space-x-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about flights, waitlists, bags..."
              className="flex-1 h-8 px-2.5 text-xs bg-[#f9f9f8] border border-[#c4c6ce] rounded focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] text-[#000f22]"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="h-8 px-3 bg-[#0a2540] hover:bg-[#162538] text-white rounded text-xs font-semibold disabled:opacity-40 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </form>
        </div>
      ) : (
        /* Floating Collapsed Pill Trigger */
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 px-3.5 py-2.5 rounded-full bg-[#0a2540] hover:bg-[#162538] text-white shadow-xl border border-white/20 transition-all hover:scale-105 active:scale-95 group"
        >
          <span className="material-symbols-outlined text-lg text-emerald-400">smart_toy</span>
          <span className="font-headline text-xs font-bold tracking-tight">AI Concierge</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        </button>
      )}
    </div>
  );
};
