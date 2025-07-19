# Banking MCP Server

This project implements a Model Context Protocol (MCP) server that provides banking tools for AI assistants like Claude Desktop.

## Project Structure

- `server/` - NestJS server with mock banking APIs
- `src/index.ts` - MCP server that exposes banking tools

## Setup

### 1. Start the Banking API Server

```bash
cd server
npm run start
```

The banking API will be available at `http://localhost:3000`

### 2. Start the MCP Server

In a new terminal:

```bash
npm run start:mcp
```

## Available Tools

The MCP server provides the following tools:

1. **get_users** - Get all users and their account balances
2. **get_user_by_id** - Get a specific user by ID
3. **get_fx_rate** - Get current FX rate (AUD to USD)
4. **transfer_funds** - Transfer funds between AUD and USD accounts

## Usage with Claude Desktop

1. Add the mcpServer to your Claude Desktop configuration directory
2. Restart Claude Desktop
3. The banking tools will be available in your conversations

## Sample Banking Scenario

You can test the MCP server with prompts like:

- "Transfer 800 AUD from my AUD account if FX below 0.7"
- "What's the current FX rate?"
- "Show me user 1's account balances"
- "Update the FX rate to 0.65"

## API Endpoints

The underlying banking API provides:

- `GET /users` - List all users
- `GET /users/:id` - Get user by ID
- `GET /fx` - Get FX rate
- `POST /transfer` - Transfer funds

## Demo Features

This implementation demonstrates:

1. **Elicitation** - The agent can ask for missing information (e.g., target account)
2. **Agentic Thinking** - Pre-condition checks (FX rate, account balances) before transfers
3. **Tool Routing** - Automatic selection of appropriate tools based on user intent
4. **Reasoning** - Logical decision making based on current state and user requirements
