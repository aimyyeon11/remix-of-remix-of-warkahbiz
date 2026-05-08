## Plan: Daily Cooking Log + Stock Two-Way Movement

This plan covers all 5 areas you requested. Implementation will be frontend-only (localStorage), keeping the same persistence pattern already used.

### 1. Batch Cooking Unit (Product Page)
- Replace the dropdown for `batchUnit` with a free-text input (placeholder examples: "periuk", "tray", "loyang", "bungkus").
- Default `batchSize` to 1 and de-emphasize it — emphasize "Bahan untuk 1 [unit]" framing.
- Keep existing `batchUnit` field on `Product` (already free-string compatible).

### 2. Ingredient Input UX (Product Page)
Replace the current single-add flow inside `IngredientsStep` with:
- Inline editable rows (always-visible empty row at bottom; auto-add new row when user types).
- Each row: searchable combobox (using existing `Popover` + `Input`) listing existing stock items by name; selecting one autofills name + unit; typing free text creates a new ingredient (which on save also seeds stock — already handled in `handleSaveProduct`).
- Quantity input + unit dropdown + delete button per row.
- Bulk: "+ Tambah 5 baris" quick action.
- This makes the link to stock functional: same-name match means cooking deductions hit the right stock row.

### 3. Daily Cooking Log (Today/Main page)
- New types: `CookingLog { id, ts, createdAt, productId, productName, batches }`.
- New localStorage key `warkahbiz_cooking_log`.
- New component `CookingLogPrompt` shown as a card on the Today view: "Apa yang dimasak hari ini?" with a "Log Masakan" button.
- Modal `CookingLogModal`:
  - List of products → select one
  - Number of batches (stepper, min 1)
  - Preview shows ingredients that will be deducted (name × qty per batch × batches)
  - Warning if any ingredient stock would go negative
  - "Simpan & Tolak Stok" confirms
- Once submitted: deducts stock and appends a log entry.

### 4. Functional Stock Deduction
- New handler `handleLogCooking(productId, batches)` in `Index.tsx`:
  - For each ingredient in product → find stock by case-insensitive name match → subtract `qty * batches` (clamp at 0) → record `lastUsedAt`.
- Receipt scan path keeps existing IN behavior; also stamps `lastRestockedAt`.
- Extend `StockItem` with optional `lastRestockedAt?: string` and `lastUsedAt?: string`.
- `StockView` cards show "Akhir tambah" / "Akhir guna" timestamps (compact relative format e.g. "2 hari lalu").

### 5. Low Stock Alerts (Enhancement)
- `StockItem.minQty` already exists. Add UI in stock card detail (small inline editor or within an existing edit modal — for scope, surface as a simple inline number when card is tapped; or skip edit UI in this pass and just compute from usage).
- Compute AI-suggested threshold = average of last 7 days' deductions × 3 (kept client-side, derived from `cooking_log` history). When user hasn't set `minQty` manually, use this suggestion.
- Reuse existing low-stock badge in `StockView` and existing `BuyView` auto-restock generator (already triggers when `qty <= restockQty`).

### Files to edit
- `src/types/index.ts` — add `CookingLog`, extend `StockItem` with `lastRestockedAt`, `lastUsedAt`.
- `src/features/profile/ProductsView.tsx` — batch-unit free text + new inline ingredients UI.
- `src/features/cooking/CookingLogModal.tsx` (new) — the modal.
- `src/features/cooking/CookingLogPrompt.tsx` (new) — the card on Today view.
- `src/pages/Index.tsx` — wire up state, handler, prompt placement, receipt restock timestamp.
- `src/features/inventory/StockView.tsx` — show last restock/use timestamps.

### Out of scope (note for later)
- Per-item AI-tuned threshold UI editor and the 7-day forecasting engine — I'll wire up a simple usage-history-based suggestion but a full forecasting screen is separate.
- Backend persistence (everything stays in localStorage like the rest of the app).
