import React, { useState } from 'react';
import { AlertTriangle, Building2, Plus, Trash2, Wallet } from 'lucide-react';
import { DetailModalType, LedgerDB } from '../types/ledger';
import {
  formatINR,
  getBankBalance,
  getCashWalletBalance,
  getCombinedBankBalance,
  getMonthlyProfit,
  getMonthlyTickets,
  getPendingUdhars,
  getTotalCustomerPaid,
  getTotalExpenses,
  getTotalPendingUdhar,
} from '../utils/ledgerCalculations';

interface DashboardSummaryProps {
  db: LedgerDB;
  globalDate: string;
  onOpenDetail: (type: DetailModalType) => void;
  onAddBank: (name: string, initialBalance: number) => void;
  onDeleteBank: (bankId: string) => void;
  onScrollToUdhar: () => void;
  onOpenBanksView: () => void;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  db,
  globalDate,
  onOpenDetail,
  onAddBank,
  onDeleteBank,
  onScrollToUdhar,
  onOpenBanksView,
}) => {
  const [bankName, setBankName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [showAddBankForm, setShowAddBankForm] = useState(db.banks.length === 0);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const combinedBankBalance = getCombinedBankBalance(db);
  const cashWalletBalance = getCashWalletBalance(db);
  const monthlyProfit = getMonthlyProfit(db, globalDate);
  const monthlyTickets = getMonthlyTickets(db, globalDate);
  const totalTicketsSales = getTotalCustomerPaid(db);
  const pendingUdhars = getPendingUdhars(db);
  const totalPendingUdhar = getTotalPendingUdhar(db);
  const totalExpenses = getTotalExpenses(db);

  const monthLabel = new Date(`${globalDate.slice(0, 7)}-01T00:00:00`).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = bankName.trim();
    if (!trimmed) return;
    const bal = parseFloat(initialBalance) || 0;
    onAddBank(trimmed, bal);
    setBankName('');
    setInitialBalance('');
    setShowAddBankForm(false);
  };

  return (
    <section className="space-y-4">
      {/* Red Alert Notification for Pending Payment / Udhar */}
      {pendingUdhars.length > 0 && !alertDismissed && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-sm font-bold text-red-900 dark:text-red-100">
                Pending Payment Alert · {pendingUdhars.length} Unpaid Udhar
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                Total pending to collect:{' '}
                <span className="font-mono font-bold">{formatINR(totalPendingUdhar)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onOpenDetail('udhar');
                onScrollToUdhar();
              }}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap transition-colors"
            >
              View &amp; Settle
            </button>
            <button
              type="button"
              onClick={() => setAlertDismissed(true)}
              className="min-h-[40px] px-2.5 py-2 rounded-lg text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 whitespace-nowrap transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard Header & KPI Grid */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1E3C72] to-[#2A5298] dark:from-slate-900 dark:to-slate-800 text-white p-5 border border-slate-700/30 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-white/15">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">Expense Tracker</h1>
            <p className="text-xs text-blue-100/80">
              Ticket Booking &amp; Daily Ledger · {globalDate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-100/80">Combined Liquid Balance</p>
            <p className="font-mono text-lg font-bold">
              {formatINR(combinedBankBalance + cashWalletBalance)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Combined Bank Balance */}
          <button
            type="button"
            onClick={() => onOpenDetail('banks')}
            className="text-left rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 p-3.5 transition-colors min-h-[84px]"
          >
            <div className="text-xs text-blue-100/90 font-medium">
              Combined Bank Balance ({db.banks.length})
            </div>
            <div className="font-mono text-xl font-bold mt-1.5 truncate">
              {formatINR(combinedBankBalance)}
            </div>
          </button>

          {/* Monthly Profit */}
          <button
            type="button"
            onClick={() => onOpenDetail('profit')}
            className="text-left rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-300/30 p-3.5 transition-colors min-h-[84px]"
          >
            <div className="text-xs text-emerald-100 font-medium">
              Monthly Profit ({monthLabel})
            </div>
            <div className="font-mono text-xl font-bold text-emerald-200 mt-1.5 truncate">
              {formatINR(monthlyProfit)}
            </div>
            <div className="text-[11px] text-emerald-100/80 mt-0.5">
              {monthlyTickets.length} tickets this month
            </div>
          </button>

          {/* Pending Payment / Udhar */}
          <button
            type="button"
            onClick={() => onOpenDetail('udhar')}
            className={`text-left rounded-xl p-3.5 transition-colors min-h-[84px] border ${
              totalPendingUdhar > 0
                ? 'bg-red-600/85 hover:bg-red-600 border-red-300/60 text-white'
                : 'bg-white/10 hover:bg-white/15 border-white/15'
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-xs font-medium">
              <span className={totalPendingUdhar > 0 ? 'text-red-50' : 'text-blue-100/90'}>
                Pending Payment (Udhar)
              </span>
              {totalPendingUdhar > 0 && (
                <span className="text-[11px] font-bold uppercase tracking-wide text-red-100">
                  Action Needed
                </span>
              )}
            </div>
            <div className="font-mono text-xl font-bold mt-1.5 truncate">
              {formatINR(totalPendingUdhar)}
            </div>
            <div className="text-[11px] opacity-85 mt-0.5">
              {pendingUdhars.length} pending {pendingUdhars.length === 1 ? 'entry' : 'entries'}
            </div>
          </button>

          {/* Tickets Booked */}
          <button
            type="button"
            onClick={() => onOpenDetail('tickets')}
            className="text-left rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 p-3.5 transition-colors min-h-[84px]"
          >
            <div className="text-xs text-blue-100/90 font-medium">
              Tickets Booked ({db.tickets.length})
            </div>
            <div className="font-mono text-xl font-bold mt-1.5 truncate">
              {formatINR(totalTicketsSales)}
            </div>
          </button>

          {/* Other Expenses */}
          <button
            type="button"
            onClick={() => onOpenDetail('expenses')}
            className="text-left rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 p-3.5 transition-colors min-h-[84px]"
          >
            <div className="text-xs text-blue-100/90 font-medium">Other Expenses</div>
            <div className="font-mono text-xl font-bold mt-1.5 truncate">
              {formatINR(totalExpenses)}
            </div>
          </button>

          {/* Cash Wallet */}
          <button
            type="button"
            onClick={() => onOpenDetail('cash')}
            className="text-left rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 p-3.5 transition-colors min-h-[84px]"
          >
            <div className="text-xs text-blue-100/90 font-medium">In-Hand Cash Wallet</div>
            <div className="font-mono text-xl font-bold mt-1.5 truncate">
              {formatINR(cashWalletBalance)}
            </div>
          </button>
        </div>
      </div>

      {/* Bank Accounts & Cash Wallet Card */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1E3C72] dark:text-blue-400" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Bank Accounts &amp; Cash Wallet
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddBankForm((v) => !v)}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#1E3C72] hover:bg-[#2A5298] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddBankForm ? 'Close Form' : 'Add Bank Account'}</span>
            </button>
            {db.banks.length > 0 && (
              <button
                type="button"
                onClick={onOpenBanksView}
                className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                Bank Logs
              </button>
            )}
          </div>
        </div>

        {/* Account Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Combined Bank Balance ({db.banks.length})
              </p>
              <p className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {formatINR(combinedBankBalance)}
              </p>
            </div>
            <Building2 className="w-5 h-5 text-slate-400" />
          </div>

          <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                In-Hand Cash Wallet
              </p>
              <p className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                {formatINR(cashWalletBalance)}
              </p>
            </div>
            <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Individual Bank Accounts List */}
        {db.banks.length > 0 && (
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
            {db.banks.map((bank) => {
              const bal = getBankBalance(db, bank.id);
              return (
                <div
                  key={bank.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {bank.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Opening: <span className="font-mono">{formatINR(bank.initialBalance)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono font-bold ${
                        bal < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {formatINR(bal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteBank(bank.id)}
                      aria-label={`Delete ${bank.name}`}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inline Add Bank Account Form */}
        {showAddBankForm && (
          <form
            onSubmit={handleBankSubmit}
            className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
          >
            <div>
              <label
                htmlFor="dashBankName"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Bank Account Name
              </label>
              <input
                id="dashBankName"
                type="text"
                required
                placeholder="e.g. SBI Main, HDFC Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>
            <div>
              <label
                htmlFor="dashBankBalance"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Initial Balance (₹)
              </label>
              <input
                id="dashBankBalance"
                type="number"
                step="any"
                required
                placeholder="e.g. 25000"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>
            <button
              type="submit"
              className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
            >
              Save Bank Account
            </button>
          </form>
        )}
      </div>
    </section>
  );
};
