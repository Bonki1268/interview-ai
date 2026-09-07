'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Mic, Square, Loader2, Sparkles } from 'lucide-react';

interface Question { id: string; question_number: number; question_text: string; }
interface InterviewData { interviewId: string; questions: Question[]; timeLimit: number; position: string; }
interface Answer { questionId: string; transcript: string; durationSeconds: number; audioBlob: Blob | null; }

export default function InterviewPage() {
  const router = useRouter();
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRec, setIsRec] = useState(false);
  const [isProc, setIsProc] = useState(false);
  const [recStatus, setRecStatus] = useState('語音辨識待命中');
  const [levels, setLevels] = useState<number[]>(new Array(30).fill(8));
  const [answers, setAnswers] = useState<Answer[]>([]);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const d = sessionStorage.getItem('current_interview');
    if (!d) { router.push('/lobby'); return; }
    const p = JSON.parse(d) as InterviewData;
    setInterviewData(p);
    setTimeLeft(p.timeLimit);
    setAnswers(p.questions.map((q) => ({ questionId: q.id, transcript: '', durationSeconds: 0, audioBlob: null })));
  }, [router]);

  const stopRecording = useCallback(async () => {
    if (!mrRef.current || !isRec) return;
    setIsRec(false);
    setRecStatus('語音辨識待命中');
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setLevels(new Array(30).fill(8));
    const dur = Math.round((Date.now() - startTimeRef.current) / 1000);
    mrRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      streamRef.current?.getTracks().forEach(t => t.stop());
      const newA = [...answers];
      newA[qIdx] = { ...newA[qIdx], audioBlob: blob, durationSeconds: dur };
      setAnswers(newA);
      if (interviewData && qIdx >= interviewData.questions.length - 1) {
        setIsProc(true);
        // Process
        try {
          const processed = [];
          for (const a of newA) {
            let tr = '(未作答)';
            if (a.audioBlob && a.audioBlob.size > 0) {
              const fd = new FormData();
              fd.append('audio', a.audioBlob, 'recording.webm');
              const r = await fetch('/api/interview/transcribe', { method: 'POST', body: fd });
              if (r.ok) { const d = await r.json(); tr = d.transcript; }
            }
            processed.push({ questionId: a.questionId, transcript: tr, durationSeconds: a.durationSeconds });
          }
          const er = await fetch('/api/interview/evaluate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interviewId: interviewData!.interviewId, answers: processed }),
          });
          if (er.ok) { sessionStorage.removeItem('current_interview'); router.push(`/report/${interviewData!.interviewId}`); }
          else { alert('AI 評分失敗'); router.push('/lobby'); }
        } catch { alert('處理錯誤'); router.push('/lobby'); }
      } else {
        setQIdx(p => p + 1);
        if (interviewData) setTimeLeft(interviewData.timeLimit);
      }
    };
    mrRef.current.stop();
  }, [isRec, answers, qIdx, interviewData, router]);

  useEffect(() => {
    if (isRec && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(p => { if (p <= 1) { stopRecording(); return 0; } return p - 1; });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRec, stopRecording, timeLeft]);

  const viz = useCallback(() => {
    if (!analyserRef.current) return;
    const d = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(d);
    const l = [];
    const s = Math.floor(d.length / 30);
    for (let i = 0; i < 30; i++) l.push(Math.max(4, (d[i * s] / 255) * 48));
    setLevels(l);
    animRef.current = requestAnimationFrame(viz);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser(); an.fftSize = 256;
      src.connect(an); analyserRef.current = an;
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mrRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100); startTimeRef.current = Date.now();
      setIsRec(true); setRecStatus('正在錄音...'); viz();
    } catch { alert('無法取得麥克風權限'); }
  };

  if (!interviewData) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-teal-600 mx-auto mb-4" />
        <p className="text-gray-600">正在從資料庫載入面試題目與參數...</p>
      </div>
    </div>
  );

  const cq = interviewData.questions[qIdx];
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2"><Sparkles size={20} className="text-teal-600" /><h1 className="text-lg font-semibold text-gray-900">核心面試現場</h1></div>
            <p className="text-sm text-gray-500 mt-0.5">模擬面試進行中 — 請保持放鬆，自然回答。</p>
          </div>
          <span className={`text-sm font-medium ${isRec ? 'text-red-500 recording-pulse' : 'text-gray-500'}`}>{recStatus}</span>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-6 py-12">
        {isProc ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-6" />
            <p className="text-lg font-medium text-gray-700">處理解答中，請稍候...</p>
            <p className="text-sm text-gray-400 mt-2">AI 正在分析您的回答並進行評分</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-8 pt-6 flex items-center justify-between">
              <span className="text-sm font-semibold text-teal-600">題目 {qIdx + 1} / {interviewData.questions.length}</span>
              <span className={`text-sm font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-red-400'}`}>倒數時間: {timeLeft} 秒</span>
            </div>
            <div className="px-8 mt-3"><div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-teal-600 rounded-full transition-all duration-300" style={{ width: `${((qIdx + 1) / interviewData.questions.length) * 100}%` }} /></div></div>
            <div className="px-8 py-10"><h2 className="text-xl font-bold text-gray-900 text-center leading-relaxed">[第 {qIdx + 1} 題] {cq.question_text}</h2></div>
            <div className="px-8 pb-6"><div className="flex items-end justify-center gap-1 h-12">{levels.map((l, i) => (<div key={i} className={`w-1.5 rounded-full transition-all duration-100 ${isRec ? 'bg-teal-500' : 'bg-gray-200'}`} style={{ height: `${l}px` }} />))}</div></div>
            <div className="px-8 pb-8 flex justify-center gap-4">
              {!isRec ? (
                <Button onClick={startRecording} className="px-8 py-3" disabled={isProc}><Mic size={18} className="mr-2" />開始回答</Button>
              ) : (
                <Button variant="danger" onClick={stopRecording} className="px-8 py-3"><Square size={18} className="mr-2" />結束錄音</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
