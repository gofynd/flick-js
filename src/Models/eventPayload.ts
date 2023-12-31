import { SteliosEvent } from "./steliosEvent";
export type EventPayload = {
    batch: Array<SteliosEvent>;
    sentAt: string,
};