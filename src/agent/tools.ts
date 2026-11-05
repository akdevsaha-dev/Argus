import { Type, type Tool } from "@google/genai";

export const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "get_system_info",
        description:
          "Get the current working directory, OS platforma and Node version ",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
    ],
  },
];

export async function executeTool(name: string, args: any): Promise<string> {
  if (name == "get_system_info") {
    return JSON.stringify({
      cwd: process.cwd(),
      platform: process.platform,
      node: process.version,
    });
  }
  return `Unknown tool: ${name}`;
}
