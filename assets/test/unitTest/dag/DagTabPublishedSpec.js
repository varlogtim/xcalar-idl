describe("DagTabPublished Test", function() {
    let dagTab;

    before(function() {
        dagTab = new DagTabPublished({name: "test"});
        dagTab._kvStore.getAndParse = () => {
            return PromiseHelper.resolve({
                name: "test",
                id: "test",
                dag: {}
            });
        };
        dagTab._kvStore.put = () => PromiseHelper.resolve();
    });

    it("should getName", function() {
        expect(dagTab.getName()).to.equal("test");
    });

    it("should getPath", function() {
        expect(dagTab.getPath()).to.equal("/Published/test");
    });

    it("getUDFContext should work", function() {
        expect(dagTab.getUDFContext()).to.deep.equal({
            udfUserName: ".xcalar.published.df",
            udfSessionName: "test"
        });
    });

    it("getUDFDisplayPathPrefix should work", function() {
        expect(dagTab.getUDFDisplayPathPrefix())
        .to.equal("/workbook/.xcalar.published.df/test/");
    });

    it("getNodeUDFResolution should reject invalid case", function(done) {
        dagTab.getNodeUDFResolution(null)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).not.to.be.empty;
            done();
        });
    });

    it("getNodeUDFResolution should work", function(done) {
        let called = false;
        let fakeDagNode = {
            getModuleResolutions: () => {
                called = true;
                return PromiseHelper.resolve();
            }
        };
        
        dagTab.getNodeUDFResolution(fakeDagNode)
        .then(function() {
            expect(called).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should load", function(done) {
        let oldKVStore = dagTab._kvStore;
        dagTab._kvStore = {
            getAndParse: () => {
                return PromiseHelper.resolve({
                    name: "test",
                    id: "test",
                    dag: {},
                    editVersion: 0
                });
            },
            put: () => PromiseHelper.resolve()
        }

        dagTab.load()
        .then(function(res) {
            expect(res.id).to.equal("test");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            dagTab._kvStore = oldKVStore;
        });
    });

    describe("Save Test", function() {
        let oldKVStore;

        before(function() {
            oldKVStore = dagTab._kvStore;
        });

        it("should save", function(done) {
            let oldCommit = Log.commit;
            let called = false;
            Log.commit = () => called = true;
            let oldEditVersion = dagTab._editVersion;
    
            dagTab._kvStore = {
                getAndParse: () => {
                    return PromiseHelper.resolve({
                        name: "test",
                        id: "test",
                        dag: {},
                        editVersion: oldEditVersion
                    });
                },
                put: () => PromiseHelper.resolve()
            }
    
            dagTab.save()
            .then(function() {
                expect(dagTab._editVersion).to.equal(oldEditVersion + 1);
                expect(called).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Log.commit = oldCommit;
            });
        });

        it("should revert version when commit fail", function(done) {
            let oldEditVersion = dagTab._editVersion;
            dagTab._kvStore = {
                getAndParse: () => {
                    return PromiseHelper.resolve({
                        name: "test",
                        id: "test",
                        dag: {},
                        editVersion: oldEditVersion
                    });
                },
                put: () => PromiseHelper.reject("test")
            }
    
            dagTab.save()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(dagTab._editVersion).to.equal(oldEditVersion);
                expect(error).to.equal("test");
                done();
            });
        });

        it("should alert for no seesion fail", function(done) {
            let oldAlert = Alert.show;
            let called = false;

            Alert.show = () => called = true;

            dagTab._kvStore = {
                getAndParse: () => {
                    return PromiseHelper.reject({
                        status: StatusT.StatusSessionNotFound
                    });
                }
            }
    
            dagTab.save()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(called).to.equal(true);
                done();
            })
            .always(function() {
                Alert.show = oldAlert;
            });
        });

        after(function() {
            dagTab._kvStore = oldKVStore;
        });
    });

    describe("Delete Test", function() {
        let oldDeactivate;
        let oldDeleteWKBK;

        before(function() {
            oldDeactivate = XcalarDeactivateWorkbook;
            oldDeleteWKBK =  XcalarDeleteWorkbook;
        });

        it("should delete for DagTabPublished", function(done) {
            let called = 0;
    
            XcalarDeleteWorkbook =
            XcalarDeactivateWorkbook = () => {
                called++;
                return PromiseHelper.resolve();
            };
    
            dagTab.delete()
            .then(function() {
                expect(called).to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("delete should still resolve if no seesion error", function(done) {
            let called = 0;
            XcalarDeleteWorkbook = () => {
                called++;
                return PromiseHelper.reject({
                    status: StatusT.StatusSessionNotFound
                });
            };

            XcalarDeactivateWorkbook = () => {
                called++;
                return PromiseHelper.resolve();
            };
    
            dagTab.delete()
            .then(function() {
                expect(called).to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("delete should reject in error case", function(done) {
            XcalarDeleteWorkbook = () => {
                return PromiseHelper.reject({
                    error: "test"
                });
            }
    
            dagTab.delete()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error.error).to.equal("test");
                done();
            });
        });

        after(function() {
            XcalarDeactivateWorkbook = oldDeactivate;
            XcalarDeleteWorkbook = oldDeleteWKBK;
        });
    });

    it("should upload", function(done) {
        let oldUpload = XcalarUploadWorkbook;

        XcalarUploadWorkbook = () => PromiseHelper.resolve("testId");

        dagTab.upload()
        .then(function() {
            expect(dagTab.getId()).to.equal("testId");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarUploadWorkbook = oldUpload;
        });
    });

    it("should download", function(done) {
        let oldDownload = XcalarDownloadWorkbook;
        let oldHelper = xcHelper.downloadAsFile;
        let called = false;
        XcalarDownloadWorkbook = () => PromiseHelper.resolve({});
        xcHelper.downloadAsFile = () => called = true;

        dagTab.download()
        .then(function() {
            expect(called).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarDownloadWorkbook = oldDownload;
            xcHelper.downloadAsFile = oldHelper;
        });
    });

    describe("Publish Test", function() {
        let oldNewWKBK;
        let oldActivate;
        let oldWrite;
        let oldGetUDF;
        let oldUpload;

        before(function() {
            oldNewWKBK = XcalarNewWorkbook;
            oldActivate = XcalarActivateWorkbook;
            oldWrite = dagTab._writeToKVStore;
            oldGetUDF = UDFFileManager.Instance.getEntireUDF;
            UDFFileManager.Instance.getEntireUDF = () => PromiseHelper.resolve("test");
            oldUpload = XcalarUploadPython;
            XcalarUploadPython = () => PromiseHelper.resolve();
        });

        it("should upload", function(done) {
            let called = 0;
            XcalarNewWorkbook = () => {
                called++;
                return PromiseHelper.resolve("testPublish");
            };

            XcalarActivateWorkbook =
            dagTab._writeToKVStore = () => {
                called++;
                return PromiseHelper.resolve();
            };

            dagTab.publish()
            .then(function() {
                expect(dagTab.getId()).to.equal("testPublish");
                expect(called).to.equal(3);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should delete workbook in fail case", function(done) {
            let oldDelete = dagTab._deleteWKBK;
            let called = false;
            XcalarNewWorkbook = () => PromiseHelper.resolve("testPublish");
            dagTab._writeToKVStore = () => PromiseHelper.reject("test");

            dagTab._deleteWKBK = () => called = true;

            dagTab.publish()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(called).to.equal(true);
                expect(error.log).to.equal("test");
                done();
            })
            .always(function() {
                dagTab._deleteWKBK = oldDelete;
            });
        });

        after(function() {
            XcalarNewWorkbook = oldNewWKBK;
            dagTab._writeToKVStore = oldWrite;
            UDFFileManager.Instance.getEntireUDF = oldGetUDF;
            XcalarUploadPython = oldUpload;
        });
    });

    it("should clone", function(done) {
        let oldNew = XcalarNewWorkbook;
        let called = false;
        XcalarNewWorkbook = () => {
            called = true;
            return PromiseHelper.resolve();
        };

        dagTab.clone()
        .then(function() {
            expect(called).to.equal(true);
            done();
        })
        .fail(function() {
            done();
        })
        .always(function() {
            XcalarNewWorkbook = oldNew;
        });
    });

    it("copyUDFToLocal should work", function(done) {
        let called = 0;
        let oldList = XcalarListXdfs;
        let oldRefresh = UDFFileManager.Instance.refresh;
        let oldDownload = XcalarDownloadPython;
        let oldUpload = XcalarUploadPython;

        XcalarListXdfs = () => {
            called++;
            return PromiseHelper.resolve({
                fnDescs: [{fnName: "default:test"}]
            });
        };

        UDFFileManager.Instance.refresh = () => called++;
        XcalarDownloadPython = () => {
            called++;
            return PromiseHelper.resolve("test");
        };

        XcalarUploadPython = () => {
            called++;
            return PromiseHelper.resolve();
        };


        dagTab.copyUDFToLocal(true)
        .then(function() {
            expect(called).to.equal(4);
            done();
        })
        .fail(function() {
            done();
        })
        .always(function() {
            XcalarListXdfs = oldList;
            UDFFileManager.Instance.refresh = oldRefresh;
            XcalarDownloadPython = oldDownload;
            XcalarUploadPython = oldUpload;
        });
    });

    describe("Static Function Test", function() {
        it("getSecretUser should work", function() {
            let res = DagTabPublished.getSecretUser();
            expect(res).to.equal(".xcalar.published.df");
        });

        it("getDelim should work", function() {
            let res = DagTabPublished.getDelim();
            expect(res).to.equal("_Xcalar_");
        });

        it("getPrefixUDF should work", function() {
            let res = DagTabPublished.getPrefixUDF();
            expect(res).to.equal(DagTabPublished._prefixUDF);
        });

        it("DagTabPublished.restore should work", function(done) {
            let oldFunc = XcalarListWorkbooks;
            XcalarListWorkbooks = () => PromiseHelper.resolve({
                sessions: [{name: "test", sessionId: "test"}]
            });

            DagTabPublished.restore()
            .then(function(dags) {
                expect(dags.length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarListWorkbooks = oldFunc;
            });
        });
    });
});