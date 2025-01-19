import { validate, generateContext } from "./src/services/SteliosClient";
import { send } from "./src/services/EventsProcessor";
import { appendLocal, setLocal, ifExists, getLocal, removeFromStart, deleteSteliosLocal, initStorage } from "./src/services/StelioLocalStore"
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
var  apiDurationTimer: any = null; // Global variable to time difference between multiple API calls 
                                    // to avoid sending same data from multiple tabs 

export async function identify(userID: string, traits: any, emitLoginEvent = true) {
    const existingIdentity = getLocal('userIdentity');
    let newIdentity = {}
    if (existingIdentity && Object.keys(existingIdentity).length > 0 ) {
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
    if(emitLoginEvent) {
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

export async function initialize(endpoint: string, apiKey: any, flushInterval: number = 15000, apiDurationInterval: number = 5000) {
    apiDurationTimer = apiDurationInterval;
    initStorage()
    axiosCreate(endpoint, apiKey)
    if (!batchExecutorID)
        batchExecutorID = setInterval(sendBatch, flushInterval)
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
    payload.anonymous_id = getLocal('userIdentity').anonymousID
    if (!ifExists('flickEvents')) {
        setLocal('flickEvents', new Array(payload))
        return;
    }
    return appendLocal('flickEvents', payload)
}

async function sendBatch() {
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
    if (!ifExists('flickEvents') || !ifExists('userIdentity') || getLocal('flickEvents').length == 0)
        return;
    let event: EventPayload = {
        batch: getLocal('flickEvents'),
        sent_at: new Date().toISOString(),
    }
    let size = getLocal('flickEvents').length || 0;
    send(event, {})
        .then((res: any) => {
            removeFromStart(size, 'flickEvents')
        })
        .catch(err => {
            console.error('error while sending api request ', err)
            // if there is continuous failure to send events, then clear events in LRU manner to avoid excess storage of events in browser's local storage
            if (size > 1000) {
                removeFromStart(size - 1000, 'flickEvents')
            }
        })
}

