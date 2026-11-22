import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Clock,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Plus,
  Receipt,
  Sun,
  Ticket,
  UploadCloud,
  Wallet,
  X,
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  AddCashView,
  BanksView,
  WalletStatementView,
} from './components/BankAndWalletViews';
import { DashboardSummary } from './components/DashboardSummary';
import {
  BudgetCalculatorView,
  CustomerProfilesView,
  EntriesManagerView,
  PdfGeneratorView,
  ReportsView,
  SystemView,
} from './components/ManagementViews';
import {
  ConfirmModal,
  DetailModal,
  PrintReportArea,
  SettleUdharModal,
} from './components/Modals';
import { OtherExpenseSection } from './components/OtherExpenseSection';
import { Sidebar } from './components/Sidebar';
import { TicketBookedSection } from './components/TicketBookedSection';
import { UdharSection } from './components/UdharSection';
import { auth, googleProvider } from './firebase';
import {
  clearAllDocsInFirestore,
  clearDayDocsInFirestore,
  createBankDoc,
  createCashAdditionDoc,
  deleteBankDoc,
  deleteCashAdditionDoc,
  deleteExpenseDoc,
  deleteTicketWithUdhar,
  deleteUdharDoc,
  ensureUserLedgerDoc,
  renameOrClearPersonInFirestore,
  settleUdharDoc,
  subscribeUserLedger,
  updateBankDoc,
  updateBudgetDoc,
  upsertExpenseDoc,
  upsertTicketWithUdhar,
  upsertUdharDoc,
  writeFullLedgerToFirestore,
} from './services/firestoreLedger';
import {
  AppView,
  BankAccount,
  DetailModalType,
  ExpenseEntry,
  LedgerDB,
  TicketEntry,
  UdharEntry,
} from './types/ledger';
import {
  getTodayISO,
  normalizeLedgerDB,
} from './utils/ledgerCalculations';

const STORAGE_KEY = 'expenseTrackerLedgerDb_v1';
const THEME_KEY = 'expenseTrackerTheme';

const EMPTY_DB: LedgerDB = {
  banks: [],
  tickets: [],
  udhar: [],
  expenses: [],
  cashAdditions: [],
  allocatedBudget: 0,
};

function hasAnyEntries(ledger: LedgerDB): boolean {
  return (
    ledger.banks.length > 0 ||
    ledger.tickets.length > 0 ||
    ledger.udhar.length > 0 ||
    ledger.expenses.length > 0 ||
    ledger.cashAdditions.length > 0 ||
    ledger.allocatedBudget > 0
  );
}

