import { generateContext } from "./src/services/SteliosClient";
import { send } from "./src/services/EventsProcessor";
import { setLocal, ifExists, getLocal, removeFromStart, deleteSteliosLocal, initStorage } from "./src/services/StelioLocalStore";
import { v4 as uuidv4 } from 'uuid';
import { axiosCreate } from "./src/utility/AxiosUtility";
export var axiosRequest = null;
export var eventProcessor = null;
export var client = null;
export var apiKey = null;
export var stelioLocal = null;
export var batchExecutorID = null;
var apiDurationTimer = null; // Global variable to time difference between multiple API calls
// to avoid sending same data from multiple tabs
// SEND_LOCK guards against two sendBatch() calls being in flight at once (this tab or another tab).
// apiDurationTimer only paces how often a NEW send is allowed to start; it does nothing once a send
// is already running, so without this lock a slow request can still overlap with a later tick or
// drain chunk, re-reading events that haven't been removed from the queue yet and sending them twice.
const SEND_LOCK_KEY = 'flickSendLock';
// Fallback-only: localStorage read-then-write can't be atomic across tabs, so two tabs can both
// observe "unlocked" before either writes the lock (not closeable without a native primitive; the
// Web Locks branch below is what actually closes it). TTL is a safety net for a crashed/closed tab;
// the lock is tagged with a per-acquisition token and renewed on a heartbeat while held, so a
// request that's still genuinely in flight past the TTL doesn't get mistaken for a dead one and
// have its lock stolen (and, since release checks the token, a tab that *does* get its lock stolen
// can no longer delete the new holder's lock out from under it when its own request finally settles).
const SEND_LOCK_TTL_MS = 30000;
// Web Locks API (navigator.locks) is arbitrated by the browser itself, so acquisition is atomic
// across tabs/contexts with no read-then-write race, and the lock is held for exactly the duration
// of the callback (released on completion or tab crash) instead of guessing a TTL. Use it whenever
// it's available and fall back to the localStorage TTL lock only where it isn't (e.g. this test
// environment, or older browsers).
const hasWebLocks = typeof navigator !== 'undefined' && !!navigator.locks && typeof navigator.locks.request === 'function';
function readSendLock() {
    if (!ifExists(SEND_LOCK_KEY))
        return null;
    const lock = getLocal(SEND_LOCK_KEY);
    return lock && typeof lock.token === 'string' && typeof lock.lockedAt === 'number' ? lock : null;
}
function acquireSendLock() {
    const now = new Date().getTime();
    const lock = readSendLock();
    if (lock && now - lock.lockedAt < SEND_LOCK_TTL_MS) {
        return null;
    }
    const token = `${now}-${Math.random().toString(36).slice(2)}`;
    setLocal(SEND_LOCK_KEY, { token, lockedAt: now });
    return token;
}
function renewSendLock(token) {
    const lock = readSendLock();
    if (lock && lock.token === token) {
        setLocal(SEND_LOCK_KEY, { token, lockedAt: new Date().getTime() });
    }
}
// Only releases the lock if it still belongs to this token, so a tab whose lock was already taken
// over by another tab (TTL expired while it was still genuinely sending) can't delete that tab's lock.
function releaseSendLock(token) {
    const lock = readSendLock();
    if (lock && lock.token === token) {
        deleteSteliosLocal(SEND_LOCK_KEY);
    }
}
// Runs fn only while holding the send lock; backs off (without running fn) if another
// tab/context already holds it. Caller is responsible for not nesting calls to this.
async function withSendLock(fn) {
    if (hasWebLocks) {
        await navigator.locks.request(SEND_LOCK_KEY, { ifAvailable: true }, async (lock) => {
            if (!lock) {
                // another tab/context already holds the lock; back off instead of re-reading events it hasn't removed yet
                return;
            }
            await fn();
        });
        return;
    }
    const token = acquireSendLock();
    if (!token) {
        // another send (this tab or another tab) is already in flight for this queue; back off
        // instead of re-reading events it hasn't removed yet
        return;
    }
    // renew the TTL while fn() is running so a request that legitimately takes longer than
    // SEND_LOCK_TTL_MS doesn't get mistaken for a crashed tab and have its lock stolen
    const heartbeat = setInterval(() => renewSendLock(token), SEND_LOCK_TTL_MS / 3);
    try {
        await fn();
    }
    finally {
        clearInterval(heartbeat);
        releaseSendLock(token);
    }
}
export async function identify(userID, traits, emitLoginEvent = true) {
    const existingIdentity = getLocal('userIdentity');
    let newIdentity = {};
    if (existingIdentity && Object.keys(existingIdentity).length > 0) {
        // userIdentity exists
        if (existingIdentity.userID && existingIdentity.userID !== userID) {
            // userIdentity exists with a different userID, generate new anonymousID and userID
            newIdentity = {
                anonymousID: uuidv4(),
                userID: userID
            };
        }
        else {
            // userIdentity exists with the same userID, only add userID to existing anonymousID
            newIdentity = {
                ...existingIdentity,
                userID: userID // Ensure userID is updated or added without changing anonymousID
            };
        }
    }
    else {
        // userIdentity doesn't exist, create a new one with new anonymousID
        newIdentity = {
            anonymousID: uuidv4(),
            userID: userID
        };
    }
    setLocal("userIdentity", newIdentity);
    if (emitLoginEvent) {
        sendEvent("user_login", { "event_type": "identity", ...traits });
    }
}
export async function reset() {
    deleteSteliosLocal('userIdentity');
    deleteSteliosLocal('apiKey');
    let newIdentity = {
        anonymousID: uuidv4()
    };
    setLocal("userIdentity", newIdentity);
}
const DEFAULT_FLUSH_INTERVAL = 15000;
const MIN_FLUSH_INTERVAL = 5000;
var maxBatchBytes = null; // no size limit unless maxBatchSize is passed to initialize
const textEncoder = new TextEncoder();
function byteSize(value) {
    return textEncoder.encode(JSON.stringify(value)).length;
}
// size of `events` wrapped the way it's actually sent ({batch, sent_at}), so every "are we over the
// cap" check (push-site trigger, drain-continue check) measures the same shape as what gets sent.
function wrappedBatchBytes(events) {
    return byteSize({ batch: events, sent_at: new Date().toISOString() });
}
// single read of the queue, defaulting to [] both when the key is missing (getLocal's own "missing"
// sentinel is {}, not []) and when the stored value is corrupted/unparsable (getLocal's own catch
// returns the Error itself) - callers can safely treat the result as an array either way.
function getEventQueue() {
    const stored = getLocal('flickEvents');
    return Array.isArray(stored) ? stored : [];
}
// number of events from the start of the queue that fit in one request of at most maxBatchBytes (always at least 1)
function batchCount(events) {
    if (maxBatchBytes === null)
        return events.length;
    let bytes = byteSize({ batch: [], sent_at: new Date().toISOString() });
    let count = 0;
    for (const event of events) {
        const eventBytes = byteSize(event) + 1; // +1 for the comma between events
        if (count > 0 && bytes + eventBytes > maxBatchBytes)
            break;
        bytes += eventBytes;
        count++;
    }
    return count;
}
/**
 * @param flushInterval time in ms between checks that send queued events to the API. Defaults to 15000, must be at least 5000 when provided.
 * @param apiDurationInterval minimum gap in ms before a new send is allowed to start. Defaults to 5000, must be a non-negative number when provided.
 * @param maxBatchSize optional, max size in KB of one request. Events are also sent as soon as the queue reaches this size. No size limit is applied unless it is passed, must be greater than 0.
 */
