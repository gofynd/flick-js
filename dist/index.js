import { generateContext } from "./src/services/SteliosClient";
import { send } from "./src/services/EventsProcessor";
import { appendLocal, setLocal, ifExists, getLocal, removeFromStart, deleteSteliosLocal, initStorage } from "./src/services/StelioLocalStore";
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
 * @param maxBatchSize optional, max size in KB of one request. Events are also sent as soon as the queue reaches this size. No size limit is applied unless it is passed, must be greater than 0.
 */
export async function initialize(endpoint, apiKey, flushInterval = DEFAULT_FLUSH_INTERVAL, apiDurationInterval = 5000, maxBatchSize) {
    if (typeof flushInterval !== 'number' || isNaN(flushInterval) || flushInterval < MIN_FLUSH_INTERVAL) {
        throw new Error(`flushInterval must be a number of at least ${MIN_FLUSH_INTERVAL} ms`);
    }
    if (maxBatchSize !== undefined && (typeof maxBatchSize !== 'number' || isNaN(maxBatchSize) || maxBatchSize <= 0)) {
        throw new Error('maxBatchSize must be a number greater than 0 (KB)');
    }
    maxBatchBytes = maxBatchSize === undefined ? null : maxBatchSize * 1024;
    // keep the multi-tab gate below the flush interval so it never skips a tick
    apiDurationTimer = Math.min(apiDurationInterval, flushInterval / 2);
    initStorage();
    axiosCreate(endpoint, apiKey);
    if (!batchExecutorID)
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
    let result;
    if (!ifExists('flickEvents')) {
        setLocal('flickEvents', new Array(payload));
    }
    else {
        result = appendLocal('flickEvents', payload);
    }
    // send without waiting for the next flush interval once the queue reaches the size limit
    if (batchExecutorID && maxBatchBytes !== null && byteSize(getLocal('flickEvents')) >= maxBatchBytes) {
        sendBatch();
    }
    return result;
}
// skipGate is only used to drain a queue that is still over the size limit after a successful send.
// apiDurationTimer gates the start of a send, not each chunk of a drain, so drain chunks go out
// back to back. The drain is bounded instead by the queue size: each chunk consumes maxBatchBytes.
async function sendBatch(skipGate = false) {
    if (!skipGate) {
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
    }
    if (!ifExists('flickEvents') || !ifExists('userIdentity') || getLocal('flickEvents').length == 0)
        return;
    const queued = getLocal('flickEvents');
    // send only as many events as fit in maxBatchBytes, the rest stay queued for the next send
    const size = batchCount(queued);
    let event = {
        batch: queued.slice(0, size),
        sent_at: new Date().toISOString(),
    };
    send(event, {})
        .then((res) => {
        removeFromStart(size, 'flickEvents');
        const remaining = getLocal('flickEvents');
        if (maxBatchBytes !== null && Array.isArray(remaining) && byteSize(remaining) >= maxBatchBytes) {
            sendBatch(true);
        }
    })
        .catch(err => {
        console.error('error while sending api request ', err);
        // if there is continuous failure to send events, then clear events in LRU manner to avoid excess storage of events in browser's local storage
        if (queued.length > 1000) {
            removeFromStart(queued.length - 1000, 'flickEvents');
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