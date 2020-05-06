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

function getThriftHandler() {
    // Global variable: tHandle
    return tHandle;
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

function switchUser(userName, userId, hashFunc = hashFunc) {
    // Global variables
    const currentUser = getCurrentUser();
    setUserIdAndName(userName, userId, hashFunc);

    // Return a restore function
    return () => {
        setUserIdAndName(currentUser.userName, currentUser.userId, hashFunc);
    };
}

function callApiInSession(callSession, callUserName, callUserId, func, hashFunc = hashFunc) {
    const restoreUser = switchUser(callUserName, callUserId, hashFunc);
    const restoreSession = switchSession(callSession);
    try {
        const result = PromiseHelper.convertToNative(func());
        return result;
    } finally {
        restoreSession();
        restoreUser();
    }
}

function randomName() {
    const pattern = 'xxxxxxxxxxxxxyyyy';
    return pattern.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
}

function createGlobalScope() {
    const scope = new proto.xcalar.compute.localtypes.Workbook.WorkbookScope();
    scope.setGlobl(new proto.xcalar.compute.localtypes.Workbook.GlobalSpecifier());
    return scope;
}

function createSessionScope({userName, sessionName}) {
    const scope = new proto.xcalar.compute.localtypes.Workbook.WorkbookScope();

    const nameInfo = new proto.xcalar.compute.localtypes.Workbook.WorkbookSpecifier.NameSpecifier();
    nameInfo.setUsername(userName);
    nameInfo.setWorkbookname(sessionName);
    const sessionInfo = new proto.xcalar.compute.localtypes.Workbook.WorkbookSpecifier();
    sessionInfo.setName(nameInfo);

    scope.setWorkbook(sessionInfo);

    return scope;
}

export { callApiInSession, hashFunc, getThriftHandler, randomName, createGlobalScope, createSessionScope };
