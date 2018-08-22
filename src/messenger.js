/**
 * NOTE: Although this library is using only chrome.* extension API (and not browser.*),
 * NOTE: Firefox supports this API namespace on their end, so this library also works in Firefox.
 * NOTE: More info: https://github.com/asimen1/chrome-ext-messenger/issues/5
 */

'use strict';

const BackgroundHub = require('./backgroundHub.js');
const Connection = require('./connection.js');
const Utils = require('./utils.js');
const Constants = require('./constants.js');

// --------------------------------------------------------
// THE MESSENGER !
// --------------------------------------------------------

const Messenger = function() {
    Utils.constructorTweakMethods('Messenger', this);

    this._myExtPart = Utils.getCurrentExtensionPart();
};

Messenger.prototype.constructor = Messenger;

// ------------------------------------------------------------
// "STATIC" Methods - start
// ------------------------------------------------------------

Messenger.isMessengerPort = function(port) {
    return port.name.indexOf(Constants.MESSENGER_PORT_NAME_PREFIX) === 0;
};

// ------------------------------------------------------------
// "STATIC" Methods - end
// ------------------------------------------------------------

// ------------------------------------------------------------
// Exposed API - start.
// ------------------------------------------------------------

Messenger.prototype.initBackgroundHub = function(options) {
    if (this._myExtPart !== Constants.BACKGROUND) {
        Utils.log('warn', '[Messenger:initBackgroundHub]', 'Ignoring BackgroundHub init request since not called from background context');
        return;
    }

    if (this._backgroundHub) {
        Utils.log('warn', '[Messenger:initBackgroundHub]', 'Ignoring BackgroundHub init request since it is already been inited');
        return;
    }

    // NOTE: Saving reference in order to identify later if was already created.
    this._backgroundHub = new BackgroundHub(options);
};

Messenger.prototype.initConnection = function(name, messageHandler) {
    if (!name) {
        Utils.log('error', '[Messenger:initConnection]', 'Missing "name" in arguments');
    }

    if (name === Constants.TO_NAME_WILDCARD) {
        Utils.log('error', '[Messenger:initConnection]', '"*" is reserved as a wildcard identifier, please use another name');
    }

    return new Connection(this._myExtPart, name, messageHandler);
};

// ------------------------------------------------------------
// Exposed API - end.
// ------------------------------------------------------------

module.exports = Messenger;