# Security Specification — Vita Takip Pro

## 1. Data Invariants
1. **Multi-User Isolation**: Every document in `/users/{userId}/supplements/{supplementId}` and `/users/{userId}/vital_logs/{logId}` belongs strictly to `userId`, and `request.auth.uid` must equal both the path `{userId}` and the document field `userId`.
2. **Strict Key & Type Validation**:
   - `Supplement`: requires `['userId', 'name', 'dosage', 'category', 'timeOfDay', 'takenToday', 'stockCount', 'createdAt', 'updatedAt']` and permits optional `'notes'`.
   - `VitalLog`: requires `['userId', 'type', 'title', 'primaryValue', 'secondaryValue', 'unit', 'createdAt', 'updatedAt']` and permits optional `'note'`.
3. **Immutable Fields**: `userId` and `createdAt` cannot be modified after creation.
4. **Temporal Integrity**: `createdAt` and `updatedAt` must be Firestore `timestamp` values `<= request.time`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Read**: `GET /users/alice/supplements/supp1` with `auth == null` -> REJECT.
2. **Cross-User Read**: `GET /users/bob/supplements/supp1` as `alice` -> REJECT.
3. **Identity Spoofing on Create**: `CREATE /users/alice/supplements/supp1` with `userId: "bob"` -> REJECT.
4. **Shadow Field Injection**: `CREATE /users/alice/supplements/supp1` with `isAdmin: true` -> REJECT (`hasOnly` check).
5. **String Overflow (Denial of Wallet)**: `CREATE /users/alice/supplements/supp1` with `name` of 500 chars -> REJECT (`size() <= 80`).
6. **Invalid Enum Value**: `CREATE /users/alice/supplements/supp1` with `category: "Unknown"` -> REJECT.
7. **Negative Stock Count**: `CREATE /users/alice/supplements/supp1` with `stockCount: -5` -> REJECT.
8. **Future Timestamp**: `CREATE /users/alice/supplements/supp1` with `createdAt` in the future -> REJECT (`<= request.time`).
9. **Immutable `createdAt` Tampering on Update**: `UPDATE /users/alice/supplements/supp1` changing `createdAt` -> REJECT.
10. **Immutable `userId` Tampering on Update**: `UPDATE /users/alice/supplements/supp1` changing `userId` -> REJECT.
11. **Unfiltered List Query**: `LIST /users/bob/vital_logs` as `alice` -> REJECT.
12. **Value Poisoning on Update**: `UPDATE /users/alice/vital_logs/log1` setting `primaryValue: "not_an_int"` -> REJECT (`isValidVitalLog`).
