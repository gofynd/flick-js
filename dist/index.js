"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEvent = exports.validateClient = exports.initialize = exports.reset = exports.identify = exports.batchExecutorID = exports.stelioLocal = exports.apiKey = exports.client = exports.eventProcessor = exports.axiosRequest = void 0;
var SteliosClient_1 = require("./src/services/SteliosClient");
var EventsProcessor_1 = require("./src/services/EventsProcessor");
var StelioLocalStore_1 = require("./src/services/StelioLocalStore");
var uuid_1 = require("uuid");
var AxiosUtility_1 = require("./src/utility/AxiosUtility");
exports.axiosRequest = null;
exports.eventProcessor = null;
exports.client = null;
exports.apiKey = null;
exports.stelioLocal = null;
exports.batchExecutorID = null;
function identify(userID, traits) {
    return __awaiter(this, void 0, void 0, function () {
        var existingIdentity, newIdentity;
        return __generator(this, function (_a) {
            existingIdentity = (0, StelioLocalStore_1.getLocal)('userIdentity');
            newIdentity = {};
            if (existingIdentity) {
                // userIdentity exists
                if (existingIdentity.userID && existingIdentity.userID !== userID) {
                    // userIdentity exists with a different userID, generate new anonymousID and userID
                    newIdentity = {
                        anonymousID: (0, uuid_1.v4)(),
                        userID: userID
                    };
                }
                else {
                    // userIdentity exists with the same userID, only add userID to existing anonymousID
                    newIdentity = __assign(__assign({}, existingIdentity), { userID: userID // Ensure userID is updated or added without changing anonymousID
                     });
                }
            }
            else {
                // userIdentity doesn't exist, create a new one with new anonymousID
                newIdentity = {
                    anonymousID: (0, uuid_1.v4)(),
                    userID: userID
                };
            }
            (0, StelioLocalStore_1.setLocal)("userIdentity", newIdentity);
            sendEvent("user_login", __assign({ "event_type": "identity" }, traits));
            return [2 /*return*/];
        });
    });
}
exports.identify = identify;
function reset() {
    return __awaiter(this, void 0, void 0, function () {
        var newIdentity;
        return __generator(this, function (_a) {
            (0, StelioLocalStore_1.deleteSteliosLocal)('userIdentity');
            (0, StelioLocalStore_1.deleteSteliosLocal)('apiKey');
            newIdentity = {
                anonymousID: (0, uuid_1.v4)()
            };
            (0, StelioLocalStore_1.setLocal)("userIdentity", newIdentity);
            return [2 /*return*/];
        });
    });
}
exports.reset = reset;
function initialize(endpoint, apiKey, flushInterval) {
    if (flushInterval === void 0) { flushInterval = 15000; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            (0, StelioLocalStore_1.initStorage)();
            (0, AxiosUtility_1.axiosCreate)(endpoint, apiKey);
            if (!exports.batchExecutorID)
                exports.batchExecutorID = setInterval(sendBatch, flushInterval);
            return [2 /*return*/];
        });
    });
}
exports.initialize = initialize;
function validateClient(apiKey) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, {
                    "data": {
                        isTokenValid: "true"
                    }
                }
                //return validate( apiKey)
            ];
        });
    });
}
exports.validateClient = validateClient;
function sendEvent(eventName, props) {
    return __awaiter(this, void 0, void 0, function () {
        var payload;
        return __generator(this, function (_a) {
            if (!(0, StelioLocalStore_1.ifExists)('userIdentity')) {
                (0, StelioLocalStore_1.setLocal)('userIdentity', { anonymousID: (0, uuid_1.v4)() });
            }
            if (!eventName || !props) {
                throw new Error('Please provide eventName and properties of the user');
            }
            payload = (0, SteliosClient_1.generateContext)(eventName, props);
            payload.user_id = (0, StelioLocalStore_1.getLocal)('userIdentity').userID || null;
            payload.anonymous_id = (0, StelioLocalStore_1.getLocal)('userIdentity').anonymousID;
            if (!(0, StelioLocalStore_1.ifExists)('flickEvents')) {
                (0, StelioLocalStore_1.setLocal)('flickEvents', new Array(payload));
                return [2 /*return*/];
            }
            return [2 /*return*/, (0, StelioLocalStore_1.appendLocal)('flickEvents', payload)];
        });
    });
}
exports.sendEvent = sendEvent;
function sendBatch() {
    return __awaiter(this, void 0, void 0, function () {
        var event, size;
        return __generator(this, function (_a) {
            if (!(0, StelioLocalStore_1.ifExists)('flickEvents') || !(0, StelioLocalStore_1.ifExists)('userIdentity') || (0, StelioLocalStore_1.getLocal)('flickEvents').length == 0)
                return [2 /*return*/];
            event = {
                batch: (0, StelioLocalStore_1.getLocal)('flickEvents'),
                sentAt: new Date().toISOString(),
            };
            size = (0, StelioLocalStore_1.getLocal)('flickEvents').length || 0;
            (0, EventsProcessor_1.send)(event, {})
                .then(function (res) {
                (0, StelioLocalStore_1.removeFromStart)(size, 'flickEvents');
            })
                .catch(function (err) {
                console.error('error while sending api request ', err);
                // if there is continuous failure to send events, then clear events in LRU manner to avoid excess storage of events in browser's local storage
                if (size > 1000) {
                    (0, StelioLocalStore_1.removeFromStart)(size - 1000, 'flickEvents');
                }
            });
            return [2 /*return*/];
        });
    });
}
//# sourceMappingURL=index.js.map