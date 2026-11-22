import React, { useEffect, useState } from 'react';
import { Ticket, Trash2 } from 'lucide-react';
import { BankAccount, TicketEntry } from '../types/ledger';
import { formatINR, getAccountLabel } from '../utils/ledgerCalculations';

interface TicketBookedSectionProps {
  banks: BankAccount[];
  globalDate: string;
  todayTickets: TicketEntry[];
  editingTicket: TicketEntry | null;
  onCancelEdit: () => void;
  onSaveTicket: (
    data: Omit<TicketEntry, 'id'>,
    editId?: string
  ) => void;
  onDeleteTicket: (id: string) => void;
}

type FareField = 'paid' | 'cost' | 'profit';

export const TicketBookedSection: React.FC<TicketBookedSectionProps> = ({
  banks,
  globalDate,
  todayTickets,
  editingTicket,
  onCancelEdit,
  onSaveTicket,
  onDeleteTicket,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [journey, setJourney] = useState('');
  const [customerPaidStr, setCustomerPaidStr] = useState('');
  const [ticketCostStr, setTicketCostStr] = useState('');
  const [serviceChargeStr, setServiceChargeStr] = useState('');
  const [lastTwoEdited, setLastTwoEdited] = useState<FareField[]>([]);
  const [paidFromAccountId, setPaidFromAccountId] = useState<string>(
    banks[0]?.id || 'cash'
  );
  const [receivedIn, setReceivedIn] = useState<string>(banks[0]?.id || 'cash');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync default account when banks are first added
  useEffect(() => {
    if (banks.length > 0) {
      if (paidFromAccountId !== 'cash' && paidFromAccountId !== 'online' && !banks.some((b) => b.id === paidFromAccountId)) {
        setPaidFromAccountId(banks[0].id);
      }
      if (receivedIn !== 'cash' && receivedIn !== 'udhar' && !banks.some((b) => b.id === receivedIn)) {
        setReceivedIn(banks[0].id);
      }
    }
  }, [banks, paidFromAccountId, receivedIn]);

  // Populate form when editing
  useEffect(() => {
    if (editingTicket) {
      setCustomerName(editingTicket.customerName);
      setJourney(editingTicket.journey);
      setCustomerPaidStr(String(editingTicket.customerPaid));
      setTicketCostStr(String(editingTicket.ticketCost));
      setServiceChargeStr(String(editingTicket.serviceCharge));
      setLastTwoEdited(['paid', 'profit']);
      setPaidFromAccountId(editingTicket.paidFromAccountId);
      setReceivedIn(editingTicket.receivedIn);
      setErrorMsg('');
    }
  }, [editingTicket]);

  const formatCalcVal = (val: number): string => {
    if (!Number.isFinite(val)) return '0';
    return String(Number(val.toFixed(2)));
  };

  const handleFareChange = (field: FareField, rawValue: string) => {
    const nextVals: Record<FareField, string> = {
      paid: field === 'paid' ? rawValue : customerPaidStr,
      cost: field === 'cost' ? rawValue : ticketCostStr,
      profit: field === 'profit' ? rawValue : serviceChargeStr,
    };

    const prevLastTwo = lastTwoEdited;
    let nextLastTwo = prevLastTwo.filter((f) => f !== field);
    if (rawValue.trim() !== '') {
      nextLastTwo = [...nextLastTwo, field].slice(-2);
    }

    if (nextLastTwo.length === 2) {
      const target = (['paid', 'cost', 'profit'] as FareField[]).find(
        (f) => !nextLastTwo.includes(f)
      );
      const p = parseFloat(nextVals.paid) || 0;
      const c = parseFloat(nextVals.cost) || 0;
      const pr = parseFloat(nextVals.profit) || 0;

      if (target === 'cost') {
        nextVals.cost = formatCalcVal(Math.max(0, p - pr));
      } else if (target === 'paid') {
        nextVals.paid = formatCalcVal(Math.max(0, c + pr));
      } else if (target === 'profit') {
        nextVals.profit = formatCalcVal(p - c);
      }
    } else if (rawValue.trim() === '' && prevLastTwo.length === 2) {
      const prevAutoField = (['paid', 'cost', 'profit'] as FareField[]).find(
        (f) => !prevLastTwo.includes(f)
      );
      if (prevAutoField && prevAutoField !== field) {
        nextVals[prevAutoField] = '';
      }
    }

    setCustomerPaidStr(nextVals.paid);
    setTicketCostStr(nextVals.cost);
    setServiceChargeStr(nextVals.profit);
    setLastTwoEdited(nextLastTwo);
  };

  const computedCustomerPaid = parseFloat(customerPaidStr) || 0;
  const computedTicketCost = parseFloat(ticketCostStr) || 0;
  const serviceCharge = parseFloat(serviceChargeStr) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const name = customerName.trim();
    if (!name) {
      setErrorMsg('Please enter Customer Name.');
      return;
    }

    if (computedTicketCost <= 0 && computedCustomerPaid <= 0) {
      setErrorMsg('Please enter valid Ticket Cost or Customer Paid amount.');
      return;
    }

    onSaveTicket(
      {
        date: editingTicket ? editingTicket.date : globalDate,
        customerName: name,
        journey: journey.trim().toUpperCase(),
        ticketCost: computedTicketCost,
        serviceCharge,
        customerPaid: computedCustomerPaid,
        paidFromAccountId,
        receivedIn,
      },
      editingTicket?.id
    );

    setCustomerName('');
    setJourney('');
    setCustomerPaidStr('');
    setTicketCostStr('');
    setServiceChargeStr('');
    setLastTwoEdited([]);
    setErrorMsg('');
  };

  const todaySalesTotal = todayTickets.reduce((s, t) => s + t.customerPaid, 0);
  const todayProfitTotal = todayTickets.reduce((s, t) => s + t.serviceCharge, 0);

  return (
    <div id="form-ticket-section" className="space-y-4">
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Ticket Booked
            </h2>
          </div>
          {editingTicket && (
            <button
              type="button"
              onClick={() => {
                onCancelEdit();
                setCustomerName('');
                setJourney('');
                setCustomerPaidStr('');
                setTicketCostStr('');
                setServiceChargeStr('');
                setLastTwoEdited([]);
              }}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="ticketCustomerName"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Customer Name
              </label>
              <input
                id="ticketCustomerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>

            <div>
              <label
                htmlFor="ticketJourney"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Journey (Optional)
              </label>
              <input
                id="ticketJourney"
                type="text"
                placeholder="e.g. BTH TO ANVT"
                value={journey}
                onChange={(e) => setJourney(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>
          </div>

          {/* Numeric Fare Inputs (enter any two to auto-calculate the third) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="ticketCustomerPaid"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Customer Paid (₹)
              </label>
              <input
                id="ticketCustomerPaid"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={customerPaidStr}
                onChange={(e) => handleFareChange('paid', e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>

            <div>
              <label
                htmlFor="ticketCostInput"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Ticket Cost (₹)
              </label>
              <input
                id="ticketCostInput"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={ticketCostStr}
                onChange={(e) => handleFareChange('cost', e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>

            <div>
              <label
                htmlFor="ticketServiceCharge"
                className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1"
              >
                Service Charge / Profit (₹)
              </label>
              <input
                id="ticketServiceCharge"
                type="number"
                step="any"
                placeholder="0"
                value={serviceChargeStr}
                onChange={(e) => handleFareChange('profit', e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              />
            </div>
          </div>

          {/* Paid From & Received In Account Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="ticketPaidFrom"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Paid From (Ticket Cost Deducted)
              </label>
              <select
                id="ticketPaidFrom"
                value={paidFromAccountId}
                onChange={(e) => setPaidFromAccountId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bank: {b.name}
                  </option>
                ))}
                <option value="cash">In-Hand Cash Wallet</option>
                <option value="online">Other / External Card</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="ticketReceivedIn"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Customer Paid Into (Received In)
              </label>
              <select
                id="ticketReceivedIn"
                value={receivedIn}
                onChange={(e) => setReceivedIn(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bank: {b.name}
                  </option>
                ))}
                <option value="cash">In-Hand Cash Wallet</option>
                <option value="udhar">Udhar (Pending Payment)</option>
              </select>
            </div>
          </div>

          {/* Live Ledger Impact Summary */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div>
              Cost <span className="font-mono font-semibold text-red-600 dark:text-red-400">−{formatINR(computedTicketCost)}</span> from{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {getAccountLabel(banks, paidFromAccountId)}
              </span>
              {' · '}
              Profit{' '}
              <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                +{formatINR(serviceCharge)}
              </span>
            </div>
            <div>
              {receivedIn === 'udhar' ? (
                <span>
                  Customer Paid <span className="font-mono font-semibold">{formatINR(computedCustomerPaid)}</span> will be added to{' '}
                  <span className="font-semibold text-red-600 dark:text-red-400">Pending Payment (Udhar)</span>
                </span>
              ) : (
                <span>
                  Customer Paid <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">+{formatINR(computedCustomerPaid)}</span> credited once to{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {getAccountLabel(banks, receivedIn)}
                  </span>{' '}
                  (Profit already included)
                </span>
              )}
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">{errorMsg}</p>
          )}

          <button
            type="submit"
            className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            {editingTicket ? 'Update Ticket Booking' : 'Save Ticket Booking'}
          </button>
        </form>
      </div>

      {/* Today's Ticket Booked List */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
            Today&apos;s Tickets Booked ({todayTickets.length})
          </h3>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Profit: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatINR(todayProfitTotal)}</span>
            {' · '}
            Sales: <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatINR(todaySalesTotal)}</span>
          </div>
        </div>

        {todayTickets.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
            No tickets booked for {globalDate}.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {todayTickets.map((t) => (
              <div key={t.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {t.customerName}
                    {t.journey && (
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        {' · '}
                        {t.journey}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Cost <span className="font-mono">{formatINR(t.ticketCost)}</span> ({getAccountLabel(banks, t.paidFromAccountId)})
                    {' · '}
                    Profit <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatINR(t.serviceCharge)}</span>
                    {' · '}
                    Received:{' '}
                    <span className={t.receivedIn === 'udhar' ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                      {getAccountLabel(banks, t.receivedIn)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(t.customerPaid)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteTicket(t.id)}
                    aria-label={`Delete ticket for ${t.customerName}`}
                    title="Delete Ticket"
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
