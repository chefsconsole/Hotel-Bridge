import { useState, useRef, useEffect } from 'react';
import { Textarea } from '../../components/ui/textarea';
import {
  Bot, Send, Sparkles, Loader2, Zap, BarChart3, Plus, Search,
  TrendingUp, MessageSquare, ChevronRight
} from 'lucide-react';

export const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I'm your HotelBridge AI assistant. I can help you with:\n\n• Adding new group bookings\n• Updating hotel contracts\n• Querying revenue and commission data\n• Providing business insights\n\nTry asking me something like:\n\"Add new group with 30 rooms in Paris for 2 nights at 100 euro from Atlas Voyages\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          session_id: 'user-session-' + Date.now(),
        }),
      });
      if (!response.ok) throw new Error('Failed to get AI response');
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having trouble processing your request right now. Please try again or rephrase your question.",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickCommands = [
    { icon: BarChart3, query: 'Show total confirmed business this month', label: 'Monthly revenue' },
    { icon: Plus, query: 'Add group booking for 25 rooms in Rome', label: 'New booking' },
    { icon: Search, query: 'Show pending commission payments', label: 'Pending payments' },
    { icon: TrendingUp, query: 'List top performing hotels', label: 'Top hotels' },
  ];

  const capabilities = [
    'Natural language booking creation',
    'Real-time data queries',
    'Business insights & analytics',
    'Smart data updates',
    'Commission calculations',
    'Report generation',
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2">AI Assistant</div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-primary leading-tight">
            Your Intelligent <span className="text-shimmer">Co-Pilot</span>
          </h1>
          <p className="text-sm text-gray-500 mt-2">Powered by OpenAI GPT-4o with real-time access to your CRM data</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs font-semibold text-green-700">Online & Connected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Chat ─────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col h-[680px]">
          {/* Chat header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-secondary to-yellow-400 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-white" />
            </div>
            <div className="flex-1">
              <div className="font-serif font-bold text-primary">HotelBridge AI</div>
              <div className="text-[10px] text-gray-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-secondary" />
                GPT-4o · Connected to your data
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white via-gray-50/40 to-white">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-up`} style={{ animationDuration: '0.4s' }}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-yellow-400 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[78%] ${isUser ? 'order-1' : ''}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        isUser
                          ? 'bg-gradient-to-br from-primary to-blue-700 text-white rounded-tr-sm'
                          : msg.isError
                            ? 'bg-red-50 border border-red-100 text-red-900 rounded-tl-sm'
                            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                    </div>
                    <div className={`text-[10px] text-gray-400 mt-1 px-2 ${isUser ? 'text-right' : ''}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shrink-0 mt-1 text-xs font-bold text-white">
                      You
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 justify-start animate-fade-up" style={{ animationDuration: '0.3s' }}>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-yellow-400 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-4 bg-white">
            <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-secondary/30 border border-transparent focus-within:border-secondary/40 transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your bookings, hotels, or revenue..."
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none min-h-[40px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 px-2 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() && !isLoading
                    ? 'btn-gold text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 px-2">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">Enter</kbd> to send · <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">Shift + Enter</kbd> for new line
            </p>
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────── */}
        <div className="space-y-5">
          {/* Quick commands */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-secondary" />
                <h3 className="font-serif font-bold text-primary text-sm">Quick Commands</h3>
              </div>
            </div>
            <div className="p-2">
              {quickCommands.map((cmd, i) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={i}
                    onClick={() => { setInput(cmd.query); textareaRef.current?.focus(); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/5 text-left group transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 group-hover:bg-secondary/20 transition-colors">
                      <Icon className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-primary">{cmd.label}</div>
                      <div className="text-[10px] text-gray-500 truncate">{cmd.query}</div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-secondary group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capabilities */}
          <div className="bg-gradient-to-br from-primary to-blue-900 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="orb w-40 h-40 bg-secondary/20 -top-10 -right-10" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 backdrop-blur-md border border-white/10 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="font-serif font-bold mb-1">AI Capabilities</h3>
              <p className="text-xs text-gray-300 mb-4">What I can do for you</p>
              <ul className="space-y-2">
                {capabilities.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-xs text-gray-200">
                    <span className="w-1 h-1 rounded-full bg-secondary" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Live integration badge */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
            <MessageSquare className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-green-800 mb-0.5">Live Integration</div>
              <p className="text-[11px] text-green-700 leading-relaxed">
                Connected to OpenAI GPT-4o with real-time access to your CRM data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
