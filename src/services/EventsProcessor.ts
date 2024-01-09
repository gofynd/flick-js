import { post } from "../utility/AxiosRequests";



 export function  send( apiKey:any, payload:any) {
        let res = post('service/application/webhook/v1.0/click-analytics/events', payload, { 'x-dp-access-token': apiKey })
        return res;
    }