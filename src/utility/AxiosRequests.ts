import { axiosCreate } from "./AxiosUtility";


   export  async function post(url:any, request:any, header = {}) {
        let headers = {
            ...header
        }
        return axiosCreate().post<any>(url, request, {
            headers: headers
        })
    }