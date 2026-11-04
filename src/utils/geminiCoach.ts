/**
 * AI Yoga Coach Debrief Generator using Google Gemini API
 */

export function getGeminiApiKey(): string {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem("GEMINI_API_KEY");
    if (local && local.trim().length > 0) {
      return local.trim();
    }
  }
  return "";
}

export function setGeminiApiKey(key: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("GEMINI_API_KEY", key.trim());
  }
}

export interface SessionMetrics {
  totalScore: number;
  levelScores: number[];
  feedbacks?: string[][];
  levelDetails?: Array<{ level: number; slug: string; name: string; difficulty: string }>;
}

export async function generateGeminiDebrief(metrics: SessionMetrics): Promise<string> {
  const apiKey = getGeminiApiKey();
  const models = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-flash-latest"
  ];

  const levelsSummary = (metrics.levelDetails || []).map((detail, idx) => {
    const score = metrics.levelScores[idx] ?? 0;
    const tips = (metrics.feedbacks?.[idx] || []).slice(0, 2).join("; ");
    return `${detail.name} (Level ${detail.level}): ${score}%${tips ? ` - Notes: ${tips}` : ""}`;
  }).join("\n");

  const prompt = `You are Pose Muse, a world-class, encouraging, and biomechanically insightful personal AI yoga coach.
A practitioner just finished their yoga practice session with the following performance data:

Overall Total Score: ${metrics.totalScore}%
Level Performance:
${levelsSummary || `Scores: ${metrics.levelScores.join(", ")}%`}

Please write a warm, motivating, spoken personal audio debrief (3 to 4 concise sentences).
Rules:
1. Speak in a calm, inspiring, and empowering coach voice.
2. Celebrate their specific balance or strength accomplishments.
3. Offer 1 practical biomechanical adjustment or alignment cue for their next flow.
4. Keep the text natural for Text-to-Speech (no emojis, no markdown asterisks, no hashtags).`;

  if (apiKey) {
    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 250
              }
            })
          }
        );

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === "string" && text.trim().length > 0) {
          // Clean any markdown formatting so TTS reads smoothly
          return text.replace(/[*_#`]/g, "").trim();
        }
      } catch (err) {
        console.warn(`Gemini generation failed on model ${model}:`, err);
      }
    }
  }

  // Graceful intelligent fallback if offline or API key not supplied
  const firstLevelName = metrics.levelDetails?.[0]?.name || "your flow";
  return `Phenomenal effort on ${firstLevelName} today! You achieved a strong overall score of ${metrics.totalScore} percent with steady alignment across your poses. Keep focusing on relaxing your shoulders and grounding through your feet as you build deeper strength.`;
}
