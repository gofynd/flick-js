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
export async function initialize(endpoint, apiKey, flushInterval = 15000) {
    initStorage();
    axiosCreate(endpoint, apiKey);
    if (!batchExecutorID)
        batchExecutorID = setInterval(sendBatch, flushInterval);
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
    if (!ifExists('flickEvents')) {
        setLocal('flickEvents', new Array(payload));
        return;
    }
    return appendLocal('flickEvents', payload);
}
async function sendBatch() {
    if (!ifExists('flickEvents') || !ifExists('userIdentity') || getLocal('flickEvents').length == 0)
        return;
    let event = {
        batch: getLocal('flickEvents'),
        sent_at: new Date().toISOString(),
    };
    let size = getLocal('flickEvents').length || 0;
    send(event, {})
        .then((res) => {
        removeFromStart(size, 'flickEvents');
    })
        .catch(err => {
        console.error('error while sending api request ', err);
        // if there is continuous failure to send events, then clear events in LRU manner to avoid excess storage of events in browser's local storage
        if (size > 1000) {
            removeFromStart(size - 1000, 'flickEvents');
        }
    });
}
//# sourceMappingURL=index.js.map