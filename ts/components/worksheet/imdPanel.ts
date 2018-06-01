// sets up monitor panel and system menubar
namespace IMDPanel {
    interface UpdateInfo {
        startTS: number;
        batchId: number;
        numRows: number;
        source: string;
    }

    interface PublishTable {
        updates: UpdateInfo[];
        name: string;
        values: TableCol[]
    }

    interface Ruler {
        pixelToTime: number;
        visibleLeft: number;
        visibleRight: number;
        uiScale: number;
        minTS: number;
        maxTS: number;
    }

    interface ProgressState {
        canceled: boolean;
    }

    interface TableCol {
        name: string;
        type: string;
    }

    interface RefreshTableInfos {
        pubTableName: string,
        dstTableName: string,
        minBatch: number,
        maxBatch: number,
        columns: TableCol[]
    }

    let $imdPanel: JQuery;
    let $canvas: JQuery;
    let $tableDetail: JQuery; //$(".tableDetailSection")
    const tickColor: string = "#777777";
    const tickWidth: number = 1;
    const tickSpacing: number = 6;
    const tickHeight: number = 12;
    const tickHeightLarge: number = 20;
    const largeTickInterval: number = 5;
    const tickTextInterval: number = 20;
    let pTables: PublishTable[]; //published tables return from thrift call
    let hTables: PublishTable[]; // hidden tables
    let $updatePrompt: JQuery;
    const leftPanelWidth: number = 280;
    //ruler object
    let ruler: Ruler = {
        pixelToTime: 1000 /*1 pxel = 1 seconds*/,
        visibleLeft: 0,
        visibleRight: 0,
        uiScale: null,
        minTS: null,
        maxTS: null
    };
    let selectedCells: object = {};
    let $scrollDiv: JQuery;
    let toTimePicker: XcTimePicker;
    let fromTimePicker: XcTimePicker;
    let prevFromTime: string;
    let prevToTime: string;
    let isPendingRefresh = false;
    let isPanelActive = false;
    let progressCircle: ProgressCircle; // for progress of activating tables
    let progressState: ProgressState = {canceled: false};
    let isScrolling: boolean = false;

    /**
     * IMDPanel.setup
     */
    export function setup(): void {
        $imdPanel = $("#imdView");
        $canvas = $("#imdTimeCanvas");
        $updatePrompt = $imdPanel.find(".update-prompt");
        $scrollDiv = $imdPanel.find(".scrollDiv");
        $tableDetail = $(".tableDetailSection");
        pTables = [];
        hTables = [];

        setupTimeInputs();
        addEventListeners();
    }

