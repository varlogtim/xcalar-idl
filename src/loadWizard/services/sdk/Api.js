import * as crypto from 'crypto';

const {
    PromiseHelper,
    setSessionName,
    setUserIdAndName
} = global;

function getCurrentSession() {
    // Global variable: sessionName
    return sessionName;
}

function getCurrentUser() {
    // Global variables
    return {
        userName: userIdName,
        userId: userIdUnique
    };
}

function hashFunc(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

function switchSession(callSession) {
    const currentSession = getCurrentSession();
    setSessionName(callSession);

    // Return a restore function
    return () => {
        setSessionName(currentSession);
    };
}

function switchUser(userName, userId) {
    // Global variables
    const currentUser = getCurrentUser();
    setUserIdAndName(userName, userId, hashFunc);

    // Return a restore function
    return () => {
        setUserIdAndName(currentUser.userName, currentUser.userId, hashFunc);
    };
}

function callApiInSession(callSession, callUserName, callUserId, func) {
    const restoreUser = switchUser(callUserName, callUserId);
    const restoreSession = switchSession(callSession);
    try {
        const result = PromiseHelper.convertToNative(func());
        return result;
    } finally {
        restoreSession();
        restoreUser();
    }
}

export { callApiInSession, hashFunc };
