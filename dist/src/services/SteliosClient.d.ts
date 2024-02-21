export declare function validate(apiKey: any): Promise<any>;
export declare function generateContext(eventName: any, props: any): {
    context: {
        traits: {};
        library: {
            name: string;
            version: string;
        };
        os: {
            name: "name";
            version: "version";
        };
        timezone: string;
        screen: {
            width: number;
            height: number;
        };
        userAgent: string;
        locale: string;
        device: {
            isMobile: boolean;
        };
    };
    event_id: string;
    event_name: any;
    properties: any;
    event_timestamp: Date;
    user_id: string;
    anonymous_id: string;
};
