import { validate, generateContext } from "./src/services/SteliosClient";
import { send } from "./src/services/EventsProcessor";
import { appendLocal, setLocal, ifExists, getLocal, removeFromStart, deleteSteliosLocal, initStorage } from "./src/services/StelioLocalStore"
import { EventPayload } from './src/models/eventPayload'
import { v4 as uuidv4 } from 'uuid';
import { SteliosEvent } from "./src/models/steliosEvent";


export var axiosRequest: any = null;
export var eventProcessor: any = null
export var client: any = null
export var apiKey: any = null;
export var stelioLocal: any = null
export var batchExecutorID: any = null
export async function identify(userID: string, traits: any) {
    if (!userID)
        userID = `anonymous_${uuidv4()}`;
    if (!traits)
        traits = {};
    return setLocal('userIdentity', { userID: userID, traits: traits })
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
export async function initialize(apiKey: any) {
    initStorage();
    return validateClient(apiKey)
        .then(res => {
            if (res.data.isTokenValid == "true") {
                if (!ifExists('userIdentity'))
                    setLocal('userIdentity', { userID: `anonymous_${uuidv4()}`, traits: {} })
                setLocal('apiKey', apiKey);
                if (!batchExecutorID)
                    batchExecutorID = setInterval(sendBatch, 5000)
            }

        })
        .catch(err => {
            console.error('error is', err);
            return err
        })
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
    if (!ifExists('userIdentity') || !ifExists('apiKey')) {
        throw new Error('Please initialiaze userIdentity or Apikey Sdk by calling initialize or identify method');
    }
    if (!eventName || !props) {
        throw new Error('Please provide eventName and properties of the user');
    }
    let payload: SteliosEvent = generateContext(eventName, props);
    payload.context.traits = getLocal('userIdentity').traits || {};
    payload.user_id = getLocal('userIdentity').userID || '';
    if (!ifExists('stelioEvents')) {
        setLocal('stelioEvents', new Array(payload))
        return;
    }
    return appendLocal('stelioEvents', payload)
}
async function sendBatch() {
    if (!ifExists('stelioEvents') || !ifExists('userIdentity') || !ifExists('apiKey') || getLocal('stelioEvents').length == 0)
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

