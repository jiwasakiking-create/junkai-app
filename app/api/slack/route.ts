import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { slackId, memberName, teamName, callerName, reason } = body

  // さっきメモした Slack の Webhook URL をここに貼ってください
  const WEBHOOK_URL = 'https://hooks.slack.com/services/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'

  const message = {
    text: `<@${slackId}> さんに呼び出しが届いています！`,
    attachments: [{
      color: "#f87171",
      fields: [
        { title: "チーム", value: teamName, short: true },
        { title: "記入者", value: callerName, short: true },
        { title: "内容", value: reason || "特になし" }
      ]
    }]
  }

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify(message),
  })

  if (res.ok) {
    return NextResponse.json({ message: 'Success' })
  } else {
    return NextResponse.json({ message: 'Failed' }, { status: 500 })
  }
}