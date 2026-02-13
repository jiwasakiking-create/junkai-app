'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [members, setMembers] = useState<any[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [teamName, setTeamName] = useState('')
  const [callerName, setCallerName] = useState('')
  const [reason, setReason] = useState('')
  const [isSending, setIsSending] = useState(false)

  const fetchMembers = async () => {
    const { data } = await supabase.from('patrol_members').select('*').order('id', { ascending: true })
    if (data) setMembers(data)
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  // 呼び出し処理
  const handleCall = async () => {
    if (!selectedMemberId || !teamName || !callerName) {
      alert('未入力の項目があります')
      return
    }
    setIsSending(true)
    const target = members.find(m => m.id.toString() === selectedMemberId)

    const response = await fetch('/api/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slackId: target.slack_id,
        teamName,
        callerName,
        reason
      })
    })

    if (response.ok) {
      await supabase.from('patrol_members').update({ status: 'busy' }).eq('id', selectedMemberId)
      alert(`${target.name}さんを呼び出しました！`)
      fetchMembers()
    } else {
      alert('Slackへの通知に失敗しました')
    }
    setIsSending(false)
  }

  // 「対応完了」ボタンの処理
  const handleComplete = async (id: string) => {
    const { error } = await supabase
      .from('patrol_members')
      .update({ status: 'available' })
      .eq('id', id)
    
    if (!error) {
      fetchMembers()
    }
  }

  return (
    // 全体の背景を白に近い明るいオレンジに変更
    <main className="min-h-screen bg-orange-50 p-4 md:p-10 font-sans text-gray-800">
      <div className="max-w-md mx-auto">
       {/* ロゴ・ヘッダー部分 */}
        <div className="text-center mb-10">
          {/* 画像を表示するタグ */}
          <img 
            src="/logo.png"  // ← ここに入れたファイル名を書く（例: logo.jpg など）
            alt="巡回マネージャーロゴ" 
            className="w-32 mx-auto mb-4 rounded-xl shadow-md hover:scale-105 transition-transform"
          />
          <h1 className="text-2xl font-bold text-orange-800">巡回マネージャー</h1>
        </div>
        
        
        {/* メンバー一覧部分 */}
        <section className="mb-10 bg-white p-6 rounded-3xl shadow-md border-2 border-orange-100">
          <h2 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-6 flex items-center">
            <span className="inline-block w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
            Patrol Status
          </h2>
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between bg-orange-50 p-4 rounded-2xl">
                <div>
                  <div className="font-bold text-lg text-gray-800">{member.name}</div>
                  <div className={`text-sm font-bold mt-1 ${member.status === 'available' ? 'text-green-600' : 'text-orange-500'}`}>
                    {member.status === 'available' ? '● 対応可能' : '■ 対応中'}
                  </div>
                </div>
                {/* 対応完了ボタン */}
                {member.status !== 'available' && (
                  <button 
                    onClick={() => handleComplete(member.id)}
                    className="text-sm bg-white border-2 border-orange-300 text-orange-600 px-4 py-2 rounded-full font-bold hover:bg-orange-100 transition shadow-sm"
                  >
                    完了
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 呼び出しフォーム部分 */}
        {/* 背景を明るいオレンジのグラデーションに変更 */}
        <section className="bg-gradient-to-br from-orange-400 to-orange-500 p-8 rounded-3xl shadow-xl text-white">
          <h2 className="text-2xl font-bold mb-8 text-center flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6 3 3 0 000 6zM5 19a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v11a2 2 0 01-2 2H5z" />
            </svg>
            巡回を呼び出す
          </h2>
          <div className="space-y-5">
            <div>
              <label className="text-sm font-bold text-orange-100 ml-2">誰を呼びますか？</label>
              <div className="relative">
                <select 
                  className="w-full mt-2 p-4 pr-10 bg-orange-300/50 border-2 border-orange-300/50 rounded-2xl text-white font-bold focus:outline-none focus:border-white appearance-none text-lg"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                >
                  <option value="" className="text-gray-800">選択してください</option>
                  {members.filter(m => m.status === 'available').map(m => (
                    <option key={m.id} value={m.id} className="text-gray-800">{m.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white top-2">
                  <svg className="fill-current h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
            <input 
              type="text" placeholder="あなたのチーム名" 
              className="w-full p-4 bg-orange-300/50 border-2 border-orange-300/50 rounded-2xl text-white placeholder-orange-200 focus:outline-none focus:border-white font-bold"
              onChange={(e) => setTeamName(e.target.value)} 
            />
            <input 
              type="text" placeholder="記入者名" 
              className="w-full p-4 bg-orange-300/50 border-2 border-orange-300/50 rounded-2xl text-white placeholder-orange-200 focus:outline-none focus:border-white font-bold"
              onChange={(e) => setCallerName(e.target.value)} 
            />
            <textarea 
              placeholder="呼び出し内容" 
              className="w-full p-4 bg-orange-300/50 border-2 border-orange-300/50 rounded-2xl text-white placeholder-orange-200 focus:outline-none focus:border-white font-bold" 
              rows={3} 
              onChange={(e) => setReason(e.target.value)}
            ></textarea>
            <button 
              onClick={handleCall}
              disabled={isSending}
              className="w-full bg-white text-orange-600 font-black text-lg py-5 rounded-2xl transition transform active:scale-95 shadow-md hover:shadow-lg disabled:bg-gray-200 disabled:text-gray-500 mt-4"
            >
              {isSending ? '送信中...' : '呼び出しを送信'}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}