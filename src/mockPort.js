const Utils = require('./utils.js');

const MockPort = function(options) {
    Utils.constructorTweakMethods('MockPort', this);

    let creatorMock = this._createMockPort(options);
    let targetMock = this._createMockPort(options);

    this._linkMocks(creatorMock, targetMock);

    // BackgroundHub might not have created this "onConnect" method yet.
    if (typeof window.mockPortOnConnect === 'function') {
        window.mockPortOnConnect(targetMock);
    }

    return creatorMock;
};

MockPort.prototype.constructor = MockPort;

MockPort.prototype._createMockPort = function(options) {
    // ------------------------------------------
    // Port API
    // ------------------------------------------

    let mockPort = {
        _connected: true,

        _name: options.name,
        onMessageListeners: [],
        onDisconnectListeners: []
    };

    Object.defineProperty(mockPort, 'name', {
        get: function() {
            return mockPort._name;
        }
    });

    Object.defineProperty(mockPort, 'onMessage', {
        get: function() {
            return {
                addListener: function(listener) {
                    mockPort.onMessageListeners.push(listener);
                },

                removeListener: function(listener) {
                    let index = mockPort.onMessageListeners.indexOf(listener);
                    if (index !== -1) {
                        mockPort.onMessageListeners.splice(index, 1);
                    }
                }
            };
        }
    });

    Object.defineProperty(mockPort, 'onDisconnect', {
        get: function() {
            return {
                addListener: function(listener) {
                    mockPort.onDisconnectListeners.push(listener);
                },

                removeListener: function(listener) {
                    let index = mockPort.onDisconnectListeners.indexOf(listener);
                    if (index !== -1) {
                        mockPort.onDisconnectListeners.splice(index, 1);
                    }
                }
            };
        }
    });

    // Background mock ports should only have the extension id.
    // https://developer.chrome.com/extensions/runtime#type-MessageSender
    Object.defineProperty(mockPort, 'sender', {
        get: function() {
            return { id: chrome.runtime.id };
        }
    });

    mockPort.postMessage = function(msg) {
        if (mockPort._connected) {
            if (mockPort.__targetRefPort) {
                mockPort.__targetRefPort.__invokeOnMessageHandlers(msg);
            } else {
                Utils.log('warn', '[MockPort:postMessage]', 'Missing __targetRefPort', arguments);
            }
        } else {
            Utils.log('warn', '[MockPort:postMessage]', 'Attempting to post message on a disconnected mock port', msg);
        }
    };

    mockPort.disconnect = function() {
        mockPort._connected = false;

        if (mockPort.__targetRefPort) {
            mockPort.__targetRefPort.__invokeOnDisconnectHandlers();
        } else {
            Utils.log('warn', '[MockPort:postMessage]', 'Missing __targetRefPort', arguments);
        }

        mockPort._onMessageListeners = [];
        mockPort._onDisconnectListeners = [];
    };

    // ------------------------------------------
    // PRIVATE HELPERS
    // ------------------------------------------

    mockPort.__invokeOnMessageHandlers = function(msg) {
        mockPort.onMessageListeners.forEach(function(onMessageListener) {
            onMessageListener(msg, mockPort);
        });
    };

    mockPort.__invokeOnDisconnectHandlers = function() {
        mockPort.onDisconnectListeners.forEach(function(onDisconnectListener) {
            onDisconnectListener(mockPort);
        });
    };

    return mockPort;
};

MockPort.prototype._linkMocks = function(creatorMock, targetMock) {
    creatorMock.__targetRefPort = targetMock;
    targetMock.__targetRefPort = creatorMock;
};

export default MockPort;