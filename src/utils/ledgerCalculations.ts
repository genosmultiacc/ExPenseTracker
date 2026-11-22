import { BankAccount, LedgerDB, UdharEntry } from '../types/ledger';

export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const isNeg = safe < 0;
  const formatted = Math.abs(safe).toLocaleString('en-IN', {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${isNeg ? '-' : ''}₹${formatted}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getBankBalance(db: LedgerDB, bankId: string): number {
  const bank = db.banks.find((b) => b.id === bankId);
  if (!bank) return 0;

  let balance = bank.initialBalance || 0;

  for (const t of db.tickets) {
    if (t.paidFromAccountId === bankId) {
      balance -= t.ticketCost;
    }
    if (t.receivedIn === bankId) {
      // Customer Paid already includes Service Charge (Profit); do not add Profit again
      balance += t.customerPaid;
    }
  }

  for (const u of db.udhar) {
    if (u.status === 'settled' && u.settledAccountId === bankId) {
      balance += u.amount;
    }
  }

  for (const e of db.expenses) {
    if (e.paidFromAccountId === bankId) {
      balance -= e.amount;
    }
  }

  return balance;
}

export function getCombinedBankBalance(db: LedgerDB): number {
  return db.banks.reduce((sum, bank) => sum + getBankBalance(db, bank.id), 0);
}

export function getCashAddedTotal(db: LedgerDB): number {
  return db.cashAdditions.reduce((sum, c) => sum + c.amount, 0);
}

export function getCashInflowsTotal(db: LedgerDB): number {
  let total = getCashAddedTotal(db);
  for (const t of db.tickets) {
    if (t.receivedIn === 'cash') {
      total += t.customerPaid;
    }
  }
  for (const u of db.udhar) {
    if (u.status === 'settled' && u.settledAccountId === 'cash') {
      total += u.amount;
    }
  }
  return total;
}

export function getCashOutflowsTotal(db: LedgerDB): number {
  let total = 0;
  for (const t of db.tickets) {
    if (t.paidFromAccountId === 'cash') {
      total += t.ticketCost;
    }
  }
  for (const e of db.expenses) {
    if (e.paidFromAccountId === 'cash') {
      total += e.amount;
    }
  }
  return total;
}

export function getCashWalletBalance(db: LedgerDB): number {
  return getCashInflowsTotal(db) - getCashOutflowsTotal(db);
}

export function getMonthlyProfit(db: LedgerDB, dateStr: string): number {
  const monthPrefix = dateStr.slice(0, 7);
  return db.tickets
    .filter((t) => t.date.startsWith(monthPrefix))
    .reduce((sum, t) => sum + t.serviceCharge, 0);
}

export function getMonthlyTickets(db: LedgerDB, dateStr: string) {
  const monthPrefix = dateStr.slice(0, 7);
  return db.tickets.filter((t) => t.date.startsWith(monthPrefix));
}

export function getTotalProfit(db: LedgerDB): number {
  return db.tickets.reduce((sum, t) => sum + t.serviceCharge, 0);
}

export function getTotalTicketCost(db: LedgerDB): number {
  return db.tickets.reduce((sum, t) => sum + t.ticketCost, 0);
}

export function getTotalCustomerPaid(db: LedgerDB): number {
  return db.tickets.reduce((sum, t) => sum + t.customerPaid, 0);
}

export function getPendingUdhars(db: LedgerDB): UdharEntry[] {
  return db.udhar.filter((u) => u.status === 'pending');
}

export function getTotalPendingUdhar(db: LedgerDB): number {
  return getPendingUdhars(db).reduce((sum, u) => sum + u.amount, 0);
}

export function getTotalExpenses(db: LedgerDB): number {
  return db.expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getAccountLabel(banks: BankAccount[], accountId: string): string {
  if (accountId === 'cash') return 'Cash Wallet';
  if (accountId === 'online') return 'Online / Other';
  if (accountId === 'udhar') return 'Udhar (Pending)';
  const found = banks.find((b) => b.id === accountId);
  return found ? found.name : 'Deleted Account';
}

export function getCustomerSuggestions(db: LedgerDB): string[] {
  const map = new Map<string, { name: string; count: number }>();

  const track = (raw?: string) => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { name: trimmed, count: 1 });
    }
  };

  db.tickets.forEach((t) => track(t.customerName));
  db.udhar.forEach((u) => track(u.personName));
  db.expenses.forEach((e) => track(e.paidTo));

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((item) => item.name);
}

export function normalizeLedgerDB(raw: unknown): LedgerDB {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<LedgerDB>;
  return {
    banks: Array.isArray(obj.banks)
      ? obj.banks.map((b) => ({
          id: String(b.id || `bank_${Date.now()}_${Math.random()}`),
          name: String(b.name || 'Bank Account'),
          initialBalance: Number(b.initialBalance) || 0,
          createdAt: String(b.createdAt || getTodayISO()),
        }))
      : [],
    tickets: Array.isArray(obj.tickets)
      ? obj.tickets.map((t) => ({
          id: String(t.id || `tkt_${Date.now()}_${Math.random()}`),
          date: String(t.date || getTodayISO()),
          customerName: String(t.customerName || ''),
          journey: String(t.journey || ''),
          ticketCost: Number(t.ticketCost) || 0,
          serviceCharge: Number(t.serviceCharge) || 0,
          customerPaid: Number(t.customerPaid) || 0,
          paidFromAccountId: String(t.paidFromAccountId || 'cash'),
          receivedIn: String(t.receivedIn || 'cash'),
        }))
      : [],
    udhar: Array.isArray(obj.udhar)
      ? obj.udhar.map((u) => ({
          id: String(u.id || `udh_${Date.now()}_${Math.random()}`),
          date: String(u.date || getTodayISO()),
          personName: String(u.personName || ''),
          amount: Number(u.amount) || 0,
          note: String(u.note || ''),
          status: u.status === 'settled' ? 'settled' : 'pending',
          linkedTicketId: u.linkedTicketId ? String(u.linkedTicketId) : undefined,
          settledDate: u.settledDate ? String(u.settledDate) : undefined,
          settledAccountId: u.settledAccountId ? String(u.settledAccountId) : undefined,
        }))
      : [],
    expenses: Array.isArray(obj.expenses)
      ? obj.expenses.map((e) => ({
          id: String(e.id || `exp_${Date.now()}_${Math.random()}`),
          date: String(e.date || getTodayISO()),
          category: String(e.category || ''),
          paidTo: String(e.paidTo || ''),
          amount: Number(e.amount) || 0,
          paidFromAccountId: String(e.paidFromAccountId || 'cash'),
        }))
      : [],
    cashAdditions: Array.isArray(obj.cashAdditions)
      ? obj.cashAdditions.map((c) => ({
          id: String(c.id || `cash_${Date.now()}_${Math.random()}`),
          date: String(c.date || getTodayISO()),
          amount: Number(c.amount) || 0,
          note: String(c.note || ''),
        }))
      : [],
    allocatedBudget: Number(obj.allocatedBudget) || 0,
  };
}
