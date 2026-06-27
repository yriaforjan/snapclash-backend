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
  const prompt = `Eres un evaluador visual objetivo de un concurso de fotos entre amigos. El reto de hoy es: "${challengeDescription}".

Analiza la imagen y devuelve un JSON con estas claves:
1. similarity_score: número de 0 a 100 que mide objetivamente si la foto cumple el reto.
2. originality_score: número de 0 a 100 que mide lo creativa o inesperada que es la interpretación.
3. ai_justification: una sola frase en español, máximo 40 palabras, divertida e irónica como un jurado de Got Talent. Puede incluir algún emoji.

Responde ÚNICAMENTE con el objeto JSON, sin texto adicional ni bloques de código.`;

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
          role: "user",
          content: [
            { type: "text", text: prompt },
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
