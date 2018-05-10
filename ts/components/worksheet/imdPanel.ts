// sets up monitor panel and system menubar
namespace IMDPanel {
    let $imdPanel: JQuery;
    let $canvas: JQuery;
    let $tableDetail: JQuery; //$(".tableDetailSection")
    const tickColor = "#777777";
    const tickWidth = 1;
    const tickSpacing = 6;
    const tickHeight = 12;
    const tickHeightLarge = 20;
    const largeTickInterval = 5;
    const tickTextInterval = 20;
    let pTables: object[]; //published tables return from thrift call
    let hTables: object[]; // hidden tables
    let $updatePrompt;
    const leftPanelWidth = 280;
    //ruler object
    let ruler = {
        pixelToTime: 1000 /*1 pxel = 1 seconds*/,
        visibleLeft: 0,
        visibleRight: 0,
        uiScale: null,
        minTS: null
    };
    let selectedCells = {};
    let $scrollDiv: JQuery;
    let toTimePicker: object;
    let fromTimePicker: object;
    let prevFromTime: string;
    let prevToTime: string;
    let isPendingRefresh = false;
    let isPanelActive = false;
    let progressCircle: object; // for progress of activating tables
    let progressState = {canceled: false};
    let isScrolling = false;

    export function setup() {
        $imdPanel = $("#imdView");
        $canvas = $("#imdTimeCanvas");
        $updatePrompt = $imdPanel.find(".update-prompt");
        $scrollDiv = $imdPanel.find(".scrollDiv");
        $tableDetail = $(".tableDetailSection");
        hTables = [];

        setupTimeInputs();
        addEventListeners();
    };

    // can modify to take in a pattern if needed but for now, fetching all
    // when the imd sub panel becomes active, refresh the time canvas
    // and add a window resize listener that trigers canvas redraw

    export function active(firstTouch: boolean) {
        isPanelActive = true;
        let timer;
        $(window).on("resize.canvasResize", function () {
            clearTimeout(timer);
            timer = setTimeout(function () {
                redrawTimeCanvas();
                updateTimeInputs();
            }, 300);
        });
        redrawTimeCanvas();
        if (firstTouch) {
            listTablesFirstTime(firstTouch);
        } else if (isPendingRefresh) {
            refreshTableList();
        }
        isPendingRefresh = false;
    }

    export function inActive() {
        isPanelActive = false;
        $(window).off("resize.canvasResize");
        hideUpdatePrompt();
    }

    /**
     * update history bar in a way that given two dates fits in it
     * ts1 : unix time stamp of from
     * ts2 : unix time stamp of to
     */
    function updateViewportForDateRange(ts1, ts2) {
        let numberOfUnits = ($("#imdTimeCanvas").width()) / tickSpacing;
        var scale = (ts2 - ts1) / numberOfUnits;

        updateScale(scale, ts1, ts2);
    }

    // for the first time that we list tables, we create a range that shows
    // everything
    function initScale() {
        let canvasWidth = $canvas.parent().width();
        // default is 1 tick per second
        let seconds = Math.ceil(canvasWidth / tickSpacing);
        let max = Math.ceil(Date.now() / 1000);
        let min = max - seconds;
        let tempMax = 0;

        pTables.forEach(function(table) {
            var len = table.updates.length;
            if (len && table.updates[len - 1]) {
                min = Math.min(min, table.updates[len - 1].startTS);
                tempMax = Math.max(tempMax, table.updates[0].startTS);
            }
        });

        // if new min is detected, increase range a little bit so the min is not
        // all the way on the left side
        if (max - min !== seconds) {
            min -= Math.floor((max - min) * 0.02);
        }
        let range = max - min;
        if (tempMax + (range * 0.02) > max) {
            max += Math.ceil(range * 0.02);
        }

        $("#imdFromInput").datepicker("setDate", new Date(min * 1000));
        $("#imdToInput").datepicker("setDate", new Date(max * 1000));
        fromTimePicker.showTimeHelper(new Date(min * 1000));
        toTimePicker.showTimeHelper(new Date(max * 1000));
        updateViewportForDateRange(min, max);
    }

    /**
     * updates the ruler's pixelToTime var from UI value
     * redraw all time panel
     */
    function updateScale(scale, rangeMin, rangeMax) {
        ruler.uiScale = scale; //cache scale value
        if (scale <= 0) { //make sure to avoid div by zero or neg values
            scale = 1;
        }

        ruler.pixelToTime = parseFloat(scale) / parseFloat(tickSpacing);
        initTimePanels(pTables, rangeMin, rangeMax);
        updateHistory();
    }
    function timeString(timeStamp) {
        let formatHash = [
            {limit: 10, format: "h:mm:ss a"},
            {limit: 1800, format: "h:mm a"}, //up to 1/2 hour
            {limit: 86400, format: "MMMM Do"}, //up to 24 hours
            {limit: 18144000, format: "MMMM YYYY"}, //up to a month
            {limit: 18144000 * 12, format: "MMMM Do YYYY"}, //up to a year
        ];
        var formatStr;
        for (var id = 0; id < formatHash.length; id++) {
            if (ruler.uiScale < formatHash[id].limit) {
                formatStr = formatHash[id].format;
                break;
            }
        }
        return moment.unix(timeStamp).format(formatStr);
    }

