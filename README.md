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
