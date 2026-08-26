# perplexity-mcp-server

An [MCP](https://modelcontextprotocol.io) server that exposes [Perplexity](https://www.perplexity.ai)'s Sonar API as tools, so any MCP client (Claude Desktop, Claude Code, etc.) can search the live web and hold grounded, citation-backed conversations.

## Tools

- **`perplexity_search`** — run a single search query, get back an answer with citations.
- **`perplexity_ask`** — send a full multi-turn conversation (`system`/`user`/`assistant` messages) and get the next grounded reply.

Both tools accept an optional `model` parameter (default `sonar-pro`; also supports `sonar`, `sonar-reasoning`, etc. — see the [Perplexity model list](https://docs.perplexity.ai/getting-started/models)).

## Setup

1. Get a Perplexity API key from https://www.perplexity.ai/settings/api.
2. Install dependencies and build:

   ```bash
   npm install
   npm run build
   ```

3. Add the server to your MCP client config, pointing at the built entrypoint:

   ```json
   {
     "mcpServers": {
       "perplexity": {
         "command": "node",
         "args": ["/absolute/path/to/perplexity-mcp-server/build/index.js"],
         "env": {
           "PERPLEXITY_API_KEY": "YOUR_API_KEY_HERE"
         },
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

## Development

```bash
npm run watch      # rebuild on change
npm run inspector   # open the MCP inspector against the built server
```

The server communicates over stdio, per the MCP spec, and requires `PERPLEXITY_API_KEY` to be set in its environment.
