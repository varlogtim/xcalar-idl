describe("XcalarThrift Test", function() {
    it("remove findMinIdx when invalid", function(done) {
        xcalarApiListXdfs(tHandle, "*findMinIdx", "*")
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
        XcalarPreview({"targetName": gDefaultSharedRoot, "path": "/"})
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
        XcalarPreview({"targetName": gDefaultSharedRoot, "path": "/"})
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
            expect(error.xcalarStatus).to.equal(1);
            expect(error.httpStatus).to.equal(undefined);
            // expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).to.equal("1234");
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            xcalarApiGetQuery = oldApiCall;
        });
    });

    // XXX need to update
    it.skip("XcalarGetQuery should handle proxy error", function(done) {
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

    describe("XcalarDatasetActivate test", function() {
        it("should return an object if fails with 502 error", function(done) {
            var cachedLoadFn = xcalarLoad;
            var cachedGetQueryFn = XcalarGetQuery;
            var cachedGetDatasetsFn = XcalarGetDatasets;
            var getDatasetsCalled = false;
            xcalarLoad = function() {
                return PromiseHelper.reject({httpStatus: 502});
            };
            XcalarGetQuery = function() {
                return "someString";
            };
            XcalarGetDatasets = function() {
                getDatasetsCalled = true;
                return PromiseHelper.resolve({
                    datasets: [{
                        name: "testDS",
                        loadIsComplete: true
                    }]
                });
            };

            XcalarDatasetActivate("testDS", 1)
            .then(function(ret) {
                expect(getDatasetsCalled).to.be.true;
                expect(ret).to.be.an("object");
                done();
            })
            .fail(function() {
                done("failed");
            })
            .always(function() {
                xcalarLoad = cachedLoadFn;
                XcalarGetQuery = cachedGetQueryFn;
                XcalarGetDatasets = cachedGetDatasetsFn;
            });
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
            xcalarListExportTargets = oldApiCall;
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

