## Extension message passing made easy

[![Latest Stable Version](https://img.shields.io/npm/v/ext-messenger.svg)](https://www.npmjs.com/package/ext-messenger)
[![NPM Downloads](https://img.shields.io/npm/dt/ext-messenger.svg)](https://www.npmjs.com/package/ext-messenger)

### What?

Small library for messaging across any extension parts (background, content script, popup or devtool).

Works both for Chrome extensions and Firefox add-ons, has a simple API, promise based callback support and more.

### Why?

Sending messages between extension parts can get complicated and usually requires some relaying mechanism in the background page. Adding callback functionality to these messages can make it even trickier.

Furthermore, the messaging API is not coherent or straight forward, sometimes requiring you to use _runtime.\*_ API and sometimes _tabs.\*_ API depending on which extension part you are currently in.

### How?
```shell
$ npm i ext-messenger --save
```

#### 1) In the background page: create a messenger instance and init the background hub.
```javascript
const Messenger = require('ext-messenger');
let messenger = new Messenger();

messenger.initBackgroundHub();
```

This step is **obligatory** and should be done as soon as possible in your background page.

\* You can also add the [library](https://github.com/asimen1/ext-messenger/tree/master/dist) via script tag and use `window['ext-messenger']`.

#### 2) Init connections (in any extension parts).
```javascript
const Messenger = require('ext-messenger');
let messenger = new Messenger();

/*
 * {string} name - Identifier name for this connection.
 * {function} messageHandler - Handler for incoming messages.
 */
messenger.initConnection(name, messageHandler);
```

This returns a **connection** object.

#### 3) Start sending messages across connections (in any extension parts).
```javascript
/*
 * {string} to - '<extension part>:<connection name>'.
 * {*} message - The message to send (any JSON-ifiable object).
 */
connection.sendMessage(to, message);
```

* \<extension part> possible values: 'background', 'content_script', 'popup', 'devtool'.
* Sending messages from background require an additional tab id argument ':\<tab id>'.

This returns a **promise**.  
\- The promise will be resolved if the receiver invoked the `sendResponse` method argument.  
\- The promise will be rejected if connection has been disconnected via the `disconnect()` API.

#### More:
```javascript
// Init hub with handlers notifying someone connected/disconnected.
messenger.initBackgroundHub({
    connectedHandler: function(extensionPart, connectionName, tabId) {},
    disconnectedHandler: function(extensionPart, connectionName, tabId) {}
});

// Sending to multiple connections is supported via:
// 'extension part:name1,name2,...'.
c.sendMessage('content_script:main,main2', { text: 'HI!' });

// Sending to all connections is supported using wildcard value '*'.
c.sendMessage('devtool:*', { text: 'HI!' });

// Disconnect the connection to stop listening for messages.
c.disconnect();
```

### For Example:
```javascript
/* ---------------------------------------------- */
/* Init connections in desired extension part     */
/* (BACKGROUND, CONTENT_SCRIPT, POPUP, DEVTOOL)   */
/* ---------------------------------------------- */
const Messenger = require('ext-messenger');
let messenger = new Messenger();

let messageHandler = function(msg, from, sender, sendResponse) {
    if (msg.text === 'HI!') {
        sendResponse('HOWDY!');
    }
};

let c = messenger.initConnection('main', messageHandler);
let c2 = messenger.initConnection('main2', messageHandler);
...

let msg = { text: 'HI!' };

/* ------------------------------------------------------ */
/* DEVTOOL - Send message to content script               */
/* ------------------------------------------------------ */
c.sendMessage('content_script:main', msg);

/* ------------------------------------------------------ */
/* CONTENT SCRIPT - Send message to popup (with response) */
/* ------------------------------------------------------ */
c.sendMessage('popup:main2', msg).then((response) => {
    console.log(response);
});

/* ------------------------------------------------------ */
/* POPUP - Send message to background (with response)     */
/* ------------------------------------------------------ */
c.sendMessage('background:main', msg).then((response) => {
    console.log(response);
});

/* ------------------------------------------------------ */
/* BACKGROUND - Send message to devtool (with response)   */
/* '50' is an example tab id of the devtool.              */
/* ------------------------------------------------------ */
c.sendMessage('devtool:main:50', msg).then((response) => {
    console.log(response);
});
```

### Notes
* Requires your extension to have ["tabs" permission](https://developer.chrome.com/extensions/declare_permissions).
* Uses only long lived port connections via _runtime.*_ API.
* This library should satisfy all your message passing needs, however if you are still handling some port connections manually, using _runtime.onConnect_ will also receive messenger ports connections. In order to identify connections originating from this library you can use the static method **Messenger.isMessengerPort(port)** which will return true/false.
* The Messenger _messageHandler_ and _runtime.onMessage_ similarities and differences:
    * **Same** - "sender" object.
    * **Same** - "sendResponse" - The argument should be any JSON-ifiable object.
    * **Same** - "sendResponse" - With multiple message handler, the sendResponse() will work only for the first one to respond.  
    * **Different** - "from" object indicating the senders formatted identifier e.g. 'devtool:connection name'.
    * **Different** - Async sendResponse is supported directly (no need to return "true" value like with _runtime.onMessage_).

### Extensions using messenger
- [Restyler](https://chrome.google.com/webstore/detail/restyler/ofkkcnbmhaodoaehikkibjanliaeffel)
- Working on one? let me know ext.messenger@gmail.com! [![](https://asimen1.github.io/ext-messenger/images/mailicon.png "email")](mailto:ext.messenger@gmail.com)

### Developing Locally
```shell
$ npm run dev
```

You can now use the built messenger from the _dist_ folder in a local test extension (or use [npm link](https://docs.npmjs.com/cli/link)).  
I have created one (for internal testing purposes) that you can use: [ext-messenger-test](https://github.com/asimen1/ext-messenger-test).

License
----
MIT
