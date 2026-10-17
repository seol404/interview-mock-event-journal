const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const repoRequire = p => require(path.resolve(__dirname, p));

test("Appended events appear with public fields", () => {
  for (const key of Object.keys(require.cache)) if (key.startsWith(__dirname + path.sep)) delete require.cache[key];
  new Function('require', 'assert', "const EventJournal = require('src/journal.js');\nconst journal = new EventJournal();\nassert.equal(journal.append({ id: 'e1', at: 1, category: 'build', payload: { ok: true } }), 'e1');\nassert.deepEqual(journal.query(), [{ id: 'e1', at: 1, category: 'build', payload: { ok: true } }]);\n")(repoRequire, assert);
});

test("Unfiltered pages are ordered by descending timestamp", () => {
  for (const key of Object.keys(require.cache)) if (key.startsWith(__dirname + path.sep)) delete require.cache[key];
  new Function('require', 'assert', "const EventJournal = require('src/journal.js');\nconst journal = new EventJournal();\nfor (const at of [2, 1, 3]) journal.append({ id: 'e' + at, at, category: 'build', payload: {} });\nassert.deepEqual(journal.query({ offset: 1, limit: 1 }).map(event => event.id), ['e2']);\nassert.deepEqual(journal.query({ limit: 0 }), []);\n")(repoRequire, assert);
});

test("Duplicate IDs and invalid pages are rejected", () => {
  for (const key of Object.keys(require.cache)) if (key.startsWith(__dirname + path.sep)) delete require.cache[key];
  new Function('require', 'assert', "const EventJournal = require('src/journal.js');\nconst journal = new EventJournal();\njournal.append({ id: 'e1', at: 1, category: 'build', payload: {} });\nassert.throws(() => journal.append({ id: 'e1', at: 2, category: 'build', payload: {} }));\nassert.throws(() => journal.query({ offset: -1 }));\nassert.throws(() => journal.query({ limit: 1.5 }));\n")(repoRequire, assert);
});

test("The first category page skips newer unrelated events", () => {
  for (const key of Object.keys(require.cache)) if (key.startsWith(__dirname + path.sep)) delete require.cache[key];
  new Function('require', 'assert', "const EventJournal = require('src/journal.js');\nconst journal = new EventJournal();\njournal.append({ id: 'noise', at: 30, category: 'login', payload: {} });\njournal.append({ id: 'build', at: 20, category: 'build', payload: {} });\nassert.deepEqual(journal.query({ category: 'build', limit: 1 }).map(event => event.id), ['build']);\n")(repoRequire, assert);
});