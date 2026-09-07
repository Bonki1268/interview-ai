'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Play, Info, Lock } from 'lucide-react';

export default function LobbyPage() {
  const router = useRouter();
  const [position, setPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [questionCount, setQuestionCount] = useState('3');
  const [timeLimit, setTimeLimit] = useState('60');
  const [language, setLanguage] = useState('繁體中文');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserRole(data.user.role);
        }
      })
      .catch(() => {});

    // Load position history from localStorage
    const history = JSON.parse(localStorage.getItem('position_history') || '[]');
    setSuggestions(history);
  }, []);

  const handleStartInterview = async () => {
    if (!position.trim() || !jobDescription.trim()) return;

    setLoading(true);

    // Save position to history
    const history = JSON.parse(localStorage.getItem('position_history') || '[]');
    if (!history.includes(position)) {
      history.unshift(position);
      localStorage.setItem('position_history', JSON.stringify(history.slice(0, 10)));
    }

    try {
      const res = await fetch('/api/interview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position,
          jobDescription,
          questionCount: parseInt(questionCount),
          questionTimeLimit: parseInt(timeLimit),
          language,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Store interview data for the interview page
        sessionStorage.setItem(
          'current_interview',
          JSON.stringify({
            interviewId: data.interviewId,
            questions: data.questions,
            timeLimit: data.timeLimit,
            position,
          })
        );
        router.push('/interview');
      } else {
        alert(data.error || '生成面試題目失敗');
      }
    } catch {
      alert('系統錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(position.toLowerCase()) && position.length > 0
  );

  return (
    <div>
      {/* User role notice */}
      {userRole === 'user' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-center gap-2">
          <Info size={16} className="text-blue-500 flex-shrink-0" />
          <span className="text-sm text-blue-700">
            目前以使用者身分登入，部分系統參數已由管理員鎖定。
          </span>
        </div>
      )}

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">面試準備大廳</h1>
        <p className="text-slate-500 mt-1">
          透過 AI 精準分析職缺內容，為您量身打造最高效率的模擬面試訓練。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area (left) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Position input */}
          <Card title="應徵職位" subtitle="輸入您想模擬面試的目標職位">
            <div className="relative">
              <Input
                placeholder="例如：資深前端工程師 / 產品經理 / 行銷企劃..."
                value={position}
                onChange={(e) => {
                  setPosition(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                  {filteredSuggestions.map((s, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors cursor-pointer"
                      onClick={() => {
                        setPosition(s);
                        setShowSuggestions(false);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Job Description */}
          <Card
            title="職缺說明（JD）"
            subtitle="填寫越詳細的職缺說明，AI 越能產出更具針對性的面試題目"
          >
            <Textarea
              rows={10}
              placeholder="請貼上目標職位的詳細說明，包含：主要職責、所需技能、加分條件等。AI 將根據 JD 自動產生針對性面試題目。"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-2">
              AI 將自動擷取關鍵職能並生成對應題目
            </p>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Interview parameters */}
          <Card title="面試參數" subtitle="調整模擬面試的設定">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-sm font-medium text-slate-700">題目數量</label>
                  {userRole === 'user' && <Lock size={12} className="text-slate-400" />}
                </div>
                <Select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  options={[
                    { value: '1', label: '1 題' },
                    { value: '2', label: '2 題' },
                    { value: '3', label: '3 題' },
                    { value: '5', label: '5 題' },
                    { value: '8', label: '8 題' },
                    { value: '10', label: '10 題' },
                  ]}
                  disabled={userRole === 'user'}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-sm font-medium text-slate-700">每題時間（秒）</label>
                  {userRole === 'user' && <Lock size={12} className="text-slate-400" />}
                </div>
                <Input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  min="30"
                  max="300"
                  disabled={userRole === 'user'}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-sm font-medium text-slate-700">面試語言</label>
                  {userRole === 'user' && <Lock size={12} className="text-slate-400" />}
                </div>
                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  options={[
                    { value: '繁體中文', label: '繁體中文' },
                    { value: 'English', label: 'English' },
                    { value: '日本語', label: '日本語' },
                  ]}
                  disabled={userRole === 'user'}
                />
              </div>
            </div>
          </Card>

          {/* Start interview button */}
          <button
            onClick={handleStartInterview}
            disabled={loading || !position.trim() || !jobDescription.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-teal-500/25 hover:shadow-teal-400/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-base"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Play size={18} />
            )}
            {loading ? '生成中...' : '開始面試'}
          </button>
        </div>
      </div>
    </div>
  );
}
