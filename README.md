## Chrome extension message passing made easy

### What?

Small library for sending messages across any extension parts (background, content script, popup or devtool).

It has a simple easy to use API, promise based callback support and more.

### Why?

Sending messages between the parts can get complicated and usually requires some relaying mechanism in the background page.  
Adding callback functionality to these messages can make it even trickier.

Furthermore the chrome messaging API is not coherent or straight forward, sometimes requiring you to use _chrome.runtime.\*_ and sometimes _chrome.tabs.\*_ depending on which extension part you are currently in.

### How?
```javascript
npm i chrome-ext-messenger
```

#### 1) In the background page: create a messenger instance and init the background hub.
```javascript
var Messenger = require('chrome-ext-messenger');
var messenger = new Messenger();

function connectedHandler(extPart, name, tabId) {
    console.log('someone connected!');
}

function disconnectedHandler(extPart, name, tabId) {
    console.log('someone disconnected!');
}

messenger.initBackgroundHub({
    connectedHandler: connectedHandler,
    disconnectedHandler: disconnectedHandler
});
```

This is obligatory for the library to work and should be done as early as possible in your background page.

If you're not using npm/modules, add the [library](https://github.com/asimen1/chrome-ext-messenger/tree/master/dist) via script tag and use _window['chrome-ext-messenger']_.

#### 2) Init connections (in any extension parts).
```javascript
messenger.initConnection(name, messageHandler)
```
* "name" - identifier name for this connection, can be any string except "*" (wildcard).
* "messageHandler" - handler for incoming messages to this connection.

This returns a _connection_ object.

#### 3) Start sending messages across connections (in any extension parts).
```javascript
connection.sendMessage(to, message).then(function(response) {
    console.log('got response!', response);
});
```
* "to" - where to send the message to: '\<extension part>:\<connection name>'.
  * \<extension part> can be: 'background', 'content_script', 'popup', 'devtool'.
  * messages from background require an additional tab id argument ':\<tabId>'.
* "message" - the message to send (any JSON-ifiable object).

This methods returns a **promise** that will be resolved if the receiver message handler invoked _"sendResponse"_.

#### More:
```javascript
// Sending to multiple connections is supported via 'part:name1,name2,...'.
c.sendMessage('content_script:main,main2', { text: 'HI!' });

// Sending to all connections is supported using wildcard value '*'.
c.sendMessage('devtool:*', { text: 'HI!' });

// Disconnect the connection to stop listening for messages.
c.disconnect()
```

### For Example:
```javascript
/* ---------------------------------------------------------------------- */
/* In desired extension part (BACKGROUND, CONTENT_SCRIPT, POPUP, DEVTOOL) */
/* ---------------------------------------------------------------------- */
var Messenger = require('chrome-ext-messenger');
var messenger = new Messenger();

var messageHandler = function(message, from, sender, sendResponse) {
    if (message.text === 'HI!') {
        sendResponse('HOWDY!');
    }
};

var c = messenger.initConnection('main', messageHandler);
var c2 = messenger.initConnection('main2', messageHandler);

/* ------- */
/* DEVTOOL */
/* ------- */
c.sendMessage('content_script:main', { text: 'HI!' }).then(function(response) {
    console.log(response);
});

/* -------------- */
/* CONTENT SCRIPT */
/* -------------- */
c.sendMessage('popup:main2', { text: 'HI!' }).then(function(response) {
    console.log(response);
});

/* ----- */
/* POPUP */
/* ----- */
c.sendMessage('background:main', { text: 'HI!' }).then(function(response) {
    console.log(response);
});

/* ---------- */
/* BACKGROUND */
/* ---------- */
c.sendMessage('devtool:main:150', { text: 'HI!' }).then(function(response) {
    console.log(response);
});
```

### Developing Locally
```javascript
npm run dev
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

### Todos
* Support cross tabs communication (e.g. content script from tab 1 to content script of tab 2).
* connection.sendMessage: support array (multiples) in "toExtPart".
* connection.sendMessage: support "*" in "toTabIds" for background to non background (check "fromTabId" assignment...).

### Extensions using messenger
[Restyler](https://chrome.google.com/webstore/detail/restyler/ofkkcnbmhaodoaehikkibjanliaeffel)

License
----
MIT