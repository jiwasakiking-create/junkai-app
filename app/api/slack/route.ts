import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { team, who, sender, content } = await request.json()
  const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

  // 🚨 text ではなく blocks を使うことでボタンが表示されます
  const message = {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🚨 *巡回呼び出し (${team}チーム)* 🚨\n\n*対象:* ${who}\n*記入者:* ${sender}\n*内容:* ${content}\n\n※議事録リンクは現在準備中です。`
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "✅ 対応完了（対応したら押してね）"
            },
            style: "primary",
            value: who,
            action_id: "complete_patrol"
          }
        ]
      }
    ]
  }

  await fetch(WEBHOOK_URL!, { method: 'POST', body: JSON.stringify(message) })
  return NextResponse.json({ ok: true })
}