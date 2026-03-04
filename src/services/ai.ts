import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export const generateStoryContent = async (
  prompt: string, 
  context: string, 
  config?: AIConfig
) => {
  const provider = config?.provider || 'gemini';
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) throw new Error(`${provider.toUpperCase()} API Key not configured`);

  const fullPrompt = `Context: ${context}\n\nTask: ${prompt}`;

  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: config?.model || "gemini-3-flash-preview",
      contents: fullPrompt,
      config: {
        systemInstruction: "You are an expert novel writer. Use the provided context to write high-quality prose. Maintain consistency with the Codex entries provided.",
      },
    });
    return response.text;
  }

  if (provider === 'openai') {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const response = await openai.chat.completions.create({
      model: config?.model || "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert novel writer. Use the provided context to write high-quality prose. Maintain consistency with the Codex entries provided." },
        { role: "user", content: fullPrompt }
      ],
    });
    return response.choices[0].message.content;
  }

  if (provider === 'anthropic' || provider === 'openrouter') {
    const url = provider === 'anthropic' 
      ? 'https://api.anthropic.com/v1/messages' 
      : 'https://openrouter.ai/api/v1/chat/completions';
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const body = provider === 'anthropic' ? {
      model: config?.model || "claude-3-5-sonnet-20240620",
      max_tokens: 4096,
      system: "You are an expert novel writer. Use the provided context to write high-quality prose. Maintain consistency with the Codex entries provided.",
      messages: [{ role: "user", content: fullPrompt }]
    } : {
      model: config?.model || "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "system", content: "You are an expert novel writer. Use the provided context to write high-quality prose. Maintain consistency with the Codex entries provided." },
        { role: "user", content: fullPrompt }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (provider === 'anthropic') {
      return data.content[0].text;
    } else {
      return data.choices[0].message.content;
    }
  }

  throw new Error("Unsupported AI Provider");
};
