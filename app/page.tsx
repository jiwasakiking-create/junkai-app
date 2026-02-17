'use client'

import { useState } from 'react'
import { createClient } from '../lib/supabase'

// 1. メンバー情報の定義（橋本さんを削除、角田さん・宇田津さんを追加して計5名）
const MEMBERS = [
  { id: 1, name: '岸遥杜' },
  { id: 2, name: '高野諭' },
  { id: 3, name: '岩﨑丈一郎' },
  { id: 4, name: '角田麗衣' },
  { id: 5, name: '宇田津蓮' }
]

export default function PatrolDashboard() {
  // スイッチの初期状態（全員分）
  const [memberStatuses, setMemberStatuses] = useState<{ [key: string]: boolean }>({
    '岸遥杜': true,
    '高野諭': true,
    '岩﨑丈一郎': true,
    '角田麗衣': true,
    '宇田津蓮': true
  })

  const [selectedTeam, setSelectedTeam] = useState('A')
  const [whoToCall, setWhoToCall] = useState('全員')
  const [submitter, setSubmitter] = useState('')
  const [callContent, setCallContent] = useState('')

  // ステータスを手動で切り替える関数
  const handleStatusToggle = async (name: string) => {
    const newStatus = !memberStatuses[name]
    const supabase = createClient()
    const statusText = newStatus ? '対応可能' : '対応不可'
    
    const { error } = await supabase
      .from('patrol_members') // テーブル名を指定
      .update({ status: statusText })
      .eq('name', name)

    if (error) {
      alert(`${name}さんのステータス更新に失敗しました: ${error.message}`)
      return
    }
    
    setMemberStatuses(prev => ({ ...prev, [name]: newStatus }))
  }

  // Slack送信 ＋ 送信後に自動でステータスを「対応不可」にする関数
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

    if (response.ok) {
      const supabase = createClient()
      
      if (whoToCall === '全員') {
        // 全員を「対応不可」に更新
        await supabase
          .from('patrol_members')
          .update({ status: '対応不可' })
          .in('name', MEMBERS.map(m => m.name))
        
        const updatedStatuses = { ...memberStatuses }
        MEMBERS.forEach(m => { updatedStatuses[m.name] = false })
        setMemberStatuses(updatedStatuses)
      } else {
        // 指定した1人を「対応不可」に更新
        await supabase
          .from('patrol_members')
          .update({ status: '対応不可' })
          .eq('name', whoToCall)

        setMemberStatuses(prev => ({ ...prev, [whoToCall]: false }))
      }
      alert(`${whoToCall} への呼び出しとステータス更新を完了しました！`)
    } else {
      alert('Slackへの送信に失敗しました')
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF5E9] p-4 font-sans text-[#4A4A4A]">
      
      {/* PATROL STATUS (5名分のスイッチを表示) */}
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

      {/* 呼び出しフォーム */}
      <div className="bg-orange-500 rounded-[32px] p-6 text-white shadow-xl">
        <div className="flex justify-center items-center gap-2 mb-8">
          <span className="text-3xl">📢</span>
          <h2 className="text-2xl font-black italic">巡回を呼び出す</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold mb-2 block ml-1">誰を呼びますか？</label>
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
            {/* チームの選択肢を A～L に拡大 */}
            <select 
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold outline-none appearance-none"
            >
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(t => (
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
            className="w-full bg-white text-orange-500 rounded-2xl py-5 font-black text-xl shadow-lg active:scale-95 transition-all"
          >
            呼び出しを送信
          </button>
        </div>
      </div>
    </div>
  )
}