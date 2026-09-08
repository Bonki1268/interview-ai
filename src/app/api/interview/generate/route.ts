import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateInterviewQuestions } from '@/lib/openai';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const db = getDb();

    // Server-side enforcement: an active admin assignment always wins over
    // whatever the client sends, regardless of what the UI allowed.
    const activeAssignment = db.prepare(`
      SELECT id, position, job_description, due_at
      FROM interview_assignments
      WHERE user_id = ? AND status = 'active'
    `).get(user.id) as
      | { id: string; position: string; job_description: string; due_at: string | null }
      | undefined;

    let position: string;
    let jobDescription: string;
    let assignmentId: string | null = null;

    if (activeAssignment) {
      if (activeAssignment.due_at && new Date(activeAssignment.due_at) < new Date()) {
        return NextResponse.json({ error: '此指派已過期，請聯繫管理員' }, { status: 410 });
      }
      position = activeAssignment.position;
      jobDescription = activeAssignment.job_description;
      assignmentId = activeAssignment.id;
    } else {
      position = body.position;
      jobDescription = body.jobDescription;
    }

    if (!position || !jobDescription) {
      return NextResponse.json({ error: '請填寫應徵職位與職缺說明' }, { status: 400 });
    }

    const { questionCount, questionTimeLimit, language } = body;

    // Get system config for defaults
    const getConfig = (key: string): string => {
      const row = db.prepare('SELECT value FROM system_config WHERE key = ?').get(key) as { value: string } | undefined;
      return row?.value || '';
    };

    const actualQuestionCount = questionCount || parseInt(getConfig('default_question_count')) || 3;
    const actualTimeLimit = questionTimeLimit || parseInt(getConfig('question_time_limit')) || 60;
    const actualLanguage = language || getConfig('default_language') || '繁體中文';

    // Generate questions via OpenAI
    const questions = await generateInterviewQuestions(position, jobDescription, actualQuestionCount, actualLanguage);

    // Create interview record
    const interviewId = uuidv4();
    db.prepare(`
      INSERT INTO interviews (id, user_id, position, job_description, language, question_count, question_time_limit, assignment_id, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(interviewId, user.id, position, jobDescription, actualLanguage, actualQuestionCount, actualTimeLimit, assignmentId);

    // Insert questions
    const insertQ = db.prepare(`
      INSERT INTO interview_questions (id, interview_id, question_number, question_text)
      VALUES (?, ?, ?, ?)
    `);

    const questionRecords = questions.map((q: string, i: number) => {
      const qId = uuidv4();
      insertQ.run(qId, interviewId, i + 1, q);
      return { id: qId, question_number: i + 1, question_text: q };
    });

    return NextResponse.json({
      interviewId,
      questions: questionRecords,
      timeLimit: actualTimeLimit,
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: '生成面試題目失敗' }, { status: 500 });
  }
}
