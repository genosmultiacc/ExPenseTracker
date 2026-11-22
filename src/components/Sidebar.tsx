import React, { useState } from 'react';
import {
  Building2,
  Calculator,
  ChevronDown,
  FileSpreadsheet,
  FolderCog,
  HardDriveDownload,
  Home,
  Landmark,
  LogIn,
  LogOut,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { AppView, LedgerDB } from '../types/ledger';
import { formatINR, getBankBalance, getCashWalletBalance, getCombinedBankBalance } from '../utils/ledgerCalculations';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  db: LedgerDB;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeView,
  onNavigate,
  db,
  user,
  onSignIn,
  onSignOut,
}) => {
  const [openGroup, setOpenGroup] = useState<'banks' | 'wallet' | 'reports' | null>('banks');

  const toggleGroup = (group: 'banks' | 'wallet' | 'reports') => {
    setOpenGroup((prev) => (prev === group ? null : group));
  };

  const navigateTo = (view: AppView) => {
    onNavigate(view);
    onClose();
  };

  const combinedBank = getCombinedBankBalance(db);
  const cashBal = getCashWalletBalance(db);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Menu Options"
        className={`fixed top-0 left-0 z-50 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl transform transition-transform duration-200 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#1E3C72] dark:bg-slate-950 text-white border-b border-white/10">
          <div>
            <h2 className="font-display text-base font-bold tracking-tight">Menu Options</h2>
            <p className="text-xs text-blue-100/80">Expense Tracker</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Menu"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
          <button
            type="button"
            onClick={() => navigateTo('home-view')}
            className={`w-full min-h-[48px] px-5 py-3 flex items-center gap-3 text-left text-sm font-semibold transition-colors ${
              activeView === 'home-view'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#1E3C72] dark:text-blue-400'
                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Home Dashboard</span>
          </button>

          {/* Bank Accounts Section with Individual Balances */}
          <div>
            <button
              type="button"
              onClick={() => toggleGroup('banks')}
              className="w-full min-h-[48px] px-5 py-3 flex items-center justify-between text-left text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Landmark className="w-4 h-4 shrink-0 text-[#1E3C72] dark:text-blue-400" />
                <span>Bank Accounts ({db.banks.length})</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-150 ${
                  openGroup === 'banks' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openGroup === 'banks' && (
              <div className="bg-slate-50 dark:bg-slate-950/60 px-4 py-3 space-y-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span>Combined Bank Total</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {formatINR(combinedBank)}
                  </span>
                </div>

                {db.banks.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
                    No bank accounts added yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {db.banks.map((bank) => {
                      const bal = getBankBalance(db, bank.id);
                      return (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => navigateTo('banks-view')}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 text-left transition-colors"
                        >
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate pr-2">
                            {bank.name}
                          </span>
                          <span
                            className={`font-mono text-xs font-bold shrink-0 ${
                              bal < 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {formatINR(bal)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigateTo('banks-view')}
                  className="w-full min-h-[40px] mt-1 px-3 py-2 rounded-lg text-xs font-semibold text-[#1E3C72] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Manage Banks & Statements</span>
                </button>
              </div>
            )}
          </div>

          {/* Cash Wallet Section */}
          <div>
            <button
              type="button"
              onClick={() => toggleGroup('wallet')}
              className="w-full min-h-[48px] px-5 py-3 flex items-center justify-between text-left text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Wallet className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Cash Wallet</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatINR(cashBal)}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-150 ${
                    openGroup === 'wallet' ? 'rotate-180' : ''
                  }`}
                />
              </span>
            </button>
            {openGroup === 'wallet' && (
              <div className="bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => navigateTo('add-cash-view')}
                  className="w-full min-h-[44px] pl-12 pr-5 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                >
                  Add Cash Amount
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('wallet-statement-view')}
                  className="w-full min-h-[44px] pl-12 pr-5 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                >
                  Wallet Logs
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigateTo('customer-profiles-view')}
            className={`w-full min-h-[48px] px-5 py-3 flex items-center gap-3 text-left text-sm font-semibold transition-colors ${
              activeView === 'customer-profiles-view'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#1E3C72] dark:text-blue-400'
                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Customers & Recipients</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('entries-manager-view')}
            className={`w-full min-h-[48px] px-5 py-3 flex items-center gap-3 text-left text-sm font-semibold transition-colors ${
              activeView === 'entries-manager-view'
                ? 'bg-blue-50 dark:bg-slate-800 text-[#1E3C72] dark:text-blue-400'
                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <FolderCog className="w-4 h-4 shrink-0" />
            <span>Entries Manager (Edit / Delete)</span>
          </button>

          {/* Budget & Reports */}
          <div>
            <button
              type="button"
              onClick={() => toggleGroup('reports')}
              className="w-full min-h-[48px] px-5 py-3 flex items-center justify-between text-left text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Budget & Reports</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-150 ${
                  openGroup === 'reports' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openGroup === 'reports' && (
              <div className="bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => navigateTo('budget-calculator-view')}
                  className="w-full min-h-[44px] pl-12 pr-5 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Budget Calculator</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('reports-view')}
                  className="w-full min-h-[44px] pl-12 pr-5 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Date & Monthly Reports</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('pdf-generator-view')}
                  className="w-full min-h-[44px] pl-12 pr-5 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>PDF Report Generator</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('system-view')}
                  className="w-full min-h-[44px] pl-12 pr-5 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors"
                >
                  <HardDriveDownload className="w-3.5 h-3.5" />
                  <span>Backup, Restore & Reset</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          {user ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user.displayName || 'Cloud Account'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSignIn();
                onClose();
              }}
              className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-[#1E3C72] hover:bg-[#2A5298] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google (Cloud Sync)</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
