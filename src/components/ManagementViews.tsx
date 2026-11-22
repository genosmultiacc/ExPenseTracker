import React, { useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  Calendar,
  Download,
  FileSpreadsheet,
  FolderCog,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  CashAddition,
  ExpenseEntry,
  LedgerDB,
  TicketEntry,
  UdharEntry,
} from '../types/ledger';
import {
  formatINR,
  getAccountLabel,
  getCashWalletBalance,
  getCombinedBankBalance,
  getCustomerSuggestions,
  getTotalExpenses,
  getTotalPendingUdhar,
  getTotalProfit,
  getTotalTicketCost,
} from '../utils/ledgerCalculations';

interface CustomerProfilesViewProps {
  db: LedgerDB;
  onSelectCustomer: (name: string) => void;
  onRenamePerson: (oldName: string, newName: string) => void;
  onRemovePersonName: (name: string) => void;
  onBackHome: () => void;
}

export const CustomerProfilesView: React.FC<CustomerProfilesViewProps> = ({
  db,
  onSelectCustomer,
  onRenamePerson,
  onRemovePersonName,
  onBackHome,
}) => {
  const [manageMode, setManageMode] = useState(false);
  const [renamingTarget, setRenamingTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const names = getCustomerSuggestions(db);

  const getSummary = (name: string) => {
    const key = name.trim().toLowerCase();
    let ticketSales = 0;
    let pendingUdhar = 0;
    let expensesPaid = 0;

    db.tickets.forEach((t) => {
      if (t.customerName.trim().toLowerCase() === key) ticketSales += t.customerPaid;
    });
    db.udhar.forEach((u) => {
      if (u.personName.trim().toLowerCase() === key && u.status === 'pending') {
        pendingUdhar += u.amount;
      }
    });
    db.expenses.forEach((e) => {
      if (e.paidTo.trim().toLowerCase() === key) expensesPaid += e.amount;
    });

    return { ticketSales, pendingUdhar, expensesPaid, total: ticketSales + pendingUdhar + expensesPaid };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <button
          type="button"
          onClick={() => setManageMode((v) => !v)}
          className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#1E3C72] hover:bg-[#2A5298] text-white text-xs font-semibold"
        >
          {manageMode ? 'Done Managing' : 'Manage Saved Names'}
        </button>
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-[#1E3C72] dark:text-blue-400" />
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Customer &amp; Recipient Profiles ({names.length})
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Click any name to inspect full Ticket, Udhar, and Expense history.
        </p>

        {names.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
            No customer or recipient records yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {names.map((name) => {
              const s = getSummary(name);
              const isRenaming = renamingTarget === name;
              return (
                <div key={name} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  {isRenaming ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (renameValue.trim()) {
                          onRenamePerson(name, renameValue.trim());
                        }
                        setRenamingTarget(null);
                      }}
                      className="flex-1 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 min-h-[38px] px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                      />
                      <button
                        type="submit"
                        className="min-h-[38px] px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingTarget(null)}
                        className="min-h-[38px] px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectCustomer(name)}
                        className="text-left min-w-0 flex-1 hover:opacity-80"
                      >
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Tickets: <span className="font-mono">{formatINR(s.ticketSales)}</span>
                          {s.pendingUdhar > 0 && (
                            <>
                              {' · '}
                              <span className="text-red-600 dark:text-red-400 font-semibold">
                                Pending Udhar: <span className="font-mono">{formatINR(s.pendingUdhar)}</span>
                              </span>
                            </>
                          )}
                          {s.expensesPaid > 0 && (
                            <>
                              {' · '}
                              Expenses: <span className="font-mono">{formatINR(s.expensesPaid)}</span>
                            </>
                          )}
                        </div>
                      </button>

                      {manageMode && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingTarget(name);
                              setRenameValue(name);
                            }}
                            aria-label={`Rename ${name}`}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemovePersonName(name)}
                            aria-label={`Remove ${name}`}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface EntriesManagerViewProps {
  db: LedgerDB;
  globalDate: string;
  onEditTicket: (t: TicketEntry) => void;
  onDeleteTicket: (id: string) => void;
  onEditUdhar: (u: UdharEntry) => void;
  onDeleteUdhar: (id: string) => void;
  onEditExpense: (e: ExpenseEntry) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteCashAddition: (id: string) => void;
  onBackHome: () => void;
}

export const EntriesManagerView: React.FC<EntriesManagerViewProps> = ({
  db,
  globalDate,
  onEditTicket,
  onDeleteTicket,
  onEditUdhar,
  onDeleteUdhar,
  onEditExpense,
  onDeleteExpense,
  onDeleteCashAddition,
  onBackHome,
}) => {
  const tickets = db.tickets.filter((t) => t.date === globalDate);
  const udhars = db.udhar.filter((u) => u.date === globalDate);
  const expenses = db.expenses.filter((e) => e.date === globalDate);
  const cashIns: CashAddition[] = db.cashAdditions.filter((c) => c.date === globalDate);

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

      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <FolderCog className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Entries Manager ({globalDate})
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Edit or delete any entry recorded on the selected date.
          </p>
        </div>

        {/* Tickets */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tickets Booked ({tickets.length})
          </h3>
          {tickets.length === 0 ? (
            <p className="text-xs text-slate-400">No ticket entries on this date.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-3">
              {tickets.map((t) => (
                <div key={t.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {t.customerName} {t.journey ? `· ${t.journey}` : ''}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Cost {formatINR(t.ticketCost)} ({getAccountLabel(db.banks, t.paidFromAccountId)}) · Profit {formatINR(t.serviceCharge)} · Paid {formatINR(t.customerPaid)} ({getAccountLabel(db.banks, t.receivedIn)})
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditTicket(t)}
                      aria-label="Edit Ticket"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTicket(t.id)}
                      aria-label="Delete Ticket"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Udhar */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Udhar / Pending Payments ({udhars.length})
          </h3>
          {udhars.length === 0 ? (
            <p className="text-xs text-slate-400">No Udhar entries on this date.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-3">
              {udhars.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {u.personName} · <span className="font-mono">{formatINR(u.amount)}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Status: {u.status === 'settled' ? 'Paid' : 'Pending'}
                      {u.note ? ` · ${u.note}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {u.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => onEditUdhar(u)}
                        aria-label="Edit Udhar"
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteUdhar(u.id)}
                      aria-label="Delete Udhar"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Other Expenses */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Other Expenses ({expenses.length})
          </h3>
          {expenses.length === 0 ? (
            <p className="text-xs text-slate-400">No other expenses on this date.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-3">
              {expenses.map((e) => (
                <div key={e.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {e.paidTo} · <span className="font-mono">{formatINR(e.amount)}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {e.category} · {getAccountLabel(db.banks, e.paidFromAccountId)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditExpense(e)}
                      aria-label="Edit Expense"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(e.id)}
                      aria-label="Delete Expense"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cash Additions */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Wallet Cash Additions ({cashIns.length})
          </h3>
          {cashIns.length === 0 ? (
            <p className="text-xs text-slate-400">No cash additions on this date.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-3">
              {cashIns.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                      +{formatINR(c.amount)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {c.note || 'Cash Added'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteCashAddition(c.id)}
                    aria-label="Delete Cash Addition"
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface BudgetCalculatorViewProps {
  db: LedgerDB;
  onUpdateBudget: (budget: number) => void;
  onBackHome: () => void;
}

export const BudgetCalculatorView: React.FC<BudgetCalculatorViewProps> = ({
  db,
  onUpdateBudget,
  onBackHome,
}) => {
  const spent = getTotalExpenses(db);
  const budget = db.allocatedBudget || 0;
  const remaining = budget - spent;
  const pct = budget > 0 ? (spent / budget) * 100 : 0;

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
          <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Expense Budget Calculator
          </h2>
        </div>

        <div>
          <label
            htmlFor="budgetInput"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Monthly / Operational Expense Budget (₹)
          </label>
          <input
            id="budgetInput"
            type="number"
            step="any"
            min="0"
            value={budget || ''}
            placeholder="0"
            onChange={(e) => onUpdateBudget(parseFloat(e.target.value) || 0)}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm"
          />
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Allocated Budget:</span>
            <span className="font-mono font-bold">{formatINR(budget)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Other Expenses Spent:</span>
            <span className="font-mono font-bold text-red-600 dark:text-red-400">
              {formatINR(spent)}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Remaining:</span>
            <span
              className={`font-mono font-bold ${
                remaining < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {formatINR(remaining)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Percentage Used</span>
            <span className="font-mono font-semibold">{pct.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                pct > 100 ? 'bg-red-600' : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface ReportsViewProps {
  db: LedgerDB;
  globalDate: string;
  onBackHome: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ db, globalDate, onBackHome }) => {
  const [reportDate, setReportDate] = useState(globalDate);

  const dayTickets = db.tickets.filter((t) => t.date === reportDate);
  const dayTicketCost = dayTickets.reduce((s, t) => s + t.ticketCost, 0);
  const dayProfit = dayTickets.reduce((s, t) => s + t.serviceCharge, 0);
  const dayCustomerPaid = dayTickets.reduce((s, t) => s + t.customerPaid, 0);
  const dayExpenses = db.expenses
    .filter((e) => e.date === reportDate)
    .reduce((s, e) => s + e.amount, 0);
  const dayUdharCreated = db.udhar
    .filter((u) => u.date === reportDate)
    .reduce((s, u) => s + u.amount, 0);
  const dayUdharSettled = db.udhar
    .filter((u) => u.status === 'settled' && u.settledDate === reportDate)
    .reduce((s, u) => s + u.amount, 0);

  // Monthly aggregation
  const monthsMap = new Map<
    string,
    { tickets: number; cost: number; profit: number; sales: number; expenses: number }
  >();

  const ensureMonth = (m: string) => {
    if (!monthsMap.has(m)) {
      monthsMap.set(m, { tickets: 0, cost: 0, profit: 0, sales: 0, expenses: 0 });
    }
    return monthsMap.get(m)!;
  };

  db.tickets.forEach((t) => {
    const entry = ensureMonth(t.date.slice(0, 7));
    entry.tickets += 1;
    entry.cost += t.ticketCost;
    entry.profit += t.serviceCharge;
    entry.sales += t.customerPaid;
  });

  db.expenses.forEach((e) => {
    const entry = ensureMonth(e.date.slice(0, 7));
    entry.expenses += e.amount;
  });

  const sortedMonths = Array.from(monthsMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));

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

      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-[#1E3C72] dark:text-blue-400" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Date-Wise Report
            </h2>
          </div>

          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm mb-3"
          />

          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Tickets Booked:</span>
              <span className="font-mono font-semibold">{dayTickets.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Ticket Cost Total:</span>
              <span className="font-mono font-semibold">{formatINR(dayTicketCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Customer Paid Total:</span>
              <span className="font-mono font-semibold">{formatINR(dayCustomerPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                Day Profit (Service Charge):
              </span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {formatINR(dayProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Other Expenses:</span>
              <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                {formatINR(dayExpenses)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Udhar Added / Settled:</span>
              <span className="font-mono text-xs font-semibold">
                +{formatINR(dayUdharCreated)} / −{formatINR(dayUdharSettled)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold">
              <span>Net Profit After Expenses:</span>
              <span
                className={`font-mono ${
                  dayProfit - dayExpenses < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {formatINR(dayProfit - dayExpenses)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Monthly Profit &amp; Expense Summary
            </h3>
          </div>

          {sortedMonths.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No monthly data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {sortedMonths.map(([monthKey, stats]) => {
                const label = new Date(`${monthKey}-01T00:00:00`).toLocaleString('en-US', {
                  month: 'long',
                  year: 'numeric',
                });
                return (
                  <div
                    key={monthKey}
                    className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                      <span>{label}</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400">
                        Profit: {formatINR(stats.profit)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Tickets: {stats.tickets}</span>
                      <span>·</span>
                      <span>
                        Ticket Cost: <span className="font-mono">{formatINR(stats.cost)}</span>
                      </span>
                      <span>·</span>
                      <span>
                        Other Expenses:{' '}
                        <span className="font-mono text-red-600 dark:text-red-400">
                          {formatINR(stats.expenses)}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PdfGeneratorViewProps {
  globalDate: string;
  onGeneratePdf: (from: string, to: string, mode: 'basic' | 'advanced') => void;
  onBackHome: () => void;
}

export const PdfGeneratorView: React.FC<PdfGeneratorViewProps> = ({
  globalDate,
  onGeneratePdf,
  onBackHome,
}) => {
  const [fromDate, setFromDate] = useState(`${globalDate.slice(0, 7)}-01`);
  const [toDate, setToDate] = useState(globalDate);
  const [mode, setMode] = useState<'basic' | 'advanced'>('advanced');

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
          <Printer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Generate Statement PDF Report
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="pdfFrom"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              From Date
            </label>
            <input
              id="pdfFrom"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="pdfTo"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              To Date
            </label>
            <input
              id="pdfTo"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="pdfModeSelect"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Report Mode
          </label>
          <select
            id="pdfModeSelect"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'basic' | 'advanced')}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="basic">Basic Mode (Bank, Profit, Udhar &amp; Expense Summary)</option>
            <option value="advanced">Advanced Mode (Summary + Full Ticket, Udhar &amp; Expense Logs)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => onGeneratePdf(fromDate, toDate, mode)}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-[#1E3C72] hover:bg-[#2A5298] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>Generate &amp; Print PDF Statement</span>
        </button>
      </div>
    </div>
  );
};

interface SystemViewProps {
  db: LedgerDB;
  globalDate: string;
  isCloudSynced: boolean;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onResetDay: () => void;
  onResetAll: () => void;
  onBackHome: () => void;
}

export const SystemView: React.FC<SystemViewProps> = ({
  db,
  globalDate,
  isCloudSynced,
  onExportJson,
  onImportJson,
  onResetDay,
  onResetAll,
  onBackHome,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Backup, Restore &amp; Maintenance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isCloudSynced
              ? 'Your ledger is synced to your Firebase Cloud account. Export JSON backups anytime.'
              : 'Data is stored locally in your browser. Sign in with Google for Firebase Cloud sync, or export JSON backups.'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Current Snapshot: {db.banks.length} Banks · {db.tickets.length} Tickets ·{' '}
            {db.udhar.length} Udhar · {db.expenses.length} Expenses · Liquid:{' '}
            <span className="font-mono font-semibold">
              {formatINR(getCombinedBankBalance(db) + getCashWalletBalance(db))}
            </span>{' '}
            · Profit: <span className="font-mono font-semibold">{formatINR(getTotalProfit(db))}</span> ·
            Ticket Cost: <span className="font-mono font-semibold">{formatINR(getTotalTicketCost(db))}</span> ·
            Pending Udhar:{' '}
            <span className="font-mono font-semibold">{formatINR(getTotalPendingUdhar(db))}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onExportJson}
            className="min-h-[44px] px-4 py-2.5 rounded-lg bg-[#1E3C72] hover:bg-[#2A5298] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Import JSON Backup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportJson(file);
              e.target.value = '';
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onResetDay}
            className="min-h-[44px] px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Selected Day ({globalDate})</span>
          </button>

          <button
            type="button"
            onClick={onResetAll}
            className="min-h-[44px] px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Total Reset All Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
