"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCached = getCached;
exports.setCached = setCached;
exports.invalidateCache = invalidateCache;
const store = new Map();
function getCached(key) {
    const entry = store.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expiry) {
        store.delete(key);
        return null;
    }
    return entry.data;
}
function setCached(key, data, ttlSeconds = 60) {
    store.set(key, {
        data,
        expiry: Date.now() + ttlSeconds * 1000,
    });
}
function invalidateCache(keyPrefix) {
    if (!keyPrefix) {
        store.clear();
        return;
    }
    for (const key of store.keys()) {
        if (key.startsWith(keyPrefix)) {
            store.delete(key);
        }
    }
}
//# sourceMappingURL=memoryCache.js.map