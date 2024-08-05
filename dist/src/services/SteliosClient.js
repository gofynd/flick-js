"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateContext = exports.validate = void 0;
var AxiosRequests_1 = require("../utility/AxiosRequests");
var uuid_1 = require("uuid");
var ua_parser_js_1 = require("ua-parser-js");
function validate(apiKey) {
    var res = (0, AxiosRequests_1.post)('verify_token', { access_token: apiKey }, { "x-dp-access-token": apiKey });
    return res;
}
exports.validate = validate;
function generateContext(eventName, props) {
    var parser = new ua_parser_js_1.UAParser(navigator.userAgent);
    var payload = {
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
            locale: navigator.languages && navigator.languages.length
                ? navigator.languages[0]
                : navigator.language,
            device: {
                is_mobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
            }
        },
        event_id: (0, uuid_1.v4)(),
        event_name: eventName,
        properties: props,
        event_timestamp: new Date(),
        user_id: '',
        anonymous_id: ''
    };
    return payload;
}
exports.generateContext = generateContext;
//# sourceMappingURL=SteliosClient.js.map