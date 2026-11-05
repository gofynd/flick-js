export declare var axiosRequest: any;
export declare var eventProcessor: any;
export declare var client: any;
export declare var apiKey: any;
export declare var stelioLocal: any;
export declare var batchExecutorID: any;
export declare function identify(userID: string, traits: any, emitLoginEvent?: boolean): Promise<void>;
export declare function reset(): Promise<void>;
/**
 * @param flushInterval time in ms between checks that send queued events to the API. Defaults to 15000, must be at least 5000 when provided.
 * @param apiDurationInterval minimum gap in ms before a new send is allowed to start. Defaults to 5000, must be a non-negative number when provided.
 * @param maxBatchSize optional, max size in KB of one request. Events are also sent as soon as the queue reaches this size. No size limit is applied unless it is passed, must be greater than 0.
 */
export declare function initialize(endpoint: string, apiKey: any, flushInterval?: number, apiDurationInterval?: number, maxBatchSize?: number): Promise<void>;
export declare function validateClient(apiKey: any): Promise<{
    data: {
        isTokenValid: string;
    };
}>;
export declare function sendEvent(eventName: any, props: any): Promise<void>;
