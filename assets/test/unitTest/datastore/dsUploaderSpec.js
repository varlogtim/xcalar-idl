describe("DSUploader Test", function() {
	var $mainTabCache;
	var cachedXcalarListFiles;
	var uploads;
	var $uploaderMain;

    before(function() {
    	Alert.forceClose();
        // go to the data store tab,
        // or some UI effect like :visible cannot test
        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        // turn off min mode, as it affectes DOM test
        UnitTest.onMinMode();

        // test for file name duplicates, must use refreshFiles to set up 
			// the file list that DSUploader checks against
			
		cachedXcalarListFiles = XcalarListFiles;
		XcalarListFiles = function() {
			var file = {
				name: "unitTest",
				attr:{size: 20, mtime: Date.now()}
			};
			return PromiseHelper.resolve({files: [file]});
		};
		uploads = DSUploader.__testOnly__.uploads;
		$uploaderMain = $("#dsUploaderMain");
    });

	describe("initial state", function() {
		it('check initial state', function() {
			expect($("#dsUploader").is(":visible")).to.be.true;
		});
	});

	describe("drag and drop", function() {
		it('drag enter should work', function() {
			expect($("#dsUploaderDropArea").hasClass('entering')).to.be.false;

			var e = jQuery.Event("dragenter", {originalEvent: {dataTransfer: {}}});
			$uploaderMain.trigger(e);
			expect($("#dsUploaderDropArea").hasClass('entering')).to.be.false;

			var e = jQuery.Event("dragenter", {originalEvent: {dataTransfer: {types:['Files']}}});
			$uploaderMain.trigger(e);
			expect($("#dsUploaderDropArea").hasClass('entering')).to.be.true;
		});

		it('dragover should work', function() {
			var e = jQuery.Event("dragover", {originalEvent: {dataTransfer: {}}});
			expect(e.originalEvent.dataTransfer.effectAllowed).to.be.undefined;
			expect(e.originalEvent.dataTransfer.dropEffect).to.be.undefined;
			$uploaderMain.trigger(e);
			expect(e.originalEvent.dataTransfer.effectAllowed).to.equal("copy");
			expect(e.originalEvent.dataTransfer.dropEffect).to.equal("copy");
		});

		it('dragleave should work', function() {
			expect($("#dsUploaderDropArea").hasClass('entering')).to.be.true;

			var e = jQuery.Event("dragleave", {originalEvent: {dataTransfer: {}}});
			$uploaderMain.trigger(e);
			expect($("#dsUploaderDropArea").hasClass('entering')).to.be.true;

			var e = jQuery.Event("dragleave", {originalEvent: {dataTransfer: {types:['Files']}}});
			$uploaderMain.trigger(e);
			expect($("#dsUploaderDropArea").hasClass('entering')).to.be.false;
		});

		it('drop should work', function() {
			$("#dsUploaderDropArea").addClass('entering');
			expect($("#dsUploaderDropArea").hasClass('entering')).to.be.true;

			var e = jQuery.Event("drop", {originalEvent: {dataTransfer: {files:["a", "b"]}}});
			$uploaderMain.trigger(e);
			expect($("#dsUploaderDropArea").hasClass('entering')).to.be.false;

			UnitTest.hasAlertWithText(DSTStr.OneFileUpload, {confirm: true});
		});
	});

	describe('submitting upload', function() {
		it('submitFiles with errors should show alerts', function(done) {
			var submit = DSUploader.__testOnly__.submitFiles;

			// too many files
			submit(["too", "many", "files"], {});
			UnitTest.hasAlertWithText(DSTStr.OneFileUpload, {confirm: true});

			// file size too large
			submit([{size: 3 * GB}], {});
			UnitTest.hasAlertWithTitle(CommonTxtTstr.InvalidSize, {confirm: true});

			DSUploader.refreshFiles()
			.then(function() {
				submit([{size: 1 * GB, name: "unitTest"}]);
				UnitTest.hasAlertWithTitle(DSTStr.DupFileName);
				done();
			});
		});

		// test with invalid folder type
		it('submitFiles on 2nd name attempt should work', function() {
			var submit = DSUploader.__testOnly__.submitFiles;
			var item = {webkitGetAsEntry: function() {
				return {isDirectory: true};
			}};
			var e = {dataTransfer: {items: [item]}};
			submit([{name: "unitTest", size: 1 * GB}], e);// name exists
			UnitTest.hasAlertWithTitle(DSTStr.DupFileName, {confirm: true,
										inputVal: "unitTestUnique", nextAlert: true});
			UnitTest.hasAlertWithText(DSTStr.InvalidFolderDesc);
		});

		// test with empty name on 2nd alert
		it('submitFiles on 2nd invalid name attempt should show alert', function() {
			var submit = DSUploader.__testOnly__.submitFiles;
			var item = {webkitGetAsEntry: function() {
				return {isDirectory: true};
			}};
			var e = {dataTransfer: {items: [item]}};
			submit([{name: "unitTest", size: 1 * GB}], e);// name exists
			UnitTest.hasAlertWithTitle(DSTStr.DupFileName, {confirm: true,
										inputVal: "", nextAlert: true});
			UnitTest.hasAlertWithTitle(DSTStr.InvalidFileName);
		});

		// test with invalid folder type
		it('submitFile should call loadFile', function() {
			var submit = DSUploader.__testOnly__.submitFiles;
			var item = {webkitGetAsEntry: function() {
				return {isDirectory: true};
			}};
			var e = {dataTransfer: {items: [item]}};
			submit([{name: "unitTest2", size: 1 * GB}], e);
			UnitTest.hasAlertWithText(DSTStr.InvalidFolderDesc);
		});

		// will purposely fail demoFileCreate to prevent actual upload
		it('loadFile should trigger demo file create', function(done) {
			var cachedDemoFileCreate = XcalarDemoFileCreate;
			var createTriggered = false;
			XcalarDemoFileCreate = function() {
				var deferred = jQuery.Deferred();
				createTriggered  = true;
				setTimeout(function(){
					deferred.reject({error: "already exists"});
				}, 1);
				return deferred.promise();
			};

			var numFiles = $('#innerdsUploader').find('.grid-unit').length;
			expect($("#innerdsUploader").find(".grid-unit").last().find('.fileName').text()).to.not.equal("unitTest2");

			DSUploader.__testOnly__.loadFile({name: "unitTest2", size: 1 * GB,
												lastModified: Date.now()},
												"unitTest2");
			expect($("#innerdsUploader").find(".grid-unit").length).to.equal(numFiles + 1);
			var gridText = $("#innerdsUploader").find(".grid-unit").last().find('.fileName').text();
			expect(gridText).to.equal("unitTest2 (Uploading)");

			// wait for async xcalardemofilecreate call
			setTimeout(function() {
				expect(createTriggered).to.be.true;
				UnitTest.hasAlertWithTitle(DSTStr.DupFileName);
				XcalarDemoFileCreate = cachedDemoFileCreate;
				done();
			}, 10);
		});

		it('uploadFile should work', function(done) {
			var DSFileUploadCache = DSFileUpload;
			var uploadInfo = {};
			DSFileUpload = function(name, size, obj, opts) {
				expect(name).to.equal("unitTest2");
				expect(size).to.equal(4);
				expect(obj.name).to.equal("unitTest2");
				expect(obj.sizeCompleted).to.equal(0);

				this.add = function(content, size) {
					expect(content).to.equal("abcd");
					expect(size).to.equal(4);
					
				};
				this.workerDone = function() {
					DSFileUpload = DSFileUploadCache;
					done();
				};
				this.getStatus = function() {
					return null;
				};
			};
			var fileObj = {name: "unitTest2",
                           attr: {size: GB, mtime: Date.now()},
                           status: "inProgress",
                           sizeCompleted: 0
                          };
            var file = new File(["abcd"], "unitTest2");

            expect(uploads).to.not.have.property('unitTest2');
			DSUploader.__testOnly__.uploadFile(fileObj, file);
			expect(uploads).to.have.property('unitTest2');
			delete uploads["unitTest2"];
		});

		// no good way to test this
		it('browse button should work', function() {
			var $browserBtn = $("#dsUploadSubmit");
			$browserBtn.attr("type", "button"); // can't manipulate if type file
			expect($browserBtn.is(":visible")).to.be.false;
			$browserBtn.val("fakeFile");

			expect($browserBtn.val()).to.equal("fakeFile");
			$("#dsUploadBrowse").click();
			expect($browserBtn.val()).to.equal("");
			
			$browserBtn.attr("type", "file");
		})

		// doesn't do a real upload
		it("cancelUpload should work", function(done) {
			var cachedKVPut = KVStore.put;
			var uploadObjCancelTriggered = false;
			var commitTriggered = false;
			KVStore.put = function(key, value, pers) {
				expect(key).to.equal("gPUploads");
				expect(value).to.equal("[]");
				expect(pers).to.be.true;
				commitTriggered = true;
				KVStore.put = cachedKVPut;
				done();
				return PromiseHelper.resolve();
			};

			var fileInfo = {
				name: "unitTest2",
				attr: {size: GB, mTime: 0},
				sizeCompleted: 0,
				status: "inProgress"
			};

			var html = DSUploader.__testOnly__.getOneFileHtml(fileInfo);
			$grid = $(html);
			$("#innerdsUploader").append($grid);
			var numGrids = $("#innerdsUploader").find(".grid-unit").length;
			expect(uploads).to.not.have.property("unitTest2");
			uploads["unitTest2"] = {
				cancel: function() {
					uploadObjCancelTriggered = true;
				}
			};
			expect(uploads).to.have.property("unitTest2");

			// trigger the cancel
			DSUploader.__testOnly__.cancelUpload($grid);
			UnitTest.hasAlertWithTitle(DSTStr.CancelUpload, {confirm: true});

			expect(uploads).to.not.have.property("unitTest2");
			expect(uploadObjCancelTriggered).to.be.true;
			expect(commitTriggered).to.be.true;
			expect($("#innerdsUploader").find(".grid-unit").length).to.equal(numGrids - 1);
		});

		it("uploadComplete should work", function(done) {
			var cachedKVPut = KVStore.put;
			var commitTriggered = false;
			KVStore.put = function(key, value, pers) {
				expect(key).to.equal("gPUploads");
				expect(value).to.equal("[]");
				expect(pers).to.be.true;
				commitTriggered = true;
				KVStore.put = cachedKVPut;
				done();
				return PromiseHelper.resolve();
			};

			var name = "unitTest2";
			var fileObj = {
				name: name,
				attr: {size: 5, mTime: 0},
				sizeCompleted: 0,
				status: "inProgress"
			};

			var html = DSUploader.__testOnly__.getOneFileHtml(fileObj);
			$("#innerdsUploader").append(html);
			var $grid = $("#innerdsUploader").find(".grid-unit").last();
			expect($grid.hasClass("inProgress")).to.be.true;
			uploads[name] = {};
			expect(uploads).to.have.property(name);

			// trigger complete
			DSUploader.__testOnly__.uploadComplete(fileObj, name);
			expect($grid.hasClass("inProgress")).to.be.false;
			expect($grid.find(".fileSize").text()).to.equal("5B");
			expect(fileObj.status).to.equal("done");
			expect(uploads).to.not.have.property(name);
			$grid.remove();
		});

		it("updateProgress should work", function() {
			var name = "unitTest2";
			var fileObj = {
				name: name,
				attr: {size: 5, mTime: 0},
				sizeCompleted: 0,
				status: "inProgress"
			};
			var file = {size: 2};
			var html = DSUploader.__testOnly__.getOneFileHtml(fileObj);
			$("#innerdsUploader").append(html);
			var $grid = $("#innerdsUploader").find(".grid-unit").last();

			DSUploader.__testOnly__.updateProgress(fileObj, file, name, 1);
			expect($grid.find(".fileName").text()).to.equal(name + " (Uploading)");
			expect($grid.find(".fileSize").text()).to.equal("1B/2B (50%)");
			expect(fileObj.sizeCompleted).to.equal(1);
			$grid.remove();
		});

		it("on error should work", function() {
			var cancelTriggered = false;
			var name = "errorTest";
			var fileObj = {
				name: name,
				attr: {size: 5, mTime: 0},
				sizeCompleted: 0,
				status: "inProgress"
			};
			var file = {size: 2};
			var html = DSUploader.__testOnly__.getOneFileHtml(fileObj);
			var $grid = $(html);
			$("#innerdsUploader").append($grid);
			var numGrids = $uploaderMain.find(".grid-unit").length;

			uploads[name] = {};
			expect(uploads).to.have.property(name);

			DSUploader.__testOnly__.onError(fileObj, name);
			expect(uploads).to.not.have.property(name);

			expect($uploaderMain.find(".grid-unit").length).to.equal(numGrids);
			expect($grid.hasClass("isError")).to.be.true;
			expect($grid.hasClass("inProgress")).to.be.false;
			$grid.remove();
		});

		it("getOneFileHtml on errored files should work", function() {
			var name = "errorTest";
			var fileObj = {
				name: name,
				attr: {size: 5, mTime: 0},
				sizeCompleted: 1,
				status: "errored"
			};
		
			var html = DSUploader.__testOnly__.getOneFileHtml(fileObj);
			var $grid = $(html);
			expect($grid.hasClass("isError")).to.be.true;
			expect($grid.find(".fileName").text()).to.equal(name + " (Error)");
			expect($grid.find(".fileSize").text()).to.equal("1B/5B (20%)");
		});
	});

	describe("sorting files", function() {

		before(function(done) {
			XcalarListFiles = function() {
				var date = 2000000000;
				var files = [
					{
						name: "def",
						attr:{size: 1, mtime: date - 1000}
					},
					{
						name: "abc",
						attr:{size: 2, mtime:date}
					},
					{
						name: "ghi",
						attr:{size: 3, mtime: date + 1000}
					}
				];
				return PromiseHelper.resolve({files: files});
			};

			DSUploader.refreshFiles()
			.then(function() {
				done();
			});
		});

		it("should be sorted alphabetically", function() {
			var $grids = $uploaderMain.find(".grid-unit");
			expect($grids.eq(0).find(".fileName").text()).to.equal("abc");
			expect($grids.eq(1).find(".fileName").text()).to.equal("def");
			expect($grids.eq(2).find(".fileName").text()).to.equal("ghi");

			expect($uploaderMain.find(".title.fileName").hasClass("select")).to.be.false;
			$uploaderMain.find(".title.fileName .label").click();
			expect($uploaderMain.find(".title.fileName").hasClass("select")).to.be.true;


			$uploaderMain.find(".title.fileName .label").click();
			$grids = $uploaderMain.find(".grid-unit");
			expect($grids.eq(0).find(".fileName").text()).to.equal("ghi");
			expect($grids.eq(1).find(".fileName").text()).to.equal("def");
			expect($grids.eq(2).find(".fileName").text()).to.equal("abc");

			$uploaderMain.find(".title.fileName .label").click();
			$grids = $uploaderMain.find(".grid-unit");
			expect($grids.eq(0).find(".fileName").text()).to.equal("abc");
			expect($grids.eq(1).find(".fileName").text()).to.equal("def");
			expect($grids.eq(2).find(".fileName").text()).to.equal("ghi");
		});
		
		it("should be sorted by size", function(){
			var $grids = $uploaderMain.find(".grid-unit");
			expect($grids.eq(0).find(".fileSize").text()).to.equal("2B");
			expect($grids.eq(1).find(".fileSize").text()).to.equal("1B");
			expect($grids.eq(2).find(".fileSize").text()).to.equal("3B");

			$uploaderMain.find(".title.fileSize .label").click();
			$grids = $uploaderMain.find(".grid-unit");
			expect($grids.eq(0).find(".fileSize").text()).to.equal("1B");
			expect($grids.eq(1).find(".fileSize").text()).to.equal("2B");
			expect($grids.eq(2).find(".fileSize").text()).to.equal("3B");

			$uploaderMain.find(".title.fileSize .label").click();
			$grids = $uploaderMain.find(".grid-unit");
			expect($grids.eq(0).find(".fileSize").text()).to.equal("3B");
			expect($grids.eq(1).find(".fileSize").text()).to.equal("2B");
			expect($grids.eq(2).find(".fileSize").text()).to.equal("1B");
		});

		it("should be sorted by date", function() {
			var $grids = $uploaderMain.find(".grid-unit");
			expect($grids.eq(0).find(".fileDate").text()).to.equal("8:50 PM 5-17-2033");
			expect($grids.eq(1).find(".fileDate").text()).to.equal("8:33 PM 5-17-2033");
			expect($grids.eq(2).find(".fileDate").text()).to.equal("8:16 PM 5-17-2033");

			$uploaderMain.find(".title.fileDate .label").click();
			$grids = $uploaderMain.find(".grid-unit");
			expect($grids.eq(0).find(".fileDate").text()).to.equal("8:16 PM 5-17-2033");
			expect($grids.eq(1).find(".fileDate").text()).to.equal("8:33 PM 5-17-2033");
			expect($grids.eq(2).find(".fileDate").text()).to.equal("8:50 PM 5-17-2033");

			$uploaderMain.find(".title.fileDate .label").click();
			$grids = $uploaderMain.find(".grid-unit");
			expect($grids.eq(0).find(".fileDate").text()).to.equal("8:50 PM 5-17-2033");
			expect($grids.eq(1).find(".fileDate").text()).to.equal("8:33 PM 5-17-2033");
			expect($grids.eq(2).find(".fileDate").text()).to.equal("8:16 PM 5-17-2033");
		});
	});

	describe("submitForm to go to file preview", function() {
		it("submitForm should work", function() {
			var cachedDSPreviewShow = DSPreview.show;
			var showCalled = false;
			DSPreview.show = function(options, fromFormCard) {
				expect(options.path).to.equal("demo:///ghi");
				expect(fromFormCard).to.be.true;
				showCalled = true;
			};

			var $grid = $uploaderMain.find(".grid-unit").eq(0);
			expect($grid.find(".fileName").text()).to.equal("ghi");
			DSUploader.__testOnly__.submitForm($grid);
			expect(showCalled).to.be.true;
			DSPreview.show = cachedDSPreviewShow;
		});

		it("clicking on grid should submitForm", function() {
			var cachedDSPreviewShow = DSPreview.show;
			var showCalled = false;
			DSPreview.show = function(options, fromFormCard) {
				expect(options.path).to.equal("demo:///ghi");
				expect(fromFormCard).to.be.true;
				showCalled = true;
			};
			var $grid = $uploaderMain.find(".grid-unit").eq(0);
			expect($grid.find(".fileName").text()).to.equal("ghi");
			expect($grid.hasClass("inProgress")).to.be.false;
			$grid.click();
			expect(showCalled).to.be.true;
			DSPreview.show = cachedDSPreviewShow;
		});
	});

	describe("deleting files", function() {
		it("deleting a file should work", function() {
			var deleteTriggered = false;
			var demoFileDeleteCached = XcalarDemoFileDelete;
			XcalarDemoFileDelete = function(name) {
				expect(name).to.equal("ghi");
				deleteTriggered = true;
				return PromiseHelper.resolve();
			};

			var $grid = $uploaderMain.find(".grid-unit").eq(0);
			var numGrids = $uploaderMain.find(".grid-unit").length;
			expect($grid.find(".fileName").text()).to.equal("ghi");

			DSUploader.__testOnly__.deleteFileConfirm($grid);
			UnitTest.hasAlertWithTitle(DSTStr.DelUpload, {confirm: true});
			expect($uploaderMain.find(".grid-unit").length).to.equal(numGrids - 1);
			expect(deleteTriggered).to.be.true;

			XcalarDemoFileDelete = demoFileDeleteCached;
		});

		it("deleting error should work", function(done) {
			var deleteTriggered = false;
			var demoFileDeleteCached = XcalarDemoFileDelete;
			XcalarDemoFileDelete = function(name) {
				var deferred = jQuery.Deferred();

				setTimeout(function() {
					expect(name).to.equal("abc");
					deleteTriggered = true;
					deferred.reject({error: "fake error"});
				}, 10);
				return deferred.promise();
			};

			var $grid = $uploaderMain.find(".grid-unit").eq(0);
			var numGrids = $uploaderMain.find(".grid-unit").length;
			expect($grid.find(".fileName").text()).to.equal("abc");

			DSUploader.__testOnly__.deleteFileConfirm($grid);
			UnitTest.hasAlertWithTitle(DSTStr.DelUpload, {confirm: true});

			// wait for 2nd alert
			setTimeout(function(){
				UnitTest.hasAlertWithTitle(DSTStr.CouldNotDelete, {confirm: true});
				expect($uploaderMain.find(".grid-unit").length).to.equal(numGrids);
				expect(deleteTriggered).to.be.true;

				XcalarDemoFileDelete = demoFileDeleteCached;
				done();
			}, 100);
		});

		it("'does not exist' deleting error should work", function(done) {
			var deleteTriggered = false;
			var demoFileDeleteCached = XcalarDemoFileDelete;
			XcalarDemoFileDelete = function(name) {
				var deferred = jQuery.Deferred();

				setTimeout(function() {
					expect(name).to.equal("abc");
					deleteTriggered = true;
					deferred.reject({error: "does not exist"});
				}, 10);
				return deferred.promise();
			};

			var $grid = $uploaderMain.find(".grid-unit").eq(0);
			var numGrids = $uploaderMain.find(".grid-unit").length;
			expect($grid.find(".fileName").text()).to.equal("abc");

			DSUploader.__testOnly__.deleteFileConfirm($grid);
			UnitTest.hasAlertWithTitle(DSTStr.DelUpload, {confirm: true});

			// wait for demofile delete
			setTimeout(function(){
				expect($uploaderMain.find(".grid-unit").length).to.equal(numGrids - 1);
				var $otherGrid = $uploaderMain.find(".grid-unit").eq(0);
				expect($otherGrid.find(".fileName").text()).to.not.equal("abc");
				expect(deleteTriggered).to.be.true;

				XcalarDemoFileDelete = demoFileDeleteCached;
				done();
			}, 100);
		});
	});

	describe('actual file upload', function() {
		it('file upload should work', function(done) {
			var numGrids = $uploaderMain.find(".grid-unit").length;
			
			var file = new File(["abcd"], "unitTest2");

			DSUploader.__testOnly__.submitFiles([file]);

			var $grid = $uploaderMain.find(".grid-unit").last();
			expect($uploaderMain.find(".grid-unit").length).to.equal(numGrids + 1);
			expect($grid.find(".fileName").text()).to.equal("unitTest2 (Uploading)");
			expect($grid.hasClass("inProgress")).to.be.true;

			var selector = "#dsUploaderMain .grid-unit .fileName:contains(unitTest2 (Uploading))";
			TestSuite.__testOnly__.checkExists(selector, 10000, {notExist: true})
			.then(function() {
				$grid = $uploaderMain.find(".grid-unit").last();
				expect($grid.hasClass("inProgress")).to.be.false;
				expect($grid.find(".fileName").text()).to.equal("unitTest2");
				expect($grid.find(".fileSize").text()).to.equal("4B");
				expect(uploads).to.not.have.property("unitTest2");

				XcalarListFiles = cachedXcalarListFiles;

				return DSUploader.refreshFiles();
			})
			.then(function() {
				$grid = DSUploader.__testOnly__.getDSIcon("unitTest2");
				expect($grid.length).to.equal(1);
				expect($grid.find(".fileName").text()).to.equal("unitTest2");
				expect($grid.find(".fileSize").text()).to.equal("4B");

				var options = {
		            "path"  : "demo:///unitTest2",
		            "format": null,
		        };

				return DSPreview.show(options, true);
			})
			.then(function() {
				expect($("#preview-url").text()).to.equal("demo:///unitTest2");
				expect($('#previewTable').text()).to.equal("column01abcd");
				DSUploader.show();

				$grid = DSUploader.__testOnly__.getDSIcon("unitTest2");
				expect($grid.length).to.equal(1);

				var promise = DSUploader.__testOnly__.deleteFileConfirm($grid);
				UnitTest.hasAlertWithTitle(DSTStr.DelUpload, {confirm:true});
				return promise;
			})
			.then(function() {
				$grid = DSUploader.__testOnly__.getDSIcon("unitTest2");
				expect($grid.length).to.equal(0);
				return DSUploader.refreshFiles();
			})
			.then(function() {
				$grid = DSUploader.__testOnly__.getDSIcon("unitTest2");
				expect($grid.length).to.equal(0);
				done();
			})
			.fail(function() {
				expect("fail").to.equal("pass");
				done();
			});
		});
	});

	after(function() {
        // go back to previous tab
        $mainTabCache.click();
        UnitTest.offMinMode();
        XcalarListFiles = cachedXcalarListFiles;
    });
	
});