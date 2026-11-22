export interface BankAccount {
  id: string;
  name: string;
  initialBalance: number;
  createdAt: string;
}

export interface TicketEntry {
  id: string;
  date: string;
  customerName: string;
  journey: string;
  ticketCost: number;
  serviceCharge: number; // Profit
  customerPaid: number;
  paidFromAccountId: string; // 'cash' | 'online' | bank.id
  receivedIn: string; // 'cash' | 'udhar' | bank.id
}

export interface UdharEntry {
  id: string;
  date: string;
  personName: string;
  amount: number;
  note: string;
  status: 'pending' | 'settled';
  linkedTicketId?: string;
  settledDate?: string;
  settledAccountId?: string; // 'cash' | bank.id
}

export interface ExpenseEntry {
  id: string;
  date: string;
  category: string;
  paidTo: string;
  amount: number;
  paidFromAccountId: string; // 'cash' | 'online' | bank.id
}

export interface CashAddition {
  id: string;
  date: string;
  amount: number;
  note: string;
}

export interface LedgerDB {
  banks: BankAccount[];
  tickets: TicketEntry[];
  udhar: UdharEntry[];
  expenses: ExpenseEntry[];
  cashAdditions: CashAddition[];
  allocatedBudget: number;
}

export type AppView =
  | 'home-view'
  | 'banks-view'
  | 'add-cash-view'
  | 'wallet-statement-view'
  | 'customer-profiles-view'
  | 'entries-manager-view'
  | 'budget-calculator-view'
  | 'reports-view'
  | 'pdf-generator-view'
  | 'system-view';

export type DetailModalType =
  | 'banks'
  | 'profit'
  | 'tickets'
  | 'udhar'
  | 'expenses'
  | 'cash'
  | null;
