describe("DSObj Test", function() {
    var $mainTabCache;
    var $gridView;
    var $statusBox;

    var testFolder;
    var testDS;
    var user;

    before(function(){
        $gridView = $("#dsListSection").find(".gridItems");
        $statusBox = $("#statusBox");
        user = Support.getUser();

        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        UnitTest.onMinMode();
    });

    describe("Basic Function Test", function() {
        it("Should get home folder", function() {
            var homeFolder = DS.getHomeDir();
            expect(homeFolder).to.be.an("object");
            expect(homeFolder).to.have.property("id").to.equal(".");
            expect(homeFolder).to.have.property("name").to.equal(".");
            expect(homeFolder).to.have.property("user").to.equal(user);
            expect(homeFolder).to.have.property("parentId").to.equal(".parent");
            expect(homeFolder).to.have.property("isFolder").to.be.true;
            expect(homeFolder).to.have.property("uneditable").to.be.false;
            expect(homeFolder).to.have.property("eles")
                                .to.be.instanceof(Array)
                                .to.have.length.of.at.least(0);
            expect(homeFolder).to.have.property("totalChildren")
                                .to.be.at.least(0);
        });

        it("Should get dsObj", function() {
            expect(DS.getDSObj(".")).to.equal(DS.getHomeDir());
        });

        it("Should get error dsobj", function() {
            expect(DS.getErrorDSObj()).to.be.null;
        });

        it("DS.getGrid should work", function() {
            // edge case
            var res = DS.getGrid();
            expect(res).to.be.null;

            // home folder case
            res = DS.getGrid(".");
            expect(res).not.to.be.empty;
        });

        it("DS.has should work", function() {
            var testName = xcHelper.uniqueRandName("testSuites-dsObj", DS.has, 10);
            expect(DS.has(testName)).to.be.false;
            expect(DS.has(null)).to.be.false;
        });

        it("Should add current user's ds", function() {
            var user = Support.getUser();
            var dsName = xcHelper.uniqueRandName("dsobj", DS.has, 10);
            var testName = user + "." + dsName;
            var ds = DS.addCurrentUserDS(testName, "CSV", "testPath");

            expect(ds).not.to.be.null;
            expect(ds.getName()).to.equal(dsName);
            expect(ds.getFormat()).to.equal("CSV");
            expect(ds.getPath()).to.equal("testPath");
            expect(ds.isEditable()).to.be.true;
            var dsId = ds.getId();
            DS.__testOnly__.removeDS(DS.getGrid(dsId));
            expect(DS.getDSObj(dsId)).to.be.null;
        });

        it("Should add other user's ds", function(done) {
            var homeFolder = DS.getHomeDir();
            var user = xcHelper.randName(Support.getUser());
            var dsName = xcHelper.uniqueRandName("dsobj", DS.has, 10);
            var testName = user + "." + dsName;

            var ds = DS.addOtherUserDS(testName, "CSV", "testPath");
            expect(ds).not.to.be.null;
            expect(ds.getName()).to.equal(dsName);
            expect(ds.getFormat()).to.equal("CSV");
            expect(ds.getPath()).to.equal("testPath");
            expect(ds.isEditable()).to.be.false;

            DS.restore(homeFolder, false)
            .then(function() {
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("Should upgrade dsObj", function() {
            var oldFolder = DS.getHomeDir();
            oldFolder.version = 0;

            var newFolder = DS.upgrade(oldFolder);
            expect(newFolder.version).to.equal(currentVersion);
            expect(newFolder.eles.length)
            .to.equal(oldFolder.eles.length);

            // case 2
            newFolder = DS.upgrade(null);
            expect(newFolder).to.be.null;
        });
    });

    describe("Grid View Event Test", function() {
        var $folder;

        before(function() {
            // test is on home folder
            DS.goToDir(DSObjTerm.homeDirId);
        });

        it("Should click toggle view button to toggle the view", function() {
            var isListView = $gridView.hasClass("listView");
            $("#dataViewBtn").click();
            expect($gridView.hasClass("listView")).to.equal(!isListView);

            // switch back to old view
            $("#exportViewBtn").click();
            expect($gridView.hasClass("listView")).to.equal(isListView);
        });

        it("Should add folder by clicking addFolderBtn", function() {
            var homeFolder = DS.getHomeDir();
            var numEles = homeFolder.eles.length;
            $("#addFolderBtn").click();

            $folder = $gridView.find(".grid-unit.folder.active");
            expect($folder.length).to.equal(1);
            var newNumEles = homeFolder.eles.length;
            expect(newNumEles - numEles).to.equal(1);
        });

        it("Should click on folder to focus on it", function() {
            $folder.click();
            expect($folder.hasClass("active")).to.be.true;
        });

        it("Should dbclick a folder to enter", function() {
            var e = jQuery.Event("dblclick");
            $folder.trigger(e);
            expect($folder.hasClass("xc-hidden")).to.be.true;
        });

        it("Should click backFolderBtn to go back", function() {
            $("#backFolderBtn").click();
            expect($folder.hasClass("xc-hidden")).to.be.false;
        });

        it("Should click forwardFolderBtn to go forward", function() {
            $("#forwardFolderBtn").click();
            expect($folder.hasClass("xc-hidden")).to.be.true;
        });

        it("Should go to home via path section", function() {
            var $path = $('#dsListSection .path[data-dir="' +
                            DSObjTerm.homeDirId + '"]');
            expect($path.length).to.equal(1);
            $path.click();
            expect($folder.hasClass("xc-hidden")).to.be.false;
        });

        it("Should edit the folder's name", function() {
            $folder.find(".edit").click();
            var $label = $folder.find("> .label");
            expect($label.hasClass("focused")).to.be.true;
            var $textarea = $label.find("textarea");
            expect($textarea.length).to.equal(1);

            // should click on textarea
            $textarea.click();
            expect($label.hasClass("focused")).to.be.true;

            var newName = xcHelper.randName("folder");
            $textarea.text(newName);
            $textarea.trigger(fakeEvent.enter);
            if ($label.hasClass("focused")) {
                $textarea.blur();
            }
            expect($label.data("dsname")).to.equal(newName);
        });

        it("Should delete folder", function() {
            var homeFolder = DS.getHomeDir();
            var numEles = homeFolder.eles.length;
            var id = $folder.data("dsid");

            $folder.find(".delete").click();
            var newNumEles = homeFolder.eles.length;
            expect(newNumEles - numEles).to.equal(-1);
            expect(DS.getGrid(id).length).to.equal(0);
        });
    });

    describe("New Folder Test", function() {
        it("Should create new folder", function() {
            testFolder = DS.newFolder();

            expect(testFolder).to.be.instanceof(DSObj);
            expect(testFolder).to.have.property("id");
            expect(testFolder).to.have.property("name");
            expect(testFolder).to.have.property("user").to.equal(user);
            expect(testFolder).to.have.property("parentId");
            expect(testFolder).to.have.property("eles");
            expect(testFolder).to.have.property("totalChildren");
            expect(testFolder).to.have.property("isFolder").to.be.true;
            expect(testFolder).to.have.property("uneditable").to.be.false;

            // should blur it first, otherwise rename will have bug
            var $grid = DS.getGrid(testFolder.getId());
            $grid.find(".label textarea").blur();
        });

        it("Should not create folder in uneditable folder", function() {
            var id = xcHelper.randName("folderId");
            var name = xcHelper.randName("folderName");
            DS.__testOnly__.createDS({
                "id": id,
                "name": name,
                "parentId": DSObjTerm.homeDirI,
                "isFolder": true,
                "uneditable": true
            });
            DS.goToDir(id);
            var res = DS.newFolder();
            expect(res).to.be.null;
            assert.isTrue($("#alertModal").is(":visible"));
            $("#alertModal .cancel").click();
            assert.isFalse($("#alertModal").is(":visible"));

            DS.goToDir(DSObjTerm.homeDirId);
            DS.__testOnly__.removeDS(DS.getGrid(id));
        });

        it("Should get testFolder from id", function() {
            var dsId = testFolder.getId();
            expect(DS.getDSObj(dsId)).to.equal(testFolder);
            var $grid = DS.getGrid(dsId);
            expect($grid).not.to.be.empty;
        });

        it("Should rename the folder", function() {
            var newName = xcHelper.uniqueRandName("testFolder", DS.has, 10);
            var isRenamed = DS.rename(testFolder.getId(), newName);
            expect(isRenamed).to.be.true;
            expect(testFolder.getName()).to.equal(newName);
        });

        it("Should not renmae to old name", function() {
            var oldName = testFolder.getName();
            var isRenamed = DS.rename(testFolder.getId(), oldName);
            expect(isRenamed).to.be.false;
            expect(testFolder.getName()).to.equal(oldName);
        });

        it("Should not rename folder to invalid name", function() {
            var oldName = testFolder.getName();
            var newName = xcHelper.uniqueRandName("test*folder", DS.has, 10);
            var isRenamed = DS.rename(testFolder.getId(), newName);
            expect(isRenamed).to.be.false;
            expect(testFolder.getName()).to.equal(oldName);

            assert.isTrue($statusBox.is(":visible"), "see statux box");
            $("#statusBoxClose").mousedown();
            assert.isFalse($statusBox.is(":visible"), "no statux box");
        });

        it("Should go to and out of folder", function() {
            var dsId = testFolder.getId();
            var $grid = DS.getGrid(dsId);
            assert.isFalse($grid.hasClass("xc-hidden"), "see folder");

            // error case
            DS.goToDir(null);
            assert.isFalse($grid.hasClass("xc-hidden"), "see folder");

            DS.goToDir(dsId);
            assert.isTrue($grid.hasClass("xc-hidden"), "cannot see folder");

            DS.upDir();
            assert.isFalse($grid.hasClass("xc-hidden"), "see folder");
        });

        it("canCreateFolder() should work for this folder", function() {
            var dsId = testFolder.getId();
            // manually make it uneditable
            testFolder.uneditable = true;
            expect(DS.__testOnly__.canCreateFolder(dsId)).to.be.false;
            assert.isTrue($("#alertModal").is(":visible"), "see alert");
            $("#alertModal .close").click();
            assert.isFalse($("#alertModal").is(":visible"), "close alert");

            // make it editable
            testFolder.uneditable = false;
            expect(DS.__testOnly__.canCreateFolder(dsId)).to.be.true;
        });
    });

    describe("New Dataset Test", function() {
        it("Should point to ds", function(done) {
            var name = xcHelper.uniqueRandName("testSuites-dsObj-sp500", DS.has, 10);
            var dataset = testDatasets.sp500;
            var pointArgs = $.extend({}, dataset, {"name": name});
            DS.point(pointArgs)
            .then(function(dsObj) {
                testDS = dsObj;

                expect(testDS).to.be.instanceof(DSObj);
                expect(testDS).to.have.property("id");
                expect(testDS).to.have.property("name").to.equal(name);
                expect(testDS).to.have.property("format").to.equal(dataset.format);
                expect(testDS).to.have.property("path").to.equal(dataset.path);
                expect(testDS).to.have.property("size");
                expect(testDS).to.have.property("numEntries");
                expect(testDS).to.have.property("parentId");
                expect(testDS).not.to.have.property("eles");
                expect(testDS).to.have.property("totalChildren").to.equal(1);
                expect(testDS).to.have.property("isFolder").to.false;

                setTimeout(function() {
                    // wait for sample table to load
                    done();
                }, 2000);
            })
            .fail(function() {
                throw "Fail Case!";
            });
        });

        it("Should get testDS from name/id", function() {
            var dsId = testDS.getId();
            var dsName = testDS.getName();

            expect(DS.getGridByName(dsName)).not.to.be.empty;
            expect(DS.getDSObj(dsId)).to.equal(testDS);
            var $grid = DS.getGrid(dsId);
            expect($grid).not.to.be.empty;
            expect(DS.has(dsName)).to.be.true;
        });

        it("Should Focus on ds", function(done) {
            var $grid = DS.getGrid(testDS.getId());
            DS.focusOn($grid)
            .then(function() {
                assert.isTrue($grid.hasClass("active"), "focus on ds");
                done();
            })
            .fail(function() {
                throw "Fail Case!";
            });
        });

        it("Should not multi focs on fetching grid", function(done) {
            var $grid = DS.getGrid(testDS.getId());
            expect($grid.hasClass("active")).to.be.true;
            expect($grid.hasClass("fetching")).to.be.false;

            $grid.addClass("fetching");
            DS.focusOn($grid)
            .then(function() {
                // if code trigger DSTable.show, should remove the fetching
                // class later
                expect($grid.hasClass("fetching")).to.be.true;
                done();
            })
            .fail(function() {
                throw "Fail Case!";
            })
            .always(function() {
                $grid.removeClass("fetching");
            });
        });
    });

    describe("Grid Menu Test", function() {
        var $wrap;
        var $gridMenu;
        var $ds;
        var $folder;

        before(function() {
            $wrap = $("#dsListSection .gridViewWrapper");
            $gridMenu = $("#gridViewMenu");
            $ds = DS.getGrid(testDS.getId());
            $folder = DS.getGrid(testFolder.getId());
        });

        afterEach(function() {
            $gridMenu.hide();
        });

        it("Should open menu on background", function() {
            var e = jQuery.Event("contextmenu", {
                "target": $("#dsListSection").get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("bgOpts")).to.be.true;
        });

        it("Should open menu on folder", function() {
            var e = jQuery.Event("contextmenu", {
                "target": $folder.get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("bgOpts")).to.be.false;
            expect($gridMenu.hasClass("folderOpts")).to.be.true;
        });

        it("Should open menu on ds", function() {
            var e = jQuery.Event("contextmenu", {
                "target": $ds.get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("bgOpts")).to.be.false;
            expect($gridMenu.hasClass("dsOpts")).to.be.true;
        });

        it("Should open menu with the right class", function() {
            $ds.addClass("unlistable").addClass("noAction");
            var e = jQuery.Event("contextmenu", {
                "target": $ds.get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("unlistable")).to.be.true;
            expect($gridMenu.hasClass("noAction")).to.be.true;
            $ds.removeClass("unlistable").removeClass("noAction");
        });

        it("Should click .newFolder to create new folder", function() {
            var oldFunc = DS.newFolder;
            var test = false;
            DS.newFolder = function() {
                test = true;
            };

            var $li = $gridMenu.find(".newFolder");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.newFolder = oldFunc;
        });

        it("Should click .back to up folder", function() {
            var oldFunc = DS.upDir;
            var test = false;
            DS.upDir = function() {
                test = true;
            };

            var $li = $gridMenu.find(".back");
            var isDisabled = $li.hasClass("disabled");
            $li.removeClass("disabled");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.upDir = oldFunc;

            if (isDisabled) {
                $li.addClass("disabled");
            }
        });

        it("Should click .refresh to refresh ds/folder", function() {
            var oldFunc = DS.restore;
            var test = false;
            DS.restore = function() {
                test = true;
                // reject to not trigger KVStore.commit
                return PromiseHelper.reject();
            };

            var $li = $gridMenu.find(".refresh");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.restore = oldFunc;
        });

        it("Should click .open to open folder/ds", function() {
            var oldFunc =DS.goToDir;
            var test = false;
            DS.goToDir = function() {
                test = true;
            };

            var $li = $gridMenu.find(".open");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.goToDir = oldFunc;
        });

        it("Should click .moveUp to drop grid to parent", function() {
            var oldFunc = DS.dropToParent;
            var test = false;
            DS.dropToParent = function() {
                test = true;
            };

            var $li = $gridMenu.find(".moveUp");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.dropToParent = oldFunc;
        });

        it("Should click .rename to rename foler", function() {
            var e = jQuery.Event("contextmenu", {
                "target": $folder.get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("folderOpts")).to.be.true;

            var $li = $gridMenu.find(".rename");
            // simple mouse up not work
            $li.mouseup();
            expect($folder.find("textarea").length).to.equal(0);
            $li.trigger(fakeEvent.mouseup);
            expect($folder.find("textarea").length).to.equal(1);

            $folder.find("textarea").blur();
            expect($folder.find("textarea").length).to.equal(0);
        });

        it("Should click .preview to preview ds", function() {
            var oldFunc = DS.dropToParent;
            var test = false;
            DS.focusOn = function() {
                test = true;
            };

            var e = jQuery.Event("contextmenu", {
                "target": $ds.get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("dsOpts")).to.be.true;

            var $li = $gridMenu.find(".preview");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.focusOn = oldFunc;
        });

        it("Should click .delete to delte folder/ds", function() {
            var oldFunc = DS.remove;
            var test = false;
            DS.remove = function() {
                test = true;
            };

            var $li = $gridMenu.find(".delete");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.remove = oldFunc;
        });
    });

    describe("Drag and Drop test", function() {
        var $ds;
        var $folder;

        before(function() {
            $ds = DS.getGrid(testDS.getId());
            $folder = DS.getGrid(testFolder.getId());
        });

        it("Baisc Drag getter and setter should work", function() {
            // initially has no drag ds
            expect(DS.__testOnly__.getDragDS()).to.not.exist;

            DS.__testOnly__.setDragDS($ds);
            expect(DS.__testOnly__.getDragDS().get(0)).to.equal($ds.get(0));

            DS.__testOnly__.resetDragDS();
            expect(DS.__testOnly__.getDragDS()).to.be.undefined;
        });

        it("Baisc Drop getter and setter should work", function() {
            // initially has no drop ds
            expect(DS.__testOnly__.getDropTarget()).to.not.exist;

            DS.__testOnly__.setDropTraget($folder);
            expect(DS.__testOnly__.getDropTarget().get(0)).to.equal($folder.get(0));

            DS.__testOnly__.resetDropTarget();
            expect(DS.__testOnly__.getDropTarget()).to.be.undefined;
        });

        it("Should insert ds", function() {
            DS.insert($ds, $folder, true);
            // ds now is on the left of folder
            expect($folder.prev().get(0)).to.equal($ds.get(0));

            DS.insert($ds, $folder, false);
            // ds now is on the right of folder
            expect($folder.next().get(0)).to.equal($ds.get(0));
        });

        it("Should drop to folder", function() {
            DS.dropToFolder($ds, $folder);
            expect($ds.data("dsParentId")).to.equal($folder.data("dsid"));

            DS.dropToParent($ds);
            expect($ds.data("dsParentId")).not.to.equal($folder.data("dsid"));
        });

        it("DS.onDragStart should work", function() {
            // fake event
            var target = $ds.get(0);
            var e = jQuery.Event("dragstart", {"target": target});
            e.dataTransfer = {
                "effectAllowed": "",
                "setData": function() {}
            };
            DS.onDragStart(e);
            expect(DS.__testOnly__.getDragDS().get(0)).to.equal(target);
            expect($ds.find("> .dragWrap").hasClass("xc-hidden")).to.be.true;
            expect($gridView.hasClass("drag")).to.be.true;
        });

        it("Should allow drop", function() {
            var e = jQuery.Event("dragenter");
            expect(e.isDefaultPrevented()).to.be.false;
            DS.allowDrop(e);
            expect(e.isDefaultPrevented()).to.be.true;
        });

        it("Should drag enter a folder", function() {
            var $dragWrap = $folder.find(".leftTopDragWrap");
            var target = $dragWrap.get(0);
            var e = jQuery.Event("dragenter", {"target": target});
            DS.onDragEnter(e);
            expect(e.isDefaultPrevented()).to.be.true;
            expect($dragWrap.hasClass("active")).to.be.true;
            expect(DS.__testOnly__.getDropTarget().get(0)).to.equal(target);
        });

        it("Should drag enter middle wrap of folder", function() {
            var $dragWrap = $folder.find(".midDragWrap");
            var target = $dragWrap.get(0);
            var e = jQuery.Event("dragenter", {"target": target});

            DS.onDragEnter(e);
            expect($folder.find(".leftTopDragWrap").hasClass("active"))
            .to.be.false;
            expect($folder.hasClass("entering")).to.be.true;
            expect(DS.__testOnly__.getDropTarget().get(0)).to.equal(target);
        });

        it("Should on drop to the folder", function() {
            var e = jQuery.Event("drop");
            DS.onDrop(e);
            expect($ds.data("dsParentId")).to.equal($folder.data("dsid"));

            DS.dropToParent($ds);
            expect($ds.data("dsParentId")).not.to.equal($folder.data("dsid"));
        });

        it("should end the drop event", function() {
            // fake event
            var target = $ds.get(0);
            var e = jQuery.Event("dragstart", {"target": target});
            DS.onDragEnd(e);
            expect(DS.__testOnly__.getDragDS()).not.to.exist;
            expect($ds.find("> .dragWrap").hasClass("xc-hidden")).to.be.false;
            expect($gridView.hasClass("drag")).to.be.false;
        });
    });

    describe("Restore Test", function() {
        it("Should restore folder", function(done) {
            var oldHomeFolder = DS.getHomeDir();
            DS.clear();

            var curHomeFolder = DS.getHomeDir();
            expect(curHomeFolder.totalChildren).to.equal(0);

            DS.restore(oldHomeFolder, false)
            .then(function() {
                curHomeFolder = DS.getHomeDir();
                // at least has the test folder and test ds
                expect(curHomeFolder.totalChildren).to.be.at.least(1);
                expect(DS.has(testDS.getName())).to.be.true;
                done();
            })
            .fail(function() {
                throw "Fail Case!";
            });
        });
    });

    describe("Delete DS Test", function() {
        var $ds;
        var $folder;
        var $alertModal;

        before(function() {
            $ds = DS.getGrid(testDS.getId());
            $folder = DS.getGrid(testFolder.getId());
            $alertModal = $("#alertModal");
        });

        it("Should not delete folder with ds", function() {
            DS.dropToFolder($ds, $folder);
            expect($ds.data("dsParentId")).to.equal($folder.data("dsid"));

            DS.remove($folder);
            // see alert
            assert.isTrue($alertModal.is(":visible"), "see alert");
            $alertModal.find(".close").click();
            assert.isFalse($alertModal.is(":visible"), "no see alert");

            // folder is still there
            expect(DS.getGrid(testFolder.getId())).not.to.be.empty;
        });

        it("Should delete empty folder", function() {
            var dsId = testFolder.getId();
            // drop back to parent
            DS.dropToParent($ds);
            expect($ds.data("dsParentId")).not.to.equal($folder.data("dsid"));

            DS.remove($folder);
            // not alert
            assert.isFalse($alertModal.is(":visible"), "no alert");
            // folder is deleted
            expect(DS.getGrid(dsId)).have.length(0);
            expect(DS.getDSObj(dsId)).not.to.exist;
        });

        it("Should delete ds", function(done) {
            var dsId = testDS.getId();
            DS.__testOnly__.delDSHelper($ds, testDS)
            .then(function() {
                // ds is deleted
                expect(DS.getGrid(dsId)).have.length(0);
                expect(DS.getDSObj(dsId)).not.to.exist;
                done();
            })
            .fail(function() {
                throw "Fail Case!";
            });
        });
    });

    after(function() {
        $(".tooltip").hide(); // toggle list view test may have tooltip
        $mainTabCache.click();
        UnitTest.offMinMode();
    });
});