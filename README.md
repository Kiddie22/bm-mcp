# NestJS Banking MCP Server

A Model Context Protocol (MCP) server that provides banking functionality through a NestJS backend API with personal access token authentication.

## Features

- **Secure Authentication**: Personal access tokens ensure users can only access their own accounts
- **Account Management**: View balances and transfer funds between AUD and USD accounts
- **FX Rate Management**: Real-time exchange rate tracking and conditional transfers
- **Agentic Pre-condition Checking**: Automatic validation of transfer eligibility
- **User Elicitation**: Interactive prompts for missing information
- **Complete Data Privacy**: All user data requires authentication - nothing is publicly accessible

## Security Model

This banking system implements a secure authentication model where:

- Each user has a unique personal access token
- Users can only view and modify their own accounts
- All user data requires authentication - no public access
- Only exchange rates are publicly accessible
- Access token is configured in environment variables
- Backend automatically identifies users by token

## Available Users

The system comes with two demo users with hard-coded access tokens:

- **Alice** - Access Token: `alice_token_12345`
- **Bob** - Access Token: `bob_token_67890`

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
BASE_URL=http://localhost:3000
ACCESS_TOKEN=alice_token_12345
```

To switch between users, simply change the `ACCESS_TOKEN` value in your `.env` file.

## API Endpoints

### Public Endpoints (No Authentication Required)

- `GET /fx` - Get current exchange rate

### Authenticated Endpoints (Require Bearer Token)

- `GET /me` - Get your own account information
- `POST /transfer` - Transfer funds between your accounts

## MCP Tools

### Public Tools

- `get-fx-rate` - Get current exchange rate
- `get-access-token-info` - Get information about the current access token

### Authenticated Tools

- `get-my-balance` - View your own account balances
- `check-transfer-eligibility` - Verify transfer conditions
- `transfer-funds` - Transfer funds between your accounts

## Usage Example

1. **Check your balance**:

   ```
   Use tool: get-my-balance
   ```

2. **Transfer funds**:

   ```
   Use tool: transfer-funds with amount: 100, fromCurrency: "AUD", toCurrency: "USD"
   ```

3. **Get token information**:
   ```
   Use tool: get-access-token-info
   ```

## Setup

1. Install dependencies:

   ```bash
   npm install
   cd server && npm install
   ```

2. Create `.env` file with your configuration:

   ```bash
   cp .env.example .env
   # Edit .env with your preferred access token
   ```

3. Start the NestJS server:

   ```bash
   cd server
   npm run start:dev
   ```

4. Start the MCP server:
   ```bash
   npm start
   ```

## Environment Variables

- `BASE_URL` - NestJS API base URL (default: http://localhost:3000)
- `ACCESS_TOKEN` - Your access token (default: alice_token_12345)

## Switching Between Users

To switch between users, simply update your `.env` file:

```env
# To use Alice's account
ACCESS_TOKEN=alice_token_12345

# To use Bob's account
ACCESS_TOKEN=bob_token_67890
```

Then restart the MCP server for the changes to take effect.

## Security Notes

- This is a mock system using hard-coded access tokens for demonstration
- Access token is configured in environment variables for security
- No token input required in tools - authentication is automatic
- Backend automatically identifies users by matching tokens
- In production, implement proper token generation, storage, and expiration
- Consider adding rate limiting and additional security measures
- All user data is completely private and requires authentication
