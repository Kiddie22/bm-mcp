import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import { apiCall } from "./helper.js";

// Load environment variables
dotenv.config();

const NEST_API_URL = process.env.BASE_URL;

// Create MCP server
const server = new McpServer({
  name: "nest-banking-mcp",
  version: "1.0.0"
});

// Resource: User Accounts
server.registerResource(
  "users",
  "bank://users",
  {
    title: "User Accounts",
    description: "List of all users and their account balances",
    mimeType: "application/json"
  },
  async (uri) => {
    const users = await apiCall('/users');
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(users, null, 2),
        mimeType: "application/json"
      }]
    };
  }
);

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

// Tool: Get User Balance
server.registerTool(
  "get-user-balance",
  {
    title: "Get User Balance",
    description: "Get account balances for a specific user",
    inputSchema: {
      userId: z.string().optional(),
      userName: z.string().optional()
    }
  },
  async ({ userId, userName }) => {
    try {
      // If no userId provided, try to find by name or list all users
      if (!userId && !userName) {
        const users = await apiCall('/users');
        return {
          content: [{
            type: "text",
            text: "Please specify a user. Available users:\n" + 
                  users.map((u: any) => `- ${u.name} (ID: ${u.id})`).join("\n")
          }]
        };
      }
      
      if (!userId && userName) {
        // Find user by name
        const users = await apiCall('/users');
        const user = users.find((u: any) => 
          u.name.toLowerCase() === userName.toLowerCase()
        );
        
        if (!user) {
          return {
            content: [{
              type: "text",
              text: `User "${userName}" not found. Available users:\n` +
                    users.map((u: any) => `- ${u.name} (ID: ${u.id})`).join("\n")
            }]
          };
        }
        
        userId = user.id;
      }
      
      const user = await apiCall(`/users/${userId}`);
      
      if (!user) {
        return {
          content: [{
            type: "text",
            text: "User not found"
          }]
        };
      }
      
      const balanceText = user.accounts
        .map((acc: any) => `${acc.currency}: ${acc.balance}`)
        .join("\n");
      
      return {
        content: [{
          type: "text",
          text: `${user.name}'s Account Balances:\n${balanceText}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fetching user balance: ${error}`
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

// Tool: Check Transfer Eligibility (Agentic pre-condition checking)
server.registerTool(
  "check-transfer-eligibility",
  {
    title: "Check Transfer Eligibility",
    description: "Verify if a transfer can be made based on balance and conditions",
    inputSchema: {
      userId: z.string(),
      fromCurrency: z.enum(["AUD", "USD"]),
      amount: z.number(),
      fxRateCondition: z.object({
        operator: z.enum(["below", "above"]),
        value: z.number()
      }).optional()
    }
  },
  async ({ userId, fromCurrency, amount, fxRateCondition }) => {
    try {
      const user = await apiCall(`/users/${userId}`);
      if (!user) {
        return {
          content: [{
            type: "text",
            text: "User not found"
          }],
          isError: true
        };
      }
      
      const fromAccount = user.accounts.find((a: any) => a.currency === fromCurrency);
      if (!fromAccount) {
        return {
          content: [{
            type: "text",
            text: `User does not have a ${fromCurrency} account`
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

// Tool: Transfer Funds with Elicitation
server.registerTool(
  "transfer-funds",
  {
    title: "Transfer Funds",
    description: "Transfer funds between accounts with optional FX rate condition",
    inputSchema: {
      userId: z.string().optional(),
      userName: z.string().optional(),
      amount: z.number(),
      fromCurrency: z.enum(["AUD", "USD"]),
      toCurrency: z.enum(["AUD", "USD"]).optional(),
      fxRateCondition: z.object({
        operator: z.enum(["below", "above"]),
        value: z.number()
      }).optional()
    }
  },
  async ({ userId, userName, amount, fromCurrency, toCurrency, fxRateCondition }) => {
    try {
      // Step 1: Identify user (with elicitation if needed)
      if (!userId && !userName) {
        const users = await apiCall('/users');
        
        const result = await server.server.elicitInput({
          message: "Please select the user for this transfer:",
          requestedSchema: {
            type: "object",
            properties: {
              userId: {
                type: "string",
                title: "User",
                enum: users.map((u: any) => u.id),
                enumNames: users.map((u: any) => `${u.name} (ID: ${u.id})`)
              }
            },
            required: ["userId"]
          }
        });
        
        if (result.action !== "accept" || !result.content?.userId) {
          return {
            content: [{
              type: "text",
              text: "Transfer cancelled - no user selected"
            }]
          };
        }
        
        userId = result.content.userId as string;
      } else if (!userId && userName) {
        const users = await apiCall('/users');
        const user = users.find((u: any) => 
          u.name.toLowerCase() === userName.toLowerCase()
        );
        
        if (!user) {
          return {
            content: [{
              type: "text",
              text: `User "${userName}" not found`
            }],
            isError: true
          };
        }
        
        userId = user.id;
      }
      
      // Step 2: Get user details and verify source account
      const user = await apiCall(`/users/${userId}`);
      const fromAccount = user.accounts.find((a: any) => a.currency === fromCurrency);
      
      if (!fromAccount) {
        return {
          content: [{
            type: "text",
            text: `User ${user.name} does not have a ${fromCurrency} account`
          }],
          isError: true
        };
      }
      
      // Step 3: Check balance (Agentic pre-condition)
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
      
      // Step 4: Handle missing target currency (Elicitation)
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
      
      // Step 5: Check FX rate condition if specified (Agentic pre-condition)
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
      
      // Step 6: Execute transfer
      const transferResult = await apiCall('/transfer', {
        method: 'POST',
        body: JSON.stringify({
          userId,
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

// Prompt: Transfer Assistant
server.registerPrompt(
  "transfer-assistant",
  {
    title: "Transfer Assistant",
    description: "Helps guide users through the fund transfer process",
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
        
        Help them complete their transfer by:
        1. Identifying the user (by name or ID)
        2. Checking their account balances first
        3. Verifying exchange rates if transferring between currencies
        4. Ensuring all preconditions are met (sufficient balance, valid accounts)
        5. Checking FX rate conditions if specified
        6. Guiding them through any missing information
        7. Executing the transfer when all conditions are satisfied
        
        Always be proactive in checking preconditions. The system will automatically 
        prompt for missing information through elicitation.
        
        Available users in the system: Alice (ID: 1) and Bob (ID: 2).
        Each user has both AUD and USD accounts.`
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
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});