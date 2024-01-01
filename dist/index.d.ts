export declare var axiosRequest: any;
export declare var eventProcessor: any;
export declare var client: any;
export declare var apiKey: any;
export declare var stelioLocal: any;
export declare var batchExecutorID: any;
export declare function identify(userID: string, traits: any): Promise<any>;
export declare function reset(): Promise<void>;
export declare function initialize(endpoint: string, apiKey: any): Promise<void>;
export declare function validateClient(apiKey: any): Promise<{
    data: {
        isTokenValid: string;
    };
}>;
export declare function sendEvent(eventName: any, props: any): Promise<any>;
