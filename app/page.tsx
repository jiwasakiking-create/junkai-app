// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'

export default function PatrolDashboard() {
  const [selectedTeam, setSelectedTeam] = useState('A')
  const [whoToCall, setWhoToCall] = useState('全員')
  const [submitter, setSubmitter] = useState('')
  const [callContent, setCallContent] = useState('')
  const [myStatus, setMyStatus] = useState(true) // true: 対応可能, false: 対応不可

  // 自分のステータス（対応可能/不可）を切り替える関数
  const handleStatusToggle = async () => {
    const newStatus = !myStatus
    setMyStatus(newStatus)
    
    const supabase = createClient()
    const statusText = newStatus ? '対応可能' : '対応不可'
    
    const { error } = await supabase
      .from('members')
      .update({ status: statusText })
      .eq('name', '岩﨑丈一郎') //

    if (error) alert('ステータスの更新に失敗しました')
  }

  // Slackへの呼び出し送信
  const handleCallSubmit = async () => {
    const response = await fetch('/api/slack', {
      method: 'POST',
      body: JSON.stringify({ 
        team: selectedTeam,
        who: whoToCall,
        sender: submitter,
        content: callContent
      }),
    })
    if (response.ok) alert(`${selectedTeam}チームの呼び出しを送信しました！`)
  }

  return (
    <div className="min-h-screen bg-[#FFF5E9] p-4 font-sans text-[#4A4A4A]">
      
      {/* --- PATROL STATUS --- */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm mb-6 border border-orange-100">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <h2 className="text-orange-500 font-black tracking-widest text-sm">PATROL STATUS</h2>
        </div>

        <div className="space-y-4">
          {/* 他のメンバー（固定表示例） */}
          {['橋本真旺', '岸遥杜', '高野諭'].map((name) => (
            <div key={name} className="bg-[#FFF9F2] p-4 rounded-2xl flex justify-between items-center">
              <div>
                <p className="font-bold text-lg mb-1">{name}</p>
                <p className="text-[#00B96B] text-sm font-bold">● 対応可能</p>
              </div>
            </div>
          ))}

          {/* 自分のステータス（スイッチ付き） */}
          <div className="bg-orange-50 p-4 rounded-2xl flex justify-between items-center border border-orange-200">
            <div>
              <p className="font-bold text-lg mb-1">岩﨑丈一郎</p>
              <p className={`${myStatus ? 'text-[#00B96B]' : 'text-red-500'} text-sm font-bold`}>
                ● {myStatus ? '対応可能' : '対応不可'}
              </p>
            </div>
            {/* スイッチUI */}
            <button 
              onClick={handleStatusToggle}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${myStatus ? 'bg-[#00B96B]' : 'bg-gray-300'}`}
            >
              <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${myStatus ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
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
            <label className="text-sm font-bold mb-2 block">誰を呼びますか？</label>
            <select 
              value={whoToCall}
              onChange={(e) => setWhoToCall(e.target.value)}
              className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold outline-none appearance-none"
            >
              <option value="全員">全員</option>
              <option value="岩﨑丈一郎">岩﨑丈一郎</option>
              <option value="橋本真旺">橋本真旺</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-bold mb-2 block">あなたのチーム名</label>
            {/* の選択式を採用 */}
            <select 
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold outline-none"
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
            className="w-full bg-white text-orange-500 rounded-2xl py-5 font-black text-xl shadow-lg active:scale-95 transition-transform"
          >
            呼び出しを送信
          </button>
        </div>
      </div>
    </div>
  )
}