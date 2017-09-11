describe("DF Test", function() {
	describe("main functions", function() {
		it("DF.addScheduleToDataflow should work", function() {
			var called = false;
			var dfName = "df" + Date.now();
			var df = {
				schedule: {update: function(){called = true;}}
			};
			var newDfs = {"test": df};
			var oldDfs = DFParamModal.__testOnly__.updateDataflows(newDfs);

			var cache1 = XcalarDeleteSched;
			XcalarDeleteSched = function() {
				return PromiseHelper.resolve();
			};

			var cache2 = XcalarCreateSched;
			XcalarCreateSched = function() {
				return PromiseHelper.resolve();
			};

			var cache3 = DF.commitAndBroadCast;
			DF.commitAndBroadCast = function() {
				return PromiseHelper.resolve();
			};


			DF.addScheduleToDataflow("test", {});
			expect(called).to.be.true;

			XcalarDeleteSched = cache1;
			XcalarCreateSched = cache2;
			DF.commitAndBroadCast = cache3;

			DFParamModal.__testOnly__.updateDataflows(oldDfs);
		});

		it("DF.updateScheduleForDataflow", function() {
			var called = false;
			var df = {
				schedule: {}
			};
			var newDfs = {"test": df};
			var oldDfs = DFParamModal.__testOnly__.updateDataflows(newDfs);

			var cache1 = XcalarUpdateSched;
			XcalarUpdateSched = function() {
				called = true;
				return PromiseHelper.resolve();
			};

			var cache2 = DF.getAdvancedExportOption;
			DF.getAdvancedExportOption = function() {return {};};

			var cache3 = DF.getExportTarget;
			DF.getExportTarget = function(){return {};};


			DF.updateScheduleForDataflow("test");
			expect(called).to.be.true;

			XcalarUpdateSched = cache1;
			DF.getAdvancedExportOption = cache2;
			DF.getExportTarget = cache3;
			DFParamModal.__testOnly__.updateDataflows(oldDfs);
		});

		it("DF.saveAdvancedExportOption", function() {
			var df = {};
			var cache1 = DF.getDataflow;
			DF.getDataflow = function() {
				return df;
			};

			DF.saveAdvancedExportOption("test", {activeSession: "a", newTableName: "b"});
			expect(df.activeSession).to.equal("a");
			expect(df.newTableName).to.equal("b");

			DF.getDataflow = cache1;
		});

		it("DF.getExportTarget", function() {
			var df = {retinaNodes: [{input: {exportInput: {meta: {target: {name: ""}}}}}]};
			var cache1 = DF.getDataflow;
			DF.getDataflow = function() {
				return df;
			};
			var cache2 = DSExport.getTarget;
			DSExport.getTarget = function() {
				return {type: 1, info: {name: "testName", formatArg: "here"}};
			};


			var options = DF.getExportTarget(true, null);
			expect(options.exportLocation).to.equal("N/A");
			expect(options.exportTarget).to.equal("XcalarForTable");

			var options = DF.getExportTarget(false, "test");
			expect(options.exportLocation).to.equal("here");
			expect(options.exportTarget).to.equal("testName");

			expect(df.activeSession).to.equal(undefined);
			expect(df.newTableName).to.equal(undefined);

			DF.getDataflow = cache1;
			DSExport.getTarget = cache2;
		});

		it("DF.deleteActiveSessionOption", function() {
			var df = {activeSession: "a", newTableName: "b"};
			var cache1 = DF.getDataflow;
			DF.getDataflow = function() {
				return df;
			};

			DF.deleteActiveSessionOption("test", {activeSession: "a", newTableName: "b"});
			expect(df.activeSession).to.equal(undefined);
			expect(df.newTableName).to.equal(undefined);

			DF.getDataflow = cache1;
		});
	});

	describe("other functions", function() {
		it("getsubstitions should work", function() {
			var df = {
				schedule: {},
				paramMap: {
					"a": "b"
				},
				paramMapInUsed: {
					"a": true
				}
			};
			var cache1 = DF.getDataflow;
			DF.getDataflow = function() {
				return df;
			};

			var paramsArray = DFParamModal.__testOnly__.getSubstitutions("test", true);
			expect(paramsArray.length).to.equal(2);
			expect(paramsArray[0].parameterName).to.equal("a");
			expect(paramsArray[0].parameterValue).to.equal("b");
			expect(paramsArray[1].parameterName).to.equal("N");
			expect(paramsArray[1].parameterValue).to.equal(0);

			DF.getDataflow = cache1;
		});
	});
});