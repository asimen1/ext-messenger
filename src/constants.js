'use strict';

const constants = {
    // Used to identify port connections from Messenger API and user "chrome.runtime.connect".
    MESSENGER_PORT_NAME_PREFIX: '__messenger__',

    // Wildcard identifier for sending to all of the extension part connections.
    TO_NAME_WILDCARD: '*',

    // Extension parts.
    BACKGROUND: 'background',
    POPUP: 'popup',
    DEVTOOL: 'devtool',
    CONTENT_SCRIPT: 'content_script',

    // Message types.
    INIT: 'init',
    INIT_SUCCESS: 'init_success',
    MESSAGE: 'message',
    RESPONSE: 'response'
};

export default constants;