'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Users, ClipboardList, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer } from 'recharts';

interface DashboardData {
  totalUsers: number; totalInterviews: number; avgScore: number;
  userDistribution: { role: string; count: number }[];
  scoreDistribution: { level: string; count: number }[];
  topUsers: { name: string; interview_count: number }[];
  trend: { date: string; count: number }[];
}

const COLORS = ['#0d9488', '#94a3b8'];
const SCORE_COLORS: Record<string, string> = { '精通': '#22c55e', '良好': '#3b82f6', '及格': '#eab308', '待加強': '#ef4444' };

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard').then(r => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="text-center py-12 text-slate-500">載入中...</div>;

  const userDist = data.userDistribution.map(d => ({ name: d.role === 'admin' ? '管理員' : '一般應試者', value: d.count }));
  const scoreDist = data.scoreDistribution.map(d => ({ ...d, fill: SCORE_COLORS[d.level] || '#9ca3af' }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">系統營運總覽</h1>
        <p className="text-slate-500 mt-1">檢視平台所有面試活動、活躍使用者與系統健康度。（僅管理員可存取）</p>
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3"><Users size={24} /><div><p className="text-teal-200 text-sm">總使用者數</p><p className="text-3xl font-bold">{data.totalUsers}</p></div></div>
        </div>
        <div className="bg-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3"><ClipboardList size={24} /><div><p className="text-emerald-200 text-sm">累計面試場次</p><p className="text-3xl font-bold">{data.totalInterviews}</p></div></div>
        </div>
        <div className="bg-orange-500 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3"><TrendingUp size={24} /><div><p className="text-orange-200 text-sm">全站平均分數</p><p className="text-3xl font-bold">{data.avgScore}</p></div></div>
        </div>
      </div>
      {/* Charts 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="使用者身分分佈">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={userDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
              {userDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie></PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="面試表現分數落點">
          <div className="flex gap-2 mb-2 flex-wrap">{Object.entries(SCORE_COLORS).map(([k, c]) => <span key={k} className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded-full" style={{ background: c }} />{k}</span>)}</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={scoreDist}>
              <PolarGrid /><PolarAngleAxis dataKey="level" tick={{ fontSize: 11 }} /><PolarRadiusAxis />
              <Radar dataKey="count" stroke="#0d9488" fill="#0d9488" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="活躍應試者排行（面試次數）">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topUsers} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" /><YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip /><Bar dataKey="interview_count" fill="#0d9488" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="近 7 日系統活躍趨勢（場次）">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.trend}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis /><Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={{ fill: '#0d9488' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
