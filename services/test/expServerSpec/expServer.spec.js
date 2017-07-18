var assert = require('assert');
var expect = require('chai').expect;
var express = require('express');
var fs = require("fs");

require("jquery");
var expServer = require(__dirname + '/../../expServer/expServer.js');
var support = require(__dirname + '/../../expServer/expServerSupport.js');

function postRequest(action, url, str) {
    var deferred = jQuery.Deferred();
    jQuery.ajax({
        "type": action,
        "data": JSON.stringify(str),
        "contentType": "application/json",
        "url": "http://localhost:12124" + url,
        "async": true,
        success: function(data) {
            deferred.resolve(data);
        },
        error: function(error) {
            deferred.reject(error);
        }
    });
    return deferred.promise();
}

describe('Sample Test', function() {
    it('should pass', function() {
        assert.equal(1, 1);
    });

    it('should fail', function() {
        expect(1).to.equal(1);
    });
});

describe('ExpServer function Test', function() {
    before(function() {
        expServer.unitTest();
    });
    it('Should generate execute string', function() {
        var res = expServer.genExecString("a", true, "c", true,
            "e", "f", undefined);
        var str = " -h a -l e --priv-hosts-file /config/privHosts.txt" +
                  " --password-file c -p f --license-file " +
                  "/config/license.txt";
        expect(res).to.equal(str);
    });

    it('Should generate ldap execute string', function() {
        var res = expServer.genLdapExecString("a", "b",
                  "c");
        var str = ' --ldap-domain a --ldap-org "c" --ldap-password ';
        expect(res.indexOf(str)).to.equal(0);
    });

    it('Should receive /sessionFiles request', function() {
        return postRequest("DELETE", "/sessionFiles", {})
                .then(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Fake response remove Session Files!");
                })
                .fail(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Fake response remove Session Files!");
                });
    });

    it('Should receive /removeSHM request', function() {
        return postRequest("DELETE", "/SHMFiles", {})
                .then(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Fake response remove SHM Files!");
                })
                .fail(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Fake response remove SHM Files!");
                });
    });

    it('Should receive /getLicense request', function() {
        return postRequest("GET", "/license", {})
                .then(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Fake response get License!");
                })
                .fail(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Fake response get License!");
                });
    });

    it('Should receive /fileTicket request', function() {
        return postRequest("POST", "/ticket", {})
                .then(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Fake response submit Ticket!");
                })
                .fail(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Fake response submit Ticket!");
                });
    });

    it('Should receive /service/start request', function() {
        return postRequest("POST", "/service/start", {})
                .then(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /service/start/slave");
                })
                .fail(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /service/start/slave");
                });
    });

    it('Should receive /service/stop request', function() {
        return postRequest("POST", "/service/stop", {})
                .then(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /service/stop/slave");
                })
                .fail(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /service/stop/slave");
                });
    });

    it('Should receive /service/restart request', function() {
        return postRequest("POST", "/service/restart", {})
                .then(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /service/stop/slave" +
                        "Master: Fake response! /service/start/slave");
                })
                .fail(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /service/stop/slave" +
                        "Master: Fake response! /service/start/slave");
                });
    });

    it('Should receive /service/status request', function() {
        return postRequest("GET", "/service/status", {})
                .then(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /service/status/slave");
                })
                .fail(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /service/status/slave");
                });
    });

    it('Should receive /logs request', function() {
        return postRequest("GET", "/logs", {})
                .then(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /logs/slave");
                })
                .fail(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /logs/slave");
                });
    });

    it('Should receive /service/status request', function() {
        return postRequest("GET", "/service/status", {})
                .then(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /service/status/slave");
                })
                .fail(function(data) {
                    expect(new Buffer(data.logs, 'base64').toString())
                    .to.equal("Master: Fake response! /service/status/slave");
                });
    });

    it('Should receive /service/start/slave request', function() {
        return postRequest("POST", "/service/start/slave", {})
                .then(function(data) {
                    expect(data.logs)
                    .to.equal("Slave: Fake response! /service/start/slave");
                })
                .fail(function(data) {
                    expect(data.logs)
                    .to.equal("Slave: Fake response! /service/start/slave");
                });
    });

    it('Should receive /service/stop/slave request', function() {
        return postRequest("POST", "/service/stop/slave", {})
                .then(function(data) {
                    expect(data.logs)
                    .to.equal("Slave: Fake response! /service/stop/slave");
                })
                .fail(function(data) {
                    expect(data.logs)
                    .to.equal("Slave: Fake response! /service/stop/slave");
                });
    });

    it('Should receive /service/status/slave request', function() {
        return postRequest("GET", "/service/status/slave", {})
                .then(function(data) {
                    expect(data.logs)
                    .to.equal("Slave: Fake response! /service/status/slave");
                })
                .fail(function(data) {
                    expect(data.logs)
                    .to.equal("Slave: Fake response! /service/status/slave");
                });
    });

    it('Should receive /logs/slave request', function() {
        return postRequest("GET", "/logs/slave", {})
                .then(function(data) {
                    expect(data.logs)
                    .to.equal("Slave: Fake response! /logs/slave");
                })
                .fail(function(data) {
                    expect(data.logs)
                    .to.equal("Slave: Fake response! /logs/slave");
                });
    });

    it('Should receive /installationLogs/slave request', function() {
        return postRequest("GET", "/installationLogs/slave", {})
                .then(function(data) {
                    expect(data.logs)
                    .to.equal("Slave: Fake response! /installationLogs/slave");
                })
                .fail(function(data) {
                    expect(data.logs)
                    .to.equal("Slave: Fake response! /installationLogs/slave");
                });
    });

    it('Should receive /uploadContent request', function() {
        return postRequest("POST", "/uploadContent", {})
                .then(function(data) {
                    expect(data)
                    .to.equal("Fake response uploadContent!");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response uploadContent!");
                });
    });

    it('Should receive /login request', function() {
        return postRequest("POST", "/login", {})
                .then(function(data) {
                    expect(data.logs).to.equal("Fake response login!");
                })
                .fail(function(data) {
                    expect(data.logs).to.equal("Fake response login!");
                });
    });
});

