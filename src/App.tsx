/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, Send, AlertCircle, Play, CheckCircle2, Loader2, Shield, Crown, BookOpen, Palette, Compass, Heart, HandHelping, Laugh, Clock, PenTool, AlertOctagon, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- CONFIGURATION ---
const BOT_TOKEN = '8260200134:AAFlf6xMu9DAYAKWDJVoLFczYRRzWVqijnY';
const CHAT_ID = '6789535208';

// --- DATA: 5 PROMPTS & SAMPLES ---
const TASKS = [
  {
    id: 1,
    title: "Đề 1 (Line Graph)",
    prompt: "The graph shows the amount of energy consumed by people in the UK between 1980 and 2010.",
    sampleIntro: "The line graph illustrates the amount of energy used by UK citizens over a 30-year period starting from 1980.",
    sampleOverview: "Overall, it is clear that energy consumption in the UK increased significantly. Additionally, the figure for 2010 was the most significant feature during the period."
  },
  {
    id: 2,
    title: "Đề 2 (Bar Chart)",
    prompt: "The chart shows the percentage of students participating in different types of sports in a local school in 2015.",
    sampleIntro: "The bar chart compares the proportion of school students who took part in various sports in one particular school in 2015.",
    sampleOverview: "Overall, it is clear that the levels of participation varied across different sports. Additionally, football was the most significant feature during the period."
  },
  {
    id: 3,
    title: "Đề 3 (Pie Chart)",
    prompt: "The pie charts show how households in Japan spent their money every month in 2020.",
    sampleIntro: "The pie charts depict the monthly expenditure of Japanese households in the year 2020.",
    sampleOverview: "Overall, it is clear that spending on essential items was dominant. Additionally, the proportion of money spent on food was the most significant feature during the period."
  },
  {
    id: 4,
    title: "Đề 4 (Table)",
    prompt: "The table shows the number of international tourists visiting five major cities in 2012 and 2013.",
    sampleIntro: "The table provides information on the figure for foreign tourists to five famous cities between 2012 and 2013.",
    sampleOverview: "Overall, it is clear that the number of visitors to most cities rose slightly. Additionally, Paris was the most significant feature during the period."
  },
  {
    id: 5,
    title: "Đề 5 (Mixed - Bar & Line)",
    prompt: "The charts show the total population and the birth rate in a European country from 2000 to 2020.",
    sampleIntro: "The mixed charts illustrate the total number of inhabitants and the birth rate in a nation in Europe from 2000 to 2020.",
    sampleOverview: "Overall, it is clear that the population increased while the birth rate declined. Additionally, the total population in 2020 was the most significant feature during the period."
  }
];

const ARCHETYPES = [
  { id: 'warrior', name: 'Warrior', icon: <Shield className="w-8 h-8" /> },
  { id: 'leader', name: 'Leader', icon: <Crown className="w-8 h-8" /> },
  { id: 'sage', name: 'Sage', icon: <BookOpen className="w-8 h-8" /> },
  { id: 'creator', name: 'Creator', icon: <Palette className="w-8 h-8" /> },
  { id: 'explorer', name: 'Explorer', icon: <Compass className="w-8 h-8" /> },
  { id: 'lover', name: 'Lover', icon: <Heart className="w-8 h-8" /> },
  { id: 'caregiver', name: 'Caregiver', icon: <HandHelping className="w-8 h-8" /> },
  { id: 'jester', name: 'Jester', icon: <Laugh className="w-8 h-8" /> },
];