    function redrawTimeCanvas(): void {
        const canvas: HTMLElement = $canvas[0];
        const ctx = canvas.getContext("2d");
        let canvasWidth: number = $canvas.parent().width();
        let canvasHeight: number = $canvas.parent().height();
        canvas.setAttribute("width", "" + canvasWidth);
        canvas.setAttribute("height", "" + canvasHeight);
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = tickWidth;
        ctx.font = "9px Open Sans";
        ctx.fillStyle = tickColor;
        ctx.textAlign = "center";
        ctx.beginPath();
        var visibleLeftTime = ruler.visibleLeft * ruler.pixelToTime;
        var firstTickPos = parseInt(visibleLeftTime / ruler.uiScale / 5) * ruler.uiScale * 5;
        var startX = firstTickPos / ruler.pixelToTime - ruler.visibleLeft; //has to be a negative value
        let i = startX;
        let numTicks = 1;
        let curTime = visibleLeftTime;
        let delta = tickTextInterval * tickSpacing * ruler.pixelToTime; // print the time string for every delta
        let lastDateStringPosition = -1; //some book keeping to print datestring
        while (i < canvasWidth) {
            let curTickHeight = (numTicks % largeTickInterval) ? tickHeight : tickHeightLarge;
            ctx.moveTo(i, canvasHeight);
            ctx.lineTo(i, canvasHeight - curTickHeight);
            curTime = (i  + ruler.visibleLeft ) * ruler.pixelToTime + ruler.minTS;
            let textPos = Math.floor(curTime / delta) * delta;
            if (lastDateStringPosition !== textPos && (numTicks % largeTickInterval === 0) ) {
                if (lastDateStringPosition !== -1) {
                    ctx.fillText(timeString(curTime), i, 12);
                }
                lastDateStringPosition = textPos;
            }
            i += ruler.uiScale / ruler.pixelToTime;
            numTicks++;
        }

        ctx.stroke();
    }

    // either pass in a table to update or track which table is focused
    // XXX does not need the full list of tables
    function updateTableDetailSection(tableName?: string) {
        if (!tableName) {
            $tableDetail.removeClass("active");
            return;
        }
        $tableDetail.addClass("active");
        $tableDetail.find(".tableName").text(tableName + ":");

        let $tableContent: JQuery = $tableDetail.find(".tableDetailContent");
        let html: string = '';
        pTables.forEach(function(table) {
            if (table.name == tableName) {
            //updated may not sorted by timestamp , need to check all of them
                for (let i = 0; i < table.updates.length; i++) {
                    var time = moment.unix(table.updates[i].startTS).format("MMMM Do YYYY, h:mm:ss a");
                    html += '<div class="tableDetailRow" data-tablename="' + table.name + '">' +
                            '<div class="tableColumn sourceName" data-original-title="' + table.updates[i].source + '"><span class="dummy">a</span>' + table.updates[i].source + '</div>' +
                            '<div class="tableColumn batchId">' + table.updates[i].batchId + '</div>' +
                            '<div class="tableColumn">' + time + '</div>' +
                            '<div class="tableColumn">' + xcHelper.numToStr(table.updates[i].numRows) + '</div>' +
                            '</div>';
                }
                return;
            }
        });
        if (!html) {
            html = '<div class="tableDetailRow empty">No updates</div>'
        }

        $tableContent.html(html);
    }

    /**
     * Show the update prompt at given  position
     * x : center of prompt aligns to it
     * y : top of prompt
     */
    function showUpdatePrompt(x, y, hasPointInTime, multiple) {
        $updatePrompt.removeClass("xc-hidden");
        var promptWidth = $updatePrompt.outerWidth();
        var left = x - promptWidth / 2;
        if (left + promptWidth > $imdPanel.width()) {
            // if offscreen, position to far right and adjust arrow
            left = $imdPanel.width() - promptWidth;
            $updatePrompt.find(".arrow").css("left", x - left);
        } else {
            $updatePrompt.find(".arrow").css("left", "50%");
        }

        $updatePrompt.css({
            left: left,
            top: y + 10 // for arrow piece
        });
        if (multiple && pTables.length > 1) {
            $updatePrompt.find(".heading").text("Refresh Tables:");
        } else {
            $updatePrompt.find(".heading").text("Refresh Table:");
        }

        if (hasPointInTime) {
            $imdPanel.find(".pointInTime").removeClass("unavailable");
            xcTooltip.remove( $imdPanel.find(".pointInTime"));
        } else {
            $imdPanel.find(".pointInTime").addClass("unavailable");
            xcTooltip.add($imdPanel.find(".pointInTime"), {title: "Table did not yet exist at this point in time."});
        }
    }

    /**
     * Hide the update prompt
     */
    function hideUpdatePrompt() {
        $updatePrompt.addClass("xc-hidden");
        selectedCells = {};
        $imdPanel.find(".tableListItem").removeClass("selected");
        $imdPanel.find(".dateTipLineSelect").remove();
        $imdPanel.find(".selectedBar").remove();
    }

    /**
     * makes date tooltip box visible for given position with given date
     */

    function showDateTipBox(x, y, unixTime) {
        let winWidth = $imdPanel.width();
        var $tipBox = $imdPanel.find(".date-tipbox");
        $tipBox.show();
        let tipWidth =  Math.max(150, $tipBox.outerWidth());
        $tipBox.show();
        $tipBox.css({
            "top": y,
            "left": Math.min(winWidth - tipWidth, x - (tipWidth / 2))
        });
        $imdPanel.find(".dateTipLine").show();
        $imdPanel.find(".dateTipLine").css({
            "left": x
        });

        var format;
        if (ruler.uiScale > 600) {
            format = "MMMM Do YYYY, h:mm a"
        } else {
            format = "MMMM Do YYYY, h:mm:ss a";
        }
        $tipBox.html(moment.unix(unixTime).format(format));
    }

