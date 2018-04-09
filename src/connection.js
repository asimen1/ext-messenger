'use strict';

const MockPort = require('./mockPort.js');
const Utils = require('./utils.js');
const Constants = require('./constants.js');

const INIT_CONNECTION_INTERVAL = 500;

const PENDING_CB_SIZE_CLEANUP_TRIGGER = 100000;
const PENDING_CB_SIZE_CLEANUP_AMOUNT = 5000;

const Connection = function(extPart, name, messageHandler) {
    Utils.constructorTweakMethods('Connection', this);

    this._init(extPart, name, messageHandler);
};

Connection.prototype.constructor = Connection;

// ------------------------------------------------------------
// Private methods - start.
// ------------------------------------------------------------

Connection.prototype._init = function(extPart, name, messageHandler) {
    this._port = null;
    this._inited = false;
    this._pendingInitMessages = [];
    this._pendingCb = {};
    this._cbId = 0;
    this._pendingCbCleanupIndex = 0;

    this._myExtPart = extPart;
    this._myName = Constants.MESSENGER_PORT_NAME_PREFIX + name;
    this._userMessageHandler = messageHandler || function() {};

    switch (this._myExtPart) {
        case Constants.BACKGROUND:
        case Constants.CONTENT_SCRIPT:
        case Constants.POPUP:
        case Constants.DEVTOOL: {
            let doInitConnection = function(tabId) {
                Utils.log('log', '[Connection:_init]', 'Attempting connection initing...');

                this._port = this._myExtPart === Constants.BACKGROUND
                    ? new MockPort({ name: this._myName })
                    : chrome.runtime.connect({ name: this._myName });

                this._port.onMessage.addListener(this._onPortMessageHandler);

                this._port.postMessage({
                    type: Constants.INIT,
                    from: this._myExtPart,
                    tabId: tabId
                });

                // NOTE: The init connection from the extension parts can be called before the
                // NOTE: background hub has inited and started listening to connections.
                // NOTE: Retry init until we get the init success response from the background.
                // TODO: maybe can think of a better solution?
                let argsArr = arguments;
                let initInterval = setTimeout(function() {
                    if (!this._inited) {
                        this._port.disconnect();
                        doInitConnection.apply(this, argsArr);
                    } else {
                        clearTimeout(initInterval);
                    }
                }.bind(this), INIT_CONNECTION_INTERVAL);
            }.bind(this);

            // Unlike content script which have the tab id in the "sender" object,
            // for devtool/popup we need to get and pass the tab id ourself.
            // NOTE: For background connection we don't have a notion of tab id.
            switch (this._myExtPart) {
                case Constants.BACKGROUND:
                case Constants.CONTENT_SCRIPT:
                    doInitConnection();

                    break;
                case Constants.POPUP:
                    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                        doInitConnection(tabs[0].id);
                    });

                    break;
                case Constants.DEVTOOL:
                    doInitConnection(chrome.devtools.inspectedWindow.tabId);

                    break;
            }

            break;
        }

        default: {
            Utils.log('error', '[Connection:_init]', 'Unknown extension part: ' + extPart);
        }
    }
};

// Pending callback will get populated by unresponded callbacks.
// Clean up at sensible sizes.
Connection.prototype._attemptDeadCbCleanup = function() {
    if (Object.keys(this._pendingCb).length > PENDING_CB_SIZE_CLEANUP_TRIGGER) {
        Utils.log('log', '[Connection:_attemptDeadCbCleanup]', 'attempting dead callback cleaning... current callbacks number:'. Object.keys(this._pendingCb).length);

        let cleanUpToIndex = this._pendingCbCleanupIndex + PENDING_CB_SIZE_CLEANUP_AMOUNT;
        while (this._pendingCbCleanupIndex < cleanUpToIndex) {
            delete this._pendingCb[this._pendingCbCleanupIndex];
            this._pendingCbCleanupIndex++;
        }

        Utils.log('log', '[Connection:_attemptDeadCbCleanup]', 'new callbacks number after cleaning done:', Object.keys(this._pendingCb).length);
    }
};

