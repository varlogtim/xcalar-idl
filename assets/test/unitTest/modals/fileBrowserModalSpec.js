describe('FilebrowserModal', function() {
    var minModeCache;
    var $testGrid;
    var $fileBrowser;
    var $pathLists;
    var $fileName;
    var testFiles;

    before(function(){
        // turn off min mode, as it affectes DOM test
        minModeCache = gMinModeOn;
        gMinModeOn = true;

        var testHtml = '<div>' +
                            '<div class="label" data-name="test"></div>' +
                        '</div>';
        $testGrid = $(testHtml);
        $fileBrowser = $("#fileBrowserModal");
        $pathLists = $("#fileBrowserPathMenu");
        $fileName = $("#fileBrowserInputName");

        testFiles = [
        {
            "name": "test1.csv",
            "attr": {
                "isDirectory": false,
                "mtime"      : 1434159233,
                "size"       : 1
            }
        },
        {
            "name": "test2.json",
            "attr": {
                "isDirectory": false,
                "mtime"      : 1451005071,
                "size"       : 3
            }
        },
        {
            "name": "test3",
            "attr": {
                "isDirectory": true,
                "mtime"      : 1458167245,
                "size"       : 2
            }
        }
        ];
    });

    describe('Basic function test', function() {
        it('Should get current path', function() {
            $pathLists.prepend('<li id="fileBrowserTestLi">test</li>');
            var res = FileBrowser.__testOnly__.getCurrentPath();
            expect(res).to.equal("test");
            $pathLists.find("li:first-of-type").remove();
        });

        it('Should get short path', function() {
            var testPath = "file:///abc.test";
            var res = FileBrowser.__testOnly__.getShortPath(testPath);
            expect(res).to.equal("abc.test");
        });

        it('Should get grid\'s name', function() {
            var res = FileBrowser.__testOnly__.getGridUnitName($testGrid);
            expect(res).to.equal("test");
        });

        it('Should get format', function() {
            var getFormat = FileBrowser.__testOnly__.getFormat;
            expect(getFormat("a.json")).to.equal("JSON");
            expect(getFormat("b.csv")).to.equal("CSV");
            expect(getFormat("c.xlsx")).to.equal("Excel");
            expect(getFormat("d.test")).to.be.null;
        });

        it('Should get short name', function(done) {
            var getShortName = FileBrowser.__testOnly__.getShortName;
            var testName = xcHelper.randName("testName");
            var oldhas = DS.has;

            // basic
            getShortName(testName)
            .then(function(res) {
                expect(res).to.equal(testName);
                var test2 = testName + ".test";
                return getShortName(testName);
            })
            .then(function(res) {
                // should stripe the dot
                expect(res).to.equal(testName);
            })
            .then(function() {
                DS.has = function(name) {
                    if (name === testName) {
                        return true;
                    } else {
                        return false;
                    }
                }

                return getShortName(testName);
            })
            .then(function(res) {
                expect(res).to.equal(testName + "1");
                DS.has = oldhas;
                done();
            })
            .fail(function() {
                throw "Error case"
            });
        });

        it('Should append path', function() {
            var testPath = "file:///test"
            FileBrowser.__testOnly__.appendPath(testPath);
            var $li = $pathLists.find("li:first-of-type");
            var $pathText = $("#fileBrowserPath .text");
            expect($li.text()).to.equal(testPath);
            expect($pathText.val()).to.equal("test");
            $li.remove();
            $pathText.val("");
        });

        it('Should update file name', function() {
            FileBrowser.__testOnly__.updateFileName($testGrid);
            expect($fileName.val()).to.equal("test");
            $fileName.val("");
        });

        it('Should filter files', function() {
            var regEx = new RegExp(".json$");
            var res = FileBrowser.__testOnly__.filterFiles(testFiles, regEx);
            // have test2.json and folder test3
            expect(res.length).to.equal(2);
            expect(res[0].name).to.equal("test2.json");
        });

        it('Should sort files', function() {
            var sortFiles = FileBrowser.__testOnly__.sortFiles;
            var res;

            // test sort by size
            res = sortFiles(testFiles, "size");
            // folder comes first no matter the size
            expect(res[0].name).to.equal("test3");
            expect(res[1].name).to.equal("test1.csv");
            expect(res[2].name).to.equal("test2.json");

            // test sort by date
            res = sortFiles(testFiles, "date");
            expect(res[0].name).to.equal("test1.csv");
            expect(res[1].name).to.equal("test2.json");
            expect(res[2].name).to.equal("test3");

            // test sort by name
            res = sortFiles(testFiles, "name");
            expect(res[0].name).to.equal("test1.csv");
            expect(res[1].name).to.equal("test2.json");
            expect(res[2].name).to.equal("test3");

            // test sort by type
            res = sortFiles(testFiles, "type");
            expect(res[0].name).to.equal("test3");
            expect(res[1].name).to.equal("test1.csv");
            expect(res[2].name).to.equal("test2.json");
        });

        it('Should change file source', function() {
            var changeFileSource = FileBrowser.__testOnly__.changeFileSource;
            var $defaultPath = $("#fileBrowserPath .defaultPath");
            var prevSource = $defaultPath.text();
            changeFileSource("nfs:///", true);
            expect($defaultPath.text()).to.equal("nfs:///");
            changeFileSource(prevSource, true);
            expect($defaultPath.text()).to.equal(prevSource);
        });
    });

    describe("Public API and behavior test", function() {
        it('Should show the filebrowser', function(done) {
            FileBrowser.show()
            .then(function() {
                var $li = $pathLists.find("li:first-of-type");
                expect($li.text()).to.equal("file:///");
                assert.isTrue($fileBrowser.is(":visible"));
                done();
            })
            .fail(function() {
                throw "Error case!";
            });
        });

        it('Should toggle view', function() {
            var $fileBrowserMain = $("#fileBrowserMain");
            var expect1, expect2;
            if ($fileBrowserMain.hasClass("lisView")) {
                expect1 = "gridView";
                expect2 = "listView";
            } else {
                expect1 = "listView";
                expect2 = "gridView";
            }
            // toggle to another view
            $("#fileBrowserGridView").click();
            assert.isTrue($fileBrowserMain.hasClass(expect1));
            // toggle back
            $("#fileBrowserGridView").click();
            assert.isTrue($fileBrowserMain.hasClass(expect2));
        });

        it('Should go to path', function(done) {
            var path = "file:///netstore/datasets/";
            var $li = $('<li>' + path + '</li>');
            $pathLists.prepend($li);
            FileBrowser.__testOnly__.goToPath($li)
            .then(function() {
                assert.isTrue($li.hasClass("select"));
                done();
            })
            .fail(function() {
                throw "Error Case!";
            });
        });

        it('Should focus on grid', function() {
            FileBrowser.__testOnly__.focusOn(null);
            expect($fileName.val()).to.equal("");
            FileBrowser.__testOnly__.focusOn("sp500.csv", true);
            var $grid = $("#fileBrowserContainer .grid-unit.active");
            expect($grid.length).to.equal(1);
            expect($grid.find(".label").data("name")).to.equal("sp500.csv");
            expect($fileName.val()).to.equal("sp500.csv");
        });

        it('Should get the focused grid', function() {
            var grid = FileBrowser.__testOnly__.getFocusGrid();
            expect(grid).to.be.an('object');
            expect(grid).to.have.property("name").to.equal("sp500.csv");
            expect(grid).to.have.property("type").to.equal("ds");
        });

        it('Should import dataset', function() {
            $fileBrowser.find(".confirm").click();
            expect($("#filePath").val()).to.equal("file:///netstore/datasets/sp500.csv");
            assert.isFalse($fileBrowser.is(":visible"));
        });
    });

    after(function() {
        // reset data form
        $("#importDataReset").click();
        gMinModeOn = minModeCache;
    });
});