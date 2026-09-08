import { randomUUID } from 'crypto';
import { getDb } from './db';

export type ApiOperation = 'generate_questions' | 'transcribe' | 'evaluate';

// Estimated OpenAI list pricing (USD). Update here if OpenAI changes pricing —
// this only drives the self-tracked "estimated cost" figure, not a real invoice.
const TOKEN_PRICING_PER_1M: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};
const AUDIO_PRICING_PER_MINUTE: Record<string, number> = {
  'whisper-1': 0.006,
};
const DEFAULT_TOKEN_PRICING = { input: 2.5, output: 10 };

function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  audioSeconds: number
): number {
  if (audioSeconds > 0) {
    const perMinute = AUDIO_PRICING_PER_MINUTE[model] ?? AUDIO_PRICING_PER_MINUTE['whisper-1'];
    return (audioSeconds / 60) * perMinute;
  }
  const pricing = TOKEN_PRICING_PER_1M[model] ?? DEFAULT_TOKEN_PRICING;
  return (promptTokens / 1_000_000) * pricing.input + (completionTokens / 1_000_000) * pricing.output;
}

export function logApiUsage(params: {
  keyLabel: string;
  operation: ApiOperation;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  audioSeconds?: number;
}) {
  const promptTokens = params.promptTokens ?? 0;
  const completionTokens = params.completionTokens ?? 0;
  const audioSeconds = params.audioSeconds ?? 0;
  const cost = estimateCost(params.model, promptTokens, completionTokens, audioSeconds);

  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO api_usage_logs
        (id, key_label, operation, model, prompt_tokens, completion_tokens, total_tokens, audio_seconds, estimated_cost_usd, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      randomUUID(),
      params.keyLabel,
      params.operation,
      params.model,
      promptTokens,
      completionTokens,
      promptTokens + completionTokens,
      audioSeconds,
      cost
    );
  } catch (err) {
    // Usage logging must never break the actual AI call flow.
    console.error('Failed to log API usage:', err);
  }
}

export interface UsageSummary {
  monthCostUsd: number;
  monthCallCount: number;
  allTimeCostUsd: number;
  monthlyBudgetUsd: number;
  remainingBudgetUsd: number;
  dailyTrend: { date: string; cost: number; calls: number }[];
  byOperation: { operation: string; cost: number; calls: number }[];
  byKey: { key_label: string; cost: number; calls: number }[];
}

export function getUsageSummary(): UsageSummary {
  const db = getDb();

  const monthRow = db.prepare(`
    SELECT COALESCE(SUM(estimated_cost_usd), 0) as cost, COUNT(*) as calls
    FROM api_usage_logs
    WHERE created_at >= datetime('now', 'start of month')
  `).get() as { cost: number; calls: number };

  const allTimeRow = db.prepare(`
    SELECT COALESCE(SUM(estimated_cost_usd), 0) as cost FROM api_usage_logs
  `).get() as { cost: number };

  const dailyTrend = db.prepare(`
    SELECT DATE(created_at) as date, SUM(estimated_cost_usd) as cost, COUNT(*) as calls
    FROM api_usage_logs
    WHERE created_at >= datetime('now', '-13 days')
    GROUP BY DATE(created_at)
    ORDER BY date
  `).all() as { date: string; cost: number; calls: number }[];

  const byOperation = db.prepare(`
    SELECT operation, SUM(estimated_cost_usd) as cost, COUNT(*) as calls
    FROM api_usage_logs
    WHERE created_at >= datetime('now', 'start of month')
    GROUP BY operation
    ORDER BY cost DESC
  `).all() as { operation: string; cost: number; calls: number }[];

  const byKey = db.prepare(`
    SELECT key_label, SUM(estimated_cost_usd) as cost, COUNT(*) as calls
    FROM api_usage_logs
    WHERE created_at >= datetime('now', 'start of month')
    GROUP BY key_label
    ORDER BY cost DESC
  `).all() as { key_label: string; cost: number; calls: number }[];

  const budgetConfig = db.prepare(`SELECT value FROM system_config WHERE key = 'monthly_budget_usd'`).get() as { value: string } | undefined;
  const monthlyBudgetUsd = Number(budgetConfig?.value ?? 50) || 0;

  return {
    monthCostUsd: monthRow.cost,
    monthCallCount: monthRow.calls,
    allTimeCostUsd: allTimeRow.cost,
    monthlyBudgetUsd,
    remainingBudgetUsd: monthlyBudgetUsd - monthRow.cost,
    dailyTrend,
    byOperation,
    byKey,
  };
}

export interface OpenAIOrgUsage {
  configured: boolean;
  monthCostUsd?: number;
  error?: string;
}

/**
 * Best-effort call to OpenAI's organization Costs API, for accounts that have
 * provisioned an Admin API key (sk-admin-...). Returns configured:false when
 * no admin key/org id has been set, so the caller can fall back to self-tracked usage only.
 */
export async function getOpenAIOrgUsage(): Promise<OpenAIOrgUsage> {
  const db = getDb();
  const rows = db.prepare(`SELECT key, value FROM system_config WHERE key IN ('openai_admin_api_key', 'openai_organization_id')`).all() as { key: string; value: string }[];
  const config: Record<string, string> = {};
  for (const r of rows) config[r.key] = r.value;

  const adminKey = config.openai_admin_api_key;
  if (!adminKey) {
    return { configured: false };
  }

  try {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const startTime = Math.floor(startOfMonth.getTime() / 1000);

    const headers: Record<string, string> = { Authorization: `Bearer ${adminKey}` };
    if (config.openai_organization_id) headers['OpenAI-Organization'] = config.openai_organization_id;

    const res = await fetch(
      `https://api.openai.com/v1/organization/costs?start_time=${startTime}&bucket_width=1d&limit=31`,
      { headers }
    );

    if (!res.ok) {
      return { configured: true, error: `OpenAI API 回應錯誤（HTTP ${res.status}）` };
    }

    const data = await res.json();
    let total = 0;
    for (const bucket of data.data ?? []) {
      for (const result of bucket.results ?? []) {
        total += result.amount?.value ?? 0;
      }
    }

    return { configured: true, monthCostUsd: total };
  } catch {
    return { configured: true, error: '無法連線至 OpenAI 官方用量 API' };
  }
}
