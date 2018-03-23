var xcConsole = require('../expServerXcConsole.js').xcConsole;
var jQuery;
require("jsdom/lib/old-api").env("", function(err, window) {
    if (err) {
        xcConsole.error('require in auth', err);
        return;
    }
    jQuery = require("jquery")(window);
});

const express = require('express');
var router = express.Router();
var request = require('request');
var jwkToPem = require('jwk-to-pem');
var NodeCache = require( "node-cache" );
var jwt = require('jsonwebtoken');
var httpStatus = require('../../../assets/js/httpStatus.js').httpStatus;
var xcConsole = require('../expServerXcConsole.js').xcConsole;
var support = require('../expServerSupport.js');
var msKeyCache = new NodeCache( { stdTTL:86400, checkperiod: 21600 } );
var msAzureCE2Url = 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration';
var msAzureB2CUrl = 'https://login.microsoftonline.com/fabrikamb2c.onmicrosoft.com/v2.0/.well-known/openid-configuration?p=b2c_1_sign_in';
var b2cEnabled = false;

function enableB2C(enabled) {
    b2cEnabled = enabled;
}

function getUrl(url) {
    var deferred = jQuery.Deferred();
    var retMsg = { status: false, url: url, data: null, error: null };

    request.get(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            retMsg.data = JSON.parse(body);
            retMsg.status = true;
            deferred.resolve(retMsg);
        } else {
            retMsg.error = error;
            deferred.reject(retMsg);
        }
    });

    return deferred.promise();
}

function getError(data) {
    var deferred = jQuery.Deferred();
    xcConsole.error("Key URL not found or returned unexpected data: " + data.url);
    deferred.reject(data)
    return deferred.promise();
}

function passData(data) {
    var deferred = jQuery.Deferred();
    deferred.resolve(data)
    return deferred.promise();
}

function getKeys(outKid) {
    var deferred = jQuery.Deferred();
    var retMsg = { status: false, data: null, message: 'Failure' };
    var msAzureUrl = (b2cEnabled) ? msAzureB2CUrl : msAzureCE2Url;

    getUrl(msAzureUrl)
    .then(function(urlData) {
        if (urlData.data.jwks_uri) {
            return(getUrl(urlData.data.jwks_uri));
        }
        urlData.status = false;
        return(getError(urlData));
    }, function(data) {
        return(getError(data));
    })
    .then(function(urlData) {
        if (urlData.data !== null && urlData.data.hasOwnProperty('keys')) {
            for (var i = 0; i < urlData.data.keys.length; i++) {
                var b = new Buffer(jwkToPem(urlData.data.keys[i]));
                msKeyCache.set(urlData.data.keys[i].kid, b);
                if (urlData.data.keys[i].kid === outKid) {
                    xcConsole.log("found key for key id: " + outKid);
                    retMsg = { status: true, data: b, message: 'success' };
                }
            }
            if (retMsg.status) {
                deferred.resolve(retMsg);
                return;
            }

            retMsg = { status: false,
                       data: urlData.data,
                       message: 'Key not present in returned keys'};
        } else if (urlData.data !== null) {
            retMsg = { status: false,
                       data: urlData.data,
                       message: 'Keys not found in retrieved for url: ' + urlData.url };
            if (urlData.error) {
                retMsg.message += ' Error: ' + urlData.error.message;
            }
        } else {
            retMsg = { status: false,
                       data: null,
                       message: 'Key retrieval error for url: ' + urlData.url };
            if (urlData.error) {
                retMsg.message += ' Error: ' + urlData.error.message;
            }
        }

        deferred.reject(retMsg);
        return;
    });

    return deferred.promise();
}

function retrieveKey(kid) {
    var deferred = jQuery.Deferred();
    var retMsg = { status: true, data: null, message: 'Success' };

    msKeyCache.get(kid, function(err, data) {
        if (err || data === undefined) {
            retMsg = { status: false,
                       data: data,
                       message: (data === undefined) ?
                       'Key not found in the cache' :
                       'Error retrieving data from the cache: ' + err.message };
            deferred.reject(retMsg);
        }

        retMsg.data = data;
        deferred.resolve(retMsg);
    });

    return deferred.promise();
}

function processToken(idToken) {
    var headerBuf = new Buffer(idToken.split('.')[0], 'base64');
    var header = JSON.parse(headerBuf.toString());
    var deferred = jQuery.Deferred();
    var retMsg = { status: true, message: 'Success', data: null };

    retrieveKey(header.kid)
    .then(function(msg) {
        return(passData(msg));
    }, function(msg) {
        return(getKeys(header.kid));
    })
    .always(function(msg) {
         if (!msg.status) {
            msg.data = false;
            deferred.reject(msg);
            return;
        }

        jwt.verify(idToken, msg.data, {clockTolerance: 120},
                   function(err, decoded) {
            if (err) {
                retMsg = { status: false,
                           data: decoded,
                           message: "Error during web token verification: " + err.message };
                deferred.reject(retMsg);
                return;
            }
            retMsg.data = decoded;
            deferred.resolve(retMsg);
        });
    });

    return deferred.promise();
}

