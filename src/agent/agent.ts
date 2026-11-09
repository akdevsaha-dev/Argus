import { GoogleGenAI, type Content } from "@google/genai";
import fs from "fs/promises";
import path from "path";

import { tools, executeTool, DANGEROUS_TOOLS } from "./tools.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const MODEL = "gemini-3.1-flash-lite";

const history: Content[] = [];

function replyText(content: Content | undefined): string {
  return (content?.parts ?? [])
    .filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join("");
}

export function resetHistory() {
  history.length = 0;
}

const PROJECT_CONTEXT_LIMIT = 2000;

async function loadProjectContext(): Promise<string> {
  const candidates = ["AGENT.md", "CLAUDE.md", "README.md"];
  for (const filename of candidates) {
    let content: string;
    try {
      content = await fs.readFile(path.resolve(process.cwd(), filename), "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw err;
    }
    const truncated = content.length > PROJECT_CONTEXT_LIMIT;
    const body = truncated
      ? `${content.slice(0, PROJECT_CONTEXT_LIMIT)}\n[truncated]`
      : content;
    return `\n\n## Project context (${filename})\n${body}`;
  }
  return "";
}

export async function runAgent(
  userPrompt: string,
  onText: (text: string) => void,
  onToolStart: (name: string) => void,
  onConfirmTool: (name: string, args: any) => Promise<any>,
  signal?: AbortSignal,
) {
  history.push({
    role: "user",
    parts: [{ text: userPrompt }],
  });
  const projectContext = await loadProjectContext();
  while (true) {
    if (signal?.aborted) return;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: history,
      config: {
        systemInstruction: `
You are a coding CLI agent working in the current directory.
When the user asks you to create or modify a file, use edit_file
to save the changes to disk. Read existing files before editing them.
Displaying file contents in your reply does not complete a file-writing request.
Only report that a file was saved after the tool confirms success.
If a tool fails, fix the issue or clearly report the failure.
Be concise.${projectContext}
`,
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

      if (DANGEROUS_TOOLS.has(toolName)) {
        const approved = await onConfirmTool(toolName, call.args);
        if (!approved) {
          toolOutputs.push({
            functionResponse: {
              name: toolName,
              response: { result: "User denied permission to run this tool." },
            },
          });
          continue;
        }
      }
      const argPreview = Object.values(call.args ?? {})[0] ?? "";
      onToolStart(argPreview ? `${toolName}(${argPreview})` : toolName);

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
