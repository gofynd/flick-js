import { axiosClient } from "./AxiosUtility";
export async function post(url, request, header = {}) {
    let headers = {
        ...header
    };
    return axiosClient.post(url, request, {
        headers: headers
    });
}
//# sourceMappingURL=AxiosRequests.js.map