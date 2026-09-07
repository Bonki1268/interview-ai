'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Scale, Plus, Trash2, Save } from 'lucide-react';

interface Weight { name: string; weight: number; }

export default function AIConfigPage() {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/config').then(r => r.json()).then(d => {
      if (d.config?.scoring_weights) {
        setWeights(JSON.parse(d.config.scoring_weights));
      }
    });
  }, []);

  const totalWeight = weights.reduce((s, w) => s + (w.weight || 0), 0);

  const addWeight = () => setWeights([...weights, { name: '', weight: 0 }]);
  const removeWeight = (i: number) => setWeights(weights.filter((_, idx) => idx !== i));
  const updateWeight = (i: number, field: keyof Weight, value: string | number) => {
    const nw = [...weights];
    if (field === 'weight') nw[i].weight = Number(value);
    else nw[i].name = value as string;
    setWeights(nw);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/admin/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configs: { scoring_weights: JSON.stringify(weights) } }),
    });
    setSaving(false);
    alert('配置已儲存');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">AI 評分模型配置</h1>
        <p className="text-slate-500 mt-1">調整系統評分的核心權重。更改後將影響所有使用者的面試結果。（僅管理員可修改）</p>
      </div>
      <Card title="評分權重分配" action={<Button size="sm" variant="outline" onClick={addWeight}><Plus size={14} className="mr-1" />新增指標</Button>}>
        <div className="flex items-center gap-2 mb-4 text-slate-500"><Scale size={18} /><span className="text-sm font-medium">配置各評分維度的權重比例</span></div>
        <div className="space-y-3">
          {weights.map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <Input placeholder="指標名稱" value={w.name} onChange={e => updateWeight(i, 'name', e.target.value)} className="flex-1" />
              <div className="flex items-center gap-1">
                <Input type="number" value={w.weight} onChange={e => updateWeight(i, 'weight', e.target.value)} className="w-20 text-center" min="0" max="100" />
                <span className="text-slate-500 text-sm">%</span>
              </div>
              <button onClick={() => removeWeight(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
          <span className={`text-sm font-medium ${totalWeight === 100 ? 'text-green-600' : 'text-red-500'}`}>目前權重總和：{totalWeight}%</span>
          <Button onClick={handleSave} loading={saving} disabled={totalWeight !== 100}><Save size={16} className="mr-2" />儲存配置並套用</Button>
        </div>
      </Card>
    </div>
  );
}
