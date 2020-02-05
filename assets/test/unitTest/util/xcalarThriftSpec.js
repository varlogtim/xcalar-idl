describe.skip("XcalarThrift Test", function() {
    it("remove findMinIdx when invalid", function(done) {
        XcalarListXdfs("*findMinIdx", "*")
        .then((ret) => {
            expect(ret.numXdfs).to.equal(0);
            expect(ret.fnDescs.length).to.equal(0);
            done();
        })
        .fail(() => {
            done("fail");
        })
    });

    // String must be resolved for this call
    it("XcalarGetVersion should handle xcalar error", function(done) {
        const oldApiCall= Xcrpc.Version.VersionService.prototype.getVersion;
        const errorMsg = "version error"
        const statusCode = 1;
        Xcrpc.Version.VersionService.prototype.getVersion = async function() {
            throw Xcrpc.Error.parseError({ status: statusCode, error: errorMsg });
        };
        XcalarGetVersion(true)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(Xcrpc.Error.isXcalarError(error)).to.be.true;
            expect(error.status).to.equal(statusCode)
            expect(error.error).to.equal(errorMsg);
            done();
        })
        .always(function() {
            Xcrpc.Version.VersionService.prototype.getVersion = oldApiCall;
        });
    });

    it("XcalarGetVersion should handle error by proxy", function(done) {
        const oldApiCall = Xcrpc.Version.VersionService.prototype.getVersion;
        const httpStatus = 500;
        Xcrpc.Version.VersionService.prototype.getVersion = async function() {
            throw Xcrpc.Error.parseError({
                name: 'statusCode',
                statusCode: httpStatus
            });
        };
        XcalarGetVersion(true)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(Xcrpc.Error.isNetworkError(error)).to.be.true;
            expect(error.httpStatus).to.equal(httpStatus);
            done();
        })
        .always(function() {
            Xcrpc.Version.VersionService.prototype.getVersion = oldApiCall;
        });
    });

    it("XcalarGetVersion should handle xcalar error case 2", function(done) {
        const oldApiCall =  Xcrpc.Version.VersionService.prototype.getVersion;
        const errorMsg = "version error"
        const statusCode = 1;
        Xcrpc.Version.VersionService.prototype.getVersion = async function() {
            throw Xcrpc.Error.parseError({ status: statusCode, error: errorMsg });
        };
        XcalarGetVersion(false)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(statusCode)
            expect(error.error).to.equal("Error: " + StatusTStr[1]);
            expect(error.log).not.to.equal(undefined);
            expect(error.httpStatus).to.equal(undefined);
            expect(error.output).to.equal(undefined);
            done();
        })
        .always(function() {
            Xcrpc.Version.VersionService.prototype.getVersion = oldApiCall;
        });
    });

    it("XcalarGetVersion should handle error by proxy case 2", function(done) {
        const oldApiCall = Xcrpc.Version.VersionService.prototype.getVersion;
        const httpStatus = 500;
        Xcrpc.Version.VersionService.prototype.getVersion = async function() {
            throw Xcrpc.Error.parseError({
                name: 'statusCode',
                statusCode: httpStatus
            });
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
            Xcrpc.Version.VersionService.prototype.getVersion = oldApiCall;
        });
    });


    it("XcalarGetLicense should handle xcalar error", function(done) {
        const oldApiCall = Xcrpc.License.LicenseService.prototype.getLicense;
        const errorMsg = "license error";
        const statusCode = 1;
        Xcrpc.License.LicenseService.prototype.getLicense = async function() {
            throw Xcrpc.Error.parseError({ status: statusCode, error: errorMsg });
        };
        XcalarGetLicense()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(Xcrpc.Error.isXcalarError(error)).to.be.true;
            expect(error.status).to.equal(statusCode)
            expect(error.error).to.equal(errorMsg);
            done();
        })
        .always(function() {
            Xcrpc.License.LicenseService.prototype.getLicense = oldApiCall;
        });
    });

    it("XcalarGetLicense should handle error by proxy", function(done) {
        const oldApiCall = Xcrpc.License.LicenseService.prototype.getLicense;
        const httpStatus = 500;
        Xcrpc.License.LicenseService.prototype.getLicense = async function() {
            throw Xcrpc.Error.parseError({
                name: 'statusCode',
                statusCode: httpStatus
            });
        };
        XcalarGetLicense()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(Xcrpc.Error.isNetworkError(error)).to.be.true;
            expect(error.httpStatus).to.equal(httpStatus);
            done();
        })
        .always(function() {
            Xcrpc.License.LicenseService.prototype.getLicense = oldApiCall;
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
        const oldApiCall = Xcrpc.License.LicenseService.prototype.updateLicense;
        const statusCode = 1;
        const errorMsg = "update fail";
        Xcrpc.License.LicenseService.prototype.updateLicense = async function() {
            throw Xcrpc.Error.parseError({
                status: statusCode, error: errorMsg
            });
        }
        XcalarUpdateLicense()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(Xcrpc.Error.isXcalarError(error)).to.be.true;
            expect(error.status).to.equal(statusCode)
            expect(error.error).to.equal(errorMsg);
            done();
        })
        .always(function() {
            Xcrpc.License.LicenseService.prototype.updateLicense = oldApiCall;
        });
    });

    it("XcalarUpdateLicense should handle error by proxy", function(done) {
        const oldApiCall = Xcrpc.License.LicenseService.prototype.updateLicense;
        const httpStatus = 500;
        Xcrpc.License.LicenseService.prototype.updateLicense = async function() {
            throw Xcrpc.Error.parseError({
                name: 'statusCode',
                statusCode: httpStatus
            });
        }
        XcalarUpdateLicense()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(Xcrpc.Error.isNetworkError(error)).to.be.true;
            expect(error.httpStatus).to.equal(httpStatus);
            done();
        })
        .always(function() {
            Xcrpc.License.LicenseService.prototype.updateLicense = oldApiCall;
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
            var cachedLoadFn = Xcrpc.Operator.OperatorService.prototype.opBulkLoad;
            var cachedGetQueryFn = XcalarGetQuery;
            var cachedGetDatasetsFn = XcalarGetDatasets;
            var getDatasetsCalled = false;
            Xcrpc.Operator.OperatorService.prototype.opBulkLoad = async function() {
                throw { type: Xcrpc.Error.ErrorType.NETWORK, httpStatus: 502 }
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
                done('fail');
            })
            .always(function() {
                Xcrpc.Operator.OperatorService.prototype.opBulkLoad = cachedLoadFn;
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

