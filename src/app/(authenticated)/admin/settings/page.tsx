'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Save, Trash2, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/config').then(r => r.json()).then(d => setConfig(d.config || {}));
  }, []);

  const update = (k: string, v: string) => setConfig({ ...config, [k]: v });

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/admin/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configs: config }),
    });
    setSaving(false);
    alert('系統參數已儲存');
  };

  const handleClear = async () => {
    if (!confirm('確定要清除所有模擬面試紀錄嗎？此操作不可逆！')) return;
    await fetch('/api/admin/config', { method: 'DELETE' });
    alert('所有面試紀錄已清除');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">系統核心參數</h1>
        <p className="text-gray-500 mt-1">修改影響系統運作的底層參數與預設面試設定。（僅管理員可修改）</p>
      </div>

      <div className="space-y-6">
        <Card title="基本面試參數">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="預設題目數量" type="number" value={config.default_question_count || '3'} onChange={e => update('default_question_count', e.target.value)} />
            <Input label="題目限時（秒）" type="number" value={config.question_time_limit || '60'} onChange={e => update('question_time_limit', e.target.value)} />
            <Select label="預設語言" value={config.default_language || '繁體中文'} onChange={e => update('default_language', e.target.value)} options={[{ value: '繁體中文', label: '繁體中文' }, { value: 'English', label: 'English' }, { value: '日本語', label: '日本語' }]} />
          </div>
        </Card>

        <Card title="進階整合設定">
          <div className="space-y-4">
            <Input label="OPENAI API 金鑰" type="password" value={config.openai_api_key || ''} onChange={e => update('openai_api_key', e.target.value)} placeholder="sk-..." />
            <p className="text-xs text-gray-400 -mt-2">留空則使用環境變數中的 API Key（支援雙 Key 輪替）</p>
            <Select label="OPENAI 文字思考模型" value={config.openai_text_model || 'gpt-4o'} onChange={e => update('openai_text_model', e.target.value)} options={[{ value: 'gpt-4o', label: 'gpt-4o' }, { value: 'gpt-4o-mini', label: 'gpt-4o-mini' }, { value: 'gpt-4-turbo', label: 'gpt-4-turbo' }]} />
            <Select label="OPENAI 語音辨識模型" value={config.openai_whisper_model || 'whisper-1'} onChange={e => update('openai_whisper_model', e.target.value)} options={[{ value: 'whisper-1', label: 'whisper-1' }]} />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving}><Save size={16} className="mr-2" />儲存系統參數</Button>
        </div>

        {/* Danger zone */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={20} className="text-red-600" />
            <h3 className="text-lg font-bold text-red-600">危險操作區</h3>
          </div>
          <p className="text-sm text-red-500 mb-4">以下操作將不可逆地影響系統資料，請謹慎執行。</p>
          <Button variant="danger" onClick={handleClear}><Trash2 size={16} className="mr-2" />清除所有模擬面試紀錄</Button>
        </div>
      </div>
    </div>
  );
}
