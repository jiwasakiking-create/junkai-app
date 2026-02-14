// app/page.tsx
'use client'

import { useState } from 'react'
// 修正前: import { createClient } from '@/lib/supabase'
// 修正後:
import { createClient } from '../lib/supabase'

export default function PatrolPage() {
  const [selectedTeam, setSelectedTeam] = useState('A')
  const [isStatusChanging, setIsStatusChanging] = useState(false)

  // チームを呼び出し、Slackへ通知する関数
  const handleCall = async () => {
    // 既存の呼び出しロジックに selectedTeam を渡す処理をここに記述
    const response = await fetch('/api/slack', {
      method: 'POST',
      body: JSON.stringify({ team: selectedTeam }),
    })
    if (response.ok) alert(`${selectedTeam}チームを呼び出しました！`)
  }

  // 手動でステータスを「一時不可」または「完了（巡回中）」に切り替える関数
  const toggleMyStatus = async (newStatus: '一時不可' | '完了') => {
    setIsStatusChanging(true)
    // Supabaseのメンバーテーブル（例: members）を更新
    // ※ユーザーIDやテーブル名はご自身の環境に合わせて書き換えてください
    const supabase = createClient()
    const { error } = await supabase
      .from('members')
      .update({ status: newStatus })
      .eq('name', 'あなたの名前') 

    if (!error) alert(`ステータスを「${newStatus}」に変更しました`)
    setIsStatusChanging(false)
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-orange-50 min-h-screen">
      <h1 className="text-2xl font-bold text-orange-600 mb-6">巡回マネージャー</h1>
      
      {/* 自分の状態を自分で変えるエリア */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-8">
        <p className="text-sm text-gray-500 mb-2">自分の現在の状態を手動で変える</p>
        <div className="flex gap-2">
          <button 
            onClick={() => toggleMyStatus('一時不可')}
            className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg font-bold"
          >
            一時不可にする
          </button>
          <button 
            onClick={() => toggleMyStatus('完了')}
            className="flex-1 bg-green-100 text-green-700 py-2 rounded-lg font-bold"
          >
            巡回中に戻る
          </button>
        </div>
      </div>

      {/* チーム呼び出しエリア */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <p className="text-sm text-gray-500 mb-2">チームを選択して呼び出す</p>
        <select 
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="w-full p-3 border-2 border-orange-200 rounded-lg mb-4 text-lg"
        >
          {['A', 'B', 'C', 'D', 'E', 'F'].map(t => (
            <option key={t} value={t}>{t}チーム</option>
          ))}
        </select>
        
        <button 
          onClick={handleCall}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-xl shadow-orange-200 shadow-lg active:scale-95 transition-transform"
        >
          {selectedTeam}チームを呼ぶ
        </button>
      </div>
    </div>
  )
}