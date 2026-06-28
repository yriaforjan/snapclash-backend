import dotenv from "dotenv";

dotenv.config();

interface AIEvaluation {
  similarity_score: number;
  originality_score: number;
  ai_justification: string;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`AI timeout after ${ms}ms`)), ms)
    ),
  ]);

const evaluatePhotoOnce = async (
  imageBuffer: Buffer,
  mimeType: string,
  challengeDescription: string
): Promise<AIEvaluation> => {
  const systemPrompt = `Eres un juez perspicaz, generoso y detallista de un concurso de fotografía entre amigos. Tu trabajo es analizar la imagen con atención real antes de puntuar. Evalúas el CONCEPTO y el ESPÍRITU del reto, no la coincidencia literal. Eres divertido e irónico, como un jurado de Got Talent.

REGLA CRÍTICA DE PUNTUACIÓN: NUNCA uses múltiplos de 5 (no uses 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100). Usa siempre números irregulares como 67, 73, 82, 88, 91, 94... Las puntuaciones deben reflejar un análisis real, no estimaciones aproximadas.`;

  const userPrompt = `El reto de hoy es: "${challengeDescription}".

PASO 1 — Describe lo que ves en la imagen (objetos, escena, composición, contexto).
PASO 2 — Razona cómo se relaciona con el reto.
PASO 3 — Puntúa cada dimensión sumando sus sub-criterios:

similarity_score: ¿Cumple el CONCEPTO del reto?
  • Relevancia temática con el reto (0–38): ¿el sujeto fotografiado encaja con la idea del reto?
  • Claridad de ejecución (0–33): ¿se entiende la intención del fotógrafo?
  • Fidelidad al espíritu del reto (0–29): ¿captó lo que se pedía aunque sea con creatividad?
  → Suma los tres. Sé generoso con interpretaciones creativas válidas.

originality_score: ¿Qué tan original es?
  • Inesperado de la interpretación (0–38): ¿sorprende la lectura del reto?
  • Creatividad visual (encuadre, perspectiva, momento) (0–33)
  • Algo que distingue esta foto de la obvia (0–29)
  → Suma los tres.

ai_justification: Una sola frase en español, máximo 40 palabras, divertida e irónica con algún emoji.

Responde ÚNICAMENTE con el objeto JSON. No incluyas el razonamiento previo en la respuesta:
{"similarity_score": <número no múltiplo de 5>, "originality_score": <número no múltiplo de 5>, "ai_justification": "<frase>"}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBuffer.toString("base64")}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = (data.choices?.[0]?.message?.content ?? "").trim();
  const clean = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Groq no devolvió JSON válido: ${raw.slice(0, 200)}`);

  return JSON.parse(jsonMatch[0]);
};

export const evaluatePhoto = async (
  imageBuffer: Buffer,
  mimeType: string,
  challengeDescription: string
): Promise<AIEvaluation> => {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 30_000;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await withTimeout(
        evaluatePhotoOnce(imageBuffer, mimeType, challengeDescription),
        TIMEOUT_MS
      );
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) throw err;
      await sleep(1000 * Math.pow(2, attempt));
    }
  }
  throw new Error("unreachable");
};
