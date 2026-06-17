'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'

// 1. グループ体制の定義
const GROUPS = [
  {
    id: 1,
    name: '➀高野諭・吉田壮志朗',
    members: [
      { name: '高野諭', slackId: 'U0BAHU93J73' },
      { name: '吉田壮志朗', slackId: 'U0BAMPKEZJQ' }
    ]
  },
  {
    id: 2,
    name: '➁角田麗衣・池田睦',
    members: [
      { name: '角田麗衣', slackId: 'U0BAHS1LZ4Z' },
      { name: '池田睦', slackId: 'U0BA9LT80PM' } 
    ]
  },
  {
    id: 3,
    name: '➂髙野幹太・宇田津蓮',
    members: [
      { name: '髙野幹太', slackId: 'U0BAEPYKN03' },
      { name: '宇田津蓮', slackId: 'U0BA0PBR99D' }
    ]
  },
  {
    id: 4,
    name: '➃西川和華・樫八重秀太朗',
    members: [
      { name: '西川和華', slackId: 'U0BA0M0CEG7' }, // ※仮のID
      { name: '樫八重秀太朗', slackId: 'U0BAP47ELF5' }
    ]
  },
  {
    id: 5,
    name: '➄岸遥杜',
    members: [
      { name: '岸遥杜', slackId: 'U0BAG07G334' }
    ]
  }
]

// 2. 新しい A〜P チーム（16チーム分）の議事録 URL 定義
const TEAM_URLS: { [key: string]: string } = {
  'A': 'https://docs.google.com/document/d/153Ud9jgqQoazXQPLCmzkx3t5QwnZ2u2iZciU8ulq3cU/edit?usp=drivesdk',
  'B': 'https://docs.google.com/document/d/1EpvGgnKJ01zg2UpjdPysHJgvNUwI5E3hX5n0MdhYsmU/edit?usp=drivesdk',
  'C': 'https://docs.google.com/document/d/1UPu4SF_CbKGCz4dVCQ4j9YqaCsjIUx0u51goaH6uYWA/edit?usp=drivesdk',
  'D': 'https://docs.google.com/document/d/1cjkHvhfGRN_gkorRc9f4byj6nhw-jWlFriVa8RvZiXE/edit?usp=drivesdk',
  'E': 'https://docs.google.com/document/d/1NKBBD5t-8e8CsVlO4wshekcEVa2M1bRWgtZ3yKc9j0Y/edit?usp=drivesdk',
  'F': 'https://docs.google.com/document/d/11s8TSHy7R-GMTvfb7a8WKKAN4lOdPJF0ZAJlTRRVwtQ/edit?usp=drivesdk',
  'G': 'https://docs.google.com/document/d/1YFYEbUySixSPZ7N7SC48S0WRChI_Gb2IrptqbwSvZXw/edit?usp=drivesdk',
  'H': 'https://docs.google.com/document/d/1oquarIAKvg6FiYYt1PlXNYLA6Tcmxv812aWp6hj8GN0/edit?usp=drivesdk',
  'I': 'https://docs.google.com/document/d/1hVDP_00iBrTlQg3FptCLwoIYh3mtc4q_5yD23aiVsFc/edit?usp=drivesdk',
  'J': 'https://docs.google.com/document/d/1HNdDisVnsJhkW6lKgqEzRMCHOq_lF8s9BpRUlbNv7_0/edit?usp=drivesdk',
  'K': 'https://docs.google.com/document/d/1cmTXIebraN1V-cVzXgPsCGY5ajI1-BxDH9fIZn_BMJI/edit?usp=drivesdk',
  'L': 'https://docs.google.com/document/d/1HaZZwRDzMoZLrjWPfpgXstbknH7o4h0XqPQRjKoVz0U/edit?usp=drivesdk',
  'M': 'https://docs.google.com/document/d/1AC5TMzESEoGUx59OCOoHs3kJRgBVhPXQXOr9Ksd3bPw/edit?usp=drivesdk',
  'N': 'https://docs.google.com/document/d/1gpoC9bI6qNAr8B5CQ5FmLcDb5xRvAAyo4KsrswjS3LM/edit?usp=drivesdk',
  'O': 'https://docs.google.com/document/d/1sA3v-yYMZ1Bd20sHRE5Au8gdZOljnGKI0Pf3QkY_sQI/edit?usp=drivesdk',
  'P': 'https://docs.google.com/document/d/1jcNcd8DArH4-KLaOpvlHqFjkeRPEfXO-Sxnv5RfkFX0/edit?usp=drivesdk'
}

