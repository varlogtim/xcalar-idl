// sets up monitor panel and system menubar
namespace IMDPanel {
    let $imdPanel: JQuery;
    let $canvas: JQuery;
    let $tableDetail: JQuery; //$(".tableDetailSection")
    const tickColor = "#888888";
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
        minTs: null
    };
    let selectedCells = {};
    let $scrollDiv: JQuery;
    let toTimePicker: object;
    let fromTimePicker: object;
    let prevFromTime: string;
    let prevToTime: string;
    let isPendingRefresh = false;
    let isActive = false;

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
        isActive = true;
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
            listTables(firstTouch);
        } else if (isPendingRefresh) {
            refreshTableList();
        }
        isPendingRefresh = false;
    }

    export function inActive() {
        isActive = false;
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

        pTables.forEach(function(table) {
            if (table["updates"].length && table["updates"][table["updates"].length - 1]) {
                min = Math.min(min, table["updates"][table["updates"].length - 1].startTS);
            }
        });

        // if new min is detected, increase range a little bit so the min is not
        // all the way on the left side
        if (max - min !== seconds) {
            min -= Math.floor((max - min) * 0.05);
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
        // let formatHash = [
        //     {limit: 3600, format: "h:mm:ss a"}, //up to one hour
        //     {limit: 43200, format: "h:mm:ss a"}, //up to 12 hours
        //     {limit: 86400, format: "h:mm:ss a"}, //up to a day
        //     {limit: 604800, format: "MMMM Do"}, //up to a week
        //     {limit: 18144000, format: "'MMMM / YYYY"}, //up to a month
        //     {limit: 18144000 * 12, format: "MMMM Do YYYY"}, //up to a year
        // ];

        let formatHash = [
            {limit: 0, format: "h:mm:ss a"},
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
       // formatStr = "MMMM Do YYYY\nh:mm:ss a";
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
                    html += '<div class="tableDetailRow">' +
                            '<div class="tableColumn">' + table.updates[i].source + '</div>' +
                            '<div class="tableColumn">' + table.updates[i].batchId + '</div>' +
                            '<div class="tableColumn">' + time + '</div>' +
                            '<div class="tableColumn">' + 'N/A' + '</div>' +
                            '</div>';
                }
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
     * tableName : default value of the table name input
     */
    function showUpdatePrompt(x, y, tableName) {
        $updatePrompt.removeClass("xc-hidden");
        var left = x - $updatePrompt.outerWidth() / 2;
        $updatePrompt.css({
            left: left,
            top: y + 8
        });
        $imdPanel.find(".updatePromptText").val(tableName);
    }

    /**
     * Hide the update prompt
     */
    function hideUpdatePrompt() {
        $updatePrompt.addClass("xc-hidden");
        selectedCells = {};
        $imdPanel.find(".tableListItem").removeClass("selected");
        $imdPanel.find(".selectedBar").remove();
    }

    /**
     * makes date tooltip box visible for given position with given date
     */

    function showDateTipBox(x, y, unixTime) {

        let winWidth = $(window).width() - 60;
        var $tipBox = $imdPanel.find(".date-tipbox");
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
        // var completeTimeStr = dateStr + " " + timeStr.replace(" ", "") + " utc";
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
            maxDate: 0,
            "dateFormat": "m/d/yy",
            "beforeShow": function() {
                var $el = $("#ui-datepicker-div");
                $el.appendTo("#imdBar");
            }
        });
        $("#imdToInput").datepicker({
            maxDate: 0,
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
            var tableName = $clickedElement.attr("data-action").split("-")[1];

            var clickedTime = ((((event.pageX - $clickedElement.closest(".tableListHist").offset().left) + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS);
            var closestUpdate = getClosestUpdate(tableName, clickedTime);
            if (closestUpdate === null) {
                delete selectedCells[tableName];
                $clickedElement.parent().removeClass("selected");
                $clickedElement.find(".selectedBar").remove();
            } else {
                selectedCells[tableName] = closestUpdate;
                $clickedElement.parent().addClass("selected");
                $clickedElement.find(".selectedBar").remove();
                var $indicator = $clickedElement.find(".indicator" + closestUpdate);
                var pos;
                if ($indicator.length) {
                    pos = $indicator.position().left + "px";
                } else {
                    pos = "0%";
                }
                var selectedBar = '<div class="selectedBar" style="width:' +
                                  pos + '"></div>';
                $clickedElement.prepend(selectedBar);
            }
            showUpdatePrompt(event.pageX - $imdPanel.offset().left,
                $clickedElement.offset().top  + $clickedElement.height() - $updatePrompt.parent().offset().top, tableName)
            // return false;
        });

        $imdPanel.find(".activeTablesList").on("mousedown", ".tableListItem", function (event) {
            var $clickedElement = $(this);
            var tableName = $clickedElement.attr("data-action").split("-")[1];

            $imdPanel.find(".tableListItem.active").removeClass("active");
            $clickedElement.addClass("active");

            updateTableDetailSection(tableName);
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
            submitRefreshTables($updatePrompt.find(".updatePromptText").val());
        });

        $updatePrompt.find(".btn.latest").click(function() {
            submitRefreshTables(true, $updatePrompt.find(".updatePromptText").val());
        });

        var timer;
        $scrollDiv.scroll(function () {
            clearTimeout(timer);
            timer = setTimeout(function() {
                updateTimeInputs();
            }, 300);
            updateHistory();
        });

        $('.mainTableSection').on('mousewheel DOMMouseScroll', function (e) {
            if (e.offsetX > leftPanelWidth) {
                $scrollDiv.scrollLeft($scrollDiv.scrollLeft() + e.deltaX);
            }
        });
        $("#imdTimeCanvas").mousemove(function(event) {
            var clickedTime = (((event.offsetX + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS);
            showDateTipBox(event.offsetX + leftPanelWidth, $("#imdTimeCanvas").height(),clickedTime);
        });
        $("#imdTimeCanvas").mouseleave(function(){
            hideDateTipBox();
        });

    }

    function submitRefreshTables(tName: string, latest?: boolean) {
        let isValid = xcHelper.tableNameInputChecker($updatePrompt.find(".updatePromptText"));
        if (!isValid) {
            return;
        }
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
            return IMDPanel.refreshTablesToWorksheet(tName, tables);
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
            var $histPanel = $("[data-action=\"HIST-" + table.name + "\"]");
            $histPanel.empty();
            var batchID = 0;
            if ($histPanel.offset().top < 1000) {
                var positions = [];
                table["updates"].forEach(function(update, i) {
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
                    batchID++;
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
        var closestId = null;
        pTables.forEach(function (table) {
            if (table.name == tName) {
                //updated may not sorted by timestamp , need to check all of them
                for (var i = 0; i < table.updates.length; i++) {
                    var update = table.updates[i];
                    if (!update.startTS || update.startTS > targetTS) {
                        continue;
                    }
                    if ((closestUpdate === null) || (targetTS - update.startTS) < (targetTS - closestUpdate.startTS)) {
                        closestUpdate = update;
                        closestId = i;
                    }
                }
            }
        });
        return closestId;
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
    function listTables(firstTime: boolean) {
        let startTime = Date.now();
        showWaitScreen();

        listAndCheckActive()
        .then(function(tables) {
            pTables = tables;
            var html = getListHtml(pTables);
            $imdPanel.find(".activeTablesList").html(html);
            initScale();
            if (pTables.length) {
                updateTableDetailSection(pTables[0].name);
            }
        })
        .fail(function (error) {
            Alert.error("Error!", error);
        })
        .always(function() {
            let timeDiff = Date.now() - startTime;
            if (timeDiff < 1500) {
                setTimeout(function() {
                    removeWaitScreen();
                }, 1500 - timeDiff);
            } else {
                removeWaitScreen();
            }
        });
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
            let state = {canceled: false}; //XXX to be made externally available
            result.tables.forEach(function(table) {
                if (!table.active) {
                    inactiveCount++;
                    inactiveTables.push(table);
                    promises.push(function() {
                        if (state.canceled) {
                            return PromiseHelper.reject({
                                error: "canceled",
                                count: inactiveCount
                            });
                        } else {
                            return XcalarRestoreTable(table.name);
                        }
                    });
                } else {
                    activeTables.push(table);
                }
            });

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
            html += "<div data-name=\"" + table.name + "\" data-action=\"SELECT-" + table.name + "\" class=\"listBox listInfo tableListItem\">\
                <div class =\"tableListLeft\">\
                    <div class=\"iconWrap\"></div>\
                    <span class=\"tableName\">" + table.name + "</span>\
                    <i class=\"icon xi-trash deleteTable tableIcon\" title=\"Delete published table\" data-toggle=\"tooltip\" \
                    data-placement=\"top\" data-container=\"body\"></i> \
                    <i class=\"icon xi-hide hideTable tableIcon\" title=\"Hide published table\" data-toggle=\"tooltip\" \
                    data-placement=\"top\" data-container=\"body\"></i>\
                    <i class=\"icon xi-show showTable tableIcon\" title=\"Show published table\" data-toggle=\"tooltip\" \
                    data-placement=\"top\" data-container=\"body\"></i>\
                </div>\
                <div class = \"tableListHist tableTimePanel\" data-action=\"HIST-" + table.name + "\"></div> \
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

    export function refreshTablesToWorksheet(prefix: string, tableInfos: RefreshTableInfos[]) {
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
        if (prefix) {
            wsName += "_" + prefix;
        }

        refreshTables(prefix, tableInfos, txId)
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
                "title": "Refresh finished",
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
        prefix: string,
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
            deferred.resolve();
        })
        .fail(function() {
            $listItem.removeClass("locked");
            xcHelper.showFail(FailTStr.RmPublishedTable);
            deferred.reject.apply(this, arguments);
        });

        return deferred.promise();
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
            pTables = [];
            newHTables = [];
            tables.forEach(function(table) {
                if (table.active) {
                    var inHTables = false;
                    for (var i = 0; i < hTables.length; i++) {
                        if (hTables[i].name === table.name) {
                            inHTables = true;
                            newHTables.push(table);
                        }
                    }
                    if (!inHTables) {
                        pTables.push(table);
                    }
                }
            });
            hTables = newHTables;
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
            if (timeDiff < 1500) {
                setTimeout(function() {
                    removeWaitScreen();
                }, 1500 - timeDiff);
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
        });
    }

    export function needsUpdate() {
        if (isActive) {
            refreshTableList();
        } else {
            isPendingRefresh = true;
        }
    }
}
