import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firestoreDb, handleFirestoreError, OperationType } from '../firebase';
import {
  BankAccount,
  CashAddition,
  ExpenseEntry,
  LedgerDB,
  TicketEntry,
  UdharEntry,
} from '../types/ledger';
import { getTodayISO } from '../utils/ledgerCalculations';

function sanitizeId(raw: string, prefix: string): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
  if (cleaned.length >= 1) return cleaned;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function sanitizeDate(raw: string | undefined): string {
  const trimmed = String(raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return getTodayISO();
}

function clampStr(raw: string | undefined, maxLen: number, fallback = ''): string {
  const str = String(raw ?? '').trim();
  if (!str) return fallback;
  return str.slice(0, maxLen);
}

function safePositiveNumber(val: unknown, minFallback = 0.01): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return minFallback;
  return num;
}

function safeNonNegativeNumber(val: unknown): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

function safeNumber(val: unknown): number {
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
}

export async function ensureUserLedgerDoc(userId: string): Promise<void> {
  const userPath = `users/${userId}`;
  const userRef = doc(firestoreDb, 'users', userId);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        ownerId: userId,
        allocatedBudget: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeUserLedger(
  userId: string,
  onUpdate: (db: LedgerDB) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const state: LedgerDB = {
    banks: [],
    tickets: [],
    udhar: [],
    expenses: [],
    cashAdditions: [],
    allocatedBudget: 0,
  };

  let initializedFlags = {
    user: false,
    banks: false,
    tickets: false,
    udhar: false,
    expenses: false,
    cash: false,
  };

  const emitIfReady = () => {
    if (
      initializedFlags.user ||
      initializedFlags.banks ||
      initializedFlags.tickets ||
      initializedFlags.udhar ||
      initializedFlags.expenses ||
      initializedFlags.cash
    ) {
      onUpdate({
        banks: [...state.banks],
        tickets: [...state.tickets],
        udhar: [...state.udhar],
        expenses: [...state.expenses],
        cashAdditions: [...state.cashAdditions],
        allocatedBudget: state.allocatedBudget,
      });
    }
  };

  const handleListenerError = (
    error: unknown,
    op: OperationType,
    path: string
  ) => {
    try {
      handleFirestoreError(error, op, path);
    } catch (wrapped) {
      onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
    }
  };

  const unsubUser = onSnapshot(
    doc(firestoreDb, 'users', userId),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        state.allocatedBudget = safeNonNegativeNumber(data.allocatedBudget);
      } else {
        state.allocatedBudget = 0;
      }
      initializedFlags.user = true;
      emitIfReady();
    },
    (err) => handleListenerError(err, OperationType.GET, `users/${userId}`)
  );

  const banksPath = `users/${userId}/banks`;
  const unsubBanks = onSnapshot(
    query(collection(firestoreDb, 'users', userId, 'banks'), where('ownerId', '==', userId)),
    (snap) => {
      state.banks = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name || ''),
          initialBalance: safeNumber(data.initialBalance),
          createdAt: String(data.createdDate || getTodayISO()),
        } satisfies BankAccount;
      });
      initializedFlags.banks = true;
      emitIfReady();
    },
    (err) => handleListenerError(err, OperationType.LIST, banksPath)
  );

  const ticketsPath = `users/${userId}/tickets`;
  const unsubTickets = onSnapshot(
    query(collection(firestoreDb, 'users', userId, 'tickets'), where('ownerId', '==', userId)),
    (snap) => {
      state.tickets = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          date: String(data.date || getTodayISO()),
          customerName: String(data.customerName || ''),
          journey: String(data.journey || ''),
          ticketCost: safeNonNegativeNumber(data.ticketCost),
          serviceCharge: safeNumber(data.serviceCharge),
          customerPaid: safeNonNegativeNumber(data.customerPaid),
          paidFromAccountId: String(data.paidFromAccountId || 'cash'),
          receivedIn: String(data.receivedIn || 'cash'),
        } satisfies TicketEntry;
      });
      initializedFlags.tickets = true;
      emitIfReady();
    },
    (err) => handleListenerError(err, OperationType.LIST, ticketsPath)
  );

  const udharPath = `users/${userId}/udhar`;
  const unsubUdhar = onSnapshot(
    query(collection(firestoreDb, 'users', userId, 'udhar'), where('ownerId', '==', userId)),
    (snap) => {
      state.udhar = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          date: String(data.date || getTodayISO()),
          personName: String(data.personName || ''),
          amount: safeNonNegativeNumber(data.amount),
          note: String(data.note || ''),
          status: data.status === 'settled' ? 'settled' : 'pending',
          linkedTicketId: data.linkedTicketId ? String(data.linkedTicketId) : undefined,
          settledDate: data.settledDate ? String(data.settledDate) : undefined,
          settledAccountId: data.settledAccountId ? String(data.settledAccountId) : undefined,
        } satisfies UdharEntry;
      });
      initializedFlags.udhar = true;
      emitIfReady();
    },
    (err) => handleListenerError(err, OperationType.LIST, udharPath)
  );

  const expensesPath = `users/${userId}/expenses`;
  const unsubExpenses = onSnapshot(
    query(collection(firestoreDb, 'users', userId, 'expenses'), where('ownerId', '==', userId)),
    (snap) => {
      state.expenses = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          date: String(data.date || getTodayISO()),
          category: String(data.category || 'Misc'),
          paidTo: String(data.paidTo || 'Misc'),
          amount: safeNonNegativeNumber(data.amount),
          paidFromAccountId: String(data.paidFromAccountId || 'cash'),
        } satisfies ExpenseEntry;
      });
      initializedFlags.expenses = true;
      emitIfReady();
    },
    (err) => handleListenerError(err, OperationType.LIST, expensesPath)
  );

  const cashPath = `users/${userId}/cashAdditions`;
  const unsubCash = onSnapshot(
    query(
      collection(firestoreDb, 'users', userId, 'cashAdditions'),
      where('ownerId', '==', userId)
    ),
    (snap) => {
      state.cashAdditions = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          date: String(data.date || getTodayISO()),
          amount: safeNonNegativeNumber(data.amount),
          note: String(data.note || ''),
        } satisfies CashAddition;
      });
      initializedFlags.cash = true;
      emitIfReady();
    },
    (err) => handleListenerError(err, OperationType.LIST, cashPath)
  );

  return () => {
    unsubUser();
    unsubBanks();
    unsubTickets();
    unsubUdhar();
    unsubExpenses();
    unsubCash();
  };
}

