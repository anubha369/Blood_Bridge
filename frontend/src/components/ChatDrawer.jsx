import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Shield, Bot, User, BookOpen, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function ChatDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am the BloodBridge Vision-X AI Assistant powered by Groq and our approved medical RAG pipeline. How can I help you today? You can ask about donor eligibility, platform workflows, or how to locate verified blood banks.",
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuestion = input.trim();
    setInput('');

    // Append user message
    const updatedMessages = [...messages, { role: 'user', content: userQuestion }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Pass last few messages as conversation history
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.ai.askAssistant(userQuestion, historyPayload);

      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: res.answer,
          sources: res.sources || [],
          grounded: res.grounded,
          model: res.model
        }
      ]);
    } catch (err) {
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: "I encountered an issue connecting to the AI inference service. Please refer directly to our verified blood banks or consult a medical professional.",
          sources: [],
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                BloodBridge Vision-X AI
                <span className="text-[10px] font-semibold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">
                  Groq + RAG
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">Grounded in approved NBTC, WHO & DGHS guidance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clinical Disclaimer Notice */}
        <div className="bg-amber-50 px-3.5 py-2 border-b border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
          <Shield className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Healthcare boundary:</strong> AI provides informational coordination help only. Final eligibility and compatibility testing belong to certified blood bank pathologists.
          </span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                {m.role === 'user' ? (
                  <>
                    <span>You</span>
                    <User className="w-3 h-3 text-slate-400" />
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-rose-500" />
                    <span className="font-medium text-rose-700">Groq Assistant</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Citations if available */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-indigo-500" /> Approved Sources Cited:
                    </span>
                    {m.sources.map((s, sIdx) => (
                      <div key={sIdx} className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        • {s.title} ({s.source})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 p-3 rounded-2xl w-fit shadow-sm">
              <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Searching approved documents & generating grounded response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about blood donation eligibility, interval, or rules..."
            className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white transition-all shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
