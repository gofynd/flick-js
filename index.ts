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

export async function identify(userID: string, traits: any) {
    const userIdentity = getLocal('userIdentity');
    // Check if userIdentity does not exist or if userID has changed
    if (!userIdentity || userIdentity.userID !== userID) {
        setLocal('userIdentity', { anonymousID: uuidv4(), userID: userID, traits: traits });
    }
    sendEvent("identity", userIdentity)
}

export async function reset() {
    if (batchExecutorID) {
        clearInterval(batchExecutorID);
        batchExecutorID = null
    }
    deleteSteliosLocal('userIdentity');
    deleteSteliosLocal('apiKey');
}

export async function initialize(endpoint: string, apiKey: any) {
    initStorage()
    axiosCreate(endpoint, apiKey)
    if (!batchExecutorID)
        batchExecutorID = setInterval(sendBatch, 5000)
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
    payload.context.traits = getLocal('userIdentity').traits || {};
    payload.user_id = getLocal('userIdentity').userID || null;
    payload.anonymous_id = getLocal('userIdentity').anonymousID
    if (!ifExists('flickEvents')) {
        setLocal('flickEvents', new Array(payload))
        return;
    }
    return appendLocal('flickEvents', payload)
}

async function sendBatch() {
    if (!ifExists('flickEvents') || !ifExists('userIdentity') || getLocal('flickEvents').length == 0)
        return;
    let event: EventPayload = {
        batch: getLocal('flickEvents'),
        sentAt: new Date().toISOString(),
    }
    let size = getLocal('flickEvents').length || 0;
    send(event, {})
        .then((res: any) => {
            removeFromStart(size, 'flickEvents')
        })
        .catch(err => console.error('error while sending api request ', err))
}

