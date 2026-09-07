import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { evaluateInterview } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    await requireAuth();
    const { interviewId, answers } = await request.json();
    // answers: [{ questionId, transcript, durationSeconds }]

    if (!interviewId || !answers) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    const db = getDb();

    // Get interview info
    const interview = db.prepare('SELECT * FROM interviews WHERE id = ?').get(interviewId) as {
      id: string;
      position: string;
      job_description: string;
    } | undefined;

    if (!interview) {
      return NextResponse.json({ error: '找不到面試紀錄' }, { status: 404 });
    }

    // Get questions
    const questions = db.prepare(
      'SELECT * FROM interview_questions WHERE interview_id = ? ORDER BY question_number'
    ).all(interviewId) as { id: string; question_text: string; question_number: number }[];

    // Update transcripts and durations
    const updateQ = db.prepare(
      'UPDATE interview_questions SET transcript = ?, duration_seconds = ? WHERE id = ?'
    );

    for (const ans of answers) {
      updateQ.run(ans.transcript || '', ans.durationSeconds || 0, ans.questionId);
    }

    // Get scoring weights
    const weightsRow = db.prepare("SELECT value FROM system_config WHERE key = 'scoring_weights'").get() as { value: string } | undefined;
    const scoringWeights = weightsRow ? JSON.parse(weightsRow.value) : [
      { name: '技術符合度', weight: 40 },
      { name: '邏輯清晰度', weight: 30 },
      { name: '表達自信', weight: 30 },
    ];

    // Build Q&A pairs for evaluation
    const qaPairs = questions.map((q) => {
      const ans = answers.find((a: { questionId: string }) => a.questionId === q.id);
      return {
        question: q.question_text,
        transcript: ans?.transcript || '(未作答)',
      };
    });

    // AI evaluation
    const result = await evaluateInterview(
      interview.position,
      interview.job_description,
      qaPairs,
      scoringWeights
    );

    // Update interview record
    db.prepare(`
      UPDATE interviews SET
        total_score = ?,
        status = ?,
        summary = ?,
        radar_confidence = ?,
        radar_technical = ?,
        radar_logic = ?
      WHERE id = ?
    `).run(
      result.totalScore,
      result.status,
      result.summary,
      result.radarConfidence,
      result.radarTechnical,
      result.radarLogic,
      interviewId
    );

    // Update individual question scores
    const updateScore = db.prepare('UPDATE interview_questions SET score = ? WHERE id = ?');
    questions.forEach((q, i) => {
      updateScore.run(result.questionScores[i] || 0, q.id);
    });

    return NextResponse.json({
      interviewId,
      totalScore: result.totalScore,
      status: result.status,
      summary: result.summary,
    });
  } catch (error) {
    console.error('Evaluate error:', error);
    return NextResponse.json({ error: 'AI 評分失敗' }, { status: 500 });
  }
}
