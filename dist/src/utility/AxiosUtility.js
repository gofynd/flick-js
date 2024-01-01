"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseURLs = exports.axiosCreate = exports.axiosClient = void 0;
var axios_1 = require("axios");
function axiosCreate(endpoint) {
    var instance = axios_1.default.create({
        baseURL: endpoint,
        headers: {
            "Content-type": "application/json"
        },
        withCredentials: true
    });
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
exports.baseURLs = {
    event_bus: "http://localhost:8099/v1.0/click-analytics",
};
//# sourceMappingURL=AxiosUtility.js.map