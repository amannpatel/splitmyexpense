# Splitzy — who owes who?

Splitzy is a small web app for splitting group expenses. Type each friend's name and what they paid. It shows the total, the fair share per person, and who should pay whom, using as few payments as practical.

No sign-up, no backend, no API keys. It runs entirely in your browser.

## Quick start

Requires Node.js 20.19+ or 22.12+ (tested on Node 24).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command              | What it does                                 |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Start the dev server with hot reload         |
| `npm test`           | Run unit and integration tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode                      |
| `npm run typecheck`  | Run TypeScript checks                        |
| `npm run build`      | Type-check, then build to `dist/`            |
| `npm run preview`    | Serve the production build locally           |

## Features

- **Add a friend fast:** type a name, press Enter, type the amount, then press Enter again. If you leave the amount empty, the friend is added as paying nothing.
- **No accidental duplicates:** if you enter a name that's already in the group (matching ignores case and extra spaces), Splitzy offers to add the amount to that person's total instead of creating a second entry.
- **Edit and remove:** you can edit names and amounts in place. After removing someone, you can tap **Undo** to bring them back.
- **Live summary:** shows the total, number of people, fair share, top payer, and a bar for each person comparing what they paid with their share.
- **Who pays whom:** lists the payments to make, with a one-tap **Copy** for sharing in a group chat. You can mark each payment as paid.
- **Currencies:** INR (default), USD, EUR, GBP, AED, SGD, AUD, CAD, JPY, KWD. When you switch currency, the numbers you typed stay the same.
- **Sample group:** try the app instantly. **New split** asks for confirmation before clearing anything, and you can still undo afterwards.
- **Accessibility:** works with a keyboard and screen readers. Every input has a label, and debts and credits are shown with words and icons, not just color. If you turn on reduced motion, animations are switched off.

## How the math works

All money logic is in [src/lib/settlement.ts](src/lib/settlement.ts) and [src/lib/money.ts](src/lib/money.ts). These are pure functions with no React code.

1. **Integer minor units only.** Amounts are parsed from text directly into paise, cents, and so on, without converting through floating point. The number of decimal places comes from `Intl` (INR has 2, JPY has 0, KWD has 3). Floats are used only to format numbers for display.
2. **Fair shares.** Each share is `floor(total / n)`. The `total mod n` minor units left over go one each to the biggest payers, with ties broken by name and then id. The biggest payers are owed money anyway, so nobody who owes money pays an extra paisa. Shares differ by at most one minor unit and always add up exactly to the total.
3. **Balances.** `paid − share`. A positive balance means the person gets money back, and a negative balance means they owe. Balances always add up to zero.
4. **Settlement.** The algorithm repeatedly matches the person who owes the most with the person owed the most and transfers the smaller of the two amounts. This takes at most `n − 1` transfers. No pair of people repeats, and nobody pays themselves. Ties are broken by name and then id, so reordering the list doesn't change the result.

Paid marks are stored separately from what people paid. Marking a transfer as paid never changes the ledger. If an edit changes a transfer, its old paid mark is cleared.

Tests in [src/lib/settlement.test.ts](src/lib/settlement.test.ts) cover:

- single-person groups, equal payers, one payer covering everything, and groups where people paid uneven amounts
- people who paid zero and people who paid exactly their share
- decimal amounts and totals that don't divide evenly
- groups where everyone paid zero
- very large amounts
- randomized checks that no transfer is duplicated and that everything adds up exactly
- results that don't depend on the order of participants

## Storage and its limits

Your current split is saved automatically in **this browser's LocalStorage** under the key `splitzy.session`. The data has a version number and is checked when loaded. If an entry is broken it's skipped, and if the saved data can't be read at all, Splitzy starts a fresh split.

Please note:

- Data stays **on this device and in this browser only**. It does not sync between devices, browsers, or friends.
- Sharing the link does **not** share your group. Use **Copy** to send the results.
- Clearing site data or using private browsing can erase the split.
- If the browser blocks storage, the header shows **Not saved**.

Once the page has loaded, it doesn't need the network. There are no external fonts, images, or APIs.

## Project structure

```
src/
  lib/                pure, framework-free logic
    money.ts          currency precision, parsing, formatting
    settlement.ts     totals, fair shares, balances, settlements
    validation.ts     name and amount rules, validateGroup
    storage.ts        versioned LocalStorage load and save (SessionStore interface)
    session.ts        session reducer and sample data
    shareText.ts      plain-text summary for Copy
    avatar.ts         deterministic avatar generator (no external APIs)
  hooks/useSplitSession.ts
  components/         Header, GroupTitle, MemberEntryForm, MemberList, MemberRow,
                      MemberAvatar, GroupSummary, ContributionBreakdown,
                      SettlementList, SettlementItem, EmptyState, Toast, ConfirmDialog
```

### Adding a backend later

The UI only talks to storage through the `SessionStore` interface (`load` and `save`) in [src/lib/storage.ts](src/lib/storage.ts). Sessions already have stable ids and timestamps. To add shareable links or real-time groups, implement `SessionStore` against an API, route a URL like `/g/:sessionId` to it, and keep the settlement engine as it is.

## Tech

React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Lucide icons, Vitest, and Testing Library.