'use strict';

const Logdown = require('logdown');

const Constants = require('./constants.js');

// NOTE: Until https://github.com/caiogondim/logdown.js/issues/82 is implemented.
const loggerLog   = new Logdown({ prefix: 'messenger-log', markdown: false });
const loggerInfo  = new Logdown({ prefix: 'messenger-info', markdown: false });
const loggerWarn  = new Logdown({ prefix: 'messenger-warn', markdown: false });
const loggerError = new Logdown({ prefix: 'messenger-error', markdown: false });
// Disables all instances with the 'messenger' prefix, but don't disable those in the negation.
Logdown.disable('messenger*', '-messenger-error', '-messenger-warn'/*, '-messenger-info', '-messenger-log'*/);

const Utils = {
    log: function(level) {
        // Remove the 'level' argument.
        var loggerArgs = Array.prototype.slice.call(arguments, 1);

        switch (level) {
            case 'log': {
                loggerLog.log.apply(loggerLog, loggerArgs);
                break;
            }
            case 'info': {
                loggerInfo.info.apply(loggerInfo, loggerArgs);
                break;
            }
            case 'warn': {
                loggerWarn.warn.apply(loggerWarn, loggerArgs);
                break;
            }
            case 'error': {
                loggerError.error.apply(loggerError, loggerArgs);

                // Abort execution on error.
                throw 'Messenger error occurred, check more information above...';
            }

            default: {
                loggerError.error('Unknown log level: ' + level);
                break;
            }
        }
    },

    // For each function:
    // - Autobinding to ensure correct 'this' from all types of function invocations.
    // - Add log level logging.
    constructorTweakMethods: function(filename, thisObj) {
        let wrapMethod = function(methodName) {
            let origFunc = thisObj[methodName];

            thisObj[methodName] = function() {
                loggerLog.log('[' + filename + ':' + methodName + '()]', arguments);

                return origFunc.apply(thisObj, arguments);
            }.bind(thisObj);
        };

        for (let key in thisObj) {
            if (typeof thisObj[key] === 'function') {
                wrapMethod(key);
            }
        }
    },

    // TODO: export to npm package... ext-context/scope
    getCurrentExtensionPart: function() {
        let retVal;

        if (typeof(chrome) !== 'undefined') {
            // chrome.devtools is available in devtools panel.
            // In latest Chrome, chrome.extension.getBackgroundPage() is available in background, popup & devtools.
            if (chrome.devtools) {
                retVal = Constants.DEVTOOL;
            } else if (chrome.extension && typeof chrome.extension.getBackgroundPage === 'function') {
                let backgroundPage = chrome.extension.getBackgroundPage();
                retVal = backgroundPage === window ? Constants.BACKGROUND : Constants.POPUP;
            } else {
                retVal = Constants.CONTENT_SCRIPT;
            }
        } else {
            loggerError.error('Could not identify extension part... are you running in an extension context?');
        }

        loggerLog.log('detected current extension part: ' + retVal);
        return retVal;
    },

    removeMessengerPortNamePrefix: function(portName) {
        return portName.replace(new RegExp('^' + Constants.MESSENGER_PORT_NAME_PREFIX), '');
    }
};

export default Utils;
