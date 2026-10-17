import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { askAI } from '../services/api';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface AiConciergeProps {
  isOpen: boolean;
  onToggle: () => void;
  initialPrompt?: string;
}

export const AiConcierge: React.FC<AiConciergeProps> = ({
  isOpen,
  onToggle,
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'ai',
      text: 'Hello, Captain or Traveler. I am your AeroNexus Flight Systems Assistant. Ask me about active oceanic tracks, flight status, baggage tariffs, or operational dispatch.',
      timestamp: '09:05',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      handleSendPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendPrompt = async (promptText: string) => {
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Build conversation history for context-aware multi-turn chat
      const history = messages.map((m) => ({
        role: m.sender === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }));

      const response = await askAI(promptText, history);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      // Fallback to simulated if API completely unreachable
      const low = promptText.toLowerCase();
      let reply = 'AeroNexus systems are operating under normal transponder conditions.';

      if (low.includes('ap-104') || low.includes('104')) {
        reply = 'Flight AP-104 is an Airbus A350-900 scheduled JFK → LHR departing at 21:45 UTC from Gate B14. Current ground status is ON TIME with 3 Business suites available at $1,890.';
      } else if (low.includes('baggage')) {
        reply = 'For Business Suite itineraries, each passenger is entitled to 2 checked baggage items up to 32kg each, plus 1 priority cabin trolley and 1 personal briefcase.';
      } else if (low.includes('hold') || low.includes('fare')) {
        reply = 'Our algorithmic fare hold freezes seat rates for 24-72 hours with a flat $25 token fee. If confirmed, the token is credited 100% toward final ticketing.';
      } else {
        reply = `Telemetry query received: "${promptText}". AI Concierge is offline. Operations report nominal turnarounds.`;
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const currentInput = input;
    setInput('');
    handleSendPrompt(currentInput);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
      {/* Collapsed Trigger Floating Button */}
      {!isOpen && (
        <button
          type="button"
          className="bg-[#000f22] text-white px-4 py-2.5 rounded-full shadow-lg border border-[#74777e]/30 flex items-center gap-2 hover:bg-[#162538] transition-all active:scale-95 group cursor-pointer"
          onClick={onToggle}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5095fe] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#5095fe]"></span>
          </span>
          <Bot className="w-4 h-4 text-[#5095fe]" />
          <span className="text-xs font-semibold tracking-wide font-label-caps">
            Ask AeroAI
          </span>
          <span className="bg-[#5095fe] text-[#000f22] font-bold text-[10px] px-1.5 py-0.5 rounded-full">
            RAG
          </span>
        </button>
      )}

      {/* Expanded Floating Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:relative sm:inset-auto w-full h-full sm:w-80 md:w-96 bg-white border border-[#c4c6ce] sm:rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200 sm:max-h-[80vh]">
          {/* Header */}
          <div className="bg-[#0a2540] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#5095fe] text-[#000f22] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  <span>AeroAI Concierge</span>
                  <span className="text-[9px] font-label-caps bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/30">
                    RAG v1.4
                  </span>
                </div>
                <span className="text-[10px] text-[#e2e2e2] font-code-telemetry">
                  Live Ops Ground-Feed Linked
                </span>
              </div>
            </div>
            <button
              type="button"
              className="text-[#e2e2e2] hover:text-white transition-colors cursor-pointer"
              onClick={onToggle}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Chip Prompts Header */}
          <div className="bg-[#f3f4f3] px-3 py-2 border-b border-[#c4c6ce] flex items-center gap-1.5 overflow-x-auto text-[11px] whitespace-nowrap">
            <button
              type="button"
              className="px-2 py-0.5 rounded bg-white border border-[#c4c6ce] hover:border-[#005cba] text-[#000f22] font-medium transition-colors cursor-pointer"
              onClick={() => handleSendPrompt('What is the status of AP-104?')}
            >
              Status AP-104?
            </button>
            <button
              type="button"
              className="px-2 py-0.5 rounded bg-white border border-[#c4c6ce] hover:border-[#005cba] text-[#000f22] font-medium transition-colors cursor-pointer"
              onClick={() => handleSendPrompt('Baggage allowance for Business class?')}
            >
              Baggage rules?
            </button>
            <button
              type="button"
              className="px-2 py-0.5 rounded bg-white border border-[#c4c6ce] hover:border-[#005cba] text-[#000f22] font-medium transition-colors cursor-pointer"
              onClick={() => handleSendPrompt('How do algorithmic fare holds work?')}
            >
              Fare holds?
            </button>
          </div>

          {/* Chat Stream */}
          <div className="p-3 space-y-3 flex-1 sm:h-72 sm:flex-none overflow-y-auto text-xs bg-[#f9f9f8]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 items-start ${m.sender === 'user' ? 'flex-row-reverse' : ''
                  }`}
              >
                <div
                  className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${m.sender === 'user'
                      ? 'bg-[#005cba] text-white'
                      : 'bg-[#000f22] text-white'
                    }`}
                >
                  {m.sender === 'user' ? 'YOU' : 'AP'}
                </div>
                <div
                  className={`p-2.5 rounded-lg max-w-[85%] text-xs leading-relaxed shadow-xs ${m.sender === 'user'
                      ? 'bg-[#000f22] text-white'
                      : 'bg-white border border-[#c4c6ce] text-[#000f22]'
                    }`}
                >
                  {m.text}
                  <div
                    className={`text-[9px] mt-1 text-right ${m.sender === 'user' ? 'text-gray-300' : 'text-[#74777e]'
                      }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center text-xs text-[#74777e]">
                <div className="w-6 h-6 rounded bg-[#000f22] text-white flex items-center justify-center text-[10px] font-bold">
                  AP
                </div>
                <div className="bg-white border border-[#c4c6ce] px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#005cba] rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-[#005cba] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#005cba] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-2.5 bg-white border-t border-[#c4c6ce]">
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask flight questions..."
                maxLength={240}
                className="w-full text-xs px-2.5 py-1.5 border border-[#c4c6ce] rounded focus:border-[#005cba] focus:ring-1 focus:ring-[#005cba] text-[#000f22] outline-none"
              />
              <button
                type="submit"
                className="bg-[#000f22] hover:bg-[#162538] text-white p-1.5 rounded transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="flex justify-between items-center px-1 mt-1 text-[9px] text-[#74777e] font-label-caps">
              <span>POST /support/ask • RAG Retrieval</span>
              <span>{input.length}/240</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
