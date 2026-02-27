


'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'

const MEMBERS = [
  { id: 1, name: '岸遥杜' },
  { id: 2, name: '高野諭' },
  { id: 3, name: '橋本真旺' },
  { id: 4, name: '角田麗衣' },
  { id: 5, name: '宇田津蓮' }
]

export default function PatrolDashboard() {
  // 初期状態は空にしておき、読み込み後に反映させる
  const [memberStatuses, setMemberStatuses] = useState<{ [key: string]: boolean }>({})
  const [selectedTeam, setSelectedTeam] = useState('A')
  const [whoToCall, setWhoToCall] = useState('全員')
  const [submitter, setSubmitter] = useState('')
  const [callContent, setCallContent] = useState('')

  const supabase = createClient()

  // 🔄 リアルタイム同期と初期データの取得
  useEffect(() => {
    // 1. ページを開いた時に今の状態を Supabase から取得
    const fetchInitialStatuses = async () => {
      const { data } = await supabase.from('patrol_members').select('name, status')
      if (data) {
        const statusMap: { [key: string]: boolean } = {}
        data.forEach(row => {
          statusMap[row.name] = (row.status === '対応可能')
        })
        setMemberStatuses(statusMap)
      }
    }
    fetchInitialStatuses()

    // 2. 他の人が更新した時に自分の画面も自動で書き換える（Realtime）
    const channel = supabase
      .channel('realtime-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patrol_members' }, (payload) => {
        const { name, status } = payload.new
        setMemberStatuses(prev => ({ ...prev, [name]: status === '対応可能' }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // スイッチを操作した時の処理（自分の画面を書き換える前に DB を更新）
  const handleStatusToggle = async (name: string) => {
    const currentStatus = memberStatuses[name]
    const statusText = !currentStatus ? '対応可能' : '対応不可'
    
    // DBを更新（成功すればリアルタイム機能が検知して画面が変わる）
    const { error } = await supabase
      .from('patrol_members')
      .update({ status: statusText })
      .eq('name', name)

    if (error) alert(`更新失敗: ${error.message}`)
  }

  const handleCallSubmit = async () => {
    const response = await fetch('/api/slack', {
      method: 'POST',
      body: JSON.stringify({ team: selectedTeam, who: whoToCall, sender: submitter, content: callContent }),
    })

    if (response.ok) {
      if (whoToCall === '全員') {
        await supabase.from('patrol_members').update({ status: '対応不可' }).in('name', MEMBERS.map(m => m.name))
      } else {
        await supabase.from('patrol_members').update({ status: '対応不可' }).eq('name', whoToCall)
      }
      alert('送信とステータス更新を完了しました！')
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF5E9] p-4 font-sans text-[#4A4A4A]">
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

      {/* 呼び出しフォームは以前と同じ */}
      <div className="bg-orange-500 rounded-[32px] p-6 text-white shadow-xl">
        <div className="flex justify-center items-center gap-2 mb-8">
          <span className="text-3xl">📢</span>
          <h2 className="text-2xl font-black italic">巡回を呼び出す</h2>
        </div>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold mb-2 block ml-1">誰を呼びますか？</label>
            <select value={whoToCall} onChange={(e) => setWhoToCall(e.target.value)} className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold outline-none appearance-none">
              <option value="全員">全員</option>
              {MEMBERS.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold mb-2 block ml-1">あなたのチーム名</label>
            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold outline-none appearance-none">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(t => <option key={t} value={t}>{t} チーム</option>)}
            </select>
          </div>
          <input placeholder="記入者名" value={submitter} onChange={(e) => setSubmitter(e.target.value)} className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold placeholder:text-orange-200 outline-none" />
          <textarea placeholder="呼び出し内容" rows={3} value={callContent} onChange={(e) => setCallContent(e.target.value)} className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold placeholder:text-orange-200 outline-none resize-none" />
          <button onClick={handleCallSubmit} className="w-full bg-white text-orange-500 rounded-2xl py-5 font-black text-xl shadow-lg active:scale-95 transition-all">呼び出しを送信</button>
        </div>
      </div>
    </div>
  )
}