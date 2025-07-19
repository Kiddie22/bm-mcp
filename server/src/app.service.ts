import { Injectable } from '@nestjs/common';

// User and Account Models
interface Account {
  currency: 'AUD' | 'USD';
  balance: number;
}

interface User {
  id: string;
  name: string;
  accounts: Account[];
  accessToken: string; // Personal access token for each user
}

// Public user interface (without access token)
interface PublicUser {
  id: string;
  name: string;
  accounts: Account[];
}

// In-memory storage
const users: User[] = [
  {
    id: '1',
    name: 'Alice',
    accessToken: 'alice_token_12345',
    accounts: [
      { currency: 'AUD', balance: 1000 },
      { currency: 'USD', balance: 500 },
    ],
  },
  {
    id: '2',
    name: 'Bob',
    accessToken: 'bob_token_67890',
    accounts: [
      { currency: 'AUD', balance: 2000 },
      { currency: 'USD', balance: 1000 },
    ],
  },
];

// FX Rate (AUD to USD)
let fxRate = 0.68;

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  // Get user by token (authenticated endpoint)
  getUserByToken(token: string): User | undefined {
    return users.find(u => u.accessToken === token);
  }

  // Get all users
  getAllUsers(): PublicUser[] | undefined {
    return users
  }

  // Get user's own data (authenticated endpoint)
  getMyUser(token: string): PublicUser | undefined {
    const user = users.find(u => u.accessToken === token);
    if (!user) return undefined;
    
    return {
      id: user.id,
      name: user.name,
      accounts: user.accounts
    };
  }

  // Get FX rate
  getFxRate(): number {
    return fxRate;
  }

  // Update FX rate
  setFxRate(newRate: number): void {
    fxRate = newRate;
  }

  // Transfer funds between accounts (authenticated endpoint)
  transferFunds(token: string, from: 'AUD' | 'USD', to: 'AUD' | 'USD', amount: number) {
    // Authenticate user
    const user = users.find(u => u.accessToken === token);
    if (!user) {
      return { success: false, message: 'Invalid access token.' };
    }

    if (from === to) {
      return { success: false, message: 'Source and target accounts must be different.' };
    }

    const fromAccount = user.accounts.find(a => a.currency === from);
    const toAccount = user.accounts.find(a => a.currency === to);
    
    if (!fromAccount || !toAccount) {
      return { success: false, message: 'Account not found.' };
    }
    
    if (fromAccount.balance < amount) {
      return { success: false, message: 'Insufficient funds.' };
    }
    
    // Calculate amount to credit (apply FX if needed)
    let creditedAmount = amount;
    if (from === 'AUD' && to === 'USD') {
      creditedAmount = amount * fxRate;
    } else if (from === 'USD' && to === 'AUD') {
      creditedAmount = amount / fxRate;
    }
    
    fromAccount.balance -= amount;
    toAccount.balance += creditedAmount;
    
    return {
      success: true,
      message: `Transferred ${amount} ${from} to ${creditedAmount} ${to}`,
      balances: user.accounts,
    };
  }

  // Validate user exists (for internal use)
  userExists(userId: string): boolean {
    return users.some(u => u.id === userId);
  }
}
