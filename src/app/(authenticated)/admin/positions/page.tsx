'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Briefcase, Plus, Pencil, Trash2 } from 'lucide-react';

interface Template {
  id: string;
  position: string;
  job_description: string;
  created_at: string;
}

export default function PositionTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState({ position: '', jobDescription: '' });
  const [saving, setSaving] = useState(false);

  const load = () => fetch('/api/admin/position-templates').then(r => r.json()).then(d => setTemplates(d.templates || []));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditTemplate(null); setForm({ position: '', jobDescription: '' }); setShowModal(true); };
  const openEdit = (t: Template) => { setEditTemplate(t); setForm({ position: t.position, jobDescription: t.job_description }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.position.trim() || !form.jobDescription.trim()) return;
    setSaving(true);
    try {
      if (editTemplate) {
        await fetch(`/api/admin/position-templates/${editTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/admin/position-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setShowModal(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Template) => {
    if (!confirm(`確定要刪除範本「${t.position}」嗎？已指派給使用者的紀錄不會受影響。`)) return;
    await fetch(`/api/admin/position-templates/${t.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">職位範本管理</h1>
          <p className="text-slate-500 mt-1">
            預先建立常用職位與職缺說明，之後在「使用者權限控制」頁面可一鍵指派給使用者，不需要每次重新輸入。
          </p>
        </div>
        <Button onClick={openCreate}><Plus size={16} className="mr-2" />新增範本</Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400 text-center py-8">
            尚無職位範本，請先建立一個常用職位。
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <Briefcase size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{t.position}</p>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-3">{t.job_description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editTemplate ? '編輯職位範本' : '新增職位範本'}
        footer={<>
          <Button variant="ghost" onClick={() => setShowModal(false)}>取消</Button>
          <Button onClick={handleSave} loading={saving}>儲存範本</Button>
        </>}
      >
        <div className="space-y-4">
          <Input
            label="應徵職位"
            placeholder="例如：資深前端工程師"
            value={form.position}
            onChange={e => setForm({ ...form, position: e.target.value })}
          />
          <Textarea
            label="職缺說明（JD）"
            rows={8}
            placeholder="請貼上目標職位的詳細說明，包含：主要職責、所需技能、加分條件等。"
            value={form.jobDescription}
            onChange={e => setForm({ ...form, jobDescription: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
