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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.axiosCreate = exports.axiosClient = void 0;
var axios_1 = require("axios");
var isAbsoluteURL_1 = require("axios/lib/helpers/isAbsoluteURL");
var query_string_1 = require("query-string");
var sign = require("@gofynd/fp-signature").sign;
function getTransformer(config) {
    var transformRequest = config.transformRequest;
    if (transformRequest) {
        if (typeof transformRequest === "function") {
            return transformRequest;
        }
        else if (transformRequest.length) {
            return transformRequest[0];
        }
    }
    throw new Error("Could not get default transformRequest function from Axios defaults");
}
function requestInterceptorFn() {
    console.log("########### inside response interceptor #############");
    return function (config) {
        if (!config.url) {
            throw new Error("No URL present in request config, unable to sign request");
        }
        var url = config.url;
        if (config.baseURL && !(0, isAbsoluteURL_1.isAbsoluteURL)(config.url)) {
            url = (0, isAbsoluteURL_1.combineURLs)(config.baseURL, config.url);
        }
        var _a = new URL(url), host = _a.host, pathname = _a.pathname, search = _a.search;
        var data = config.data, headers = config.headers, method = config.method, params = config.params;
        //headers["x-fp-sdk-version"] = version;
        var querySearchObj = query_string_1.default.parse(search);
        querySearchObj = __assign(__assign({}, querySearchObj), params);
        var queryParam = "";
        if (querySearchObj && Object.keys(querySearchObj).length) {
            if (query_string_1.default.stringify(querySearchObj).trim() !== "") {
                queryParam = "?".concat(query_string_1.default.stringify(querySearchObj));
            }
        }
        var transformedData;
        if (method != "get") {
            var transformRequest = getTransformer(config);
            transformedData = transformRequest(data, headers);
        }
        // Remove all the default Axios headers
        var common = headers.common, _delete = headers.delete, // 'delete' is a reserved word
        get = headers.get, head = headers.head, post = headers.post, put = headers.put, patch = headers.patch, headersToSign = __rest(headers, ["common", "delete", "get", "head", "post", "put", "patch"]);
        var signingOptions = {
            method: method && method.toUpperCase(),
            host: host,
            path: pathname + search + queryParam,
            body: transformedData,
            headers: headersToSign
        };
        var signature = sign(signingOptions);
        config.headers["x-fp-date"] = signature["x-fp-date"];
        config.headers["x-fp-signature"] = signature["x-fp-signature"];
        // config.headers["fp-sdk-version"] = version;
        return config;
    };
}
function axiosCreate(endpoint) {
    var instance = axios_1.default.create({
        baseURL: endpoint,
        headers: {
            "Content-type": "application/json"
        },
        withCredentials: true
    });
    instance.interceptors.request.use(requestInterceptorFn());
    // instance.interceptors.request.use(
    //   (config) => {
    //     const token = localStorage.getItem('idToken');
    //     if (token) {
    //       config.headers["Authorization"] = token; // for Node.js Express back-end
    //     }
    //     return config;
    //   },
    //   (error) => {
    //     return Promise.reject(error);
    //   }
    // );
    // instance.interceptors.response.use(
    //   (res) => {
    //     return res;
    //   },
    //   async (err) => {
    //     console.log(err)
    //     const originalConfig = err.config;
    //     console.log(originalConfig.url,"#############")
    //     if (originalConfig.url !== "/users/signin" && err.response) {
    //       // Access Token was expired
    //       if (err.response.status === 401 && !originalConfig._retry) {
    //         originalConfig._retry = true;
    //         try {
    //           const rs = await axios.post(baseURLs['auth']+"/users/renewtoken", {
    //             refresh_token: localStorage.getItem('refresh_token'),
    //             email: localStorage.getItem('email')
    //           });
    //           console.log("#@@$#@$#@$@$#@$#@$#",rs.data)
    //           const { id_token,access_token,refresh_token } = rs.data.response;
    //           localStorage.setItem('refresh_token', refresh_token);
    //           localStorage.setItem('idToken', id_token);
    //           localStorage.setItem('access_token', access_token);
    //           return instance(originalConfig);
    //         } catch (_error) {
    //           return Promise.reject(_error);
    //         }
    //       }
    //     }
    //     return Promise.reject(err);
    //   }
    // );
    exports.axiosClient = instance;
}
exports.axiosCreate = axiosCreate;
//# sourceMappingURL=AxiosUtility.js.map