let sinon = require('sinon');
let chrome = require('sinon-chrome'); // jshint ignore:line
let assert = require('assert');
let rewire = require('rewire');

// NOTE: rewire for accessing all private members and mocking them.
// TODO: check issue https://github.com/jhnns/rewire/issues/62 + https://github.com/speedskater/babel-plugin-rewire
let Messenger = rewire('../src/messenger.js');
let Utils = rewire('../src/utils.js');
let Constants = rewire('../src/constants.js');

describe('first suite', function () {
    before(function() {
        global.chrome = chrome;
    });

    beforeEach(function() {
        chrome.flush();
    });

    after(function() {
        chrome.flush();
        delete global.chrome;
    });

    it('first test', function() {
        // simulate content script
        // -------------------------
        sinon.stub(Utils, 'getCurrentExtensionPart', function() {
            return Constants.CONTENT_SCRIPT;
        });
        Messenger.__set__('Utils', Utils);
        // -------------------------

        // Init connection mock
        // -------------------------
        let mockPort = {
            onMessage: {
                addListener: sinon.stub()
            },

            postMessage: sinon.stub()
        };

        chrome.runtime.connect.returns(mockPort);
        // -------------------------

        let messenger = new Messenger();
        let connection = messenger.initConnection('some_name');

        assert.ok(chrome.runtime.connect.withArgs({
            name: Constants.MESSENGER_PORT_NAME_PREFIX + 'some_name'
        }).calledOnce);

        assert.ok(mockPort.onMessage.addListener.calledOnce);

        assert.ok(mockPort.postMessage.withArgs({
            from: Constants.CONTENT_SCRIPT,
            type: Constants.INIT
        }).calledOnce);
    });
});
