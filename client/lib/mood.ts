import type { MoodTag } from "@/lib/types";

const VALID_HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export type MoodInference = MoodTag & {
  source: "llm" | "fallback";
  reason?: string;
};

function fallbackMoodFromText(text: string, reason: string): MoodInference {
  const lower = text.toLowerCase();

  if (lower.includes("happy") || lower.includes("joy") || lower.includes("celebrate")) {
    return { mood: "joyful", color: "#F59E0B", source: "fallback", reason };
  }

  if (lower.includes("calm") || lower.includes("peace") || lower.includes("relax")) {
    return { mood: "calm", color: "#60A5FA", source: "fallback", reason };
  }

  if (lower.includes("sad") || lower.includes("grief") || lower.includes("miss")) {
    return { mood: "melancholic", color: "#64748B", source: "fallback", reason };
  }

  if (lower.includes("love") || lower.includes("romance") || lower.includes("affection")) {
    return { mood: "loving", color: "#F472B6", source: "fallback", reason };
  }

  return { mood: "reflective", color: "#A78BFA", source: "fallback", reason };
}

export async function inferMoodColorWithSource(text: string): Promise<MoodInference> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackMoodFromText(text, "missing_api_key");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.MOOD_LLM_MODEL ?? "gpt-4.1-mini",
      temperature: 0.45,
      messages: [
        {
          role: "system",
          content:
            'Return strict JSON: {"mood": string, "color": "#RRGGBB"}. Keep mood to 1-3 words and return any valid hex color.',
        },
        {
          role: "user",
          content: `Infer emotional mood and an appropriate hex color for this memory: ${text}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    return fallbackMoodFromText(text, `llm_http_error_${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    return fallbackMoodFromText(text, "llm_empty_content");
  }

  try {
    const parsed = JSON.parse(content) as Partial<MoodTag>;

    if (!parsed.mood || !parsed.color || !VALID_HEX_COLOR.test(parsed.color)) {
      return fallbackMoodFromText(text, "llm_invalid_payload");
    }

    return {
      mood: parsed.mood.trim().slice(0, 40),
      color: parsed.color,
      source: "llm",
    };
  } catch {
    return fallbackMoodFromText(text, "llm_parse_error");
  }
}

export async function inferMoodColor(text: string): Promise<MoodTag> {
  const mood = await inferMoodColorWithSource(text);
  return { mood: mood.mood, color: mood.color };
}