export default function App() {
  const [localDb, setLocalDb] = useState<LedgerDB>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return normalizeLedgerDB(JSON.parse(saved));
    } catch {
      // Fallback to empty db
    }
    return EMPTY_DB;
  });

  const [cloudDb, setCloudDb] = useState<LedgerDB>(EMPTY_DB);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudSyncedOnce, setCloudSyncedOnce] = useState(false);
  const [dismissedMigration, setDismissedMigration] = useState(false);
  const [migratingLocal, setMigratingLocal] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [globalDate, setGlobalDate] = useState<string>(getTodayISO);
  const [activeView, setActiveView] = useState<AppView>('home-view');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Editing States
  const [editingTicket, setEditingTicket] = useState<TicketEntry | null>(null);
  const [editingUdhar, setEditingUdhar] = useState<UdharEntry | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);

  // Modals
  const [detailType, setDetailType] = useState<DetailModalType>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [settleTarget, setSettleTarget] = useState<UdharEntry | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Delete',
    onConfirm: () => {},
  });

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const budgetDebounceRef = useRef<number | null>(null);

  // Throw async Firestore errors into ErrorBoundary on render
  if (fatalError) {
    throw fatalError;
  }

  const db = user ? cloudDb : localDb;

  // Print Config
  const [printConfig, setPrintConfig] = useState<{
    from: string;
    to: string;
    mode: 'basic' | 'advanced';
  } | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setCloudDb(EMPTY_DB);
        setCloudSyncedOnce(false);
        setDismissedMigration(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    let active = true;
    let unsubscribeLedger: (() => void) | undefined;

    (async () => {
      try {
        await ensureUserLedgerDoc(user.uid);
        if (!active) return;
        unsubscribeLedger = subscribeUserLedger(
          user.uid,
          (nextCloudDb) => {
            if (!active) return;
            setCloudDb(nextCloudDb);
            setCloudSyncedOnce(true);
          },
          (err) => {
            if (active) setFatalError(err);
          }
        );
      } catch (err) {
        if (active) {
          setFatalError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    })();

    return () => {
      active = false;
      if (unsubscribeLedger) unsubscribeLedger();
    };
  }, [authReady, user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localDb));
  }, [localDb]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const handleWheel = () => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && active.type === 'number') {
        active.blur();
      }
    };
    document.addEventListener('wheel', handleWheel, { passive: true });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2800);
  };

  const runCloudOp = (task: () => Promise<void>) => {
    task().catch((err) => {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    });
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Signed in with Google');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in cancelled';
      if (!message.includes('popup-closed-by-user')) {
        showToast('Google sign-in failed');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showToast('Signed out');
    } catch {
      showToast('Sign-out failed');
    }
  };

  const handleMigrateLocalToCloud = async () => {
    if (!user || migratingLocal) return;
    setMigratingLocal(true);
    try {
      await writeFullLedgerToFirestore(user.uid, localDb);
      setDismissedMigration(true);
      showToast('Local data imported to cloud');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setMigratingLocal(false);
    }
  };

  // Bank CRUD
  const handleAddBank = (name: string, initialBalance: number) => {
    const newBank: BankAccount = {
      id: `bank_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      initialBalance,
      createdAt: globalDate,
    };
    if (user) {
      runCloudOp(() => createBankDoc(user.uid, newBank));
    } else {
      setLocalDb((prev) => ({ ...prev, banks: [...prev.banks, newBank] }));
    }
    showToast(`Bank account "${name}" added`);
  };

  const handleUpdateBank = (id: string, name: string, initialBalance: number) => {
    if (user) {
      runCloudOp(() => updateBankDoc(user.uid, id, name, initialBalance));
    } else {
      setLocalDb((prev) => ({
        ...prev,
        banks: prev.banks.map((b) =>
          b.id === id ? { ...b, name, initialBalance } : b
        ),
      }));
    }
    showToast(`Updated "${name}"`);
  };

  const handleDeleteBank = (id: string) => {
    const target = db.banks.find((b) => b.id === id);
    setConfirmState({
      open: true,
      title: 'Delete Bank Account',
      message: `Are you sure you want to remove "${target?.name || 'this bank account'}"? Existing transactions will remain in logs.`,
      confirmLabel: 'Delete Bank',
      onConfirm: () => {
        if (user) {
          runCloudOp(() => deleteBankDoc(user.uid, id));
        } else {
          setLocalDb((prev) => ({
            ...prev,
            banks: prev.banks.filter((b) => b.id !== id),
          }));
        }
        setConfirmState((s) => ({ ...s, open: false }));
        showToast('Bank account removed');
      },
    });
  };

  // Ticket CRUD (with automatic linked Udhar management)
  const handleSaveTicket = (data: Omit<TicketEntry, 'id'>, editId?: string) => {
    const ticketId = editId || `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newTicket: TicketEntry = { id: ticketId, ...data };

    if (user) {
      const existingLinked = db.udhar.find((u) => u.linkedTicketId === ticketId);
      runCloudOp(() =>
        upsertTicketWithUdhar(user.uid, newTicket, Boolean(editId), existingLinked)
      );
    } else {
      setLocalDb((prev) => {
        const nextTickets = editId
          ? prev.tickets.map((t) => (t.id === editId ? newTicket : t))
          : [...prev.tickets, newTicket];

        let nextUdhar = prev.udhar.filter((u) => u.linkedTicketId !== ticketId);
        if (data.receivedIn === 'udhar' && data.customerPaid > 0) {
          const existingLinked = prev.udhar.find((u) => u.linkedTicketId === ticketId);
          nextUdhar = [
            ...nextUdhar,
            {
              id: existingLinked?.id || `udh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              date: data.date,
              personName: data.customerName,
              amount: data.customerPaid,
              note: data.journey ? `Ticket (${data.journey})` : 'Ticket Booking',
              status: existingLinked?.status || 'pending',
              linkedTicketId: ticketId,
              settledDate: existingLinked?.settledDate,
              settledAccountId: existingLinked?.settledAccountId,
            },
          ];
        }

        return { ...prev, tickets: nextTickets, udhar: nextUdhar };
      });
    }

    setEditingTicket(null);
    showToast(editId ? 'Ticket updated' : 'Ticket booked & balances updated');
  };

  const handleDeleteTicket = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Delete Ticket Entry',
      message: 'Delete this ticket booking? Any linked Udhar entry will also be removed and balances recalculated.',
      confirmLabel: 'Delete',
      onConfirm: () => {
        if (user) {
          const linkedIds = db.udhar
            .filter((u) => u.linkedTicketId === id)
            .map((u) => u.id);
          runCloudOp(() => deleteTicketWithUdhar(user.uid, id, linkedIds));
        } else {
          setLocalDb((prev) => ({
            ...prev,
            tickets: prev.tickets.filter((t) => t.id !== id),
            udhar: prev.udhar.filter((u) => u.linkedTicketId !== id),
          }));
        }
        setConfirmState((s) => ({ ...s, open: false }));
        showToast('Ticket entry deleted');
      },
    });
  };

  // Udhar CRUD & Settlement
  const handleSaveUdhar = (
    data: Omit<UdharEntry, 'id' | 'status'>,
    editId?: string
  ) => {
    if (user) {
      const targetId = editId || `udh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const existing = editId ? db.udhar.find((u) => u.id === editId) : undefined;
      const payload: UdharEntry = {
        id: targetId,
        status: existing?.status || 'pending',
        linkedTicketId: existing?.linkedTicketId,
        settledDate: existing?.settledDate,
        settledAccountId: existing?.settledAccountId,
        ...data,
      };
      runCloudOp(() => upsertUdharDoc(user.uid, payload, Boolean(editId)));
    } else {
      setLocalDb((prev) => {
        if (editId) {
          return {
            ...prev,
            udhar: prev.udhar.map((u) =>
              u.id === editId ? { ...u, ...data } : u
            ),
          };
        }
        const created: UdharEntry = {
          id: `udh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          status: 'pending',
          ...data,
        };
        return { ...prev, udhar: [...prev.udhar, created] };
      });
    }

    setEditingUdhar(null);
    showToast(editId ? 'Udhar entry updated' : 'Pending Udhar added');
  };

  const handleDeleteUdhar = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Delete Udhar Entry',
      message: 'Delete this Udhar / Pending Payment entry?',
      confirmLabel: 'Delete',
      onConfirm: () => {
        if (user) {
          runCloudOp(() => deleteUdharDoc(user.uid, id));
        } else {
          setLocalDb((prev) => ({
            ...prev,
            udhar: prev.udhar.filter((u) => u.id !== id),
          }));
        }
        setConfirmState((s) => ({ ...s, open: false }));
        showToast('Udhar entry deleted');
      },
    });
  };

  const handleConfirmSettle = (entryId: string, accountId: string) => {
    if (user) {
      runCloudOp(() => settleUdharDoc(user.uid, entryId, globalDate, accountId));
    } else {
      setLocalDb((prev) => ({
        ...prev,
        udhar: prev.udhar.map((u) =>
          u.id === entryId
            ? {
                ...u,
                status: 'settled',
                settledDate: globalDate,
                settledAccountId: accountId,
              }
            : u
        ),
      }));
    }
    setSettleTarget(null);
    showToast('Udhar marked as Paid & credited to account');
  };

  // Other Expense CRUD
  const handleSaveExpense = (data: Omit<ExpenseEntry, 'id'>, editId?: string) => {
    if (user) {
      const targetId = editId || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      runCloudOp(() =>
        upsertExpenseDoc(user.uid, { id: targetId, ...data }, Boolean(editId))
      );
    } else {
      setLocalDb((prev) => {
        if (editId) {
          return {
            ...prev,
            expenses: prev.expenses.map((e) =>
              e.id === editId ? { id: editId, ...data } : e
            ),
          };
        }
        const created: ExpenseEntry = {
          id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ...data,
        };
        return { ...prev, expenses: [...prev.expenses, created] };
      });
    }

    setEditingExpense(null);
    showToast(editId ? 'Expense updated' : 'Other expense saved');
  };

  const handleDeleteExpense = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Delete Expense',
      message: 'Delete this expense entry? Account balance will recalculate automatically.',
      confirmLabel: 'Delete',
      onConfirm: () => {
        if (user) {
          runCloudOp(() => deleteExpenseDoc(user.uid, id));
        } else {
          setLocalDb((prev) => ({
            ...prev,
            expenses: prev.expenses.filter((e) => e.id !== id),
          }));
        }
        setConfirmState((s) => ({ ...s, open: false }));
        showToast('Expense deleted');
      },
    });
  };

  // Cash Wallet Additions
  const handleAddCash = (amount: number, note: string) => {
    const addition = {
      id: `cash_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: globalDate,
      amount,
      note,
    };
    if (user) {
      runCloudOp(() => createCashAdditionDoc(user.uid, addition));
    } else {
      setLocalDb((prev) => ({
        ...prev,
        cashAdditions: [...prev.cashAdditions, addition],
      }));
    }
    showToast(`₹${amount.toLocaleString('en-IN')} added to Cash Wallet`);
  };

  const handleDeleteCashAddition = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Delete Cash Addition',
      message: 'Remove this cash addition entry from the wallet log?',
      confirmLabel: 'Delete',
      onConfirm: () => {
        if (user) {
          runCloudOp(() => deleteCashAdditionDoc(user.uid, id));
        } else {
          setLocalDb((prev) => ({
            ...prev,
            cashAdditions: prev.cashAdditions.filter((c) => c.id !== id),
          }));
        }
        setConfirmState((s) => ({ ...s, open: false }));
        showToast('Cash entry deleted');
      },
    });
  };

  // Customer Name Management
  const handleRenamePerson = (oldName: string, newName: string) => {
    if (user) {
      runCloudOp(() =>
        renameOrClearPersonInFirestore(user.uid, db, oldName, newName, newName, newName)
      );
    } else {
      const oldKey = oldName.trim().toLowerCase();
      setLocalDb((prev) => ({
        ...prev,
        tickets: prev.tickets.map((t) =>
          t.customerName.trim().toLowerCase() === oldKey
            ? { ...t, customerName: newName }
            : t
        ),
        udhar: prev.udhar.map((u) =>
          u.personName.trim().toLowerCase() === oldKey
            ? { ...u, personName: newName }
            : u
        ),
        expenses: prev.expenses.map((e) =>
          e.paidTo.trim().toLowerCase() === oldKey ? { ...e, paidTo: newName } : e
        ),
      }));
    }
    showToast(`Renamed "${oldName}" to "${newName}"`);
  };

  const handleRemovePersonName = (name: string) => {
    const key = name.trim().toLowerCase();
    setConfirmState({
      open: true,
      title: 'Remove Saved Name',
      message: `Clear "${name}" from saved customer/recipient history? Financial amounts will remain intact.`,
      confirmLabel: 'Remove Name',
      onConfirm: () => {
        if (user) {
          runCloudOp(() =>
            renameOrClearPersonInFirestore(
              user.uid,
              db,
              name,
              'Walk-in Customer',
              'Unnamed',
              'Misc'
            )
          );
        } else {
          setLocalDb((prev) => ({
            ...prev,
            tickets: prev.tickets.map((t) =>
              t.customerName.trim().toLowerCase() === key
                ? { ...t, customerName: 'Walk-in Customer' }
                : t
            ),
            udhar: prev.udhar.map((u) =>
              u.personName.trim().toLowerCase() === key
                ? { ...u, personName: 'Unnamed' }
                : u
            ),
            expenses: prev.expenses.map((e) =>
              e.paidTo.trim().toLowerCase() === key ? { ...e, paidTo: 'Misc' } : e
            ),
          }));
        }
        setConfirmState((s) => ({ ...s, open: false }));
        showToast('Name removed from saved list');
      },
    });
  };

  // Budget Update
  const handleUpdateBudget = (allocatedBudget: number) => {
    if (user) {
      setCloudDb((prev) => ({ ...prev, allocatedBudget }));
      if (budgetDebounceRef.current) {
        window.clearTimeout(budgetDebounceRef.current);
      }
      budgetDebounceRef.current = window.setTimeout(() => {
        runCloudOp(() => updateBudgetDoc(user.uid, allocatedBudget));
      }, 350);
    } else {
      setLocalDb((prev) => ({ ...prev, allocatedBudget }));
    }
  };

  // Backup / Restore / Reset
  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute('download', `Expense_Tracker_Backup_${getTodayISO()}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    showToast('Backup exported');
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (
          parsed &&
          (Array.isArray(parsed.banks) ||
            Array.isArray(parsed.tickets) ||
            Array.isArray(parsed.udhar) ||
            Array.isArray(parsed.expenses))
        ) {
          const normalized = normalizeLedgerDB(parsed);
          if (user) {
            runCloudOp(async () => {
              await clearAllDocsInFirestore(user.uid, db);
              await writeFullLedgerToFirestore(user.uid, normalized);
            });
          } else {
            setLocalDb(normalized);
          }
          setActiveView('home-view');
          showToast('Backup restored successfully');
        } else {
          showToast('Invalid backup file format');
        }
      } catch {
        showToast('Failed to read backup file');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDay = () => {
    setConfirmState({
      open: true,
      title: 'Reset Selected Day',
      message: `Delete all Tickets, Udhar entries, Other Expenses, and Cash Additions recorded on ${globalDate}?`,
      confirmLabel: 'Reset Day',
      onConfirm: () => {
        if (user) {
          runCloudOp(() => clearDayDocsInFirestore(user.uid, db, globalDate));
        } else {
          setLocalDb((prev) => ({
            ...prev,
            tickets: prev.tickets.filter((t) => t.date !== globalDate),
            udhar: prev.udhar.filter((u) => u.date !== globalDate),
            expenses: prev.expenses.filter((e) => e.date !== globalDate),
            cashAdditions: prev.cashAdditions.filter((c) => c.date !== globalDate),
          }));
        }
        setConfirmState((s) => ({ ...s, open: false }));
        showToast(`Cleared entries for ${globalDate}`);
      },
    });
  };

  const handleResetAll = () => {
    setConfirmState({
      open: true,
      title: 'Reset All Data',
      message: 'This will permanently erase all Bank Accounts, Tickets, Udhar, Expenses, and Cash Wallet history. Continue?',
      confirmLabel: 'Erase Everything',
      onConfirm: () => {
        if (user) {
          runCloudOp(() => clearAllDocsInFirestore(user.uid, db));
        } else {
          setLocalDb(EMPTY_DB);
        }
        setConfirmState((s) => ({ ...s, open: false }));
        setActiveView('home-view');
        showToast('All data reset');
      },
    });
  };

  const handleGeneratePdf = (
    from: string,
    to: string,
    mode: 'basic' | 'advanced'
  ) => {
    setPrintConfig({ from, to, mode });
    window.setTimeout(() => {
      window.print();
    }, 80);
  };

  const scrollToSection = (elementId: string) => {
    setActiveView('home-view');
    setFabOpen(false);
    window.setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const todayTickets = db.tickets.filter((t) => t.date === globalDate);
  const todayExpenses = db.expenses.filter((e) => e.date === globalDate);

  const showLocalImportBanner =
    Boolean(user) &&
    cloudSyncedOnce &&
    !dismissedMigration &&
    !hasAnyEntries(cloudDb) &&
    hasAnyEntries(localDb);

  return (
    <>
      <div
        id="app-shell"
        className="min-h-screen bg-[#F4F6F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 transition-colors"
      >
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeView={activeView}
          onNavigate={setActiveView}
          db={db}
          user={user}
          onSignIn={() => {
            void handleSignIn();
          }}
          onSignOut={() => {
            void handleSignOut();
          }}
        />

        {/* Compact Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open Menu"
                className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-lg bg-[#1E3C72] hover:bg-[#2A5298] text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="hidden sm:inline font-display font-bold text-base text-slate-900 dark:text-slate-100 whitespace-nowrap">
                Expense Tracker
              </span>
            </div>

            <div className="flex-1 max-w-xs">
              <input
                type="date"
                aria-label="Global Working Date"
                value={globalDate}
                onChange={(e) => setGlobalDate(e.target.value)}
                className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleSignOut();
                  }}
                  aria-label="Sign Out"
                  className="min-h-[42px] px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  <span className="hidden sm:inline max-w-[110px] truncate">
                    {user.displayName?.split(' ')[0] || 'Sign Out'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void handleSignIn();
                  }}
                  aria-label="Sign In with Google"
                  className="min-h-[42px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#1E3C72] hover:bg-[#2A5298] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                aria-label="Toggle Light/Dark Theme"
                className="min-h-[42px] px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-slate-700" />
                    <span className="hidden sm:inline">Dark</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Canvas */}
        <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
          {showLocalImportBanner && (
            <div className="mb-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                <UploadCloud className="w-5 h-5 text-[#1E3C72] dark:text-blue-400 shrink-0" />
                <span>
                  Local entries exist on this device. Import them into your signed-in cloud account?
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={migratingLocal}
                  onClick={() => {
                    void handleMigrateLocalToCloud();
                  }}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#1E3C72] hover:bg-[#2A5298] disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {migratingLocal ? 'Importing...' : 'Import to Cloud'}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedMigration(true)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Keep Separate
                </button>
              </div>
            </div>
          )}

          {activeView === 'home-view' && (
            <div className="space-y-5">
              <DashboardSummary
                db={db}
                globalDate={globalDate}
                onOpenDetail={(type) => {
                  setSelectedCustomer(null);
                  setDetailType(type);
                }}
                onAddBank={handleAddBank}
                onDeleteBank={handleDeleteBank}
                onScrollToUdhar={() => scrollToSection('form-udhar-section')}
                onOpenBanksView={() => setActiveView('banks-view')}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-7">
                  <TicketBookedSection
                    banks={db.banks}
                    globalDate={globalDate}
                    todayTickets={todayTickets}
                    editingTicket={editingTicket}
                    onCancelEdit={() => setEditingTicket(null)}
                    onSaveTicket={handleSaveTicket}
                    onDeleteTicket={handleDeleteTicket}
                  />
                </div>

                <div className="lg:col-span-5 space-y-5">
                  <UdharSection
                    banks={db.banks}
                    globalDate={globalDate}
                    udharList={db.udhar}
                    editingUdhar={editingUdhar}
                    onCancelEdit={() => setEditingUdhar(null)}
                    onSaveUdhar={handleSaveUdhar}
                    onRequestSettle={(entry) => setSettleTarget(entry)}
                    onDeleteUdhar={handleDeleteUdhar}
                  />

                  <OtherExpenseSection
                    banks={db.banks}
                    globalDate={globalDate}
                    todayExpenses={todayExpenses}
                    editingExpense={editingExpense}
                    onCancelEdit={() => setEditingExpense(null)}
                    onSaveExpense={handleSaveExpense}
                    onDeleteExpense={handleDeleteExpense}
                  />
                </div>
              </div>
            </div>
          )}

          {activeView === 'banks-view' && (
            <BanksView
              db={db}
              onAddBank={handleAddBank}
              onUpdateBank={handleUpdateBank}
              onDeleteBank={handleDeleteBank}
              onBackHome={() => setActiveView('home-view')}
            />
          )}

          {activeView === 'add-cash-view' && (
            <AddCashView
              globalDate={globalDate}
              onAddCash={handleAddCash}
              onBackHome={() => setActiveView('home-view')}
            />
          )}

          {activeView === 'wallet-statement-view' && (
            <WalletStatementView
              db={db}
              onBackHome={() => setActiveView('home-view')}
            />
          )}

          {activeView === 'customer-profiles-view' && (
            <CustomerProfilesView
              db={db}
              onSelectCustomer={(name) => {
                setDetailType(null);
                setSelectedCustomer(name);
              }}
              onRenamePerson={handleRenamePerson}
              onRemovePersonName={handleRemovePersonName}
              onBackHome={() => setActiveView('home-view')}
            />
          )}

          {activeView === 'entries-manager-view' && (
            <EntriesManagerView
              db={db}
              globalDate={globalDate}
              onEditTicket={(t) => {
                setEditingTicket(t);
                scrollToSection('form-ticket-section');
              }}
              onDeleteTicket={handleDeleteTicket}
              onEditUdhar={(u) => {
                setEditingUdhar(u);
                scrollToSection('form-udhar-section');
              }}
              onDeleteUdhar={handleDeleteUdhar}
              onEditExpense={(e) => {
                setEditingExpense(e);
                scrollToSection('form-expense-section');
              }}
              onDeleteExpense={handleDeleteExpense}
              onDeleteCashAddition={handleDeleteCashAddition}
              onBackHome={() => setActiveView('home-view')}
            />
          )}

          {activeView === 'budget-calculator-view' && (
            <BudgetCalculatorView
              db={db}
              onUpdateBudget={handleUpdateBudget}
              onBackHome={() => setActiveView('home-view')}
            />
          )}

          {activeView === 'reports-view' && (
            <ReportsView
              db={db}
              globalDate={globalDate}
              onBackHome={() => setActiveView('home-view')}
            />
          )}

          {activeView === 'pdf-generator-view' && (
            <PdfGeneratorView
              globalDate={globalDate}
              onGeneratePdf={handleGeneratePdf}
              onBackHome={() => setActiveView('home-view')}
            />
          )}

          {activeView === 'system-view' && (
            <SystemView
              db={db}
              globalDate={globalDate}
              isCloudSynced={Boolean(user)}
              onExportJson={handleExportJson}
              onImportJson={handleImportJson}
              onResetDay={handleResetDay}
              onResetAll={handleResetAll}
              onBackHome={() => setActiveView('home-view')}
            />
          )}
        </main>

        {/* Quick-Action Floating Action Button */}
        <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-2">
          {fabOpen && (
            <div className="flex flex-col items-end gap-2 mb-1">
              <button
                type="button"
                onClick={() => scrollToSection('form-ticket-section')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <Ticket className="w-4 h-4 text-emerald-600" />
                <span>Add Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('form-udhar-section')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <Clock className="w-4 h-4 text-red-600" />
                <span>Add Udhar</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('form-expense-section')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>Other Expense</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFabOpen(false);
                  setActiveView('banks-view');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <Building2 className="w-4 h-4 text-[#1E3C72] dark:text-blue-400" />
                <span>Manage Banks</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFabOpen(false);
                  setActiveView('add-cash-view');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <Wallet className="w-4 h-4 text-amber-600" />
                <span>Add Cash</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setFabOpen((v) => !v)}
            aria-label={fabOpen ? 'Close Quick Actions' : 'Quick Actions'}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-transform duration-150 ${
              fabOpen ? 'bg-red-600 rotate-45' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {fabOpen ? <X className="w-5 h-5 -rotate-45" /> : <Plus className="w-6 h-6" />}
          </button>
        </div>

        {/* Toast Feedback */}
        {toastMsg && (
          <div
            role="status"
            className="fixed bottom-5 left-5 z-40 max-w-xs px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-lg"
          >
            {toastMsg}
          </div>
        )}

        {/* Modals */}
        <DetailModal
          db={db}
          globalDate={globalDate}
          detailType={detailType}
          customerName={selectedCustomer}
          onClose={() => {
            setDetailType(null);
            setSelectedCustomer(null);
          }}
          onRequestSettle={(entry) => {
            setSettleTarget(entry);
          }}
          onDeleteUdhar={handleDeleteUdhar}
          onDeleteTicket={handleDeleteTicket}
          onDeleteExpense={handleDeleteExpense}
        />

        <SettleUdharModal
          entry={settleTarget}
          db={db}
          onClose={() => setSettleTarget(null)}
          onConfirmSettle={handleConfirmSettle}
        />

        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
        />
      </div>

      {/* Print-Only PDF Statement Area */}
      <PrintReportArea db={db} config={printConfig} />
    </>
  );
}
