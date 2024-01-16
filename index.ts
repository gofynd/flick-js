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
    setLocal('userIdentity', userIdentity)
    sendEvent("identity", userIdentity)
}

export async function reset() {
    if (batchExecutorID) {
        clearInterval(batchExecutorID);
        batchExecutorID = null
    }
    deleteSteliosLocal('userIdentity');
    deleteSteliosLocal('apiKey');
    deleteSteliosLocal('stelioEvents')
}

export async function initialize(endpoint: string, apiKey: any) {
    initStorage()
    axiosCreate(endpoint)
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
    if (!ifExists('stelioEvents')) {
        setLocal('stelioEvents', new Array(payload))
        return;
    }
    return appendLocal('stelioEvents', payload)
}

async function sendBatch() {
    if (!ifExists('stelioEvents') || !ifExists('userIdentity') || getLocal('stelioEvents').length == 0)
        return;
    let event: EventPayload = {
        batch: getLocal('stelioEvents'),
        sentAt: new Date().toDateString(),
    }
    let size = getLocal('stelioEvents').length || 0;
    send(getLocal('apiKey'), event)
        .then((res: any) => {
            removeFromStart(size, 'stelioEvents')
        })
        .catch(err => console.error('error while sending api request ', err))
}