describe('Support function Test', function() {
    before(function() {
        support.unitTest();
    });
    it('Should read Host from file', function() {
        var hostFile = "./services/test/expServerSpec/hostname.js";
        return support.readHostsFromFile(hostFile).then(function (hosts) {
            var value = ['host1', 'host2', 'host3'];
            assert.equal(hosts.toString(),value.toString());
        });
    });

    it('Should generate Logs', function() {
        var action = "action";
        var slaveUrl = "/logs/slave";
        var result1 = {};
        result1.status = 1;
        result1.logs = "123";
        var result2 = {};
        result2.status = -1;
        result2.error = "456";
        var results = [result1, result2];

        var res = support.generateLogs(action, slaveUrl, results);
        var str = "Execute action /logs for all Nodes:\n\n"
                  + "Host: " + 0 + "\n"
                  + "Return Status: "
                  + "1\n"
                  + "Logs:\n123\n\n"
                  + "Host: " + 1 + "\n"
                  + "Return Status: "
                  + "-1\n"
                  + "Error:\n456\n\n";
        expect(res).to.equal(str);
    });

    it('Should under Base Path', function() {
        var basePath = "/a/b/c/";
        var completePath = "/a/b/c/d/e";
        expect(support.isUnderBasePath(basePath, completePath))
        .to.equal(true);
    });

    it('Should get Xcalar Root', function() {
        support.getXlrRoot()
        .then(function(path) {
            assert.equal(path,"/mnt/xcalar");
        })
        .fail(function(path) {
            assert.equal(path,"/mnt/xcalar");
        });
    });

    it('Should be completed', function() {
        var command = "/opt/xcalar/bin/xcalarctl start";
        var data = 'xcmgmtd started';
        expect(support.isComplete(command, data)).to.equal(true);

        command = "/opt/xcalar/bin/xcalarctl start";
        data = 'Usrnode already running';
        expect(support.isComplete(command, data)).to.equal(true);

        command = "/opt/xcalar/bin/xcalarctl start";
        data = '...';
        expect(support.isComplete(command, data)).to.equal(false);

        command = "/opt/xcalar/bin/xcalarctl stop";
        data = 'Stopped Xcalar';
        expect(support.isComplete(command, data)).to.equal(true);
    });
});

