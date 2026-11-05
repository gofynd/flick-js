const { expect } = require("chai")
const sinon = require('sinon');
const Stelios = require('./../../dist');
const EventService = require('./../../dist/src/services/EventsProcessor');
const SteliosClient = require('./../../dist/src/services/SteliosClient');
const SteliosLocalStore = require('./../../dist/src/services/StelioLocalStore');
describe("user identity key in local storage", () => {
    var createStub
    var validateApiStub
    beforeEach(() => {
        setLocalStub = sinon.stub(SteliosLocalStore, "setLocal").returns('test')

    })
    afterEach(() => {
        setLocalStub.restore()
    })

    it("should check for null userID ", async () => {
        try {
            const result = await Stelios.identify(null, {})

        } catch (err) {
            expect(err).not.null;
        }

    })
    it("should check for null traits ", async () => {
        try {
            const result = await Stelios.identify('test', null)

        } catch (err) {
            expect(err).not.null;
        }

    })
    it("should check local key ", async () => {
        await Stelios.initialize('dummy');
        const result = await Stelios.identify('test', {});
        expect(result).to.not.null;
    })


})
describe("testing initialize functionality", () => {
    var validateApiStub
    beforeEach(() => {
        validateApiStub = sinon.stub(Stelios, "validateClient").resolves({ data: { result: true } })
    })
    afterEach(() => {
        validateApiStub.restore()
    })

    it("should update setup and update interval ID", async () => {
        await Stelios.initialize('test')
        console.log(Stelios.batchExecutorID);
        expect(Stelios.batchExecutorID).to.not.null;

    })

    it("should replace the running timer when initialize is called again with a different flushInterval", async () => {
        await Stelios.initialize('test', 'key', 5000)
        const firstTimer = Stelios.batchExecutorID
        await Stelios.initialize('test', 'key', 6000)
        expect(Stelios.batchExecutorID, 're-initializing should create a new timer, not keep the old one').to.not.equal(firstTimer)
    })

    it("should reject flushInterval below 5000ms", async () => {
        for (const bad of [4999, 2000, 0, -5, NaN, '5000']) {
            let error = null
            try {
                await Stelios.initialize('test', 'key', bad)
            } catch (err) {
                error = err
            }
            expect(error, `flushInterval ${bad}`).to.not.null
        }
    })

    it("should accept flushInterval of 5000ms or more", async () => {
        await Stelios.initialize('test', 'key', 5000)
    })

    it("should reject apiDurationInterval that is not a non-negative number", async () => {
        for (const bad of [-5, NaN, '5000']) {
            let error = null
            try {
                await Stelios.initialize('test', 'key', 5000, bad)
            } catch (err) {
                error = err
            }
            expect(error, `apiDurationInterval ${bad}`).to.not.null
        }
    })

    it("should accept apiDurationInterval of 0 or more", async () => {
        await Stelios.initialize('test', 'key', 5000, 0)
        await Stelios.initialize('test', 'key', 5000, 2500)
    })

    it("should reject maxBatchSize that is not a positive number", async () => {
        for (const bad of [0, -5, NaN, '16']) {
            let error = null
            try {
                await Stelios.initialize('test', 'key', 5000, 5000, bad)
            } catch (err) {
                error = err
            }
            expect(error, `maxBatchSize ${bad}`).to.not.null
        }
    })

    it("should accept maxBatchSize greater than 0", async () => {
        await Stelios.initialize('test', 'key', 5000, 5000, 0.5)
        await Stelios.initialize('test', 'key', 5000, 5000, 64)
    })

    it("should check for error when api key is not valid", async () => {

        try {
            const result = await Stelios.initialize('dummy')
        } catch (err) {
            expect(err).null
        }

    })
})
describe("testing send event functionality", () => {
    const sampleData = {
        event: 'test',
        context: {},
        userid: 'test',
        properties: {},
        event_timestamp: 'test'
    }

    it("should check for send event functionality when flickEvents key is not present in local", async () => {

        var stub2 = sinon.stub(Stelios, "axiosRequest").returns(false)
        var stub3 = sinon.stub(Stelios, "eventProcessor").returns()
        var stub4 = sinon.stub(Stelios, "client").returns(true)
        generateContextStub = sinon.stub(SteliosClient, "generateContext").returns(sampleData)
        const result = await Stelios.sendEvent('test', { cartID: 'test' })
        expect(result).undefined
        stub2.restore();
        stub3.restore();
        stub4.restore();

    })

    it("should check for null eventname and props ", async () => {

        try {
            const result = await Stelios.sendEvent(null, null)
        } catch (err) {
            expect(err).not.null
        }

    })
    it("should check for callingsend Event before initialize", async () => {

        try {
            const result = await Stelios.sendEvent('test', { cartID: 'test' })
        } catch (err) {
            expect(err).not.null
        }

    })

    it("should check for send event functinoality when flickEvents key is  present in local", async () => {

        var stub2 = sinon.stub(Stelios, "axiosRequest").returns(false)
        var stub3 = sinon.stub(Stelios, "eventProcessor").returns()
        var stub4 = sinon.stub(Stelios, "client").returns(true)
        notExistsStub = sinon.stub(SteliosLocalStore, "ifExists").returnsArg(0)
        const result = await Stelios.sendEvent('test', { cartID: 'test' })
        expect(result).undefined
        stub2.restore();
        stub3.restore();
        stub4.restore();
        notExistsStub.restore()

    })


})
describe("testing reset functionality", () => {
    var deleteStelioLocalStub
    beforeEach(() => {
        deleteStelioLocalStub = sinon.stub(SteliosLocalStore, "deleteSteliosLocal").returns(0)
    })
    afterEach(() => {
        deleteStelioLocalStub.restore()
    })
    it("should check reset function  ", async () => {
        const result = await Stelios.reset();
        expect(result).undefined
    })
})
describe("batching and size limit", () => {
    const LIMIT_KB = 4
    const LIMIT_BYTES = LIMIT_KB * 1024
    var sendStub
    var generateContextStub
    var sent

    const payloadBytes = (payload) => Buffer.byteLength(JSON.stringify(payload), 'utf8')
    const queuedEvents = () => SteliosLocalStore.ifExists('flickEvents') ? SteliosLocalStore.getLocal('flickEvents') : []
    const sentEventNames = () => sent.reduce((names, payload) => names.concat(payload.batch.map((event) => event.event_name)), [])
    const settle = () => new Promise((resolve) => setTimeout(resolve, 50))
    // the cooldown gate blocks a send that starts within apiDurationTimer of the last one
    const blockSending = () => SteliosLocalStore.setLocal('apiCallTimestamp', new Date().getTime())
    const allowSending = () => SteliosLocalStore.deleteSteliosLocal('apiCallTimestamp')

    beforeEach(async () => {
        sent = []
        sendStub = sinon.stub(EventService, "send").callsFake((payload) => {
            sent.push(JSON.parse(JSON.stringify(payload)))
            return Promise.resolve({})
        })
        // an earlier suite (line 117) stubs generateContext without restoring it, so undo that leak first
        if (SteliosClient.generateContext.restore) {
            SteliosClient.generateContext.restore()
        }
        generateContextStub = sinon.stub(SteliosClient, "generateContext")
            .callsFake((eventName, props) => ({ event_name: eventName, properties: props }))
        SteliosLocalStore.deleteSteliosLocal('flickEvents')
        SteliosLocalStore.deleteSteliosLocal('flickSendLock')
        allowSending()
        // a long flush interval means only the size trigger can send during a test
        await Stelios.initialize('test', 'key', 60000, 5000, LIMIT_KB)
    })

    afterEach(async () => {
        await settle()
        sendStub.restore()
        generateContextStub.restore()
        SteliosLocalStore.deleteSteliosLocal('flickEvents')
        SteliosLocalStore.deleteSteliosLocal('flickSendLock')
        allowSending()
    })

    it("should keep every request within maxBatchSize", async () => {
        for (let i = 0; i < 40; i++) {
            await Stelios.sendEvent(`event-${i}`, { padding: 'x'.repeat(300) })
        }
        await settle()
        expect(sent.length, 'the size limit should have triggered a send').to.be.greaterThan(0)
        sent.forEach((payload, index) => {
            expect(payloadBytes(payload), `request ${index} is over the limit`).to.be.at.most(LIMIT_BYTES)
        })
    })

    it("should measure the limit in UTF-8 bytes and not characters", async () => {
        // "€" is a single character but three UTF-8 bytes, so counting characters would overshoot
        for (let i = 0; i < 40; i++) {
            await Stelios.sendEvent(`event-${i}`, { padding: '€'.repeat(300) })
        }
        await settle()
        expect(sent.length, 'the size limit should have triggered a send').to.be.greaterThan(0)
        sent.forEach((payload, index) => {
            expect(payloadBytes(payload), `request ${index} is over the limit`).to.be.at.most(LIMIT_BYTES)
        })
    })

    it("should send as soon as the queue reaches maxBatchSize", async () => {
        for (let i = 0; i < 20; i++) {
            await Stelios.sendEvent(`event-${i}`, { padding: 'x'.repeat(300) })
        }
        await settle()
        // the flush interval is 60s away, so a request this early can only come from the size trigger
        expect(sent.length, 'the queue should not wait for the flush interval once it is full').to.be.greaterThan(0)
    })

    it("should not send while the queue is below maxBatchSize", async () => {
        await Stelios.sendEvent('small-event', { padding: 'x'.repeat(10) })
        await settle()
        expect(sent).to.be.empty
        expect(queuedEvents()).to.have.lengthOf(1)
    })

    it("should apply no size limit when maxBatchSize is not passed", async () => {
        await Stelios.initialize('test', 'key', 60000)
        for (let i = 0; i < 60; i++) {
            await Stelios.sendEvent(`event-${i}`, { padding: 'x'.repeat(300) })
        }
        await settle()
        expect(sent, 'without a size limit nothing should be sent before the flush interval').to.be.empty
        expect(queuedEvents()).to.have.lengthOf(60)
    })

    it("should drain a backlog in capped requests without losing events", async () => {
        const total = 60
        blockSending()
        for (let i = 0; i < total; i++) {
            await Stelios.sendEvent(`event-${i}`, { padding: 'x'.repeat(300) })
        }
        await settle()
        expect(sent, 'the cooldown should hold the backlog back').to.be.empty
        expect(queuedEvents()).to.have.lengthOf(total)

        allowSending()
        await Stelios.sendEvent(`event-${total}`, { padding: 'x'.repeat(300) })
        await settle()

        expect(sent.length, 'a backlog this size needs more than one request').to.be.greaterThan(1)
        sent.forEach((payload, index) => {
            expect(payloadBytes(payload), `request ${index} is over the limit`).to.be.at.most(LIMIT_BYTES)
        })
        const names = sentEventNames()
        expect(names.length + queuedEvents().length, 'no event should be lost').to.equal(total + 1)
        expect(names.length, 'no event should be sent twice').to.equal(new Set(names).size)
        expect(names[0], 'the oldest event should go out first').to.equal('event-0')
        expect(payloadBytes(queuedEvents()), 'the drain should stop once the rest fits in one request').to.be.below(LIMIT_BYTES)
    })

    it("should send an event larger than maxBatchSize on its own", async () => {
        await Stelios.sendEvent('oversized-event', { padding: 'x'.repeat(LIMIT_BYTES * 2) })
        await settle()
        expect(sent).to.have.lengthOf(1)
        expect(sent[0].batch).to.have.lengthOf(1)
        expect(sent[0].batch[0].event_name).to.equal('oversized-event')
        expect(queuedEvents(), 'an oversized event should not stay stuck in the queue').to.be.empty
    })

    it("should not let an overlapping send duplicate or drop events while one is in flight", async () => {
        // apiDurationInterval 0 means the cooldown gate never blocks a second attempt, so the only
        // thing that can stop two sends from overlapping here is the send lock itself
        sendStub.restore()
        let callCount = 0
        let releaseFirstSend
        const firstSendPending = new Promise((resolve) => { releaseFirstSend = resolve })
        sendStub = sinon.stub(EventService, "send").callsFake((payload) => {
            callCount++
            sent.push(JSON.parse(JSON.stringify(payload)))
            return callCount === 1 ? firstSendPending.then(() => ({})) : Promise.resolve({})
        })
        await Stelios.initialize('test', 'key', 5000, 0, LIMIT_KB)

        for (let i = 0; i < 10; i++) {
            await Stelios.sendEvent(`first-${i}`, { padding: 'x'.repeat(300) })
        }
        await settle()
        expect(callCount, 'the first send should have started').to.equal(1)

        // more events cross the size threshold again while the first send is still pending
        for (let i = 0; i < 10; i++) {
            await Stelios.sendEvent(`second-${i}`, { padding: 'x'.repeat(300) })
        }
        await settle()
        expect(callCount, 'the send lock should block an overlapping send while one is in flight').to.equal(1)

        releaseFirstSend()
        await settle()
        expect(callCount, 'once the first send settles, the rest should drain in further requests').to.be.greaterThan(1)

        const names = sentEventNames()
        expect(names.length + queuedEvents().length, 'no event should be lost').to.equal(20)
        expect(names.length, 'no event should be sent twice').to.equal(new Set(names).size)
    })
})
describe("send batch functionality", () => {
    it("send batch functionality", async () => {
        try {
            var stub1 = sinon.stub(EventService, "send").resolves('sucess')
            var stub2 = sinon.stub(SteliosLocalStore, "getLocal").returnsArg(0);
            var stub3 = sinon.stub(Stelios, "axiosRequest").returns(false)
            var stub4 = sinon.stub(Stelios, "eventProcessor").returns()
            var stub5 = sinon.stub(Stelios, "client").returns(true)
            const result = Stelios.sendBatch();
            stub1.restore();
            stub2.restore();
            stub3.restore();
            stub4.restore();
            stub5.restore();
        } catch (err) {
            expect(err).not.null;
        }
    })
})









