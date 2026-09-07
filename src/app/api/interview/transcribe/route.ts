import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { transcribeAudio } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: '未收到音頻檔案' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const transcript = await transcribeAudio(buffer, audioFile.name || 'audio.webm');

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: '語音辨識失敗' }, { status: 500 });
  }
}
