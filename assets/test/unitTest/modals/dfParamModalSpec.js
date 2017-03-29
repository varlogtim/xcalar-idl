describe("DFParamModal Test", function() {
	var $modal; // $("#dfgParameterModal")
	var testDfName;
	var tableName;
    var tableId;
    var $dfWrap;
    var prefix;
    var oldTableId;
    var colName;

	before(function(done) {
		$modal = $("#dfgParameterModal");

		testDfName = xcHelper.randName("unitTestParamDF");
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            oldTableName = tableName;
            prefix = tPrefix;
            tableId = xcHelper.getTableId(tableName);
            oldTableId = tableId;
            colName = prefix + gPrefixSign + "average_stars";

            xcFunction.filter(1, tableId, {filterString: "gt(" + colName + ", 3)"})
            .then(function(nTName) {
            	tableName = nTName;
            	tableId = xcHelper.getTableId(nTName);
            	var columns = [{backCol: colName, frontCol: "average_stars"}];

		        DFCreateView.__testOnly__.saveDataFlow(testDfName, columns, tableName)
		        .then(function() {
		        	$("#dataflowTab .mainTab").click();
		        	$('#dfgMenu').find('.listBox').filter(function() {
		                return ($(this).find('.groupName').text() === testDfName);
		            }).closest('.listBox').trigger('click');

		            $dfWrap = $('#dfgViz .dagWrap[data-dataflowname="' + testDfName + '"]');

		        	done();
		        });
            });
        });
	});

	it("modal show should be triggered", function() {
		var cachedFn = DFParamModal.show;
		var showed = false;
		DFParamModal.show = function() {
			showed = true;
		};
		$("#dataflowView").find(".dagDropDown .createParamQuery").trigger(fakeEvent.mouseup);

		expect(showed).to.be.true;
		DFParamModal.show = cachedFn;
	});

	describe("initial state test from export", function() {
		before(function(done) {
			DFParamModal.show($dfWrap.find(".dagTable.export"))
			.then(function() {
				done();
			});
		});

		it("modal should be visible", function() {
			expect($modal.is(":visible")).to.be.true;
		});

		it("inputs should be correct", function() {
			expect($modal.find(".template .boxed").length).to.equal(1);
			expect($modal.find(".template").text()).to.equal("Export As:export-" + tableName + ".csv");
			expect($modal.find("input").eq(0).val()).to.equal("");
			expect($modal.find("input").length).to.equal(8);
		});

		after(function() {
			DFParamModal.__testOnly__.closeDFParamModal();
		});
	});

	describe("initial state test from filter with param", function() {
		var paramName = "testParam";
		before(function(done) {
        	DF.getDataflow(testDfName).addParameter(paramName);
			DFCard.__testOnly__.addParamToRetina(paramName);

			DFParamModal.show($dfWrap.find(".actionType.filter"))
			.then(function() {
				done();
			});
		});

		it("modal should be visible", function() {
			expect($modal.is(":visible")).to.be.true;
		});

		it("inputs should be correct", function() {
			expect($modal.find(".template .boxed").length).to.equal(3);
			expect($modal.find(".template").text()).to.equal("filter:" + colName + "bygt3");
			expect($modal.find("input").eq(0).val()).to.equal("");
			expect($modal.find("input").length).to.equal(10);
		});

		it("filter dropdown should be correct", function() {
			var $list = $modal.find('.tdWrapper.dropDownList');
			expect($list.find("li").eq(0).text()).to.equal("and");
			expect($list.find("li").last().text()).to.equal("regex");
		});

		it("param should be present", function() {
			expect($modal.find(".draggableDiv").length).to.equal(2);
			expect($("#draggableParam-" + paramName).length).to.equal(1);
			expect($("#draggableParam-N").length).to.equal(1);
		});
	});

	describe("drag n drop", function() {
		var paramName = "testParam";
		before(function() {
			$modal.find("input.editableParamDiv").eq(0).val("abc");
		});

		it("paramDragStart should work", function() {
			var $dummyWrap = $modal.find("input.editableParamDiv").eq(0).siblings(".dummyWrap");
			expect($modal.find("input.editableParamDiv").eq(0).is(":visible")).to.be.true;
			expect($dummyWrap.length).to.equal(1);
			expect($dummyWrap.is(":visible")).to.be.false;
			expect($dummyWrap.find(".line").length).to.equal(0);
			expect($dummyWrap.find(".space").length).to.equal(0);
			expect($dummyWrap.text()).to.equal("");

			startDrag();

			expect($modal.find("input.editableParamDiv").eq(0).is(":visible")).to.be.false;
			expect($dummyWrap.is(":visible")).to.be.true;
			expect($dummyWrap.find(".line").length).to.equal(3);
			expect($dummyWrap.find(".space").length).to.equal(1);
			expect($dummyWrap.text()).to.equal("abc");
		});

		it("paramDropLine should work", function() {
			expect($("#dagModleParamList").find(".currParams").length).to.equal(0);
			dragDropLine();
			var $dummyWrap = $modal.find("input.editableParamDiv").eq(0).siblings(".dummyWrap");
			expect($dummyWrap.text()).to.equal("a<" + paramName + ">bc");
			expect($("#dagModleParamList").find(".currParams").length).to.equal(1);
			expect($("#dagModleParamList").text()).to.equal(paramName);
		});

		it("paramDropSpace should work", function() {
			$modal.find("input.editableParamDiv").eq(0).val("abc");
			startDrag();
			dragDropSpace();
			var $dummyWrap = $modal.find("input.editableParamDiv").eq(0).siblings(".dummyWrap");
			expect($dummyWrap.text()).to.equal("abc<" + paramName + ">");
			expect($("#dagModleParamList").find(".currParams").length).to.equal(1);
			expect($("#dagModleParamList").text()).to.equal(paramName);
		});

		it("paramDragEnd should work", function() {
			var $dummyWrap = $modal.find("input.editableParamDiv").eq(0).siblings(".dummyWrap");
			expect($dummyWrap.is(":visible")).to.be.true;
			var e = jQuery.Event("dragend");
			DFParamModal.paramDragEnd(e);
			expect($dummyWrap.is(":visible")).to.be.false;
		});

		function startDrag() {
			var target = $("#draggableParam-" + paramName)[0];
            var e = jQuery.Event("dragstart", {"target": target});
            e.dataTransfer = {
                "effectAllowed": "",
                "setData": function() {}
            };
            DFParamModal.paramDragStart(e);
		}

		function dragDropLine() {
			var target = $modal.find(".line")[1];
            var e = jQuery.Event("drop", {"target": target});
            e.dataTransfer = {
                getData: function(){
                		return "draggableParam-" + paramName;
                	}
            };
            DFParamModal.paramDropLine(e);
		}
		function dragDropSpace() {
			var target = $modal.find(".space")[0];
            var e = jQuery.Event("drop", {"target": target});
            e.dataTransfer = {
                getData: function(){
                		return "draggableParam-" + paramName;
                	}
            };
            DFParamModal.paramDropSpace(e);
		}
	});

	describe("functions tests", function() {
		it("checkForOneParen should work", function() {
			var fn = DFParamModal.__testOnly__.checkForOneParen;
			expect(fn("(")).to.be.true;
			expect(fn("((")).to.be.false;
			expect(fn("'('")).to.be.false;
			expect(fn("('('")).to.be.true;
			expect(fn('"("')).to.be.false;
			expect(fn('"("(')).to.be.true;
			expect(fn('\\"(\\"')).to.be.true;
		});

		it("suggest should work", function() {
			var fn = DFParamModal.__testOnly__.suggest;
			var $list = $modal.find(".list");
			var $input = $list.siblings("input");

			$input.val("o");
			fn($input);
			expect($list.find("li:visible").text()).to.equal("orcontainsisBooleanisFloatnot");
			$list.hide();

			$input.val(" ");
			fn($input);
			expect($list.find("li:visible").length).to.equal(19);

			$input.val("abcd");
			fn($input);
			expect($list.find("li:visible").length).to.equal(0);
		});

		it("updateNumArgs should work", function() {
			var $list = $modal.find(".list");
			var $li1 = $list.find("li").eq(0);
			var $li2 = $list.find("li").eq(1);
			expect($li1.text()).to.equal("and");
			expect($li2.text()).to.equal("between");

			expect($modal.find(".editableParamQuery input").length).to.equal(3);

			$li2.trigger(fakeEvent.mouseup);
			expect($modal.find(".editableParamQuery input").length).to.equal(4);

			$li1.trigger(fakeEvent.mouseup);
			expect($modal.find(".editableParamQuery input").length).to.equal(3);
		});

		it("setParamDivToDefault should work", function() {
			$modal.find(".editableTable .defaultParam").click();
			var $inputs = $modal.find('.editableParamQuery input');
			expect($inputs.eq(0).val()).to.equal(colName);
			expect($inputs.eq(1).val()).to.equal("gt");
			expect($inputs.eq(2).val()).to.equal("3");
		});

		it("editableParamDiv on input should work", function(done) {
			var paramName = "testParam";
			var $input = $modal.find('.editableParamQuery input').eq(0);
			$input.val("<" + paramName + ">").trigger("input");
			setTimeout(function() {
				expect($("#dagModleParamList").text()).to.equal(paramName);
				$input.val(colName).trigger("input");
				setTimeout(function() {
					expect($("#dagModleParamList").text()).to.equal("");
					done();
				}, 400);
			}, 400);
		});
	});

	describe("submit", function() {
		it("empty input should be detected", function(done) {
			$modal.find('.editableParamQuery input').eq(0).val("");
			DFParamModal.__testOnly__.storeRetina()
            .then(function() {
            	done("failed");
            })
            .fail(function(){
            	UnitTest.hasStatusBoxWithError("Please fill out this field.");
            	done();
            });
		});

		it("invalid bracket should be detected", function(done) {
			$modal.find('.editableParamQuery input').eq(2).val("<test");
			DFParamModal.__testOnly__.storeRetina()
            .then(function() {
            	done("failed");
            })
            .fail(function(){
            	UnitTest.hasStatusBoxWithError("Unclosed parameter bracket detected.");
            	done();
            });
		});

		it("invalid param should be detected", function(done) {
			$modal.find('.editableParamQuery input').eq(2).val("<te?st>");
			DFParamModal.__testOnly__.storeRetina()
            .then(function() {
            	done("failed");
            })
            .fail(function(){
            	UnitTest.hasStatusBoxWithError("No special characters or spaces allowed within parameter braces.");
            	done();
            });
		});

		it("empty param value should be detected", function(done) {
			$modal.find('.editableParamQuery input').eq(0).val(colName);
			$modal.find('.editableParamQuery input').eq(1).val("lt");
			$modal.find('.editableParamQuery input').eq(2).val("<testParam>");
			DFParamModal.__testOnly__.checkInputForParam($modal.find('.editableParamQuery input').eq(2));

            DFParamModal.__testOnly__.storeRetina()
            .then(function() {
            	done("failed");
            })
            .fail(function(){
            	UnitTest.hasStatusBoxWithError("Please fill out this field or keep it empty by checking the checkbox.");
            	$modal.find(".paramVal").eq(0).val("4");
            	done();
            });
		});

		it("wrong filter type should not work", function(done) {
			$modal.find('.editableParamQuery input').eq(1).val("garbage");
			DFParamModal.__testOnly__.storeRetina()
            .then(function() {
            	done("failed");
            })
            .fail(function(){
            	UnitTest.hasAlertWithTitle("Update Parameters Failed");
            	$modal.find(".paramVal").eq(0).val("4");
            	done();
            });
		});

		it("submit should work", function(done) {
			$modal.find('.editableParamQuery input').eq(1).val("lt");
			DFParamModal.__testOnly__.storeRetina()
            .then(function() {
            	var df = DF.getDataflow(testDfName);
            	expect(df.paramMap.testParam).to.equal("4");
            	expect($dfWrap.find(".actionType.filter").text()).to.equal("Filter<Parameterized>");
            	expect($dfWrap.find(".actionType.filter").hasClass("hasParam")).to.be.true;
            	done();
            })
            .fail(function(){
            	done("failed");
            });
		});

		it("submit with default param should work", function(done) {
			DFParamModal.show($dfWrap.find(".actionType.filter"))
			.then(function() {
				$modal.find('.editableParamQuery input').eq(2).val("<N>");
				DFParamModal.__testOnly__.checkInputForParam($modal.find('.editableParamQuery input').eq(2));
				DFParamModal.__testOnly__.storeRetina()
	            .then(function() {
	            	var df = DF.getDataflow(testDfName);
	            	expect(df.paramMap.N).to.equal(0);
	            	done();
	            })
	            .fail(function(){
	            	done("failed");
	            });
			});
		});
	});

	after(function(done) {
		DFCard.__testOnly__.deleteDataflow(testDfName)
        .always(function() {
            Alert.forceClose();
            UnitTest.deleteAllTables()
	        .then(function() {
	            UnitTest.deleteDS(testDs)
	            .always(function() {
	                UnitTest.offMinMode();
	                done();
	            });
	        });
        });
    });
});