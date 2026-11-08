import { Type, type Tool } from "@google/genai";
import path from "node:path";
import fs from "fs/promises";
import { promisify } from "node:util";
import { exec } from "node:child_process";

const execAsync = promisify(exec);
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
      {
        name: "list_files",
        description: "List files and folder inside a directory",
        parameters: {
          type: Type.OBJECT,
          properties: {
            dirPath: {
              type: Type.STRING,
              description: "Directory path to list (use . for current folder)",
            },
          },
          required: ["dirPath"],
        },
      },
      {
        name: "read_file",
        description: "Read the text contents of a file",
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: {
              type: Type.STRING,
              description: "Relative path to the file",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "edit_file",
        description:
          "Edit a file by replacing exact oldText with newText. Pass empty old text to create a new file",
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: {
              type: Type.STRING,
              description: "Relative file to the path",
            },
            oldText: {
              type: Type.STRING,
              description:
                "Exact existing line to replace (leave empty '' to create a new file)",
            },
            newText: {
              type: Type.STRING,
              description: "New lines to insert",
            },
          },
          required: ["filePath", "oldText", "newText"],
        },
      },
      {
        name: "run_bash",
        description:
          "Run a shell command in the terminal (e.g. git status, npm test, tsc --noEmit)",
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: {
              type: Type.STRING,
              description: "The bash command to execute",
            },
          },
          required: ["command"],
        },
      },
    ],
  },
];

export const DANGEROUS_TOOLS = new Set(["edit_file", "run_bash"]);
const IGNORED_DIR = new Set(["node_modules", ".git", "dist"]);

export async function executeTool(name: string, args: any): Promise<string> {
  try {
    if (name === "get_system_info") {
      return JSON.stringify({
        cwd: process.cwd(),
        platform: process.platform,
        node: process.version,
      });
    }
    if (name === "list_files") {
      const targetDir = path.resolve(process.cwd(), args.dirPath || ".");
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      const formatted = entries
        .filter((e) => !IGNORED_DIR.has(e.name))
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
      return formatted.length > 0 ? formatted.join("\n") : "(empty directory)";
    }
    if (name === "read_file") {
      const targetFile = path.resolve(process.cwd(), args.filePath);
      return await fs.readFile(targetFile, "utf-8");
    }
    if (name === "edit_file") {
      const targetFile = path.resolve(process.cwd(), args.filePath);
      if (args.oldText === "") {
        await fs.mkdir(path.dirname(targetFile), { recursive: true });
        await fs.writeFile(targetFile, args.newText, "utf-8");
        return `created new file: ${args.filePath}`;
      }
      const content = await fs.readFile(targetFile, "utf-8");
      if (!content.includes(args.oldText)) {
        return `Error: oldText not found in ${args.filePath}. Call read_file first to get the exact lines`;
      }
      const occurrences = content.split(args.oldText).length - 1;
      if (occurrences > 1) {
        return `Error: oldText matched ${occurrences} different places in ${args.filePath}. Include more surrounding lines in oldText so it is unique.`;
      }
      const updated = content.replace(args.oldText, args.newText);
      await fs.writeFile(targetFile, updated, "utf-8");
      return `Successfully updated ${args.filePath}`;
    }
    if (name == "run_bash") {
      const { stdout, stderr } = await execAsync(args.command, {
        cwd: process.cwd(),
        timeout: 90000,
      });
      const output = (stdout + "\n" + stderr).trim();

      if (output.length > 6000) {
        return output.slice(0, 6000) + "\n... (lol i am saving costs sorry.)";
      }
      return output || "(command completed with no output)";
    }
    return `Unknown tool: ${name}`;
  } catch (err: any) {
    const errorOutput = [err.stdout, err.stderr, err.message]
      .filter(Boolean)
      .join("\n")
      .trim();
    return `Tool Error: ${errorOutput.slice(0, 4000)}`;
  }
}
