'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'

// メンバー情報
const MEMBERS = [
  { id: 1, name: '岸遥杜', slackId: 'U0AJQ965RB4' },
  { id: 2, name: '高野諭', slackId: 'U0AK1JTRRMX' },
  { id: 3, name: '岩﨑丈一郎', slackId: 'U0AJFL0KDLK' }, // 以前の橋本さんのIDを継承
  { id: 4, name: '角田麗衣', slackId: 'U0AJRC7HU2G' },
  { id: 5, name: '宇田津蓮', slackId: 'U0AJLF52B5K' }
]

// 📝 12 チーム分の議事録 URL 定義
const TEAM_URLS: { [key: string]: string } = {
  'A': 'https://docs.google.com/document/d/17Z0-i5Rci5zWcCeKPqOUg7Qurn1dJQYZ2bUAJ0fkhAY/edit?usp=drivesdk',
  'B': 'https://docs.google.com/document/d/1vpzlPHC2bT-4l3tlpzWm0md_8m-idBr8A2vU7IkvgwE/edit?usp=drivesdk',
  'C': 'https://docs.google.com/document/d/1MxsSLM6VxKTQeZtpGz64fzH3QTduPPXTFcCLk-lq4Fk/edit?usp=drivesdk',
  'D': 'https://docs.google.com/document/d/1-pQA1UI3zFRFmXYq2vWB-Vtka7lL2m8DvOKIOs1ewok/edit?usp=drivesdk',
  'E': 'https://docs.google.com/document/d/1j9SxL1AIG2pwWbCKQfRVRb0bLdNFvBVBb_Jmgg9v0uE/edit?usp=drivesdk',
  'F': 'https://docs.google.com/document/d/1qb-rwK0uUIk_2x-Wd3EGe8ab0xe8rVo2vwZtCM8Nj1I/edit?usp=drivesdk',
  'G': 'https://docs.google.com/document/d/12sY2iUQ0U1pP6E9rOq4YXMJsUAli02cKQFEdEqjlAPw/edit?usp=drivesdk',
  'H': 'https://docs.google.com/document/d/1vBqZcn4VVI1UuSdADUOG8l1VRJCVrNKMHSKye14u0nE/edit?usp=drivesdk',
  'I': 'https://docs.google.com/document/d/1xa56wRsUpuhQHBJMldrzsbroLcxLDvldrQ1wmK4TJek/edit?usp=drivesdk',
  'J': 'https://docs.google.com/document/d/1EgEeCaY8FR4IrK4LHmSUQqoJXE-vvtJ22LVSVk6T1fw/edit?usp=drivesdk',
  'K': 'https://docs.google.com/document/d/1BHtqEbnaFVr0ftxP94mELfS01fWTV6oB4AZLbjO7IkM/edit?usp=drivesdk',
  'L': 'https://docs.google.com/document/d/14Jikcz4MwKONlrTlYAo3ufN5cBaAG18BsJ5E48egg8Q/edit?usp=drivesdk'
}

export default function PatrolDashboard() {
  const [memberStatuses, setMemberStatuses] = useState<{ [key: string]: boolean }>({})
  const [selectedTeam, setSelectedTeam] = useState('A')
  const [whoToCall, setWhoToCall] = useState('全員')
  const [submitter, setSubmitter] = useState('')
  const [callContent, setCallContent] = useState('')

  const supabase = createClient()

  // 🔄 リアルタイム同期
  useEffect(() => {
    const fetchInitialStatuses = async () => {
      const { data } = await supabase.from('patrol_members').select('name, status') //
      if (data) {
        const statusMap: { [key: string]: boolean } = {}
        data.forEach(row => { statusMap[row.name] = (row.status === '対応可能') })
        setMemberStatuses(statusMap)
      }
    }
    fetchInitialStatuses()

    const channel = supabase
      .channel('realtime-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patrol_members' }, (payload) => {
        const { name, status } = payload.new
        setMemberStatuses(prev => ({ ...prev, [name]: status === '対応可能' }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleStatusToggle = async (name: string) => {
    const currentStatus = memberStatuses[name]
    const statusText = !currentStatus ? '対応可能' : '対応不可'
    await supabase.from('patrol_members').update({ status: statusText }).eq('name', name)
  }

  const handleCallSubmit = async () => {
    // 🚀 メンション文字列の作成ロジック
    let mention = ''
    
    if (whoToCall === '全員') {
      // 全員の場合は、5名全員のIDを繋げる
      mention = MEMBERS.map(m => `<@${m.slackId}>`).join(' ')
    } else {
      // 個人の場合は、その人のIDのみ
      const target = MEMBERS.find(m => m.name === whoToCall)
      if (target) {
        mention = `<@${target.slackId}>`
      }
    }

    const response = await fetch('/api/slack', {
      method: 'POST',
      body: JSON.stringify({ 
        team: selectedTeam, 
        who: whoToCall, 
        mention: mention, // 追加したメンションを送る
        sender: submitter, 
        content: callContent,
        minutesUrl: TEAM_URLS[selectedTeam] 
      }),
    })

    if (response.ok) {
      // Supabaseのステータス更新
      if (whoToCall === '全員') {
        await supabase.from('patrol_members').update({ status: '対応不可' }).in('name', MEMBERS.map(m => m.name))
      } else {
        await supabase.from('patrol_members').update({ status: '対応不可' }).eq('name', whoToCall)
      }
      alert('巡回メンバーへの通知とステータス更新が完了しました！')
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
              <button onClick={() => handleStatusToggle(m.name)} className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${memberStatuses[m.name] ? 'bg-[#00B96B]' : 'bg-gray-300'}`}>
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${memberStatuses[m.name] ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

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
            {/* 🛠️ A～L の 12 チームに拡大 */}
            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold outline-none appearance-none">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(t => (
                <option key={t} value={t}>{t} チーム</option>
              ))}
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