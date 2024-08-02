import { SteliosEvent } from "./steliosEvent";
export type EventPayload = {
    batch: Array<SteliosEvent>;
    sent_at: string,
};