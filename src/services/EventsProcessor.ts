import { post } from "../utility/AxiosRequests";



 export function  send( apiKey:any, payload:any) {
        let res = post('events', payload, { 'x-dp-access-token': apiKey })
        return res;
    }