    /**
     * makes date tooltip box invisible
     */

    function hideDateTipBox() {
        $imdPanel.find(".date-tipbox").hide();
        $imdPanel.find(".dateTipLine").hide();
    }

    function getDate(dateStr, timeStr) {
        var completeTimeStr = dateStr + " " + timeStr.replace(" ", "");
        return new Date(completeTimeStr);
    }

    function checkDateChange() {
        let date1 = $("#imdFromInput").datepicker("getDate");
        let date2 = $("#imdToInput").datepicker("getDate");
        if (!date1 || !date2) {
            return;
        }

        let time1 = $("#imdBar").find(".fromTimeArea .timePickerBox").val();
        let time2 = $("#imdBar").find(".toTimeArea .timePickerBox").val();
        if (!time1 || !time2) {
            return;
        }
        date1 = $("#imdFromInput").val();
        date2 = $("#imdToInput").val();
        let ts1 = getDate(date1, time1);
        let ts2 = getDate(date2, time2);

        if (ts1.toString() === "Invalid Date" || ts2.toString() ===
            "Invalid Date") {
            return false;
        }

        ts1 = Math.floor(ts1 / 1000);
        ts2 = Math.ceil(ts2 / 1000);

        if (ts2 > ts1) {
            updateViewportForDateRange(ts1, ts2);
        }
    }

    /**
     * run once during setup
     */
    function setupTimeInputs() {
        $("#imdFromInput, #imdToInput").change(function () {
            checkDateChange();
        });

        $("#imdFromInput, #imdToInput").blur(function() {
            var date = $(this).val();
            var isValid = xcHelper.validate([
                {
                    "$ele": $(this),
                    "text": ErrTStr.NoEmpty,
                    "check": function() {
                        if (date !== "") {
                            return !testDate(date);
                        } else {
                            return false;
                        }
                    }
                }
            ]);

            if (isValid) {
                $(this).closest(".datePickerPart").removeClass("active");
            }
        });

        $("#imdFromInput").datepicker({
            "dateFormat": "m/d/yy",
            "beforeShow": function() {
                var $el = $("#ui-datepicker-div");
                $el.appendTo("#imdBar");
            }
        });
        $("#imdToInput").datepicker({
            "dateFormat": "m/d/yy",
            "beforeShow": function() {
                var $el = $("#ui-datepicker-div");
                $el.appendTo("#imdBar");
            }
        });

        fromTimePicker = new XcTimePicker($("#imdBar").find(".fromTimeArea .timePickerArea"), {
            onClose: function() {
                let curVal = $("#imdBar").find(".fromTimeArea .timePickerBox").val();
                if (curVal !== prevFromTime) {
                    prevFromTime = curVal;
                    checkDateChange();
                }
            }
        });

        toTimePicker = new XcTimePicker($("#imdBar").find(".toTimeArea .timePickerArea"), {
            onClose: function() {
                let curVal = $("#imdBar").find(".toTimeArea .timePickerBox").val();
                if (curVal !== prevToTime) {
                    prevToTime = curVal;
                    checkDateChange();
                }
            }
        });
    }

