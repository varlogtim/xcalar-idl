describe("Profile-Profile Chart Test", function() {
    describe("Basic Test", function() {
        it("should get bar chart builder", function() {
            var chartBuilder = ProfileChart.new({type: "bar"});
            expect(chartBuilder).to.be.an("object");
        });

        it("should get pie chart builder", function() {
            var chartBuilder = ProfileChart.new({type: "pie"});
            expect(chartBuilder).to.be.an("object");
            expect(chartBuilder.constructor.toString())
            .to.contains("PieChartBuilder");
        });

        it("should not get unsupport builder", function() {
            var chartBuilder = ProfileChart.new({type: "random"});
            expect(chartBuilder).to.be.null;
        });
    });

    describe("Common Chart Function Test", function() {
        it("_getOptions should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar"});
            var options = chartBuilder._getOptions();
            expect(options).to.be.an("object");
        });

        it("_getModal should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar"});
            var $modal = chartBuilder._getModal();
            expect($modal.attr("id")).to.equal("profileModal");
        });

        it("_getNumInScale should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar"});
            var getNumInScale = chartBuilder._getNumInScale;

            var res = getNumInScale(1);
            expect(res).to.equal(1);
            // case 2
            res = getNumInScale(0, true);
            expect(res).to.equal(0);
            // case 3
            res = getNumInScale(2, true);
            expect(res).to.equal(10);
            // case 4
            res = getNumInScale(-2, true);
            expect(res).to.equal(-10);
        });

        it("_formatNumber should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar"});
            var formatNumber = chartBuilder._formatNumber;
            var res = formatNumber(null);
            expect(res).to.equal("");
            // case 2
            res = formatNumber("1");
            expect(res).to.equal("\"1\"");
            // case 3
            res = formatNumber(true);
            expect(res).to.equal(true);
            // case 4
            var obj = {};
            res = formatNumber(obj);
            expect(res).to.equal(obj);
            // case 5
            res = formatNumber(1);
            expect(res).to.equal("1");
            // case 6
            res = formatNumber(1, true);
            expect(res).to.equal(1);
            // case 7
            res = formatNumber(2, true);
            expect(res).to.equal("2e+0");
            // case 8
            res = formatNumber(1, false, 2);
            expect(res).to.equal("1.00");

            // case 9
            res = formatNumber("FNF", null, null, true);
            expect(res).to.equal("FNF");
        });

        it("_getLabel should work", function() {
            var chartBuilder = ProfileChart.new({
                type: "bar",
                percentage: true,
                nullCount: 10,
                sum: 90,
                yName: "y"
            });

            var res = chartBuilder._getLabel({"y": 10}, 3);
            expect(res).to.equal("10.0%");

            // case 2
            chartBuilder = ProfileChart.new({
                type: "bar",
                yName: "y"
            });

            res = chartBuilder._getLabel({"y": 1.2345}, 5);
            expect(res).to.equal("1.234..");

            // case 3
            res = chartBuilder._getLabel({"y": 1.2345}, 6);
            expect(res).to.equal("1.2345");
        });

        it("_getXAxis should work", function() {
            var chartBuilder = ProfileChart.new({
                type: "bar",
                bucketSize: 10,
                sorted: true,
                decimalNum: 0,
                xName: "x"
            });

            var res = chartBuilder._getXAxis({x: 10});
            expect(res).to.equal("10-20");
            // case 2
            res = chartBuilder._getXAxis({x: 10}, 3);
            expect(res).to.equal("10-..");
        });

        it("_getTooltpAndClass should work", function() {
            var ele = $('<div></div>').get(0);
            var getTitle = function(element) {
                return $(element).data("bs.tooltip").options.title;
            };
            var chartBuilder = ProfileChart.new({
                type: "bar",
                percentage: true,
                xName: "x",
                yName: "y",
                decimalNum: 0,
                sum: 90,
                nullCount: 10
            });

            var res = chartBuilder._getTooltpAndClass(ele, {
                y: 10,
                section: "other"
            });
            expect(res).to.equal("area");
            expect(getTitle(ele))
            .to.equal("Value: Other<br>Percentage: 10.000%");

            // case 2
            chartBuilder = ProfileChart.new({
                type: "bar",
                bucketSize: 0,
                xName: "x",
                yName: "y",
                decimalNum: 0,
                sum: 1,
                nullCount: 0,
                percentage: true
            });
            chartBuilder._getTooltpAndClass(ele, {
                y: 0.000001,
                x: "xLabel"
            });

            expect(getTitle(ele))
            .to.equal("Value: \"xLabel\"<br>Percentage: 1.00e-4%");

            // case 3
            chartBuilder = ProfileChart.new({
                type: "bar",
                bucketSize: 10,
                xName: "x",
                yName: "y",
                decimalNum: 0,
            });
            chartBuilder._getTooltpAndClass(ele, {
                y: 50,
                x: 10
            });
            expect(getTitle(ele)).to.equal("Value: [10, 20)<br>Frequency: 50");
        });

        it("getType should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar"});
            var res = chartBuilder.getType();
            expect(res).to.equal("bar");
        });

        it("getXName should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar", xName: "testX"});
            var res = chartBuilder.getXName();
            expect(res).to.equal("testX");
        });

        it("getYName should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar", yName: "testY"});
            var res = chartBuilder.getYName();
            expect(res).to.equal("testY");
        });

        it("getBuckSize should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar", bucketSize: 1});
            var res = chartBuilder.getBuckSize();
            expect(res).to.equal(1);
        });

        it("isSorted should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar", sorted: true});
            var res = chartBuilder.isSorted();
            expect(res).to.be.true;
        });

        it("isNoBucket should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar", bucketSize: 0});
            var res = chartBuilder.isNoBucket();
            expect(res).to.be.true;

            // case 2
            chartBuilder = ProfileChart.new({type: "bar", bucketSize: 1});
            res = chartBuilder.isNoBucket();
            expect(res).to.be.false;
        });

        it("getLowerBound should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar", bucketSize: 10});
            var res = chartBuilder.getLowerBound(10);
            expect(res).to.equal(10);
        });

        it("getUpperBound should work", function() {
            var chartBuilder = ProfileChart.new({type: "bar", bucketSize: 10});
            var res = chartBuilder.getUpperBound(10);
            expect(res).to.equal(20);
        });
    });

    describe("Bar Chart Test", function() {
        before(function() {
            $("#profileModal").show();
        });

        it("should build bar chart", function() {
            var chartBuilder = ProfileChart.new({
                data: [{"x": "xLabel", "y": 10}],
                type: "bar",
                bucketSize: 0,
                xName: "x",
                yName: "y",
                nullCount: 0,
                max: 10,
                sum: 10,
                decimal: 0,
                initial: true,
            });
            chartBuilder.build();

            var $section = $("#profileModal .groupbyChart");
            expect($section.find(".area").length).to.equal(1);
            expect($section.find(".tick").length).to.equal(1);
            expect($section.find(".xlabel").length).to.equal(1);
        });

        it("should update bar chart", function() {
            var chartBuilder = ProfileChart.new({
                data: [{x: "xLabel", y: 10}, {x: "xLabel2", y: 20}],
                type: "bar",
                bucketSize: 0,
                xName: "x",
                yName: "y",
                nullCount: 0,
                max: 10,
                sum: 10,
                decimal: 0,
            });
            chartBuilder.build();

            var $section = $("#profileModal .groupbyChart");
            expect($section.find(".area").length).to.equal(2);
            expect($section.find(".tick").length).to.equal(2);
            expect($section.find(".xlabel").length).to.equal(2);
        });

        it("should build bar chart with bucket", function() {
            var chartBuilder = ProfileChart.new({
                data: [{"x": 1, "y": 10}],
                type: "bar",
                bucketSize: 1,
                xName: "x",
                yName: "y",
                nullCount: 0,
                max: 10,
                sum: 10,
                decimal: 0,
                initial: true
            });
            chartBuilder.build();

            var $section = $("#profileModal .groupbyChart");
            expect($section.find(".area").length).to.equal(1);
            expect($section.find(".tick").length).to.equal(2);
            expect($section.find(".xlabel").length).to.equal(1);
        });

        it("should build bar chart in resize case", function() {
            var chartBuilder = ProfileChart.new({
                data: [{"x": 1, "y": 10}],
                type: "bar",
                bucketSize: 1,
                xName: "x",
                yName: "y",
                nullCount: 0,
                max: 10,
                sum: 10,
                decimal: 0,
                resize: true,
                resizeDelay: 0
            });
            chartBuilder.build();

            var $section = $("#profileModal .groupbyChart");
            expect($section.find(".area").length).to.equal(1);
            expect($section.find(".tick").length).to.equal(2);
            expect($section.find(".xlabel").length).to.equal(1);
        });

        after(function() {
            $("#profileModal").hide();
            $("#profileModal .groupbyChart").empty();
        });
    });

    describe("Pie Chart Test", function() {
        before(function() {
            $("#profileModal").show();
        });

        it("should get and set radius", function() {
            var chartBuilder = ProfileChart.new({type: "pie"});
            chartBuilder._setRadius(1);
            expect(chartBuilder.getRadius()).to.equal(1);
        });

        it("_getColorClass should work", function() {
            var chartBuilder = ProfileChart.new({type: "pie"});
            var res = chartBuilder._getColorClass(1);
            expect(res).to.equal("color-1");
        });

        it("_midAngle should work", function() {
            var chartBuilder = ProfileChart.new({type: "pie"});
            var res = chartBuilder._midAngle({
                startAngle: 10,
                endAngle: 20
            });
            expect(res).to.equal(15);
        });

        it("should build pie chart", function() {
            var chartBuilder = ProfileChart.new({
                data: [{"x": 1, "y": 10}],
                type: "pie",
                bucketSize: 1,
                xName: "x",
                yName: "y",
                nullCount: 0,
                max: 10,
                sum: 10,
                decimal: 0
            });
            chartBuilder.build();

            var $section = $("#profileModal .groupbyChart");
            expect($section.find(".area").length).to.equal(1);
        });

        after(function() {
            $("#profileModal").hide();
            $("#profileModal .groupbyChart").empty();
        });
    });
});