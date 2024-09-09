/* eslint-env node */

module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        "webextensions": true,
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module",
    },
    "rules": {
        "semi": ["warn", "always"],
        "no-trailing-spaces": "warn",
        "space-before-blocks": ["warn", "always"],
        "comma-dangle": ["warn", "always-multiline"],
    },
};
