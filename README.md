## Chrome extension message passing made easy

### What?

Small library for messaging across any extension parts (background, content script, popup or devtool).

It has a simple easy to use API, promise based callback support and more.

### Why?

Sending messages between extension parts can get complicated and usually requires some relaying mechanism in the background page. Adding callback functionality to these messages can make it even trickier.

Furthermore the chrome messaging API is not coherent or straight forward, sometimes requiring you to use _chrome.runtime.\*_ and sometimes _chrome.tabs.\*_ depending on which extension part you are currently in.

### How?
```shell
$ npm i chrome-ext-messenger
```

#### 1) In the background page: create a messenger instance and init the background hub.
```javascript
const Messenger = require('chrome-ext-messenger');
let messenger = new Messenger();

messenger.initBackgroundHub();
```

This step is **obligatory** and should be done as early as possible in your background page.

\* If you're not working with npm or module packing, add the [library](https://github.com/asimen1/chrome-ext-messenger/tree/master/dist) via script tag and use
_window['chrome-ext-messenger']_.

#### 2) Init connections (in any extension parts).
```javascript
const Messenger = require('chrome-ext-messenger');
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
\- The promise will be rejected if connection has been disconnected using the `disconnect()` API.

#### More:
```javascript
// Init hub with handlers notifying someone connected/disconnected.
messenger.initBackgroundHub({
    connectedHandler: (extensionPart, connectionName, tabId) => {},
    disconnectedHandler: (extensionPart, connectionName, tabId) => {}
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
const Messenger = require('chrome-ext-messenger');
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

### Developing Locally
```shell
$ npm run dev
```

You can now use the built messenger from the _dist_ folder in a local test extension (or use [npm link](https://docs.npmjs.com/cli/link)).  
I have created one (for internal testing purposes) that you can use: [chrome-ext-messenger-test](https://github.com/asimen1/chrome-ext-messenger-test).

### Notes
* Requires your extension to have ["tabs" permission](https://developer.chrome.com/extensions/declare_permissions).
* Uses only long lived port connections via _chrome.runtime.*_ API.
* This library should satisfy all your message passing demands, however if you are still handling some port connections manually using _chrome.runtime.onConnect_, you will also receive messenger ports connections. In order to identify connections originating from this library you can use the static method **Messenger.isMessengerPort(port)** which will return true/false.
* The Messenger messageHandler and _chrome.runtime.onMessage_ similarities and differences:
    * **Same** - "sender" object.
    * **Same** - "sendResponse" - The argument should be any JSON-ifiable object.
    * **Same** - "sendResponse" - With multiple message handler, the sendResponse() will work only for the first one to respond.  
    * **Different** - "from" object indicating the senders formatted identifier e.g. 'devtool:connection name'.
    * **Different** - Async sendResponse is supported directly (no need to return "true" value like with _chrome.runtime.onMessage_).

### Extensions using messenger
- [Restyler](https://chrome.google.com/webstore/detail/restyler/ofkkcnbmhaodoaehikkibjanliaeffel)
- Working on one? let me know ext.messenger@gmail.com!
[![](https://asimen1.github.io/chrome-ext-messenger/images/mailicon.png "email")](mailto:ext.messenger@gmail.com)

License
----
MIT