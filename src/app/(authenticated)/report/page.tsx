'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileText, ArrowRight } from 'lucide-react';

interface Interview {
  id: string;
  position: string;
  total_score: number;
  status: string;
  started_at: string;
}

export default function ReportListPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/interviews')
      .then(r => r.json())
      .then(d => { setInterviews(d.interviews || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">面試表現報告</h1>
        <p className="text-slate-500 mt-1">AI 深度分析您的回答，提供全方位的面試評估。</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">載入中...</div>
      ) : interviews.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">尚無面試報告，請先至大廳建立面試！</p>
            <Link href="/lobby">
              <Button>前往面試大廳</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">面試日期</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">應徵職位</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">總分</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">狀態</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map(iv => (
                  <tr key={iv.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-slate-600">{formatDate(iv.started_at)}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{iv.position}</td>
                    <td className="py-3 px-4 text-sm font-bold text-slate-900">{iv.total_score}</td>
                    <td className="py-3 px-4">
                      <Badge variant={iv.status === 'passed' ? 'success' : 'danger'}>
                        {iv.status === 'passed' ? '通過' : '未通過'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/report/${iv.id}`}>
                        <Button size="sm" variant="ghost">
                          詳細資料 <ArrowRight size={14} className="ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
