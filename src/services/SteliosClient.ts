import { post } from "../utility/AxiosRequests";
import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';

export function validate(apiKey: any) {
    let res = post('verify_token', { access_token: apiKey }, { "x-dp-access-token": apiKey })
    return res;
}
export function generateContext(eventName: any, props: any) {
    var parser = new UAParser(navigator.userAgent);
    const referrerUrl = typeof document !== 'undefined' ? (document.referrer || '') : '';
    const device = parser.getDevice();
    let payload = {
        context: {
            library: {
                name: "flick",
                version: "1.0.4"
            },
            os: parser.getOS(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen: {
                width: window.screen.availWidth,
                height: window.screen.availHeight
            },
            user_agent: navigator.userAgent || '',
            referrer: referrerUrl,
            locale: navigator.languages && navigator.languages.length
                ? navigator.languages[0]
                : navigator.language,
            device: {
                is_mobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
                type: device.type || 'desktop',
                name: device.model
            }
        },
        event_id: uuidv4(),
        event_name: eventName,
        properties: props,
        event_timestamp: new Date(),
        user_id: '',
        anonymous_id: '',
        session_id: ''
    }
    return payload;

}
