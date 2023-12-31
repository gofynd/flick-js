"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSteliosLocal = exports.removeFromStart = exports.getLocal = exports.ifExists = exports.setLocal = exports.appendLocal = exports.initStorage = void 0;
//var localStorage: any = window.localStorage
var localStorage;
var inMemStore = {};
var customLocalStorage = {
    getItem: function (key) {
        return inMemStore[key];
    },
    setItem: function (key, value) {
        inMemStore[key] = value;
    },
    removeItem: function (key) {
        delete inMemStore[key];
    },
};
function initStorage() {
    console.log("############ inside initStorage ##############");
    var isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
        localStorage = window.localStorage;
    }
    else {
        localStorage = customLocalStorage;
    }
}
exports.initStorage = initStorage;
function appendLocal(key, payload) {
    try {
        if (key.length == 0 || !payload)
            return;
        if (!localStorage.getItem(key))
            return setLocal(key, payload);
        var users = JSON.parse(localStorage.getItem(key));
        users.push(payload);
        return localStorage.setItem(key, JSON.stringify(users));
    }
    catch (err) {
        return err;
    }
}
exports.appendLocal = appendLocal;
function setLocal(key, payload) {
    try {
        if (!key || key.length == 0 || !payload) {
            return;
        }
        localStorage.setItem(key, JSON.stringify(payload));
    }
    catch (err) {
        return err;
    }
}
exports.setLocal = setLocal;
function ifExists(key) {
    console.log(localStorage);
    if (!localStorage.getItem(key))
        return false;
    return true;
}
exports.ifExists = ifExists;
function getLocal(key) {
    try {
        if (!key || key.length == 0)
            return 'null';
        if (!localStorage.getItem(key))
            return {};
        var result = JSON.parse(localStorage.getItem(key));
        return result;
    }
    catch (err) {
        return err;
    }
}
exports.getLocal = getLocal;
function removeFromStart(size, key) {
    if (!key || key.length == 0 || !ifExists(key))
        return;
    var result = JSON.parse(localStorage.getItem(key));
    size = size > result.length ? result.length : size;
    result.splice(0, size);
    if (result && result.length > 0) {
        deleteSteliosLocal(key);
        return setLocal(key, result);
    }
    return deleteSteliosLocal(key);
}
exports.removeFromStart = removeFromStart;
function deleteSteliosLocal(key) {
    if (!key || key.length == 0 || !ifExists(key))
        return;
    var res = localStorage.removeItem(key);
    console.info("key ".concat(key, " deleted from localStorage"));
    return res;
}
exports.deleteSteliosLocal = deleteSteliosLocal;
//# sourceMappingURL=StelioLocalStore.js.map