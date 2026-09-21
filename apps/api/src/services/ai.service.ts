/**
 * OpenRouter AI service (https://openrouter.ai).
 * Used for patient-facing helpers: symptom-to-specialty guidance + booking help.
 * Safety: server-pinned model, input length caps, no PHI persistence, disclaimers.
 */
import { getConfig } from '../config/config.js';
import { ApiError } from '../lib/errors.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function aiEnabled(): boolean {
  const cfg = getConfig();
  return cfg.AI_ENABLED === true && cfg.OPENROUTER_API_KEY.length > 0;
}

export function requireAi() {
  if (!aiEnabled()) {
    throw new ApiError(
      503,
      'AI_DISABLED',
      'AI assistant is disabled. Set OPENROUTER_API_KEY (see openrouter.ai/keys) and AI_ENABLED=true.'
    );
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(messages: ChatMessage[], maxTokens = 400): Promise<string> {
  const cfg = getConfig();
  requireAi();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${cfg.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': cfg.OPENROUTER_SITE_URL,
        'X-Title': cfg.OPENROUTER_APP_NAME,
      },
      body: JSON.stringify({
        model: cfg.OPENROUTER_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ApiError(502, 'AI_UPSTREAM_ERROR', `AI provider error (${res.status})`, {
        detail: text.slice(0, 300),
      });
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) throw new ApiError(502, 'AI_EMPTY_RESPONSE', 'AI returned no content');
    return content;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(502, 'AI_REQUEST_FAILED', 'AI request failed');
  } finally {
    clearTimeout(timer);
  }
}

const SPECIALTIES = [
  'Cardiology',
  'Oncology',
  'Neurology',
  'Orthopedics',
  'Nephrology',
  'Pediatrics',
  'Neonatology',
  'Psychiatry',
  'Neurosciences',
  'Emergency',
  'ICU',
  'Critical Care',
  'Radiology',
  'Transplants',
  'Spine',
];

const DISCLAIMER =
  'This is general information only, not a diagnosis. For emergencies call local emergency services.';

export async function symptomGuide(input: { symptoms: string; language?: string }) {
  const cfg = getConfig();
  const symptoms = input.symptoms.slice(0, cfg.AI_MAX_INPUT_CHARS);
  const content = await chat(
    [
      {
        role: 'system',
        content: `You are a hospital navigation helper for Bangalore, India. Given patient-described symptoms, suggest 1-3 relevant specialties ONLY from this list: ${SPECIALTIES.join(', ')}. Also give urgency (routine/soon/urgent) and one next step (book GP/specialist or emergency). Never diagnose, never prescribe, never ask for personal identifiers. Reply as compact JSON: {"specialties":[...],"urgency":"...","nextStep":"..."}.`,
      },
      { role: 'user', content: `Symptoms: ${symptoms}\nLanguage: ${input.language ?? 'English'}` },
    ],
    350
  );
  let parsed: { specialties?: string[]; urgency?: string; nextStep?: string } = {};
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content) as never;
  } catch {
    parsed = {};
  }
  const specialties = (parsed.specialties ?? []).filter((s) => SPECIALTIES.includes(s)).slice(0, 3);
  return {
    specialties,
    urgency: parsed.urgency ?? 'routine',
    nextStep: parsed.nextStep ?? 'Book a relevant specialist and describe symptoms at the visit.',
    disclaimer: DISCLAIMER,
    model: cfg.OPENROUTER_MODEL,
  };
}

export async function bookingHelp(input: { query: string }) {
  const cfg = getConfig();
  const query = input.query.slice(0, cfg.AI_MAX_INPUT_CHARS);
  const content = await chat(
    [
      {
        role: 'system',
        content: `You turn a patient's natural-language request into doctor-search filters for a Bangalore hospital app. Allowed specialties: ${SPECIALTIES.join(', ')}. Reply as compact JSON only: {"specialty":"... or empty","hospital":"... or empty","language":"... or empty","q":"keywords or empty"}. Never include personal data beyond what the user wrote.`,
      },
      { role: 'user', content: query },
    ],
    250
  );
  let parsed = { specialty: '', hospital: '', language: '', q: '' };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = { ...parsed, ...(JSON.parse(jsonMatch ? jsonMatch[0] : content) as object) };
  } catch {
    parsed.q = query.slice(0, 120);
  }
  return { filters: parsed, disclaimer: DISCLAIMER, model: cfg.OPENROUTER_MODEL };
}