export default function App() {
  const [state, setState] = useState<'WELCOME' | 'QUIZ' | 'COMPLETION'>('WELCOME');
  const [name, setName] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes in seconds

  // --- TIMER LOGIC ---
  useEffect(() => {
    let timer: any;
    if (state === 'QUIZ' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && state === 'QUIZ') {
      handleSubmit(new Event('submit') as any);
    }
    return () => clearInterval(timer);
  }, [state, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- FULLSCREEN EXIT DETECTION ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && state === 'QUIZ') {
        alert("Kỷ luật sắt! Thoát Fullscreen đồng nghĩa với việc hủy bài làm.");
        setState('WELCOME');
        setAnswers({});
        setTimeLeft(1200);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [state]);

  const normalize = (str: string) => {
    if (!str) return "";
    return str.toLowerCase()
              .trim()
              .replace(/[.,!?;:]/g, "") // Remove punctuation
              .replace(/\s+/g, " ");    // Collapse multiple spaces
  };

  const handleStart = async () => {
    if (!name.trim() || !selectedArchetype) {
      setError("Chiến binh cần danh tính và hệ nhân vật để xuất kích!");
      return;
    }
    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      setState('QUIZ');
      setTimeLeft(1200);
      setError(null);
    } catch (err) { setState('QUIZ'); }
  };

  const resetQuiz = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    setState('WELCOME');
    setAnswers({});
    setScore(0);
    setTimeLeft(1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    let totalScore = 0;
    
    // Grading Logic for 10 writing parts (5 Intro + 5 Overview)
    TASKS.forEach(task => {
      if (normalize(answers[`intro-${task.id}`]) === normalize(task.sampleIntro)) totalScore++;
      if (normalize(answers[`overview-${task.id}`]) === normalize(task.sampleOverview)) totalScore++;
    });

    setScore(totalScore);

    // MESSAGE CONSTRUCTED FOR TELEGRAM
    let reportText = "";
    TASKS.forEach(t => {
      reportText += `\n[${t.title}]\nIntro: ${answers[`intro-${t.id}`] || 'N/A'}\nOverview: ${answers[`overview-${t.id}`] || 'N/A'}\n`;
    });

    const message = `📝 WRITING TASK 1 REPORT\n👤 Student: ${name}\n🎭 Archetype: ${selectedArchetype.name}\n✅ TOTAL ACCURACY: ${totalScore}/10\n\n--- STUDENT INTEL ---${reportText}`;

    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message })
      });
      setState('COMPLETION');
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-red-500/30 overflow-x-hidden flex flex-col items-center">
      <AnimatePresence mode="wait">
        {state === 'WELCOME' && (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-screen p-6 max-w-4xl mx-auto w-full">
            <div className="bg-zinc-900 border border-red-500/20 p-10 rounded-[2rem] shadow-2xl text-center backdrop-blur-md w-full">
              <div className="inline-flex w-20 h-20 bg-red-500/10 rounded-full items-center justify-center mb-6 border border-red-500/30">
                <PenTool className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter mb-2 uppercase">Honor Class <span className="text-red-500 italic">1A</span></h1>
              <p className="text-zinc-400 text-sm mb-10 uppercase tracking-[0.2em]">Mission 06: Intro & Overview Mastery</p>
              
              <div className="space-y-8 text-left max-w-lg mx-auto">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-widest text-center">Xác nhận danh tính</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên của em..." className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-5 text-center text-red-400 focus:ring-2 focus:ring-red-500 transition-all outline-none text-xl font-bold" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 mb-4 uppercase tracking-widest text-center">Chọn hệ nhân vật</label>
                  <div className="grid grid-cols-4 gap-3">
                    {ARCHETYPES.map(a => (
                      <button key={a.id} onClick={() => setSelectedArchetype(a)} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center ${selectedArchetype?.id === a.id ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900'}`}>
                        <div className={`${selectedArchetype?.id === a.id ? 'text-red-500' : 'text-zinc-600'}`}>{a.icon}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-red-500 text-xs text-center font-bold animate-pulse">{error}</p>}

                <button onClick={handleStart} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-lg shadow-red-900/20">Kích hoạt tác chiến</button>
              </div>
            </div>
          </motion.div>
        )}

        {state === 'QUIZ' && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto px-6 py-12 w-full">
            <div className="sticky top-4 z-50 flex justify-between items-center mb-12 bg-zinc-900/80 backdrop-blur-xl p-5 rounded-[1.5rem] border border-zinc-800 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/20">{selectedArchetype.icon}</div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">{name}</h2>
                  <p className="text-[10px] text-red-500 font-black tracking-widest uppercase">Honor Class 1A • Task 1</p>
                </div>
              </div>
              <div className="bg-zinc-950 px-6 py-3 rounded-xl border border-zinc-800 flex items-center gap-3">
                <Clock className="text-red-500 w-5 h-5 animate-pulse" />
                <span className="font-mono text-2xl font-black">{formatTime(timeLeft)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-24 pb-40">
              <div className="bg-red-950/20 border-l-4 border-red-600 p-6 rounded-r-2xl">
                <h3 className="text-red-500 font-black uppercase mb-2 flex items-center gap-2"><AlertOctagon size={20}/> Cảnh báo kỷ luật thép</h3>
                <p className="text-sm text-zinc-400 italic">"Sai một li, đi một dặm. Band 5.5 không chấp nhận lỗi ngữ pháp cơ bản. Template Overview phải chuẩn 100%."</p>
              </div>

              {TASKS.map((task, index) => (
                <section key={task.id} className="space-y-10">
                  <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
                    <span className="text-5xl font-black text-zinc-800">{String(index + 1).padStart(2, '0')}</span>
                    <h3 className="text-3xl font-black uppercase italic text-zinc-200">{task.title}</h3>
                  </div>
                  
                  <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800 space-y-8">
                    <div>
                      <p className="text-zinc-500 text-xs font-black uppercase mb-3 tracking-widest">Topic Prompt:</p>
                      <p className="text-xl font-serif text-zinc-100 leading-relaxed italic">"{task.prompt}"</p>
                    </div>

                    <div className="grid gap-8">
                      <div>
                        <label className="block text-xs font-black text-red-500 mb-3 uppercase tracking-widest">Mission 1: Introduction (Paraphrase)</label>
                        <textarea required value={answers[`intro-${task.id}`] || ''} onChange={e => setAnswers({...answers, [`intro-${task.id}`]: e.target.value})} placeholder="Viết lại mở bài của em tại đây..." className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6 h-32 focus:border-red-500 outline-none text-zinc-200 font-serif text-lg leading-relaxed shadow-inner transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-red-500 mb-3 uppercase tracking-widest">Mission 2: Overview (Template 1A)</label>
                        <textarea required value={answers[`overview-${task.id}`] || ''} onChange={e => setAnswers({...answers, [`overview-${task.id}`]: e.target.value})} placeholder="Overall, it is clear that..." className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6 h-32 focus:border-red-500 outline-none text-zinc-200 font-serif text-lg leading-relaxed shadow-inner transition-all" />
                      </div>
                    </div>
                  </div>
                </section>
              ))}

              <section className="bg-zinc-900 border-2 border-dashed border-zinc-800 p-10 rounded-[2rem]">
                <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2"><ClipboardCheck className="text-emerald-500"/> Quality Checklist</h3>
                <div className="grid gap-4">
                  {[
                    "Đã chia đúng thì Quá khứ đơn (Past Simple) chưa?",
                    "Sử dụng đúng cấu trúc Number of (Số nhiều) / Amount of (Không đếm được)?",
                    "Đã có từ nối 'Overall' ở đầu Overview chưa?",
                    "Kiểm tra chính tả các từ increased, decreased, fluctuated?",
                    "Bài viết có đủ 2 đoạn riêng biệt (Intro và Overview)?"
                  ].map((item, i) => (
                    <label key={i} className="flex items-center gap-4 cursor-pointer group">
                      <input type="checkbox" required className="w-6 h-6 rounded border-zinc-700 bg-zinc-950 checked:bg-red-600 cursor-pointer" />
                      <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors">{item}</span>
                    </label>
                  ))}
                </div>
              </section>

              <div className="fixed bottom-0 left-0 right-0 p-8 bg-zinc-950/90 backdrop-blur-2xl border-t border-zinc-900 flex justify-center z-40">
                <button type="submit" disabled={isSubmitting} className="w-full max-w-md bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white font-black text-xl py-6 rounded-2xl shadow-2xl shadow-red-900/40 transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-3">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send className="w-6 h-6" /> Nộp báo cáo tác chiến</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {state === 'COMPLETION' && (
          <motion.div key="completion" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-screen p-6 text-center w-full max-w-4xl mx-auto">
             <Trophy size={80} className="text-yellow-500 mb-6" />
             <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter">BÁO CÁO ĐÃ GỬI</h2>
             <p className="text-zinc-400 mb-10 italic font-serif">Kết quả chấm điểm tự động dựa trên độ chuẩn xác so với Target của Thầy Trường:</p>
             
             <div className="bg-zinc-900 border-4 border-red-500/30 rounded-[2.5rem] p-10 mb-12 w-full shadow-2xl">
                <div className="text-9xl font-black text-red-500 mb-2">{score}<span className="text-zinc-600 text-4xl">/10</span></div>
                <div className="text-xs text-zinc-500 uppercase font-black tracking-[0.3em] border-t border-zinc-800 pt-6">Accuracy Rating</div>
             </div>

             <div className="grid gap-6 w-full text-left overflow-y-auto max-h-[40vh] pr-4 custom-scrollbar">
                {TASKS.map(t => (
                  <div key={t.id} className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-4">
                    <h4 className="text-red-500 font-bold uppercase text-xs tracking-widest border-b border-zinc-800 pb-2">{t.title} - Target Reference</h4>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Target Intro:</p>
                      <p className="text-sm text-emerald-400 italic">"{t.sampleIntro}"</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">Target Overview:</p>
                      <p className="text-sm text-emerald-400 italic">"{t.sampleOverview}"</p>
                    </div>
                  </div>
                ))}
             </div>

             <button onClick={resetQuiz} className="mt-12 text-zinc-500 hover:text-white font-bold uppercase tracking-widest underline underline-offset-8 transition-all">Trở về căn cứ</button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ef4444; }
      `}</style>
    </div>
  );
}
