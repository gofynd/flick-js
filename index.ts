import { validate, generateContext } from "./src/services/SteliosClient";
import { send } from "./src/services/EventsProcessor";
import { setLocal, ifExists, getLocal, removeFromStart, deleteSteliosLocal, initStorage } from "./src/services/StelioLocalStore"
import { EventPayload } from './src/models/eventPayload'
import { v4 as uuidv4 } from 'uuid';
import { SteliosEvent } from "./src/models/steliosEvent";
import { axiosCreate } from "./src/utility/AxiosUtility";


export var axiosRequest: any = null;
export var eventProcessor: any = null
export var client: any = null
export var apiKey: any = null;
export var stelioLocal: any = null
export var batchExecutorID: any = null
var apiDurationTimer: any = null; // Global variable to time difference between multiple API calls
// to avoid sending same data from multiple tabs

// SEND_LOCK guards against two sendBatch() calls being in flight at once (this tab or another tab).
// apiDurationTimer only paces how often a NEW send is allowed to start; it does nothing once a send
// is already running, so without this lock a slow request can still overlap with a later tick or
// drain chunk, re-reading events that haven't been removed from the queue yet and sending them twice.
// TTL is a safety net: if a tab is closed/crashes mid-request, the lock can't block sends forever.
const SEND_LOCK_KEY = 'flickSendLock';
const SEND_LOCK_TTL_MS = 30000;

function acquireSendLock(): boolean {
    const now = new Date().getTime();
    if (ifExists(SEND_LOCK_KEY)) {
        const lockedAt = getLocal(SEND_LOCK_KEY);
        if (typeof lockedAt === 'number' && now - lockedAt < SEND_LOCK_TTL_MS) {
            return false;
        }
    }
    setLocal(SEND_LOCK_KEY, now);
    return true;
}

function releaseSendLock() {
    deleteSteliosLocal(SEND_LOCK_KEY);
}

export async function identify(userID: string, traits: any, emitLoginEvent = true) {
    const existingIdentity = getLocal('userIdentity');
    let newIdentity = {}
    if (existingIdentity && Object.keys(existingIdentity).length > 0) {
        // userIdentity exists
        if (existingIdentity.userID && existingIdentity.userID !== userID) {
            // userIdentity exists with a different userID, generate new anonymousID and userID
            newIdentity = {
                anonymousID: uuidv4(),
                userID: userID
            };
        } else {
            // userIdentity exists with the same userID, only add userID to existing anonymousID
            newIdentity = {
                ...existingIdentity,
                userID: userID // Ensure userID is updated or added without changing anonymousID
            };
        }
    } else {
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
    }
    setLocal("userIdentity", newIdentity)
}

const DEFAULT_FLUSH_INTERVAL = 15000;
const MIN_FLUSH_INTERVAL = 5000;
var maxBatchBytes: number | null = null; // no size limit unless maxBatchSize is passed to initialize
const textEncoder = new TextEncoder();

function byteSize(value: any): number {
    return textEncoder.encode(JSON.stringify(value)).length;
}

