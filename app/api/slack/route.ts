import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { team, who, sender, content } = await request.json()
  const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

  const minutesLinks: { [key: string]: string } = {
    "A": "https://docs.google.com/document/d/1RDz8Bynd3b2Tq6xgbzNeTDONJunO1U8sSPYG2uu1kws/edit?tab=t.0",
    "B": "https://docs.google.com/document/d/13Nt5HaDJLBOWt8cI__f8a0lBDLm47bT83fln2FWOUZA/edit?tab=t.0",
    "C": "https://docs.google.com/document/d/149Pdil28Zjsl6VTEFLADG36Ke45cnIhDi1n30bqilR0/edit?tab=t.0",
    "D": "https://docs.google.com/document/d/13_ZwLYdJY2XZ7OsYwprGwfPWgI-XCilAQWzI2vQP1q8/edit?tab=t.0",
    "E": "https://docs.google.com/document/d/1BCKUc6mQbBFAdKGW9FJSLBZ1chnf1IfAN07yi4iYfSg/edit?tab=t.0",
    "F": "https://docs.google.com/document/d/16YB9KWo-tcigcgZcBelW7hVWidpqiWvn8SezYiHm4wQ/edit?tab=t.0"
  }

  const teamLink = minutesLinks[team] || "リンクなし"

  const message = {
    text: `🚨 *巡回呼び出し (${team}チーム)* 🚨\n\n*対象:* ${who}\n*記入者:* ${sender}\n*内容:* ${content}\n\n📝 *議事録リンク:* ${teamLink}`
  }

  await fetch(WEBHOOK_URL!, { method: 'POST', body: JSON.stringify(message) })
  return NextResponse.json({ ok: true })
}