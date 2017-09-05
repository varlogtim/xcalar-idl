describe("XcalarThrift Test", function() {
    it("remove findMinIdx when invalid", function(done) {
        xcalarApiListXdfs(tHandle, "findMinIdx", "*")
        .then(function(ret) {
            expect(ret.fnDescs.length).to.equal(1);
            expect(ret.fnDescs[0].fnName).to.equal("findMinIdx");
            expect(ret.fnDescs[0].numArgs).to.equal(-1);
            expect(ret.fnDescs[0].argDescs[0].typesAccepted).to.equal(0);
            expect(ret.fnDescs[0].argDescs[0].argDesc).to.equal("");

            return XcalarListXdfs("findMinIdx", "*");
        })
        .then(function(ret) {
            expect(ret.fnDescs.length).to.equal(0);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    // String must be resolved for this call
    it("XcalarGetVersion should handle xcalar error", function(done) {
        var oldApiCall = xcalarGetVersion;
        xcalarGetVersion = function() {
            return PromiseHelper.reject({"xcalarStatus": 1, "log": "1234"});
        };
        XcalarGetVersion(true)
        .then(function() {
            done("fail");
        })
        .fail(function(error1, error2) {
            expect(error1).to.equal("ConnectionCheck Failed");
            expect(error2.xcalarStatus).to.equal(1);
            expect(error2.log).to.equal("1234");
            expect(error2.httpStatus).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarGetVersion = oldApiCall;
        });
    });

    it("XcalarGetVersion should handle error by proxy", function(done) {
        var oldApiCall = xcalarGetVersion;
        xcalarGetVersion = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarGetVersion(true)
        .then(function() {
            done("fail");
        })
        .fail(function(error1, error2) {
            expect(error1).to.equal("ConnectionCheck Failed");
            expect(error2.xcalarStatus).to.equal(undefined);
            expect(error2.log).to.equal(undefined);
            expect(error2.httpStatus).to.equal(500);
            done();
        })
        .always(function() {
            xcalarGetVersion = oldApiCall;
        });
    });

    // String must be resolved for this call
    it("XcalarGetVersion should handle xcalar error case 2", function(done) {
        var oldApiCall = xcalarGetVersion;
        xcalarGetVersion = function() {
            return PromiseHelper.reject({"xcalarStatus": 1, "log": "1234"});
        };
        XcalarGetVersion(false)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarGetVersion = oldApiCall;
        });
    });

    it("XcalarGetVersion should handle error by proxy case 2", function(done) {
        var oldApiCall = xcalarGetVersion;
        xcalarGetVersion = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarGetVersion(false)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarGetVersion = oldApiCall;
        });
    });

    it("XcalarGetLicense should handle xcalar error", function(done) {
        var oldApiCall = xcalarGetLicense;
        xcalarGetLicense = function() {
            return PromiseHelper.reject({"xcalarStatus": 1, "log": "1234"});
        };
        XcalarGetLicense()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarGetLicense = oldApiCall;
        });
    });

    it("XcalarGetLicense should handle error by proxy", function(done) {
        var oldApiCall = xcalarGetLicense;
        xcalarGetLicense = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarGetLicense()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarGetLicense = oldApiCall;
        });
    });

    it("XcalarGetNodeName should handle xcalar error", function(done) {
        var oldApiCall = xcalarGetIpAddr;
        xcalarGetIpAddr = function() {
            return PromiseHelper.reject({"xcalarStatus": 1, "log": "1234"});
        };
        XcalarGetNodeName()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarGetIpAddr = oldApiCall;
        });
    });

    it("XcalarGetNodeName should handle error by proxy", function(done) {
        var oldApiCall = xcalarGetIpAddr;
        xcalarGetIpAddr = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarGetNodeName()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarGetIpAddr = oldApiCall;
        });
    });

    it("XcalarUpdateLicense should handle xcalar error", function(done) {
        var oldApiCall = xcalarUpdateLicense;
        xcalarUpdateLicense = function() {
            return PromiseHelper.reject({"xcalarStatus": 1, "log": "1234"});
        };
        XcalarUpdateLicense()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarUpdateLicense = oldApiCall;
        });
    });

    it("XcalarUpdateLicense should handle error by proxy", function(done) {
        var oldApiCall = xcalarUpdateLicense;
        xcalarUpdateLicense = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarUpdateLicense()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarUpdateLicense = oldApiCall;
        });
    });

    it("XcalarPreview should handle error by xcalar with log", function(done) {
        var oldApiCall = xcalarPreview;
        xcalarPreview = function() {
            return PromiseHelper.reject({"xcalarStatus": 1, "log": "1234"});
        };
        XcalarPreview("file:///")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarPreview = oldApiCall;
        });
    });

    it("XcalarPreview should handle error by proxy", function(done) {
        var oldApiCall = xcalarPreview;
        xcalarPreview = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarPreview("file:///")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarPreview = oldApiCall;
        });
    });

    it("XcalarGetQuery should handle error by xcalar with log",function(done) {
        var oldApiCall = xcalarApiGetQuery;
        xcalarApiGetQuery = function() {
            return PromiseHelper.reject({"xcalarStatus": 1, "log": "1234"});
        };
        XcalarGetQuery()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarApiGetQuery = oldApiCall;
        });
    });

    it("XcalarGetQuery should handle proxy error", function(done) {
        var oldApiCall = xcalarApiGetQuery;
        xcalarApiGetQuery = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarGetQuery()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarApiGetQuery = oldApiCall;
        });
    });

    it("XcalarLoad should have fix return order for all rejects", function(done) {
        var oldApiCall = xcalarLoad;
        var oldApiCal2 = XcalarGetQuery;
        var oldXcalarLoad = XcalarLoad;

        xcalarLoad = function() {
            var deferred = jQuery.Deferred();
            setTimeout(function(){
                deferred.reject({
                    "xcalarStatus": 1,
                    "log": "1234"
                });
            }, 1);
            return deferred.promise();
        };
        XcalarGetQuery = function() {
            var deferred = jQuery.Deferred();
            setTimeout(function(){
                deferred.reject({
                    "status": 2,
                    "log": "5678",
                    "error": "Error: " + StatusTStr[2],
                    "httpStatus": undefined,
                    "output": undefined
                });
            }, 100);
            return deferred.promise();
        };
        XcalarLoad = function() {
            var def1 = xcalarLoad();
            var def2 = XcalarGetQuery();
            var deferred = jQuery.Deferred();
            PromiseHelper.when(def1, def2)
            .then(function(ret1, ret2) {
                return deferred.resolve(ret1, ret2);
            })
            .fail(function(ret1, ret2) {
                expect(ret1.xcalarStatus).to.equal(1);
                expect(ret1.log).to.equal("1234");
                expect(ret2.status).to.equal(2);
                expect(ret2.log).to.equal("5678");
                expect(ret2.error).to.equal("Error: " + StatusTStr[2]);
                return deferred.reject(thriftLog("XcalarLoad", ret1, ret2));
            });
            return deferred.promise();
        };

        XcalarLoad()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            // only care about ret1
            expect(arguments.length).to.equal(1);
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarLoad = oldApiCall;
            XcalarGetQuery = oldApiCal2;
            XcalarLoad = oldXcalarLoad;
        });
    });

    it("XcalarLoad should have fix return order for all rejects(reverse)", function(done) {
        var oldApiCall = xcalarLoad;
        var oldApiCal2 = XcalarGetQuery;
        var oldXcalarLoad = XcalarLoad;

        xcalarLoad = function() {
            var deferred = jQuery.Deferred();
            setTimeout(function(){
                deferred.reject({
                    "xcalarStatus": 1,
                    "log": "1234"
                });
            }, 100);
            return deferred.promise();
        };
        XcalarGetQuery = function() {
            var deferred = jQuery.Deferred();
            setTimeout(function(){
                deferred.reject({
                    "status": 2,
                    "log": "5678",
                    "error": "Error: " + StatusTStr[2],
                    "httpStatus": undefined,
                    "output": undefined
                });
            }, 1);
            return deferred.promise();
        };
        // no matter which return first, ret1, ret2 has the same order
        // of def1, def2
        XcalarLoad = function() {
            var def1 = xcalarLoad();
            var def2 = XcalarGetQuery();
            var deferred = jQuery.Deferred();
            PromiseHelper.when(def1, def2)
            .then(function(ret1, ret2) {
                return deferred.resolve(ret1, ret2);
            })
            .fail(function(ret1, ret2) {
                expect(ret1.xcalarStatus).to.equal(1);
                expect(ret1.log).to.equal("1234");
                expect(ret2.status).to.equal(2);
                expect(ret2.log).to.equal("5678");
                expect(ret2.error).to.equal("Error: " + StatusTStr[2]);
                return deferred.reject(thriftLog("XcalarLoad", ret1, ret2));
            });
            return deferred.promise();
        };

        XcalarLoad()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            // For thriftLog("XcalarLoad", ret1, ret2), only care about ret1
            expect(arguments.length).to.equal(1);
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarLoad = oldApiCall;
            XcalarGetQuery = oldApiCal2;
            XcalarLoad = oldXcalarLoad;
        });
    });

    it("XcalarLoad should have fix return order for rejects and resolves", function(done) {
        // when resolve, xcalarGetQuery is an object of
        // XcalarApiGetQueryOutputT, and xcalarLoad is an object of
        // XcalarApiBulkLoadOutputT, they can never be String
        var oldApiCall = xcalarLoad;
        var oldApiCal2 = XcalarGetQuery;
        var oldXcalarLoad = XcalarLoad;

        xcalarLoad = function() {
            var deferred = jQuery.Deferred();
            setTimeout(function(){
                deferred.resolve({});
            }, 100);
            return deferred.promise();
        };

        XcalarGetQuery = function() {
            var deferred = jQuery.Deferred();
            setTimeout(function(){
                deferred.reject({
                    "status": 2,
                    "log": "5678",
                    "error": "Error: " + StatusTStr[2],
                    "httpStatus": undefined,
                    "output": undefined
                });
            }, 100);
            return deferred.promise();
        };
        XcalarLoad = function() {
            var def1 = xcalarLoad();
            var def2 = XcalarGetQuery();
            var deferred = jQuery.Deferred();
            PromiseHelper.when(def1, def2)
            .then(function(ret1, ret2) {
                return deferred.resolve(ret1, ret2);
            })
            .fail(function(ret1, ret2) {
                expect(JSON.stringify(ret1)).to.equal("{}");
                expect(ret2.status).to.equal(2);
                expect(ret2.log).to.equal("5678");
                expect(ret2.error).to.equal("Error: " + StatusTStr[2]);
                //ret1 is a string and should not be recorded
                return deferred.reject(thriftLog("XcalarLoad", ret2));
            });
            return deferred.promise();
        };

        XcalarLoad()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            // only care about ret1
            expect(arguments.length).to.equal(1);
            expect(error.status).to.equal(2);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[2]);
            expect(error.log).to.equal("5678");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarLoad = oldApiCall;
            XcalarGetQuery = oldApiCal2;
            XcalarLoad = oldXcalarLoad;
        });
    });

    it("XcalarLoad should have fix return order for rejects and resolves", function(done) {
        // when resolve, xcalarGetQuery will return a SQL string
        // and xcalarLoad is an object of XcalarApiBulkLoadOutputT
        var oldApiCall = xcalarLoad;
        var oldApiCal2 = XcalarGetQuery;
        var oldXcalarLoad = XcalarLoad;

        xcalarLoad = function() {
            var deferred = jQuery.Deferred();
            setTimeout(function(){
                deferred.reject({
                    "xcalarStatus": 1,
                    "log": "1234"
                });
            }, 100);
            return deferred.promise();
        };

        XcalarGetQuery = function() {
            var deferred = jQuery.Deferred();
            setTimeout(function(){
                deferred.resolve({});
            }, 100);
            return deferred.promise();
        };

        XcalarLoad = function() {
            var def1 = xcalarLoad();
            var def2 = XcalarGetQuery();
            var deferred = jQuery.Deferred();
            PromiseHelper.when(def1, def2)
            .then(function(ret1, ret2) {
                return deferred.resolve(ret1, ret2);
            })
            .fail(function(ret1, ret2) {
                expect(ret1.xcalarStatus).to.equal(1);
                expect(ret1.log).to.equal("1234");
                expect(JSON.stringify(ret2)).to.equal("{}");
                //ret1 is a string and should not be recorded
                return deferred.reject(thriftLog("XcalarLoad", ret1));
            });
            return deferred.promise();
        };

        XcalarLoad()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            // only care about ret1
            expect(arguments.length).to.equal(1);
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarLoad = oldApiCall;
            XcalarGetQuery = oldApiCal2;
            XcalarLoad = oldXcalarLoad;
        });
    });

    it("XcalarAddUDFExportTarget should handle xcalar error", function(done) {
        var oldApiCall = xcalarAddExportTarget;
        xcalarAddExportTarget = function() {
            return PromiseHelper.reject({"xcalarStatus": 1, "log": "1234"});
        };
        XcalarAddUDFExportTarget()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarAddExportTarget = oldApiCall;
        });
    });

    it("XcalarAddUDFExportTarget should handle proxy error", function(done) {
        var oldApiCall = xcalarAddExportTarget;
        xcalarAddExportTarget = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarAddUDFExportTarget()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarAddExportTarget = oldApiCall;
        });
    });

    it("XcalarRemoveExportTarget should handle xcalar error",function(done) {
        var oldApiCall = xcalarRemoveExportTarget;
        xcalarRemoveExportTarget = function() {
            return PromiseHelper.reject({"xcalarStatus": 1, "log": "1234"});
        };
        XcalarRemoveExportTarget()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarRemoveExportTarget = oldApiCall;
        });
    });

    it("XcalarRemoveExportTarget should handle proxy error", function(done) {
        var oldApiCall = xcalarRemoveExportTarget;
        xcalarRemoveExportTarget = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarRemoveExportTarget()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarRemoveExportTarget = oldApiCall;
        });
    });

    it("XcalarListExportTargets should handle xcalar error", function(done) {
        var oldApiCall = xcalarListExportTargets;
        xcalarListExportTargets = function() {
            return PromiseHelper.reject({"xcalarStatus": 1, "log": "1234"});
        };
        XcalarListExportTargets()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarRemoveExportTarget = oldApiCall;
        });
    });

    it("XcalarListExportTargets should handle proxy error", function(done) {
        var oldApiCall = xcalarListExportTargets;
        xcalarListExportTargets = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarListExportTargets()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarListExportTargets = oldApiCall;
        });
    });

    it("XcalarUploadPython should handle xcalar error", function(done) {
        var oldApiCall = xcalarApiUdfAdd;
        xcalarApiUdfAdd = function() {
            var output = {};
            output.error = {};
            output.error.message = "message";
            return PromiseHelper.reject({
                "xcalarStatus": 1,
                "log": "1234",
                "output": output
            });
        };
        XcalarUploadPython()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.be.null;
            expect(error.httpStatus).to.be.null;
            expect(error.error).to.equal("Error: message");
            expect(error.log).to.be.null;
            expect(error.output).to.be.null;
            done();
        })
        .always(function() {
            xcalarApiUdfAdd = oldApiCall;
        });
    });

    it("XcalarUploadPython should handle proxy error", function(done) {
        var oldApiCall = xcalarApiUdfAdd;
        xcalarApiUdfAdd = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarUploadPython()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarApiUdfAdd = oldApiCall;
        });
    });

    it("XcalarUpdatePython should handle xcalar error", function(done) {
        var oldApiCall = xcalarApiUdfUpdate;
        xcalarApiUdfUpdate = function() {
            var output = {};
            output.error = {};
            output.error.message = "message";
            return PromiseHelper.reject({
                "xcalarStatus": 1,
                "log": "1234",
                "output": output
            });
        };
        XcalarUpdatePython()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.be.null;
            expect(error.httpStatus).to.be.null;
            expect(error.error).to.equal("Error: message");
            expect(error.log).to.be.null;
            expect(error.output).to.be.null;
            done();
        })
        .always(function() {
            xcalarApiUdfUpdate = oldApiCall;
        });
    });

    it("XcalarUpdatePython should handle proxy error", function(done) {
        var oldApiCall = xcalarApiUdfUpdate;
        xcalarApiUdfUpdate = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarUpdatePython()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarApiUdfUpdate = oldApiCall;
        });
    });

    it("XcalarQueryCancel should handle xcalar error", function(done) {
        var oldApiCall = xcalarQueryCancel;
        xcalarQueryCancel = function() {
            return PromiseHelper.reject({
                "xcalarStatus": 1,
                "log": "1234"
            });
        };
        XcalarQueryCancel()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarQueryCancel = oldApiCall;
        });
    });

    it("XcalarQueryCancel should handle proxy error", function(done) {
        var oldApiCall = xcalarQueryCancel;
        xcalarQueryCancel = function() {
            return PromiseHelper.reject({"httpStatus": 500});
        };
        XcalarQueryCancel()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(undefined);
            expect(error.httpStatus).to.equal(500);
            expect(error.error)
                  .to.equal("Error: Proxy Error with http status code: 500");
            expect(error.log).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarQueryCancel = oldApiCall;
        });
    });
});

