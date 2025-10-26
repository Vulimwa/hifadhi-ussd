// Minimal in-memory session cache with TTL for idempotency
class SessionCache {
  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttl = ttlMs;
    this.map = new Map();
  }
  _now() { return Date.now(); }
  set(key, value) {
    const expireAt = this._now() + this.ttl;
    this.map.set(key, { value, expireAt });
  }
  get(key) {
    const item = this.map.get(key);
    if (!item) return undefined;
    if (item.expireAt < this._now()) { this.map.delete(key); return undefined; }
    return item.value;
  }
  ensure(key, def) {
    const got = this.get(key);
    if (got !== undefined) return got;
    this.set(key, def);
    return def;
  }
}

const cache = new SessionCache();
module.exports = { cache, SessionCache };

