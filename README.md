# Daily Expense & Profit Tracker — Offline Standalone

The root `index.html` is a self-contained offline-first application. Open it locally or publish the repository root with GitHub Pages.

## Main features
- Ticket bookings with separate customer receipts and ticket payments.
- Partial customer payments and partial ticket payments.
- Other expenses, Udhar lending and repayments.
- Consolidated bank balance with opening balance and running transaction history.
- Monthly net profit = service charges − ordinary expenses.
- Customer summaries, budget target, record search/date filters.
- JSON backup/restore and CSV export.

## Offline storage
Data is stored locally in this browser under `expenseTrackerStandalone_v2`. It does not require Firebase, a server, login, or an internet connection. Export backups regularly.

## Existing data migration
On first launch, if the old `expenseTrackerLedgerDb_v1` browser storage exists, it is migrated. The old key is not deleted; the full old ledger is retained in the migration snapshot inside the new backup. Old customer Udhar receivables are kept separate from money lent by you. Because the previous format did not contain individual historical payment dates, imported cumulative amounts use the available booking/settlement date.

## Firebase
Firebase is not initialized in this standalone build so offline use is not dependent on cloud services. Optional cloud sync is not included in this standalone edition.

## Source preservation
The original React/Vite source remains in `src/`; the previous entry HTML is preserved as `index.react-original.html`.
