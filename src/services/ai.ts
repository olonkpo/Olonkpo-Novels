import { GoogleGenAI } from "@google/genai";

export const getAI = (apiKey?: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

export const generateStoryContent = async (prompt: string, context: string, apiKey?: string) => {
  const ai = getAI(apiKey);
  if (!ai) throw new Error("AI not configured");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Context: ${context}\n\nTask: ${prompt}`,
    config: {
      systemInstruction: "You are an expert novel writer. Use the provided context to write high-quality prose. Maintain consistency with the Codex entries provided.",
    },
  });

  return response.text;
};
