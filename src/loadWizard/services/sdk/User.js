import * as crypto from 'crypto';

function hashFunc(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * LoginUser depends on XD's login
 */
class LoginUser {
    getUserName() {
        // Global variable
        return userIdName;
    }

    getUserId() {
        // Global variable
        return userIdUnique;
    }

    getHashFunc() {
        return hashFunc;
    }
}

const DEFAULT_USERNAME = "xcalar-lw-internal";
function computeUserId(userName) {
    return Number.parseInt("0x" + hashFunc(userName).substring(0, 5)) + 4000000;
};
class User {
    constructor({ userName = DEFAULT_USERNAME} = {}) {
        this._userName = userName;
        this._userId = computeUserId(userName);
    }

    getUserName() {
        return this._userName;
    }

    getUserId() {
        return this._userId;
    }

    getHashFunc() {
        return hashFunc;
    }
}

export { LoginUser, User };