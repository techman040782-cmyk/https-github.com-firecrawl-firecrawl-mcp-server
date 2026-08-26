#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const DEFAULT_MODEL = "sonar-pro";

const apiKey = process.env.PERPLEXITY_API_KEY;
if (!apiKey) {
  console.error("Error: PERPLEXITY_API_KEY environment variable is required.");
  process.exit(1);
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  choices: { message: { content: string } }[];
  citations?: string[];
}

async function callPerplexity(
  messages: ChatMessage[],
  model: string
): Promise<{ content: string; citations: string[] }> {
  const response = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Perplexity API request failed: ${response.status} ${response.statusText} ${body}`
    );
  }

  const data = (await response.json()) as PerplexityResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  const citations = data.citations ?? [];
  return { content, citations };
}

function formatResult(content: string, citations: string[]): string {
  if (citations.length === 0) return content;
  const list = citations.map((url, i) => `[${i + 1}] ${url}`).join("\n");
  return `${content}\n\nSources:\n${list}`;
}

const server = new McpServer({
  name: "perplexity-mcp-server",
  version: "0.1.0",
});

server.registerTool(
  "perplexity_search",
  {
    title: "Perplexity Search",
    description:
      "Run a single web search query through Perplexity's Sonar API and return an answer grounded in live web results, with citations.",
    inputSchema: {
      query: z.string().describe("The search query or question."),
      model: z
        .string()
        .optional()
        .describe(
          `Perplexity model to use (default: "${DEFAULT_MODEL}"). E.g. "sonar", "sonar-pro", "sonar-reasoning".`
        ),
    },
  },
  async ({ query, model }) => {
    try {
      const { content, citations } = await callPerplexity(
        [{ role: "user", content: query }],
        model ?? DEFAULT_MODEL
      );
      return {
        content: [{ type: "text", text: formatResult(content, citations) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error calling Perplexity API: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

server.registerTool(
  "perplexity_ask",
  {
    title: "Perplexity Ask",
    description:
      "Continue a multi-turn conversation through Perplexity's Sonar API. Accepts the full message history (system/user/assistant turns) and returns the next assistant reply, grounded in live web results with citations.",
    inputSchema: {
      messages: z
        .array(
          z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string(),
          })
        )
        .min(1)
        .describe("The conversation so far, oldest message first."),
      model: z
        .string()
        .optional()
        .describe(
          `Perplexity model to use (default: "${DEFAULT_MODEL}"). E.g. "sonar", "sonar-pro", "sonar-reasoning".`
        ),
    },
  },
  async ({ messages, model }) => {
    try {
      const { content, citations } = await callPerplexity(
        messages as ChatMessage[],
        model ?? DEFAULT_MODEL
      );
      return {
        content: [{ type: "text", text: formatResult(content, citations) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error calling Perplexity API: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Perplexity MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error running Perplexity MCP server:", error);
  process.exit(1);
});
