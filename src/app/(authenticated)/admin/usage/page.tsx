'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Wallet, Activity, Gauge, KeyRound, Save, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer } from 'recharts';

interface UsageSummary {
  monthCostUsd: number;
  monthCallCount: number;
  allTimeCostUsd: number;
  monthlyBudgetUsd: number;
  remainingBudgetUsd: number;
  dailyTrend: { date: string; cost: number; calls: number }[];
  byOperation: { operation: string; cost: number; calls: number }[];
  byKey: { key_label: string; cost: number; calls: number }[];
}

interface OpenAIOrgUsage {
  configured: boolean;
  monthCostUsd?: number;
  error?: string;
}

const OPERATION_LABELS: Record<string, string> = {
  generate_questions: '出題',
  transcribe: '語音轉文字',
  evaluate: 'AI 評分',
};

function formatUsd(value: number) {
  return `$${value.toFixed(4)}`;
}

export default function UsagePage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [openaiOrgUsage, setOpenaiOrgUsage] = useState<OpenAIOrgUsage | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [orgIdInput, setOrgIdInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/usage').then(r => r.json()).then(d => {
      if (d.summary) {
        setSummary(d.summary);
        setBudgetInput(String(d.summary.monthlyBudgetUsd));
      }
      if (d.openaiOrgUsage) setOpenaiOrgUsage(d.openaiOrgUsage);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    const configs: Record<string, string> = { monthly_budget_usd: budgetInput };
    if (adminKeyInput) configs.openai_admin_api_key = adminKeyInput;
    if (orgIdInput) configs.openai_organization_id = orgIdInput;

    await fetch('/api/admin/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configs }),
    });
    setAdminKeyInput('');
    setSaving(false);
    load();
    alert('設定已儲存');
  };

  if (!summary) return <div className="text-center py-12 text-slate-500">載入中...</div>;

  const budgetUsedPct = summary.monthlyBudgetUsd > 0
    ? Math.min(100, Math.round((summary.monthCostUsd / summary.monthlyBudgetUsd) * 100))
    : 0;
  const isOverBudget = summary.remainingBudgetUsd < 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">API 用量監控</h1>
        <p className="text-slate-500 mt-1">追蹤 OpenAI API 呼叫次數與預估花費，掌握剩餘可用額度。（僅管理員可存取）</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3"><Wallet size={24} /><div><p className="text-teal-200 text-sm">本月預估花費</p><p className="text-3xl font-bold">{formatUsd(summary.monthCostUsd)}</p></div></div>
        </div>
        <div className={`rounded-xl p-6 text-white ${isOverBudget ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <div className="flex items-center gap-3">
            {isOverBudget ? <AlertTriangle size={24} /> : <Gauge size={24} />}
            <div><p className={isOverBudget ? 'text-red-200 text-sm' : 'text-emerald-200 text-sm'}>剩餘額度（依預算估算）</p><p className="text-3xl font-bold">{formatUsd(summary.remainingBudgetUsd)}</p></div>
          </div>
        </div>
        <div className="bg-orange-500 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3"><Activity size={24} /><div><p className="text-orange-200 text-sm">本月呼叫次數</p><p className="text-3xl font-bold">{summary.monthCallCount}</p></div></div>
        </div>
        <div className="bg-slate-700 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3"><KeyRound size={24} /><div><p className="text-slate-300 text-sm">累計花費（全部時間）</p><p className="text-3xl font-bold">{formatUsd(summary.allTimeCostUsd)}</p></div></div>
        </div>
      </div>

      {/* Budget bar */}
      <Card title="本月預算使用率" className="mb-8">
        <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
          <span>已用 {formatUsd(summary.monthCostUsd)} / 預算 {formatUsd(summary.monthlyBudgetUsd)}</span>
          <span className={isOverBudget ? 'text-red-600 font-semibold' : 'text-slate-500'}>{budgetUsedPct}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : budgetUsedPct > 80 ? 'bg-amber-500' : 'bg-teal-500'}`}
            style={{ width: `${budgetUsedPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">花費為依 OpenAI 公開牌價估算之參考數字，非官方帳單金額。</p>
      </Card>

      {/* OpenAI official usage */}
      <Card title="OpenAI 官方帳戶用量" subtitle="需設定 Admin API Key 才能取得官方回報數字" className="mb-8">
        {!openaiOrgUsage?.configured && (
          <p className="text-sm text-slate-500">尚未設定 OpenAI Admin API Key，目前僅顯示上方系統自行統計的預估用量。於下方「進階設定」填入後即可自動串接。</p>
        )}
        {openaiOrgUsage?.configured && openaiOrgUsage.error && (
          <p className="text-sm text-red-500">{openaiOrgUsage.error}</p>
        )}
        {openaiOrgUsage?.configured && !openaiOrgUsage.error && (
          <p className="text-sm text-slate-700">本月官方回報花費：<span className="font-semibold">{formatUsd(openaiOrgUsage.monthCostUsd ?? 0)}</span></p>
        )}
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card title="近 14 日花費趨勢（美元）">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={summary.dailyTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis /><Tooltip formatter={(v) => formatUsd(Number(v))} />
              <Line type="monotone" dataKey="cost" stroke="#0d9488" strokeWidth={2} dot={{ fill: '#0d9488' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="本月各功能花費佔比">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.byOperation.map(o => ({ ...o, label: OPERATION_LABELS[o.operation] || o.operation }))} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" /><YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatUsd(Number(v))} /><Bar dataKey="cost" fill="#0d9488" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Per-key breakdown */}
      <Card title="各 API Key 本月用量" className="mb-8">
        {summary.byKey.length === 0 ? (
          <p className="text-sm text-slate-500">本月尚無 API 呼叫紀錄。</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 font-medium">API Key</th>
                <th className="py-2 font-medium">呼叫次數</th>
                <th className="py-2 font-medium">預估花費</th>
              </tr>
            </thead>
            <tbody>
              {summary.byKey.map((k) => (
                <tr key={k.key_label} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 text-slate-800">{k.key_label}</td>
                  <td className="py-2 text-slate-800">{k.calls}</td>
                  <td className="py-2 text-slate-800">{formatUsd(k.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Settings */}
      <Card title="進階設定" subtitle="設定每月預算門檻，並可選填 OpenAI Admin API Key 以串接官方用量資料">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input label="每月預算（美元）" type="number" min="0" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} />
          <Input label="OpenAI Admin API Key（選填）" type="password" placeholder="sk-admin-..." value={adminKeyInput} onChange={e => setAdminKeyInput(e.target.value)} />
          <Input label="Organization ID（選填）" placeholder="org-..." value={orgIdInput} onChange={e => setOrgIdInput(e.target.value)} />
        </div>
        <Button onClick={handleSave} loading={saving}><Save size={16} className="mr-2" />儲存設定</Button>
      </Card>
    </div>
  );
}