export async function initialize(endpoint, apiKey, flushInterval = DEFAULT_FLUSH_INTERVAL, apiDurationInterval = 5000, maxBatchSize) {
    if (typeof flushInterval !== 'number' || isNaN(flushInterval) || flushInterval < MIN_FLUSH_INTERVAL) {
        throw new Error(`flushInterval must be a number of at least ${MIN_FLUSH_INTERVAL} ms`);
    }
    if (typeof apiDurationInterval !== 'number' || isNaN(apiDurationInterval) || apiDurationInterval < 0) {
        throw new Error('apiDurationInterval must be a non-negative number');
    }
    if (maxBatchSize !== undefined && (typeof maxBatchSize !== 'number' || isNaN(maxBatchSize) || maxBatchSize <= 0)) {
        throw new Error('maxBatchSize must be a number greater than 0 (KB)');
    }
    maxBatchBytes = maxBatchSize === undefined ? null : maxBatchSize * 1024;
    // keep the multi-tab gate below the flush interval so it never skips a tick
    apiDurationTimer = Math.min(apiDurationInterval, flushInterval / 2);
    initStorage();
    axiosCreate(endpoint, apiKey);
    // re-create the timer on every call so a later initialize() with a different flushInterval
    // actually takes effect, instead of being silently ignored once a timer already exists
    if (batchExecutorID) {
        clearInterval(batchExecutorID);
    }
    batchExecutorID = setInterval(() => sendBatch(), flushInterval);
}
export async function validateClient(apiKey) {
    return {
        "data": {
            isTokenValid: "true"
        }
    };
    //return validate( apiKey)
}
export async function sendEvent(eventName, props) {
    if (!ifExists('userIdentity')) {
        setLocal('userIdentity', { anonymousID: uuidv4() });
    }
    if (!eventName || !props) {
        throw new Error('Please provide eventName and properties of the user');
    }
    let payload = generateContext(eventName, props);
    payload.user_id = getLocal('userIdentity').userID || null;
    payload.anonymous_id = getLocal('userIdentity').anonymousID;
    payload.session_id = getSessionId();
    if (!payload.user_id) {
        if (props.cart_id) {
            setLocal('clickChaining', { previous_cart_id: props.cart_id });
            props.previous_cart_id = props.cart_id;
        }
    }
    else {
        if (!getLocal('clickChaining')) {
            if (props.cart_id) {
                setLocal('clickChaining', { previous_cart_id: props.cart_id });
                props.previous_cart_id = props.cart_id;
            }
        }
        else {
            if (props.cart_id) {
                if (getLocal('clickChaining') && getLocal('clickChaining').previous_cart_id) {
                    props.previous_cart_id = getLocal('clickChaining').previous_cart_id;
                }
            }
        }
    }
    const queue = getEventQueue();
    queue.push(payload);
    setLocal('flickEvents', queue);
    // send without waiting for the next flush interval once the queue reaches the size limit.
    // reuses the queue already read above and measures it the same way batchCount() does (array +
    // the {batch, sent_at} wrapper) so the trigger can't drift from what actually gets capped at
    // send time. (A plain `batchCount(queue) < queue.length` check would miss a single event that
    // alone exceeds maxBatchBytes, since batchCount always keeps at least one event per request.)
    if (batchExecutorID && maxBatchBytes !== null && wrappedBatchBytes(queue) >= maxBatchBytes) {
        sendBatch();
    }
}
// withSendLock prevents two sends from being in flight at once, in this tab or another. The
// apiDurationTimer pacing gate runs INSIDE the lock callback, not before acquiring the lock: if it
// ran first, a tick that backs off only because another tab/context currently holds the lock (no
// send happened) would still reset apiCallTimestamp, throttling the next real attempt for no reason.
// A still-over-the-limit queue keeps draining under one lock acquisition via the loop below instead
// of releasing and racing another tab between chunks.
async function sendBatch() {
    await withSendLock(async () => {
        // check if apiCallTimestamp is present in localStorage
        // if not present, set it to current time epoch
        if (!ifExists('apiCallTimestamp')) {
            setLocal('apiCallTimestamp', new Date().getTime());
        }
        else {
            // if timestamp is present check if apiDurationTimer has elapsed since then, if yes reset it
            if (new Date().getTime() - getLocal('apiCallTimestamp') > apiDurationTimer) {
                setLocal('apiCallTimestamp', new Date().getTime());
            }
            else {
                // if apiDurationTimer has not elapsed, make no api call and return
                return;
            }
        }
        let keepDraining = true;
        while (keepDraining) {
            keepDraining = false;
            const queued = getEventQueue();
            if (queued.length == 0 || !ifExists('userIdentity')) {
                return;
            }
            // send only as many events as fit in maxBatchBytes, the rest stay queued for the next send
            const size = batchCount(queued);
            const event = {
                batch: queued.slice(0, size),
                sent_at: new Date().toISOString(),
            };
            try {
                await send(event, {});
                removeFromStart(size, 'flickEvents');
                const remaining = getEventQueue();
                // measured the same wrapped way as batchCount()/the early-flush check in sendEvent()
                // (array + the {batch, sent_at} wrapper), so the drain can't stop early just because
                // the wrapper's own bytes are what pushes the request over the cap.
                if (maxBatchBytes !== null && remaining.length > 0 && wrappedBatchBytes(remaining) >= maxBatchBytes) {
                    keepDraining = true;
                }
            }
            catch (err) {
                console.error('error while sending api request ', err);
                // if there is continuous failure to send events, then clear events in LRU manner to avoid
                // excess storage of events in browser's local storage. Reads the live queue (not the
                // `queued` snapshot from above) so events appended while this request was in flight are
                // counted too, and the threshold is no longer tied to how many events this one request
                // happened to attempt.
                const current = getEventQueue();
                if (current.length > 1000) {
                    removeFromStart(current.length - 1000, 'flickEvents');
                }
                return;
            }
        }
    });
}
function getSessionId() {
    const TTL = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    if (!ifExists('session')) {
        const id = uuidv4();
        setLocal('session', { id, timestamp: now });
        return id;
    }
    const { id, timestamp } = getLocal('session');
    const expired = (now - timestamp) >= TTL;
    if (expired) {
        const newId = uuidv4();
        setLocal('session', { id: newId, timestamp: now });
        return newId;
    }
    setLocal('session', { id, timestamp: now });
    return id;
}
//# sourceMappingURL=index.js.map