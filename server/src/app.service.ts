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
}

// In-memory storage
const users: User[] = [
  {
    id: '1',
    name: 'Alice',
    accounts: [
      { currency: 'AUD', balance: 1000 },
      { currency: 'USD', balance: 500 },
    ],
  },
  {
    id: '2',
    name: 'Bob',
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

  // Get all users
  getUsers(): User[] {
    return users;
  }

  // Get user by ID
  getUserById(id: string): User | undefined {
    return users.find(u => u.id === id);
  }

  // Get FX rate
  getFxRate(): number {
    return fxRate;
  }

  // Update FX rate
  setFxRate(newRate: number): void {
    fxRate = newRate;
  }

  // Transfer funds between accounts
  transferFunds(userId: string, from: 'AUD' | 'USD', to: 'AUD' | 'USD', amount: number) {
    if (from === to) {
      return { success: false, message: 'Source and target accounts must be different.' };
    }
    const user = users.find(u => u.id === userId);
    if (!user) {
      return { success: false, message: 'User not found.' };
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
}
