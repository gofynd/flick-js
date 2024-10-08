/// <reference types="ua-parser-js" />
export declare function validate(apiKey: any): Promise<any>;
export declare function generateContext(eventName: any, props: any): {
    context: {
        library: {
            name: string;
            version: string;
        };
        os: import("ua-parser-js").IOS;
        timezone: string;
        screen: {
            width: number;
            height: number;
        };
        user_agent: string;
        locale: string;
        device: {
            is_mobile: boolean;
        };
    };
    event_id: string;
    event_name: any;
    properties: any;
    event_timestamp: Date;
    user_id: string;
    anonymous_id: string;
};
