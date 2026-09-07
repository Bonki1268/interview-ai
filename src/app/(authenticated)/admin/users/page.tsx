'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { UserPlus, Pencil } from 'lucide-react';

interface User { id: string; name: string; email: string; role: string; status: string; created_at: string; }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', status: 'active' });

  const load = () => fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.users || []));
  useEffect(() => { load(); }, []);

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

  const formatDate = (s: string) => new Date(s).toLocaleDateString('zh-TW');

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">使用者帳限控制</h1>
          <p className="text-gray-500 mt-1">直接在系統內新增帳號。系統已封閉公開註冊，必須經由管理員發放權限。</p>
        </div>
        <Button onClick={openCreate}><UserPlus size={16} className="mr-2" />新增使用者</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">姓名 / 信箱</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">角色權限</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">狀態</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">加入時間</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">操作</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4"><p className="font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></td>
                  <td className="py-3 px-4"><Badge variant={u.role === 'admin' ? 'danger' : 'info'}>{u.role === 'admin' ? '管理員' : '一般使用者'}</Badge></td>
                  <td className="py-3 px-4"><span className="flex items-center gap-1.5 text-sm"><span className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} /><span className={u.status === 'active' ? 'text-green-600' : 'text-gray-400'}>{u.status === 'active' ? '啟用中' : '已停用'}</span></span></td>
                  <td className="py-3 px-4 text-sm text-gray-600">{formatDate(u.created_at)}</td>
                  <td className="py-3 px-4"><Button size="sm" variant="ghost" onClick={() => openEdit(u)}><Pencil size={14} className="mr-1" />編輯</Button></td>
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
    </div>
  );
}
