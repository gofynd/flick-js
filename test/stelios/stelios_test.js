const { expect } = require("chai")
const sinon = require('sinon');
const { Stelios } = require('./../../dist/src/services/Stelios')
const { StelioLocalStore } = require('./../../dist/src/services/StelioLocalStore');
const { SteliosClient } = require('./../../dist/src/services/StelioLocalStore');
describe("user identity key in local storage", () => {
    var createStub
    var validateApiStub
    beforeEach(() => {
        setLocalStub = sinon.stub(StelioLocalStore.prototype, "setLocal").returns('test')

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
        expect(result).to.equal('test')
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

    it("should ", async () => {
        const result = await Stelios.initialize('test')
        console.log(result.apiKey);
        expect(result.apiKey).to.equal('test')

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

    it("should check for send event functionality when stelioevents key is not present in local", async () => {

        var stub2 = sinon.stub(Stelios, "axiosRequest").returns(false)
        var stub3 = sinon.stub(Stelios, "eventProcessor").returns()
        var stub4 = sinon.stub(Stelios, "client").returns(true)
        generateContextStub = sinon.stub(Stelios.client, "generateContext").returns(sampleData)
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

    it("should check for send event functinoality when stelioevents key is  present in local", async () => {

        var stub2 = sinon.stub(Stelios, "axiosRequest").returns(false)
        var stub3 = sinon.stub(Stelios, "eventProcessor").returns()
        var stub4 = sinon.stub(Stelios, "client").returns(true)
        notExistsStub = sinon.stub(Stelios.stelioLocal, "ifExists").returnsArg(0)
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
        deleteStelioLocalStub = sinon.stub(Stelios.stelioLocal, "deleteSteliosLocal").returns(0)
    })
    afterEach(() => {
        deleteStelioLocalStub.restore()
    })
    it("should check reset function  ", async () => {
        const result = await Stelios.reset();
        expect(result).undefined
    })
})
describe("send batch functionality", () => {
    it("send batch functionality", async () => {
        var stub1 = sinon.stub(Stelios.eventProcessor, "send").resolves('sucess')
        var stub2 = sinon.stub(Stelios.stelioLocal, "getLocal").returnsArg(0);
        var stub3 = sinon.stub(Stelios, "axiosRequest").returns(false)
        var stub4 = sinon.stub(Stelios, "eventProcessor").returns()
        var stub5 = sinon.stub(Stelios, "client").returns(true)
        const result = Stelios.sendBatch();
        stub1.restore();
        stub2.restore();
        stub3.restore();
        stub4.restore();
        stub5.restore();
        expect(result).undefined
    })
})









