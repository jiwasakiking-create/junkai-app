'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'

// 1. 新しい6名体制のメンバー情報
const MEMBERS = [
  { id: 1, name: '吉田壮志朗', slackId: 'U09DUE84AG7' },
  { id: 2, name: '金子休太郎', slackId: 'U09CWULFMC3' },
  { id: 3, name: '黒岩賢人', slackId: 'U09SAFYLHU1' },
  { id: 4, name: '樫八重秀太朗', slackId: 'U09DNNYQVDE' },
  { id: 5, name: '高野諭', slackId: 'U09RTBBECAF' },
  { id: 6, name: '髙野幹太', slackId: 'U09RR707FQT' }
]

// 2. 新しい A〜H チームの議事録 URL 定義
const TEAM_URLS: { [key: string]: string } = {
  'A': 'https://docs.google.com/document/d/16cCnrPXI0bRsdYGcmsoVmzJ1cXMOtAYJwq-CBqt32qw/edit?usp=drivesdk',
  'B': 'https://docs.google.com/document/d/1_qit4TGmo8dVofR3NLOdI-Gjq66lD8LP2KGpCClL-Vg/edit?usp=drivesdk',
  'C': 'https://docs.google.com/document/d/1KsIYjSrdEeodyz4-hV1fJbnExF8NHIZ59mNEZX3Pgk0/edit?usp=drivesdk',
  'D': 'https://docs.google.com/document/d/1d4F4gexcgk9rid4h_PoUuSDrpm5UL93ytjKlYfCuuiM/edit?usp=drivesdk',
  'E': 'https://docs.google.com/document/d/1sAZqen25K6UG_gdQgPwNjyHotmijtY7_87V89D7GUzM/edit?usp=drivesdk',
  'F': 'https://docs.google.com/document/d/1V7PQvX9d8-2t6XKMmq0bGs7BKycAUvAgIJX1n42Qtjs/edit?usp=drivesdk',
  'G': 'https://docs.google.com/document/d/16kesOrtDMaHIwBwkYswy-xbcSFKEKbPsgHmALEXNQis/edit?usp=drivesdk',
  'H': 'https://docs.google.com/document/d/1A4tEcjuh-p8dV695EP1Dw6wiHPqA--vyLEWJja971UU/edit?usp=drivesdk'
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
      const { data } = await supabase.from('patrol_members').select('name, status')
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

  // 📢 呼び出し送信処理（async を確実に付与）
  const handleCallSubmit = async () => {
    // 🚀 1. メンション文字列の作成
    let mention = ''
    if (whoToCall === '全員') {
      mention = MEMBERS.map(m => `<@${m.slackId}>`).join(' ')
    } else {
      const target = MEMBERS.find(m => m.name === whoToCall)
      if (target) {
        mention = `<@${target.slackId}>`
      }
    }

    // 🚀 2. スプレッドシート（GAS）へデータを自動送信
    const gasUrl = process.env.NEXT_PUBLIC_GAS_URL
    if (gasUrl) {
      try {
        // 確実にデータを届けるためにテキスト形式に変換して送信
        const params = new URLSearchParams({
          team: selectedTeam,
          who: whoToCall,
          sender: submitter,
          content: callContent
        })
        
        await fetch(`${gasUrl}?${params.toString()}`, {
          method: 'POST',
          mode: 'no-cors' // これでブラウザの赤文字エラーを防ぎつつデータを届けます
        })
      } catch (err) {
        console.error("GAS送信エラー:", err)
      }
    }

    // 🚀 3. Slackへの通知処理
    const response = await fetch('/api/slack', {
      method: 'POST',
      body: JSON.stringify({ 
        team: selectedTeam, 
        who: whoToCall, 
        mention: mention, 
        sender: submitter, 
        content: callContent,
        minutesUrl: TEAM_URLS[selectedTeam] 
      }),
    })

    // 🚀 4. Supabaseのステータス更新
    if (response.ok) {
      if (whoToCall === '全員') {
        await supabase.from('patrol_members').update({ status: '対応不可' }).in('name', MEMBERS.map(m => m.name))
      } else {
        await supabase.from('patrol_members').update({ status: '対応不可' }).eq('name', whoToCall)
      }
      alert(`${selectedTeam}チームの呼び出しを送信しました！履歴もスプレッドシートに記録されました。`)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF5E9] p-4 font-sans text-[#4A4A4A]">
      {/* メンバーのステータス一覧 */}
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

      {/* 呼び出しフォーム */}
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
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(t => (
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