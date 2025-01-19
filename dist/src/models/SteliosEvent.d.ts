export type SteliosEvent = {
    event_id: string;
    event_name: string;
    context: any;
    user_id: string;
    properties: any;
    event_timestamp: Date;
    anonymous_id: string;
};
