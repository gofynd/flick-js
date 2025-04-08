import axios from "axios";
import * as querystring from 'query-string';
// const querystring = require("query-string");
//  const { sign } = require("@gofynd/fp-signature")
import { sign } from "@gofynd/fp-signature";
export var axiosClient;
function combineURLs(baseURL, relativeURL) {
    if (!baseURL)
        return relativeURL;
    if (!relativeURL)
        return baseURL;
    // Trim trailing slash from baseURL if present and leading slash from relativeURL if present
    return `${baseURL.replace(/\/+$/, '')}/${relativeURL.replace(/^\/+/, '')}`;
}
function isAbsoluteURL(url) {
    // A simple regex that checks for the start of a URL scheme (http, https, etc.)
    return /^https?:\/\/|^\/\//i.test(url);
}
function getTransformer(config) {
    const { transformRequest } = config;
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
    return (config) => {
        if (!config.url) {
            throw new Error("No URL present in request config, unable to sign request");
        }
        let url = config.url;
        if (config.baseURL && !isAbsoluteURL(config.url)) {
            url = combineURLs(config.baseURL, config.url);
        }
        const { host, pathname, search } = new URL(url);
        const { data, headers, method, params } = config;
        //headers["x-fp-sdk-version"] = version;
        let querySearchObj = querystring.parse(search);
        querySearchObj = { ...querySearchObj, ...params };
        let queryParam = "";
        if (querySearchObj && Object.keys(querySearchObj).length) {
            if (querystring.stringify(querySearchObj).trim() !== "") {
                queryParam = `?${querystring.stringify(querySearchObj)}`;
            }
        }
        let transformedData;
        if (method != "get") {
            const transformRequest = getTransformer(config);
            transformedData = transformRequest(data, headers);
        }
        // Remove all the default Axios headers
        const { common, delete: _delete, // 'delete' is a reserved word
        get, head, post, put, patch, ...headersToSign } = headers;
        const signingOptions = {
            method: method && method.toUpperCase(),
            host: host,
            path: pathname + search + queryParam,
            body: transformedData,
            headers: headersToSign
        };
        const signature = sign(signingOptions);
        config.headers["x-fp-date"] = signature["x-fp-date"];
        config.headers["x-fp-signature"] = signature["x-fp-signature"];
        // config.headers["fp-sdk-version"] = version;
        return config;
    };
}
export function axiosCreate(endpoint, apiKey) {
    const instance = axios.create({
        baseURL: endpoint,
        headers: {
            "Content-type": "application/json",
            "Authorization": `Bearer ${apiKey}`
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
    axiosClient = instance;
}
//# sourceMappingURL=AxiosUtility.js.map