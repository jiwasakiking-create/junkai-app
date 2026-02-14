// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'

// メンバー情報の定義
const MEMBERS = [
  { id: 1, name: '橋本真旺' },
  { id: 2, name: '岸遥杜' },
  { id: 3, name: '高野諭' },
  { id: 4, name: '岩﨑丈一郎' }
]

export default function PatrolDashboard() {
  const [memberStatuses, setMemberStatuses] = useState<{ [key: string]: boolean }>({
    '橋本真旺': true,
    '岸遥杜': true,
    '高野諭': true,
    '岩﨑丈一郎': true
  })
  const [selectedTeam, setSelectedTeam] = useState('A')
  const [whoToCall, setWhoToCall] = useState('全員')
  const [submitter, setSubmitter] = useState('')
  const [callContent, setCallContent] = useState('')

  // ステータスを切り替える関数（全員分対応）
 const handleStatusToggle = async (name: string) => {
  const newStatus = !memberStatuses[name]
  const supabase = createClient()
  const statusText = newStatus ? '対応可能' : '対応不可'
  
  const { error } = await supabase
    .from('patrol_members') 
    .update({ status: statusText })
    .eq('name', name)

  if (error) {
    // 🚨 ここを書き換えて、詳しいエラーメッセージを画面に出します
    alert(`エラーが発生しました！\nメッセージ: ${error.message}\n詳細: ${error.details}`);
    return;
  }

  // 成功した時だけ画面のスイッチを切り替える
  setMemberStatuses(prev => ({ ...prev, [name]: newStatus }))
}

  // Slackへの呼び出し送信 ＋ ステータスを自動で「対応不可」にする
  const handleCallSubmit = async () => {
    // 1. Slackへ通知を送る
    const response = await fetch('/api/slack', {
      method: 'POST',
      body: JSON.stringify({ 
        team: selectedTeam,
        who: whoToCall,
        sender: submitter,
        content: callContent
      }),
    })

    if (response.ok) {
      // 2. データベース（Supabase）のステータスを「対応不可」に更新する
      const supabase = createClient()
      
      if (whoToCall === '全員') {
        // 「全員」が呼ばれた場合は、全メンバーを更新
        const { error } = await supabase
          .from('patrol_members') //
          .update({ status: '対応不可' })
          .in('name', MEMBERS.map(m => m.name))
        
        if (!error) {
          // 画面上のスイッチ表示も一括で「対応不可(false)」にする
          const updatedStatuses = { ...memberStatuses }
          MEMBERS.forEach(m => { updatedStatuses[m.name] = false })
          setMemberStatuses(updatedStatuses)
        }
      } else {
        // 特定の個人が呼ばれた場合は、その人だけ更新
        const { error } = await supabase
          .from('patrol_members')
          .update({ status: '対応不可' })
          .eq('name', whoToCall)

        if (!error) {
          // 画面上のスイッチ表示も「対応不可(false)」にする
          setMemberStatuses(prev => ({ ...prev, [whoToCall]: false }))
        }
      }

      alert(`${whoToCall} への呼び出しとステータス更新を完了しました！`)
    } else {
      alert('Slackへの送信に失敗しました')
    }
  }
  return (
    <div className="min-h-screen bg-[#FFF5E9] p-4 font-sans text-[#4A4A4A]">
      
      {/* --- PATROL STATUS (全員分にスイッチを追加) --- */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm mb-6 border border-orange-100">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <h2 className="text-orange-500 font-black tracking-widest text-sm uppercase">Patrol Status</h2>
        </div>

        <div className="space-y-4">
          {MEMBERS.map((m) => (
            <div key={m.name} className="bg-orange-50/50 p-4 rounded-2xl flex justify-between items-center border border-orange-100/50">
              <div>
                <p className="font-bold text-lg mb-1">{m.name}</p>
                <p className={`${memberStatuses[m.name] ? 'text-[#00B96B]' : 'text-red-500'} text-sm font-bold`}>
                  ● {memberStatuses[m.name] ? '対応可能' : '対応不可'}
                </p>
              </div>
              {/* 全員に配置したスイッチUI */}
              <button 
                onClick={() => handleStatusToggle(m.name)}
                className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${memberStatuses[m.name] ? 'bg-[#00B96B]' : 'bg-gray-300'}`}
              >
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${memberStatuses[m.name] ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* --- 巡回を呼び出すフォーム --- */}
      <div className="bg-orange-500 rounded-[32px] p-6 text-white shadow-xl">
        <div className="flex justify-center items-center gap-2 mb-8">
          <span className="text-3xl">📢</span>
          <h2 className="text-2xl font-black italic">巡回を呼び出す</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold mb-2 block ml-1">誰を呼びますか？</label>
            {/* メンバー全員を追加したプルダウン */}
            <select 
              value={whoToCall}
              onChange={(e) => setWhoToCall(e.target.value)}
              className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold outline-none appearance-none"
            >
              <option value="全員">全員</option>
              {MEMBERS.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold mb-2 block ml-1">あなたのチーム名</label>
            <select 
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold outline-none appearance-none"
            >
              {['A', 'B', 'C', 'D', 'E', 'F'].map(t => (
                <option key={t} value={t}>{t} チーム</option>
              ))}
            </select>
          </div>

          <div>
            <input 
              placeholder="記入者名"
              value={submitter}
              onChange={(e) => setSubmitter(e.target.value)}
              className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold placeholder:text-orange-200 outline-none"
            />
          </div>

          <div>
            <textarea 
              placeholder="呼び出し内容"
              rows={3}
              value={callContent}
              onChange={(e) => setCallContent(e.target.value)}
              className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold placeholder:text-orange-200 outline-none resize-none"
            />
          </div>

          <button 
            onClick={handleCallSubmit}
            className="w-full bg-white text-orange-500 rounded-2xl py-5 font-black text-xl shadow-lg active:scale-95 transition-all hover:bg-orange-50"
          >
            呼び出しを送信
          </button>
        </div>
      </div>
    </div>
  )
}