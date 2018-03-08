describe("DagFunction Test", function() {
	describe("Edit submit related tests", function() {
		it("includeDroppedNodesInStartNodes should work", function() {
			var greatGrandParentNode = {value: {name: "one", state: DgDagStateT.DgDagStateReady}}
			var grandParentNode = {parents: [greatGrandParentNode], value: {name: "two", state: DgDagStateT.DgDagStateDropped}};
			var parentNode = {parents: [grandParentNode], value: {name: "three", state: DgDagStateT.DgDagStateDropped}};
			var childNode = {parents: [parentNode]};
			var startNodes = [childNode];
			DagFunction.__testOnly__includeDroppedNodesInStartNodes(startNodes);
			expect(startNodes.length).to.equal(2);
			expect(startNodes[1].value.name).to.equal("two");

		});

		it("inserting index nodes into valArray should work", function() {

			var newIndexNodes = {
				"two": [{keys: ["a"], src: ["one"]}],
				"three": [{keys: ["b"], src: "two"}]
			};
			var valueArray = [{name: "two", struct: {source: "one"}},
							{name: "three", struct: {source: ["two"]}}];
			var newNodesArray = [];
			DagFunction.__testOnly__insertIndexNodesIntoValArray(newIndexNodes, valueArray, newNodesArray);

			expect(newNodesArray.length).to.equal(2);
			expect(newNodesArray[0].indexOf("one.index")).to.equal(0);
			expect(newNodesArray[1].indexOf("two.index")).to.equal(0);

			expect(valueArray.length).to.equal(4);
			expect(valueArray[2].name).to.equal("two");
			expect(valueArray[2].parentNames[0].indexOf("one.index")).to.equal(0);

			expect(valueArray[3].name).to.equal("three");
			expect(valueArray[3].parentNames[0].indexOf("two.index")).to.equal(0);

			expect(valueArray[0].name.indexOf("two.index")).to.equal(0);
			expect(valueArray[0].parentNames[0]).to.equal("two");

			expect(valueArray[1].name.indexOf("one.index")).to.equal(0);
			expect(valueArray[1].parentNames[0]).to.equal("one");
		});

		it("inserting new nodes into valArray should work", function() {
			var newNodes = {
				"two": [{args: {source: "one", dest: "new"}, operation: "XcalarApiMap"}]
			};
			var valueArray = [{name: "two", struct: {source: "new"}},
							{name: "three", struct: {source: "two"}}];
			var newNodesArray = [];
			DagFunction.__testOnly__insertNewNodesIntoValArray(newNodes, valueArray, newNodesArray);

			expect(newNodesArray.length).to.equal(1);
			expect(newNodesArray[0]).to.equal("new");

			expect(valueArray.length).to.equal(3);
			expect(valueArray[1].name).to.equal("two");
			expect(valueArray[1].parentNames[0]).to.equal("new");
			expect(valueArray[0].name).to.equal("new");
			expect(valueArray[0].parentNames[0]).to.equal("one");
		});

		it("tag dag nodes after edit should work", function() {
			var tagNodeCache = XcalarTagDagNodes;
			var count = 0;
			var called = false;
			XcalarTagDagNodes = function(tag, nodes) {
				count++;
				if (count === 1) {
					expect(tag).to.equal("new1");
					expect(nodes.length).to.equal(1);
					expect(nodes[0]).to.equal("newTable");
				} else {
					expect(tag).to.equal("old1,old2,new1");
					expect(nodes.length).to.equal(1);
					expect(nodes[0]).to.equal("oldTable");
				}
				if (count === 2) {
					called = true;
				}
				return PromiseHelper.resolve();
			}
			var nameToTagsMap = {
				"newTable": ["old1"]
			};
			var tagHeaders = {"old1": "new1"};
			var nonInvolvedNames = {
				"oldTable": {tags: ["old1", "old2"], tag: "old1,old2"}
			};

			DagFunction.__testOnly__tagNodesAfterEdit(nameToTagsMap, tagHeaders, nonInvolvedNames);
			expect(called).to.be.true;
			XcalarTagDagNodes = tagNodeCache;
		});

		it("recomment after edit should work", function(done) {
			var cacheFn = XcalarCommentDagNodes;
			var called = false;
			XcalarCommentDagNodes = function(comment, tables) {
				expect(comment).to.equal("some comment");
				expect(tables.length).to.equal(2);
				expect(tables[0]).to.equal("table1");
				expect(tables[1]).to.equal("table2");
				called = true;
				return PromiseHelper.reject("test");
			};

			var commentMap = {
				"some comment": ["table1", "table2"]
			}
			DagFunction.__testOnly__recommentAfterEdit(commentMap)
			.then(function(ret) {
				expect(called).to.be.true;
				expect(ret).to.equal("test");
				XcalarCommentDagNodes = cacheFn;
				done();
			})
			.fail(function() {
				done("fail");
			});
		});

		it("set columns after edit should work", function(done) {
			var table = setupFakeTable();
			table.backTableMeta = {
				valueAttrs: [{type: DfFieldTypeT.DfString, name: "testCol"}]
			};
			var cacheFn = XcalarGetTableMeta;
			var called = false;
			XcalarGetTableMeta = function(tName) {
				expect(tName).to.equal("finalName");
				called = true;
				return PromiseHelper.resolve({
					valueAttrs: [
					{type: DfFieldTypeT.DfFatptr, name: "prefix"},
					{type: DfFieldTypeT.DfString, name: "testCol"},
					{type: DfFieldTypeT.DfString, name: "col2"},
					]
				});
			};
			DagFunction.__testOnly__setColumnsAfterEdit("finalName", table)
			.then(function(newCols) {
				expect(called).to.be.true;
				expect(newCols.length).to.equal(4);
				expect(newCols[0].backName).to.equal("testCol");
				expect(newCols[1].backName).to.equal("prefix::testCol2");
				expect(newCols[2].backName).to.equal("col2");
				expect(newCols[3].backName).to.equal("DATA");
				// oldCol should not exist
				XcalarGetTableMeta = cacheFn;
				done();
			})
			.fail(function() {
				done("fail");
			});
		});

	});

	function setupFakeTable() {
		var progCol1 = new ProgCol({
            "name": "testCol",
            "backName": "testCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol2 = new ProgCol({
            "name": "testCol2",
            "backName": "prefix::testCol2",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });


        var progCol3 = new ProgCol({
            "name": "oldCol",
            "backName": "oldCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol4 = new ProgCol({
            "name": "DATA",
            "backName": "DATA",
            "isNewCol": false,
            "func": {
                "name": "raw"
            }
        });

        tableName = "fakeTable#zz999";
        tableId = "zz999";
        var table = new TableMeta({
            "tableId": tableId,
            "tableName": tableName,
            "status": TableType.Active,
            "tableCols": [progCol1, progCol2, progCol3, progCol4]
        });
        gTables[tableId] = table;
        return table;
	}

	after(function() {
		delete gTables["zz999"];
	});

});