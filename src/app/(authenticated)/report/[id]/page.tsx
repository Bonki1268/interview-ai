'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, FileBarChart } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface InterviewDetail {
  id: string; position: string; job_description: string; total_score: number;
  status: string; summary: string; radar_confidence: number; radar_technical: number;
  radar_logic: number; started_at: string;
}
interface QuestionDetail {
  id: string; question_number: number; question_text: string;
  transcript: string; score: number; duration_seconds: number;
}

export default function ReportDetailPage() {
  const params = useParams();
  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/interviews/${params.id}`)
      .then(r => r.json())
      .then(d => { setInterview(d.interview); setQuestions(d.questions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-center py-12 text-gray-500">載入中...</div>;
  if (!interview) return <div className="text-center py-12 text-gray-500">找不到面試紀錄</div>;

  const radarData = [
    { subject: '表達自信', value: interview.radar_confidence, fullMark: 100 },
    { subject: '技術符合度', value: interview.radar_technical, fullMark: 100 },
    { subject: '邏輯清晰度', value: interview.radar_logic, fullMark: 100 },
  ];
  const formatDate = (s: string) => new Date(s).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const circumference = 2 * Math.PI * 45;
  const scoreOffset = circumference - (interview.total_score / 100) * circumference;

  return (
    <div>
      <Link href="/report"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft size={16} className="mr-1" />返回紀錄列表</Button></Link>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Score card */}
        <Card title="綜合評比" action={<Button size="sm" variant="outline"><FileBarChart size={14} className="mr-1" />AI Report</Button>}>
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="60" cy="60" r="45" fill="none" stroke={interview.total_score >= 60 ? '#0d9488' : '#ef4444'} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={scoreOffset} transform="rotate(-90 60 60)" className="score-circle" />
                <text x="60" y="55" textAnchor="middle" className="text-3xl font-bold" fill="#111827" fontSize="28" fontWeight="700">{interview.total_score}</text>
                <text x="60" y="75" textAnchor="middle" fill="#6b7280" fontSize="11">總體得分</text>
              </svg>
            </div>
            <div className="flex-1">
              <div className="mb-3">
                <Badge variant={interview.status === 'passed' ? 'success' : 'danger'}>{interview.status === 'passed' ? '通過' : '未通過'}</Badge>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{interview.summary || '評分資料尚未產生。'}</p>
            </div>
          </div>
        </Card>
        {/* Radar */}
        <Card title="核心能力分析" action={<Button size="sm" variant="outline">維度剖析</Button>}>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="能力" dataKey="value" stroke="#0d9488" fill="#0d9488" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      {/* Interview info */}
      <div className="flex gap-6 mb-6 text-sm text-gray-600">
        <span><strong>應徵職缺：</strong>{interview.position}</span>
        <span><strong>面試時間：</strong>{formatDate(interview.started_at)}</span>
      </div>
      {/* Questions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">面試問答詳情分析</h2>
        {questions.map(q => (
          <Card key={q.id}>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{q.question_number}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-teal-700">{q.question_text}</h3>
                  <span className="text-orange-500 font-semibold text-sm whitespace-nowrap ml-4">單題評分：{q.score}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">語音辨識逐字稿：</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.transcript || '(未作答)'}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
