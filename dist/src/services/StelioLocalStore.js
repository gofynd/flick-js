//var localStorage: any = window.localStorage
var localStorage;
let inMemStore = {};
const customLocalStorage = {
    getItem: (key) => {
        return inMemStore[key];
    },
    setItem: (key, value) => {
        inMemStore[key] = value;
    },
    removeItem: (key) => {
        delete inMemStore[key];
    },
};
export function initStorage() {
    var isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
        localStorage = window.localStorage;
    }
    else {
        localStorage = customLocalStorage;
    }
}
export function appendLocal(key, payload) {
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
export function setLocal(key, payload) {
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
export function ifExists(key) {
    if (!localStorage.getItem(key))
        return false;
    return true;
}
export function getLocal(key) {
    try {
        if (!key || key.length == 0)
            return 'null';
        if (!localStorage.getItem(key))
            return {};
        const result = JSON.parse(localStorage.getItem(key));
        return result;
    }
    catch (err) {
        return err;
    }
}
export function removeFromStart(size, key) {
    if (!key || key.length == 0 || !ifExists(key))
        return;
    let result = JSON.parse(localStorage.getItem(key));
    size = size > result.length ? result.length : size;
    result.splice(0, size);
    if (result && result.length > 0) {
        deleteSteliosLocal(key);
        return setLocal(key, result);
    }
    return deleteSteliosLocal(key);
}
export function deleteSteliosLocal(key) {
    if (!key || key.length == 0 || !ifExists(key))
        return;
    const res = localStorage.removeItem(key);
    console.info(`key ${key} deleted from localStorage`);
    return res;
}
//# sourceMappingURL=StelioLocalStore.js.map