Connection.prototype._prepareMessage = function(message, cbPromiseResolve) {
    return new Promise((resolve) => {
        // Handle callback if given.
        if (cbPromiseResolve) {
            this._cbId++;
            this._pendingCb[this._cbId] = cbPromiseResolve;
            message.cbId = this._cbId;

            this._attemptDeadCbCleanup();
        }

        // Manually setting the "tabId" is important for relay for some extension parts...
        switch (this._myExtPart) {
            case Constants.DEVTOOL: {
                message.tabId = chrome.devtools.inspectedWindow.tabId;
                resolve();

                break;
            }

            case Constants.POPUP: {
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    message.tabId = tabs[0].id;
                    resolve();
                }.bind(this));

                break;
            }

            default: {
                resolve();
                break;
            }
        }
    });
};

// Generic post message with callback support.
Connection.prototype._postMessage = function(port, message, cbPromiseResolve) {
    this._prepareMessage(message, cbPromiseResolve).then(() => {
        if (this._inited) {
            port.postMessage(message);
        } else {
            this._pendingInitMessages.push(message);
        }
    });
};

Connection.prototype._postResponse = function(fromPort, responseValue, origMessage) {
    let response = {
        from: this._myExtPart,
        to: origMessage.from,

        // BackgroundHub expects toName to be an array.
        toNames: [origMessage.fromName],

        type: Constants.RESPONSE,
        cbId: origMessage.cbId,
        cbValue: responseValue
    };

    // If we are in the background, we need to specify the tab id to respond to.
    if (this._myExtPart === Constants.BACKGROUND) {
        response.toTabId = origMessage.fromTabId;
    }

    this._postMessage(fromPort, response);
};

Connection.prototype._handleMessage = function(message, fromPort) {
    // Create the "sendResponse" callback for the message.
    let sendResponse = function(response) {
        // Message has callback... respond to it.
        if (message.cbId) {
            this._postResponse(fromPort, response, message);
        }
    }.bind(this);

    // Construct the from string (the sender's "to" string).
    // NOTE: Background connections have "fromTabId" only for the relay of response and should not be added.
    let fromName = Utils.removeMessengerPortNamePrefix(message.fromName);
    let fromTabId = (message.fromTabId && message.from !== Constants.BACKGROUND) ? `:${message.fromTabId}` : null;
    let from = `${message.from}:${fromName}` + (fromTabId ? `:${fromTabId}` : '');

    // Invoke the user message handler.
    this._userMessageHandler(message.userMessage, from, message.fromPortSender, sendResponse);
};

Connection.prototype._handleResponse = function(response) {
    if (this._pendingCb[response.cbId]) {
        let cbPromiseResolve = this._pendingCb[response.cbId];
        delete this._pendingCb[response.cbId];

        // Resolve the promise with the response callback value.
        cbPromiseResolve(response.cbValue);
    } else {
        Utils.log('info', '[Connection:_handleResponse]', 'ignoring response sending because callback does not exist (probably already been called)');
    }
};

Connection.prototype._sendMessage = function(port, toExtPart, toNames, toTabId, userMessage, cbPromiseResolve) {
    // Add our port name prefix to the user given name (if given and not wildcard).
    toNames = this._addMessengerPortNamePrefix(toNames);

    let message = {
        from: this._myExtPart,
        fromName: this._myName,
        to: toExtPart,
        toNames: toNames,
        toTabId: toTabId,
        type: Constants.MESSAGE,
        userMessage: userMessage
    };

    this._postMessage(port, message, cbPromiseResolve);
};

Connection.prototype._addMessengerPortNamePrefix = function(toNames) {
    return toNames.map(function(toName) {
        // Wildcards '*' should stay intact.
        return toName === Constants.TO_NAME_WILDCARD ? toName : Constants.MESSENGER_PORT_NAME_PREFIX + toName;
    });
};

