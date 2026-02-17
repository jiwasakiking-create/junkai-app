import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase'

export async function POST(request: Request) {
  const formData = await request.formData()
  const payload = JSON.parse(formData.get('payload') as string)

  // ボタンが押された時の処理
  if (payload.actions[0].action_id === "complete_patrol") {
    const name = payload.actions[0].value
    const supabase = createClient()

    // Supabaseのステータスを「対応可能」に戻す
    const { error } = await supabase
      .from('patrol_members')
      .update({ status: '対応可能' })
      .eq('name', name)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Slack側のメッセージを「更新完了」という表示に上書きする
    return NextResponse.json({
      text: `✅ ${name}さんの対応が完了し、ステータスを「対応可能」に戻しました。`,
      replace_original: true
    })
  }

  return NextResponse.json({ ok: true })
}