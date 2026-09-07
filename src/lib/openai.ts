import OpenAI, { toFile } from 'openai';

const API_KEYS = [
  process.env.OPENAI_API_KEY_1 || '',
  process.env.OPENAI_API_KEY_2 || '',
].filter(Boolean);

let currentKeyIndex = 0;

export function getOpenAIClient(): OpenAI {
  if (API_KEYS.length === 0) {
    throw new Error('No OpenAI API keys configured');
  }
  const key = API_KEYS[currentKeyIndex % API_KEYS.length];
  currentKeyIndex++;
  return new OpenAI({ apiKey: key });
}

export async function generateInterviewQuestions(
  position: string,
  jobDescription: string,
  questionCount: number,
  language: string
): Promise<string[]> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `你是一位專業的面試官。請根據提供的職缺說明，生成 ${questionCount} 道面試題目。
要求：
1. 題目必須針對該職位的核心能力進行提問
2. 題目難度適中，適合模擬面試練習
3. 使用${language}
4. 請直接以 JSON 陣列格式回傳題目，例如：["題目1", "題目2", "題目3"]
5. 不要附加任何額外說明文字`,
      },
      {
        role: 'user',
        content: `應徵職位：${position}\n\n職缺說明：\n${jobDescription}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || '[]';
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [`請描述您在${position}方面的相關經驗。`];
  }
}

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  const client = getOpenAIClient();

  const file = await toFile(audioBuffer, filename, { type: 'audio/webm' });

  const response = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file: file,
    language: 'zh',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  // Format with timestamps
  if (response.segments && response.segments.length > 0) {
    return response.segments
      .map((seg: { start: number; text: string }) => {
        const minutes = Math.floor(seg.start / 60);
        const seconds = Math.floor(seg.start % 60);
        const ts = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        return `${ts}${seg.text.trim()}`;
      })
      .join('\n');
  }

  return response.text || '';
}

export async function evaluateInterview(
  position: string,
  jobDescription: string,
  questions: { question: string; transcript: string }[],
  scoringWeights: { name: string; weight: number }[]
): Promise<{
  totalScore: number;
  status: 'passed' | 'failed';
  summary: string;
  radarConfidence: number;
  radarTechnical: number;
  radarLogic: number;
  questionScores: number[];
}> {
  const client = getOpenAIClient();

  const weightDesc = scoringWeights.map(w => `${w.name}(${w.weight}%)`).join('、');

  const qaContent = questions
    .map(
      (q, i) =>
        `第${i + 1}題：${q.question}\n回答逐字稿：${q.transcript || '(未作答)'}`
    )
    .join('\n\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `你是一位專業的面試評分官。請根據以下面試內容進行多維度評分。

評分維度與權重：${weightDesc}

請嚴格以以下 JSON 格式回傳結果，不要附加任何其他文字：
{
  "totalScore": <0-100的總分>,
  "radarConfidence": <表達自信分數 0-100>,
  "radarTechnical": <技術符合度分數 0-100>,
  "radarLogic": <邏輯清晰度分數 0-100>,
  "questionScores": [<每題分數, 0-100>],
  "summary": "<面試總評語，200-400字，包含優點、缺點和改進建議>"
}`,
      },
      {
        role: 'user',
        content: `應徵職位：${position}\n職缺說明：${jobDescription}\n\n面試問答：\n${qaContent}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || '';
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned);
    return {
      totalScore: result.totalScore || 0,
      status: (result.totalScore || 0) >= 60 ? 'passed' : 'failed',
      summary: result.summary || '評分失敗',
      radarConfidence: result.radarConfidence || 0,
      radarTechnical: result.radarTechnical || 0,
      radarLogic: result.radarLogic || 0,
      questionScores: result.questionScores || questions.map(() => 0),
    };
  } catch {
    return {
      totalScore: 0,
      status: 'failed',
      summary: 'AI 評分過程發生錯誤，請重試。',
      radarConfidence: 0,
      radarTechnical: 0,
      radarLogic: 0,
      questionScores: questions.map(() => 0),
    };
  }
}