Connection.prototype._validateMessage = function(toExtPart, toName, toTabId) {
    if (!toExtPart) {
        return 'Missing extension part in "to" argument';
    }

    if (toExtPart !== Constants.BACKGROUND && toExtPart !== Constants.CONTENT_SCRIPT && toExtPart !== Constants.DEVTOOL && toExtPart !== Constants.POPUP) {
        return 'Unknown extension part in "to" argument: ' + toExtPart + '\nSupported parts are: ' + Constants.BACKGROUND + ', ' + Constants.CONTENT_SCRIPT + ', ' + Constants.POPUP + ', ' + Constants.DEVTOOL;
    }

    if (!toName) {
        return 'Missing connection name in "to" argument';
    }

    if (this._myExtPart === Constants.BACKGROUND && toExtPart !== Constants.BACKGROUND) {
        if (!toTabId) {
            return 'Messages from background to other extension parts must have a tab id in "to" argument';
        }

        if (!Number.isInteger(parseFloat(toTabId))) {
            return 'Tab id to send message to must be a valid number';
        }
    }
};

Connection.prototype._onPortMessageHandler = function(message, fromPort) {
    switch (message.type) {
        case Constants.INIT_SUCCESS: {
            this._inited = true;

            // Handle all the pending messages added before init succeeded.
            this._pendingInitMessages.forEach(function(pendingInitMessage) {
                this._port.postMessage(pendingInitMessage);
            }.bind(this));

            break;
        }

        // This cases our similar except the actual handling.
        case Constants.MESSAGE:
        case Constants.RESPONSE: {
            if (!message.to) { Utils.log('error', '[Connection:_onPortMessageHandler]', 'Missing "to" in message: ', message); }
            if (!message.toNames) { Utils.log('error', '[Connection:_onPortMessageHandler]', 'Missing "toNames" in message: ', message); }

            // If we got a message/response it means the background hub has already
            // decided that we should handle it.
            if (message.type === Constants.MESSAGE) {
                this._handleMessage(message, fromPort);
            } else if (message.type === Constants.RESPONSE) {
                this._handleResponse(message);
            }

            break;
        }

        default: {
            Utils.log('error', '[Connection:_onPortMessageHandler]', 'Unknown message type: ' + message.type);
        }
    }
};

// ------------------------------------------------------------
// Private methods - end.
// ------------------------------------------------------------

// ------------------------------------------------------------
// Exposed API - start.
// ------------------------------------------------------------

Connection.prototype.sendMessage = function(to, message) {
    // Always returns a promise (callback support).
    return new Promise((cbPromiseResolve, reject) => {
        if (!to) { Utils.log('error', '[Connection:sendMessage]', 'missing "to" arguments'); }

        if (!this._port) {
            Utils.log('info', '[Connection:sendMessage]', 'Rejecting sendMessage because connection does not exist anymore');
            return reject(new Error('Connection port does not exist anymore, did you disconnect it?'));
        }

        // Parse 'to' to args... for example => 'devtool:main:1225'
        let toArgs;
        try {
            toArgs = to.split(':');
        } catch (e) {
            Utils.log('error', '[Connection:sendMessage]', 'Invalid format given in "to" argument: ' + to, arguments);
        }

        let toExtPart = toArgs[0];
        let toName = toArgs[1];
        let toTabId = toArgs[2];

        // Validate (will throw error if something is invalid).
        let errorMsg = this._validateMessage(toExtPart, toName, toTabId);
        if (errorMsg) { Utils.log('error', '[Connection:sendMessage]', errorMsg, arguments); }

        // Normalize to array to support multiple names.
        let toNames = toName.split(',');

        this._sendMessage(this._port, toExtPart, toNames, toTabId, message, cbPromiseResolve);
    });
};

Connection.prototype.disconnect = function() {
    if (this._port) {
        this._port.disconnect();
        this._port = null;
    }
};

// ------------------------------------------------------------
// Exposed API - end.
// ------------------------------------------------------------

export default Connection;