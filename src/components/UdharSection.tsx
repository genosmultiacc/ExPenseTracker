import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { BankAccount, UdharEntry } from '../types/ledger';
import { formatINR, getAccountLabel } from '../utils/ledgerCalculations';

interface UdharSectionProps {
  banks: BankAccount[];
  globalDate: string;
  udharList: UdharEntry[];
  editingUdhar: UdharEntry | null;
  onCancelEdit: () => void;
  onSaveUdhar: (data: Omit<UdharEntry, 'id' | 'status'>, editId?: string) => void;
  onRequestSettle: (entry: UdharEntry) => void;
  onDeleteUdhar: (id: string) => void;
}

export const UdharSection: React.FC<UdharSectionProps> = ({
  banks,
  globalDate,
  udharList,
  editingUdhar,
  onCancelEdit,
  onSaveUdhar,
  onRequestSettle,
  onDeleteUdhar,
}) => {
  const [personName, setPersonName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState<'pending' | 'settled' | 'all'>('pending');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingUdhar) {
      setPersonName(editingUdhar.personName);
      setAmountStr(String(editingUdhar.amount));
      setNote(editingUdhar.note);
      setErrorMsg('');
    }
  }, [editingUdhar]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const name = personName.trim();
    const amount = parseFloat(amountStr) || 0;
    if (!name || amount <= 0) {
      setErrorMsg('Please enter Person Name and a valid Amount.');
      return;
    }

    onSaveUdhar(
      {
        date: editingUdhar ? editingUdhar.date : globalDate,
        personName: name,
        amount,
        note: note.trim(),
        linkedTicketId: editingUdhar?.linkedTicketId,
        settledDate: editingUdhar?.settledDate,
        settledAccountId: editingUdhar?.settledAccountId,
      },
      editingUdhar?.id
    );

    setPersonName('');
    setAmountStr('');
    setNote('');
  };

  const pendingCount = udharList.filter((u) => u.status === 'pending').length;
  const settledCount = udharList.filter((u) => u.status === 'settled').length;

  const visibleItems = udharList
    .filter((u) => (filter === 'all' ? true : u.status === filter))
    .slice()
    .sort((a, b) => (a.status === b.status ? b.date.localeCompare(a.date) : a.status === 'pending' ? -1 : 1));

  return (
    <div id="form-udhar-section" className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Udhar / Pending Payment
          </h2>
        </div>
        {editingUdhar && (
          <button
            type="button"
            onClick={() => {
              onCancelEdit();
              setPersonName('');
              setAmountStr('');
              setNote('');
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
              htmlFor="udharPersonName"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Person Name (To Collect From)
            </label>
            <input
              id="udharPersonName"
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="e.g. Amit Kumar"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
            />
          </div>
          <div>
            <label
              htmlFor="udharAmount"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Pending Amount (₹)
            </label>
            <input
              id="udharAmount"
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

        <div>
          <label
            htmlFor="udharNote"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Note / Reason (Optional)
          </label>
          <input
            id="udharNote"
            type="text"
            placeholder="e.g. Tatkal ticket balance"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          />
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">{errorMsg}</p>
        )}

        <button
          type="submit"
          className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-[#1E3C72] hover:bg-[#2A5298] text-white text-sm font-semibold transition-colors"
        >
          {editingUdhar ? 'Update Udhar Entry' : 'Add Pending Udhar'}
        </button>
      </form>

      {/* Filter Tabs */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 mb-3">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`flex-1 min-h-[38px] px-2 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              filter === 'pending'
                ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('settled')}
            className={`flex-1 min-h-[38px] px-2 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              filter === 'settled'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Settled ({settledCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`flex-1 min-h-[38px] px-2 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            All ({udharList.length})
          </button>
        </div>

        {visibleItems.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
            No {filter === 'all' ? '' : filter} Udhar records found.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-72 overflow-y-auto">
            {visibleItems.map((u) => (
              <div
                key={u.id}
                className="py-2.5 flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {u.personName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {u.date}
                    {u.note ? ` · ${u.note}` : ''}
                    {u.status === 'settled' && u.settledAccountId
                      ? ` · Paid into ${getAccountLabel(banks, u.settledAccountId)} (${u.settledDate})`
                      : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-mono font-bold ${
                      u.status === 'pending'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {formatINR(u.amount)}
                  </span>
                  {u.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => onRequestSettle(u)}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap transition-colors"
                    >
                      Mark Paid
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Paid
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteUdhar(u.id)}
                    aria-label={`Delete Udhar for ${u.personName}`}
                    title="Delete Udhar"
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
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
