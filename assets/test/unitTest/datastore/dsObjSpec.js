function dsObjTest() {
    var $gridView;
    var $statusBox;

    var testFolder;
    var testDS;
    var user;

    before(function(){
        $gridView = $("#exploreView").find(".gridItems");
        $statusBox = $("#statusBox");
        user = Support.getUser();
    });

    describe("Grid View Test", function() {
        it("Should toggle listView/gridView", function() {
            var isListView = true;
            DS.__testOnly__.toggleDSView(isListView);
            assert.isTrue($gridView.hasClass("listView"), "In list view");

            isListView = false;
            DS.__testOnly__.toggleDSView(isListView);
            assert.isTrue($gridView.hasClass("gridView"), "In grid view");
        });
    });

    describe("Home Folder Test",  function() {
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
            expect(DS.getGrid(".")).not.to.be.empty;
        });

        it("DS.has should work", function() {
            var testName = xcHelper.uniqueRandName("testSuites-dsObj", DS.has, 10);
            expect(DS.has(testName)).to.be.false;
            expect(DS.has(null)).to.be.false;
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
            assert.isFalse($grid.hasClass("hidden"), "see folder");

            DS.goToDir(dsId);
            assert.isTrue($grid.hasClass("hidden"), "cannot see folder");

            DS.upDir();
            assert.isFalse($grid.hasClass("hidden"), "see folder");
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
        it("Should load ds", function(done) {
            var name = xcHelper.uniqueRandName("testSuites-dsObj-sp500", DS.has, 10);
            var dataset = testDatasets.sp500;

            DS.load(name, dataset.format, dataset.url,
                    dataset.fieldDelim, dataset.lineDelim,
                    dataset.hasHeader, dataset.moduleName, dataset.funcName)
            .then(function(dsObj) {
                testDS = dsObj;

                expect(testDS).to.be.instanceof(DSObj);
                expect(testDS).to.have.property("id");
                expect(testDS).to.have.property("name").to.equal(name);
                expect(testDS).to.have.property("format").to.equal(dataset.format);
                expect(testDS).to.have.property("path").to.equal(dataset.url);
                expect(testDS).to.have.property("fileSize");
                expect(testDS).to.have.property("numEntries");
                expect(testDS).to.have.property("parentId");
                expect(testDS).not.to.have.property("eles");
                expect(testDS).to.have.property("totalChildren").to.equal(1);
                expect(testDS).to.have.property("isFolder").to.false;

                setTimeout(function() {
                    // wait for sample table to load
                    done();
                }, 2000)
            })
            .fail(function(error) {
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
            .then(function(isLoading) {
                assert.isTrue($grid.hasClass("active"), "focus on ds");
                done();
            })
            .fail(function(error) {
                throw "Fail Case!";
            });
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
            var isBefore = true;
            DS.insert($ds, $folder, true);
            // ds now is on the left of folder
            expect($folder.prev().get(0)).to.equal($ds.get(0));

            var isBefore = false;
            DS.insert($ds, $folder, false);
            // ds now is on the right of folder
            expect($folder.next().get(0)).to.equal($ds.get(0));
        });

        it("Should drop to folder", function() {
            DS.dropToFolder($ds, $folder);
            expect($ds.parent().get(0)).to.equal($folder.get(0));

            DS.dropToParent($ds);
            expect($ds.parent().get(0)).not.to.equal($folder.get(0));
        });
    });

    describe("Restore Test", function() {
        it("Should restore folder", function(done) {
            var oldHomeFolder = DS.getHomeDir();
            DS.clear();

            var curHomeFolder = DS.getHomeDir();
            expect(curHomeFolder.totalChildren).to.equal(0);

            DS.initialize(oldHomeFolder, false)
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
            expect($ds.parent().get(0)).to.equal($folder.get(0));

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
            expect($ds.parent().get(0)).not.to.equal($folder.get(0));

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
            .fail(function(error) {
                throw "Fail Case!";
            });
        });
    });

    after(function() {
        $(".tooltip").hide(); // toggle list view test may have tooltip
    });
}