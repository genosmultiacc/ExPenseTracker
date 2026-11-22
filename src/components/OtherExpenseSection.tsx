import React, { useEffect, useState } from 'react';
import { Receipt, Trash2 } from 'lucide-react';
import { BankAccount, ExpenseEntry } from '../types/ledger';
import { formatINR, getAccountLabel } from '../utils/ledgerCalculations';

interface OtherExpenseSectionProps {
  banks: BankAccount[];
  globalDate: string;
  todayExpenses: ExpenseEntry[];
  editingExpense: ExpenseEntry | null;
  onCancelEdit: () => void;
  onSaveExpense: (data: Omit<ExpenseEntry, 'id'>, editId?: string) => void;
  onDeleteExpense: (id: string) => void;
}

export const OtherExpenseSection: React.FC<OtherExpenseSectionProps> = ({
  banks,
  globalDate,
  todayExpenses,
  editingExpense,
  onCancelEdit,
  onSaveExpense,
  onDeleteExpense,
}) => {
  const [category, setCategory] = useState('');
  const [paidFromAccountId, setPaidFromAccountId] = useState('cash');
  const [paidTo, setPaidTo] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingExpense) {
      setCategory(editingExpense.category);
      setPaidFromAccountId(editingExpense.paidFromAccountId);
      setPaidTo(editingExpense.paidTo);
      setAmountStr(String(editingExpense.amount));
      setErrorMsg('');
    }
  }, [editingExpense]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cat = category.trim();
    const to = paidTo.trim();
    const amount = parseFloat(amountStr) || 0;

    if (!cat || !to || amount <= 0) {
      setErrorMsg('Please enter Expense For, Paid To, and a valid Amount.');
      return;
    }

    onSaveExpense(
      {
        date: editingExpense ? editingExpense.date : globalDate,
        category: cat,
        paidTo: to,
        amount,
        paidFromAccountId,
      },
      editingExpense?.id
    );

    setCategory('');
    setPaidTo('');
    setAmountStr('');
    setErrorMsg('');
  };

  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div id="form-expense-section" className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Other Expense
          </h2>
        </div>
        {editingExpense && (
          <button
            type="button"
            onClick={() => {
              onCancelEdit();
              setCategory('');
              setPaidTo('');
              setAmountStr('');
            }}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
          >
            Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="expenseCategory"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Expense For (Category)
            </label>
            <input
              id="expenseCategory"
              type="text"
              placeholder="e.g. Shop Rent, Chai, Internet, Extra"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
            />
          </div>

          <div>
            <label
              htmlFor="expensePaidFrom"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Paid From (Payment Method)
            </label>
            <select
              id="expensePaidFrom"
              value={paidFromAccountId}
              onChange={(e) => setPaidFromAccountId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
            >
              <option value="cash">In-Hand Cash Wallet</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  Bank: {b.name}
                </option>
              ))}
              <option value="online">Other / Online / Credit</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="expensePaidTo"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Paid To / Description
            </label>
            <input
              id="expensePaidTo"
              type="text"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="e.g. Landlord, Electricity Bill"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
            />
          </div>

          <div>
            <label
              htmlFor="expenseAmount"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Amount (₹)
            </label>
            <input
              id="expenseAmount"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
            />
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">{errorMsg}</p>
        )}

        <button
          type="submit"
          className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
        >
          {editingExpense ? 'Update Other Expense' : 'Save Other Expense'}
        </button>
      </form>

      {/* Today's Other Expense List */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
            Today&apos;s Other Expenses ({todayExpenses.length})
          </h3>
          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
            {formatINR(todayTotal)}
          </span>
        </div>

        {todayExpenses.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
            No other expenses logged for {globalDate}.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {todayExpenses.map((e) => (
              <div key={e.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {e.paidTo}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {e.category} · {getAccountLabel(banks, e.paidFromAccountId)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(e.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteExpense(e.id)}
                    aria-label={`Delete expense for ${e.paidTo}`}
                    title="Delete Expense"
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
