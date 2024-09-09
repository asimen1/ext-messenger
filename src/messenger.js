'use strict';

import BackgroundHub from './backgroundHub.js';
import Connection from './connection.js';
import Utils from './utils.js';
import Constants from './constants.js';

// --------------------------------------------------------
// THE MESSENGER !
// --------------------------------------------------------

class Messenger {
    constructor(extPart) {
        Utils.constructorTweakMethods('Messenger', this);

        // Validate extension part argument.
        if (!Object.values(Messenger.EXT_PARTS).includes(extPart)) {
            Utils.log('error', '[Messenger:constructor]', `"${extPart}" provided is not a valid extension part. Valid parts are: ${Object.keys(Messenger.EXT_PARTS).join(', ')}`);
            return;
        }

        this._myExtPart = extPart;

        let api = {
            initConnection: this.initConnection,
        };

        // Add the BackgroundHub API only for the background part.
        if (this._myExtPart === Constants.BACKGROUND) {
            api.initBackgroundHub = this.initBackgroundHub;
        }

        return api;
    }

    static isMessengerPort(port) {
        return port.name.indexOf(Constants.MESSENGER_PORT_NAME_PREFIX) === 0;
    }

    static EXT_PARTS = {
        BACKGROUND: Constants.BACKGROUND,
        POPUP: Constants.POPUP,
        DEVTOOL: Constants.DEVTOOL,
        CONTENT_SCRIPT: Constants.CONTENT_SCRIPT,
    };

    // ------------------------------------------------------------
    // Exposed API
    // ------------------------------------------------------------

    initBackgroundHub(options) {
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
    }

    initConnection(name, messageHandler) {
        if (!name) {
            Utils.log('error', '[Messenger:initConnection]', 'Missing "name" in arguments');
        }

        if (name === Constants.TO_NAME_WILDCARD) {
            Utils.log('error', '[Messenger:initConnection]', '"*" is reserved as a wildcard identifier, please use another name');
        }

        return new Connection(this._myExtPart, name, messageHandler);
    }
}

export default Messenger;