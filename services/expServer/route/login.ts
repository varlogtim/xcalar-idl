import * as xcConsole from "../utils/expServerXcConsole";
import support from "../utils/expServerSupport";
import * as HttpStatus from "../../../assets/js/httpStatus";
const httpStatus = HttpStatus.httpStatus;
import * as crypto from "crypto";
import atob = require("atob");

import { Router } from "express"
export const router: any = Router()

import loginManager from "../controllers/loginManager"

// Start of LDAP calls
/*
Example AD settings (now gotten from ldapConfig.json)
var ldap_uri = 'ldap://pdc1.int.xcalar.com:389';
var userDN = "cn=users,dc=int,dc=xcalar,dc=net";
var useTLS = true;
var searchFilter = "(&(objectclass=user)(userPrincipalName=%username%))";
var activeDir = true;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt';

Example OpenLDAP Settings (now gotten from ldapConfig.json)

var ldap_uri = 'ldap://ldap.int.xcalar.com:389';
var userDN = "uid=%username%,ou=People,dc=int,dc=xcalar,dc=com";
var useTLS = false;
var searchFilter = "";
var activeDir = false;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt';
*/
router.post('/login', function(req, res, next) {
    xcConsole.log("Login process");
    var credArray = req.body;
    res.locals.sessionType = JSON.stringify(support.defaultSessionAge);
    if (credArray.hasOwnProperty('sessionType')) {
        if (!support.sessionAges.hasOwnProperty(credArray.sessionType)) {
            var message = {
                'status': httpStatus.BadRequest,
                'message': 'Unknown session type'
            }
            return res.status(message.status).send(message);
        }
        res.locals.sessionType = JSON.stringify(credArray.sessionType);
    }
    loginManager.loginAuthentication(credArray)
    .always(function(message) {
        res.locals.message = JSON.stringify(message);
        next();
    });
}, [support.loginAuth]);

router.post('/logout', [support.checkAuth], function(req, res) {
    var username = req.session.username;
    var message = {
        'status': httpStatus.OK,
        'message': 'User ' + username + ' is logged out'
    }

    loginManager.vaultLogout(req.session)
    .always(function () {
        req.session.destroy(function(err) {
            if (err) {
                message = {
                    'status': httpStatus.BadRequest,
                    'message': 'Error logging out user ' + username + ' :' + JSON.stringify(err)
                }
            }

            xcConsole.log("logging out user " + username);

            res.status(message.status).send(message);
        });
    });
});

router.post('/login/with/HttpAuth', function(req, res) {
    xcConsole.log("Login with http auth");
    const credBuffer = new Buffer(req.body.credentials, 'base64');
    var credString = credBuffer.toString();
    var delimitPos = credString.indexOf(":");
    var errMsg = "";

    if (delimitPos !== -1) {
        var credArray = {
            "xiusername": credString.substring(0, delimitPos),
            "xipassword": credString.substring(delimitPos + 1)
        }

        if (credArray['xiusername'].length > 0) {
            loginManager.loginAuthentication(credArray)
            .then(function(message) {
                // Add in token information for SSO access
                message.timestamp = Date.now();
                message.signature = crypto.createHmac("sha256", "xcalar-salt2")
                    .update(
                        JSON.stringify(userInfo, Object.keys(userInfo).sort()))
                    .digest("hex");
                delete message.status;

                if (message.isValid) {
                    req.session.loggedIn = (message.isSupporter ||
                                            message.isAdmin);

                    req.session.loggedInAdmin = message.isAdmin;
                    req.session.loggedInUser = message.isSupporter;

                    req.session.firstName = message.firstName;
                    req.session.emailAddress = message.mail;

                    support.create_login_jwt(req, res);
                }

                const tokenBuffer = new Buffer(JSON.stringify(message));
                res.status(httpStatus.OK).send(tokenBuffer.toString('base64'));
                return;
            })
            .fail(function(message) {
                res.status(httpStatus.Forbidden).send("Invalid credentials");
                return
            });
        } else {
            errMsg = 'no username provided';
        }
    } else {
        errMsg = 'no username or password provided';
    }

    res.status(httpStatus.BadRequest).send("Malformed credentials: " + errMsg)
});

router.post('/login/verifyToken', function(req, res) {
    xcConsole.log("Verify token");
    try {
        var userInfo = JSON.parse(atob(req.body.token));
        var userInfoSignature = userInfo.signature;
        delete userInfo.signature;

        var computedSignature = crypto.createHmac("sha256", "xcalar-salt2")
            .update(JSON.stringify(userInfo, Object.keys(userInfo).sort()))
            .digest("hex");

        if (userInfoSignature != computedSignature) {
            throw new Error("Token has been tampered with!");
        }

        var currTime = Date.now();
        if (currTime > (userInfo.timestamp + (1000 * 60 * 5))) {
            res.status(403).send({"errorMsg": "Token has expired"});
            return;
        }

        delete userInfo.timestamp;

        support.create_login_jwt(req, res);
        res.status(200).send(userInfo);
    } catch (err) {
        res.status(400).send({"errorMsg": "Malformed token: " + err});
    }
});

router.post('/login/msalConfig/get',
            function(req, res) {
    xcConsole.log("Getting msal config");
    loginManager.getMsalConfig()
    .then(function(message) {
        res.status(message.status).send(message.data);
    }, function(message) {
        res.status(message.status).send(message);
    });
});


router.post('/login/msalConfig/set',
            [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Setting msal config");
    var credArray = req.body;
    loginManager.setMsalConfig(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});


router.post('/login/defaultAdmin/get',
            [support.checkAuth], function(req, res) {
    xcConsole.log("Getting default admin");
    loginManager.getDefaultAdmin()
    .then(function(message) {
        delete message.data.password;
        res.status(message.status).send(message.data);
    }, function(message) {
        res.status(message.status).send(message);
    });
});


router.post('/login/defaultAdmin/set',
            [loginManager.securitySetupAuth], loginManager.setupDefaultAdmin);

router.post('/login/defaultAdmin/setup',
            [loginManager.securitySetupAuth], loginManager.setupDefaultAdmin);

router.post('/login/ldapConfig/get',
            [support.checkAuth], function(req, res) {
    xcConsole.log("Getting ldap config");
    loginManager.getLdapConfig()
    .then(function(message) {
        res.status(message.status).send(message.data);
    }, function(message) {
        res.status(message.status).send(message);
    });
});


router.post('/login/ldapConfig/set',
            [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Setting ldap config");
    var credArray = req.body;
    loginManager.setLdapConfig(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

if (process.env.NODE_ENV === "test") {
    router.post('/login/test/user',
            [support.checkAuth], function(req, res) {
        xcConsole.log("testing user auth");
        res.status(httpStatus.OK).send("user auth successful");
    });

    router.post('/login/test/admin',
                [support.checkAuthAdmin], function(req, res) {
        xcConsole.log("testing admin auth");
        res.status(httpStatus.OK).send("admin auth successful");
    });
}
