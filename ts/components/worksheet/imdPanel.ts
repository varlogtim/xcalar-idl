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
        values: TableCol[],
        oldestBatchId: number,
        active: boolean,
        sizeTotal: number
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
        currentTable?: string;
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
        columns: TableCol[],
        colStruct: XcalarApiColumnT[]
    }

    interface RestoreError {
        error: string,
        tableName: string
    }

    let $imdPanel: JQuery;
    let $canvas: JQuery;
    let $tableDetail: JQuery; //$(".tableDetailSection")
    let $activeCount: JQuery;
    let $inactiveCount: JQuery;

    const tickColor: string = "#777777";
    const tickWidth: number = 1;
    const tickSpacing: number = 6;
    const tickHeight: number = 12;
    const tickHeightLarge: number = 20;
    const largeTickInterval: number = 5;
    const tickTextInterval: number = 20;
    const maxUpdates: number = 127; //maximum number of table updates that can be fetched from the back end.
    let pTables: PublishTable[]; //published tables return from thrift call
    let iTables: PublishTable[]; // inactive tables
    let pCheckedTables: PublishTable[]; //tables the user has checked to perform operations
    let iCheckedTables: PublishTable[]; // inactive tables checked
    let $updatePrompt: JQuery;
    let $updatePromptOptions: JQuery;
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
    let restoreErrors: RestoreError[] = [];

    let curIteration: number;
    const intervalTime: number = 60000;
    let imdCycle: number;
    let detailTableName: string;
    let isLatest: boolean;

    let pListOrder: number; //holds 1 if list is sorted ascending, -1 if sorted desc, 0/null if unsorted
    let iListOrder: number; //holds 1 if list is sorted ascending, -1 if sorted desc, 0/null if unsorted

    /**
     * IMDPanel.setup
     */
    export function setup(): void {
        $imdPanel = $("#imdView");
        $canvas = $("#imdTimeCanvas");
        $updatePrompt = $imdPanel.find(".update-prompt");
        $updatePromptOptions = $imdPanel.find(".update-prompt-options");
        $scrollDiv = $imdPanel.find(".scrollDiv");
        $tableDetail = $(".tableDetailSection");
        $activeCount = $imdPanel.find(".activeTableCount");
        $inactiveCount = $imdPanel.find(".inactiveTableCount");
        pTables = [];
        iTables = [];
        iCheckedTables = [];
        pCheckedTables = [];
        curIteration = 0;

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
                redraw();
            }, 300);
        });
        redrawTimeCanvas();
        let promise;
        if (firstTouch) {
            promise = listTablesFirstTime();
        } else if (isPendingRefresh) {
            promise = refreshTableList();
        } else {
            promise = PromiseHelper.resolve();
        }
        promise
        .then(function() {
            startCycle();
        });
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
        clearTimeout(imdCycle);
    }

    export function redraw(): void {
        if (isPanelActive) {
            updateTimeInputs();
            updateHistory();
        }
    }

    /**
     * update history bar in a way that given two dates fits in it
     * ts1 : unix time stamp of from
     * ts2 : unix time stamp of to
     */
    function updateViewportForDateRange(ts1: number, ts2: number): void {
        const numberOfUnits: number = $canvas.width() / tickSpacing;
        let scale: number = (ts2 - ts1) / numberOfUnits;
        ruler.uiScale = scale; //cache scale value
        if (scale <= 0) { //make sure to avoid div by zero or neg values
            scale = 1;
        }

        ruler.pixelToTime = parseFloat(<any>scale) / parseFloat(<any>tickSpacing);
        resetTimePanels(pTables, ts1, ts2);
        updateHistory();
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

        pTables.forEach((table: PublishTable) => {
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

        const dpr: number = window.devicePixelRatio || 1;
        const bsr: number = ctx.webkitBackingStorePixelRatio ||
              ctx.mozBackingStorePixelRatio ||
              ctx.msBackingStorePixelRatio ||
              ctx.oBackingStorePixelRatio ||
              ctx.backingStorePixelRatio || 1;

        const ratio: number = dpr / bsr;

        canvas.width = canvasWidth * ratio;
        canvas.height = canvasHeight * ratio;
        canvas.style.width = canvasWidth + "px";
        canvas.style.height = canvasHeight + "px";
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
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

    function updateTableDetailSection(tableName?: string): void {
        detailTableName = tableName;
        if (!tableName) {
            $tableDetail.removeClass("active");
            $tableDetail.data("tablename", "");
            return;
        }
        const table: PublishTable = xcHelper.deepCopy(pTables.filter((table) => {
            return (table.name == tableName);
        })[0]);
        if (!table) {
            $tableDetail.removeClass("active");
            $tableDetail.data("tablename", "");
            return;
        }

        $tableDetail.addClass("active");
        $tableDetail.find(".tableName").text(tableName);
        const tableSize = xcHelper.sizeTranslator(table.sizeTotal);
        $tableDetail.find(".tableSize").text("(" + tableSize + "):");
        $tableDetail.data("tablename", tableName);

        let $tableContent: JQuery = $tableDetail.find(".updatesList .tableDetailContent");
        if ($tableDetail.find(".headerRow .select").length) {
            const $selectedHeader: JQuery = $tableDetail.find(".updatesList .headerRow .select");
            const type: string = $selectedHeader.data("type");
            var keyTypeMap = {
                "name": "source",
                "batchID": "batchId",
                "timestamp": "startTS",
                "meta": "numRows",
            }
            let key: string = keyTypeMap[type];
            let order = -1;
            if ($selectedHeader.find(".xi-arrow-down").length !== 0) {
                order = 1;
            }
            table.updates.sort(function(a, b) {
                if (a[key] < b[key]) {
                    return order;
                } else if (a[key] > b[key]) {
                    return (-order);
                } else {
                    return 0;
                }
            });
        }
        let html: string = '';

        for (let i = 0; i < table.updates.length; i++) {
            const time = moment.unix(table.updates[i].startTS).format("MMMM Do YYYY, h:mm:ss A");
            const timeTip = moment.unix(table.updates[i].startTS).format("M-D-Y h:mm:ss A");
            html += '<div class="tableDetailRow" data-tablename="' + table.name + '">' +
                    '<div class="tableColumn sourceName" data-original-title="' + table.updates[i].source + '"><span class="dummy">a</span>' + table.updates[i].source + '</div>' +
                    '<div class="tableColumn batchId">' + table.updates[i].batchId + '</div>' +
                    '<div class="tableColumn" ' + xcTooltip.Attrs + ' data-original-title="' + timeTip + '">' + time + '</div>' +
                    '<div class="tableColumn lastCol">' + xcHelper.numToStr(table.updates[i].numRows) + '</div>' +
                    '<div class="spacer"></div>' +
                    '</div>';
        }
        if (!html) {
            html = '<div class="tableDetailRow empty">No updates</div>'
        }

        $tableContent.html(html);
        updateColumnSection(table);
    }

    function updateColumnSection(table: PublishTable): void {
        let html: string = "";
        for (let i = 0; i < table.values.length; i++) {
            let xcTypeIcon = xcHelper.getColTypeIcon(DfFieldTypeTFromStr[table.values[i].type]);
            html += '<div class="columnRow">' +
                    '  <div class="iconWrap">' +
                    '    <i class="icon ' + xcTypeIcon + '"></i>' +
                    '  </div>' +
                    '  <span class="colName">' + xcHelper.escapeHTMLSpecialChar(table.values[i].name) + '</span>' +
                    '</div>'
        }
        $tableDetail.find(".columnsList").html(html);
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
        multiple: boolean,
        isUnavailable?: boolean
    ): void {
        $updatePrompt.removeClass("xc-hidden");
        $updatePrompt.removeClass("advanced");
        $updatePromptOptions.removeClass("xc-hidden");
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
            $updatePrompt.find(".basicOptions .heading").text("Refresh Tables:");
        } else {
            $updatePrompt.find(".basicOptions .heading").text("Refresh Table:");
        }

        if (hasPointInTime && !isUnavailable) {
            $imdPanel.find(".pointInTime").removeClass("unavailable");
            xcTooltip.remove( $imdPanel.find(".pointInTime"));
        } else if (isUnavailable) {
            $imdPanel.find(".pointInTime").addClass("unavailable");
            xcTooltip.add($imdPanel.find(".pointInTime"), {title: "Updates prior to this point in time have been coalesced."});
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
        $updatePrompt.removeClass("advanced");
        $updatePrompt.removeClass("group");
        $updatePrompt.find(".dropdown").attr("data-toggle", "");
        $updatePrompt.find("input").val("");
        $updatePromptOptions.addClass("xc-hidden");
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

        let options: DatepickerOptions = {
            dateFormat: "m/d/yy",
            beforeShow: function() {
                var $el = $("#ui-datepicker-div");
                $el.appendTo("#imdBar");
            }
        };
        $("#imdFromInput").datepicker(options);
        $("#imdToInput").datepicker(options);

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
            if ($(event.target).hasClass("loadMore")) {
                return;
            }
            const tableName: string = $clickedElement.data("name");

            const clickedTime: number = ((((event.pageX - $clickedElement.closest(".tableListHist").offset().left) + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS);
            const closestUpdate: number = getClosestUpdate(tableName, clickedTime);

            selectedCells = {};
            $imdPanel.find(".activeTablesList").find(".selectedBar").remove();
            $imdPanel.find(".dateTipLineSelect").remove();
            $imdPanel.find(".selected").removeClass("selected");
            const pos: number = event.pageX - $clickedElement.closest(".tableListHist").offset().left - 1;
            if (closestUpdate === null) {
                selectedCells[tableName] = 0
            } else {
                selectedCells[tableName] = closestUpdate;
            }
            $clickedElement.parent().addClass("selected");
            const selectedBar: string = '<div class="selectedBar" data-time="" style="left:' + pos + 'px"></div>';
            $clickedElement.prepend(selectedBar);
            let hasPointInTime: boolean = closestUpdate !== null;
            let isUnavailable: boolean = false;
            let pTable: PublishTable;
            pTables.forEach((table) => {
                if (table.name == tableName) {
                    pTable = table;
                }
            });
            if (hasPointInTime && closestUpdate < pTable.oldestBatchId) {
                isUnavailable = true;
            }
            showUpdatePrompt(event.pageX - $imdPanel.offset().left,
                $clickedElement.offset().top  + $clickedElement.height() - $updatePrompt.parent().offset().top,
                hasPointInTime, false, isUnavailable);
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

            if (pCheckedTables.length === 0) {
                return;
            }
            const $tableList = $imdPanel.find(".activeTablesList").find(".tableListItem");
            $tableList.each(function() {
                if($(this).find(".checkbox.checked").length > 0) {
                    $(this).addClass("selected");
                }
            });
            const left: number = event.offsetX + leftPanelWidth;
            $imdPanel.append('<div class="dateTipLineSelect" style="left:' + left + 'px;"></div>');
            const clickedTime: number = (((event.offsetX + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS);

            selectedCells = {};
            let isUnavailable: boolean = false;
            pCheckedTables.forEach((table) => {
                const tableName: string = table.name;
                let closestUpdate: number = getClosestUpdate(tableName, clickedTime);
                if (closestUpdate === null) {
                    closestUpdate = 0;
                }
                if (closestUpdate < table.oldestBatchId) {
                    isUnavailable = true;
                }
                selectedCells[tableName] = closestUpdate;
            });
            $updatePrompt.addClass("group");
            $updatePrompt.find(".dropdown").attr("data-toggle", "tooltip");
            showUpdatePrompt(left, $canvas.height() + 10, true, true, isUnavailable);
        });

        $imdPanel.on("click", ".sortActive", function() {
            pListOrder = pListOrder? -1 * pListOrder: 1;
            sortTableList(pTables, pListOrder);
            let html: string = getListHtml(pTables);
            $imdPanel.find(".activeTablesList").html(html);
            redraw();
            filterLists($("#imdFilterInput").val());
        });

        $imdPanel.on("click", ".sortInactive", function() {
            iListOrder = iListOrder? -1 * iListOrder: 1;
            sortTableList(iTables, iListOrder);
            let html: string = getListHtml(iTables);
            $imdPanel.find(".inactiveTablesListItems").html(html);
            filterLists($("#imdFilterInput").val());
        });

        $imdPanel.on("click", ".deleteActiveTable", function() {
            deleteTables(pCheckedTables, $(this), true);
        });

        $imdPanel.on("click", ".deleteInactiveTable", function() {
            deleteTables(iCheckedTables, $(this), false);
        });

        $imdPanel.on("click", ".loadMore", function() {
            const tableName = $(this).closest(".tableListItem").attr("data-name");
            loadMoreUpdates(tableName);
        });

        $imdPanel.on("click", ".checkAllActive", function() {
            if (pTables.length === 0) {
                return;
            }
            const $this = $(this);
            if (pCheckedTables.length === pTables.length && pTables.length !== 0) {
                resetActiveChecked();
                $imdPanel.find(".tableListSubheader").removeClass("active");
            } else if (pTables.length > 0) {
                $imdPanel.find(".activeTablesList").find(".checkbox").addClass("checked");
                pCheckedTables = pTables.slice();
                $this.addClass("checked");
                $imdPanel.find(".tableListSubheader").addClass("active");
            }
            xcTooltip.hideAll();
        });

        $imdPanel.on("click", ".checkAllInactive", function() {
            if (iTables.length === 0) {
                return;
            }
            const $this = $(this);
            if (iCheckedTables.length === iTables.length &&  iTables.length !== 0) {
                resetInactiveChecked();
            } else if (iTables.length > 0){
                $imdPanel.find(".inactiveTablesListItems").find(".checkbox").addClass("checked");
                iCheckedTables = iTables.slice();
                $this.addClass("checked");
                $imdPanel.find(".inactiveTablesList").find(".iconSection").addClass("active");
            }
            xcTooltip.hideAll();
        });

        $imdPanel.find(".inactiveTablesListItems").on("click", ".checkbox", function() {
            $(this).toggleClass("checked");
            const checked = $(this).hasClass("checked");
            const $inactiveSection = $imdPanel.find(".inactiveTablesList");
            const tableName = $(this).parents(".tableListItem").attr("data-name");
            const table = iTables.filter((table) => {
                return (table.name === tableName);
            })[0];

            if (checked) {
                iCheckedTables.push(table);
                $inactiveSection.find(".iconSection").addClass("active");
                if (iTables.length === iCheckedTables.length) {
                    $inactiveSection.find(".checkAllInactive").addClass("checked");
                }
            } else {
                const index = iCheckedTables.indexOf(table);
                iCheckedTables.splice(index, 1);
                $imdPanel.find(".checkAllInactive").removeClass("checked");
                if (iCheckedTables.length === 0) {
                    $inactiveSection.find(".iconSection").removeClass("active");
                }
            }
        });

        $imdPanel.find(".activeTablesList").on("click", ".checkbox", function() {
            $(this).toggleClass("checked");
            const checked = $(this).hasClass("checked");
            const tableName = $(this).parents(".tableListItem").attr("data-name");
            const table = pTables.filter((table) => {
                return (table.name === tableName);
            })[0];

            if (checked) {
                pCheckedTables.push(table);
                $imdPanel.find(".tableListSubheader").addClass("active");
                if (pTables.length === pCheckedTables.length) {
                    $imdPanel.find(".checkAllActive").addClass("checked");
                }
            } else {
                const index = pCheckedTables.indexOf(table);
                pCheckedTables.splice(index, 1);
                $imdPanel.find(".checkAllActive").removeClass("checked");
                if (pCheckedTables.length === 0) {
                    $imdPanel.find(".tableListSubheader").removeClass("active");
                }
            }
        });

        $imdPanel.on("click", ".activate", function() {
            if(iCheckedTables.length === 0) {
                return;
            }

            let requery: boolean = false; //sets to true if table updates aren't loaded

            showWaitScreen();
            showProgressCircle(iCheckedTables.length, 0);
            restoreTables(iCheckedTables)
            .then(function() {
                iCheckedTables.forEach(function (table:PublishTable) {
                    let failed = false;
                    restoreErrors.forEach((errorTableInfo) => {
                        if (errorTableInfo.tableName === table.name) {
                            failed = true;
                            return false;
                        }
                    });
                    if (!failed && !table.updates.length) {
                        requery = true;
                    }
                    if (!failed) {
                        showTable(table.name);
                    }
                });
                resetInactiveChecked();
                updateHistory();

                if (restoreErrors.length) {
                    showRestoreError();
                }

                if (requery) {
                    return listAndCheckActive();
                     // tables that start inactive won't have update info
                } else {
                    updateHistory();
                }
            })
            .then(function() {
                updateHistory();
            })
            .fail(function(error) {
                if (error && error.error === "canceled") {
                    // user canceled part way through restoration
                    // unpublish the rest of the inactive tables
                    // and add the restored ones to the activeTables list

                    const promises: XDPromise<StatusT>[] = [];
                    for (let i = error.count; i < iCheckedTables.length; i++) {
                        promises.push(XcalarUnpublishTable(iCheckedTables[i].name, true));
                    }
                    PromiseHelper.when.apply(this, promises)
                    .always(function() {
                        listTables();
                    });
                } else { // restoration failed without being canceled
                    // list tables and find out which ones succeeded
                    listTables();
                }
            })
            .always(function() {
                restoreErrors = [];
                removeWaitScreen();
            });;
            xcTooltip.hideAll();
        });

        $imdPanel.on("click", ".deactivate", function() {
            if (pCheckedTables.length === 0) {
                return;
            }

            let tableName = "";
            pCheckedTables.forEach(function(table: PublishTable) {
                tableName += table.name + ", ";
            });
            tableName = tableName.slice(0, -2);
            Alert.show({
                'title': IMDTStr.DeactivateTable,
                'msg': xcHelper.replaceMsg(IMDTStr.DeactivateTablesMsg, {
                    "tableName": tableName
                }),
                'onConfirm': () => {
                    showWaitScreen();
                    showProgressCircle(pCheckedTables.length, 0);
                    deactivateTables(pCheckedTables)
                    .then(function() {
                        pCheckedTables.forEach(function (table:PublishTable) {
                            hideTable(table.name);
                            XcSocket.Instance.sendMessage("refreshIMD", {
                                "action": "deactivate",
                                "tableName": tableName
                            }, null);
                        });
                        resetActiveChecked();
                        initScale();
                        if (pTables.length) {
                            updateTableDetailSection(pTables[0].name);
                        }
                    })
                    .fail(function(error) {
                        if (error && error.error === "canceled") {
                            // user canceled part way through restoration
                            // unpublish the rest of the inactive tables
                            // and add the restored ones to the activeTables list

                            const promises: XDPromise<StatusT>[] = [];
                            for (let i = error.count; i < iCheckedTables.length; i++) {
                                promises.push(XcalarRestoreTable(tableName));
                            }
                            PromiseHelper.when.apply(this, promises)
                            .always(function() {
                                listTables();
                            });
                        } else { // restoration failed without being canceled
                            // list tables and find out which ones succeeded
                            listTables();
                        }
                    })
                    .always(function() {
                        removeWaitScreen();
                    });
                    xcTooltip.hideAll();
                }
            });
        });

        $updatePrompt.find(".close").click(function() {
            hideUpdatePrompt();
        });

        $updatePrompt.find(".btn.pointInTime").click(function(event) {
            if ($(this).hasClass("unavailable") || $(event.target).hasClass("dropdown")) {
                return;
            }
            submitRefreshTables();
        });

        $updatePrompt.find(".btn.pointInTime").find(".dropdown").click(function() {
            if ($(this).closest(".btn").hasClass("unavailable") || $updatePrompt.hasClass("group")) {
                return;
            }
            isLatest = false;
            $updatePrompt.toggleClass("advanced");
            $tableDetail.addClass("columnsMode");
            $updatePrompt.find(".advancedButton").text("Point in Time");
        });

        $updatePrompt.find(".btn.latest").find(".dropdown").click(function() {
            if ($updatePrompt.hasClass("group")) {
                return;
            }
            isLatest = true;
            $updatePrompt.toggleClass("advanced");
            $tableDetail.addClass("columnsMode");
            $updatePrompt.find(".advancedButton").text("Latest");
        });

        $updatePrompt.find(".btn.latest").click(function(event) {
            if ($(event.target).hasClass("dropdown")) {
                return;
            }
            submitRefreshTables(true);
        });

        $updatePrompt.find(".btn.advancedButton").click(function() {
            const filterString: string = $updatePrompt.find(".filterString").val();
            let colStr: string = $updatePrompt.find(".columns").val();
            let columns: string[];
            if (colStr) {
                columns = colStr.split(",");
                columns.forEach(function(colName) {
                    colName = colName.trim();
                });
            }

            submitRefreshTables(isLatest, filterString, columns);
        });

        $imdPanel.find(".icon.coalesce").click(function() {
            let tableName = "";
            pCheckedTables.forEach(function(table: PublishTable) {
                tableName += table.name + ", ";
            });
            tableName = tableName.slice(0, -2);
            Alert.show({
                'title': IMDTStr.Coalesce,
                'msg': xcHelper.replaceMsg(IMDTStr.CoalesceTip, {
                    "tableName": tableName
                }),
                'onConfirm': () => {
                    submitCoalesce();
                }
            });
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

        $imdPanel.find('.mainTableSection').on('mousewheel DOMMouseScroll', function(e) {
            if (e.offsetX > leftPanelWidth) {
                $scrollDiv.scrollLeft($scrollDiv.scrollLeft() + (<any>e).deltaX);
            }
        });

        var vertTimer;
        $imdPanel.find('.activeTablesList').scroll(function() {
            clearTimeout(vertTimer);
            vertTimer = setTimeout(function() {
                updateHistory();
            }, 200);
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

            // zoom in our out by 20% per delta, with a max of 3 or 60%
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
            if (progressState.canceled) {
                return;
            }

            progressState.canceled = true;
            XcalarQueryCancel("Xc.tmp.updateRetina." + progressState.currentTable);
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
            pTables.forEach(function(table: PublishTable) {
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
                            const $clickedElement: JQuery = $imdPanel.find('.tableListItem[data-name="' +
                            name +'"]').find(".tableTimePanel");

                            scrollToListItem($clickedElement);
                            updateViewportForDateRange(min, max);

                            selectedCells = {};
                            const closestUpdate: number = batchId;

                            $imdPanel.find(".activeTablesList").find(".selectedBar").remove();
                            $imdPanel.find(".dateTipLineSelect").remove();
                            $imdPanel.find(".selected").removeClass("selected");
                            isScrolling = true; // prevents scroll event from firing and closing update prompt

                            selectedCells[table.name] = closestUpdate;

                            const $updateLine: JQuery = $clickedElement.find('.indicator' + i);
                            const pageX: number = $updateLine.offset().left;
                            const pos: number = pageX - $clickedElement.closest(".tableListHist").offset().left;

                            $clickedElement.parent().addClass("selected");
                            const selectedBar: string = '<div class="selectedBar" data-time="" style="left:' + pos + 'px"></div>';
                            $clickedElement.prepend(selectedBar);

                            let isUnavailable: boolean = false;
                            if (batchId < table.oldestBatchId) {
                                isUnavailable = true;
                            }

                            showUpdatePrompt(pageX - $imdPanel.offset().left,
                            $clickedElement.offset().top  + $clickedElement.height() -
                            $updatePrompt.parent().offset().top, true, false, isUnavailable);

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

        $tableDetail.on("click", ".updatesList .headerRow .tableColumn", function() {
            var $title = $(this);

            // click on selected title, reverse sort
            if ($title.hasClass("select")) {
                var $icon = $title.find(".icon");
                toggleSortIcon($icon);
                if ($tableDetail.data("tablename")) {
                    updateTableDetailSection($tableDetail.data("tablename"));
                }
            } else {
                sortAction($title);
            }
        });

        $tableDetail.on("click", ".viewColumns, .viewTables", function() {
            $tableDetail.toggleClass("columnsMode");
        });

        function toggleSortIcon($icon, restoreDefault?: boolean) {
            if (restoreDefault) {
                // If restore to non-sorted
                $icon.removeClass("xi-arrow-up xi-arrow-down fa-8");
                $icon.addClass("xi-sort fa-15");
            } else if ($icon.hasClass("xi-arrow-up")) {
                // ascending > descending
                $icon.removeClass("xi-sort xi-arrow-up fa-15");
                $icon.addClass("xi-arrow-down fa-8");
            } else {
                // Two cases: 1.first time sort & 2.descending > ascending
                $icon.removeClass("xi-sort xi-arrow-down fa-15");
                $icon.addClass("xi-arrow-up fa-8");
            }
        }
        function sortAction($title) {
            $title.siblings(".select").each(function() {
                var $currOpt = $(this);
                $currOpt.removeClass("select");
                toggleSortIcon($currOpt.find(".icon"), true);
            });
            $title.addClass("select");
            toggleSortIcon($title.find(".icon"));
            if ($tableDetail.data("tablename")) {
                updateTableDetailSection($tableDetail.data("tablename"));
            }
        }

        let initialIndex;
        $imdPanel.find(".activeTablesList").sortable({
            revert: 300,
            axis: "y",
            handle: ".dragIcon",
            start: function(_event, ui) {
                initialIndex = $(ui.item).index();
                xcTooltip.hideAll();
            },
            stop: function(_event, ui) {
                if (initialIndex != $(ui.item).index()) {
                    resortTableList("visible", initialIndex, $(ui.item).index());
                    pListOrder = 0;
                }
            }
        });

        $imdPanel.find(".inactiveTablesListItems").sortable({
            revert: 300,
            axis: "y",
            handle: ".dragIcon",
            start: function(_event, ui) {
                initialIndex = $(ui.item).index();
                xcTooltip.hideAll();
            },
            stop: function(_event, ui) {
                if (initialIndex != $(ui.item).index()) {
                    resortTableList("inactive", initialIndex, $(ui.item).index());
                    iListOrder = 0;
                }
            }
        });

        $("#imdFilterInput").keyup(function () {
            filterLists($(this).val());
        });

        function resortTableList(type: string, initialIndex: number, newIndex: number): void {
            if (initialIndex === newIndex) {
                return;
            }
            let tables: PublishTable[];
            if (type === "visible") {
                tables = pTables;
            } else {
                tables = iTables;
            }
            const table: PublishTable = tables.splice(initialIndex, 1)[0];
            tables.splice(newIndex, 0, table);
            storeTables();
        }

        function filterLists(text: string) {
            text = text.toLowerCase();
            let pCheckAllVisible: boolean = true;
            $imdPanel.find(".activeTablesList").find(".tableListItem").each(function() {
                var $currItem = $(this);
                if (!$currItem.attr("data-name").toLowerCase().includes(text)) {
                    $currItem.hide();
                    pCheckAllVisible = false;
                } else {
                    $currItem.show();
                }
            });
            let iCheckAllVisible: boolean = true;
            $imdPanel.find(".inactiveTablesList").find(".tableListItem").each(function() {
                var $currItem = $(this);
                if (!$currItem.attr("data-name").toLowerCase().includes(text)) {
                    $currItem.hide();
                    iCheckAllVisible = false;
                } else {
                    $currItem.show();
                }
            });
            if (pCheckAllVisible) {
                $imdPanel.find(".checkAllActive").css("visibility", "visible");
            } else {
                $imdPanel.find(".checkAllActive").css("visibility", "hidden");
            }

            if (iCheckAllVisible) {
                $imdPanel.find(".checkAllInctive").css("visibility", "visible");
            } else {
                $imdPanel.find(".checkAllInctive").css("visibility", "hidden");
            }
        }
    }

    function submitRefreshTables(latest?: boolean, filterString?: string, columns?: string[]): XDPromise<void> {
        const tables: RefreshTableInfos[] = [];
        let columnsStruct: XcalarApiColumnT[];
        let pTable: PublishTable;

        console.log(columns);
        for (let tableName in selectedCells) {
            pTable = pTables.filter((table) => {
                return (table.name === tableName);
            })[0];

            let maxBatch: number;
            if (latest) {
                maxBatch = -1; // -1 defaults to the latest
            } else {
                maxBatch = selectedCells[tableName];
            }
            let tableCols: TableCol[] = [];
            if (columns) {
                columnsStruct = [];
                pTable.values.forEach(function(column) {
                    if (columns.includes(column.name)) {
                    let colStruct = new XcalarApiColumnT({
                        columnType: column.type,
                        sourceColumn: column.name,
                        destColumn: column.name
                    });
                    columnsStruct.push(colStruct);
                        tableCols.push(column);
                }
            });
            } else {
                tableCols = pTable.values;
            }
            tables.push({
                pubTableName: tableName,
                dstTableName: tableName,
                minBatch: -1, // defaults to oldest
                maxBatch: maxBatch,
                columns: tableCols,
                colStruct: columnsStruct
            });
        }

        console.log(tables);

        hideUpdatePrompt();

        if (tables.length) {
            return refreshTablesToWorksheet(tables, filterString);
        } else {
            return PromiseHelper.reject();
        }
    }

    function submitCoalesce(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        const promises: XDPromise<StatusT>[] = [];

        pCheckedTables.forEach(function (table: PublishTable) {
            promises.push(XcalarCoalesce(table.name));
        });
        hideUpdatePrompt();
        showWaitScreen();
        PromiseHelper.when.apply(this, promises)
        .then(function() {
            pCheckedTables.forEach(function (table: PublishTable) {
                XcSocket.Instance.sendMessage("refreshIMD", {
                    "action": "coalesce",
                    "tableName": table.name
                }, null);
            });
            removeWaitScreen();
            refreshTableList()
        })
        .fail(function(err) {
            removeWaitScreen();
            Alert.error("Coalesce Failed",err);
        });

        return deferred.promise();
    }

    /*
        iterate all visible tables
        iterate updates of all visible tables.
        calculate their time to pixel value
        if it is within the visible history range , add div with left border and a text (update id)
    */
    function updateHistory(hideUpdate: boolean = true): void {
        ruler.visibleLeft = $scrollDiv.scrollLeft();
        ruler.visibleRight = ruler.visibleLeft + $scrollDiv.width();
        if (hideUpdate) {
            hideUpdatePrompt();
        }
        redrawTimeCanvas();

        pTables.forEach((table: PublishTable) => {
            const $histPanel: JQuery = $(".tableTimePanel[data-name=\"" + table.name + "\"]");
            $histPanel.empty();
            const offsetTop: number = $histPanel.offset().top;
            if (offsetTop > 1000) {
                return; // further tables are below, so break
            }
            if (offsetTop > -100) {
                const positions: any[] = [];
                let updateHtml: HTML = "";
                let lowestBatch: number = -1;
                let lowestBatchPos: number = 0;
                table.updates.forEach((update, i) => {
                    const timeDiff: number = update.startTS - ruler.minTS;
                    const tStampPx: number = parseFloat(<any>timeDiff) / parseFloat(<any>ruler.pixelToTime);
                    if (lowestBatch == -1) {
                        lowestBatch = update.batchId;
                        lowestBatchPos = tStampPx;
                    } else if (lowestBatch > update.batchId) {
                        lowestBatch = update.batchId;
                        lowestBatchPos = tStampPx;
                    }
                    if (tStampPx > ruler.visibleLeft && tStampPx < ruler.visibleRight) {
                        const pos: number = tStampPx - ruler.visibleLeft;
                        positions.push({
                            left: pos,
                            right: pos + 8 + (("" + update.batchId).length * 7),
                            id: i
                        });
                        let classes = "";
                        if (update.batchId < table.oldestBatchId) {
                            classes += " unavailable ";
                        }
                        updateHtml += '<div class="updateIndicator indicator' + i +
                                            classes + '" ' +
                                            xcTooltip.Attrs +
                                            ' data-original-title="' +
                                            moment.unix(update.startTS).format("MMMM Do YYYY, h:mm:ss a") + '" ' +
                                            'style="left:' + pos + 'px">' +
                                            '<span class="text">'  +
                                            parseInt(<any>update.batchId) + '</span></div>';
                    }
                });
                if (table.updates.length >= maxUpdates && lowestBatch !== 0) {
                    let pos: string = null;
                    table["lowestBatch"] = lowestBatch;
                    if (lowestBatchPos > ruler.visibleLeft && lowestBatchPos < ruler.visibleRight) {
                        pos = String(lowestBatchPos - ruler.visibleLeft) + "px";
                    } else if (lowestBatchPos > ruler.visibleRight) {
                        pos = "100%";
                    }

                    if (pos) {
                        updateHtml = updateHtml + '<div class="unavailableSection" style="width:'+ pos +';" ' +
                        xcTooltip.Attrs + ' data-original-title="' + IMDTStr.DataUnavailable + '">';

                        if (lowestBatchPos - ruler.visibleLeft >= 140) {
                            updateHtml += '<span class="loadMore">Load More Updates</span></div>';
                        } else {
                            updateHtml += '</div>';
                        }
                    }
                }

                $histPanel.html(updateHtml);
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
    function resetTimePanels(
        tables: PublishTable[],
        rangeMin: number,
        rangeMax: number
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
        .then(function() {
            return restoreTableOrder();
        })
        .then(() => {
            //pTables = tables || [];
            let html: string = getListHtml(pTables);
            $imdPanel.find(".activeTablesList").html(html);
            initScale();
            if (pTables.length) {
                updateTableDetailSection(pTables[0].name);
            }
            if (iTables.length) {
                html = getListHtml(iTables);
                $imdPanel.find(".inactiveTablesListItems").html(html);
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
            updateTableCount();
        });
        return deferred.promise();
    }

    //sorts table list with insertion sort. Order determines 1: asc or -1: desc.
    function sortTableList(tableList: PublishTable[], order: number) {
        tableList.sort(function(a, b){
            return xcHelper.sortVals(a.name, b.name, order);
        });
        storeTables();
    }

    //reset checkmarks for the active table section
    function resetActiveChecked() {
        $imdPanel.find(".activeTablesList").find(".checkbox").removeClass("checked");
        pCheckedTables = [];
        $imdPanel.find(".checkAllActive").removeClass("checked");
        $imdPanel.find(".tableListSubheader").removeClass("active");
    }
    //reset checkmarks for the inactive table section
    function resetInactiveChecked() {
        $imdPanel.find(".inactiveTablesList").find(".checkbox").removeClass("checked");
        $imdPanel.find(".inactiveTablesList").find(".iconSection").removeClass("active");
        iCheckedTables = [];
        //$imdPanel.find(".checkAllInactive").removeClass("checked");
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
                        const activeTables: string[] = imdMeta['activeTables'];
                        const inactiveTables: string[] = imdMeta['inactiveTables'];

                        if (inactiveTables) {
                            const orderedITables: PublishTable[] = [];
                            inactiveTables.forEach(function(table) {
                                for (let i = 0; i < iTables.length; i++) {
                                    if (iTables[i].name === table) {
                                        orderedITables.push(iTables[i]);
                                        iTables.splice(i, 1);
                                        break;
                                    }
                                }
                            });
                            iTables = orderedITables.concat(iTables);
                        }

                        if (activeTables) {
                            const orderedPTables: PublishTable[] = [];
                            activeTables.forEach(function(table) {
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

    // list tables and separate which list they go in
    function listAndCheckActive(): XDPromise<PublishTable[]> {
        const deferred: XDDeferred<PublishTable[]> = PromiseHelper.deferred();

        XcalarListPublishedTables("*", false, true)
        .then((result) => {
            progressState.canceled = false;

            result.tables.forEach(function(table) {
                if (!table.active) {
                    iTables.push(table);
                } else {
                    pTables.push(table);
                }
            });
            listTables()
            .then( deferred.resolve)
            .fail(deferred.reject);
        })
        .fail(function() {
            listTables()
            .then(deferred.resolve)
            .fail(function() {
                deferred.resolve(pTables);
            });
        });

        return deferred.promise();
    }

    function deactivateTables(tables: PublishTable[]) {
        const promises = [];
        let inactiveCount: number = 0;

        tables.forEach(function(table) {
            if (table.active) {
                promises.push(function() {
                    inactiveCount++;
                    if (progressState.canceled) {
                        return PromiseHelper.reject({
                            error: "canceled",
                            count: inactiveCount - 1
                        });
                    } else {
                        progressState.currentTable = table.name;
                        progressCircle.increment();
                        return XcalarUnpublishTable(table.name, true);
                    }
                });
            }
        });
        return PromiseHelper.chain(promises);
    }

    function restoreTables(tables: PublishTable[]) {
        const promises = [];
        let inactiveCount: number = 0;

        tables.forEach(function(table) {
            if (!table.active) {
                promises.push(function() {
                    inactiveCount++;
                    if (progressState.canceled) {
                        return PromiseHelper.reject({
                            error: "canceled",
                            count: inactiveCount - 1
                        });
                    } else {
                        progressState.currentTable = table.name;
                        return restoreTable(table.name, inactiveCount);
                    }
                });
            }
        });
        return PromiseHelper.chain(promises);
    }

    function restoreTable(
        tableName: string,
        inactiveCount: number
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        PromiseHelper.alwaysResolve(XcalarRestoreTable(tableName))
        .then((res: XCThriftError) => {
            if (progressState.canceled) {
                deferred.reject({
                    error: "canceled",
                    count: inactiveCount - 1
                });
                return;
            }
            if (res && res.error) {
                const ret: RestoreError = {
                    error: res.error,
                    tableName: tableName
                };
                restoreErrors.push(ret);
            }
            progressCircle.increment();
            deferred.resolve();
             XcSocket.Instance.sendMessage("refreshIMD", {
                "action": "activate",
                "tableName": tableName
            }, null);
        });
        return deferred.promise();
    }

    function showRestoreError() {
        let erroredTableNames: string[] = [];
        for (let i = 0; i < restoreErrors.length; i++) {
            erroredTableNames.push(restoreErrors[i].tableName);
        }

        let msg = restoreErrors[0].error + "<br>" +
                "Tables: " + xcHelper.listToEnglish(erroredTableNames);
        Alert.error("Some tables could not be activated", msg, {
            msgTemplate: msg
        });
    }

    function listTables(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        XcalarListPublishedTables("*", false, true)
        .then(function (result) {
            deferred.resolve(result.tables);
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
            let isChecked = (pCheckedTables.includes(table) || iCheckedTables.includes(table)) ? 'checked' : '';
            html += '<div data-name="' + table.name + '" class="listBox listInfo tableListItem">\
                <div class="tableListLeft checkboxSection">\
                    <i class="icon xi-ellipsis-v dragIcon" ' + xcTooltip.Attrs+ ' data-original-title="' + CommonTxtTstr.HoldToDrag+ '"></i>\
                    <div class="checkbox ' + isChecked + '">\
                    <i class="icon xi-ckbox-empty"></i><i class="icon xi-ckbox-selected"></i></div>\
                    <span class="tableName" data-original-title="' + table.name + '">' + table.name + '</span>\
                </div>\
                <div class="tableListHist tableTimePanel" data-name="' + table.name + '"></div> \
            </div>';
        });

        return html;
    }

    // creates a new worksheet and puts tables there
    function refreshTablesToWorksheet(tableInfos: RefreshTableInfos[], filterString?: string): XDPromise<void> {
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


        refreshTables(tableInfos, txId, filterString)
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
        txId: number, filterString: string
    ): XDPromise<void> {
        let promises = [];
        tableInfos.forEach((tableInfo) => {
            promises.push(XcalarRefreshTable(tableInfo.pubTableName,
                tableInfo.dstTableName,
                tableInfo.minBatch,
                tableInfo.maxBatch,
                txId, filterString, tableInfo.colStruct));
        });

        return PromiseHelper.when.apply(this, promises);
    }

    function hideTable(tableName: string): void {
        const $listItem: JQuery = $imdPanel.find('.tableListItem[data-name="' + tableName + '"]');
        $listItem.remove();
        $listItem.removeClass("active selected");
        $listItem.find(".selectedBar").remove();
        $listItem.find(".checkbox").removeClass("checked");
        $listItem.appendTo($imdPanel.find(".inactiveTablesListItems"));
        pTables.forEach((table, i) => {
            if (table.name === tableName) {
                pTables.splice(i, 1);
                table.active = false;
                iTables.push(table);
                return;
            }
        });
        storeTables();
        if ($tableDetail.data("tablename") === tableName) {
            updateTableDetailSection();
        }
        updateTableCount();
    }

    function storeTables(): XDPromise<void> {
        const kvsKey: string = KVStore.getKey("gIMDKey");
        const kvStore: KVStore = new KVStore(kvsKey, gKVScope.WKBK);

        const activeTables: string[] = pTables.map((table) => {
            return table.name;
        });
        const inactiveTables: string[] = iTables.map((table) => {
            return table.name;
        });
        const imdInfo = {
            activeTables: activeTables,
            inactiveTables: inactiveTables
        };
        return kvStore.put(JSON.stringify(imdInfo), true);
    }

    function showTable(tableName: string): void {
        const $listItem: JQuery = $imdPanel.find('.tableListItem[data-name="' + tableName + '"]');
        $listItem.remove();
        $listItem.removeClass("active selected");
        $listItem.find(".selectedBar").remove();
        $listItem.find(".checkbox").removeClass("checked");
        $listItem.appendTo($imdPanel.find(".activeTablesList"));
        iTables.forEach((table, i) => {
            if (table.name === tableName) {
                iTables.splice(i, 1);
                table.active = true;
                pTables.push(table);
                return;
            }
        });
        checkDateChange();
        storeTables();
        updateTableCount();
    }

    function deleteTables(checkedTables: PublishTable[], _iconElelment: JQuery, isActiveList: boolean) {
        if (checkedTables.length === 0) {
            return; //XXX pop up alert here
        }
        let tableName = "";
        checkedTables.forEach(function(table: PublishTable) {
            tableName += table.name + ", ";
        });
        tableName = tableName.slice(0, -2);
        Alert.show({
            'title': IMDTStr.DelTable,
            'msg': xcHelper.replaceMsg(IMDTStr.DelTableMsg, {
                "tableName": tableName
            }),
            'onConfirm': () => {
                checkedTables.forEach(function(table: PublishTable) {
                    deleteTable(table.name);
                });
                if (isActiveList) {
                    resetActiveChecked();
                } else {
                    resetInactiveChecked();
                }
            }
        });
    }

    function deleteTable(tableName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        const $listItem: JQuery = $imdPanel.find('.tableListItem[data-name="' +
                                         tableName + '"]');
        $listItem.addClass("locked");

        XcalarUnpublishTable(tableName, false)
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
    export function updateInfo(_info?: any): void {
        refreshTableList();
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
            iTables.forEach((table, i) => {
                if (table.name === tableName) {
                    iTables.splice(i, 1);
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

    function refreshTableList(): XDPromise<void>{
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        hideUpdatePrompt();
        showWaitScreen();
        $("#imdFilterInput").val("");

        const startTime: number = Date.now();

        listTables()
        .then(function(tables) {
            pTables = [];
            iTables = [];
            tables.forEach(function(table: PublishTable) {
                if (table.active) {
                    pTables.push(table);
                } else {
                    iTables.push(table);
                }
            });
            return restoreTableOrder();
        })
        .then(function() {
            resetActiveChecked();
            resetInactiveChecked();
            let html: string = getListHtml(pTables);
            $imdPanel.find(".activeTablesList").html(html);
            html = getListHtml(iTables);
            $imdPanel.find(".inactiveTablesListItems").html(html);
            checkDateChange();
            if (pTables.length) {
                if ($tableDetail.data("tablename")) {
                    const tName: string = $tableDetail.data("tablename");
                    const table: PublishTable = xcHelper.deepCopy(pTables.filter((table) => {
                        return (table.name == tName);
                    })[0]);
                    if (table) {
                        updateTableDetailSection(tName);
                    } else {
                        updateTableDetailSection(pTables[0].name);
                    }
                } else {
                    updateTableDetailSection(pTables[0].name);
                }
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
            updateTableCount();
            deferred.resolve();
        });

        return deferred.promise();
    }

    function updateTableCount() {
        $activeCount.text("(" + pTables.length + ")");
        $inactiveCount.text("(" + iTables.length + ")");
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

    function scrollToListItem($listItem: JQuery) {
        const offsetTop: number = $listItem.position().top -
                        $imdPanel.find(".upperTableHeader").height();
        const $list: JQuery = $imdPanel.find(".activeTablesList");
        if (offsetTop < 0 || offsetTop > $list.height()) {
            const curScrollTop = $list.scrollTop();
            $list.scrollTop(curScrollTop + offsetTop);
        }
    }

    function startCycle() {
        curIteration++;
        clearTimeout(imdCycle);
        let prevIteration: number = curIteration;

        getUpdatesAndDraw()
        .always(function() {
            if (prevIteration === curIteration) {
                cycle();
            }
        });
    }

    // ajustTime is the time to subtract from the interval time due to the
    // length of time it takes for the backend call to return
    function cycle() {
        var prevIteration = curIteration;

        imdCycle = <any>setTimeout(function() {
            getUpdatesAndDraw()
            .always(function() {
                if (prevIteration === curIteration) {
                    cycle();
                }
            });
        }, intervalTime);
    }

    function getUpdatesAndDraw(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        listTables()
        .then(function(tables) {
            let latestUpdate: number = 0;
            tables.forEach(function(table) {
                for(let i = 0; i < pTables.length; i++) {
                    if (table.name == pTables[i].name && table != pTables[i]) {
                        pTables[i] = table;
                        if (table.updates.length &&
                            latestUpdate < table.updates[0].startTS) {
                            latestUpdate = table.updates[0].startTS;
                        }
                        break;
                    }
                }
                if (table.name === detailTableName) {
                    updateTableDetailSection(detailTableName);
                }
            });
            if (latestUpdate) {
                ruler.maxTS = latestUpdate;
            }

            updateHistory(false);

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function loadMoreUpdates(tableName: string) {
        let loadTable: PublishTable = pTables.filter(function(table: PublishTable) {
            return (table.name === tableName);
        })[0];
        let updateNumber = loadTable["lowestBatch"] - 127;
        if(updateNumber < 0) {
            updateNumber = 0;
        }
        XcalarListPublishedTables(tableName, false, true, updateNumber)
        .then(function(result) {
            const moreUpdates = result.tables[0].updates;
            moreUpdates.forEach(function(update: UpdateInfo) {
                if (update.batchId < loadTable["lowestBatch"]) {
                    loadTable.updates.push(update);
                }
            });
            updateHistory();

            updateTableDetailSection(loadTable.name);
        });
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
                return {pTables: pTables, iTables: iTables};
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
            listAndCheckActive: listAndCheckActive,
            getProgressState: function() {
                return progressState;
            }
        };
    }
    /* End Of Unit Test Only */
}
