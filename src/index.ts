import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import { apiCall, authenticatedApiCall } from "./helper.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the correct location
// Try to load from the same directory as the source file first, then from build directory
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, '..', '.env') });

export const NEST_API_URL = process.env.BASE_URL;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!NEST_API_URL) {
  throw new Error("BASE_URL is not set");
}

if (!ACCESS_TOKEN) {
  throw new Error("ACCESS_TOKEN is not set");
}

// Create MCP server
const server = new McpServer({
  name: "nest-banking-mcp",
  version: "1.0.0"
});

// Resource: FX Rate
server.registerResource(
  "fx-rate",
  "bank://fx-rate",
  {
    title: "Exchange Rate",
    description: "Current AUD to USD exchange rate",
    mimeType: "application/json"
  },
  async (uri) => {
    const fx = await apiCall('/fx');
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(fx, null, 2),
        mimeType: "application/json"
      }]
    };
  }
);

// Tool: Get My Balance (authenticated - user's own account)
server.registerTool(
  "get-my-balance",
  {
    title: "Get My Balance",
    description: "Get your own account balances (requires authentication)",
    inputSchema: {}
  },
  async () => {
    try {
      // Get user's own data using authentication
      const user = await authenticatedApiCall('/me', ACCESS_TOKEN);
      
      if (!user || user.error) {
        return {
          content: [{
            type: "text",
            text: user?.error || "Authentication failed"
          }],
          isError: true
        };
      }
      
      const balanceText = user.accounts
        .map((acc: any) => `${acc.currency}: ${acc.balance}`)
        .join("\n");
      
      return {
        content: [{
          type: "text",
          text: `Your Account Balances:\n${balanceText}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fetching your balance: ${error}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Get FX Rate
server.registerTool(
  "get-fx-rate",
  {
    title: "Get Exchange Rate",
    description: "Get current AUD to USD exchange rate",
    inputSchema: {}
  },
  async () => {
    try {
      const fx = await apiCall('/fx');
      return {
        content: [{
          type: "text",
          text: `Current exchange rate: 1 AUD = ${fx.fxRate} USD`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fetching FX rate: ${error}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Check Transfer Eligibility (authenticated)
server.registerTool(
  "check-transfer-eligibility",
  {
    title: "Check Transfer Eligibility",
    description: "Verify if a transfer can be made based on your balance and conditions",
    inputSchema: {
      fromCurrency: z.enum(["AUD", "USD"]),
      amount: z.number(),
      fxRateCondition: z.object({
        operator: z.enum(["below", "above"]),
        value: z.number()
      }).optional()
    }
  },
  async ({ fromCurrency, amount, fxRateCondition }) => {
    try {
      // Get user's own data using authentication
      const user = await authenticatedApiCall('/me', ACCESS_TOKEN);
      
      if (!user || user.error) {
        return {
          content: [{
            type: "text",
            text: user?.error || "Authentication failed"
          }],
          isError: true
        };
      }
      
      const fromAccount = user.accounts.find((a: any) => a.currency === fromCurrency);
      if (!fromAccount) {
        return {
          content: [{
            type: "text",
            text: `You do not have a ${fromCurrency} account`
          }],
          isError: true
        };
      }
      
      // Check balance
      if (fromAccount.balance < amount) {
        return {
          content: [{
            type: "text",
            text: `Insufficient balance. Current balance: ${fromAccount.balance} ${fromCurrency}, Requested: ${amount} ${fromCurrency}`
          }]
        };
      }
      
      // Check FX rate condition if specified
      if (fxRateCondition) {
        const fx = await apiCall('/fx');
        const currentRate = fx.fxRate;
        const conditionMet = fxRateCondition.operator === "below" 
          ? currentRate < fxRateCondition.value
          : currentRate > fxRateCondition.value;
        
        if (!conditionMet) {
          return {
            content: [{
              type: "text",
              text: `FX rate condition not met. Current rate: ${currentRate}, Condition: rate must be ${fxRateCondition.operator} ${fxRateCondition.value}`
            }]
          };
        }
      }
      
      return {
        content: [{
          type: "text",
          text: `Transfer eligible. Current balance: ${fromAccount.balance} ${fromCurrency}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error checking eligibility: ${error}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Transfer Funds (authenticated)
server.registerTool(
  "transfer-funds",
  {
    title: "Transfer Funds",
    description: "Transfer funds between your accounts with mandatory FX rate condition",
    inputSchema: {
      amount: z.number(),
      fromCurrency: z.enum(["AUD", "USD"]),
      toCurrency: z.enum(["AUD", "USD"]).optional(),
      fxRateCondition: z.object({
        operator: z.enum(["below", "above"]),
        value: z.number()
      })
    }
  },
  async ({ amount, fromCurrency, toCurrency, fxRateCondition }) => {
    try {
      // Get user's own data using authentication
      const user = await authenticatedApiCall('/me', ACCESS_TOKEN);
      
      if (!user || user.error) {
        return {
          content: [{
            type: "text",
            text: user?.error || "Authentication failed"
          }],
          isError: true
        };
      }
      
      const fromAccount = user.accounts.find((a: any) => a.currency === fromCurrency);
      
      if (!fromAccount) {
        return {
          content: [{
            type: "text",
            text: `You do not have a ${fromCurrency} account`
          }],
          isError: true
        };
      }
      
      // Check balance
      if (fromAccount.balance < amount) {
        return {
          content: [{
            type: "text",
            text: `Transfer failed: Insufficient balance\n` +
                  `Current balance: ${fromAccount.balance} ${fromCurrency}\n` +
                  `Requested amount: ${amount} ${fromCurrency}`
          }],
          isError: true
        };
      }
      
      // Handle missing target currency (Elicitation)
      if (!toCurrency) {
        const availableCurrencies = user.accounts
          .filter((a: any) => a.currency !== fromCurrency)
          .map((a: any) => a.currency);
        
        if (availableCurrencies.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No other currency accounts available for transfer"
            }],
            isError: true
          };
        }
        
        const result = await server.server.elicitInput({
          message: `Transfer ${amount} ${fromCurrency} to which currency account?`,
          requestedSchema: {
            type: "object",
            properties: {
              toCurrency: {
                type: "string",
                title: "Target Currency",
                enum: availableCurrencies,
                enumNames: availableCurrencies.map((c: string) => {
                  const acc = user.accounts.find((a: any) => a.currency === c);
                  return `${c} (Balance: ${acc.balance})`;
                })
              }
            },
            required: ["toCurrency"]
          }
        });
        
        if (result.action !== "accept" || !result.content?.toCurrency) {
          return {
            content: [{
              type: "text",
              text: "Transfer cancelled - no target currency selected"
            }]
          };
        }
        
        toCurrency = result.content.toCurrency as "AUD" | "USD";
      }
      
      // Check FX rate condition if specified
      if (fxRateCondition && fromCurrency !== toCurrency) {
        const fx = await apiCall('/fx');
        const currentRate = fx.fxRate;
        const conditionMet = fxRateCondition.operator === "below" 
          ? currentRate < fxRateCondition.value
          : currentRate > fxRateCondition.value;
        
        if (!conditionMet) {
          return {
            content: [{
              type: "text",
              text: `Transfer not executed: FX rate condition not met\n` +
                    `Current AUD to USD rate: ${currentRate}\n` +
                    `Condition: Rate must be ${fxRateCondition.operator} ${fxRateCondition.value}`
            }]
          };
        }
      }
      
      // Execute transfer using authentication
      const transferResult = await authenticatedApiCall('/transfer', ACCESS_TOKEN, {
        method: 'POST',
        body: JSON.stringify({
          from: fromCurrency,
          to: toCurrency,
          amount
        })
      });
      
      if (!transferResult.success) {
        return {
          content: [{
            type: "text",
            text: `Transfer failed: ${transferResult.message}`
          }],
          isError: true
        };
      }
      
      // Get current FX rate for display
      const fx = await apiCall('/fx');
      
      return {
        content: [{
          type: "text",
          text: `Transfer completed successfully!\n\n` +
                `Transaction Details:\n` +
                `- User: ${user.name}\n` +
                `- ${transferResult.message}\n` +
                `- Exchange Rate: ${fromCurrency !== toCurrency ? fx.fxRate : 'N/A'}\n\n` +
                `New Balances:\n` +
                transferResult.balances.map((acc: any) => 
                  `- ${acc.currency}: ${acc.balance}`
                ).join('\n')
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error executing transfer: ${error}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Get Access Token Info
server.registerTool(
  "get-access-token-info",
  {
    title: "Get Access Token Info",
    description: "Get information about the current access token",
    inputSchema: {}
  },
  async () => {
    try {
      return {
        content: [{
          type: "text",
          text: `Current Access Token: ${ACCESS_TOKEN}\n\n` +
                `This token is configured in your .env file and is used automatically ` +
                `for all authenticated operations.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error getting access token info: ${error}`
        }],
        isError: true
      };
    }
  }
);

// Prompt: Transfer Assistant
server.registerPrompt(
  "transfer-assistant",
  {
    title: "Transfer Assistant",
    description: "Helps guide users through the authenticated fund transfer process",
    argsSchema: {
      userRequest: z.string()
    }
  },
  ({ userRequest }) => ({
    messages: [{
      role: "assistant",
      content: {
        type: "text",
        text: `You are a helpful banking assistant integrated with a NestJS banking API. 
        The user wants to: "${userRequest}"
        
        IMPORTANT: This system uses personal access tokens for security. All user data 
        requires authentication - no user information is publicly accessible.
        
        Access token is configured in environment variables and is used automatically.
        The backend automatically identifies the user based on the token.
        
        Help them complete their transfer by:
        1. Checking their account balances using authenticated endpoints
        2. Verifying exchange rates if transferring between currencies
        3. Ensuring all preconditions are met (sufficient balance, valid accounts)
        4. Checking FX rate conditions if specified
        5. Guiding them through any missing information
        6. Executing the transfer when all conditions are satisfied
        
        Use "get-my-balance" and "transfer-funds" tools directly - no token input needed.`
      }
    }]
  })
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NestJS Banking MCP server running on stdio transport");
  console.error(`Connected to NestJS API at: ${NEST_API_URL}`);
  console.error(`Using access token: ${ACCESS_TOKEN}`);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});