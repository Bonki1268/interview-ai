'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { UserPlus, Pencil, Lock, Zap } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  assigned_position?: string | null;
  assigned_due_at?: string | null;
}

interface Template {
  id: string;
  position: string;
  job_description: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', status: 'active' });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [assignForm, setAssignForm] = useState({ position: '', jobDescription: '', dueAt: '' });
  const [assignSaving, setAssignSaving] = useState(false);

  // Per-row quick-assign selection (userId -> templateId)
  const [quickPick, setQuickPick] = useState<Record<string, string>>({});
  const [quickAssigning, setQuickAssigning] = useState<string | null>(null);

  const load = () => fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.users || []));
  const loadTemplates = () => fetch('/api/admin/position-templates').then(r => r.json()).then(d => setTemplates(d.templates || []));
  useEffect(() => { load(); loadTemplates(); }, []);

  const openCreate = () => { setEditUser(null); setForm({ name: '', email: '', password: '', role: 'user', status: 'active' }); setShowModal(true); };
  const openEdit = (u: User) => { setEditUser(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, status: u.status }); setShowModal(true); };

  const handleSave = async () => {
    if (editUser) {
      await fetch(`/api/admin/users/${editUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    } else {
      await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setShowModal(false); load();
  };

  // One-click assign: pick a saved template from the row dropdown and apply it immediately.
  const handleQuickAssign = async (u: User) => {
    const templateId = quickPick[u.id];
    if (!templateId) return;
    setQuickAssigning(u.id);
    try {
      await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, templateId }),
      });
      load();
    } finally {
      setQuickAssigning(null);
    }
  };

  const openAssign = (u: User) => {
    setAssignUser(u);
    setAssignForm({ position: u.assigned_position || '', jobDescription: '', dueAt: u.assigned_due_at ? u.assigned_due_at.slice(0, 10) : '' });
    setShowAssignModal(true);
  };

  const applyTemplateToForm = (templateId: string) => {
    const t = templates.find((tpl) => tpl.id === templateId);
    if (t) setAssignForm((f) => ({ ...f, position: t.position, jobDescription: t.job_description }));
  };

  const handleAssignSave = async () => {
    if (!assignUser || !assignForm.position.trim() || !assignForm.jobDescription.trim()) return;
    setAssignSaving(true);
    try {
      await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignUser.id,
          position: assignForm.position,
          jobDescription: assignForm.jobDescription,
          dueAt: assignForm.dueAt || null,
        }),
      });
      setShowAssignModal(false);
      load();
    } finally {
      setAssignSaving(false);
    }
  };

  const handleUnlock = async (u: User) => {
    if (!confirm(`確定要解除 ${u.name} 的職位鎖定嗎？解除後使用者可自行選擇應徵職位。`)) return;
    const res = await fetch(`/api/admin/assignments?userId=${u.id}&status=active`).then(r => r.json());
    const active = res.assignments?.[0];
    if (active) {
      await fetch(`/api/admin/assignments/${active.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      load();
    }
  };

  const formatDate = (s: string) => new Date(s).toLocaleDateString('zh-TW');

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">使用者帳限控制</h1>
          <p className="text-slate-500 mt-1">直接在系統內新增帳號。系統已封閉公開註冊，必須經由管理員發放權限。</p>
        </div>
        <Button onClick={openCreate}><UserPlus size={16} className="mr-2" />新增使用者</Button>
      </div>

      {templates.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-700">
          尚未建立任何職位範本，前往{' '}
          <Link href="/admin/positions" className="underline font-medium">職位範本管理</Link>
          {' '}建立後，就能在下方一鍵指派給使用者。
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">姓名 / 信箱</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">角色權限</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">狀態</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">加入時間</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">職位鎖定</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">操作</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4"><p className="font-medium text-slate-900">{u.name}</p><p className="text-xs text-slate-400">{u.email}</p></td>
                  <td className="py-3 px-4"><Badge variant={u.role === 'admin' ? 'danger' : 'info'}>{u.role === 'admin' ? '管理員' : '一般使用者'}</Badge></td>
                  <td className="py-3 px-4"><span className="flex items-center gap-1.5 text-sm"><span className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} /><span className={u.status === 'active' ? 'text-green-600' : 'text-slate-400'}>{u.status === 'active' ? '啟用中' : '已停用'}</span></span></td>
                  <td className="py-3 px-4 text-sm text-slate-600">{formatDate(u.created_at)}</td>
                  <td className="py-3 px-4 min-w-[220px]">
                    {u.assigned_position ? (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Lock size={12} className="text-teal-600 flex-shrink-0" />
                          <p className="text-sm text-slate-900">{u.assigned_position}</p>
                        </div>
                        {u.assigned_due_at && (
                          <p className="text-xs text-slate-400 mt-0.5">截止 {formatDate(u.assigned_due_at)}</p>
                        )}
                        <button
                          onClick={() => handleUnlock(u)}
                          className="text-xs text-slate-400 hover:text-red-500 underline mt-1 cursor-pointer"
                        >
                          解除鎖定
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {templates.length > 0 ? (
                          <>
                            <Select
                              value={quickPick[u.id] || ''}
                              onChange={(e) => setQuickPick({ ...quickPick, [u.id]: e.target.value })}
                              options={[{ value: '', label: '選擇範本...' }, ...templates.map(t => ({ value: t.id, label: t.position }))]}
                              className="!py-1.5 !px-2 text-sm max-w-[150px]"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleQuickAssign(u)}
                              disabled={!quickPick[u.id]}
                              loading={quickAssigning === u.id}
                            >
                              <Zap size={14} />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">未指派（自由選擇）</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}><Pencil size={14} className="mr-1" />編輯</Button>
                      <Button size="sm" variant="ghost" onClick={() => openAssign(u)}><Lock size={14} className="mr-1" />自訂指派</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editUser ? '編輯使用者' : '新增使用者'}
        footer={<><Button variant="ghost" onClick={() => setShowModal(false)}>取消</Button><Button onClick={handleSave}>儲存</Button></>}>
        <div className="space-y-4">
          <Input label="姓名" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="電子郵件" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label={editUser ? '密碼（留空不修改）' : '密碼'} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Select label="角色" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} options={[{ value: 'user', label: '一般使用者' }, { value: 'admin', label: '管理員' }]} />
          <Select label="狀態" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} options={[{ value: 'active', label: '啟用中' }, { value: 'inactive', label: '已停用' }]} />
        </div>
      </Modal>
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`自訂指派 — ${assignUser?.name ?? ''}`}
        footer={<>
          <Button variant="ghost" onClick={() => setShowAssignModal(false)}>取消</Button>
          <Button onClick={handleAssignSave} loading={assignSaving}>儲存指派</Button>
        </>}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            指派後，此使用者在「面試準備大廳」的應徵職位與職缺說明將被鎖定為以下內容，無法自行修改。
          </p>
          {templates.length > 0 && (
            <Select
              label="從範本套用（選填，套用後仍可修改）"
              value=""
              onChange={(e) => e.target.value && applyTemplateToForm(e.target.value)}
              options={[{ value: '', label: '不套用範本，手動輸入' }, ...templates.map(t => ({ value: t.id, label: t.position }))]}
            />
          )}
          <Input
            label="應徵職位"
            placeholder="例如：資深前端工程師"
            value={assignForm.position}
            onChange={e => setAssignForm({ ...assignForm, position: e.target.value })}
          />
          <Textarea
            label="職缺說明（JD）"
            rows={6}
            placeholder="請貼上目標職位的詳細說明，包含：主要職責、所需技能、加分條件等。"
            value={assignForm.jobDescription}
            onChange={e => setAssignForm({ ...assignForm, jobDescription: e.target.value })}
          />
          <Input
            label="截止日期（選填）"
            type="date"
            value={assignForm.dueAt}
            onChange={e => setAssignForm({ ...assignForm, dueAt: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
