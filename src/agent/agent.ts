import { GoogleGenAI, type Content } from "@google/genai";

import { tools, executeTool } from "./tools.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const history: Content[] = [];

/** Text parts only. response.text warns on tool calls, and that warning breaks the prompt layout. */
function replyText(content: Content | undefined): string {
  return (content?.parts ?? [])
    .filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join("");
}

export function resetHistory() {
  history.length = 0;
}

export async function runAgent(
  userPrompt: string,
  onText: (text: string) => void,
  onToolStart: (name: string) => void,
  signal?: AbortSignal,
) {
  history.push({
    role: "user",
    parts: [{ text: userPrompt }],
  });
  while (true) {
    if (signal?.aborted) return;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: history,
      config: {
        systemInstruction: "You are a helpful coding CLI agent. Be concise.",
        tools: tools,
        abortSignal: signal,
      },
    });
    const modelContent = response.candidates?.[0].content;
    if (modelContent) {
      history.push(modelContent);
    }
    const text = replyText(modelContent);
    if (text) {
      onText(text);
    }
    if (!response.functionCalls || response.functionCalls.length === 0) {
      break;
    }
    const toolOutputs = [];
    for (const call of response.functionCalls) {
      if (signal?.aborted) return;

      const toolName = call.name!;
      onToolStart(toolName);

      const result = await executeTool(toolName, call.args);
      toolOutputs.push({
        functionResponse: {
          name: toolName,
          response: { result },
        },
      });
    }
    history.push({
      role: "user",
      parts: toolOutputs,
    });
  }
}
