/// <reference types="ua-parser-js" />
export declare function validate(apiKey: any): Promise<any>;
export declare function generateContext(eventName: any, props: any): Promise<{
    context: {
        library: {
            name: string;
            version: string;
        };
        os: import("ua-parser-js").IOS;
        timezone: string;
        location: unknown;
        screen: {
            width: number;
            height: number;
        };
        user_agent: string;
        referrer: string;
        locale: string;
        device: {
            is_mobile: boolean;
            type: string;
            name: string;
        };
    };
    event_id: string;
    event_name: any;
    properties: any;
    event_timestamp: Date;
    user_id: string;
    anonymous_id: string;
    session_id: string;
}>;
export declare function getLocation(): Promise<unknown>;