export default function PatrolDashboard() {
  const [groupStatuses, setGroupStatuses] = useState<{ [key: string]: boolean }>({})
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
        setGroupStatuses(statusMap)
      }
    }
    fetchInitialStatuses()

    const channel = supabase
      .channel('realtime-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patrol_members' }, (payload) => {
        const { name, status } = payload.new
        setGroupStatuses(prev => ({ ...prev, [name]: status === '対応可能' }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleStatusToggle = async (name: string) => {
    const currentStatus = groupStatuses[name]
    const statusText = !currentStatus ? '対応可能' : '対応不可'
    await supabase.from('patrol_members').update({ status: statusText }).eq('name', name)
  }

  // 📢 呼び出し送信処理（呼び出し履歴保存機能付き）
  const handleCallSubmit = async () => {
    let mention = ''
    
    if (whoToCall === '全員') {
      const allIds = GROUPS.flatMap(g => g.members.map(m => `<@${m.slackId}>`))
      mention = allIds.join(' ')
    } else {
      const targetGroup = GROUPS.find(g => g.name === whoToCall)
      if (targetGroup) {
        mention = targetGroup.members.map(m => `<@${m.slackId}>`).join(' ')
      }
    }

    // Slackへの通知処理
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

    // Supabaseのステータス更新 ＆ 呼び出し履歴の保存
    if (response.ok) {
      // 型（Objectの配列）を明示的に指定してTypeScriptのビルドエラーを防ぐ
      const logsToInsert: { group_name: string; target_team: string }[] = []

      if (whoToCall === '全員') {
        // 「全員」呼び出しの場合：現在「対応可能」だったグループだけを出動データとして抽出して履歴に残す
        GROUPS.forEach(g => {
          if (groupStatuses[g.name] === true) {
            logsToInsert.push({
              group_name: g.name,
              target_team: `${selectedTeam}チーム`
            })
          }
        })

        // 全員を対応不可に更新
        await supabase.from('patrol_members').update({ status: '対応不可' }).in('name', GROUPS.map(g => g.name))
      } else {
        // 特定の1グループ呼び出しの場合：そのグループのみ履歴に残す
        logsToInsert.push({
          group_name: whoToCall,
          target_team: `${selectedTeam}チーム`
        })

        // 対象グループのみ対応不可に更新
        await supabase.from('patrol_members').update({ status: '対応不可' }).eq('name', whoToCall)
      }

      // ★ 新設した「patrol_call_logs」テーブルに呼び出し履歴を一括保存
      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase.from('patrol_call_logs').insert(logsToInsert)
        if (logError) {
          console.error('呼び出し履歴の保存に失敗:', logError)
        }
      }

      alert(`${selectedTeam}チームの呼び出しを送信しました！`)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF5E9] p-4 font-sans text-[#4A4A4A]">
      {/* グループのステータス一覧 */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm mb-6 border border-orange-100">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <h2 className="text-orange-500 font-black tracking-widest text-sm uppercase">Group Status</h2>
        </div>
        <div className="space-y-4">
          {GROUPS.map((g) => (
            <div key={g.name} className="bg-orange-50/50 p-4 rounded-2xl flex justify-between items-center border border-orange-100/50">
              <div>
                <p className="font-bold text-lg mb-1">{g.name}</p>
                <p className={`${groupStatuses[g.name] ? 'text-[#00B96B]' : 'text-red-500'} text-sm font-bold`}>
                  ● {groupStatuses[g.name] ? '対応可能' : '対応不可'}
                </p>
              </div>
              <button onClick={() => handleStatusToggle(g.name)} className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${groupStatuses[g.name] ? 'bg-[#00B96B]' : 'bg-gray-300'}`}>
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${groupStatuses[g.name] ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 呼び出しフォーム */}
      <div className="bg-orange-500 rounded-[32px] p-6 text-white shadow-xl">
        <div className="flex justify-center items-center gap-2 mb-8">
          <span className="text-3xl">📢</span>
          <h2 className="text-2xl font-black italic">グループを呼び出す</h2>
        </div>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold mb-2 block ml-1">どのグループを呼びますか？</label>
            <select value={whoToCall} onChange={(e) => setWhoToCall(e.target.value)} className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold outline-none appearance-none">
              <option value="全員">全員</option>
              {GROUPS.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold mb-2 block ml-1">あなたのチーム名</label>
            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold outline-none appearance-none">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'].map(t => (
                <option key={t} value={t}>{t} チーム</option>
              ))}
            </select>
          </div>
          <input placeholder="記入者名" value={submitter} onChange={(e) => setSubmitter(e.target.value)} className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold placeholder:text-orange-200 outline-none" />
          <textarea placeholder="呼び出し内容(現在のフェーズや巡回に求めることを書いてください)" rows={3} value={callContent} onChange={(e) => setCallContent(e.target.value)} className="w-full bg-orange-400/50 border border-orange-300 rounded-2xl p-4 font-bold placeholder:text-orange-200 outline-none resize-none" />
          <button onClick={handleCallSubmit} className="w-full bg-white text-orange-500 rounded-2xl py-5 font-black text-xl shadow-lg active:scale-95 transition-all">呼び出しを送信</button>
        </div>
      </div>
    </div>
  )
}