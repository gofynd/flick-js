import { post } from "../utility/AxiosRequests";



export function send(payload: any, headers: any) {
    let res = post('service/application/webhook/v1.0/click-analytics/events', payload, headers)
    return res;
}