router.post('/auth/azureIdToken', function(req, res) {
    xcConsole.log("Authenticaking Azure Id Token");
    var idToken = req.body.token;
    var user = req.body.user;
    var admin = req.body.admin;
    var headerBuf = new Buffer(idToken.split('.')[0], 'base64');
    var header = JSON.parse(headerBuf.toString());
    var retMsg = { status: httpStatus.OK, data: null, success: true, message: null };

    if (! header.kid) {
        retMsg = { status: httpStatus.InternalServerError,
                   data: null,
                   success: false,
                   message: 'Token header does not contain a key id'};
        res.status(retMsg.status).send(retMsg);
    }

    processToken(idToken)
    .always(function(msg) {
        if (msg.status) {
            req.session.loggedIn = user;
            req.session.loggedInAdmin = admin;
        }
        retMsg = { status: (msg.status) ? httpStatus.OK : httpStatus.Unauthorized,
                   data: msg.data,
                   success: msg.status,
                   message: msg.message };
        res.status(retMsg.status).send(retMsg);
    });
});

function fakeProcessToken(func) {
    processToken = func;
}

function fakeGetUrl(func) {
    getUrl = func;
}

function fakeRetrieveKey(func) {
    retrieveKey = func;
}

if (process.env.NODE_ENV === "test") {
    exports.getUrl = getUrl;
    exports.msKeyCache = msKeyCache;
    // fake functions
    exports.fakeProcessToken = fakeProcessToken;
    exports.fakeGetUrl = fakeGetUrl;
    exports.fakeRetrieveKey = fakeRetrieveKey;
}
router.get('/auth/sessionStatus', function(req, res) {
    var message = { user: false,
                    admin: false,
                    loggedIn: false,
                    emailAddress: null,
                    firstName: null };
    var expirationDate = (new Date(req.session.cookie.expires)).getTime();
    var now = (new Date).getTime();

    if (req.session.hasOwnProperty('loggedIn') &&
        req.session.hasOwnProperty('loggedInAdmin') &&
        req.session.hasOwnProperty('loggedInUser') &&
        req.session.hasOwnProperty('firstName') &&
        req.session.hasOwnProperty('emailAddress')) {

        message = {
            user: req.session.loggedInUser,
            admin: req.session.loggedInAdmin,
            loggedIn: req.session.loggedIn &&
                (now <= expirationDate),
            emailAddress: req.session.emailAddress,
            firstName: req.session.firstName
        }
    }

    res.status(httpStatus.OK).send(message);
});

router.post('/auth/setCredential',
            [support.checkAuth], function(req, res) {
    var message = {valid: false, status: httpStatus.BadRequest};

    if (req.body.hasOwnProperty('key') &&
        req.body.hasOwnProperty('data')) {

        if (! req.session.credentials) {
            req.session.credentials = {};
        }

        req.session.credentials[req.body.key] = req.body.data;
        message['valid'] = true;
        message['status'] = httpStatus.OK;
    }

    res.status(message.status).send(message);
});

router.post('/auth/getCredential',
           [support.checkAuth], function(req, res) {
    var message = { valid: false, status: httpStatus.BadRequest, data: null };

    if (req.body.hasOwnProperty('key')) {
        message['valid'] = true;

        if (req.session.credentials &&
            req.session.credentials[req.body.key]) {
            message['status'] = httpStatus.OK;

            message['data'] = req.session.credentials[req.body.key];
        }
    }

    res.status(message.status).send(message);
});

router.post('/auth/delCredential',
           [support.checkAuth], function(req, res) {
    var message = { valid: false, status: httpStatus.BadRequest };

    if (req.body.hasOwnProperty('key')) {
        message['valid'] = true;

        if (req.session.credentials &&
            req.session.credentials[req.body.key]) {
            delete req.session.credentials[req.body.key];

            message['status'] = httpStatus.OK;
        }
    }

    res.status(message.status).send(message);
});

router.get('/auth/clearCredentials',
           [support.checkAuth], function(req, res) {
    var message = { valid: true, status: httpStatus.BadRequest };

    if (req.session.credentials) {
        req.session.credentials = {};

        message['status'] = httpStatus.OK;
    }

    res.status(message.status).send(message);
});

router.get('/auth/listCredentialKeys',
           [support.checkAuth], function(req, res) {
    var message = { valid: true, status: httpStatus.BadRequest, data: []};

    if (req.session.credentials) {
        message['status'] = httpStatus.OK;
        message['data'] = Object.keys(req.session.credentials);
    }

    res.status(message.status).send(message);
});

exports.router = router;
exports.enableB2C = enableB2C;
