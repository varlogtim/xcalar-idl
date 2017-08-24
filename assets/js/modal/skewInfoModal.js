window.SkewInfoModal = (function(SkewInfoModal, $) {
    var $modal; // $("#skewInfoModal")
    var modalHelper;
    var activeTableId;
    var percentageLabel = false;

    SkewInfoModal.setup = function() {
        $modal = $("#skewInfoModal");

        modalHelper = new ModalHelper($modal, {
            "sizeToDefault": true,
            "resizeCallback": function() {
                drawDistributionGraph(activeTableId);
            }
        });

        addEvents();
    };

    SkewInfoModal.show = function(tableId) {
        if (tableId == null || !gTables.hasOwnProperty(tableId)) {
            // error case which should never happen
            Alert.error(AlertTStr.Error, AlertTStr.ErrorMsg);
            return;
        }
        activeTableId = tableId;
        modalHelper.setup();

        showTableInfo(tableId);
        drawDistributionGraph(tableId);
    };

    function addEvents() {
        $modal.on("click", ".close", function() {
            closeModal();
        });

        $modal.on("mouseover", ".bar", function(event) {
            event.stopPropagation();
            resetTooltip(this);
        });

        $modal.on("mouseover", function() {
            resetTooltip();
        });

        $modal.on("click", ".chart", function() {
            percentageLabel = !percentageLabel;
            xcTooltip.hideAll();
            drawDistributionGraph(activeTableId);
        });
    }

    function closeModal() {
        modalHelper.clear();
        activeTableId = null;
        percentageLabel = false;
    }

    function showTableInfo(tableId) {
        var table = gTables[tableId];
        var size = xcHelper.sizeTranslator(table.getSize());
        var totalRows = xcHelper.numToStr(table.resultSetCount);

        var $skew = $("#skewInfoArea .text");
        $modal.find(".tableName .text").text(table.getName());
        $modal.find(".size .text").text(size);
        $modal.find(".totalRows .text").text(totalRows);
        $modal.find(".skew .text").text($skew.text())
                                  .css("color", $skew.css("color"));
    }

    function drawDistributionGraph(tableId) {
        var table = gTables[tableId];
        var totalRows = table.resultSetCount;
        var data = table.getRowDistribution().map(function(d, i) {
            var row = percentageLabel ? d / totalRows : d;
            return {"row": row, "node": "Node" + i};
        });
        var $svg = $modal.find(".chart").empty();
        var svg = d3.select($svg.get(0));

        var margin = {top: 15, right: 20, bottom: 55, left: 50};
        var width = $svg.width() - margin.left - margin.right;
        var height = $svg.height() - margin.top - margin.bottom;

        var xDomain = data.map(function(d) {return d.node; });
        var max = d3.max(data, function(d) { return d.row; });
        var x = d3.scale.ordinal().rangeBands([0, width], 0.5)
                .domain(xDomain);
        var y = d3.scale.linear().rangeRound([height, 0])
                .domain([0, max]);

        var w = Math.min(x.rangeBand(), 70);

        var xTicks = data.length < 50
                     ? xDomain
                     : xDomain.filter(function(v, i) { return i % 10 === 0; });

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickValues(xTicks);

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(!percentageLabel && max <= 10 ? max : 10, percentageLabel ? "%" : null);

        var g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        g.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
        .selectAll("text")
            .attr("dx", "-.8em")
            .attr("dy", "-.7em")
            .style("text-anchor", "end")
            .attr("transform", "rotate(-90)" );

        g.append("g")
            .attr("class", "y axis")
            .call(yAxis)
        .append("text")
            .attr("y", 6)
            .attr("dy", "-1.2em")
            .attr("dx", "-2em")
            .text(percentageLabel ? CommonTxtTstr.percentage : CommonTxtTstr.rows);

        g.selectAll(".bar")
            .data(data)
        .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) {
                return x(d.node) + (x.rangeBand() - w) / 2;
            })
            .attr("width", w)
            .attr("y", function(d) { return y(d.row); })
            .attr("height", function(d) { return height - y(d.row); });

        addTooltipToChart();
    }

    function addTooltipToChart() {
        d3.select($modal.find(".chart").get(0))
        .selectAll(".bar").each(function(d) {
            var row = percentageLabel
                      ? Math.round(d.row * 100 * 100) / 100 + "%" // 2 digits
                      : xcHelper.numToStr(d.row);
            $(this).tooltip({
                trigger: "maunal",
                animation: false,
                placement: "top",
                container: "body",
                title: d.node + ": " + row
            });
        });
    }

    function resetTooltip(ele) {
        $modal.find(".bar").tooltip("hide");
        if (ele != null) {
            $(ele).tooltip("show");
        }
    }

    return (SkewInfoModal);
}({}, jQuery));