// number of events from the start of the queue that fit in one request of at most maxBatchBytes (always at least 1)
function batchCount(events: Array<SteliosEvent>): number {
    if (maxBatchBytes === null) return events.length;
    let bytes = byteSize({ batch: [], sent_at: new Date().toISOString() });
    let count = 0;
    for (const event of events) {
        const eventBytes = byteSize(event) + 1; // +1 for the comma between events
        if (count > 0 && bytes + eventBytes > maxBatchBytes) break;
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
export async function initialize(endpoint: string, apiKey: any, flushInterval: number = DEFAULT_FLUSH_INTERVAL, apiDurationInterval: number = 5000, maxBatchSize?: number) {
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
    initStorage()
    axiosCreate(endpoint, apiKey)
    // re-create the timer on every call so a later initialize() with a different flushInterval
    // actually takes effect, instead of being silently ignored once a timer already exists
    if (batchExecutorID) {
        clearInterval(batchExecutorID);
    }
    batchExecutorID = setInterval(() => sendBatch(), flushInterval)
}

export async function validateClient(apiKey: any) {
    return {
        "data": {
            isTokenValid: "true"
        }
    }
    //return validate( apiKey)
}

export async function sendEvent(eventName: any, props: any) {
    if (!ifExists('userIdentity')) {
        setLocal('userIdentity', { anonymousID: uuidv4() })
    }
    if (!eventName || !props) {
        throw new Error('Please provide eventName and properties of the user');
    }
    let payload: SteliosEvent = generateContext(eventName, props);
    payload.user_id = getLocal('userIdentity').userID || null;
    payload.anonymous_id = getLocal('userIdentity').anonymousID;
    payload.session_id = getSessionId();

    if (!payload.user_id) {
        if (props.cart_id) {
            setLocal('clickChaining', { previous_cart_id: props.cart_id })
            props.previous_cart_id = props.cart_id
        }
    } else {
        if (!getLocal('clickChaining')) {
            if (props.cart_id) {
                setLocal('clickChaining', { previous_cart_id: props.cart_id })
                props.previous_cart_id = props.cart_id
            }
        } else {
            if (props.cart_id) {
                if(getLocal('clickChaining') && getLocal('clickChaining').previous_cart_id){
                    props.previous_cart_id = getLocal('clickChaining').previous_cart_id;
                }  
            }
        }
    }
    const queue: Array<SteliosEvent> = ifExists('flickEvents') ? getLocal('flickEvents') : [];
    queue.push(payload);
    setLocal('flickEvents', queue);
    // send without waiting for the next flush interval once the queue reaches the size limit.
    // reuses the queue already read above (no extra localStorage parse) and measures it the same
    // way batchCount() does (array + the {batch, sent_at} wrapper) so the trigger can't drift from
    // what actually gets capped at send time. (A plain `batchCount(queue) < queue.length` check
    // would miss a single event that alone exceeds maxBatchBytes, since batchCount always keeps at
    // least one event per request.)
    if (batchExecutorID && maxBatchBytes !== null && byteSize({ batch: queue, sent_at: new Date().toISOString() }) >= maxBatchBytes) {
        sendBatch();
    }
}

// skipGate is only used to drain a queue that is still over the size limit after a successful send.
// apiDurationTimer gates the start of a send, not each chunk of a drain, so drain chunks go out
// back to back. The drain is bounded instead by the queue size: each chunk consumes maxBatchBytes.
// SEND_LOCK (see acquireSendLock) still applies to every call, gated or not: it's what actually
// prevents two sends from being in flight at once, in this tab or another.
async function sendBatch(skipGate: boolean = false) {
    if (!skipGate) {
        // check if apiCallTimestamp is present in localStorage
        // if not present, set it to current time epoch
        if (!ifExists('apiCallTimestamp')) {
            setLocal('apiCallTimestamp', new Date().getTime());
        } else {
            // if timestamp is present check if apiDurationTimer has elapsed since then, if yes reset it
            if (new Date().getTime() - getLocal('apiCallTimestamp') > apiDurationTimer) {
                setLocal('apiCallTimestamp', new Date().getTime());
            } else {
                // if apiDurationTimer has not elapsed, make no api call and return
                return;
            }
        }
    }
    if (!acquireSendLock()) {
        // another send (this tab or another tab) is already in flight for this queue; back off
        // instead of re-reading events it hasn't removed yet
        return;
    }
    if (!ifExists('flickEvents') || !ifExists('userIdentity') || getLocal('flickEvents').length == 0) {
        releaseSendLock();
        return;
    }
    const queued = getLocal('flickEvents');
    // send only as many events as fit in maxBatchBytes, the rest stay queued for the next send
    const size = batchCount(queued);
    let event: EventPayload = {
        batch: queued.slice(0, size),
        sent_at: new Date().toISOString(),
    }
    send(event, {})
        .then((res: any) => {
            removeFromStart(size, 'flickEvents')
            releaseSendLock();
            const remaining = ifExists('flickEvents') ? getLocal('flickEvents') : [];
            if (maxBatchBytes !== null && Array.isArray(remaining) && byteSize(remaining) >= maxBatchBytes) {
                sendBatch(true);
            }
        })
        .catch(err => {
            console.error('error while sending api request ', err)
            releaseSendLock();
            // if there is continuous failure to send events, then clear events in LRU manner to avoid
            // excess storage of events in browser's local storage. Reads the live queue (not the
            // `queued` snapshot from above) so events appended while this request was in flight are
            // counted too, and the threshold is no longer tied to how many events this one request
            // happened to attempt.
            const current = ifExists('flickEvents') ? getLocal('flickEvents') : [];
            if (Array.isArray(current) && current.length > 1000) {
                removeFromStart(current.length - 1000, 'flickEvents')
            }
        })
}

function getSessionId (): string {
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