export async function createBankDoc(
  userId: string,
  bank: BankAccount
): Promise<void> {
  const bankId = sanitizeId(bank.id, 'bank');
  const path = `users/${userId}/banks/${bankId}`;
  try {
    await ensureUserLedgerDoc(userId);
    await setDoc(doc(firestoreDb, 'users', userId, 'banks', bankId), {
      ownerId: userId,
      name: clampStr(bank.name, 80, 'Bank Account'),
      initialBalance: safeNumber(bank.initialBalance),
      createdDate: sanitizeDate(bank.createdAt),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBankDoc(
  userId: string,
  bankId: string,
  name: string,
  initialBalance: number
): Promise<void> {
  const path = `users/${userId}/banks/${bankId}`;
  try {
    await updateDoc(doc(firestoreDb, 'users', userId, 'banks', bankId), {
      name: clampStr(name, 80, 'Bank Account'),
      initialBalance: safeNumber(initialBalance),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBankDoc(userId: string, bankId: string): Promise<void> {
  const path = `users/${userId}/banks/${bankId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'users', userId, 'banks', bankId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertTicketWithUdhar(
  userId: string,
  ticket: TicketEntry,
  isEdit: boolean,
  existingLinkedUdhar: UdharEntry | undefined
): Promise<void> {
  const ticketId = sanitizeId(ticket.id, 'tkt');
  const ticketPath = `users/${userId}/tickets/${ticketId}`;
  try {
    await ensureUserLedgerDoc(userId);
    const ticketRef = doc(firestoreDb, 'users', userId, 'tickets', ticketId);
    const ticketPayload = {
      date: sanitizeDate(ticket.date),
      customerName: clampStr(ticket.customerName, 100, 'Customer'),
      journey: clampStr(ticket.journey, 80, ''),
      ticketCost: safeNonNegativeNumber(ticket.ticketCost),
      serviceCharge: safeNumber(ticket.serviceCharge),
      customerPaid: safeNonNegativeNumber(ticket.customerPaid),
      paidFromAccountId: sanitizeId(ticket.paidFromAccountId, 'cash'),
      receivedIn: sanitizeId(ticket.receivedIn, 'cash'),
      updatedAt: serverTimestamp(),
    };

    if (isEdit) {
      await updateDoc(ticketRef, ticketPayload);
    } else {
      await setDoc(ticketRef, {
        ownerId: userId,
        ...ticketPayload,
        createdAt: serverTimestamp(),
      });
    }

    if (ticket.receivedIn === 'udhar' && ticket.customerPaid > 0) {
      const udharNote = ticket.journey
        ? clampStr(`Ticket (${ticket.journey})`, 200)
        : 'Ticket Booking';

      if (existingLinkedUdhar) {
        if (existingLinkedUdhar.status === 'pending') {
          await updateDoc(doc(firestoreDb, 'users', userId, 'udhar', existingLinkedUdhar.id), {
            date: sanitizeDate(ticket.date),
            personName: clampStr(ticket.customerName, 100, 'Customer'),
            amount: safePositiveNumber(ticket.customerPaid),
            note: udharNote,
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        const udharId = sanitizeId(`udh_${ticketId}`, 'udh');
        await setDoc(doc(firestoreDb, 'users', userId, 'udhar', udharId), {
          ownerId: userId,
          date: sanitizeDate(ticket.date),
          personName: clampStr(ticket.customerName, 100, 'Customer'),
          amount: safePositiveNumber(ticket.customerPaid),
          note: udharNote,
          status: 'pending',
          linkedTicketId: ticketId,
          settledDate: '',
          settledAccountId: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } else if (existingLinkedUdhar) {
      await deleteDoc(doc(firestoreDb, 'users', userId, 'udhar', existingLinkedUdhar.id));
    }
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, ticketPath);
  }
}

export async function deleteTicketWithUdhar(
  userId: string,
  ticketId: string,
  linkedUdharIds: string[]
): Promise<void> {
  const path = `users/${userId}/tickets/${ticketId}`;
  try {
    const batch = writeBatch(firestoreDb);
    batch.delete(doc(firestoreDb, 'users', userId, 'tickets', ticketId));
    for (const uId of linkedUdharIds) {
      batch.delete(doc(firestoreDb, 'users', userId, 'udhar', uId));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertUdharDoc(
  userId: string,
  udhar: UdharEntry,
  isEdit: boolean
): Promise<void> {
  const udharId = sanitizeId(udhar.id, 'udh');
  const path = `users/${userId}/udhar/${udharId}`;
  try {
    await ensureUserLedgerDoc(userId);
    const ref = doc(firestoreDb, 'users', userId, 'udhar', udharId);
    if (isEdit) {
      await updateDoc(ref, {
        date: sanitizeDate(udhar.date),
        personName: clampStr(udhar.personName, 100, 'Person'),
        amount: safePositiveNumber(udhar.amount),
        note: clampStr(udhar.note, 200, ''),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: userId,
        date: sanitizeDate(udhar.date),
        personName: clampStr(udhar.personName, 100, 'Person'),
        amount: safePositiveNumber(udhar.amount),
        note: clampStr(udhar.note, 200, ''),
        status: 'pending',
        linkedTicketId: udhar.linkedTicketId ? sanitizeId(udhar.linkedTicketId, 'tkt') : '',
        settledDate: '',
        settledAccountId: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function settleUdharDoc(
  userId: string,
  udharId: string,
  settledDate: string,
  settledAccountId: string
): Promise<void> {
  const path = `users/${userId}/udhar/${udharId}`;
  try {
    await updateDoc(doc(firestoreDb, 'users', userId, 'udhar', udharId), {
      status: 'settled',
      settledDate: sanitizeDate(settledDate),
      settledAccountId: sanitizeId(settledAccountId, 'cash'),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUdharDoc(userId: string, udharId: string): Promise<void> {
  const path = `users/${userId}/udhar/${udharId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'users', userId, 'udhar', udharId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertExpenseDoc(
  userId: string,
  expense: ExpenseEntry,
  isEdit: boolean
): Promise<void> {
  const expenseId = sanitizeId(expense.id, 'exp');
  const path = `users/${userId}/expenses/${expenseId}`;
  try {
    await ensureUserLedgerDoc(userId);
    const ref = doc(firestoreDb, 'users', userId, 'expenses', expenseId);
    const payload = {
      date: sanitizeDate(expense.date),
      category: clampStr(expense.category, 80, 'General'),
      paidTo: clampStr(expense.paidTo, 100, 'Recipient'),
      amount: safePositiveNumber(expense.amount),
      paidFromAccountId: sanitizeId(expense.paidFromAccountId, 'cash'),
      updatedAt: serverTimestamp(),
    };
    if (isEdit) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
        ownerId: userId,
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteExpenseDoc(userId: string, expenseId: string): Promise<void> {
  const path = `users/${userId}/expenses/${expenseId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'users', userId, 'expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createCashAdditionDoc(
  userId: string,
  addition: CashAddition
): Promise<void> {
  const cashId = sanitizeId(addition.id, 'cash');
  const path = `users/${userId}/cashAdditions/${cashId}`;
  try {
    await ensureUserLedgerDoc(userId);
    await setDoc(doc(firestoreDb, 'users', userId, 'cashAdditions', cashId), {
      ownerId: userId,
      date: sanitizeDate(addition.date),
      amount: safePositiveNumber(addition.amount),
      note: clampStr(addition.note, 150, ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCashAdditionDoc(userId: string, cashId: string): Promise<void> {
  const path = `users/${userId}/cashAdditions/${cashId}`;
  try {
    await deleteDoc(doc(firestoreDb, 'users', userId, 'cashAdditions', cashId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateBudgetDoc(
  userId: string,
  allocatedBudget: number
): Promise<void> {
  const path = `users/${userId}`;
  try {
    await ensureUserLedgerDoc(userId);
    await updateDoc(doc(firestoreDb, 'users', userId), {
      allocatedBudget: safeNonNegativeNumber(allocatedBudget),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function renameOrClearPersonInFirestore(
  userId: string,
  db: LedgerDB,
  oldName: string,
  newTicketName: string,
  newUdharName: string,
  newExpenseName: string
): Promise<void> {
  const oldKey = oldName.trim().toLowerCase();
  const path = `users/${userId}`;
  try {
    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    db.tickets.forEach((t) => {
      if (t.customerName.trim().toLowerCase() === oldKey) {
        ops.push((b) =>
          b.update(doc(firestoreDb, 'users', userId, 'tickets', t.id), {
            customerName: clampStr(newTicketName, 100, 'Walk-in Customer'),
            updatedAt: serverTimestamp(),
          })
        );
      }
    });

    db.udhar.forEach((u) => {
      if (u.status === 'pending' && u.personName.trim().toLowerCase() === oldKey) {
        ops.push((b) =>
          b.update(doc(firestoreDb, 'users', userId, 'udhar', u.id), {
            personName: clampStr(newUdharName, 100, 'Unnamed'),
            updatedAt: serverTimestamp(),
          })
        );
      }
    });

    db.expenses.forEach((e) => {
      if (e.paidTo.trim().toLowerCase() === oldKey) {
        ops.push((b) =>
          b.update(doc(firestoreDb, 'users', userId, 'expenses', e.id), {
            paidTo: clampStr(newExpenseName, 100, 'Misc'),
            updatedAt: serverTimestamp(),
          })
        );
      }
    });

    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(firestoreDb);
      ops.slice(i, i + 400).forEach((fn) => fn(batch));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function clearDayDocsInFirestore(
  userId: string,
  db: LedgerDB,
  targetDate: string
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
    db.tickets
      .filter((t) => t.date === targetDate)
      .forEach((t) => ops.push((b) => b.delete(doc(firestoreDb, 'users', userId, 'tickets', t.id))));
    db.udhar
      .filter((u) => u.date === targetDate)
      .forEach((u) => ops.push((b) => b.delete(doc(firestoreDb, 'users', userId, 'udhar', u.id))));
    db.expenses
      .filter((e) => e.date === targetDate)
      .forEach((e) => ops.push((b) => b.delete(doc(firestoreDb, 'users', userId, 'expenses', e.id))));
    db.cashAdditions
      .filter((c) => c.date === targetDate)
      .forEach((c) =>
        ops.push((b) => b.delete(doc(firestoreDb, 'users', userId, 'cashAdditions', c.id)))
      );

    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(firestoreDb);
      ops.slice(i, i + 400).forEach((fn) => fn(batch));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllDocsInFirestore(
  userId: string,
  db: LedgerDB
): Promise<void> {
  const path = `users/${userId}`;
  try {
    await ensureUserLedgerDoc(userId);
    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    db.banks.forEach((bk) =>
      ops.push((b) => b.delete(doc(firestoreDb, 'users', userId, 'banks', bk.id)))
    );
    db.tickets.forEach((t) =>
      ops.push((b) => b.delete(doc(firestoreDb, 'users', userId, 'tickets', t.id)))
    );
    db.udhar.forEach((u) =>
      ops.push((b) => b.delete(doc(firestoreDb, 'users', userId, 'udhar', u.id)))
    );
    db.expenses.forEach((e) =>
      ops.push((b) => b.delete(doc(firestoreDb, 'users', userId, 'expenses', e.id)))
    );
    db.cashAdditions.forEach((c) =>
      ops.push((b) => b.delete(doc(firestoreDb, 'users', userId, 'cashAdditions', c.id)))
    );

    ops.push((b) =>
      b.update(doc(firestoreDb, 'users', userId), {
        allocatedBudget: 0,
        updatedAt: serverTimestamp(),
      })
    );

    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(firestoreDb);
      ops.slice(i, i + 400).forEach((fn) => fn(batch));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function writeFullLedgerToFirestore(
  userId: string,
  ledger: LedgerDB
): Promise<void> {
  const path = `users/${userId}`;
  try {
    await ensureUserLedgerDoc(userId);

    const bankIdMap = new Map<string, string>();
    const ticketIdMap = new Map<string, string>();

    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    ops.push((b) =>
      b.update(doc(firestoreDb, 'users', userId), {
        allocatedBudget: safeNonNegativeNumber(ledger.allocatedBudget),
        updatedAt: serverTimestamp(),
      })
    );

    ledger.banks.forEach((bk) => {
      const id = sanitizeId(bk.id, 'bank');
      bankIdMap.set(bk.id, id);
      ops.push((b) =>
        b.set(doc(firestoreDb, 'users', userId, 'banks', id), {
          ownerId: userId,
          name: clampStr(bk.name, 80, 'Bank Account'),
          initialBalance: safeNumber(bk.initialBalance),
          createdDate: sanitizeDate(bk.createdAt),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    const resolveAccount = (raw: string, fallback = 'cash') => {
      if (bankIdMap.has(raw)) return bankIdMap.get(raw)!;
      return sanitizeId(raw, fallback);
    };

    ledger.tickets.forEach((t) => {
      const id = sanitizeId(t.id, 'tkt');
      ticketIdMap.set(t.id, id);
      ops.push((b) =>
        b.set(doc(firestoreDb, 'users', userId, 'tickets', id), {
          ownerId: userId,
          date: sanitizeDate(t.date),
          customerName: clampStr(t.customerName, 100, 'Customer'),
          journey: clampStr(t.journey, 80, ''),
          ticketCost: safeNonNegativeNumber(t.ticketCost),
          serviceCharge: safeNumber(t.serviceCharge),
          customerPaid: safeNonNegativeNumber(t.customerPaid),
          paidFromAccountId: resolveAccount(t.paidFromAccountId, 'cash'),
          receivedIn: resolveAccount(t.receivedIn, 'cash'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    ledger.udhar.forEach((u) => {
      if (Number(u.amount) <= 0) return;
      const id = sanitizeId(u.id, 'udh');
      const isSettled = u.status === 'settled';
      ops.push((b) =>
        b.set(doc(firestoreDb, 'users', userId, 'udhar', id), {
          ownerId: userId,
          date: sanitizeDate(u.date),
          personName: clampStr(u.personName, 100, 'Person'),
          amount: safePositiveNumber(u.amount),
          note: clampStr(u.note, 200, ''),
          status: isSettled ? 'settled' : 'pending',
          linkedTicketId: u.linkedTicketId
            ? ticketIdMap.get(u.linkedTicketId) || sanitizeId(u.linkedTicketId, 'tkt')
            : '',
          settledDate: isSettled ? sanitizeDate(u.settledDate) : '',
          settledAccountId: isSettled
            ? resolveAccount(u.settledAccountId || 'cash', 'cash')
            : '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    ledger.expenses.forEach((e) => {
      if (Number(e.amount) <= 0) return;
      const id = sanitizeId(e.id, 'exp');
      ops.push((b) =>
        b.set(doc(firestoreDb, 'users', userId, 'expenses', id), {
          ownerId: userId,
          date: sanitizeDate(e.date),
          category: clampStr(e.category, 80, 'General'),
          paidTo: clampStr(e.paidTo, 100, 'Recipient'),
          amount: safePositiveNumber(e.amount),
          paidFromAccountId: resolveAccount(e.paidFromAccountId, 'cash'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    ledger.cashAdditions.forEach((c) => {
      if (Number(c.amount) <= 0) return;
      const id = sanitizeId(c.id, 'cash');
      ops.push((b) =>
        b.set(doc(firestoreDb, 'users', userId, 'cashAdditions', id), {
          ownerId: userId,
          date: sanitizeDate(c.date),
          amount: safePositiveNumber(c.amount),
          note: clampStr(c.note, 150, ''),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(firestoreDb);
      ops.slice(i, i + 400).forEach((fn) => fn(batch));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
