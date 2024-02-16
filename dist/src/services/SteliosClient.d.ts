export declare function validate(apiKey: any): Promise<any>;
export declare function generateContext(eventName: any, props: any): {
    context: {};
    event_id: string;
    event_name: any;
    properties: any;
    event_timestamp: Date;
    user_id: string;
    anonymous_id: string;
};
