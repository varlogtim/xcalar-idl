// This is the service that is run anywhere so most of the time there will be
// calls that aren't used

// Start of generic setup stuff
require("jsdom/lib/old-api").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);

    var express = require('express');
    var bodyParser = require("body-parser");
    var fs = require("fs");
    var http = require("http");
    require("shelljs/global");
    var exec = require("child_process").exec;
    var socket = require('./socket.js');
    var xcConsole = require('./expServerXcConsole.js').xcConsole;
    var proxy = require('express-http-proxy');
    var url = require('url')
    var serverPort = process.env.XCE_EXP_PORT ?
        process.env.XCE_EXP_PORT : 12124;
    if (process.env.NODE_ENV === "test") {
        // For expServer test
        serverPort = 12125;
    }

    var app = express();

    // proxy thrift requests to mgmtd
    app.use('/thrift/service', proxy('localhost:9090', {
        proxyReqPathResolver: function(req) {
            return url.parse(req.url).path;
        },
        proxyErrorHandler: function(err) {
            xcConsole.error('error on proxy', err);
        }
    }));

    // increase default limit payload size of 100kb
    app.use(bodyParser.urlencoded({extended: false, limit: '20mb'}));
    app.use(bodyParser.json({limit: '20mb'}));

    app.all('/*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS");
        res.header("Access-Control-Allow-Credentials", "true");
        next();
    });
    // End of generic setup stuff

    // Invoke the Installer router
    app.use(require('./route/installer.js').router);

    // Invoke the Service router
    app.use(require('./route/service.js').router);

    // Invoke the Extension router
    app.use(require('./route/extension.js').router);

    // Invoke the Login router
    app.use(require('./route/login.js').router);

    // Invoke the Authentication router
    app.use(require('./route/auth.js').router);

    // Invoke the sqlApi router
    app.use(require('./route/sqlRestApi.js').router);

    // Invoke the xcrpc router
    app.use(require('./route/xcrpc.js').router);

    function getOperatingSystem() {
        var deferred = jQuery.Deferred();
        var out = exec("cat /etc/*release");
        var output = "";
        out.stdout.on('data', function(data) {
            output += data;
        });
        out.stderr.on('data', function(err) {
            xcConsole.log("Failure: Get OS information " + err);
            deferred.reject("Fail to get OS info");
        });
        out.on('close', function(code) {
            if (code) {
                xcConsole.log("Failure: Get OS information " + code);
                deferred.reject("Fail to get OS info");
            } else {
                deferred.resolve(output);
            }
        });
        return deferred.promise();
    }

    function getCertificate(data) {
        var ca = '';
        if (data.indexOf("centos") > -1) {
            xcConsole.log("Operation System: CentOS");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        } else if (data.indexOf("ubuntu") > -1) {
            xcConsole.log("Operation System: Ubuntu");
            ca = '/etc/ssl/certs/XcalarInc_RootCA.pem';
        } else if (data.indexOf("red hat") > -1 || data.indexOf("redhat") > -1) {
            xcConsole.log("Operation System: RHEL");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        } else if (data.indexOf("oracle linux") > -1) {
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
        return ca;
    }

    getOperatingSystem()
    .always(function(data) {
        data = data.toLowerCase();
        // This is helpful for test and variable can be used in future development
        var ca = getCertificate(data);

        var httpServer = http.createServer(app);
        socket(httpServer);
        var port = serverPort;
        httpServer.listen(port, function() {
            var hostname = process.env.DEPLOY_HOST;
            if (!hostname) {
                hostname = "localhost";
            }
            xcConsole.log("All ready, Listen on port " + port);
            if (process.env.NODE_ENV === "test") {
                exports.server = httpServer;
            }
        });

        httpServer.on('error', function(err){
            xcConsole.error('error on error hanlder', err);
        });
    });

    process.on('uncaughtException', function(err) {
        xcConsole.error('process.on handler', err);
    });

    if (process.env.NODE_ENV === "test") {
        exports.getOperatingSystem = getOperatingSystem;
        exports.getCertificate = getCertificate;
    }
});