    /**
     * Add all event listeners here, It is run once during setup
     */
    function addEventListeners() {

        $imdPanel.find(".refreshList").on("click", function() {
            refreshTableList();
        });

        $imdPanel.find(".activeTablesList").contextmenu(function() {
            return false;
        });

        $imdPanel.find(".activeTablesList").on("mousedown", ".tableTimePanel", function (event) {
            var $clickedElement = $(this);
            var tableName = $clickedElement.data("name");

            var clickedTime = ((((event.pageX - $clickedElement.closest(".tableListHist").offset().left) + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS);
            var closestUpdate = getClosestUpdate(tableName, clickedTime);
            selectedCells = {};
            $imdPanel.find(".activeTablesList").find(".selectedBar").remove();
            $imdPanel.find(".dateTipLineSelect").remove();
            $imdPanel.find(".selected").removeClass("selected");
            var pos = event.pageX - $clickedElement.closest(".tableListHist").offset().left - 1;
            var selectedBar;
            if (closestUpdate === null) {
                // selectedBar = '<div class="selectedBar selectedInvalid" data-time="" style="left:' + pos + 'px"></div>';
                selectedCells[tableName] = 0
            } else {
                selectedCells[tableName] = closestUpdate;
            }
            $clickedElement.parent().addClass("selected");
            selectedBar = '<div class="selectedBar" data-time="" style="left:' + pos + 'px"></div>';
            $clickedElement.prepend(selectedBar);

            showUpdatePrompt(event.pageX - $imdPanel.offset().left,
                $clickedElement.offset().top  + $clickedElement.height() - $updatePrompt.parent().offset().top, closestUpdate !== null);
        });

        $imdPanel.find(".activeTablesList").on("mousedown", ".tableListItem", function (event) {
            var $clickedElement = $(this);
            var tableName = $clickedElement.data("name");

            $imdPanel.find(".tableListItem.selected").removeClass("selected");
            $clickedElement.addClass("selected");

            updateTableDetailSection(tableName);
        });

        $imdPanel.find(".activeTablesList").on("mousedown", ".tableListLeft", function() {
            hideUpdatePrompt();
        });

        $("#imdTimeCanvas").mousedown(function(event) {
            hideUpdatePrompt();
            $imdPanel.find(".selectedBar").remove();
            $imdPanel.find(".activeTablesList").find(".tableListItem").addClass("selected");
            var left = event.offsetX + leftPanelWidth;
            $imdPanel.append('<div class="dateTipLineSelect" style="left:' + left + 'px;"></div>');
            var clickedTime = (((event.offsetX + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS);

            selectedCells = {};
            pTables.forEach(function(table) {
                let tableName = table.name;
                var closestUpdate = getClosestUpdate(tableName, clickedTime);
                if (closestUpdate === null) {
                    selectedCells[tableName] = 0; // should we include these
                } else {
                    selectedCells[tableName] = closestUpdate;
                }
            });

            showUpdatePrompt(left, $canvas.height() + 10, true, true);
        });

        $imdPanel.find(".activeTablesList").on("click", ".hideTable", function() {
            var tableName = $(this).closest(".tableListItem").data("name");
            hideTable(tableName);
            xcTooltip.hideAll();
        });

        $imdPanel.find(".hiddenTablesList").on("click", ".showTable", function() {
            var tableName = $(this).closest(".tableListItem").data("name");
            showTable(tableName);
            xcTooltip.hideAll();
        });

        $imdPanel.on("click", ".deleteTable", function() {
            var tableName = $(this).closest(".tableListItem").data("name");
            Alert.show({
                'title': IMDTStr.DelTable,
                'msg': xcHelper.replaceMsg(IMDTStr.DelTableMsg, {
                    "tableName": tableName
                }),
                'onConfirm': function() {
                    deleteTable(tableName);
                }
            });
        });

        $updatePrompt.find(".close").click(function() {
            hideUpdatePrompt();
        });

        $updatePrompt.find(".btn.pointInTime").click(function() {
            if ($(this).hasClass("unavailable")) {
                return;
            }
            submitRefreshTables();
        });

        $updatePrompt.find(".btn.latest").click(function() {
            submitRefreshTables(true);
        });

        var timer;
        $scrollDiv.scroll(function () {
            clearTimeout(timer);
            timer = setTimeout(function() {
                updateTimeInputs();
            }, 300);
            if (!isScrolling) {
                updateHistory();
            }
        });

        $('.mainTableSection').on('mousewheel DOMMouseScroll', function (e) {
            if (e.offsetX > leftPanelWidth) {
                $scrollDiv.scrollLeft($scrollDiv.scrollLeft() + e.deltaX);
            }
        });
        $canvas.mousemove(function(event) {
            let clickedTime = (((event.offsetX + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS);
            showDateTipBox(event.offsetX + leftPanelWidth, $canvas.height(), clickedTime);
        });
        $canvas.mouseleave(function(){
            hideDateTipBox();
        });

        $canvas.on('mousewheel DOMMouseScroll', function (e) {
            let time = Math.round((((event.offsetX + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS));
            var canvasWidth = $canvas.width();
            let range = Math.round(canvasWidth * ruler.pixelToTime);
            var pctLeft = event.offsetX / canvasWidth;
            var delta = Math.max(e.deltaY, -3);
            delta = Math.min(delta, 3);

            // zoom in our out by
            if (delta > 0) { // zooming in
                range /= (1 + (delta / 5));
                if (range / canvasWidth < .15) { // when 6 pixels is less than 1 second
                    return;
                }
            } else if (delta < 0) { // zooming out
                range *=  (1 + (-delta / 5));
                if (range > (60 * 60 * 24 * 365 * 10)) { // 10 years in screen
                    return;
                }
            } else {
                return;
            }

            let min = time - Math.round(range * pctLeft);
            let max = time + Math.round(range * (1 - pctLeft));

            $("#imdFromInput").datepicker("setDate", new Date(min * 1000));
            $("#imdToInput").datepicker("setDate", new Date(max * 1000));
            fromTimePicker.showTimeHelper(new Date(min * 1000));
            toTimePicker.showTimeHelper(new Date(max * 1000));
            updateViewportForDateRange(min, max);
        });

        $imdPanel.on("click", ".progressCircle", function() {
            progressState.canceled = true;
        });

        $imdPanel.find(".tableList").on("mouseenter", ".tableName", function() {
            xcTooltip.auto(this);
        });

        $tableDetail.on("mouseenter", ".sourceName", function() {
            xcTooltip.auto(this);
        });

        $tableDetail.on("click", ".batchId", function() {
            let batchId = parseInt($(this).text());
            let name = $(this).closest(".tableDetailRow").data("tablename");
            pTables.forEach(function(table) {
                if (table.name === name) {
                    table.updates.forEach(function(update, i) {
                        if (update.batchId === batchId) {
                            let time = update.startTS;
                            let range = Math.round($("#imdTimeCanvas").width() * ruler.pixelToTime);

                            let mid = Math.round(range / 2);
                            let min = time - mid;
                            var max = time + mid;

                            $("#imdFromInput").datepicker("setDate", new Date(min * 1000));
                            $("#imdToInput").datepicker("setDate", new Date(max * 1000));
                            fromTimePicker.showTimeHelper(new Date(min * 1000));
                            toTimePicker.showTimeHelper(new Date(max * 1000));
                            updateViewportForDateRange(min, max);
                            selectedCells = {};
                            var closestUpdate = batchId;

                            $imdPanel.find(".activeTablesList").find(".selectedBar").remove();
                            $imdPanel.find(".dateTipLineSelect").remove();
                            $imdPanel.find(".selected").removeClass("selected");
                            isScrolling = true; // prevents scroll event from firing and closing update prompt

                            selectedCells[table.name] = closestUpdate;
                            var $clickedElement = $imdPanel.find('.tableListItem[data-name="' +
                                        table.name +'"]').find(".tableTimePanel");
                            var $updateLine = $clickedElement.find('.indicator' + i);
                            var pageX = $updateLine.offset().left;
                            var pos = pageX - $clickedElement.closest(".tableListHist").offset().left - 1;

                            $clickedElement.parent().addClass("selected");
                            var selectedBar = '<div class="selectedBar" data-time="" style="left:' + pos + 'px"></div>';
                            $clickedElement.prepend(selectedBar);

                            showUpdatePrompt(pageX - $imdPanel.offset().left,
                            $clickedElement.offset().top  + $clickedElement.height() -
                            $updatePrompt.parent().offset().top, true);

                            setTimeout(function() { // need to delay
                                isScrolling = false;
                            }, 1);
                            return;
                        }
                    });
                    return;
                }
            })
        });
    }

    function submitRefreshTables(latest?: boolean) {
        var tables = [];

        for (let i in selectedCells) {
            let maxBatch = selectedCells[i];
            let columns = [];
            pTables.forEach(function(table) {
                if (table.name === i) {
                    columns = table.values;
                    if (latest) {
                        maxBatch = table.updates.length - 1;
                    }
                    return;
                }
            });
            tables.push({
                pubTableName: i,
                dstTableName: i,
                minBatch: 0,
                maxBatch: maxBatch,
                columns: columns
            });
        }

        hideUpdatePrompt();

        if (tables.length) {
            return IMDPanel.refreshTablesToWorksheet(tables);
        } else {
            return PromiseHelper.reject();
        }
    }

    /*
        iterate all visible tables
        iterate updates of all visible tables.
        calculate their time to pixel value
        if it is within the visible history range , add div with left border and a text (update id)
    */
    function updateHistory() {
        if (!pTables) {
            return;
        }
        ruler.visibleLeft = $scrollDiv.scrollLeft();
        ruler.visibleRight = $scrollDiv.scrollLeft() + $scrollDiv.width();
        hideUpdatePrompt();
        redrawTimeCanvas();
        pTables.forEach(function(table) {
            var $histPanel = $(".tableTimePanel[data-name=\"" + table.name + "\"]");
            $histPanel.empty();
            if ($histPanel.offset().top < 1000) {
                var positions = [];
                table.updates.forEach(function(update, i) {
                    var tStampPx = parseFloat(update.startTS - ruler.minTS) / parseFloat(ruler.pixelToTime);
                    if (tStampPx > ruler.visibleLeft && tStampPx < ruler.visibleRight) {
                        var pos = tStampPx - ruler.visibleLeft;
                        positions.push({
                            left: pos,
                            right: pos + 8 + (("" + update.batchId).length * 7),
                            id: i
                        });
                        var $htmlElem = $('<div class="updateIndicator indicator' + i + '" ' +
                                            xcTooltip.Attrs +
                                            ' data-original-title="' +
                                            moment.unix(update.startTS).format("MMMM Do YYYY, h:mm:ss a") + '">' +
                                            '<span class="text">'  +
                                            parseInt(update.batchId) + '</span></div>');
                        $histPanel.append($htmlElem);
                        $htmlElem.css("left", pos);
                    }
                });
                positions.sort(function(a, b) {
                    return a.left > b.left;
                });
                // hide text in lines that overlap
                for (var i = 1; i < positions.length; i++) {
                    if (positions[i].left < positions[i - 1].right) {
                        $histPanel.find(".indicator" + positions[i - 1].id).addClass("overlap");
                    }
                }

            }
        });
    }

    /**
     * returns the closest update for given unixtime and table
     * find table in pTables
     * look for the update closest t0 given timestamp
     * This function will have to be used to actually call the resfresh API
     */
    function getClosestUpdate(tName, targetTS) {
        var closestUpdate = null;
        pTables.forEach(function(table) {
            if (table.name == tName) {
                //updated may not sorted by timestamp , need to check all of them
                for (var i = 0; i < table.updates.length; i++) {
                    var update = table.updates[i];
                    if (!update.startTS || update.startTS > targetTS) {
                        continue;
                    }
                    if ((closestUpdate === null) || (targetTS - update.startTS) < (targetTS - closestUpdate.startTS)) {
                        closestUpdate = update;
                    }
                }
            }
        });
        if (closestUpdate) {
            return closestUpdate.batchId;
        } else {
            return closestUpdate;
        }
    }

    /**
     * iterate all tables
     * get handle to history div
     * iterate all updates
     * Calculate min max etc that will be used in update history
     */
    function initTimePanels(tables: object[], rangeMin?: number, rangeMax?: number) {
        //global time start and end for history panel
        if(!tables){
            return;
        }

        ruler.minTS = Math.round(+new Date() / 1000);
        ruler.maxTS = ruler.minTS;
        if (rangeMin) {
            ruler.minTS = Math.min(ruler.minTS, rangeMin);
        }
        if (rangeMax) {
            ruler.maxTS = Math.max(ruler.maxTS, rangeMax);
        }
        tables.forEach(function (table) {
            table["updates"].forEach(function (update) {
                if (update.startTS < ruler.minTS) {
                    ruler.minTS = update.startTS;
                }
                if (update.startTS > ruler.maxTS) {
                    ruler.maxTS = update.startTS;
                }
            });
        });

        var $fakeArea = $imdPanel.find(".fakeArea");
        var $scrollDiv = $imdPanel.find(".scrollDiv");
        $fakeArea.width(parseFloat(ruler.maxTS - ruler.minTS) / parseFloat(ruler.pixelToTime));
        // position the scrollbar
        var scrollPosition;
        if (rangeMax) {
            scrollPosition = (rangeMin - ruler.minTS) / ruler.pixelToTime;
        } else {
            scrollPosition = (ruler.maxTS - ruler.minTS) / ruler.pixelToTime;
        }

        $scrollDiv.scrollLeft(scrollPosition);
    }

    /**
     * Pull tables from Xcalar Api
     * Create html elems for tables
     * call renderTimePanels function that renders the time panel
     */
    function listTablesFirstTime(firstTime: boolean) {
        let startTime = Date.now();
        showWaitScreen();

        listAndCheckActive()
        .then(function(tables) {
            pTables = tables;
            return restoreHiddenTables();
        })
        .then(function() {
            let html = getListHtml(pTables);
            $imdPanel.find(".activeTablesList").html(html);
            initScale();
            if (pTables.length) {
                updateTableDetailSection(pTables[0].name);
            }
            if (hTables.length) {
                html = getListHtml(hTables);
                $imdPanel.find(".hiddenTablesListItems").append(html);
            }
        })
        .fail(function (error) {
            Alert.error("Error!", error);
        })
        .always(function() {
            let timeDiff = Date.now() - startTime;
            if (timeDiff < 1200) {
                setTimeout(function() {
                    removeWaitScreen();
                }, 1200 - timeDiff);
            } else {
                removeWaitScreen();
            }
        });
    }

    function restoreHiddenTables() {
        var deferred = PromiseHelper.deferred();
        var key = KVStore.getKey("gIMDKey");
        var kvStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then(function(imdMeta) {
            if (imdMeta) {
                try {
                    imdMeta = $.parseJSON(imdMeta);
                    if (imdMeta) {
                       let hiddenTables = imdMeta.hiddenTables;
                       for (let i = 0; i < pTables.length; i++) {
                            let table = pTables[i];
                            if (hiddenTables.indexOf(table.name) !== -1) {
                                pTables.splice(i, 1);
                                hTables.push(table);
                                i--;
                            }
                       }
                    }
                } catch (err) {
                    console.error(err);
                }
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // list tables and if inactive ones are found, restore them. Restoration
    // can be canceled and if so, unpublish the inactive tables that
    // haven't been restored yet
    function listAndCheckActive() {
        var deferred = PromiseHelper.deferred();
        let activeTables = [];
        let inactiveTables = [];
        let listPassed = false;

        XcalarListPublishedTables("*")
        .then(function (result) {
            listPassed = true;
            let promises = [];
            let inactiveCount = 0;
            progressState.canceled = false;
            result.tables.forEach(function(table) {
                if (!table.active) {
                    inactiveTables.push(table);
                    promises.push(function() {
                        inactiveCount++;
                        if (progressState.canceled) {
                            return PromiseHelper.reject({
                                error: "canceled",
                                count: inactiveCount - 1
                            });
                        } else {
                            return restoreTable(table.name);
                        }
                    });
                } else {
                    activeTables.push(table);
                }
            });

            if (promises.length) {
                showProgressCircle(result.tables.length, activeTables.length);
            }

            return PromiseHelper.chain(promises);
        })
        .then(function() {
            listOnlyActiveTables()
            .then(deferred.resolve)
            .fail(deferred.reject);
        })
        .fail(function(error) {
            if (listPassed) {
                if (error && error.error === "canceled") {
                    // user canceled part way through restoration
                    // unpublish the rest of the inactive tables
                    // and add the restored ones to the activeTables list
                    var promises = [];
                    for (var i = error.count; i < inactiveTables.length; i++) {
                        promises.push(XcalarUnpublishTable(inactiveTables[i].name));
                    }
                    PromiseHelper.when.apply(this, promises)
                    .always(function() {
                        listOnlyActiveTables()
                        .then(deferred.resolve)
                        .fail(deferred.reject);
                    });
                } else { // restoration failed without being canceled
                    // list tables and find out which ones succeeded
                    listOnlyActiveTables()
                    .then(deferred.resolve)
                    .fail(function() {
                        deferred.resolve(activeTables);
                    });
                }
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    function restoreTable(tableName) {
        var deferred = PromiseHelper.deferred();
        XcalarRestoreTable(tableName)
        .then(function() {
            progressCircle.increment();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function listOnlyActiveTables() {
        var deferred = PromiseHelper.deferred();
        XcalarListPublishedTables("*")
        .then(function (result) {
            let activeTables = [];
            result.tables.forEach(function(table) {
                if (table.active) {
                    activeTables.push(table);
                }
            });
            deferred.resolve(activeTables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
    /**
     * Create HTML List for publlished tables
     */
    function getListHtml(tables) {
        var html = "";
        tables.forEach(function(table) {
            html += "<div data-name=\"" + table.name + "\" class=\"listBox listInfo tableListItem\">\
                <div class =\"tableListLeft\">\
                    <div class=\"iconWrap\"></div>\
                    <span class=\"tableName\" data-original-title=\"" + table.name + "\">" + table.name + "</span>\
                    <i class=\"icon xi-trash deleteTable tableIcon\" title=\"Delete published table\" data-toggle=\"tooltip\" \
                    data-placement=\"top\" data-container=\"body\"></i> \
                    <i class=\"icon xi-hide hideTable tableIcon\" title=\"Hide published table\" data-toggle=\"tooltip\" \
                    data-placement=\"top\" data-container=\"body\"></i>\
                    <i class=\"icon xi-show showTable tableIcon\" title=\"Show published table\" data-toggle=\"tooltip\" \
                    data-placement=\"top\" data-container=\"body\"></i>\
                </div>\
                <div class = \"tableListHist tableTimePanel\" data-name=\"" + table.name + "\"></div> \
            </div>";
        });

        return html;
    }

    // creates a new worksheet and puts tables there
    interface RefreshTableInfos {
        pubTableName: string,
        dstTableName: string,
        minBatch: number,
        maxBatch: number,
        columns: object[]
    }

    export function refreshTablesToWorksheet(tableInfos: RefreshTableInfos[]) {
        let deferred = PromiseHelper.deferred();
        let wsId;
        let numTables = tableInfos.length;
        tableInfos.forEach(function (tableInfo) {
            tableInfo.dstTableName += Authentication.getHashId();
        });

        let sql = {
            "operation": SQLOps.RefreshTables,
            "tableNames": tableInfos.map(function (tableInfo) {
                return tableInfo.dstTableName;
            })
        };
        let txId = Transaction.start({
            "msg": "Refreshing tables",
            "operation": SQLOps.RefreshTables,
            "sql": sql,
            "track": true
        });
        let wsName = "imd";

        refreshTables(tableInfos, txId)
        .then(function () {
            wsId = WSManager.addWS(null, wsName);
            let promises = [];

            tableInfos.forEach(function (tableInfo) {
                let newTableCols = [];
                tableInfo.columns.forEach(function(col) {
                    let progCol = ColManager.newCol({
                        backName: col.name,
                        name: col.name,
                        isNewCol: false,
                        sizedTo: "header",
                        type: xcHelper.getColTypeIcon(DfFieldTypeT[col.type]),
                        knownType: true,
                        width: xcHelper.getDefaultColWidth(col.name),
                        userStr: '"' + col.name + '" = pull(' + col.name + ')'
                    });
                    newTableCols.push(progCol);
                });

                newTableCols.push(ColManager.newDATACol());
                promises.push(TblManager.refreshTable.bind(this, [tableInfo.dstTableName],
                    newTableCols, null, wsId, txId));
            });
            return PromiseHelper.chain(promises);
        })
        .then(function () {
            sql.worksheet = wsId;
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(tableInfos[numTables - 1].dstTableName),
                "title": "Refresh Tables",
                "sql": sql
            });
            deferred.resolve();
        })
        .fail(function (error) {
            Transaction.fail(txId, {
                "failMsg": "Table refresh failed",
                "error": error,
                "noAlert": true,
                "title": "Table refresh"
            });
            Alert.error("Table refresh failed", error);
            deferred.reject(error);
        });

        return PromiseHelper.deferred();
    }

    function refreshTables(
        tableInfos: RefreshTableInfos[],
        txId: number
    ): XDPromise<any> {
        let promises = [];
        tableInfos.forEach(function (tableInfo) {
            promises.push(XcalarRefreshTable(tableInfo.pubTableName,
                tableInfo.dstTableName,
                tableInfo.minBatch,
                tableInfo.maxBatch,
                txId));
        });

        return PromiseHelper.when.apply(this, promises);
    }

    function hideTable(tableName) {
        const $listItem = $imdPanel.find('.tableListItem[data-name="' + tableName + '"]');
        $listItem.remove();
        $listItem.removeClass("active selected");
        $listItem.find(".selectedBar").remove();
        $listItem.appendTo($imdPanel.find(".hiddenTablesListItems"));
        pTables.forEach(function(table, i) {
            if (table.name === tableName) {
                pTables.splice(i, 1);
                hTables.push(table);
                return;
            }
        });
        storeHiddenTables();
    }

    function storeHiddenTables() {
        let kvsKey = KVStore.getKey("gIMDKey");
        let kvStore = new KVStore(kvsKey, gKVScope.WKBK);
        let hiddenTables = hTables.map(function(table) {
            return table.name;
        });
        let imdInfo = {
            hiddenTables: hiddenTables
        };
        return kvStore.put(JSON.stringify(imdInfo), true);
    }

    function showTable(tableName) {
        const $listItem = $imdPanel.find('.tableListItem[data-name="' + tableName + '"]');
        $listItem.remove();
        $listItem.removeClass("active selected");
        $listItem.find(".selectedBar").remove();
        $listItem.appendTo($imdPanel.find(".activeTablesList"));
        hTables.forEach(function(table, i) {
            if (table.name === tableName) {
                hTables.splice(i, 1);
                pTables.push(table);
                return;
            }
        });
        storeHiddenTables();
    }

    export function getAll() {
        return {
            hidden: hTables,
            published: pTables
        }
    }

    function deleteTable(tableName) {
        const deferred = PromiseHelper.deferred();

        const $listItem = $imdPanel.find('.tableListItem[data-name="' +
                                         tableName + '"]');
        $listItem.addClass("locked");

        XcalarUnpublishTable(tableName)
        .then(function() {
            cleanUpAfterDeleteTable(info.tableName);
            XcSocket.Instance.sendMessage("refreshIMD", {
                "action": "delete",
                "tableName": tableName
            });
            deferred.resolve();
        })
        .fail(function() {
            $listItem.removeClass("locked");
            xcHelper.showFail(FailTStr.RmPublishedTable);
            deferred.reject.apply(this, arguments);
        });

        return deferred.promise();
    }

    export function updateInfo(info) {
        if (info.action === "delete") {
            cleanUpAfterDeleteTable(info.tableName);
        }
    }

    function cleanUpAfterDeleteTable(tableName) {
        const $listItem = $imdPanel.find('.tableListItem[data-name="' +
                                         tableName + '"]');
        delete selectedCells[tableName];
        let found = false;
        pTables.forEach(function(table, i) {
            if (table.name === tableName) {
                pTables.splice(i, 1);
                found = true;
                return;
            }
        });
        if (!found) {
            hTables.forEach(function(table, i) {
                if (table.name === tableName) {
                    hTables.splice(i, 1);
                    return;
                }
            });
        }
        $listItem.remove();
    }

    function testDate(str){
        var template = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (template === null) {
            return false;
        }
        var inputDay = template[2];
        var inputMonth = template[1];
        var inputYear = template[3];
        var date = new Date(str + " utc");
        if (date.toString() === "Invalid Date") {
            return false;
        }
        var day = date.getUTCDate();
        var month = date.getUTCMonth();
        var year = date.getUTCFullYear();

        return Number(inputDay) === day &&
               (Number(inputMonth) - 1) === month &&
               Number(inputYear) === year;
    }

    function updateTimeInputs() {
        let min = ruler.visibleLeft * ruler.pixelToTime + ruler.minTS;
        let max = ($canvas.parent().width() + ruler.visibleLeft) * ruler.pixelToTime + ruler.minTS;
        $("#imdFromInput").datepicker("setDate", new Date(min * 1000));
        $("#imdToInput").datepicker("setDate", new Date(max * 1000));
        fromTimePicker.showTimeHelper(new Date(min * 1000));
        toTimePicker.showTimeHelper(new Date(max * 1000));
    }

    function refreshTableList() {
        hideUpdatePrompt();
        showWaitScreen();

        var startTime = Date.now();

        listOnlyActiveTables()
        .then(function(tables) {
            let foundPTables = {};
            let foundHTables = {};
            let numPTables = pTables.length;
            tables.forEach(function(table) {
                if (table.active) {
                    var inHTables = false;
                    hTables.forEach(function(hTable, i) {
                        if (hTable.name === table.name) {
                            hTables[i] = table;
                            inHTables = true;
                            foundHTables[table.name] = true;
                            return;
                        }
                    });

                    if (!inHTables) {
                        var found = false;
                        pTables.forEach(function(pTable, i) {
                            if (pTable.name === table.name) {
                                pTables[i] = table;
                                found = true;
                                foundPTables[table.name] = true;
                                return;
                            }
                        });
                        if (!found) {
                            pTables.push(table);
                        }
                    }
                }
            });
            for (let i = 0; i < numPTables; i++) {
                if (!foundPTables[pTables[i].name]) {
                    pTables.splice(i, 1);
                    i--;
                    numPTables--;
                }
            }
            for (let i = 0; i < hTables.length; i++) {
                if (!foundHTables[hTables[i].name]) {
                    hTables.splice(i, 1);
                    i--;
                }
            }
            var html = getListHtml(pTables);
            $imdPanel.find(".activeTablesList").html(html);
            checkDateChange();
            if (pTables.length) {
                updateTableDetailSection(pTables[0].name);
            } else {
                updateTableDetailSection();
            }
        })
        .fail(function (error) {
            Alert.error("Error!", error);
        })
        .always(function() {
            let timeDiff = Date.now() - startTime;
            if (timeDiff < 1200) {
                setTimeout(function() {
                    removeWaitScreen();
                }, 1200 - timeDiff);
            } else {
                removeWaitScreen();
            }
        })
    }

    function showWaitScreen() {
        var $waitingBg = $('<div id="modalWaitingBG">' +
                            '<div class="waitingIcon"></div>' +
                        '</div>');
        $imdPanel.append($waitingBg);
        setTimeout(function() {
            $waitingBg.find('.waitingIcon').fadeIn();
        }, 200);
    }

    function removeWaitScreen() {
        $('#modalWaitingBG').fadeOut(200, function() {
            $(this).remove();
            progressState.canceled = false;
        });
    }

    export function needsUpdate() {
        if (isPanelActive) {
            refreshTableList();
        } else {
            isPendingRefresh = true;
        }
    }

    function showProgressCircle(numSteps, numCompleted) {
        let $waitSection = $("#modalWaitingBG");
        $waitSection.addClass("hasProgress");
        let progressAreaHtml = xcHelper.getLockIconHtml("listIMD", 0, true, true);
        $waitSection.html(progressAreaHtml);
        $waitSection.find(".stepText").addClass("extra").append(
            '<span class="extraText">' + IMDTStr.Activating + '</span>')
        progressCircle = new ProgressCircle("listIMD", 0, true, {steps: numSteps});
        $waitSection.find(".cancelLoad").data("progresscircle",
                                                progressCircle);
        progressCircle.update(numCompleted, 1000);
    }
}
