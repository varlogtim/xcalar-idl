var jQuery;
require("jsdom").env("", function(err, window) {
    if (err) {
        console.error(err);
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
var msKeyCache = new NodeCache( { stdTTL:86400, checkperiod: 21600 } );
var msAzureUrl = 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration';
var xcConsole = require('../expServerXcConsole.js').xcConsole;

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
    xcConsole.log("Key URL not found or returned unexpected data: " + data.url);
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
                deferred.reject(retMsg);
            } else if (urlData.data !== null) {
                retMsg = { status: false,
                           data: urlData.data,
                           message: 'Keys not found in retrieved for url: ' + urlData.url };
                if (urlData.error) {
                    retMsg.message += ' Error: ' + urlData.error.message;
                }
                deferred.reject(retMsg);
            } else {
                retMsg = { status: false,
                           data: null,
                           message: 'Key retrieval error for url: ' + urlData.url };
                if (urlData.error) {
                    retMsg.message += ' Error: ' + urlData.error.message;
                }
                deferred.reject(retMsg);
            }
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

        jwt.verify(idToken, msg.data, function(err, decoded) {
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

exports.router = router;
