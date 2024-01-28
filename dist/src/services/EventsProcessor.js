"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.send = void 0;
var AxiosRequests_1 = require("../utility/AxiosRequests");
function send(payload, headers) {
    var res = (0, AxiosRequests_1.post)('service/application/webhook/v1.0/click-analytics/events', payload, headers);
    return res;
}
exports.send = send;
//# sourceMappingURL=EventsProcessor.js.map