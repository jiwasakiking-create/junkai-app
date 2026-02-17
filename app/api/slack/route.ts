import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { team, who, sender, content } = await request.json()
  const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

  // リンクを「準備中」などの固定メッセージにするか、項目自体を削る
  const message = {
    text: `🚨 *巡回呼び出し (${team}チーム)* 🚨\n\n*対象:* ${who}\n*記入者:* ${sender}\n*内容:* ${content}\n\n※議事録リンクは現在準備中です。`
  }

  await fetch(WEBHOOK_URL!, { method: 'POST', body: JSON.stringify(message) })
  return NextResponse.json({ ok: true })
}