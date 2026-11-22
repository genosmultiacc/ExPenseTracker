import React, { useEffect, useState } from 'react';
import { CheckCircle2, Trash2, X } from 'lucide-react';
import { DetailModalType, LedgerDB, UdharEntry } from '../types/ledger';
import {
  formatINR,
  getAccountLabel,
  getBankBalance,
  getCashAddedTotal,
  getCashInflowsTotal,
  getCashOutflowsTotal,
  getCashWalletBalance,
  getCombinedBankBalance,
  getMonthlyProfit,
  getMonthlyTickets,
  getPendingUdhars,
  getTotalExpenses,
  getTotalPendingUdhar,
} from '../utils/ledgerCalculations';

interface DetailModalProps {
  db: LedgerDB;
  globalDate: string;
  detailType: DetailModalType;
  customerName: string | null;
  onClose: () => void;
  onRequestSettle: (entry: UdharEntry) => void;
  onDeleteUdhar: (id: string) => void;
  onDeleteTicket: (id: string) => void;
  onDeleteExpense: (id: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  db,
  globalDate,
  detailType,
  customerName,
  onClose,
  onRequestSettle,
  onDeleteUdhar,
  onDeleteTicket,
  onDeleteExpense,
}) => {
  if (!detailType && !customerName) return null;

  let title = '';
  if (customerName) {
    title = `Profile: ${customerName}`;
  } else if (detailType === 'banks') {
    title = 'Bank Accounts Breakdown';
  } else if (detailType === 'profit') {
    const monthName = new Date(`${globalDate.slice(0, 7)}-01T00:00:00`).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    title = `Monthly Profit (${monthName})`;
  } else if (detailType === 'tickets') {
    title = 'All Tickets Booked';
  } else if (detailType === 'udhar') {
    title = 'Pending Payments (Udhar)';
  } else if (detailType === 'expenses') {
    title = 'Other Expenses';
  } else if (detailType === 'cash') {
    title = 'In-Hand Cash Wallet Summary';
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#1E3C72] dark:bg-slate-950 text-white px-5 py-4 flex items-center justify-between">
          <h3 className="font-display text-base font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3 text-sm">
          {customerName && (() => {
            const key = customerName.trim().toLowerCase();
            const tickets = db.tickets.filter((t) => t.customerName.trim().toLowerCase() === key);
            const udhars = db.udhar.filter((u) => u.personName.trim().toLowerCase() === key);
            const expenses = db.expenses.filter((e) => e.paidTo.trim().toLowerCase() === key);
            return (
              <>
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      Ticket Booked {t.journey ? `· ${t.journey}` : ''}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.date} · Paid From: {getAccountLabel(db.banks, t.paidFromAccountId)} · Received:{' '}
                      {getAccountLabel(db.banks, t.receivedIn)}
                    </div>
                    <div className="font-mono text-xs mt-1.5 text-slate-800 dark:text-slate-200">
                      Customer Paid: {formatINR(t.customerPaid)} · Cost: {formatINR(t.ticketCost)} · Profit:{' '}
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatINR(t.serviceCharge)}
                      </span>
                    </div>
                  </div>
                ))}
                {udhars.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Udhar ({u.status === 'settled' ? 'Paid' : 'Pending'})
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {u.date}
                        {u.note ? ` · ${u.note}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-red-600 dark:text-red-400">
                        {formatINR(u.amount)}
                      </span>
                      {u.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => onRequestSettle(u)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {expenses.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        Other Expense · {e.category}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {e.date} · {getAccountLabel(db.banks, e.paidFromAccountId)}
                      </div>
                    </div>
                    <span className="font-mono font-bold">{formatINR(e.amount)}</span>
                  </div>
                ))}
                {tickets.length === 0 && udhars.length === 0 && expenses.length === 0 && (
                  <p className="text-slate-500 dark:text-slate-400">No records found.</p>
                )}
              </>
            );
          })()}

          {detailType === 'banks' && (
            <>
              {db.banks.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">No bank accounts added yet.</p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {db.banks.map((b) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{b.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Opening Balance: <span className="font-mono">{formatINR(b.initialBalance)}</span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(getBankBalance(db, b.id))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
                <span>Combined Bank Balance</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  {formatINR(getCombinedBankBalance(db))}
                </span>
              </div>
            </>
          )}

          {detailType === 'profit' && (() => {
            const monthTickets = getMonthlyTickets(db, globalDate);
            const total = getMonthlyProfit(db, globalDate);
            return (
              <>
                {monthTickets.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400">
                    No tickets booked in this month.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {monthTickets.map((t) => (
                      <div key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {t.customerName} {t.journey ? `· ${t.journey}` : ''}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {t.date} · Paid {formatINR(t.customerPaid)} · Cost {formatINR(t.ticketCost)}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          +{formatINR(t.serviceCharge)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
                  <span>Monthly Profit Total</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    {formatINR(total)}
                  </span>
                </div>
              </>
            );
          })()}

          {detailType === 'tickets' && (
            <>
              {db.tickets.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">No tickets booked yet.</p>
              ) : (
                db.tickets
                  .slice()
                  .reverse()
                  .map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 font-bold text-slate-900 dark:text-slate-100">
                        <span>
                          {t.customerName} {t.journey ? `· ${t.journey}` : ''}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono">{formatINR(t.customerPaid)}</span>
                          <button
                            type="button"
                            onClick={() => onDeleteTicket(t.id)}
                            aria-label={`Delete ticket for ${t.customerName}`}
                            title="Delete Ticket"
                            className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t.date} · Cost: {formatINR(t.ticketCost)} ({getAccountLabel(db.banks, t.paidFromAccountId)}) · Profit:{' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatINR(t.serviceCharge)}
                        </span>{' '}
                        · Received: {getAccountLabel(db.banks, t.receivedIn)}
                      </div>
                    </div>
                  ))
              )}
            </>
          )}

          {detailType === 'udhar' && (() => {
            const pendings = getPendingUdhars(db);
            return (
              <>
                {pendings.length === 0 ? (
                  <div className="py-4 text-center text-emerald-700 dark:text-emerald-400 font-semibold flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6" />
                    <span>All Udhar payments are settled!</span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {pendings.map((u) => (
                      <div key={u.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {u.personName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {u.date}
                            {u.note ? ` · ${u.note}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-red-600 dark:text-red-400">
                            {formatINR(u.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRequestSettle(u)}
                            className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                          >
                            Mark Paid
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteUdhar(u.id)}
                            aria-label={`Delete Udhar for ${u.personName}`}
                            title="Delete Udhar"
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
                  <span>Total Pending Udhar</span>
                  <span className="font-mono text-red-600 dark:text-red-400">
                    {formatINR(getTotalPendingUdhar(db))}
                  </span>
                </div>
              </>
            );
          })()}

          {detailType === 'expenses' && (
            <>
              {db.expenses.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">No expenses logged yet.</p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {db.expenses
                    .slice()
                    .reverse()
                    .map((e) => (
                      <div key={e.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {e.paidTo}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {e.date} · {e.category} · {getAccountLabel(db.banks, e.paidFromAccountId)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono font-bold text-red-600 dark:text-red-400">
                            {formatINR(e.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(e.id)}
                            aria-label={`Delete expense for ${e.paidTo}`}
                            title="Delete Expense"
                            className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold">
                <span>Total Other Expenses</span>
                <span className="font-mono">{formatINR(getTotalExpenses(db))}</span>
              </div>
            </>
          )}

          {detailType === 'cash' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Direct Cash Added:</span>
                <span className="font-mono font-semibold">{formatINR(getCashAddedTotal(db))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Cash Inflows:</span>
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatINR(getCashInflowsTotal(db))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Cash Outflows:</span>
                <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                  {formatINR(getCashOutflowsTotal(db))}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-bold">
                <span>Current Cash Wallet Balance:</span>
                <span className="font-mono">{formatINR(getCashWalletBalance(db))}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface SettleUdharModalProps {
  entry: UdharEntry | null;
  db: LedgerDB;
  onClose: () => void;
  onConfirmSettle: (entryId: string, accountId: string) => void;
}

export const SettleUdharModal: React.FC<SettleUdharModalProps> = ({
  entry,
  db,
  onClose,
  onConfirmSettle,
}) => {
  const [accountId, setAccountId] = useState(db.banks[0]?.id || 'cash');

  useEffect(() => {
    if (entry) {
      setAccountId(db.banks[0]?.id || 'cash');
    }
  }, [entry, db.banks]);

  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-emerald-600 text-white px-5 py-3.5 flex items-center justify-between">
          <h3 className="font-display text-base font-bold">Mark Udhar as Paid</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm">
            <div className="text-slate-500 dark:text-slate-400">Collecting payment from:</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-base mt-0.5">
              {entry.personName} ·{' '}
              <span className="font-mono text-emerald-700 dark:text-emerald-400">
                {formatINR(entry.amount)}
              </span>
            </div>
            {entry.note && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{entry.note}</div>
            )}
          </div>

          <div>
            <label
              htmlFor="settleAccountSelect"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Deposit Received Amount Into:
            </label>
            <select
              id="settleAccountSelect"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            >
              {db.banks.map((b) => (
                <option key={b.id} value={b.id}>
                  Bank: {b.name}
                </option>
              ))}
              <option value="cash">In-Hand Cash Wallet</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirmSettle(entry.id, accountId)}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              Confirm &amp; Credit Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-red-600 text-white px-5 py-3.5 text-center">
          <h3 className="font-display text-base font-bold">{title}</h3>
        </div>
        <div className="p-5 text-center space-y-5">
          <p className="text-sm text-slate-700 dark:text-slate-200">{message}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PrintReportAreaProps {
  db: LedgerDB;
  config: { from: string; to: string; mode: 'basic' | 'advanced' } | null;
}

export const PrintReportArea: React.FC<PrintReportAreaProps> = ({ db, config }) => {
  if (!config) return <div id="print-report-area" />;

  const { from, to, mode } = config;
  const tickets = db.tickets.filter((t) => t.date >= from && t.date <= to);
  const udhars = db.udhar.filter((u) => u.date >= from && u.date <= to);
  const expenses = db.expenses.filter((e) => e.date >= from && e.date <= to);
  const cashIns = db.cashAdditions.filter((c) => c.date >= from && c.date <= to);

  const sumTicketCost = tickets.reduce((s, t) => s + t.ticketCost, 0);
  const sumProfit = tickets.reduce((s, t) => s + t.serviceCharge, 0);
  const sumCustomerPaid = tickets.reduce((s, t) => s + t.customerPaid, 0);
  const sumExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const sumPendingUdhar = getTotalPendingUdhar(db);

  return (
    <div id="print-report-area">
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1E3C72', paddingBottom: '10px', marginBottom: '18px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', color: '#1E3C72' }}>EXPENSE TRACKER STATEMENT</h1>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569' }}>
          Mode: {mode === 'advanced' ? 'Advanced Detailed' : 'Basic Summary'} · Range: {from} to {to}
        </p>
      </div>

      <div className="print-section">
        <h2 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>FINANCIAL SUMMARY</h2>
        <table className="print-table">
          <tbody>
            <tr>
              <td>Combined Bank Balance</td>
              <td className="text-right">{formatINR(getCombinedBankBalance(db))}</td>
            </tr>
            <tr>
              <td>In-Hand Cash Wallet Balance</td>
              <td className="text-right">{formatINR(getCashWalletBalance(db))}</td>
            </tr>
            <tr>
              <td>Tickets Booked ({tickets.length}) · Ticket Cost</td>
              <td className="text-right">{formatINR(sumTicketCost)}</td>
            </tr>
            <tr>
              <td>Tickets Customer Paid Total</td>
              <td className="text-right">{formatINR(sumCustomerPaid)}</td>
            </tr>
            <tr>
              <td>Total Service Charge (Profit)</td>
              <td className="text-right">{formatINR(sumProfit)}</td>
            </tr>
            <tr>
              <td>Other Expenses</td>
              <td className="text-right">{formatINR(sumExpenses)}</td>
            </tr>
            <tr className="total-row">
              <td>Total Pending Udhar (All Unpaid)</td>
              <td className="text-right">{formatINR(sumPendingUdhar)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="print-section">
        <h2 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>BANK ACCOUNTS BREAKDOWN</h2>
        <table className="print-table">
          <thead>
            <tr>
              <th>Bank Account</th>
              <th className="text-right">Opening Balance</th>
              <th className="text-right">Current Balance</th>
            </tr>
          </thead>
          <tbody>
            {db.banks.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td className="text-right">{formatINR(b.initialBalance)}</td>
                <td className="text-right">{formatINR(getBankBalance(db, b.id))}</td>
              </tr>
            ))}
            {db.banks.length === 0 && (
              <tr>
                <td colSpan={3}>No bank accounts configured.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mode === 'advanced' && (
        <>
          <div className="print-page-break" />
          <div className="print-section">
            <h2 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>TICKET BOOKINGS LOG</h2>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Journey</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Profit</th>
                  <th className="text-right">Paid</th>
                  <th>Paid From / Received In</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.customerName}</td>
                    <td>{t.journey || '-'}</td>
                    <td className="text-right">{formatINR(t.ticketCost)}</td>
                    <td className="text-right">{formatINR(t.serviceCharge)}</td>
                    <td className="text-right">{formatINR(t.customerPaid)}</td>
                    <td>
                      {getAccountLabel(db.banks, t.paidFromAccountId)} →{' '}
                      {getAccountLabel(db.banks, t.receivedIn)}
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={7}>No ticket bookings in this range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <h2 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>UDHAR / PENDING PAYMENTS LOG</h2>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Person</th>
                  <th>Note</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {udhars.map((u) => (
                  <tr key={u.id}>
                    <td>{u.date}</td>
                    <td>{u.personName}</td>
                    <td>{u.note || '-'}</td>
                    <td>{u.status === 'settled' ? `Paid (${u.settledDate})` : 'Pending'}</td>
                    <td className="text-right">{formatINR(u.amount)}</td>
                  </tr>
                ))}
                {udhars.length === 0 && (
                  <tr>
                    <td colSpan={5}>No Udhar entries in this range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <h2 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>OTHER EXPENSES &amp; CASH LOG</h2>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category / Type</th>
                  <th>Paid To / Note</th>
                  <th>Account</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>{e.category}</td>
                    <td>{e.paidTo}</td>
                    <td>{getAccountLabel(db.banks, e.paidFromAccountId)}</td>
                    <td className="text-right">{formatINR(e.amount)}</td>
                  </tr>
                ))}
                {cashIns.map((c) => (
                  <tr key={c.id}>
                    <td>{c.date}</td>
                    <td>Cash Added</td>
                    <td>{c.note}</td>
                    <td>Cash Wallet</td>
                    <td className="text-right">+{formatINR(c.amount)}</td>
                  </tr>
                ))}
                {expenses.length === 0 && cashIns.length === 0 && (
                  <tr>
                    <td colSpan={5}>No other expenses or cash additions in this range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
