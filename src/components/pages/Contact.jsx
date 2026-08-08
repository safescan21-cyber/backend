import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

// ══════════════════════════════════════════════════════════
//  CONFIG  ← customize these
// ══════════════════════════════════════════════════════════
const WHATSAPP_NUMBER = "919999999999"; // country code + number, no +
const WHATSAPP_DEFAULT_MSG = "Hi! I got your contact from the website and would like to know more.";

const COMPANY_SYSTEM = `You are "Nova", a smart, warm and witty support agent for Studio — a premium creative design agency.
Services: branding, web design, motion graphics, UI/UX, 3D, and digital strategy.
Rules:
- Keep replies to 2–3 sentences max. Be conversational and human, never robotic.
- Never invent specific prices. Say pricing is project-based; invite them to fill the contact form or jump on WhatsApp.
- If asked to connect to WhatsApp, tell them to click the green WhatsApp button in the chat.
- Sign off warmly. Be helpful, clever, never salesy.`;

// ══════════════════════════════════════════════════════════
//  CHART HELPERS
// ══════════════════════════════════════════════════════════
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + ":00");
const seedData = () => HOURS.map(hour => ({
  hour,
  messages:  Math.floor(Math.random() * 80 + 10),
  responses: Math.floor(Math.random() * 60 + 5),
}));

const STATS = [
  { label: "Avg. Response", value: "1.8h", delta: "−18%", up: true  },
  { label: "Open Rate",     value: "96%",  delta: "+5%",  up: true  },
  { label: "Pending",       value: "4",    delta: "−3",   up: true  },
];

// ══════════════════════════════════════════════════════════
//  QUICK REPLIES
// ══════════════════════════════════════════════════════════
const QUICK_REPLIES = [
  { icon: "🎨", text: "What services do you offer?" },
  { icon: "💰", text: "How do I get a quote?" },
  { icon: "⚡", text: "What's your turnaround time?" },
  { icon: "📞", text: "Connect me to WhatsApp" },
];

