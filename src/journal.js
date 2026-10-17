class EventJournal {
  constructor() {
    this.events = [];
    this.nextSequence = 0;
  }

  append({ id, at, category, payload }) {
    if (typeof id !== "string" || !id || this.events.some(event => event.id === id)) {
      throw new Error("Event ID must be nonempty and unique");
    }
    if (!Number.isFinite(at) || typeof category !== "string" || !category) {
      throw new Error("Events require a finite timestamp and nonempty category");
    }
    if (payload === null || typeof payload !== "object") {
      throw new Error("Payload must be a JSON-compatible object or array");
    }
    const storedPayload = JSON.parse(JSON.stringify(payload));
    this.events.push({ id, at, category, payload: storedPayload, sequence: this.nextSequence++ });
    return id;
  }

  query({ category, offset = 0, limit = 20 } = {}) {
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 0) {
      throw new Error("offset and limit must be nonnegative integers");
    }
    if (category !== undefined && typeof category !== "string") {
      throw new Error("category must be a string when supplied");
    }
    let selected = [...this.events].sort((a, b) => b.at - a.at);
    selected = selected.slice(offset, offset + limit);
    if (category !== undefined) {
      selected = selected.filter(event => event.category === category);
    }
    return selected.map(({ sequence, ...event }) => ({ ...event }));
  }
}

module.exports = EventJournal;
