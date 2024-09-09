'use strict';

import Constants from './constants.js';

const LOG_LEVEL = 'warn';
const LOG_LEVELS = ['log', 'info', 'warn', 'error'];
const LOG_PREFIX = '[ext-messenger]';

// ANSI color codes.
const COLORS = {
    log: '\x1b[32m', // green
    info: '\x1b[34m', // blue
};

function shouldLog(logLevel) {
    return LOG_LEVELS.indexOf(logLevel) >= LOG_LEVELS.indexOf(LOG_LEVEL);
}

function log(level) {
    // Remove the 'level' argument.
    let loggerArgs = Array.prototype.slice.call(arguments, 1);

    if (!shouldLog(level)) {
        return;
    }

    switch (level) {
        case 'log': {
            console.log(COLORS.log + LOG_PREFIX + ` [${level}]`, ...loggerArgs);
            break;
        }
        case 'info': {
            console.info(COLORS.info + LOG_PREFIX + ` [${level}]`, ...loggerArgs);
            break;
        }
        case 'warn': {
            console.warn(LOG_PREFIX, ...loggerArgs);
            break;
        }
        case 'error': {
            console.error(LOG_PREFIX, ...loggerArgs);

            // Abort execution on error.
            throw '[ext-messenger] error occurred, check more information above...';
        }

        default: {
            console.error(LOG_PREFIX, `Unknown log level: ${level}`);
            break;
        }
    }
}

// For each function:
// - Add log level logging.
// - Autobinding to ensure correct 'this' from all types of function invocations.
function constructorTweakMethods(filename, thisObj) {
    let wrapMethod = function(methodName) {
        let origFunc = thisObj[methodName];

        thisObj[methodName] = function() {
            log('log', `[${filename}:${methodName}()]`, arguments);

            return origFunc.apply(thisObj, arguments);
        }.bind(thisObj);
    };

    for (let key in thisObj) {
        if (typeof thisObj[key] === 'function') {
            wrapMethod(key);
        }
    }

    // Autobinding to ensure correct 'this' from all types of function invocations.
    Object.getOwnPropertyNames(Object.getPrototypeOf(thisObj))
        .filter(prop => typeof thisObj[prop] === 'function' && prop !== 'constructor')
        .forEach(method => {
            thisObj[method] = thisObj[method].bind(thisObj);
        });
}

function removeMessengerPortNamePrefix(portName) {
    return portName.replace(new RegExp('^' + Constants.MESSENGER_PORT_NAME_PREFIX), '');
}

export default {
    log,
    constructorTweakMethods,
    removeMessengerPortNamePrefix,
};
