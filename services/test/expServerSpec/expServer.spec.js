var assert = require('assert');
var expect = require('chai').expect;
var express = require('express');

require("jquery");
var expServer = require(__dirname + '/../../expServer/expServer.js');
var support = require(__dirname + '/../../expServer/support.js');

function postRequest(action, str) {
    var deferred = jQuery.Deferred();
    jQuery.ajax({
        "type": "POST",
        "data": JSON.stringify(str),
        "contentType": "application/json",
        "url": "http://localhost:12124" + action,
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

    it('Should receive /removeSessionFiles request', function() {
        return postRequest("/removeSessionFiles", {})
                .then(function(data) {
                    expect(data)
                    .to.equal("Fake response remove Session Files!");
                })
                .fail(function(data) {
                    expect(data)
                    .to.equal("Fake response remove Session Files!");
                });
    });

    it('Should receive /removeSHM request', function() {
        return postRequest("/removeSHM", {})
                .then(function(data) {
                    expect(data)
                    .to.equal("Fake response remove SHM Files!");
                })
                .fail(function(data) {
                    expect(data)
                    .to.equal("Fake response remove SHM Files!");
                });
    });

    it('Should receive /getLicense request', function() {
        return postRequest("/getLicense", {})
                .then(function(data) {
                    expect(data)
                    .to.equal("Fake response get License");
                })
                .fail(function(data) {
                    expect(data)
                    .to.equal("Fake response get License");
                });
    });

    it('Should receive /fileTicket request', function() {
        return postRequest("/fileTicket", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response submit Ticket!");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response submit Ticket!");
                });
    });

    it('Should receive /service/start request', function() {
        return postRequest("/service/start", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response! /service/start");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response! /service/start");
                });
    });

    it('Should receive /service/stop request', function() {
        return postRequest("/service/stop", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response! /service/stop");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response! /service/stop");
                });
    });

    it('Should receive /service/restart request', function() {
        return postRequest("/service/restart", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response! /service/restart");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response! /service/restart");
                });
    });

    it('Should receive /service/status request', function() {
        return postRequest("/service/status", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response! /service/status");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response! /service/status");
                });
    });

    it('Should receive /service/condrestart request', function() {
        return postRequest("/service/condrestart", {})
                .then(function(data) {
                    expect(data)
                    .to.equal("Fake response! /service/condrestart");
                })
                .fail(function(data) {
                    expect(data)
                    .to.equal("Fake response! /service/condrestart");
                });
    });

    it('Should receive /service/start/slave request', function() {
        return postRequest("/service/start/slave", {})
                .then(function(data) {
                    expect(data)
                    .to.equal("Fake response! /service/start/slave");
                })
                .fail(function(data) {
                    expect(data)
                    .to.equal("Fake response! /service/start/slave");
                });
    });

    it('Should receive /service/stop/slave request', function() {
        return postRequest("/service/stop/slave", {})
                .then(function(data) {
                    expect(data)
                    .to.equal("Fake response! /service/stop/slave");
                })
                .fail(function(data) {
                    expect(data).
                    to.equal("Fake response! /service/stop/slave");
                });
    });

    it('Should receive /service/restart/slave request', function() {
        return postRequest("/service/restart/slave", {})
                .then(function(data) {
                    expect(data)
                    .to.equal("Fake response! /service/restart/slave");
                })
                .fail(function(data) {
                    expect(data)
                    .to.equal("Fake response! /service/restart/slave");
                });
    });

    it('Should receive /service/status/slave request', function() {
        return postRequest("/service/status/slave", {})
                .then(function(data) {
                    expect(data)
                    .to.equal("Fake response! /service/status/slave");
                })
                .fail(function(data) {
                    expect(data)
                    .to.equal("Fake response! /service/status/slave");
                });
    });

    it('Should receive /service/condrestart/slave request', function() {
        return postRequest("/service/condrestart/slave", {})
                .then(function(data) {
                    expect(data)
                    .to.equal("Fake response! /service/condrestart/slave");
                })
                .fail(function(data) {
                    expect(data)
                    .to.equal("Fake response! /service/condrestart/slave");
                });
    });

    it('Should receive /recentLogs request', function() {
        expServer.hasLog(true);
        return postRequest("/recentLogs", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response! /recentLogs");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response! /recentLogs");
                });
    });

    it('Should receive /recentLogs request', function() {
        expServer.hasLog(false);
        return postRequest("/recentLogs", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response! /recentJournals");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response! /recentJournals");
                });
    });

    it('Should receive /monitorLogs request', function() {
        return postRequest("/monitorLogs", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response! /monitorJournals");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response! /monitorJournals");
                });
    });

    it('Should receive /stopMonitorLogs request', function() {
        return postRequest("/stopMonitorLogs", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response! /stopMonitorLogs");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response! /stopMonitorLogs");
                });
    });

    it('Should receive /recentLogs/slave request', function() {
        return postRequest("/recentLogs/slave", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response! /recentLogs/slave");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response! /recentLogs/slave");
                });
    });

    it('Should receive /monitorJournals/slave request', function() {
        return postRequest("/monitorJournals/slave", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response! /monitorJournals/slave");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response! /monitorJournals/slave");
                });
    });

    it('Should receive /recentJournals/slave request', function() {
        return postRequest("/recentJournals/slave", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response! /recentJournals/slave");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response! /recentJournals/slave");
                });
    });

    it('Should receive /uploadContent request', function() {
        return postRequest("/uploadContent", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response uploadContent!");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response uploadContent!");
                });
    });

    it('Should receive /uploadMeta request', function() {
        return postRequest("/uploadMeta", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response uploadMeta!");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response uploadMeta!");
                });
    });

    it('Should receive /login request', function() {
        return postRequest("/login", {})
                .then(function(data) {
                    expect(data).to.equal("Fake response uploadContent!");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake response uploadContent!");
                });
    });

    it('Should response xcalar start request', function() {
        support.unitTest();
        return postRequest("/fakeRequest/xcalarStart", {})
                .then(function(data) {
                    expect(data).to.equal("Fake execution!");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake execution!");
                });
    });

    it('Should response xcalar stop request', function() {
        support.unitTest();
        return postRequest("/fakeRequest/xcalarStop", {})
                .then(function(data) {
                    expect(data).to.equal("Fake execution!");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake execution!");
                });
    });

    it('Should response xcalar status request', function() {
        support.unitTest();
        return postRequest("/fakeRequest/xcalarStatus", {})
                .then(function(data) {
                    expect(data).to.equal("Fake execution!");
                })
                .fail(function(data) {
                    expect(data).to.equal("Fake execution!");
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
        var result1 = {};
        result1.status = 1;
        result1.logs = "123";
        var result2 = {};
        result2.status = -1;
        result2.error = "456";
        var results = [result1, result2];

        var res = support.generateLogs(action, results);
        var str = "Execute action for all Nodes:\n\n"
                  + "Host: " + 0 + "\n"
                  + "Return Status: "
                  + "Ok\n"
                  + "Logs: 123\n\n"
                  + "Host: " + 1 + "\n"
                  + "Return Status: "
                  + "Error\n"
                  + "Error: 456\n\n";
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
        var command = "service xcalar start";
        var data = 'Mgmtd running';
        expect(support.isComplete(command, data)).to.equal(true);

        command = "service xcalar start";
        data = 'Mgmtd already running';
        expect(support.isComplete(command, data)).to.equal(true);

        command = "service xcalar start";
        data = '...';
        expect(support.isComplete(command, data)).to.equal(false);

        command = "service xcalar stop";
        data = 'Xcalar is not running';
        expect(support.isComplete(command, data)).to.equal(true);
    });
});