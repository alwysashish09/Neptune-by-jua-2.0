import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Loader2 } from "lucide-react";
import Markdown from "react-markdown";

interface NeptuneAIAssistantProps {
  token: string;
  facilityContext: any;
}

export default function NeptuneAIAssistant({ token, facilityContext }: NeptuneAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: "user" | "ai", text: string}[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: "ai", text: "Hello! I am the Neptune AI Assistant powered by Gemini. Ask me about your live thermal metrics, the Aqua-RL agent, or efficiency reports." }]);
    }
  }, [isOpen, messages.length]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    
    const userMsg = inputValue.trim();
    setInputValue("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/v1/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMsg,
          contextObj: facilityContext
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages(prev => [...prev, { role: "ai", text: `⚠️ Error: ${data.error?.message || "Something went wrong."}` }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", text: data.text }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", text: "⚠️ Connection error to AI service." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 rounded-full bg-[#4FC3F7] text-[#0A0E14] shadow-[0_0_20px_rgba(79,195,247,0.4)] hover:scale-105 hover:bg-[#29b6f6] transition-all z-50 flex items-center justify-center cursor-pointer"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-[#131822] border border-[#1F2733] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden" style={{ maxHeight: "calc(100vh - 100px)", height: "550px" }}>
          
          {/* Header */}
          <div className="p-4 bg-[#0d1117] border-b border-[#1F2733]/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#4FC3F7]" />
              <div>
                <h3 className="text-white font-semibold text-sm">Neptune Assistant</h3>
                <p className="text-[#64748B] text-[10px] uppercase font-mono tracking-wider">Powered by Gemini</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-[#64748B] hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#0A0E14]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                  msg.role === "user" 
                    ? "bg-[#1F2733] text-white rounded-tr-sm" 
                    : "bg-[#1C2C35] text-[#E2E8F0] border border-[#294B5E] rounded-tl-sm"
                }`}>
                  {msg.role === "ai" ? (
                    <div className="markdown-body text-sm prose prose-invert prose-p:leading-snug prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-pre:bg-[#0A0E14] prose-pre:border prose-pre:border-[#1F2733]">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#1C2C35] border border-[#294B5E] rounded-2xl rounded-tl-sm p-3 text-sm flex items-center gap-2 text-[#4FC3F7]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Analyzing telemetry...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-[#131822] border-t border-[#1F2733]/50">
            <div className="relative flex items-center">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about live efficiency or RL..."
                className="w-full bg-[#0A0E14] border border-[#1F2733] rounded-full pl-4 pr-12 py-3 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#4FC3F7] transition-colors"
                disabled={isTyping}
              />
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="absolute right-2 p-2 rounded-full text-[#4FC3F7] hover:bg-[#4FC3F7]/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
