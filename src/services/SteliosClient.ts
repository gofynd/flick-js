import { post } from "../utility/AxiosRequests";
import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';

export function validate(apiKey: any) {
    let res = post('verify_token', { access_token: apiKey }, { "x-dp-access-token": apiKey })
    return res;
}
export function generateContext(eventName: any, props: any) {
    //var parser = new UAParser(navigator.userAgent);
    let payload = {
        context: {
            library: {
                name: "flick",
                version: "1.0.4"
            },
            os: {
                name: UAParser.OS.NAME,
                version: UAParser.OS.VERSION
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen: {
                width: window.screen.availWidth,
                height: window.screen.availHeight
            },
            userAgent: navigator.userAgent || '',
            locale: navigator.languages && navigator.languages.length
                ? navigator.languages[0]
                : navigator.language,
            device: {
                isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
            }
        },
        event_id: uuidv4(),
        event_name: eventName,
        properties: props,
        event_timestamp: new Date(),
        user_id: '',
        anonymous_id: ''
    }
    return payload;

}
