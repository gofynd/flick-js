import { axiosClient } from "./AxiosUtility";


export async function post(url: any, request: any, header = {}) {
    let headers = {
        ...header
    }
    return axiosClient.post(url, request, {
        headers: headers
    })
}