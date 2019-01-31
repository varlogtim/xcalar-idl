describe("SQLHistorySpace Test", () => {
    it("should be a singleton instance", () => {
        expect(SQLHistorySpace.Instance).to.be.instanceof(SQLHistorySpace);
    });

    it("should update", () => {
        let oldFunc = SQLHistorySpace.Instance._historyComponent.update;
        SQLHistorySpace.Instance._historyComponent.update = (updateInfo) => {
            expect(updateInfo).to.equal("test");
        };
        SQLHistorySpace.Instance.update("test");
        SQLHistorySpace.Instance._historyComponent.update = oldFunc;
    });

    it("should refresh", () => {
        let oldFunc = SQLHistorySpace.Instance._historyComponent.show;
        SQLHistorySpace.Instance._historyComponent.show = (refresh) => {
            expect(refresh).to.true;
        };
        SQLHistorySpace.Instance.refresh();
        SQLHistorySpace.Instance._historyComponent.show = oldFunc;
    });

    it("should analyze", (done) => {
        let oldCheck = SQLHistorySpace.Instance._checkDataflowValidation;
        let oldSwitch = SQLHistorySpace.Instance._switchToAdvForAnalyze;
        let called = 0;
        SQLHistorySpace.Instance._checkDataflowValidation = () => {
            called++;
            return PromiseHelper.resolve();
        };
        SQLHistorySpace.Instance._switchToAdvForAnalyze = () => {
            called++;
            return PromiseHelper.resolve();
        };

        SQLHistorySpace.Instance.analyze()
        .then(() => {
            expect(called).to.equal(2);
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            SQLHistorySpace.Instance._checkDataflowValidation = oldCheck;
            SQLHistorySpace.Instance._switchToAdvForAnalyze = oldSwitch;
        });
    });

    it("should alert error in analyze error", (done) => {
        let oldCheck = SQLHistorySpace.Instance._checkDataflowValidation;
        let oldAlert = Alert.error;
        let called = 0;
        SQLHistorySpace.Instance._checkDataflowValidation = () => {
            called++;
            throw "error";
        };
        Alert.error = () => {
            called++;
        };

        SQLHistorySpace.Instance.analyze()
        .then(() => {
            done("fail");
        })
        .fail(() => {
            expect(called).to.equal(2);
            done();
        })
        .always(() => {
            SQLHistorySpace.Instance._checkDataflowValidation = oldCheck;
            Alert.error = oldAlert;
        });
    });

    it("should view progress", (done) => {
        let sqlNode = DagNodeFactory.create({
            type: DagNodeType.SQL
        });
        let graph = new DagGraph();
        graph.addNode(sqlNode);
        let tab = new DagTabUser("test", null, graph);

        let oldGetTab = DagTabManager.Instance.getTabById;
        let oldInspect = DagView.inspectSQLNode;
        let oldShowProgress = SQLResultSpace.Instance.showProgressDataflow;
        let called = 0;

        DagTabManager.Instance.getTabById = () => {
            called++;
            return tab;
        };

        DagView.inspectSQLNode = () => {
            called++;
            return PromiseHelper.resolve();
        };
        SQLResultSpace.Instance.showProgressDataflow = () => {
            called++;
        };

        SQLHistorySpace.Instance.viewProgress(tab.getId())
        .then(() => {
            expect(called).to.equal(3);
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            DagTabManager.Instance.getTabById = oldGetTab;
            DagView.inspectSQLNode = oldInspect;
            SQLResultSpace.Instance.showProgressDataflow = oldShowProgress;
        });
    });

    it("should alert when cannot view progress", (done) => {
        let oldAlert = Alert.error;

        Alert.error = (title, msg) => {
            expect(title).to.equal(AlertTStr.Error);
            expect(msg).to.equal("The corresponding dataflow for sql could not be generated");
        };

        SQLHistorySpace.Instance.viewProgress(xcHelper.randName("test"))
        .then(() => {
            done("fail");
        })
        .fail(() => {
            done();
        })
        .always(() => {
            Alert.error = oldAlert;
        });
    });

    it("_switchToAdvForAnalyze should work", (done) => {
        let oldSetMode = XVM.setMode;
        let oldGetTab = DagList.Instance.getDagTabById;
        let oldOpenPanel = MainMenu.openPanel;
        let oldLoadTab = DagTabManager.Instance.loadTab;
        let oldAlign = DagView.autoAlign;
        let called = 0;
        let tab = new DagTabUser();

        XVM.setMode = 
        DagTabManager.Instance.loadTab =
        () => {
            called++;
            return PromiseHelper.resolve();
        };

        DagList.Instance.getDagTabById = () => {
            called++;
            return tab;
        };

        MainMenu.openPanel = 
        DagView.autoAlign =
        () => {
            called++;
        };

        SQLHistorySpace.Instance._switchToAdvForAnalyze(tab.getId())
        .then(() => {
            expect(called).to.equal(5);
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            XVM.setMode = oldSetMode;
            DagTabManager.Instance.loadTab = oldLoadTab;
            DagList.Instance.getDagTabById = oldGetTab;
            MainMenu.openPanel = oldOpenPanel;
            DagView.autoAlign = oldAlign;
        });
    });

    it("_switchToAdvForAnalyze sould handle error case", (done) => {
        let oldSetMode = XVM.setMode;
        let oldOpenPanel = MainMenu.openPanel;
        let oldAlert = Alert.error;
        let called = 0;

        XVM.setMode = () => {
            called++;
            return PromiseHelper.resolve();
        };

        MainMenu.openPanel = () => {
            called++;
        };
        Alert.error = (title, msg) => {
            expect(title).to.equal(AlertTStr.Error);
            expect(msg).to.equal("The corresponding dataflow for sql has been deleted");
            called++;
        };

        SQLHistorySpace.Instance._switchToAdvForAnalyze(xcHelper.randName("test"))
        .then(() => {
            done("fail");
        })
        .fail(() => {
            expect(called).to.equal(3);
            done();
        })
        .always(() => {
            XVM.setMode = oldSetMode;
            MainMenu.openPanel = oldOpenPanel;
            Alert.error = oldAlert;
        });
    });

    it("should check dataflow validation", (done) => {
        let oldHasDataflow = DagTabUser.hasDataflowAsync;
        let called = 0;

        DagTabUser.hasDataflowAsync = () => {
            called++;
            return PromiseHelper.resolve(true);
        };

        SQLHistorySpace.Instance._checkDataflowValidation({dataflowId: "test"})
        .then((dataflowId) => {
            expect(dataflowId).to.equal("test");
            expect(called).to.equal(1);
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            DagTabUser.hasDataflowAsync = oldHasDataflow;
        });
    });

    it("should check dataflow validation and restore", (done) => {
        let oldHasDataflow = DagTabUser.hasDataflowAsync;
        let oldAlert = Alert.show;
        let oldRestore = SQLHistorySpace.Instance._restoreDataflow;
        let called = 0;

        DagTabUser.hasDataflowAsync = () => {
            called++;
            return PromiseHelper.resolve(false);
        };

        Alert.show = (options) => {
            called++;
            expect(options.msg).to.equal(SQLTStr.DFDeleted);
            options.buttons[0].func();
        };

        SQLHistorySpace.Instance._restoreDataflow = () => {
            called++;
            return PromiseHelper.resolve("test2");
        };

        SQLHistorySpace.Instance._checkDataflowValidation({dataflowId: "test"})
        .then((dataflowId) => {
            expect(dataflowId).to.equal("test2");
            expect(called).to.equal(3);
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            DagTabUser.hasDataflowAsync = oldHasDataflow;
            Alert.show = oldAlert;
            SQLHistorySpace.Instance._restoreDataflow = oldRestore;
        });
    });

    it("should check dataflow validation and cancel", (done) => {
        let oldHasDataflow = DagTabUser.hasDataflowAsync;
        let oldAlert = Alert.show;
        let called = 0;

        DagTabUser.hasDataflowAsync = () => {
            called++;
            return PromiseHelper.resolve(false);
        };

        Alert.show = (options) => {
            called++;
            expect(options.msg).to.equal(SQLTStr.DFDeleted);
            options.onCancel();
        };

        SQLHistorySpace.Instance._checkDataflowValidation({dataflowId: "test"})
        .then(() => {
            done("fail");
        })
        .fail(() => {
            expect(called).to.equal(2);
            done();
        })
        .always(() => {
            DagTabUser.hasDataflowAsync = oldHasDataflow;
            Alert.show = oldAlert;
        });
    });

    it("should restore datraflow", (done) => {
        let oldSQLExecutor = SQLExecutor;
        let oldUpdate = SQLHistorySpace.Instance.update;
        let called = 0;

        SQLExecutor = function() {
            called++;
            this.restoreDataflow = () => PromiseHelper.resolve("test");
            return this;
        };

        SQLHistorySpace.Instance.update = () => {
            called++;
        };

        SQLHistorySpace.Instance._restoreDataflow({})
        .then((dataflowId) => {
            expect(dataflowId).to.equal("test");
            expect(called).to.equal(2);
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            SQLExecutor = oldSQLExecutor;
            SQLHistorySpace.Instance.update = oldUpdate;
        });
    });
});