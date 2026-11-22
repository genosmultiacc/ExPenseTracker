# Security Specification & Payload-First TDD (`security_spec.md`)

## 1. Data Invariants

1. **Master Gate Ownership**: Every document under `/users/{userId}` and its subcollections (`banks`, `tickets`, `udhar`, `expenses`, `cashAdditions`) belongs strictly to the authenticated, email-verified user whose `request.auth.uid == userId` and `data.ownerId == request.auth.uid`.
2. **Parent Existence Sync**: No subcollection record (`banks`, `tickets`, `udhar`, `expenses`, `cashAdditions`) can be created, read directly via `get`, updated, or deleted unless the parent `/users/{userId}` document exists and its `ownerId == request.auth.uid`.
3. **Immutable Ownership & Timestamps**: `ownerId` and `createdAt` can never be changed after creation. `createdAt` must equal `request.time` on `create`, and `updatedAt` must equal `request.time` on both `create` and `update`.
4. **Strict Key & Type Enforcement**: All writes enforce exact `hasAll` and `hasOnly` key sets, string length limits matching `firebase-blueprint.json`, numeric type checks, and ID regex (`^[a-zA-Z0-9_-]+$`).
5. **Udhar Terminal State Locking**: An `UdharEntry` created as `status == 'pending'` can be edited while `pending` or transitioned once from `'pending'` to `'settled'`. Once `'settled'`, it cannot be modified back to `'pending'` or altered (only deleted if needed).

## 2. The "Dirty Dozen" Attack Payloads (Must Return `PERMISSION_DENIED`)

1. **Unauthenticated Read/Write**: Read `/users/uid1/tickets` with `request.auth == null`.
2. **Unverified Email Write**: Create `/users/uid1/banks/b1` with `email_verified: false`.
3. **Cross-User Access**: User `uid2` attempts `get` or `list` on `/users/uid1/tickets`.
4. **Identity Spoofing on Create**: User `uid1` creates `/users/uid1/tickets/t1` with `ownerId: "uid2"`.
5. **Shadow / Ghost Field Injection**: User `uid1` creates `/users/uid1/banks/b1` with extra field `isAdmin: true`.
6. **Orphaned Subcollection Write**: User `uid1` creates `/users/uid1/banks/b1` when `/users/uid1` does not exist.
7. **ID Poisoning**: User `uid1` writes `/users/uid1/tickets/bad$id..hack` or a 500-char document ID.
8. **Oversized String DoS**: User `uid1` writes `customerName` with 5,000 characters (`> 100` max).
9. **Client Timestamp Forgery**: User `uid1` creates `/users/uid1/expenses/e1` with `createdAt: Timestamp(2020-01-01)` instead of `request.time`.
10. **Owner Mutation on Update**: User `uid1` updates `/users/uid1/banks/b1` attempting to change `ownerId` or `createdAt`.
11. **Terminal State Bypass on Udhar**: User `uid1` updates an already `'settled'` Udhar document back to `status: 'pending'` or alters `amount`.
12. **Type Poisoning on Update**: User `uid1` updates `allocatedBudget` on `/users/uid1` to a string `"99999"` instead of a number.
