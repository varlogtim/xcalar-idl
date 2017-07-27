// This is the service that is run anywhere so most of the time there will be
// calls that aren't used

// Start of generic setup stuff
require("jsdom").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);

    var express = require('express');
    var bodyParser = require("body-parser");
    var fs = require("fs");
    var path = require("path");
    var http = require("http");
    require("shelljs/global");
    var exec = require("child_process").exec;
    var socket = require('./socket.js');
    var support = require('./expServerSupport.js');
    var xcConsole = require('./expServerXcConsole.js').xcConsole;
    var upload = require('./upload.js');
    var Status = require('./supportStatusFile.js').Status;
    var httpStatus = require('../../assets/js/httpStatus.js').httpStatus;

    var guiDir = (process.env.XCE_HTTP_ROOT ?
        process.env.XCE_HTTP_ROOT : "/var/www") + "/xcalar-gui";
    var serverPort = process.env.XCE_EXP_PORT ?
        process.env.XCE_EXP_PORT : 12124;

    var app = express();

    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());

    app.all('/*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        res.header("Access-Control-Allow-Headers", "Content-Type");
        res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");
        next();
    });

    // End of generic setup stuff

    // Invoke the Installer router
    app.use(require('./route/installer.js'));

    // Single node commands
    app.delete("/sessionFiles", function(req, res) {
        xcConsole.log("Removing Session Files");
        var filename =  req.body.filename;
        support.removeSessionFiles(filename)
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.delete("/SHMFiles", function(req, res) {
        xcConsole.log("Removing Files under folder SHM");
        support.removeSHM()
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.get("/license", function(req, res) {
        xcConsole.log("Get License");
        support.getLicense()
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.post("/ticket", function(req, res) {
        xcConsole.log("File Ticket");
        var contents = req.body.contents;
        support.submitTicket(contents)
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.get("/logs", function(req, res) {
        xcConsole.log("Fetching Recent Logs as Master");
        support.masterExecuteAction("GET", "/logs/slave", req.query)
        .always(function(message) {
            if (message.logs) {
                message.logs = convertToBase64(message.logs);
            }
            res.status(message.status).send(message);
        });
    });

    app.get("/logs/slave", function(req, res) {
        xcConsole.log("Fetching Recent Logs as Slave");
        support.slaveExecuteAction("GET", "/logs/slave", req.body)
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    app.get("/installationLogs/slave", function(req, res) {
        xcConsole.log("Fetching Installation Logs as Slave");
        support.slaveExecuteAction("GET", "/installationLogs/slave")
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    function copyFiles() {
        var deferredOut = jQuery.Deferred();
        var execString = scriptDir + "/deploy-shared-config.sh ";
        execString += cliArguments;
        xcConsole.log(execString);
        out = exec(execString);
        out.stdout.on('data', function(data) {
            xcConsole.log(data);
        });
        var errorMessage = "ERROR: ";
        out.stderr.on('data', function(data) {
            errorMessage += data;
            xcConsole.log("ERROR: " + data);
        });
        out.on('close', function(code) {
            var retMsg;
            if (code) {
                xcConsole.log("Failure: Copy files.");
                retMsg = {
                    "status": httpStatus.InternalServerError,
                    "reason": errorMessage
                };
                deferredOut.reject(retMsg);
            } else {
                retMsg = {"status": httpStatus.OK};
                deferredOut.resolve(retMsg);
            }
        });
        return deferredOut.promise();
    }
    // End of installer calls

    // Invoke the Service router
    app.use(require('./route/service.js'));

    // Invoke the Extension router
    app.use(require('./route/extension.js'));

    // Start of LDAP calls
    /**
    Example AD settings (now gotten from ldapConfig.json)
    var ldap_uri = 'ldap://pdc1.int.xcalar.com:389';
    var userDN = "cn=users,dc=int,dc=xcalar,dc=net";
    var useTLS = true;
    var searchFilter = "(&(objectclass=user)(userPrincipalName=%username%))";
    var activeDir = true;
    var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt';

    Example OpenLDAP Settings (now gotten from ldapConfig.json)

    var ldap_uri = 'ldap://turing.int.xcalar.com:389';
    var userDN = "uid=%username%,ou=People,dc=int,dc=xcalar,dc=com";
    var useTLS = false;
    var searchFilter = "";
    var activeDir = false;
    var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt'; */

    // Invoke the Login router
    app.use(require('./route/login.js'));

    /*
    Right /uploadContent is implemented in a really clumsy way.
    Will fix in the next version.
    */
    app.post("/uploadContent", function(req, res) {
        xcConsole.log("Uploading content");
        upload.uploadContent(req, res);
    });

    app.post('/getTimezoneOffset', function(req, res) {
        xcConsole.log("Getting Server Timezone Offset");
        var timezoneOffset = new Date().getTimezoneOffset();
        xcConsole.log("Server Timezone Offset: " + timezoneOffset);
        res.send({"offset": timezoneOffset});
    });

    function getOperatingSystem() {
        var deferred = jQuery.Deferred();
        var out = exec("cat /etc/*release");
        var output = "";
        out.stdout.on('data', function(data) {
            output += data;
        });
        out.stderr.on('data', function(err) {
            xcConsole.log("Failure: Get OS information " + err);
            deferred.reject(output);
        });
        out.on('close', function(code) {
            if (code) {
                xcConsole.log("Failure: Get OS information " + code);
                deferred.reject(output);
            } else {
                deferred.resolve(output);
            }
        });
        return deferred.promise();
    }

    function unitTest() {
        exports.genExecString = genExecString;
        exports.genLdapExecString = genLdapExecString;
        responseReplace();
        function responseReplace() {
            support.removeSessionFiles = fakeResponseRSF;
            support.removeSHM = fakeResponseSHM;
            support.getLicense = fakeResponseLicense;
            support.submitTicket = fakeResponseSubmitTicket;
            support.masterExecuteAction = fakeResponseMasterExecuteAction;
            support.slaveExecuteAction = fakeResponseSlaveExecuteAction;
            login.loginAuthentication = fakeResponseLogin;
            upload.uploadContent = fakeResponseUploadContent;
        }

        function fakeResponseRSF() {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Fake response remove Session Files!"
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseSHM() {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Fake response remove SHM Files!"
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseLicense() {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Fake response get License!"
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseSubmitTicket() {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Fake response submit Ticket!"
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseMasterExecuteAction(action, slaveUrl) {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Master: Fake response! " + slaveUrl
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseSlaveExecuteAction(action, slaveUrl) {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Slave: Fake response! " + slaveUrl
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseLogin() {
            var deferred = jQuery.Deferred();
            var retMsg = {
                "status": httpStatus.OK,
                "logs": "Fake response login!"
            };
            return deferred.resolve(retMsg).promise();
        }
        function fakeResponseUploadContent(req, res) {
            res.send("Fake response uploadContent!");
        }
    }
    exports.unitTest = unitTest;

    getOperatingSystem()
    .always(function(data) {
        data = data.toLowerCase();
        var ca = '';
        if (data.indexOf("centos") > -1) {
            xcConsole.log("Operation System: CentOS");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        }
        if (data.indexOf("ubuntu") > -1) {
            xcConsole.log("Operation System: Ubuntu");
            ca = '/etc/ssl/certs/XcalarInc_RootCA.pem';
        }
        if (data.indexOf("red hat") > -1 || data.indexOf("redhat") > -1) {
            xcConsole.log("Operation System: RHEL");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        }
        if (data.indexOf("oracle linux") > -1) {
            xcConsole.log("Operation System: Oracle Linux");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        }
        if (ca !== '' && fs.existsSync(ca)) {
            xcConsole.log('Loading trusted certificates from ' + ca);
            try {
                require('ssl-root-cas').addFile(ca).inject();
                xcConsole.log("Success: Loaded CA");
            } catch (e) {
                xcConsole.log("Failure: Loaded ca: " + ca + " !" +
                    "https will not be enabled!");
            }
        } else {
            xcConsole.log('Xcalar trusted certificate not found');
        }

        var httpServer = http.createServer(app);
        socket(httpServer);
        var port = serverPort;
        httpServer.listen(port, function() {
            var hostname = process.env.DEPLOY_HOST;
            if (!hostname) {
                hostname = "localhost";
            }
            xcConsole.log("All ready");
        });
    });
});
