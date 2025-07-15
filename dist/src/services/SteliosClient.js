import { post } from "../utility/AxiosRequests";
import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';
export function validate(apiKey) {
    let res = post('verify_token', { access_token: apiKey }, { "x-dp-access-token": apiKey });
    return res;
}
export async function generateContext(eventName, props) {
    var parser = new UAParser(navigator.userAgent);
    let payload = {
        context: {
            library: {
                name: "flick",
                version: "1.0.4"
            },
            os: parser.getOS(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            location: await getLocation(),
            screen: {
                width: window.screen.availWidth,
                height: window.screen.availHeight
            },
            user_agent: navigator.userAgent || '',
            locale: navigator.languages && navigator.languages.length
                ? navigator.languages[0]
                : navigator.language,
            device: {
                is_mobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
                ...parser.getDevice()
            }
        },
        event_id: uuidv4(),
        event_name: eventName,
        properties: props,
        event_timestamp: new Date(),
        user_id: '',
        anonymous_id: ''
    };
    return payload;
}
export function getLocation() {
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                resolve({ lat, long: lon, accuracy });
            }, (error) => {
                console.error("Error getting location:", error);
                resolve(null);
            }, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0 // No cached data
            });
        }
        else {
            console.log("Geolocation not supported on this browser.");
            resolve(null);
        }
    });
}
//# sourceMappingURL=SteliosClient.js.map