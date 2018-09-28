describe("Export Operator Panel Test", function() {
    var exportOpPanel;
    var oldDriverList;
    var oldDatTargetList;
    var oldJSONParse;
    var calledDriverList = false;
    var calledTargetList = false;
    var node;

    before(function() {
        oldDriverList = XcalarDriverList;
        node = new DagNodeExport();
        XcalarDriverList = function() {
            calledDriverList = true;
            return PromiseHelper.deferred().resolve([
                {
                    "name": "test1",
                    "params" : [
                        {
                            "name": "param1",
                            "type": "string",
                            "description": "desc",
                            "secret": false,
                            "optional": false
                        }
                    ]
                },
                {
                    "name": "test2",
                    "params" : [
                        {
                            "name": "param1",
                            "type": "integer",
                            "description": "desc",
                            "secret": false,
                            "optional": false
                        }
                    ]
                },
                {
                    "name": "full test driver",
                    "params" : [
                        {
                            "name": "str param",
                            "type": "string",
                            "description": "desc",
                            "secret": false,
                            "optional": false
                        },
                        {
                            "name": "int param",
                            "type": "integer",
                            "description": "desc",
                            "secret": false,
                            "optional": false
                        },
                        {
                            "name": "bool param",
                            "type": "boolean",
                            "description": "desc",
                            "secret": false,
                            "optional": false
                        },
                        {
                            "name": "secret optional param",
                            "type": "string",
                            "description": "desc",
                            "secret": true,
                            "optional": true
                        },
                        {
                            "name": "target param",
                            "type": "target",
                            "description": "desc",
                            "secret": false,
                            "optional": false
                        },
                    ]
                },
            ]);
        };

        oldDatTargetList = DSTargetManager.getAllTargets;
        DSTargetManager.getAllTargets = function() {
            calledTargetList = true;
            return [
                {"name": "target1"},
                {"name": "target2"},
            ];
        };
        oldJSONParse = JSON.parse;
        if (!gDionysus) {
            ExportOpPanel.Instance.setup();
        }
        exportOpPanel = ExportOpPanel.Instance;
    });

    describe("Basic Export Panel UI Tests", function() {

        it ("Should be hidden at start", function () {
            exportOpPanel.close();
            expect($('#exportOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {

            exportOpPanel.show(node);
            expect($('#exportOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it ("Should be hidden when close is called after showing", function () {
            exportOpPanel.show(node);
            exportOpPanel.close();
            expect($('#exportOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
            exportOpPanel.show(node);
            $('#exportOpPanel .close').click();
            expect($('#exportOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("Standard View Driver related Export Panel Tests", function() {

        it ("Should populate driver list", function () {
            exportOpPanel.show(node);
            expect(calledDriverList).to.be.true;
            expect($("#exportDriverList .exportDriver").length).to.equal(3);
        });

        it ("Should display parameters when a driver is selected", function() {
            exportOpPanel.show(node);
            $("#exportDriver").val("test1");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .exportArg").length).to.equal(1);
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .exportArg").length).to.equal(5);
        });

        it ("Should display text params correctly when a driver is selected", function() {
            exportOpPanel.show(node);
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .str_param").length).to.equal(1);
            var $param = $("#exportOpPanel .str_param").eq(0);
            expect($param.find(".label").text()).to.equal("str param:");
            expect($param.find("input").attr("type")).to.equal("text");
        });

        it ("Should display integer params correctly when a driver is selected", function() {
            exportOpPanel.show(node);
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .int_param").length).to.equal(1);
            var $param = $("#exportOpPanel .int_param").eq(0);
            expect($param.find(".label").text()).to.equal("int param:");
            expect($param.find("input").attr("type")).to.equal("number");
        });

        it ("Should display boolean params correctly when a driver is selected", function() {
            exportOpPanel.show(node);
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .bool_param").length).to.equal(1);
            var $param = $("#exportOpPanel .bool_param").eq(0);
            expect($param.find(".label").text()).to.equal("bool param:");
        });

        it ("Should display secret/optional params correctly when a driver is selected", function() {
            exportOpPanel.show(node);
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .secret_optional_param").length).to.equal(1);
            var $param = $("#exportOpPanel .secret_optional_param").eq(0);
            expect($param.find(".label").text()).to.equal("secret optional param (optional):");
            expect($param.find("input").attr("type")).to.equal("password");
        });

        it ("Should display target params correctly when a driver is selected", function() {
            exportOpPanel.show(node);
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .target_param").length).to.equal(1);
            var $param = $("#exportOpPanel .target_param").eq(0);
            expect($param.find(".label").text()).to.equal("target param:");
            expect($param.find(".exportDrivers li").length).to.equal(2);
        });

        it ("Should show statusbox error if a non optional param isn't filled", function () {
            exportOpPanel.show(node);
            $("#exportDriver").val("test1");
            exportOpPanel.renderDriverArgs();
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
        });

        it ("Should save correctly", function () {
            exportOpPanel.show(node);
            $("#exportDriver").val("test1");
            exportOpPanel.renderDriverArgs();
            $("#exportOpPanel .exportArg").eq(0).find('input').val("demo");
            $("#exportOpPanel .exportArg").eq(0).find('input').change();
            $("#exportOpPanel .bottomSection .btn-submit").click();
            var params = node.getParam().driverArgs;
            expect(params.length).to.equal(1);
            expect(params[0].name).to.equal("param1");
            expect(params[0].value).to.equal("demo");
        });
    });

    describe("Advanced View Driver related Export Panel Tests", function() {
        it("Should show statusbox error if columns isnt a field", function() {
            JSON.parse = function (arg) {
                return {};
            };
            exportOpPanel.show(node);
            $("#exportOpPanel .bottomSection .xc-switch").click();
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it("Should show statusbox error if driver is null", function() {
            JSON.parse = function (arg) {
                return {
                    "columns": []
                };
            };
            exportOpPanel.show(node);
            $("#exportOpPanel .bottomSection .xc-switch").click();
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it("Should show statusbox error if driver is not real", function() {
            JSON.parse = function (arg) {
                return {
                    "columns": [],
                    "driver": "unreal"
                };
            };
            exportOpPanel.show(node);
            $("#exportOpPanel .bottomSection .xc-switch").click();
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it("Should show statusbox error if there arent enough arguments specified", function() {
            JSON.parse = function (arg) {
                return {
                    "columns": [],
                    "driver": "test1",
                    "driverArgs": []
                };
            };
            exportOpPanel.show(node);
            $("#exportOpPanel .bottomSection .xc-switch").click();
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it("Should show statusbox error if driver arguments don't match up", function() {
            JSON.parse = function (arg) {
                return {
                    "columns": [],
                    "driver": "test1",
                    "driverArgs": [{
                        "name": "param3",
                        "type": "string",
                        "optional": false,
                        "value": "str"
                    }]
                };
            };
            exportOpPanel.show(node);
            $("#exportOpPanel .bottomSection .xc-switch").click();
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it("Should show statusbox error if integer argument is invalid", function() {
            JSON.parse = function (arg) {
                return {
                    "columns": [],
                    "driver": "test2",
                    "driverArgs": [{
                        "name": "param1",
                        "type": "integer",
                        "optional": false,
                        "value": "123a"
                    }]
                };
            };
            exportOpPanel.show(node);
            $("#exportOpPanel .bottomSection .xc-switch").click();
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it ("Should show statusbox error if a non optional param isn't filled", function () {
            JSON.parse = function (arg) {
                return {
                    "columns": [],
                    "driver": "test1",
                    "driverArgs": [{
                        "name": "param1",
                        "type": "string",
                        "optional": false,
                        "value": null
                    }]
                };
            };
            exportOpPanel.show(node);
            $("#exportOpPanel .bottomSection .xc-switch").click();
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it ("Should save correctly if JSON is correct", function () {
            exportOpPanel.show(node);
            $("#exportOpPanel .bottomSection .xc-switch").click();

            $("#exportOpPanel .bottomSection .btn-submit").click();
            var params = node.getParam().driverArgs;
            expect(params.length).to.equal(1);
            expect(params[0].name).to.equal("param1");
            expect(params[0].value).to.equal("demo");
            exportOpPanel.close();
        });
    });

    after(function() {
        exportOpPanel.close();
        XcalarDriverList = oldDriverList;
        DSTargetManager.getAllTargets = oldDatTargetList;
        JSON.parse = oldJSONParse;
    });
});