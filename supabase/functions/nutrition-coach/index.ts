import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://jesselundstrom.github.io',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const MAX_REQUEST_BYTES = 6 * 1024 * 1024;
const MAX_MESSAGES = 12;
const MAX_TEXT_CHARS = 4000;
const MAX_TRAINING_CONTEXT_CHARS = 6000;
const MAX_TODAY_SUMMARY_CHARS = 400;
const MAX_TAGS = 6;
const MAX_TAG_LENGTH = 40;
const MAX_REQUESTS_PER_DAY = 25;
const MAX_PHOTO_REQUESTS_PER_DAY = 8;
const ANTHROPIC_TIMEOUT_MS = 20000;
const TEXT_MODEL = 'claude-haiku-4-5';
const PHOTO_MODEL = 'claude-sonnet-4-5';

type RuntimeConfig = {
  anthropicApiKey: string;
  serviceRoleKey: string;
  supabaseUrl: string;
};

function createRequestId() {
  try {
    return crypto.randomUUID();
  } catch (_) {
    return `nutrition_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function logNutritionEvent(
  level: 'info' | 'warn' | 'error',
  requestId: string,
  event: string,
  details: Record<string, unknown> = {}
) {
  const payload = {
    scope: 'nutrition_coach',
    level,
    event,
    request_id: requestId,
    timestamp: new Date().toISOString(),
    ...details,
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

function getRuntimeConfig(requestId: string) {
  const config: RuntimeConfig = {
    supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    anthropicApiKey: Deno.env.get('ANTHROPIC_API_KEY') || '',
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    logNutritionEvent('error', requestId, 'config_missing', {
      missing,
    });
  }
  return {
    config,
    ok: missing.length === 0,
  };
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') return null;
  return 'code' in error ? String(error.code || '') || null : null;
}

async function releaseNutritionUsageClaim(
  supabase: ReturnType<typeof createClient>,
  input: {
    isPhoto: boolean;
    reason: string;
    requestId: string;
    usageDate: string;
    userId: string;
  }
) {
  const result = await supabase.rpc('release_nutrition_usage_claim', {
    p_user_id: input.userId,
    p_usage_date: input.usageDate,
    p_is_photo: input.isPhoto,
  });
  if (result.error) {
    logNutritionEvent('warn', input.requestId, 'quota_release_failed', {
      reason: input.reason,
      usage_date: input.usageDate,
      user_id: input.userId,
      error_code: getErrorCode(result.error),
    });
    return false;
  }
  logNutritionEvent('info', input.requestId, 'quota_released', {
    reason: input.reason,
    usage_date: input.usageDate,
    user_id: input.userId,
  });
  return true;
}

async function finalizeNutritionUsage(
  supabase: ReturnType<typeof createClient>,
  input: {
    inputTokens: number;
    outputTokens: number;
    requestId: string;
    usageDate: string;
    userId: string;
  }
) {
  const result = await supabase.rpc('finalize_nutrition_usage', {
    p_user_id: input.userId,
    p_usage_date: input.usageDate,
    p_input_tokens: input.inputTokens,
    p_output_tokens: input.outputTokens,
  });
  if (result.error) {
    logNutritionEvent('warn', input.requestId, 'quota_finalize_failed', {
      usage_date: input.usageDate,
      user_id: input.userId,
      error_code: getErrorCode(result.error),
    });
    return false;
  }
  logNutritionEvent('info', input.requestId, 'quota_finalized', {
    usage_date: input.usageDate,
    user_id: input.userId,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
  });
  return true;
}

function getAllowedOrigins() {
  const fromEnv = String(
    Deno.env.get('ALLOWED_ORIGINS') || Deno.env.get('SITE_URL') || ''
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  return [...fromEnv, ...DEFAULT_ALLOWED_ORIGINS].filter((origin) => {
    if (seen.has(origin)) return false;
    seen.add(origin);
    return true;
  });
}

function getCorsHeaders(request: Request) {
  const origin = String(request.headers.get('origin') || '').trim();
  const allowedOrigins = getAllowedOrigins();
  const resolvedOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0] || 'https://jesselundstrom.github.io';
  return {
    ...BASE_CORS_HEADERS,
    'Access-Control-Allow-Origin': resolvedOrigin,
    Vary: 'Origin',
  };
}

function jsonResponse(
  status: number,
  payload: Record<string, unknown>,
  corsHeaders: Record<string, string>
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
  corsHeaders: Record<string, string>
) {
  return jsonResponse(status, {
    error: {
      code,
      message,
      ...extra,
    },
  }, corsHeaders);
}

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}

function sanitizeLocale(value: unknown) {
  return String(value || '').trim().toLowerCase() === 'fi' ? 'fi' : 'en';
}

function sanitizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => String(tag || '').trim().slice(0, MAX_TAG_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_TAGS);
}

function normalizeNumber(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.round(num));
}

function normalizeEstimatedMacros(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const group = value as Record<string, unknown>;
  const calories = normalizeNumber(group.calories);
  const protein = normalizeNumber(group.protein_g);
  const carbs = normalizeNumber(group.carbs_g);
  const fat = normalizeNumber(group.fat_g);
  if (
    calories === null &&
    protein === null &&
    carbs === null &&
    fat === null
  ) {
    return null;
  }
  return {
    calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
  };
}

function normalizeRemainingToday(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const group = value as Record<string, unknown>;
  const calories = normalizeNumber(group.calories);
  const protein = normalizeNumber(group.protein_g);
  if (calories === null && protein === null) return null;
  return {
    calories,
    protein_g: protein,
  };
}

function normalizeCoachPayload(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Record<string, unknown>;
  const displayMarkdown = sanitizeText(payload.display_markdown, MAX_TEXT_CHARS);
  if (!displayMarkdown) return null;
  return {
    display_markdown: displayMarkdown,
    estimated_macros: normalizeEstimatedMacros(payload.estimated_macros),
    remaining_today: normalizeRemainingToday(payload.remaining_today),
    tags: sanitizeTags(payload.tags),
  };
}

function tryParseStructuredPayload(rawText: string) {
  const text = sanitizeText(rawText, MAX_TEXT_CHARS);
  if (!text) return null;
  const candidates = [text];
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch?.[1]) candidates.push(fenceMatch[1].trim());
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const normalized = normalizeCoachPayload(parsed);
      if (normalized) return normalized;
    } catch (_) {}
  }
  return null;
}

function validateTargets(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const targets = value as Record<string, unknown>;
  return {
    calories: normalizeNumber(targets.calories),
    protein: normalizeNumber(targets.protein),
    carbs: normalizeNumber(targets.carbs),
    fat: normalizeNumber(targets.fat),
    tdee: normalizeNumber(targets.tdee),
  };
}

function validateMessages(value: unknown, requestKind: 'text' | 'photo') {
  if (!Array.isArray(value) || !value.length || value.length > MAX_MESSAGES) {
    return null;
  }
  let hasImage = false;
  const normalized = value.map((message) => {
    if (!message || typeof message !== 'object') return null;
    const next = message as Record<string, unknown>;
    const role = next.role === 'assistant' ? 'assistant' : next.role === 'user' ? 'user' : '';
    if (!role) return null;
    const content = next.content;
    if (typeof content === 'string') {
      return {
        role,
        content: sanitizeText(content, MAX_TEXT_CHARS),
      };
    }
    if (!Array.isArray(content) || !content.length) return null;
    const parts = content
      .map((part) => {
        if (!part || typeof part !== 'object') return null;
        const nextPart = part as Record<string, unknown>;
        if (nextPart.type === 'text') {
          const text = sanitizeText(nextPart.text, MAX_TEXT_CHARS);
          return text ? { type: 'text', text } : null;
        }
        if (nextPart.type === 'image') {
          const source =
            nextPart.source && typeof nextPart.source === 'object'
              ? (nextPart.source as Record<string, unknown>)
              : null;
          const mediaType = sanitizeText(source?.media_type, 80);
          const data = sanitizeText(source?.data, MAX_REQUEST_BYTES);
          if (
            source?.type !== 'base64' ||
            !mediaType.startsWith('image/') ||
            !data
          ) {
            return null;
          }
          hasImage = true;
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data,
            },
          };
        }
        return null;
      })
      .filter(Boolean);
    if (!parts.length) return null;
    return {
      role,
      content: parts,
    };
  });

  if (normalized.some((message) => !message)) return null;
  if (requestKind === 'photo' && !hasImage) return null;
  return normalized as Array<Record<string, unknown>>;
}

function buildSystemPrompt(payload: {
  locale: 'en' | 'fi';
  requestKind: 'text' | 'photo';
  trainingContext: string;
  todayIntakeSummary: string;
  actionId: string;
  targets: ReturnType<typeof validateTargets>;
}) {
  const languageInstruction =
    payload.locale === 'fi'
      ? 'Write display_markdown in Finnish.'
      : 'Write display_markdown in English.';
  const targetParts = [];
  if (payload.targets?.calories !== null) {
    targetParts.push(`calories: ${payload.targets?.calories}`);
  }
  if (payload.targets?.protein !== null) {
    targetParts.push(`protein_g: ${payload.targets?.protein}`);
  }
  if (payload.targets?.carbs !== null) {
    targetParts.push(`carbs_g: ${payload.targets?.carbs}`);
  }
  if (payload.targets?.fat !== null) {
    targetParts.push(`fat_g: ${payload.targets?.fat}`);
  }
  if (payload.targets?.tdee !== null) {
    targetParts.push(`tdee: ${payload.targets?.tdee}`);
  }

  const contextSections = [
    'You are Ironforge Nutrition Coach.',
    languageInstruction,
    'Respond with valid JSON only. Do not wrap the response in markdown fences.',
    'JSON schema: {"display_markdown": string, "estimated_macros": {"calories": number|null, "protein_g": number|null, "carbs_g": number|null, "fat_g": number|null} | null, "remaining_today": {"calories": number|null, "protein_g": number|null} | null, "tags": string[]}.',
    'Keep tags short snake_case labels.',
    'display_markdown should be concise, practical coaching with markdown bullets/headings when useful.',
    `Request kind: ${payload.requestKind}.`,
    `Guided action id: ${payload.actionId || 'none'}.`,
    payload.trainingContext
      ? `Training context:\n${payload.trainingContext}`
      : 'Training context: unavailable.',
    payload.todayIntakeSummary
      ? `Today intake summary:\n${payload.todayIntakeSummary}`
      : 'Today intake summary: unavailable.',
    targetParts.length
      ? `Targets: ${targetParts.join(', ')}`
      : 'Targets: unavailable.',
  ];

  return contextSections.join('\n\n');
}

Deno.serve(async (request) => {
  const requestId = createRequestId();
  const corsHeaders = getCorsHeaders(request);
  logNutritionEvent('info', requestId, 'request_received', {
    content_length: Number(request.headers.get('content-length') || 0),
    method: request.method,
    origin: request.headers.get('origin') || '',
  });
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    logNutritionEvent('warn', requestId, 'method_not_allowed', {
      method: request.method,
    });
    return errorResponse(
      405,
      'method_not_allowed',
      'Only POST is supported.',
      {},
      corsHeaders
    );
  }

  const runtimeConfig = getRuntimeConfig(requestId);
  if (!runtimeConfig.ok) {
    return errorResponse(
      503,
      'server_unavailable',
      'Nutrition Coach is temporarily unavailable.',
      {},
      corsHeaders
    );
  }
  const { supabaseUrl, serviceRoleKey, anthropicApiKey } = runtimeConfig.config;

  const authHeader = request.headers.get('authorization') || '';
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch?.[1]) {
    logNutritionEvent('warn', requestId, 'auth_header_missing');
    return errorResponse(
      401,
      'auth_required',
      'Sign in to use Nutrition Coach.',
      {},
      corsHeaders
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    logNutritionEvent('warn', requestId, 'request_too_large_header', {
      content_length: contentLength,
    });
    return errorResponse(
      413,
      'request_too_large',
      'That photo is too large. Choose a smaller image and try again.',
      {},
      corsHeaders
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(tokenMatch[1]);
  if (userError || !user?.id) {
    logNutritionEvent('warn', requestId, 'auth_failed', {
      error_code: getErrorCode(userError),
    });
    return errorResponse(
      401,
      'auth_required',
      'Sign in to use Nutrition Coach.',
      {},
      corsHeaders
    );
  }
  logNutritionEvent('info', requestId, 'auth_succeeded', {
    user_id: user.id,
  });

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_REQUEST_BYTES) {
    logNutritionEvent('warn', requestId, 'request_too_large_body', {
      raw_body_bytes: new TextEncoder().encode(rawBody).length,
      user_id: user.id,
    });
    return errorResponse(
      413,
      'request_too_large',
      'That photo is too large. Choose a smaller image and try again.',
      {},
      corsHeaders
    );
  }

  let parsedBody: Record<string, unknown>;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch (_) {
    logNutritionEvent('warn', requestId, 'invalid_json', {
      user_id: user.id,
    });
    return errorResponse(
      400,
      'invalid_json',
      'Invalid request body.',
      {},
      corsHeaders
    );
  }

  const locale = sanitizeLocale(parsedBody.locale);
  const requestKind = parsedBody.requestKind === 'photo' ? 'photo' : 'text';
  const trainingContext = sanitizeText(
    parsedBody.trainingContext,
    MAX_TRAINING_CONTEXT_CHARS
  );
  const todayIntakeSummary = sanitizeText(
    parsedBody.todayIntakeSummary,
    MAX_TODAY_SUMMARY_CHARS
  );
  const actionId = sanitizeText(parsedBody.actionId, 80);
  const targets = validateTargets(parsedBody.targets);
  const messages = validateMessages(parsedBody.messages, requestKind);
  if (!messages) {
    logNutritionEvent('warn', requestId, 'invalid_request', {
      request_kind: requestKind,
      user_id: user.id,
    });
    return errorResponse(
      400,
      'invalid_request',
      'Invalid Nutrition Coach payload.',
      {},
      corsHeaders
    );
  }

  const usageDate = new Date().toISOString().slice(0, 10);
  logNutritionEvent('info', requestId, 'quota_claim_started', {
    request_kind: requestKind,
    usage_date: usageDate,
    user_id: user.id,
  });
  const { data: quotaRows, error: quotaError } = await supabase.rpc(
    'claim_nutrition_usage_quota',
    {
      p_user_id: user.id,
      p_usage_date: usageDate,
      p_is_photo: requestKind === 'photo',
      p_max_requests: MAX_REQUESTS_PER_DAY,
      p_max_photo_requests: MAX_PHOTO_REQUESTS_PER_DAY,
    }
  );
  if (quotaError) {
    logNutritionEvent('error', requestId, 'quota_claim_failed', {
      request_kind: requestKind,
      usage_date: usageDate,
      user_id: user.id,
      error_code: getErrorCode(quotaError),
    });
    return errorResponse(
      503,
      'quota_unavailable',
      'Nutrition Coach is temporarily unavailable.',
      {},
      corsHeaders
    );
  }

  const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
  if (!quota?.allowed) {
    logNutritionEvent('warn', requestId, 'quota_denied', {
      photo_request_count: quota?.photo_request_count ?? null,
      request_count: quota?.request_count ?? null,
      request_kind: requestKind,
      usage_date: usageDate,
      user_id: user.id,
    });
    return errorResponse(
      429,
      'rate_limit',
      'Rate limit reached - wait a moment and try again.',
      {
        request_count: quota?.request_count ?? null,
        photo_request_count: quota?.photo_request_count ?? null,
      },
      corsHeaders
    );
  }

  const model = requestKind === 'photo' ? PHOTO_MODEL : TEXT_MODEL;
  const system = buildSystemPrompt({
    locale,
    requestKind,
    trainingContext,
    todayIntakeSummary,
    actionId,
    targets,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
  try {
    logNutritionEvent('info', requestId, 'upstream_request_started', {
      action_id: actionId || null,
      model,
      request_kind: requestKind,
      usage_date: usageDate,
      user_id: user.id,
    });
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: requestKind === 'photo' ? 900 : 700,
          system,
          messages,
        }),
        signal: controller.signal,
      });
    clearTimeout(timeoutId);

    const anthropicJson = await anthropicResponse.json().catch(() => ({}));
    if (!anthropicResponse.ok) {
      logNutritionEvent('warn', requestId, 'upstream_request_failed', {
        request_kind: requestKind,
        status: anthropicResponse.status,
        usage_date: usageDate,
        user_id: user.id,
      });
      if (anthropicResponse.status >= 500) {
        await releaseNutritionUsageClaim(supabase, {
          isPhoto: requestKind === 'photo',
          reason: 'upstream_error',
          requestId,
          usageDate,
          userId: user.id,
        });
      }
      if (anthropicResponse.status === 413) {
        return errorResponse(
          413,
          'request_too_large',
          'That photo is too large. Choose a smaller image and try again.',
          {},
          corsHeaders
        );
      }
      if (anthropicResponse.status === 429) {
        return errorResponse(
          429,
          'rate_limit',
          'Rate limit reached - wait a moment and try again.',
          {},
          corsHeaders
        );
      }
      return errorResponse(
        anthropicResponse.status >= 500 ? 503 : 502,
        'upstream_error',
        'Nutrition Coach is temporarily unavailable.',
        {},
        corsHeaders
      );
    }

    const contentParts = Array.isArray(anthropicJson.content)
      ? anthropicJson.content
      : [];
    const rawText = contentParts
      .filter((part: Record<string, unknown>) => part?.type === 'text')
      .map((part: Record<string, unknown>) => String(part.text || ''))
      .join('\n')
      .trim();
    const normalizedPayload =
      normalizeCoachPayload(anthropicJson) ||
      tryParseStructuredPayload(rawText) || {
        display_markdown: sanitizeText(rawText, MAX_TEXT_CHARS),
        estimated_macros: null,
        remaining_today: null,
        tags: [],
      };

    if (!normalizedPayload.display_markdown) {
      logNutritionEvent('warn', requestId, 'invalid_upstream_payload', {
        request_kind: requestKind,
        usage_date: usageDate,
        user_id: user.id,
      });
      await releaseNutritionUsageClaim(supabase, {
        isPhoto: requestKind === 'photo',
        reason: 'invalid_upstream_payload',
        requestId,
        usageDate,
        userId: user.id,
      });
      return errorResponse(
        502,
        'invalid_upstream_payload',
        'Nutrition Coach is temporarily unavailable.',
        {},
        corsHeaders
      );
    }

    const usage =
      anthropicJson.usage && typeof anthropicJson.usage === 'object'
        ? {
            input_tokens: normalizeNumber(
              (anthropicJson.usage as Record<string, unknown>).input_tokens
            ),
            output_tokens: normalizeNumber(
              (anthropicJson.usage as Record<string, unknown>).output_tokens
            ),
          }
        : null;

    await finalizeNutritionUsage(supabase, {
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      requestId,
      usageDate,
      userId: user.id,
    });
    logNutritionEvent('info', requestId, 'request_completed', {
      model,
      request_kind: requestKind,
      usage_date: usageDate,
      user_id: user.id,
    });

    return jsonResponse(200, {
      ...normalizedPayload,
      model,
      usage,
      raw_text: rawText || null,
    }, corsHeaders);
  } catch (error) {
    await releaseNutritionUsageClaim(supabase, {
      isPhoto: requestKind === 'photo',
      reason:
        error instanceof DOMException && error.name === 'AbortError'
          ? 'timeout'
          : 'server_error',
      requestId,
      usageDate,
      userId: user.id,
    });
    if (error instanceof DOMException && error.name === 'AbortError') {
      logNutritionEvent('error', requestId, 'request_timeout', {
        request_kind: requestKind,
        usage_date: usageDate,
        user_id: user.id,
      });
      return errorResponse(
        503,
        'server_timeout',
        'Nutrition Coach is temporarily unavailable.',
        {},
        corsHeaders
      );
    }
    logNutritionEvent('error', requestId, 'request_failed', {
      request_kind: requestKind,
      usage_date: usageDate,
      user_id: user.id,
    });
    return errorResponse(
      503,
      'server_unavailable',
      'Nutrition Coach is temporarily unavailable.',
      {},
      corsHeaders
    );
  } finally {
    clearTimeout(timeoutId);
  }
});