describe('App market place function Test', function() {
    before(function() {
        support.unitTest();
    });
    it('Should download Extension', function() {
        var deferred = jQuery.Deferred();
        postRequest("POST", "/downloadExtension", {name: "kmeans",
            version: "1.0.0"})
        .then(function(data) {
            expect(data.status).to.equal(1);
            deferred.resolve();
        });
        return deferred.promise();
    });

    it('Should remove Extension', function() {
        var jsFile = '/../../../assets/extensions/ext-available/kmeans.ext.js';
        var pyFile = '/../../../assets/extensions/ext-available/kmeans.ext.py';
        var deferred = jQuery.Deferred();

        postRequest("POST", "/downloadExtension", {name: "kmeans",
            version: "1.0.0"})
        .then(function() {
            return postRequest("POST", "/enableExtension", {name: "kmeans"});
        })
        .then(function() {
            expect(fs.existsSync(__dirname + jsFile))
            .to.equal(true);
            expect(fs.existsSync(__dirname + pyFile))
            .to.equal(true);
            return postRequest("POST", "/removeExtension", {name: "kmeans"});
        })
        .then(function(data) {
            expect(data.status).to.equal(-1);
            expect(data.error).to.equal("Must disable extension first");
            return postRequest("POST", "/disableExtension", {name: "kmeans"});
        })
        .then(function(data) {
            expect(data.status).to.equal(1);
            return postRequest("POST", "/removeExtension", {name: "kmeans"});
        })
        .then(function() {
            expect(fs.existsSync(__dirname + jsFile))
            .to.equal(false);
            expect(fs.existsSync(__dirname + pyFile))
            .to.equal(false);
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });
        return deferred.promise();
    });

    it('Should Enabled and Disable Extensions', function() {
        var jsFile = '/../../../assets/extensions/ext-enabled/kmeans.ext.js';
        var pyFile = '/../../../assets/extensions/ext-enabled/kmeans.ext.py';

        var outDeferred = jQuery.Deferred();

        postRequest("POST", "/downloadExtension", {name: "kmeans",
            version: "1.0.0"})
        .then(function() {
            return postRequest("POST", "/disableExtension", {name: "kmeans"});
        })
        .then(function() {
            return postRequest("POST", "/enableExtension", {name: "kmeans"});
        })
        .then(function(data) {
            expect(fs.existsSync(__dirname + jsFile))
            .to.equal(true);
            expect(fs.existsSync(__dirname + pyFile))
            .to.equal(true);
            expect(data.status).to.equal(1);
            return postRequest("POST", "/enableExtension", {name: "kmeans"});
        })
        .then(function(data) {
            expect(fs.existsSync(__dirname + jsFile))
            .to.equal(true);
            expect(fs.existsSync(__dirname + pyFile))
            .to.equal(true);
            expect(data.status).to.equal(-1);
            expect(data.error).to.equal("Extension already enabled");
            return postRequest("POST", "/disableExtension", {name: "kmeans"});
        })
        .then(function(data) {
            expect(fs.existsSync(__dirname + jsFile))
            .to.equal(false);
            expect(fs.existsSync(__dirname + pyFile))
            .to.equal(false);
            expect(data.status).to.equal(1);
            return postRequest("POST", "/disableExtension", {name: "kmeans"});
        })
        .then(function(data) {
            expect(fs.existsSync(__dirname + jsFile))
            .to.equal(false);
            expect(fs.existsSync(__dirname + pyFile))
            .to.equal(false);
            expect(data.status).to.equal(-1);
            expect(data.error).to.equal("Extension was not enabled");
            outDeferred.resolve();
        })
        .fail(function() {
            outDeferred.reject();
        });
        return outDeferred.promise();
    });

    it('Should get Enabled Extensions', function() {
        var outDeferred = jQuery.Deferred();
        postRequest("POST", "/downloadExtension", {name: "bizRules",
            version: "1.0.0"})
        .then(function() {
            return postRequest("POST", "/downloadExtension",
             {name: "dev", version: "1.0.0"});
        })
        .then(function() {
            return postRequest("POST", "/downloadExtension",
             {name: "genRowNum", version: "1.0.0"});
        })
        .then(function() {
            return postRequest("POST", "/downloadExtension",
             {name: "glm", version: "1.0.0"});
        })
        .then(function() {
            return postRequest("POST", "/downloadExtension",
             {name: "kmeans", version: "1.0.0"});
        })
        .then(function() {
            return postRequest("POST", "/downloadExtension",
             {name: "xcalarDef", version: "1.0.0"});
        })
        .then(function() {
            return postRequest("POST", "/enableExtension",
             {name: "bizRules"});
        })
        .then(function() {
            return postRequest("POST", "/disableExtension",
             {name: "dev"});
        })
        .then(function() {
            return postRequest("POST", "/disableExtension",
             {name: "genRowNum"});
        })
        .then(function() {
            return postRequest("POST", "/disableExtension",
             {name: "glm"});
        })
        .then(function() {
            return postRequest("POST", "/disableExtension",
             {name: "kmeans"});
        })
        .then(function() {
            return postRequest("POST", "/disableExtension",
             {name: "xcalarDef"});
        })
        .then(function() {
            return postRequest("POST", "/getEnabledExtensions", {});
        })
        .then(function(data) {
            var str = '<html>\n' +
                      '<head>\n' +
                      '    <script src="assets/extensions/ext-enabled/bizRules.ext.js"' +
                      ' type="text/javascript"></script>\n' +
                      '  </head>\n'+
                      '  <body>\n' +
                      '  </body>\n' +
                      '</html>';
            expect(str).to.equal(data.data);
            return postRequest("POST", "/enableExtension", {name: "dev"});
        })
        .then(function() {
            return postRequest("POST", "/getEnabledExtensions", {});
        })
        .then(function(data) {
            var str = '<html>\n' +
                      '<head>\n' +
                      '    <script src="assets/extensions/ext-enabled/bizRules.ext.js"' +
                      ' type="text/javascript"></script>\n' +
                      '    <script src="assets/extensions/ext-enabled/dev.ext.js"' +
                      ' type="text/javascript"></script>\n' +
                      '  </head>\n'+
                      '  <body>\n' +
                      '  </body>\n' +
                      '</html>';
            expect(str).to.equal(data.data);
            outDeferred.resolve();
        })
        .fail(function() {
            outDeferred.reject();
        });
        return outDeferred.promise();
    });

    it('Should get Available Extension', function() {
        var outDeferred = jQuery.Deferred();
        postRequest("POST", "/getAvailableExtension", {})
        .then(function(data) {
            var arr = data.extensionsAvailable;
            expect(jQuery.inArray('bizRules', arr)).to.not.equal(-1);
            expect(jQuery.inArray('dev', arr)).to.not.equal(-1);
            expect(jQuery.inArray('genRowNum', arr)).to.not.equal(-1);
            expect(jQuery.inArray('glm', arr)).to.not.equal(-1);
            expect(jQuery.inArray('kmeans', arr)).to.not.equal(-1);
            expect(jQuery.inArray('xcalarDef', arr)).to.not.equal(-1);
            expect(jQuery.inArray('fake-extension', arr)).to.equal(-1);
            outDeferred.resolve();
        });
        return outDeferred.promise();
    });
});