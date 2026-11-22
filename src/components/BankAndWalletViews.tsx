import React, { useState } from 'react';
import { ArrowLeft, Building2, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { BankAccount, LedgerDB } from '../types/ledger';
import {
  formatINR,
  getAccountLabel,
  getBankBalance,
  getCashAddedTotal,
  getCashInflowsTotal,
  getCashOutflowsTotal,
  getCashWalletBalance,
  getCombinedBankBalance,
} from '../utils/ledgerCalculations';

interface BanksViewProps {
  db: LedgerDB;
  onAddBank: (name: string, initialBalance: number) => void;
  onUpdateBank: (id: string, name: string, initialBalance: number) => void;
  onDeleteBank: (id: string) => void;
  onBackHome: () => void;
}

export const BanksView: React.FC<BanksViewProps> = ({
  db,
  onAddBank,
  onUpdateBank,
  onDeleteBank,
  onBackHome,
}) => {
  const [name, setName] = useState('');
  const [balanceStr, setBalanceStr] = useState('');
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('all');

  const combined = getCombinedBankBalance(db);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const bal = parseFloat(balanceStr) || 0;
    if (editingBank) {
      onUpdateBank(editingBank.id, trimmed, bal);
      setEditingBank(null);
    } else {
      onAddBank(trimmed, bal);
    }
    setName('');
    setBalanceStr('');
  };

  const startEdit = (bank: BankAccount) => {
    setEditingBank(bank);
    setName(bank.name);
    setBalanceStr(String(bank.initialBalance));
  };

  // Build bank transaction ledger
  interface BankTx {
    id: string;
    date: string;
    bankName: string;
    type: 'in' | 'out';
    amount: number;
    desc: string;
  }

  const bankLogs: BankTx[] = [];
  const targetBanks =
    selectedBankId === 'all'
      ? db.banks
      : db.banks.filter((b) => b.id === selectedBankId);
  const targetIds = new Set(targetBanks.map((b) => b.id));

  db.tickets.forEach((t) => {
    if (targetIds.has(t.paidFromAccountId)) {
      bankLogs.push({
        id: `t_out_${t.id}`,
        date: t.date,
        bankName: getAccountLabel(db.banks, t.paidFromAccountId),
        type: 'out',
        amount: t.ticketCost,
        desc: `Ticket Cost · ${t.customerName}${t.journey ? ` (${t.journey})` : ''}`,
      });
    }
    if (targetIds.has(t.receivedIn)) {
      bankLogs.push({
        id: `t_in_${t.id}`,
        date: t.date,
        bankName: getAccountLabel(db.banks, t.receivedIn),
        type: 'in',
        amount: t.customerPaid,
        desc: `Customer Paid · ${t.customerName}${t.journey ? ` (${t.journey})` : ''}`,
      });
    }
  });

  db.udhar.forEach((u) => {
    if (u.status === 'settled' && u.settledAccountId && targetIds.has(u.settledAccountId)) {
      bankLogs.push({
        id: `u_in_${u.id}`,
        date: u.settledDate || u.date,
        bankName: getAccountLabel(db.banks, u.settledAccountId),
        type: 'in',
        amount: u.amount,
        desc: `Udhar Settled · ${u.personName}`,
      });
    }
  });

  db.expenses.forEach((e) => {
    if (targetIds.has(e.paidFromAccountId)) {
      bankLogs.push({
        id: `e_out_${e.id}`,
        date: e.date,
        bankName: getAccountLabel(db.banks, e.paidFromAccountId),
        type: 'out',
        amount: e.amount,
        desc: `Other Expense · ${e.paidTo} (${e.category})`,
      });
    }
  });

  bankLogs.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="text-right">
          <span className="text-xs text-slate-500 dark:text-slate-400">Combined Bank Total</span>
          <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
            {formatINR(combined)}
          </div>
        </div>
      </div>

      {/* Add / Edit Bank Form */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1E3C72] dark:text-blue-400" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              {editingBank ? `Edit Bank: ${editingBank.name}` : 'Add Bank Account'}
            </h2>
          </div>
          {editingBank && (
            <button
              type="button"
              onClick={() => {
                setEditingBank(null);
                setName('');
                setBalanceStr('');
              }}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label
              htmlFor="bankMgrName"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Bank Account Name
            </label>
            <input
              id="bankMgrName"
              type="text"
              required
              placeholder="e.g. SBI, HDFC, ICICI"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="bankMgrInitBal"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Opening Balance (₹)
            </label>
            <input
              id="bankMgrInitBal"
              type="number"
              step="any"
              required
              placeholder="0"
              value={balanceStr}
              onChange={(e) => setBalanceStr(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-[#1E3C72] hover:bg-[#2A5298] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{editingBank ? 'Update Bank' : 'Add Bank Account'}</span>
          </button>
        </form>
      </div>

      {/* Individual Bank Accounts List */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          Added Bank Accounts ({db.banks.length})
        </h3>
        {db.banks.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No bank accounts added yet. Use the form above to add your bank accounts.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {db.banks.map((b) => {
              const bal = getBankBalance(db, b.id);
              return (
                <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {b.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Opening Balance: <span className="font-mono">{formatINR(b.initialBalance)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-sm font-bold ${
                        bal < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {formatINR(bal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      aria-label={`Edit ${b.name}`}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteBank(b.id)}
                      aria-label={`Delete ${b.name}`}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bank Statement Logs */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
            Bank Transaction Logs
          </h3>
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="min-h-[38px] px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Bank Accounts</option>
            {db.banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {bankLogs.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
            No bank transactions recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {bankLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {log.desc}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {log.date} · {log.bankName}
                  </div>
                </div>
                <span
                  className={`font-mono font-bold shrink-0 ${
                    log.type === 'in'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {log.type === 'in' ? '+' : '−'}
                  {formatINR(log.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface AddCashViewProps {
  globalDate: string;
  onAddCash: (amount: number, note: string) => void;
  onBackHome: () => void;
}

export const AddCashView: React.FC<AddCashViewProps> = ({
  globalDate,
  onAddCash,
  onBackHome,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountStr) || 0;
    if (amt <= 0) {
      setErr('Please enter a valid cash amount.');
      return;
    }
    onAddCash(amt, note.trim() || 'Cash Added');
    setAmountStr('');
    setNote('');
    setErr('');
    onBackHome();
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBackHome}
        className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Add Cash to Wallet ({globalDate})
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="addCashInput"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Amount to Add (₹)
            </label>
            <input
              id="addCashInput"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="addCashNote"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Note (Optional)
            </label>
            <input
              id="addCashNote"
              type="text"
              placeholder="e.g. Opening cash, ATM withdrawal"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>
          {err && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{err}</p>}
          <button
            type="submit"
            className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
          >
            Add Cash to Wallet
          </button>
        </form>
      </div>
    </div>
  );
};

interface WalletStatementViewProps {
  db: LedgerDB;
  onBackHome: () => void;
}

export const WalletStatementView: React.FC<WalletStatementViewProps> = ({ db, onBackHome }) => {
  const totalIn = getCashInflowsTotal(db);
  const totalOut = getCashOutflowsTotal(db);
  const remaining = getCashWalletBalance(db);
  const directAdded = getCashAddedTotal(db);

  interface CashLog {
    id: string;
    date: string;
    type: 'in' | 'out';
    amount: number;
    label: string;
  }

  const logs: CashLog[] = [];
  db.cashAdditions.forEach((c) => {
    logs.push({
      id: `ca_${c.id}`,
      date: c.date,
      type: 'in',
      amount: c.amount,
      label: c.note || 'Cash Added to Wallet',
    });
  });
  db.tickets.forEach((t) => {
    if (t.receivedIn === 'cash') {
      logs.push({
        id: `t_in_${t.id}`,
        date: t.date,
        type: 'in',
        amount: t.customerPaid,
        label: `Ticket Customer Paid · ${t.customerName}${t.journey ? ` (${t.journey})` : ''}`,
      });
    }
    if (t.paidFromAccountId === 'cash') {
      logs.push({
        id: `t_out_${t.id}`,
        date: t.date,
        type: 'out',
        amount: t.ticketCost,
        label: `Ticket Cost Paid · ${t.customerName}${t.journey ? ` (${t.journey})` : ''}`,
      });
    }
  });
  db.udhar.forEach((u) => {
    if (u.status === 'settled' && u.settledAccountId === 'cash') {
      logs.push({
        id: `u_in_${u.id}`,
        date: u.settledDate || u.date,
        type: 'in',
        amount: u.amount,
        label: `Udhar Collected in Cash · ${u.personName}`,
      });
    }
  });
  db.expenses.forEach((e) => {
    if (e.paidFromAccountId === 'cash') {
      logs.push({
        id: `e_out_${e.id}`,
        date: e.date,
        type: 'out',
        amount: e.amount,
        label: `Other Expense · ${e.paidTo} (${e.category})`,
      });
    }
  });

  logs.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBackHome}
        className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Cash Wallet Statement
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400">Cash Added</div>
            <div className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {formatINR(directAdded)}
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 p-3 border border-emerald-200 dark:border-emerald-900/50">
            <div className="text-xs text-emerald-700 dark:text-emerald-400">Total Cash In</div>
            <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
              {formatINR(totalIn)}
            </div>
          </div>
          <div className="rounded-lg bg-red-50/70 dark:bg-red-950/30 p-3 border border-red-200 dark:border-red-900/50">
            <div className="text-xs text-red-700 dark:text-red-400">Total Cash Out</div>
            <div className="font-mono font-bold text-red-700 dark:text-red-300 mt-0.5">
              {formatINR(totalOut)}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400">Remaining Balance</div>
            <div className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {formatINR(remaining)}
            </div>
          </div>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
            No cash wallet activity found.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {logs.map((l) => (
              <div key={l.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {l.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{l.date}</div>
                </div>
                <span
                  className={`font-mono font-bold shrink-0 ${
                    l.type === 'in'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {l.type === 'in' ? '+' : '−'}
                  {formatINR(l.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
