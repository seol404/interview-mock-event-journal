# interview-mock-event-journal
cope

A dependency-free, in-memory activity feed. Export: CommonJS `EventJournal`.

## API contract

- `append({ id, at, category, payload })` stores an event and returns its ID. IDs are nonempty unique strings, timestamps are finite numbers, and categories are nonempty strings.
- Payloads are JSON-compatible objects or arrays. They may contain nested objects, arrays, primitive values, and null. Cyclic values and non-JSON data are outside the input contract.
- Appending captures a deep snapshot of the payload. Later changes to the caller's original payload must not affect stored events.
- `query({ category, offset = 0, limit = 20 } = {})` returns events ordered by descending timestamp. For identical timestamps, the event appended most recently comes first. IDs do not determine ordering.
- An optional category filter is applied to the complete collection before offset and limit. Offset counts matching events, so pages are filled when enough matching events exist.
- Offset and limit must be nonnegative integers. Zero limit returns an empty page; an offset beyond the matching collection also returns an empty page.
- Each result contains only `{ id, at, category, payload }`. Internal bookkeeping fields must not appear.
- Results are independent deep snapshots. Mutating any part of a returned event must not affect stored history, other results, or later queries.

## Report

Requesting the first build event returns an empty page when a newer login event exists. Reproduce that behavior and inspect nearby query guarantees.

## Working agreement

Ask the agent to explain the query pipeline and data ownership. Add focused examples for each claimed behavior and keep the public API intact.

## Feature extension round — choose any 2

Choose any **2 of these 3 independent options** for a separate feature-extension interview. Allow roughly 20–35 minutes per option for clarification, implementation, tests, and review; this is a planning estimate, not a guaranteed completion time. For this round, choosing two replaces any earlier instruction to work on one ticket.

Agree on the existing API contract first and track baseline defects separately. Implement the selected extensions and the changes they require, while preserving existing behavior and any features already added locally. Write your own acceptance and regression tests. The website's simulator and held-out checks cover baseline debugging only; they do not implement or validate these extensions. Each option can be selected without implementing the other two.

### Option 1 — Query a time window

Add `queryWindow({ from, to, category, offset = 0, limit = 20 } = {})`, returning an array of public event snapshots shaped like existing `query` results.

Acceptance criteria:

1. Supplied `from` and `to` must be finite numbers. Omitted bounds are open-ended. The window includes events with `at >= from` and excludes events with `at >= to`; equal bounds produce an empty result. A supplied `from` greater than `to` throws.
2. Optional category filtering uses exact, case-sensitive equality. Category must be a string when supplied; an empty string is valid and matches no valid stored event. Offset and limit must be nonnegative integers, as in `query`; invalid options throw without modifying stored events.
3. Apply time and category filters to the complete current collection before offset and limit. Order matches `query`: descending timestamp, with later appends first when timestamps tie. Zero limit or an offset beyond the matches returns `[]`.
4. Every returned event has only `{ id, at, category, payload }`, including an independent deep snapshot of its payload. Editing options or returned data must not alter stored history; the query itself does not mutate it.
5. If the local repository supports bulk append, deletion, or payload updates, subsequent window queries reflect those completed operations. Do not add or change those write APIs as part of this option.

Example: events `a`, `b`, and `c` have timestamps 10, 20, and 30. `queryWindow({ from: 10, to: 30 })` returns snapshots of `b` and then `a`.

Scope: numeric timestamp filtering only. Date-string parsing, time zones, recurring events, and cursor integration are outside this option.

### Option 2 — Summarize activity by category

Add `categorySummary({ from, to } = {})`, returning rows shaped `{ category, count, firstAt, lastAt }`.

Acceptance criteria:

1. Supplied time bounds must be finite numbers; omitted bounds are open-ended. Include timestamps at `from` and exclude timestamps at `to`. Equal bounds return `[]`; reversed bounds or invalid options throw without changing journal state. This contract applies even if `queryWindow` is not selected.
2. Count every currently stored event inside the window, grouped by exact, case-sensitive category. Events sharing a timestamp still count individually. Omit categories with no matching events.
3. `firstAt` is the smallest matching timestamp in the category and `lastAt` is the largest; a one-event category has equal values. Count is the total matching events, independent of the existing query's default page size.
4. Return rows sorted by category in ascending, case-sensitive JavaScript string order. An empty journal or a window with no events returns `[]`.
5. Results are detached snapshots of current state. The method and later edits to returned rows must not change stored events. Where local write APIs already exist, future summaries reflect deletions and additions, while payload-only updates leave counts and timestamp extrema unchanged.

Example: two `build` events occur at times 2 and 5. `categorySummary({ from: 3, to: 6 })` returns `[{ category: "build", count: 1, firstAt: 5, lastAt: 5 }]`.

Scope: counts and timestamp extrema only. Payload aggregation, charting, and maintained background counters are outside this option.

### Option 3 — Page through the journal with continuation cursors

Add `queryPage({ category, limit = 20, after = null } = {})`, returning `{ events, nextCursor }`. A cursor is an opaque nonempty string returned by this journal instance; callers pass it back without inspecting it.

Acceptance criteria:

1. `limit` must be an integer from 1 through 100. Category is optional and otherwise must be a string; omission and the empty string are distinct filters. `after` must be `null` or a previously issued cursor from the same journal instance and category filter. Invalid options, malformed or unknown cursors, cursors from another instance, and category mismatches throw without changing stored events.
2. A first page uses the complete current collection, applies the category filter, and returns at most `limit` events in existing query order: descending timestamp, then most recently appended first. Returned events contain only public fields and independent deep payload snapshots.
3. A continuation returns matching events strictly after the prior page's final event in that ordering. Equal timestamps must not cause skipped or repeated events. Page size may change between calls, and a cursor may be reused.
4. Return a nonempty `nextCursor` only when at least one matching event remains after the returned page at the time of that call; otherwise return `null`. An empty page always has `nextCursor: null`. A cursor must remain usable even if its boundary event is later deleted by an existing local API.
5. Paging reads current data rather than freezing a snapshot. Events appended after a cursor was issued appear on a continuation only if they sort strictly after its boundary; newer-sorting events do not reappear on that continuation. Deletions disappear, and existing payload updates are reflected in later results without changing order.
6. Paging must not mutate events or consume cursors, and editing returned data must not affect later reads. Supporting existing append, bulk-append, delete, or update methods does not require adding any absent write API. Cursors need not persist across journal instances or process restarts.

Example: events sort as `c`, `b`, `a`. A first request with `limit: 2` returns `c` and `b` plus a cursor. Passing that cursor with `limit: 2` returns `a` and `nextCursor: null`.

Scope: in-memory continuation paging only. Cursor cryptography, persistent tokens, frozen snapshots, time-window integration, and concurrent writers are outside this option.
