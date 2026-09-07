'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface AuditIV { id: string; position: string; total_score: number; status: string; started_at: string; user_id: string; job_description: string; }
interface AQ { question_number: number; question_text: string; transcript: string; score: number; duration_seconds: number; }

export default function AuditPage() {
  const [ivs, setIvs] = useState<AuditIV[]>([]);
  const [det, setDet] = useState<{ interview: AuditIV; questions: AQ[] } | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => { fetch('/api/admin/audit').then(r => r.json()).then(d => setIvs(d.interviews || [])); }, []);

  const view = async (id: string) => {
    const d = await (await fetch(`/api/admin/audit/${id}`)).json();
    setDet(d); setShow(true);
  };

  const fmt = (s: string) => new Date(s).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">面試詳細稽核</h1>
        <p className="text-gray-500 mt-1">查閱系統內所有面試紀錄。（僅管理員可存取）</p>
      </div>
      <Card>
        <table className="w-full">
          <thead><tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">時間</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">應徵職位</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">面試者 ID</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">總分</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">狀態</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">操作</th>
          </tr></thead>
          <tbody>{ivs.map(iv => (
            <tr key={iv.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 text-sm text-gray-600">{fmt(iv.started_at)}</td>
              <td className="py-3 px-4 text-sm font-medium text-gray-900">{iv.position}</td>
              <td className="py-3 px-4 text-xs text-gray-400 font-mono">{iv.user_id}</td>
              <td className="py-3 px-4 text-sm font-bold">{iv.total_score}</td>
              <td className="py-3 px-4"><Badge variant={iv.status === 'passed' ? 'success' : 'danger'}>{iv.status === 'passed' ? '通過' : '未通過'}</Badge></td>
              <td className="py-3 px-4"><Button size="sm" variant="ghost" onClick={() => view(iv.id)}>查看詳細</Button></td>
            </tr>
          ))}{ivs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">尚無面試紀錄</td></tr>}</tbody>
        </table>
      </Card>
      <Modal isOpen={show} onClose={() => setShow(false)} title={det ? `${det.interview.position} — 面試稽核` : ''} size="lg" footer={<><Button variant="ghost" onClick={() => setShow(false)}>取消</Button><Button onClick={() => setShow(false)}>確定執行</Button></>}>
        {det && <div className="space-y-4">
          <div><p className="text-sm font-medium text-gray-500 mb-1">職缺說明</p><p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{det.interview.job_description}</p></div>
          {det.questions.map(q => <div key={q.question_number} className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-semibold text-teal-700 mb-1">第{q.question_number}題：{q.question_text}</p>
            <p className="text-sm text-gray-600 mb-1">{q.transcript || '(未作答)'}</p>
            <div className="flex gap-4 text-xs text-gray-400"><span>評分：{q.score}</span><span>耗時：{q.duration_seconds}秒</span></div>
          </div>)}
        </div>}
      </Modal>
    </div>
  );
}