    /**
     * IMDPanel.active
     * @param firstTouch
     * can modify to take in a pattern if needed but for now, fetching all
     * when the imd sub panel becomes active, refresh the time canvas
     * and add a window resize listener that trigers canvas redraw
     */
    export function active(firstTouch: boolean): void {
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
            listTablesFirstTime();
        } else if (isPendingRefresh) {
            refreshTableList();
        }
        isPendingRefresh = false;
    }

    /**
     * IMDPanel.inActive
     */
    export function inActive(): void {
        if (!isPanelActive) {
            return;
        }
        isPanelActive = false;
        $(window).off("resize.canvasResize");
        hideUpdatePrompt();
    }

    /**
     * update history bar in a way that given two dates fits in it
     * ts1 : unix time stamp of from
     * ts2 : unix time stamp of to
     */
    function updateViewportForDateRange(ts1: number, ts2: number): void {
        const numberOfUnits: number = $canvas.width() / tickSpacing;
        const scale: number = (ts2 - ts1) / numberOfUnits;
        updateScale(scale, ts1, ts2);
    }

    // for the first time that we list tables, we create a range that shows
    // everything
    function initScale(): void {
        const canvasWidth: number = $canvas.parent().width();
        // default is 1 tick per second
        const seconds: number = Math.ceil(canvasWidth / tickSpacing);
        let max: number = Math.ceil(Date.now() / 1000);
        let min: number = max - seconds;
        let tempMax: number = 0;

        pTables.forEach((table) => {
            const len: number = table.updates.length;
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
        let range: number = max - min;
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
    function updateScale(
        scale: number,
        rangeMin: number,
        rangeMax: number
    ): void {
        ruler.uiScale = scale; //cache scale value
        if (scale <= 0) { //make sure to avoid div by zero or neg values
            scale = 1;
        }

        ruler.pixelToTime = parseFloat(<any>scale) / parseFloat(<any>tickSpacing);
        initTimePanels(pTables, rangeMin, rangeMax);
        updateHistory();
    }

    function timeString(timeStamp: number): string {
        let formatHash = [
            {limit: 10, format: "h:mm:ss a"},
            {limit: 1800, format: "h:mm a"}, //up to 1/2 hour
            {limit: 86400, format: "MMMM Do"}, //up to 24 hours
            {limit: 18144000, format: "MMMM YYYY"}, //up to a month
            {limit: 18144000 * 12, format: "MMMM Do YYYY"}, //up to a year
        ];
        let formatStr: string;
        for (let id = 0; id < formatHash.length; id++) {
            if (ruler.uiScale < formatHash[id].limit) {
                formatStr = formatHash[id].format;
                break;
            }
        }
        return moment.unix(timeStamp).format(formatStr);
    }

    function redrawTimeCanvas(): void {
        const canvas: HTMLCanvasElement = <HTMLCanvasElement>$canvas[0];
        const ctx: CanvasRenderingContext2D = canvas.getContext("2d");
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

        const visibleLeftTime: number = ruler.visibleLeft * ruler.pixelToTime;
        const firstTickPos: number = Math.floor(visibleLeftTime / ruler.uiScale / 5) * ruler.uiScale * 5;
        const startX: number = firstTickPos / ruler.pixelToTime - ruler.visibleLeft; //has to be a negative value
        let i: number = startX;
        let numTicks: number = 1;
        let curTime: number = visibleLeftTime;
        let delta: number = tickTextInterval * tickSpacing * ruler.pixelToTime; // print the time string for every delta
        let lastDateStringPosition: number = -1; //some book keeping to print datestring
        while (i < canvasWidth) {
            let curTickHeight: number = (numTicks % largeTickInterval) ? tickHeight : tickHeightLarge;
            ctx.moveTo(i, canvasHeight);
            ctx.lineTo(i, canvasHeight - curTickHeight);
            curTime = (i  + ruler.visibleLeft ) * ruler.pixelToTime + ruler.minTS;
            let textPos: number = Math.floor(curTime / delta) * delta;
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
    function updateTableDetailSection(tableName?: string): void {
        if (!tableName) {
            $tableDetail.removeClass("active");
            return;
        }
        $tableDetail.addClass("active");
        $tableDetail.find(".tableName").text(tableName + ":");
        $tableDetail.data("tablename", tableName);

        let $tableContent: JQuery = $tableDetail.find(".tableDetailContent");
        let html: string = '';
        pTables.forEach((table) => {
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
    function showUpdatePrompt(
        x: number,
        y: number,
        hasPointInTime: boolean,
        multiple: boolean
    ): void {
        $updatePrompt.removeClass("xc-hidden");
        const promptWidth: number = $updatePrompt.outerWidth();
        let left: number = x - promptWidth / 2;
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
    function hideUpdatePrompt(): void {
        $updatePrompt.addClass("xc-hidden");
        selectedCells = {};
        $imdPanel.find(".tableListItem").removeClass("selected");
        $imdPanel.find(".dateTipLineSelect").remove();
        $imdPanel.find(".selectedBar").remove();
    }

    /**
     * makes date tooltip box visible for given position with given date
     */

    function showDateTipBox(x: number, y: number, unixTime: number): void {
        const winWidth: number = $imdPanel.width();
        const $tipBox: JQuery = $imdPanel.find(".date-tipbox");
        $tipBox.show();
        const tipWidth: number = Math.max(150, $tipBox.outerWidth());
        $tipBox.show();
        $tipBox.css({
            "top": y,
            "left": Math.min(winWidth - tipWidth, x - (tipWidth / 2))
        });
        $imdPanel.find(".dateTipLine").show();
        $imdPanel.find(".dateTipLine").css({
            "left": x
        });

        let format: string;
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

    function hideDateTipBox(): void {
        $imdPanel.find(".date-tipbox").hide();
        $imdPanel.find(".dateTipLine").hide();
    }

    function getDate(dateStr: string, timeStr: string): Date {
        const completeTimeStr: string = dateStr + " " + timeStr.replace(" ", "");
        return new Date(completeTimeStr);
    }

    function checkDateChange(): boolean {
        let date1: Date = $("#imdFromInput").datepicker("getDate");
        let date2: Date = $("#imdToInput").datepicker("getDate");
        if (!date1 || !date2) {
            return false;
        }

        let time1 = $("#imdBar").find(".fromTimeArea .timePickerBox").val();
        let time2 = $("#imdBar").find(".toTimeArea .timePickerBox").val();
        if (!time1 || !time2) {
            return false;
        }
        const date1Str: string = $("#imdFromInput").val();
        const date2Str: string = $("#imdToInput").val();
        let ts1: any = getDate(date1Str, time1);
        let ts2: any = getDate(date2Str, time2);

        if (ts1.toString() === "Invalid Date" || ts2.toString() ===
            "Invalid Date") {
            return false;
        }

        ts1 = Math.floor(ts1 / 1000);
        ts2 = Math.ceil(ts2 / 1000);

        if (ts2 > ts1) {
            updateViewportForDateRange(ts1, ts2);
        }
        return true;
    }

    /**
     * run once during setup
     */
    function setupTimeInputs(): void {
        $("#imdFromInput, #imdToInput").change(function() {
            checkDateChange();
        });

        $("#imdFromInput, #imdToInput").blur(function() {
            const date: string = $(this).val();
            const isValid: boolean = xcHelper.validate([
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
                const curVal: string = $("#imdBar").find(".fromTimeArea .timePickerBox").val();
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
    function addEventListeners(): void {
        $imdPanel.find(".refreshList").on("click", function() {
            refreshTableList();
        });

        $imdPanel.find(".activeTablesList").contextmenu(function() {
            return false;
        });

        $imdPanel.find(".activeTablesList").on("mousedown", ".tableTimePanel", function(event) {
            const $clickedElement: JQuery = $(this);
            const tableName: string = $clickedElement.data("name");

            const clickedTime: number = ((((event.pageX - $clickedElement.closest(".tableListHist").offset().left) + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS);
            const closestUpdate: number = getClosestUpdate(tableName, clickedTime);

            selectedCells = {};
            $imdPanel.find(".activeTablesList").find(".selectedBar").remove();
            $imdPanel.find(".dateTipLineSelect").remove();
            $imdPanel.find(".selected").removeClass("selected");
            const pos: number = event.pageX - $clickedElement.closest(".tableListHist").offset().left - 1;
            // var selectedBar;
            if (closestUpdate === null) {
                // selectedBar = '<div class="selectedBar selectedInvalid" data-time="" style="left:' + pos + 'px"></div>';
                selectedCells[tableName] = 0
            } else {
                selectedCells[tableName] = closestUpdate;
            }
            $clickedElement.parent().addClass("selected");
            const selectedBar: string = '<div class="selectedBar" data-time="" style="left:' + pos + 'px"></div>';
            $clickedElement.prepend(selectedBar);

            showUpdatePrompt(event.pageX - $imdPanel.offset().left,
                $clickedElement.offset().top  + $clickedElement.height() - $updatePrompt.parent().offset().top,
                closestUpdate !== null, false);
        });

        $imdPanel.find(".activeTablesList").on("mousedown", ".tableListItem", function() {
            const $clickedElement: JQuery = $(this);
            const tableName: string = $clickedElement.data("name");

            $imdPanel.find(".tableListItem.selected").removeClass("selected");
            $clickedElement.addClass("selected");

            updateTableDetailSection(tableName);
        });

        $imdPanel.find(".activeTablesList").on("mousedown", ".tableListLeft", function() {
            hideUpdatePrompt();
        });

        $canvas.mousedown(function(event) {
            hideUpdatePrompt();
            $imdPanel.find(".selectedBar").remove();
            $imdPanel.find(".activeTablesList").find(".tableListItem").addClass("selected");
            const left: number = event.offsetX + leftPanelWidth;
            $imdPanel.append('<div class="dateTipLineSelect" style="left:' + left + 'px;"></div>');
            const clickedTime: number = (((event.offsetX + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS);

            selectedCells = {};
            pTables.forEach((table) => {
                const tableName: string = table.name;
                const closestUpdate: number = getClosestUpdate(tableName, clickedTime);
                if (closestUpdate === null) {
                    selectedCells[tableName] = 0; // should we include these
                } else {
                    selectedCells[tableName] = closestUpdate;
                }
            });

            showUpdatePrompt(left, $canvas.height() + 10, true, true);
        });

        $imdPanel.find(".activeTablesList").on("click", ".hideTable", function() {
            const tableName: string = $(this).closest(".tableListItem").data("name");
            hideTable(tableName);
            xcTooltip.hideAll();
        });

        $imdPanel.find(".hiddenTablesList").on("click", ".showTable", function() {
            const tableName: string = $(this).closest(".tableListItem").data("name");
            showTable(tableName);
            xcTooltip.hideAll();
        });

        $imdPanel.on("click", ".deleteTable", function() {
            const tableName: string = $(this).closest(".tableListItem").data("name");
            Alert.show({
                'title': IMDTStr.DelTable,
                'msg': xcHelper.replaceMsg(IMDTStr.DelTableMsg, {
                    "tableName": tableName
                }),
                'onConfirm': () => {
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

        $('.mainTableSection').on('mousewheel DOMMouseScroll', function(e) {
            if (e.offsetX > leftPanelWidth) {
                $scrollDiv.scrollLeft($scrollDiv.scrollLeft() + (<any>e).deltaX);
            }
        });

        $canvas.mousemove(function(event) {
            const clickedTime: number = (((event.offsetX + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS);
            showDateTipBox(event.offsetX + leftPanelWidth, $canvas.height(), clickedTime);
        });

        $canvas.mouseleave(function(){
            hideDateTipBox();
        });

        $canvas.on('mousewheel DOMMouseScroll', function(event) {
            const time: number = Math.round((((event.offsetX + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS));
            const canvasWidth: number = $canvas.width();
            let range: number = Math.round(canvasWidth * ruler.pixelToTime);
            const pctLeft: number = event.offsetX / canvasWidth;
            let delta: number = Math.max((<any>event).deltaY, -3);
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

            const min: number = time - Math.round(range * pctLeft);
            const max: number = time + Math.round(range * (1 - pctLeft));

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
            const batchId: number = parseInt($(this).text());
            const name: string = $(this).closest(".tableDetailRow").data("tablename");
            pTables.forEach(function(table) {
                if (table.name === name) {
                    table.updates.forEach(function(update, i) {
                        if (update.batchId === batchId) {
                            const time: number = update.startTS;
                            const range: number = Math.round($canvas.width() * ruler.pixelToTime);

                            const mid: number = Math.round(range / 2);
                            const min: number = time - mid;
                            const max: number = time + mid;

                            $("#imdFromInput").datepicker("setDate", new Date(min * 1000));
                            $("#imdToInput").datepicker("setDate", new Date(max * 1000));
                            fromTimePicker.showTimeHelper(new Date(min * 1000));
                            toTimePicker.showTimeHelper(new Date(max * 1000));
                            updateViewportForDateRange(min, max);
                            selectedCells = {};
                            const closestUpdate: number = batchId;

                            $imdPanel.find(".activeTablesList").find(".selectedBar").remove();
                            $imdPanel.find(".dateTipLineSelect").remove();
                            $imdPanel.find(".selected").removeClass("selected");
                            isScrolling = true; // prevents scroll event from firing and closing update prompt

                            selectedCells[table.name] = closestUpdate;
                            const $clickedElement: JQuery = $imdPanel.find('.tableListItem[data-name="' +
                                        table.name +'"]').find(".tableTimePanel");
                            const $updateLine: JQuery = $clickedElement.find('.indicator' + i);
                            const pageX: number = $updateLine.offset().left;
                            const pos: number = pageX - $clickedElement.closest(".tableListHist").offset().left;

                            $clickedElement.parent().addClass("selected");
                            const selectedBar: string = '<div class="selectedBar" data-time="" style="left:' + pos + 'px"></div>';
                            $clickedElement.prepend(selectedBar);

                            showUpdatePrompt(pageX - $imdPanel.offset().left,
                            $clickedElement.offset().top  + $clickedElement.height() -
                            $updatePrompt.parent().offset().top, true, false);

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

        let initialIndex;
        $imdPanel.find(".activeTablesList").sortable({
            revert: 300,
            axis: "y",
            handle: ".dragIcon",
            start: function(event, ui) {
                initialIndex = $(ui.item).index();
                xcTooltip.hideAll();
            },
            stop: function(event, ui) {
                resortTableList("visible", initialIndex, $(ui.item).index());
            }
        });

        $imdPanel.find(".hiddenTablesListItems").sortable({
            revert: 300,
            axis: "y",
            handle: ".dragIcon",
            start: function(event, ui) {
                initialIndex = $(ui.item).index();
                xcTooltip.hideAll();
            },
            stop: function(event, ui) {
                resortTableList("hidden", initialIndex, $(ui.item).index());
            }
        });

        function resortTableList(type: string, initialIndex: number, newIndex: number): void {
            if (initialIndex === newIndex) {
                return;
            }
            let tables: PublishTable[];
            if (type === "visible") {
                tables = pTables;
            } else {
                tables = hTables;
            }
            const table: PublishTable = tables.splice(initialIndex, 1)[0];
            tables.splice(newIndex, 0, table);
            storeTables();
        }
    }

    function submitRefreshTables(latest?: boolean): XDPromise<void> {
        const tables: RefreshTableInfos[] = [];

        for (let i in selectedCells) {
            let maxBatch: number = selectedCells[i];
            let columns: TableCol[] = [];
            pTables.forEach((table) => {
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
            return refreshTablesToWorksheet(tables);
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
    function updateHistory(): void {
        if (!pTables.length) {
            return;
        }
        ruler.visibleLeft = $scrollDiv.scrollLeft();
        ruler.visibleRight = $scrollDiv.scrollLeft() + $scrollDiv.width();
        hideUpdatePrompt();
        redrawTimeCanvas();

        pTables.forEach((table) => {
            const $histPanel: JQuery = $(".tableTimePanel[data-name=\"" + table.name + "\"]");
            $histPanel.empty();

            if ($histPanel.offset().top < 1000) {
                const positions: any[] = [];
                table.updates.forEach((update, i) => {
                    const timeDiff: number = update.startTS - ruler.minTS;
                    const tStampPx: number = parseFloat(<any>timeDiff) / parseFloat(<any>ruler.pixelToTime);
                    if (tStampPx > ruler.visibleLeft && tStampPx < ruler.visibleRight) {
                        const pos: number = tStampPx - ruler.visibleLeft;
                        positions.push({
                            left: pos,
                            right: pos + 8 + (("" + update.batchId).length * 7),
                            id: i
                        });
                        const $htmlElem: JQuery = $('<div class="updateIndicator indicator' + i + '" ' +
                                            xcTooltip.Attrs +
                                            ' data-original-title="' +
                                            moment.unix(update.startTS).format("MMMM Do YYYY, h:mm:ss a") + '">' +
                                            '<span class="text">'  +
                                            parseInt(<any>update.batchId) + '</span></div>');
                        $histPanel.append($htmlElem);
                        $htmlElem.css("left", pos);
                    }
                });
                positions.sort((a, b) => {
                    const aLeft: number = a.left;
                    const bLeft: number = b.left
                    return (aLeft < bLeft ? -1 : (aLeft > bLeft ? 1 : 0));
                });
                // hide text in lines that overlap
                for (let i = 1; i < positions.length; i++) {
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
    function getClosestUpdate(tName: string, targetTS: number): number {
        let closestUpdate: UpdateInfo = null;
        pTables.forEach((table) => {
            if (table.name == tName) {
                //updated may not sorted by timestamp , need to check all of them
                for (let i = 0; i < table.updates.length; i++) {
                    const update: UpdateInfo = table.updates[i];
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
            return null;
        }
    }

    /**
     * iterate all tables
     * get handle to history div
     * iterate all updates
     * Calculate min max etc that will be used in update history
     */
    function initTimePanels(
        tables: PublishTable[],
        rangeMin?: number,
        rangeMax?: number
    ): void {
        //global time start and end for history panel
        if (!tables){
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
        tables.forEach((table) => {
            table.updates.forEach((update) => {
                if (update.startTS < ruler.minTS) {
                    ruler.minTS = update.startTS;
                }
                if (update.startTS > ruler.maxTS) {
                    ruler.maxTS = update.startTS;
                }
            });
        });

        const $fakeArea: JQuery = $imdPanel.find(".fakeArea");
        const $scrollDiv: JQuery = $imdPanel.find(".scrollDiv");
        const timeDiff: number = ruler.maxTS - ruler.minTS;
        $fakeArea.width(parseFloat(<any>timeDiff) / parseFloat(<any>ruler.pixelToTime));
        // position the scrollbar
        let scrollPosition: number;
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
    function listTablesFirstTime(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const startTime: number = Date.now();
        showWaitScreen();

        listAndCheckActive()
        .then((tables) => {
            pTables = tables || [];
            return restoreTableOrder();
        })
        .then(() => {
            let html: string = getListHtml(pTables);
            $imdPanel.find(".activeTablesList").html(html);
            initScale();
            if (pTables.length) {
                updateTableDetailSection(pTables[0].name);
            }
            if (hTables.length) {
                html = getListHtml(hTables);
                $imdPanel.find(".hiddenTablesListItems").html(html);
            }
            deferred.resolve();
        })
        .fail((error) => {
            Alert.error("Error!", error);
            deferred.reject();
        })
        .always(() => {
            const timeDiff: number = Date.now() - startTime;
            if (timeDiff < 1200) {
                setTimeout(() => {
                    removeWaitScreen();
                }, 1200 - timeDiff);
            } else {
                removeWaitScreen();
            }
        });
        return deferred.promise();
    }

    function restoreTableOrder(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const key: string = KVStore.getKey("gIMDKey");
        const kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then((imdMeta) => {
            if (imdMeta) {
                try {
                    imdMeta = $.parseJSON(imdMeta);
                    if (imdMeta) {
                        const visibleTables: string[] = imdMeta['visibleTables'];
                        const hiddenTables: string[] = imdMeta['hiddenTables'];
                        hiddenTables.forEach(function(table) {
                            for (let i = 0; i < pTables.length; i++) {
                                if (pTables[i].name === table) {
                                    hTables.push(pTables[i]);
                                    pTables.splice(i, 1);
                                    break;
                                }
                            }
                        });

                        if (visibleTables) {
                            const orderedPTables: PublishTable[] = [];
                            visibleTables.forEach(function(table) {
                                for (let i = 0; i < pTables.length; i++) {
                                    if (pTables[i].name === table) {
                                        orderedPTables.push(pTables[i]);
                                        pTables.splice(i, 1);
                                        break;
                                    }
                                }
                            });
                            pTables = orderedPTables.concat(pTables);
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
    function listAndCheckActive(): XDPromise<PublishTable[]> {
        const deferred: XDDeferred<PublishTable[]> = PromiseHelper.deferred();
        const activeTables: PublishTable[] = [];
        const inactiveTables: PublishTable[] = [];
        let listPassed: boolean = false;

        XcalarListPublishedTables("*")
        .then((result) => {
            listPassed = true;
            const promises = [];
            let inactiveCount: number = 0;
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

                    const promises: XDPromise<void>[] = [];
                    for (let i = error.count; i < inactiveTables.length; i++) {
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

    function restoreTable(tableName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarRestoreTable(tableName)
        .then(() => {
            progressCircle.increment();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function listOnlyActiveTables(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        XcalarListPublishedTables("*")
        .then(function (result) {
            const activeTables = [];
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
    function getListHtml(tables: PublishTable[]): string {
        let html: string = "";
        tables.forEach((table) => {
            html += '<div data-name="' + table.name + '" class="listBox listInfo tableListItem">\
                <div class="tableListLeft">\
                    <i class="icon xi-ellipsis-v dragIcon" ' + xcTooltip.Attrs+ ' data-original-title="' + CommonTxtTstr.HoldToDrag+ '"></i>\
                    <span class="tableName" data-original-title="' + table.name + '">' + table.name + '</span>\
                    <i class="icon xi-trash deleteTable tableIcon" title="Delete published table" data-toggle="tooltip" \
                    data-placement="top" data-container="body"></i> \
                    <i class="icon xi-hide hideTable tableIcon" title="Hide published table" data-toggle="tooltip" \
                    data-placement="top" data-container="body"></i>\
                    <i class="icon xi-show showTable tableIcon" title="Show published table" data-toggle="tooltip" \
                    data-placement="top" data-container="body"></i>\
                </div>\
                <div class="tableListHist tableTimePanel" data-name="' + table.name + '"></div> \
            </div>';
        });

        return html;
    }

    // creates a new worksheet and puts tables there
    function refreshTablesToWorksheet(tableInfos: RefreshTableInfos[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let wsId: string;
        const numTables: number = tableInfos.length;
        tableInfos.forEach((tableInfo) => {
            tableInfo.dstTableName += Authentication.getHashId();
        });

        const sql: object = {
            "operation": SQLOps.RefreshTables,
            "tableNames": tableInfos.map((tableInfo) => {
                return tableInfo.dstTableName;
            })
        };
        const txId: number = Transaction.start({
            "msg": "Refreshing tables",
            "operation": SQLOps.RefreshTables,
            "sql": sql,
            "steps": numTables,
            "track": true
        });
        const wsName: string = "imd";

        refreshTables(tableInfos, txId)
        .then(function() {
            wsId = WSManager.addWS(null, wsName);
            const promises: XDPromise<void>[] = [];

            tableInfos.forEach(function(tableInfo) {
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
        .then(function() {
            sql['worksheet'] = wsId;
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(tableInfos[numTables - 1].dstTableName),
                "title": "Refresh Tables",
                "sql": sql
            });
            deferred.resolve();
        })
        .fail(function(error) {
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
    ): XDPromise<void> {
        let promises = [];
        tableInfos.forEach((tableInfo) => {
            promises.push(XcalarRefreshTable(tableInfo.pubTableName,
                tableInfo.dstTableName,
                tableInfo.minBatch,
                tableInfo.maxBatch,
                txId));
        });

        return PromiseHelper.when.apply(this, promises);
    }

    function hideTable(tableName: string): void {
        const $listItem: JQuery = $imdPanel.find('.tableListItem[data-name="' + tableName + '"]');
        $listItem.remove();
        $listItem.removeClass("active selected");
        $listItem.find(".selectedBar").remove();
        $listItem.appendTo($imdPanel.find(".hiddenTablesListItems"));
        pTables.forEach((table, i) => {
            if (table.name === tableName) {
                pTables.splice(i, 1);
                hTables.push(table);
                return;
            }
        });
        storeTables();
        if ($tableDetail.data("tablename") === tableName) {
            updateTableDetailSection();
        }
    }

    function storeTables(): XDPromise<void> {
        const kvsKey: string = KVStore.getKey("gIMDKey");
        const kvStore: KVStore = new KVStore(kvsKey, gKVScope.WKBK);

        const visibleTables: string[] = pTables.map((table) => {
            return table.name;
        });
        const hiddenTables: string[] = hTables.map((table) => {
            return table.name;
        });
        const imdInfo = {
            visibleTables: visibleTables,
            hiddenTables: hiddenTables
        };
        return kvStore.put(JSON.stringify(imdInfo), true);
    }

    function showTable(tableName: string): void {
        const $listItem: JQuery = $imdPanel.find('.tableListItem[data-name="' + tableName + '"]');
        $listItem.remove();
        $listItem.removeClass("active selected");
        $listItem.find(".selectedBar").remove();
        $listItem.appendTo($imdPanel.find(".activeTablesList"));
        hTables.forEach((table, i) => {
            if (table.name === tableName) {
                hTables.splice(i, 1);
                pTables.push(table);
                return;
            }
        });
        storeTables();
    }

    function deleteTable(tableName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        const $listItem: JQuery = $imdPanel.find('.tableListItem[data-name="' +
                                         tableName + '"]');
        $listItem.addClass("locked");

        XcalarUnpublishTable(tableName)
        .then(() => {
            cleanUpAfterDeleteTable(tableName);
            XcSocket.Instance.sendMessage("refreshIMD", {
                "action": "delete",
                "tableName": tableName
            }, null);
            deferred.resolve();
        })
        .fail((...args) => {
            $listItem.removeClass("locked");
            xcHelper.showFail(FailTStr.RmPublishedTable);
            deferred.reject.apply(this, args);
        });

        return deferred.promise();
    }

    /**
     * IMDPanel.updateInfo
     * @param info
     */
    export function updateInfo(info: any): void {
        if (info.action === "delete") {
            cleanUpAfterDeleteTable(info.tableName);
        }
    }

    function cleanUpAfterDeleteTable(tableName: string): void {
        const $listItem: JQuery = $imdPanel.find('.tableListItem[data-name="' +
                                         tableName + '"]');
        delete selectedCells[tableName];
        let found = false;
        pTables.forEach((table, i) => {
            if (table.name === tableName) {
                pTables.splice(i, 1);
                found = true;
                return;
            }
        });
        if (!found) {
            hTables.forEach((table, i) => {
                if (table.name === tableName) {
                    hTables.splice(i, 1);
                    return;
                }
            });
        }
        $listItem.remove();
        if ($tableDetail.data("tablename") === tableName) {
            updateTableDetailSection();
        }
    }

    function testDate(str: string): boolean {
        const template: string[] = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (template === null) {
            return false;
        }
        const inputDay: string = template[2];
        const inputMonth: string = template[1];
        const inputYear: string = template[3];
        const date: Date = new Date(str + " utc");
        if (date.toString() === "Invalid Date") {
            return false;
        }
        const day: number = date.getUTCDate();
        const month: number = date.getUTCMonth();
        const year: number = date.getUTCFullYear();

        return Number(inputDay) === day &&
               (Number(inputMonth) - 1) === month &&
               Number(inputYear) === year;
    }

    function updateTimeInputs(): void {
        const min: number = ruler.visibleLeft * ruler.pixelToTime + ruler.minTS;
        const max: number = ($canvas.parent().width() + ruler.visibleLeft) * ruler.pixelToTime + ruler.minTS;
        $("#imdFromInput").datepicker("setDate", new Date(min * 1000));
        $("#imdToInput").datepicker("setDate", new Date(max * 1000));
        fromTimePicker.showTimeHelper(new Date(min * 1000));
        toTimePicker.showTimeHelper(new Date(max * 1000));
    }

    function refreshTableList(): void {
        hideUpdatePrompt();
        showWaitScreen();

        const startTime: number = Date.now();

        listOnlyActiveTables()
        .then(function(tables) {
            const foundPTables: object = {};
            const foundHTables: object = {};
            let numPTables = pTables.length;
            tables.forEach(function(table) {
                if (table.active) {
                    let inHTables: boolean = false;
                    hTables.forEach(function(hTable, i) {
                        if (hTable.name === table.name) {
                            hTables[i] = table;
                            inHTables = true;
                            foundHTables[table.name] = true;
                            return;
                        }
                    });

                    if (!inHTables) {
                        let found: boolean = false;
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
            let html: string = getListHtml(pTables);
            $imdPanel.find(".activeTablesList").html(html);
            html = getListHtml(hTables);
            $imdPanel.find(".hiddenTablesListItems").html(html);
            checkDateChange();
            if (pTables.length) {
                updateTableDetailSection(pTables[0].name);
            } else {
                updateTableDetailSection();
            }
        })
        .fail(function(error) {
            Alert.error("Error!", error);
        })
        .always(function() {
            const timeDiff: number = Date.now() - startTime;
            if (timeDiff < 1200) {
                setTimeout(() => {
                    removeWaitScreen();
                }, 1200 - timeDiff);
            } else {
                removeWaitScreen();
            }
        })
    }

    function showWaitScreen(): void {
        $("#modalWaitingBG").remove();
        const $waitingBg: JQuery = $('<div id="modalWaitingBG">' +
                            '<div class="waitingIcon"></div>' +
                        '</div>');
        $imdPanel.append($waitingBg);
        setTimeout(() => {
            $waitingBg.find('.waitingIcon').fadeIn();
        }, 200);
    }

    function removeWaitScreen(): void {
        $('#modalWaitingBG').fadeOut(200, function() {
            $(this).remove();
            progressState.canceled = false;
        });
    }

    /**
     * IMDPanel.needsUpdate
     */
    export function needsUpdate(): void {
        if (isPanelActive) {
            refreshTableList();
        } else {
            isPendingRefresh = true;
        }
    }

    function showProgressCircle(numSteps: number, numCompleted: number): void {
        const $waitSection: JQuery = $("#modalWaitingBG");
        $waitSection.addClass("hasProgress");
        const progressAreaHtml: string = xcHelper.getLockIconHtml("listIMD", 0, true, true);
        $waitSection.html(progressAreaHtml);
        $waitSection.find(".stepText").addClass("extra").append(
            '<span class="extraText">' + IMDTStr.Activating + '</span>')
        progressCircle = new ProgressCircle("listIMD", 0, true, {steps: numSteps});
        $waitSection.find(".cancelLoad").data("progresscircle",
                                                progressCircle);
        progressCircle.update(numCompleted, 1000);
    }

    /* Unit Test Only */
    if (typeof window !== "undefined" && window["unitTestMode"]) {
        IMDPanel["__testOnly__"] = {
            setSelectedCells: function(cells) {
                selectedCells = cells;
            },
            getSelectedCells: function() {
                return selectedCells;
            },
            listTablesFirstTime: listTablesFirstTime,
            getTables: function() {
                return {pTables: pTables, hTables: hTables};
            },
            getRuler: function() {
                return ruler;
            },
            testDate: testDate,
            updateTimeInputs: updateTimeInputs,
            checkDateChange: checkDateChange,
            updateTableDetailSection: updateTableDetailSection,
            getPrevTimes: function() {
                return {prevToTime: prevToTime, prevFromTime: prevFromTime};
            },
            submitRefreshTables: submitRefreshTables,
            getClosestUpdate: getClosestUpdate,
            listAndCheckActive: listAndCheckActive
        };
    }
    /* End Of Unit Test Only */
}