// ══════════════════════════════════════════════════════════
//  CHART TOOLTIP
// ══════════════════════════════════════════════════════════
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#111", border: "1px solid #333", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontFamily: "sans-serif" }}>
      <p style={{ color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong style={{ color: "#fff" }}>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════
//  LIVE CHART
// ══════════════════════════════════════════════════════════
function LiveChart() {
  const [data,  setData]  = useState(seedData);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => {
        const next = [...prev];
        const idx  = Math.floor(Math.random() * next.length);
        next[idx]  = {
          ...next[idx],
          messages:  Math.max(5,  next[idx].messages  + Math.floor(Math.random() * 22 - 11)),
          responses: Math.max(2,  next[idx].responses + Math.floor(Math.random() * 16 - 8)),
        };
        return next;
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 500);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const peak = data.reduce((a, b) => (b.messages > a.messages ? b : a), data[0]);

  return (
    <div className="mt-24">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-amber-500 mb-2 font-sans">— Live analytics</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "Georgia,serif" }}>
            Message Activity
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full bg-emerald-400 transition-all duration-300 ${pulse ? "scale-150 shadow-[0_0_8px_#34d399]" : "scale-100 opacity-60"}`} />
          <span className="text-xs text-emerald-400 tracking-[0.3em] uppercase font-sans font-semibold">Live</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {STATS.map(({ label, value, delta, up }) => (
          <div key={label} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 group hover:border-amber-500/40 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-500 font-sans mb-2">{label}</p>
            <p className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "Georgia,serif" }}>{value}</p>
            <span className={`text-xs font-sans font-semibold px-2 py-0.5 rounded-full ${up ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
              {delta} this week
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
        <div className="flex flex-wrap items-center gap-6 mb-6">
          {[["#f59e0b", "Messages"], ["#34d399", "Responses"]].map(([c, n]) => (
            <div key={n} className="flex items-center gap-2">
              <span className="w-5 h-0.5 rounded-full inline-block" style={{ background: c }} />
              <span className="text-[11px] text-stone-400 uppercase tracking-[0.25em] font-sans">{n}</span>
            </div>
          ))}
          <span className="ml-auto text-xs text-stone-600 font-sans">
            Peak: <span className="text-amber-400 font-bold">{peak.hour}</span> ({peak.messages} msgs)
          </span>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              {[["gradM", "#f59e0b", 0.3], ["gradR", "#34d399", 0.22]].map(([id, c, o]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={c} stopOpacity={o} />
                  <stop offset="95%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 6" stroke="#1e1c1a" vertical={false} />
            <XAxis dataKey="hour" tick={{ fill: "#57534e", fontSize: 10, fontFamily: "sans-serif" }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fill: "#57534e", fontSize: 10, fontFamily: "sans-serif" }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#44403c", strokeWidth: 1 }} />
            <ReferenceLine x={peak.hour} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.35} />
            <Area type="monotone" dataKey="messages"  name="Messages"  stroke="#f59e0b" strokeWidth={2} fill="url(#gradM)" dot={false} activeDot={{ r: 5, fill: "#f59e0b", stroke: "#0e0c0a", strokeWidth: 2 }} animationDuration={500} />
            <Area type="monotone" dataKey="responses" name="Responses" stroke="#34d399" strokeWidth={2} fill="url(#gradR)" dot={false} activeDot={{ r: 5, fill: "#34d399", stroke: "#0e0c0a", strokeWidth: 2 }} animationDuration={500} />
          </AreaChart>
        </ResponsiveContainer>

        <p className="text-center text-[11px] text-stone-700 font-sans mt-4 tracking-wider">
          Refreshes every 2 s · 24‑hour window
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  WHATSAPP BUTTON
// ══════════════════════════════════════════════════════════
function WhatsAppButton({ aiSummary = "" }) {
  const msg = aiSummary
    ? `${WHATSAPP_DEFAULT_MSG}\n\nContext from chat: ${aiSummary}`
    : WHATSAPP_DEFAULT_MSG;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl px-4 py-3 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(37,211,102,0.4)] group"
    >
      {/* WhatsApp SVG */}
      <svg viewBox="0 0 32 32" className="w-5 h-5 flex-shrink-0" fill="white">
        <path d="M16 .5C7.439.5.5 7.439.5 16c0 2.765.727 5.461 2.109 7.836L.5 31.5l7.906-2.07A15.45 15.45 0 0016 31.5c8.561 0 15.5-6.939 15.5-15.5S24.561.5 16 .5zm0 28.35a13.8 13.8 0 01-7.049-1.934l-.505-.3-5.242 1.373 1.4-5.105-.33-.524A13.85 13.85 0 012.15 16C2.15 8.35 8.35 2.15 16 2.15S29.85 8.35 29.85 16 23.65 28.85 16 28.85zm7.576-10.36c-.416-.208-2.46-1.213-2.841-1.352-.38-.138-.657-.208-.934.208-.277.416-1.073 1.352-1.315 1.629-.242.277-.484.311-.9.104-.416-.208-1.756-.647-3.345-2.064-1.236-1.1-2.07-2.46-2.313-2.876-.242-.416-.026-.64.182-.847.187-.186.416-.484.624-.727.208-.242.277-.416.416-.693.138-.277.069-.52-.035-.727-.104-.208-.934-2.252-1.28-3.083-.337-.81-.68-.7-.934-.713l-.796-.014c-.277 0-.727.104-1.108.52-.38.416-1.454 1.42-1.454 3.463s1.489 4.017 1.697 4.294c.208.277 2.932 4.476 7.104 6.277.993.428 1.768.684 2.371.875.996.317 1.903.272 2.62.165.8-.12 2.46-.935 2.807-1.836.346-.9.346-1.672.242-1.836-.104-.165-.38-.277-.796-.484z"/>
      </svg>
      <div className="text-left flex-1">
        <p className="text-sm font-bold leading-tight">Chat on WhatsApp</p>
        <p className="text-[11px] text-white/75 leading-tight">Continue with a real agent</p>
      </div>
      <svg className="w-4 h-4 opacity-75 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}

// ══════════════════════════════════════════════════════════
//  MESSAGE BUBBLE
// ══════════════════════════════════════════════════════════
function Bubble({ msg, isNew }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
      style={{ animation: isNew ? "popIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both" : "none" }}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 mb-0.5 shadow-lg shadow-amber-500/20">
          <span className="text-sm">✦</span>
        </div>
      )}
      <div className={`max-w-[80%] px-4 py-2.5 text-sm font-sans leading-relaxed ${
        isUser
          ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl rounded-br-sm shadow-lg shadow-amber-500/20"
          : "bg-stone-800/90 text-stone-200 rounded-2xl rounded-bl-sm border border-white/8 backdrop-blur-sm"
      }`}>
        {msg.content}
        {msg.showWhatsApp && (
          <div className="mt-3">
            <WhatsAppButton aiSummary={msg.waSummary} />
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center flex-shrink-0 mb-0.5">
          <svg className="w-4 h-4 text-stone-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  TYPING DOTS
// ══════════════════════════════════════════════════════════
function TypingDots() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
        <span className="text-sm">✦</span>
      </div>
      <div className="bg-stone-800/90 border border-white/8 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-stone-400 inline-block" style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.18}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  LIVE CHAT PANEL
// ══════════════════════════════════════════════════════════
const INIT_MSG = { role: "assistant", content: "Hey there! 👋 I'm Nova, your Studio assistant. Ask me anything about our services — or jump straight to WhatsApp for a personal touch.", isNew: false };

function LiveChat() {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([INIT_MSG]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [unread,  setUnread]  = useState(1);
  const [newMsgId, setNewMsgId] = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const chatHistory = useRef([]);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 200); }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const detectWhatsApp = (text) =>
    /whatsapp|whats app|wa\.me|ring|call|phone|speak|human|agent|connect|talk to someone/i.test(text);

  const sendMessage = useCallback(async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");

    const userMsg = { role: "user", content, isNew: true };
    setMsgs(prev => [...prev, userMsg]);
    setLoading(true);

    chatHistory.current = [...chatHistory.current, { role: "user", content }];

    try {
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model:      "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system:     COMPANY_SYSTEM,
          messages:   chatHistory.current,
        }),
      });
      const data  = await res.json();
      const reply = data?.content?.[0]?.text || "Sorry, I couldn't respond right now. Try WhatsApp for immediate help!";

      const wantsWA = detectWhatsApp(content) || detectWhatsApp(reply);
      const summary = chatHistory.current.slice(-3).map(m => m.content).join(" | ");

      const botMsg = { role: "assistant", content: reply, isNew: true, showWhatsApp: wantsWA, waSummary: summary };
      chatHistory.current = [...chatHistory.current, { role: "assistant", content: reply }];

      setMsgs(prev => [...prev, botMsg]);
      setNewMsgId(Date.now());
      if (!open) setUnread(n => n + 1);
    } catch {
      setMsgs(prev => [...prev, {
        role: "assistant",
        content: "Oops! Something went wrong on my end. You can reach us directly on WhatsApp 👇",
        isNew: true, showWhatsApp: true, waSummary: ""
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, open]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes typingBounce {
          0%,60%,100% { transform: translateY(0);   opacity: 0.4; }
          30%          { transform: translateY(-7px); opacity: 1;   }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0   rgba(245,158,11,0.5); }
          70%  { box-shadow: 0 0 0 14px rgba(245,158,11,0);   }
          100% { box-shadow: 0 0 0 0   rgba(245,158,11,0);   }
        }
        .chat-panel { animation: chatSlideUp 0.3s cubic-bezier(0.34,1.2,0.64,1) both; }
        .fab-pulse  { animation: pulseRing 2s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #44403c; border-radius: 2px; }
      `}</style>

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle chat"
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${open ? "bg-stone-700 hover:bg-stone-600" : "bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 fab-pulse"}`}
      >
        <div className="relative">
          {open ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-white drop-shadow" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 2C8.268 2 2 8.268 2 16c0 2.47.659 4.786 1.808 6.782L2 30l7.47-1.78A13.94 13.94 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.3a11.28 11.28 0 01-5.76-1.58l-.414-.246-4.287 1.124 1.145-4.175-.27-.43A11.29 11.29 0 014.7 16C4.7 9.7 9.7 4.7 16 4.7S27.3 9.7 27.3 16 22.3 27.3 16 27.3zm6.2-8.47c-.34-.17-2.01-.99-2.32-1.1-.31-.113-.537-.17-.763.17-.227.34-.877 1.104-1.075 1.33-.197.227-.395.255-.735.085-.34-.17-1.436-.53-2.735-1.688-1.011-.9-1.694-2.013-1.893-2.352-.198-.34-.021-.523.149-.692.153-.153.34-.396.51-.595.17-.198.226-.34.34-.567.113-.226.056-.425-.028-.595-.085-.17-.763-1.84-1.046-2.52-.275-.662-.555-.572-.763-.583l-.65-.01c-.227 0-.596.085-.907.425-.31.34-1.188 1.16-1.188 2.83s1.217 3.28 1.387 3.508c.17.226 2.396 3.66 5.81 5.13.812.35 1.445.559 1.938.716.814.259 1.556.222 2.142.135.653-.098 2.01-.764 2.294-1.501.283-.736.283-1.367.198-1.501-.085-.134-.31-.226-.65-.396z"/>
            </svg>
          )}
          {!open && unread > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold font-sans flex items-center justify-center shadow-lg">
              {unread}
            </span>
          )}
        </div>
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="chat-panel fixed bottom-28 right-4 sm:right-6 z-50 flex flex-col rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden"
          style={{ width: "min(380px, calc(100vw - 2rem))", maxHeight: "calc(100vh - 140px)", background: "linear-gradient(160deg,#141210 0%,#0e0c0a 100%)" }}>

          {/* Header */}
          <div className="relative px-5 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#1c1a17 0%,#161310 100%)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {/* Ambient glow */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-t-3xl pointer-events-none">
              <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-amber-500/10 blur-2xl" />
            </div>

            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
              <span className="text-lg">✦</span>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#1c1a17]" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white font-sans truncate">Nova · Studio AI</p>
              <p className="text-xs text-emerald-400 font-sans flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Online · replies instantly
              </p>
            </div>

            <button onClick={() => setOpen(false)} className="text-stone-500 hover:text-stone-300 transition-colors ml-1 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* WhatsApp strip */}
          <div className="px-4 py-2.5" style={{ background: "rgba(37,211,102,0.07)", borderBottom: "1px solid rgba(37,211,102,0.15)" }}>
            <WhatsAppButton aiSummary={chatHistory.current.slice(-2).map(m => m.content).join(" | ")} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 min-h-[220px]">
            {msgs.map((m, i) => <Bubble key={i} msg={m} isNew={m.isNew} />)}
            {loading && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* Quick Replies */}
          {msgs.length <= 1 && !loading && (
            <div className="px-4 pb-3">
              <p className="text-[10px] tracking-widest uppercase text-stone-600 font-sans mb-2">Quick questions</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_REPLIES.map(({ icon, text }) => (
                  <button
                    key={text}
                    onClick={() => sendMessage(text)}
                    className="flex items-center gap-2 text-left text-xs font-sans bg-stone-800/60 hover:bg-amber-500/15 border border-white/8 hover:border-amber-500/40 text-stone-300 hover:text-amber-300 px-3 py-2.5 rounded-xl transition-all duration-200"
                  >
                    <span>{icon}</span>
                    <span className="leading-snug">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 flex items-end gap-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
              }}
              onKeyDown={handleKey}
              placeholder="Ask Nova anything…"
              disabled={loading}
              className="flex-1 bg-stone-800/50 border border-white/8 focus:border-amber-500/50 rounded-xl outline-none resize-none text-sm text-stone-100 placeholder-stone-600 font-sans px-3 py-2.5 max-h-24 leading-relaxed transition-all duration-200 disabled:opacity-40"
              style={{ minHeight: 40 }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:from-stone-700 disabled:to-stone-700 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20 disabled:shadow-none"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

          <div className="text-center py-2" style={{ background: "rgba(0,0,0,0.3)" }}>
            <p className="text-[10px] text-stone-700 font-sans tracking-wider">
              Powered by <span className="text-stone-500">Claude AI</span> · Enter to send
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════
//  INPUT FIELD
// ══════════════════════════════════════════════════════════
const InputField = ({ label, type = "text", name, value, onChange, placeholder, error }) => (
  <div className="relative group">
    <label className="block text-[10px] font-bold tracking-[0.3em] uppercase text-stone-500 mb-2 font-sans">{label}</label>
    <input
      type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      className={`w-full bg-transparent border-b-2 ${error ? "border-rose-500" : "border-stone-800 group-hover:border-amber-500/60"} focus:border-amber-400 outline-none py-3 px-0 text-stone-100 placeholder-stone-700 transition-all duration-300 text-sm font-sans`}
    />
    {error && <p className="text-rose-400 text-xs mt-1.5 font-sans">{error}</p>}
  </div>
);

// ══════════════════════════════════════════════════════════
//  CONTACT PAGE
// ══════════════════════════════════════════════════════════
export default function Contact() {
  const [form,   setForm]   = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name    = "Name is required";
    if (!form.email.trim()) e.email   = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.message.trim()) e.message = "Message cannot be empty";
    return e;
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setStatus("sending");
    setTimeout(() => { setStatus("sent"); setForm({ name: "", email: "", subject: "", message: "" }); }, 1800);
  };

  return (
    <div className="min-h-screen text-stone-100 relative overflow-hidden" style={{ background: "#09080a" }}>

      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-[100px]" style={{ background: "radial-gradient(circle,#f59e0b,transparent)" }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03] blur-[80px]" style={{ background: "radial-gradient(circle,#f97316,transparent)" }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">

        {/* ── HEADER ── */}
        <div className="mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 border border-amber-500/30 bg-amber-500/10 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-xs tracking-[0.3em] uppercase text-amber-400 font-sans font-semibold">Get in touch</p>
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black leading-none text-white" style={{ fontFamily: "Georgia,serif", letterSpacing: "-0.03em" }}>
            Let's{" "}
            <span className="relative inline-block">
              <span className="text-transparent" style={{ WebkitTextStroke: "2px #f59e0b" }}>Talk.</span>
            </span>
          </h1>
          <p className="mt-6 text-stone-400 text-base sm:text-lg font-sans max-w-md leading-relaxed">
            Drop us a message, chat live with Nova, or continue directly on WhatsApp.
          </p>
          <div className="mt-8 flex items-center gap-4 flex-wrap">
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_DEFAULT_MSG)}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-bold font-sans px-5 py-3 rounded-xl transition-all duration-200 hover:shadow-[0_4px_20px_rgba(37,211,102,0.35)] hover:-translate-y-0.5">
              <svg viewBox="0 0 32 32" className="w-4 h-4" fill="white"><path d="M16 .5C7.439.5.5 7.439.5 16c0 2.765.727 5.461 2.109 7.836L.5 31.5l7.906-2.07A15.45 15.45 0 0016 31.5c8.561 0 15.5-6.939 15.5-15.5S24.561.5 16 .5zm0 28.35a13.8 13.8 0 01-7.049-1.934l-.505-.3-5.242 1.373 1.4-5.105-.33-.524A13.85 13.85 0 012.15 16C2.15 8.35 8.35 2.15 16 2.15S29.85 8.35 29.85 16 23.65 28.85 16 28.85zm7.576-10.36c-.416-.208-2.46-1.213-2.841-1.352-.38-.138-.657-.208-.934.208-.277.416-1.073 1.352-1.315 1.629-.242.277-.484.311-.9.104-.416-.208-1.756-.647-3.345-2.064-1.236-1.1-2.07-2.46-2.313-2.876-.242-.416-.026-.64.182-.847.187-.186.416-.484.624-.727.208-.242.277-.416.416-.693.138-.277.069-.52-.035-.727-.104-.208-.934-2.252-1.28-3.083-.337-.81-.68-.7-.934-.713l-.796-.014c-.277 0-.727.104-1.108.52-.38.416-1.454 1.42-1.454 3.463s1.489 4.017 1.697 4.294c.208.277 2.932 4.476 7.104 6.277.993.428 1.768.684 2.371.875.996.317 1.903.272 2.62.165.8-.12 2.46-.935 2.807-1.836.346-.9.346-1.672.242-1.836-.104-.165-.38-.277-.796-.484z"/></svg>
              WhatsApp Us
            </a>
            <span className="text-stone-600 text-sm font-sans">or scroll down to fill the form</span>
          </div>
        </div>

        {/* ── GRID ── */}
        <div className="grid md:grid-cols-5 gap-12 lg:gap-20 items-start">

          {/* Left */}
          <div className="md:col-span-2 space-y-10">

            {/* Contact info */}
            <div className="space-y-6">
              {[
                { label: "Email", value: "hello@studio.com", d: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
                { label: "Phone", value: "+91 99999 99999",  d: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
                { label: "Studio", value: "New Delhi, India",  d: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" },
              ].map(({ label, value, d }) => (
                <div key={label} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-amber-400 flex-shrink-0 group-hover:border-amber-500/40 group-hover:bg-amber-500/10 transition-all duration-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-stone-600 font-sans">{label}</p>
                    <p className="text-stone-200 text-sm font-sans">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* WhatsApp card */}
            <div className="rounded-2xl border border-[#25D366]/25 p-5" style={{ background: "rgba(37,211,102,0.05)" }}>
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#25D366] font-sans mb-3">⚡ Fastest reply</p>
              <p className="text-stone-400 text-sm font-sans leading-relaxed mb-4">
                Skip the form. Chat directly on WhatsApp — our team responds within minutes during business hours.
              </p>
              <WhatsAppButton />
            </div>

            {/* Socials */}
            <div className="flex gap-3">
              {["Twitter", "LinkedIn", "GitHub", "Dribbble"].map(s => (
                <a key={s} href="#" className="text-[10px] tracking-widest uppercase text-stone-600 hover:text-amber-400 transition-colors font-sans">{s}</a>
              ))}
            </div>
          </div>

          {/* Right — Form */}
          <div className="md:col-span-3">
            <div className="rounded-2xl border border-white/8 p-6 sm:p-8" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(10px)" }}>
              {status === "sent" ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-5">
                  <div className="w-16 h-16 rounded-full border-2 border-amber-400 flex items-center justify-center" style={{ animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                    <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Georgia,serif" }}>Message Received!</h2>
                  <p className="text-stone-400 text-sm font-sans max-w-xs">We'll get back to you within 24 hours. Or reach us instantly on WhatsApp.</p>
                  <WhatsAppButton />
                  <button onClick={() => setStatus("idle")} className="text-xs tracking-widest uppercase text-stone-500 hover:text-amber-400 transition-colors font-sans">
                    Send another →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-stone-600 font-sans mb-6">Send a message</p>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <InputField label="Full Name"     name="name"    value={form.name}    onChange={handleChange} placeholder="Jane Smith"       error={errors.name} />
                      <InputField label="Email Address" name="email"   value={form.email}   onChange={handleChange} placeholder="jane@studio.com"  error={errors.email} type="email" />
                    </div>
                  </div>
                  <InputField label="Subject" name="subject" value={form.subject} onChange={handleChange} placeholder="What's on your mind?" />
                  <div className="relative group">
                    <label className="block text-[10px] font-bold tracking-[0.3em] uppercase text-stone-500 mb-2 font-sans">Message</label>
                    <textarea
                      name="message" value={form.message} onChange={handleChange} rows={5} placeholder="Tell us about your project…"
                      className={`w-full bg-transparent border-b-2 ${errors.message ? "border-rose-500" : "border-stone-800 group-hover:border-amber-500/60"} focus:border-amber-400 outline-none py-3 px-0 text-stone-100 placeholder-stone-700 transition-all duration-300 resize-none text-sm font-sans`}
                    />
                    {errors.message && <p className="text-rose-400 text-xs mt-1.5 font-sans">{errors.message}</p>}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                    <button type="submit" disabled={status === "sending"}
                      className="group inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-stone-700 disabled:to-stone-700 text-white disabled:text-stone-500 px-7 py-3.5 rounded-xl text-sm font-bold font-sans transition-all duration-300 hover:shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                      <span>{status === "sending" ? "Sending…" : "Send Message"}</span>
                      {status !== "sending" && (
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      )}
                    </button>
                    <span className="text-xs text-stone-600 font-sans">or jump to WhatsApp for instant replies</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* ── CHART ── */}
        <LiveChart />

        {/* Footer */}
        <div className="mt-20 border-t border-white/5 pt-8 flex flex-wrap justify-between items-center gap-4">
          <p className="text-xs text-stone-700 tracking-widest uppercase font-sans">© 2026 Studio</p>
          <p className="text-xs text-stone-700 font-sans italic">Crafted with obsession.</p>
        </div>
      </div>

      {/* Floating Chat */}
      <LiveChat />
    </div>
  );
}