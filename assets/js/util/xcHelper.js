window.xcHelper = (function($, xcHelper) {
    xcHelper.assert = function(statement, error) {
        error = error || "Assert failed";
        if (!statement) {
            throw error;
        }
    };

    // looks for xcTable-AB12 or $('#xcTable-AB12') and returns AB12
    xcHelper.parseTableId = function(idOrEl) {
        // can pass in a string or jQuery element
        var id;
        if (idOrEl instanceof jQuery) {
            id = idOrEl.attr('id');
        } else if (typeof (idOrEl) === "object") {
            id = $(idOrEl).attr('id');
        } else {
            id = idOrEl;
        }

        var idSplit = id.split("-");

        if (idSplit.length !== 2) {
            console.error("Unexpected id/ele to parse", idOrEl);
            return null;
        } else {
            return idSplit[1];
        }
    };

    xcHelper.parseRowNum = function($el) {
        var keyword = "row";
        var classNames = $el.attr("class");

        if (classNames == null) {
            console.error("Unexpected element to parse row", $el);
            return null;
        }

        var index = classNames.indexOf(keyword);
        var substring = classNames.substring(index + keyword.length);
        var rowNum = parseInt(substring);

        if (isNaN(rowNum)) {
            console.error("Unexpected element to parse row", $el);
            return null;
        }

        return rowNum;
    };

    xcHelper.parseColNum = function($el) {
        var keyword = "col";
        var classNames = $el.attr("class");
        if (classNames == null) {
            // this is in case we meet some error and cannot goon run the code!
            console.error("Unexpected element to parse column", $el);
            return null;
        }

        var index = classNames.indexOf(keyword);
        var substring = classNames.substring(index + keyword.length);
        var colNum = parseInt(substring);

        if (isNaN(colNum)) {
            console.error("Unexpected element to parse column", $el);
            return null;
        }

        return colNum;
    };

    xcHelper.parseJsonValue = function(value, fnf) {
        if (fnf) {
            value = '<span class="undefined" data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'data-original-title="Field Not Found">FNF' +
                                '</span>';
        } else if (value === null) {
            value = '<span class="null">' + value + '</span>';
        } else if (value === undefined) {
            value = '<span class="blank">' + value + '</span>';
        } else {
            switch (value.constructor) {
                case (Object):
                    if ($.isEmptyObject(value)) {
                        value = "";
                    } else {
                        value = JSON.stringify(value).replace(/,/g, ", ");
                    }
                    break;
                case (Array):
                    value = JSON.stringify(value).replace(/,/g, ", ");
                    break;
                default: // leave value as is;
            }
            // escape < & > so external html doesn't get injected
            if (typeof value === "string") {
                value = xcHelper.escapeHTMlSepcialChar(value);
            }
        }
        return (value);
    };

    //define type of the column
    xcHelper.parseColType = function(val, oldType) {
        var type = oldType;

        if (val != null && oldType !== ColumnType.mixed) {
            // note: "" is empty string
            var valType = typeof val;
            type = valType;
            // get specific type
            if (type === ColumnType.number) {
                // the case when type is float
                if (oldType === ColumnType.float || xcHelper.isFloat(val)) {
                    type = ColumnType.float;
                } else {
                    type = ColumnType.integer;
                }
            } else if (type === ColumnType.object) {
                if (val instanceof Array) {
                    type = ColumnType.array;
                }
            }

            var isAllNum = (valType === ColumnType.number) &&
                           ((oldType === ColumnType.float) ||
                            (oldType === ColumnType.integer));
            if (oldType != null &&
                oldType !== ColumnType.undefined &&
                oldType !== type && !isAllNum)
            {
                type = ColumnType.mixed;
            }
        }

        return (type);
    };

    xcHelper.getPreviewSize = function(previewSize, unit) {
        if (previewSize === "") {
            previewSize = null;
        } else {
            previewSize = Number(previewSize);
            switch (unit) {
                case "KB":
                    previewSize *= KB;
                    break;
                case "MB":
                    previewSize *= MB;
                    break;
                case "GB":
                    previewSize *= GB;
                    break;
                case "TB":
                    previewSize *= TB;
                    break;
                default:
                    break;
            }

            if (isNaN(previewSize)) {
                console.error("error size");
                previewSize = gMaxSampleSize;
            }
        }

        return previewSize;
    };

    // not tested in xchelper unit test
    xcHelper.getWSTableList = function() {
        var wsOrders = WSManager.getOrders();
        var tableLis = "";
        // group table tab by worksheet (only show active table)
        for (var i = 0, len = wsOrders.length; i < len; i++) {
            var wsId = wsOrders[i];
            var ws = WSManager.getWSById(wsId);
            var wsTables = ws.tables;

            for (var j = 0; j < wsTables.length; j++) {
                var tableId = wsTables[j];
                var table = gTables[tableId];
                if (j === 0 && wsOrders.length > 1) {
                    tableLis += '<div class="sectionLabel">' +
                                    ws.name +
                                '</div>';
                }

                var tableName = table.getName();
                tableLis += '<li data-original-title="' + tableName + '" ' +
                            'class="tooltipOverflow" ' +
                            'data-toggle="tooltip" data-container="body" ' +
                            'data-ws="' + wsId + '" data-id="' +
                            tableId + '">' +
                                tableName +
                            '</li>';
            }
        }

        return tableLis;
    };

    xcHelper.getMultiJoinMapString = function(args) {
        var mapStr = "";
        var len = args.length;
        for (var i = 0; i < len - 1; i++) {
            mapStr += 'concat(string(' + args[i] + '), concat(".Xc.", ';
        }

        mapStr += 'string(' + args[len - 1] + ')';

        for (var i = 0; i < len - 1; i++) {
            mapStr += '))';
        }

        return mapStr;
    };

    xcHelper.getFilterOptions = function(operator, colName, uniqueVals, isExist) {
        var colVals = [];

        for (var val in uniqueVals) {
            colVals.push(val);
        }

        var str = "";
        var len = colVals.length;

        if (operator === FltOp.Filter) {
            if (len > 0) {
                for (var i = 0; i < len - 1; i++) {
                    str += "or(eq(" + colName + ", " + colVals[i] + "), ";
                }

                str += "eq(" + colName + ", " + colVals[len - 1];

                for (var i = 0; i < len; i++) {
                    str += ")";
                }
            }

            if (isExist) {
                if (len > 0) {
                    str = "or(" + str + ", not(exists(" + colName + ")))";
                } else {
                    str = "not(exists(" + colName + "))";
                }
            }
        } else if (operator === FltOp.Exclude){
            if (len > 0) {
                for (var i = 0; i < len - 1; i++) {
                    str += "and(not(eq(" + colName + ", " + colVals[i] + ")), ";
                }

                str += "not(eq(" + colName + ", " + colVals[len - 1] + ")";

                for (var i = 0; i < len; i++) {
                    str += ")";
                }
            }

            if (isExist) {
                if (len > 0) {
                    str = "and(" + str + ", exists(" + colName + "))";
                } else {
                    str = "exists(" + colName + ")";
                }
            }
        } else {
            console.error("error case");
            return null;
        }

        return {
            "operator"    : operator,
            "filterString": str
        };
    };

    xcHelper.wrapDSName = function(dsName) {
        dsName = dsName || "";
        var fulldsName = Support.getUser() + "." + dsName;
        return fulldsName;
    };

    xcHelper.parseDSName = function(fulldsName) {
        var nameSplits = fulldsName.split(".");
        var user;
        var dsName;

        if (nameSplits.length === 1) {
            user = DSTStr.UnknownUser;
            dsName = nameSplits[0];
        } else {
            user = nameSplits.splice(0, 1)[0];
            dsName = nameSplits.join(".");
        }

        return {
            "user"  : user,
            "dsName": dsName
        };
    };

    xcHelper.getUnusedTableName = function(datasetName) {
        // checks dataset names and tablenames and tries to create a table
        // called dataset1 if it doesnt already exist or dataset2 etc...
        var deferred = jQuery.Deferred();
        var tableNames = {};
        // datasets has it's unique format, no need to check
        XcalarGetTables()
        .then(function(result) {
            var tables = result.nodeInfo;
            for (var i = 0; i < result.numNodes; i++) {
                var name = xcHelper.getTableName(tables[i].name);
                tableNames[name] = 1;
            }

            var validNameFound = false;
            var limit = 20; // we won't try more than 20 times
            var newName = datasetName;
            if (tableNames.hasOwnProperty(newName)) {
                for (var i = 1; i <= limit; i++) {
                    newName = datasetName + i;
                    if (!tableNames.hasOwnProperty(newName)) {
                        validNameFound = true;
                        break;
                    }
                }
                if (!validNameFound) {
                    var tries = 0;
                    while (tableNames.hasOwnProperty(newName) && tries < 100) {
                        newName = xcHelper.randName(datasetName, 4);
                        tries++;
                    }
                }
            }

            deferred.resolve(newName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    // get unique column name
    xcHelper.getUniqColName = function(tableId, colName) {
        if (colName == null) {
            return xcHelper.randName("NewCol");
        }

        var table = gTables[tableId];
        if (table == null) {
            console.error("table not has meta, cannot check");
            return colName;
        }

        if (!table.hasCol(colName)) {
            return colName;
        }

        var newColName;
        var tryCount = 0;
        while (tryCount <= 50) {
            ++tryCount;
            newColName = colName + "_" + tryCount;

            if (!table.hasCol(newColName)) {
                break;
            }
        }

        if (tryCount > 50) {
            console.warn("Too much try, give up");
            return xcHelper.randName(colName);
        } else {
            return newColName;
        }
    };

    // get a deep copy
    xcHelper.deepCopy = function(obj) {
        var string = JSON.stringify(obj);
        var res;

        try {
            res = JSON.parse(string);
        } catch (err) {
            console.error(err, string);
        }

        return (res);
    };

    // this function is generally looped over many times
    // we pass in ctx (a reference to canvas) so that we don't create a new
    // canvas within the function many times in the loop
    // canvas is used to measure text width
    xcHelper.middleEllipsis = function(text, $ele, checkLen, maxWidth,
                                       isMultiLine, ctx) {
        // keep this because if pass in null, should change to string "null"
        // (since text is come from $el.data(), text might be null)
        text = String(text);
        var textWidth = ctx.measureText(text).width;
        var finalText;
        if (isMultiLine) {
            maxWidth *= 2;
        }
        if (textWidth < maxWidth) {
            finalText = text;
        } else {
            var len = xcHelper.getMaxTextLen(ctx, text, maxWidth, checkLen,
                                             text.length);
            var textLen = text.length;
            // if textLen is 22 and len is 21
            // then the finalText may be longer if no this check
            if (textLen - 3 > 0 && textLen - 3 < len) {
                len = textLen - 3;
            }
            finalText = text.slice(0, len - 3) + "..." +
                        text.slice(text.length - 3);
        }

        if ($ele.is("input")) {
            $ele.val(finalText);
        } else {
            $ele.text(finalText);
        }
    };

    xcHelper.getMaxTextLen = function(ctx, text, desiredWidth, minLen, maxLen) {
        if (maxLen - minLen <= 1) {
            return minLen;
        }
        var midPoint = Math.floor((maxLen + minLen) / 2);
        var modText = text.slice(0, midPoint);
        var width = ctx.measureText(modText).width;
        if (width > desiredWidth) {
            return (xcHelper.getMaxTextLen(ctx, text, desiredWidth, minLen,
                                           midPoint));
        } else if (width < desiredWidth) {
            return (xcHelper.getMaxTextLen(ctx, text, desiredWidth, midPoint,
                                           maxLen));
        } else {
            return midPoint;
        }
    };

    xcHelper.mapColGenerate = function(colNum, colName, mapStr, tableCols, options) {
        options = options || {};
        var copiedCols = xcHelper.deepCopy(tableCols);
        var sizedToHeader;
        var widthOptions = {
            defaultHeaderStyle: true
        };

        if (colNum > 0) {
            var cellWidth;
            if (options.replaceColumn) {
                // xx not sure if we're passing in width anywhere
                // if (options.width) {
                //     cellWidth = options.width;
                // } else
                if (options.resize) {
                    cellWidth = getTextWidth($(), colName, widthOptions);
                } else {
                    cellWidth = copiedCols[colNum - 1].width;
                }
                sizedToHeader = copiedCols[colNum - 1].sizedToHeader;
            } else {
                cellWidth = getTextWidth(null, colName, widthOptions);
            }

            // backend will return an escaped name and then we'll have to use
            // an escaped version of that escaped name to access it =)
            // var escapedName = xcHelper.escapeColName(colName.replace(/\./g, "\\."));
            var escapedName = colName;

            var newProgCol = ColManager.newCol({
                "backName"     : escapedName,
                "name"         : colName,
                "width"        : cellWidth,
                "userStr"      : '"' + colName + '" = map(' + mapStr + ')',
                "isNewCol"     : false,
                "sizedToHeader": sizedToHeader
            });

            if (options.type) {
                newProgCol.type = options.type;
            }

            // newProgCol.func.name = "map";
            // newProgCol.func.args = [];
            // newProgCol.func.args[0] = mapStr;

            if (options.replaceColumn) {
                copiedCols.splice(colNum - 1, 1, newProgCol);
            } else {
                copiedCols.splice(colNum - 1, 0, newProgCol);
            }
            newProgCol.parseFunc();
        }

        return (copiedCols);
    };

    xcHelper.randName = function(name, digits) {
        if (digits == null) {
            digits = 5; // default
        }

        var max = Math.pow(10, digits);
        var rand = Math.floor(Math.random() * max);

        if (rand === 0) {
            rand = 1;
        }

        function padZero(number, numDigits) {
            number = number.toString();
            return (number.length < numDigits) ?
                    new Array(numDigits - number.length + 1).join('0') + number :
                    number;
        }

        rand = padZero(rand, digits);
        return (name + rand);
    };

    xcHelper.uniqueRandName = function(name, checkFunc, checkCnt) {
        // used in testsuite
        var resName = xcHelper.randName(name);
        if (!(checkFunc instanceof Function)) {
            return resName;
        }

        if (checkCnt == null) {
            checkCnt = 10; // default value
        }

        var tryCnt = 0;

        while (checkFunc(resName) && tryCnt < checkCnt) {
            // should be low chance that still has name conflict
            resName = xcHelper.randName(name);
            tryCnt++;
        }

        if (tryCnt === checkCnt) {
            console.error("Name Conflict!");
            return xcHelper.randName(name); // a hack result
        } else {
            return resName;
        }
    };

    xcHelper.capitalize = function(s) {
        if (!s) {
            return s;
        }
        return s[0].toUpperCase() + s.slice(1);
    };

    xcHelper.isFloat = function(num) {
        return (num % 1 !== 0);
    };

    // fomart is mm-dd-yyyy
    xcHelper.getDate = function(delimiter, d, timeStamp) {
        var date;

        if (d == null) {
            d = (timeStamp == null) ? new Date() : new Date(timeStamp);
        }

        if (delimiter == null) {
            delimiter = "-";
        }
        date = d.toLocaleDateString().replace(/\//g, delimiter);
        return date;
    };

    xcHelper.getTime = function(d, timeStamp, noSeconds) {
        if (d == null) {
            d = (timeStamp == null) ? new Date() : new Date(timeStamp);
        }
        if (noSeconds) {
            return d.toLocaleTimeString(navigator.language, {
                hour  : '2-digit',
                minute: '2-digit'
            });
        } else {
            return d.toLocaleTimeString();
        }
    };

    xcHelper.getCurrentTimeStamp = function() {
        return new Date().getTime();
    };

    xcHelper.downloadAsFile = function(fileName, fileContents, raw) {
        // XXX FIXME fix it if you can find a way to download it as .py file
        var element = document.createElement('a');
        var contents = fileContents;
        if (!raw) {
            contents = 'data:text/plain;charset=utf-8,' +
                       encodeURIComponent(fileContents);
        } else {
            contents = 'data:text/plain;base64,' + btoa(fileContents);
        }
        element.setAttribute('href', contents);
        element.setAttribute('download', fileName);
        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    };


    xcHelper.timeStampTranslater = function(unixTime) {
        if (unixTime == null) {
            return null;
        }

        var timeStamp = unixTime * 1000;
        time = xcHelper.getTime(null, timeStamp) + " " +
               xcHelper.getDate("-", null, timeStamp);
        return time;
    };

    // assigned unit is a unit (MB, GB etc) that you want to convert to
    /**
     * @param  {boolean} unitSeparated true if want return an array of
     *                                 [int size, string unit]
     */
    xcHelper.sizeTranslator = function(size, unitSeparated, convertTo) {
        if (size == null) {
            return null;
        }

        var unit  = ["B", "KB", "MB", "GB", "TB", "PB"];
        var start = 0;
        var end   = unit.length - 2;

        if (convertTo && unit.indexOf(convertTo) > -1) {
            var index = unit.indexOf(convertTo);
            size = (size * (1 / Math.pow(1024, index))).toFixed(2);
            size = parseFloat(size);
            start = index;
        } else {
            while (size >= 1024 && start <= end) {
                size = (size / 1024).toFixed(1);
                ++start;
            }
            if (size >= 10) {
                size = Math.round(size);
            }
        }

        size = parseFloat(size);


        if (unitSeparated) {
            return ([size, unit[start]]);
        } else {
            return (size + unit[start]);
        }
    };

    xcHelper.textToBytesTranslator = function(numText) {
        // accepts parameters in the form of 23GB or 56.2 mb
        // and converts them to bytes
        var units  = ["B", "KB", "MB", "GB", "TB", "PB"];
        var num = parseFloat(numText);
        var text = numText.match(/[a-zA-Z]+/)[0].toUpperCase();
        var index = units.indexOf(text);
        var bytes = num * Math.pow(1024, index);
        return (bytes);
    };

    xcHelper.showSuccess = function() {
        var $successMessage = $('#successMessageWrap');
        $successMessage.show();
        if (!gMinModeOn) {
            var $checkMark = $successMessage.find('.checkMark');
            var $text = $successMessage.find('.successMessage');
            var $largeText = $successMessage.find('.largeText');
            $text = $text.add($largeText);
            var $textAndCheckMark = $checkMark.add($text);
            $textAndCheckMark.addClass('hidden');
            $checkMark.hide();

            setTimeout(function() {
                $text.removeClass('hidden');
            }, 200);

            setTimeout(function() {
                $checkMark.show().removeClass('hidden')
                                 .addClass('bounceInDown animated');

            }, 400);

            setTimeout(function() {
                $textAndCheckMark.addClass('hidden');
            }, 2000);

            setTimeout(function() {
                $successMessage.hide();
            }, 2600);
        } else {
            setTimeout(function() {
                $successMessage.hide();
            }, 1800);
        }
    };

    xcHelper.showFail = function() {
        var $successMessage = $('#successMessageWrap');
        $successMessage.addClass("failed");
        $successMessage.show();
        if (!gMinModeOn) {
            var $checkMark = $successMessage.find('.checkMark');
            var $text = $successMessage.find('.successMessage');
            var $largeText = $successMessage.find('.largeText');
            $text = $text.add($largeText);
            var $textAndCheckMark = $checkMark.add($text);
            $textAndCheckMark.addClass('hidden');
            $checkMark.hide();

            setTimeout(function() {
                $text.removeClass('hidden');
            }, 200);

            setTimeout(function() {
                $checkMark.show().removeClass('hidden')
                                 .addClass('bounceInDown animated');

            }, 400);

            setTimeout(function() {
                $textAndCheckMark.addClass('hidden');
            }, 2000);

            setTimeout(function() {
                $successMessage.hide();
                $successMessage.removeClass("failed");
            }, 2600);
        } else {
            setTimeout(function() {
                $successMessage.hide();
                $successMessage.removeClass("failed");
            }, 1800);
        }
    };

    xcHelper.replaceMsg = function(txt, replaces) {
        // replaces is an object, its keys are the mark strings to replace
        // each key's value is the string to replace with

        replaces = replaces || {};

        for (var key in replaces) {
            var str = replaces[key];
            if (str == null) {
                continue;
            }

            mark = "<" + key + ">";
            txt = txt.replace(mark, str);
        }

        return txt;
    };

    xcHelper.toggleListGridBtn = function($btn, ToListView, noRefresh) {
        if (ToListView) {
            // toggle to list view
            $btn.removeClass("gridView").addClass("listView")
                .removeClass("xi-list-view").addClass("xi-grid-view");
            // suggest become 'to grid view'
            $btn.attr("data-original-title", TooltipTStr.ToGridView);
        } else {
            // toggle to grid view
            $btn.removeClass("listView").addClass("gridView")
                .removeClass("xi-grid-view").addClass("xi-list-view");
            $btn.attr("data-original-title", TooltipTStr.ToListView);
        }
        // refresh tooltip
        if (!noRefresh) {
            xcHelper.refreshTooltip($btn);
        }
    };

    xcHelper.showRefreshIcon = function($location, manualClose) {
        var $waitingIcon = $('<div class="refreshIcon"><img src=""' +
                            'style="display:none;height:0px;width:0px;"></div>');
        $location.append($waitingIcon);
        $waitingIcon.find('img').show();
        setTimeout(function() {
            $waitingIcon.find('img').attr('src', paths.waitIcon)
                                    .height(37)
                                    .width(35);
        }, 0);

        if (!manualClose) {
            setTimeout(function(){
                $waitingIcon.fadeOut(100, function() {
                    $waitingIcon.remove();
                });
            }, 1400);
        }
        return ($waitingIcon);
    };

    xcHelper.toggleBtnInProgress = function($btn, isIconBtn) {
        var text;
        var html;

        if ($btn.hasClass("btnInProgress")) {
            text = $btn.find(".text").text().trim();

            if (isIconBtn) {
                // when it's icon button
                html = '<span class="icon"></span>' +
                        '<span class="text">' +
                            text +
                        '</span>';
            } else {
                // when it's normal button
                html = text;
            }

            $btn.html(html).removeClass("btnInProgress");

        } else {
            text = $btn.text().trim();
            html = '<div class="animatedEllipsisWrapper">' +
                        '<div class="text">' +
                            text +
                        '</div>' +
                        '<div class="animatedEllipsis">' +
                          '<div>.</div>' +
                          '<div>.</div>' +
                          '<div>.</div>' +
                        '</div>' +
                    '</div>';
            $btn.html(html).addClass("btnInProgress");
        }
    };

    xcHelper.optionButtonEvent = function($container, callback) {
        $container.on("click", ".radioButton", function() {
            var $radioButton = $(this);
            if ($radioButton.hasClass("active") ||
                $radioButton.hasClass("disabled"))
            {
                return;
            }

            $radioButton.closest(".radioButtonGroup")
                        .find(".radioButton.active").removeClass("active");
            $radioButton.addClass("active");

            var option = $radioButton.data("option");
            callback(option, $radioButton);
        });
    };

    xcHelper.supportButton = function(type, doneCallback, failCallback) {
        var $btn;
        var html;

        switch (type) {
            case "sql":
                // copy sql button
                html = '<button type="button" class="btn copySql" ' +
                        'data-toggle="tooltip" title="' + TooltipTStr.CopyLog + '">' +
                            CommonTxtTstr.CopyLog +
                        '</button>';
                $btn = $(html);
                $btn.click(function() {
                    $(this).blur();
                    var $hiddenInput = $("<input>");
                    $("body").append($hiddenInput);

                    var sqlCaches = SQL.getAllLogs();
                    var sql;
                    if (sqlCaches.logs.length === 0 &&
                        sqlCaches.errors.length === 0)
                    {
                        sql = SQL.getLocalStorage();
                        if (sql == null) {
                            sql = "";
                        }
                    } else {
                        sql = JSON.stringify(sqlCaches);
                    }

                    $hiddenInput.val(sql).select();
                    document.execCommand("copy");
                    $hiddenInput.remove();
                    xcHelper.showSuccess();
                });
                break;
            case "support":
                // generate bundle button
                html = '<button type="button" class="btn genSub" ' +
                        'data-toggle="tooltip" title="' + TooltipTStr.GenBundle + '">' +
                            CommonTxtTstr.GenBundle +
                        '</button>';
                $btn = $(html);

                $btn.click(function() {
                    var $supportBtn = $(this).blur();
                    xcHelper.toggleBtnInProgress($supportBtn);
                    // Tis flow is a little from xcHelper.genSub
                    XcalarSupportGenerate()
                    .then(function(path, bid) {
                        if (doneCallback instanceof Function) {
                            doneCallback(path, bid);
                        }
                        xcHelper.showSuccess();
                        $supportBtn.text(CommonTxtTstr.GenBundleDone)
                            .addClass("btn-disabled");
                    })
                    .fail(function(error) {
                        console.error(error);
                        // XXX TODOs: use xcHelper.showFail() instead
                        // (function not implement yet!)
                        xcHelper.toggleBtnInProgress($supportBtn);
                        if (failCallback instanceof Function) {
                            failCallback(error);
                        }
                    });
                });

                break;
            default:
                // log out button
                html = '<button type="button" class="btn logout">' +
                            CommonTxtTstr.LogOut +
                        '</button>';
                $btn = $(html);
                $btn.click(function() {
                    $(this).blur();
                    unloadHandler();
                });

        }

        return $btn;
    };

    xcHelper.validate = function(eles) {
        /*
         * eles is an object or an array of object, each object includes:

           $selector: selector to check
           check    : function to check validation, if empty, will check if the
                      value of selecor is empty. Val of the selector will be
                      passed into the function
           text     : text to show if now pass the check
           noWarn   : if set true, will not show any warnning box.
           callback : if not null, will call it after check fails
           isAlert  : if set true, will show Alert Modal, default is StatusBox
           formMode : if set true, will use StatusBox's form mode
           side     : string, side to show the pop up
           ...      : to be extened in the future.

         * Check will run in array's order.
         */

        if (!(eles instanceof Array)) {
            eles = [eles];
        }

        for (var i = 0; i < eles.length; i++) {
            var ele = eles[i];
            var $e  = ele.$selector;
            var val = $e.is("input") ? $e.val() : $e.text();
            var error;
            var notValid;

            if (ele.check != null) {
                notValid = ele.check(val);
                error = ele.text || ErrTStr.InvalidField;
            } else {
                notValid = (val.trim() === "");
                error = ele.text || ErrTStr.NoEmpty;
            }

            if (notValid) {
                if (ele.noWarn) {
                    return false;
                }
                var options = {};
                if (ele.side) {
                    options.side = ele.side;
                }

                if (ele.callback) {
                    StatusBox.show(error, $e, ele.formMode, options);
                    ele.callback();
                } else if (ele.isAlert) {
                    Alert.error(ErrTStr.InvalidField, ele.text);
                } else {
                    StatusBox.show(error, $e, ele.formMode, options);
                }

                return false;
            }
        }

        return true;
    };

    xcHelper.getTableName = function(wholeName) {
        // get out tableName from tableName + hashId
        var hashIndex = wholeName.lastIndexOf('#');
        var tableName;
        if (hashIndex > -1) {
            tableName = wholeName.substring(0, hashIndex);
        } else {
            tableName = wholeName;
        }
        return tableName;
    };

    //expects 'schedule#AB12' and retuns 'AB12'
    xcHelper.getTableId = function(wholeName) {
        if (wholeName == null) {
            return null;
        }
        // get out hashId from tableName + hashId
        var hashIndex = wholeName.lastIndexOf('#');
        if (hashIndex > -1) {
            return wholeName.substring(hashIndex + 1);
        } else {
            console.warn('Table name does not contain hashId');
            return null;
        }
    };

    xcHelper.getTableNameFromId = function(tableId) {

        if (!gTables) {
            return "";
        }

        if (!(tableId in gTables)) {
            return "";
        }
        return (gTables[tableId].tableName);
    };

    xcHelper.getBackTableSet = function() {
        var deferred = jQuery.Deferred();

        XcalarGetTables()
        .then(function(backEndTables) {
            var backTables = backEndTables.nodeInfo;
            var numBackTables = backEndTables.numNodes;
            var backTableSet = {};

            for (var i = 0; i < numBackTables; i++) {
                // record the table
                backTableSet[backTables[i].name] = true;
            }

            deferred.resolve(backTableSet, numBackTables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    xcHelper.checkDupTableName = function(tableName) {
        // we will only check against active and archived list
        // there's a chance of conflict if a backend table has same tablename
        // with hashtagId but that occurence is rare and is handled by the backend
        var table;
        for (var tableId in gTables) {
            table = gTables[tableId];
            if (table.status === TableType.Active ||
                table.status === TableType.Archived) {
                if (xcHelper.getTableName(table.tableName) === tableName) {
                    return (false);
                }
            }
        }

        return (true);
    };

    xcHelper.suggestType = function(datas, currentType, confidentRate) {
        if (currentType === "integer" || currentType === "float") {
            return currentType;
        }

        if (confidentRate == null) {
            confidentRate = 1;
        }

        if (!(datas instanceof Array)) {
            datas = [datas];
        }

        var isFloat;
        var validData = 0;
        var numHit = 0;
        var booleanHit = 0;

        for (var i = 0, len = datas.length; i < len; i++) {
            var data = datas[i];
            if (data == null) {
                // skip this one
                continue;
            }

            data = data.trim().toLowerCase();
            if (data === "") {
                // skip this one
                continue;
            }

            validData++;
            var num = Number(data);
            if (!isNaN(num)) {
                numHit++;

                if (!isFloat && !Number.isInteger(num)) {
                    // when it's float
                    isFloat = true;
                }
            } else if (data === "true" || data === "false" ||
                data === "t" || data === "f") {
                booleanHit++;
            }
        }

        if (validData === 0) {
            return "string";
        } else if (numHit / validData >= confidentRate) {
            if (isFloat) {
                return "float";
            } else {
                return "integer";
            }
        } else if (booleanHit / validData) {
            return "boolean";
        } else {
            return "string";
        }
    };

    xcHelper.lockTable = function(tableId, txId) {
        // lock worksheet as well
        xcHelper.assert((tableId != null), "Invalid Parameters!");

        var $tableWrap = $("#xcTableWrap-" + tableId);
        if ($tableWrap != null &&
            $tableWrap.length !== 0 &&
            !$tableWrap.hasClass('tableLocked'))
        {
            // tableWrap may not exist during multijoin on self
            var $lockedIcon = $(
                '<div class="lockedTableIcon" data-txid="' + txId +'">' +
                  '<div class="iconPart" data-toggle="tooltip" ' +
                    'data-original-title="Cancel Operation" ' +
                    'data-placement="top" data-container="body">' +
                    '<div class="leftPart"></div>' +
                    '<div class="rightPart"></div>' +
                    '<i class="icon xi-clock"></i>' +
                    '<i class="icon xi-close"></i>' +
                  '</div>' +
                '</div>');
            $tableWrap.addClass('tableLocked').append($lockedIcon);
            var iconHeight = $lockedIcon.height();
            var tableHeight = $tableWrap.find('.xcTbodyWrap').height();
            var tbodyHeight = $tableWrap.find('tbody').height() + 1;
            var mainFrameHeight = $('#mainFrame').height();
            var topPos = 50 * ((tableHeight - (iconHeight/2))/ mainFrameHeight);
            topPos = Math.min(topPos, 40);
            $lockedIcon.css('top', topPos + '%');
            
            $tableWrap.find('.xcTbodyWrap').append('<div class="tableCover">' +
                                                   '</div>');
            $tableWrap.find('.tableCover').height(tbodyHeight);
            $('#rowScroller-' + tableId).addClass('locked');
            // add lock class to dataflow
            $('#dagWrap-' + tableId).addClass('locked');
            
            moveTableTitles();

            // prevent vertical scrolling on the table
            var $tbody = $tableWrap.find('.xcTbodyWrap');
            var scrollTop = $tbody.scrollTop();
            $tbody.on('scroll.preventScrolling', function() {
                $tbody.scrollTop(scrollTop);
            });
        }
        var lockHTML = '<div class="lockIcon"></div>';
        $('#dagPanel').find('.dagTable[data-id="' + tableId + '"]')
                        .filter(function() {
                            return !$(this).hasClass('trueLocked');
                        }).addClass('locked trueLocked').append(lockHTML);

        gTables[tableId].lock();
        WSManager.lockTable(tableId);
        SQL.lockUndoRedo();
    };

    xcHelper.unlockTable = function(tableId) {
        xcHelper.assert((tableId != null), "Invalid Parameters!");

        var table = gTables[tableId];
        table.unlock();
        if (table.isActive()) {
            var $tableWrap = $("#xcTableWrap-" + tableId);
            $tableWrap.find('.lockedTableIcon').remove();
            $tableWrap.find('.tableCover').remove();
            $tableWrap.removeClass('tableLocked');
            $('#rowScroller-' + tableId).removeClass('locked');
            $('#dagWrap-' + tableId).removeClass('locked');

            var $tbody = $tableWrap.find('.xcTbodyWrap');
            $tbody.off('scroll.preventScrolling');
        }
        $('#dagPanel').find('.dagTable[data-id="' + tableId + '"]')
                      .removeClass('locked trueLocked')
                      .find('.lockIcon').remove();
        WSManager.unlockTable(tableId);
        SQL.unlockUndoRedo();
    };

    xcHelper.disableSubmit = function($submitBtn) {
        $submitBtn.prop('disabled', true);
    };

    xcHelper.enableSubmit = function($submitBtn) {
        $submitBtn.prop('disabled', false);
    };

    // inserts text into an input field and adds commas
    // detects where the current cursor is and if some text is already selected
    xcHelper.insertText = function($input, textToInsert, options) {
        var inputType = $input.attr('type');
        if (inputType !== "text") {
            console.warn('inserting text on inputs of type: "' + inputType +
                            '" is not supported');
            return;
        }
        options = options || {};

        if (!options.append) {
            $input.val(textToInsert).trigger('input');
            // fires input event in case any listeners react to it
            $input.focus();
            return;
        }

        var value  = $input.val();
        var valLen = value.length;
        var newVal;
        var initialScrollPosition = $input.scrollLeft();
        var currentPos = $input[0].selectionStart;
        var selectionEnd = $input[0].selectionEnd;
        var numCharSelected = selectionEnd - currentPos;
        var strLeft;
        var resVal = "";

        if (valLen === 0) {
            // add to empty input box
            newVal = textToInsert;
            resVal = newVal;
            currentPos = newVal.length;
        } else if (numCharSelected > 0) {
            // replace a column
            strLeft = value.substring(0, currentPos);
            newVal = textToInsert;
            resVal = strLeft + newVal + value.substring(selectionEnd);
            currentPos = strLeft.length + newVal.length;
        } else if (currentPos === valLen) {
            // append a column
            if (value.endsWith(",")) {
                // value ends with ",""
                newVal = " " + textToInsert;
            } else if (value.trimRight().endsWith(",")) {
                // value ends with sth like ",  "
                newVal = textToInsert;
            } else {
                newVal = ", " + textToInsert;
            }
            resVal = value + newVal;

            currentPos = value.length + newVal.length;
        } else if (currentPos === 0) {
            // prepend a column
            if (value.trimLeft().startsWith(",")) {
                // value start with sth like "  ,"
                newVal = textToInsert;
            } else {
                newVal = textToInsert + ", ";
            }
            resVal = newVal + value;

            currentPos = newVal.length; // cursor at the start of value
        } else {
            // insert a column. numCharSelected == 0
            strLeft = value.substring(0, currentPos);

            newVal = textToInsert + ", ";
            resVal = strLeft + newVal + value.substring(selectionEnd);

            currentPos = strLeft.length + newVal.length;
        }

        $input.focus();
        if (!document.execCommand("insertText", false, newVal)) {
            $input.val(resVal);
        }

        var inputText = $input.val().substring(0, currentPos);
        var textWidth = getTextWidth($input, inputText);
        var newValWidth = getTextWidth($input, newVal);
        var inputWidth = $input.width();
        var widthDiff = textWidth - inputWidth;
        if (widthDiff > 0) {
            $input.scrollLeft(initialScrollPosition + newValWidth);
        }
    };

    xcHelper.getFocusedTable = function() {
        var $table = $(".xcTableWrap .tblTitleSelected").closest(".xcTableWrap");
        if ($table.length === 0) {
            return null;
        }

        return $table.data("id");
    };

    // animate: boolean indicating whether to animate the scrolling
    // options:
    //      onlyIfOffScreen: boolean, if true, will only animate table if visible
    //      alignLeft: boolean, if true, will align table to left of screen
    xcHelper.centerFocusedTable = function(tableWrapOrId, animate, options) {
        var deferred = jQuery.Deferred();
        var $tableWrap;
        var tableId;
        if (typeof tableWrapOrId === "string") {
            $tableWrap = $('#xcTableWrap-' + tableWrapOrId);
            tableId = tableWrapOrId;
        } else {
            $tableWrap = tableWrapOrId;
            tableId = $tableWrap.data('id');
        }
       
        var wsId = WSManager.getWSFromTable(tableId);
        if (wsId !== WSManager.getActiveWS()) {
            WSManager.switchWS(wsId);
        }

        focusTable(tableId);
        
        options = options || {};
     
        var tableWidth = $tableWrap.width();
        var tableLeft = $tableWrap.offset().left;
        var tableRight = tableLeft + tableWidth;
        var mainMenuOffset = MainMenu.getOffset();
        var $mainFrame = $('#mainFrame');
        var mainFrameWidth = $mainFrame.width();
        var mainFrameRight = $mainFrame[0].getBoundingClientRect().right;
        // cases to center: if table is small enough to fit entirely within the
        // window.
        // otherwise align table to the left of the window
        // cases to alignRight - if table is partially visible from the left
        // side of the screen
        // alignCenter takes precedence over alignRight and alignLeft
        
        if (tableLeft < mainMenuOffset && tableRight > mainFrameRight) {
            // table takes up the entire screen and more
            // no need to center
            deferred.resolve();
            return deferred.promise();
        }

        // if this option is passed, it will not focus on the table if at least
        // 150 px of it is visible. If the table is offscreen, no animation will
        // be applied to the scrolling. If it's partially visible (0 - 150px),
        // animation will be applied
        if (options.onlyIfOffScreen) {
            if (tableRight > mainMenuOffset &&
                tableRight < (mainMenuOffset + 150)) {
                // table is slightly visible on the left
                animate = true;
            } else if (tableLeft < mainFrameRight &&
                      tableLeft > mainFrameRight - 150) {
                // table is slightly visible on the right
                animate = true;
            } else if (tableRight < mainMenuOffset ||
                        tableLeft > mainFrameRight) {
                // table is offscreen, proceed to center the table
                // no animation
            } else {
                // table is in view and at least 150 pixels are visible
                deferred.resolve();
                return deferred.promise();
            }
        }

        var currentScrollPosition = $('#mainFrame').scrollLeft();
        var leftPosition = currentScrollPosition + tableLeft - mainMenuOffset;


        if (tableWidth < mainFrameWidth) {
            // table fits completely within window so we center it
            scrollPosition = leftPosition + ((tableWidth - mainFrameWidth) / 2);
        } else if (tableRight > mainMenuOffset && tableRight < mainFrameRight) {
            // table is partially visible from the left side of the screen
            // so we align the right edge of the table to the right of window
            scrollPosition = leftPosition + (tableWidth - mainFrameWidth);
        } else {
            // align left by default
            scrollPosition = leftPosition;
        }

        if (animate && !gMinModeOn) {
            $('#mainFrame').animate({scrollLeft: scrollPosition}, 500,
                                function() {
                                    moveFirstColumn();
                                    xcHelper.removeSelectionRange();
                                    deferred.resolve();
                                });
        } else {
            $('#mainFrame').scrollLeft(scrollPosition);
            moveFirstColumn();
            deferred.resolve();
        }
        return deferred.promise();
    };

    // animate: boolean indicating whether to animate the scrolling
    xcHelper.centerFocusedColumn = function(tableId, colNum, animate) {
        var $tableWrap = $('#xcTableWrap-' + tableId);
        var windowWidth = $(window).width();
        var currentScrollPosition = $('#mainFrame').scrollLeft();
        var $th = $tableWrap.find('th.col' + colNum);
        var columnOffset = $th.offset().left;
        var colWidth = $th.width();

        var leftPosition = currentScrollPosition + columnOffset;
        var scrollPosition = leftPosition - ((windowWidth - colWidth) / 2);

        focusTable(tableId);
        $th.find('.flex-mid').mousedown();

        if (animate && !gMinModeOn) {
            $('#mainFrame').animate({scrollLeft: scrollPosition}, 500,
                                function() {
                                    focusTable(tableId);
                                    moveFirstColumn();
                                    xcHelper.removeSelectionRange();
                                });
        } else {
            $('#mainFrame').scrollLeft(scrollPosition);
            moveFirstColumn();
        }
    };

    xcHelper.isTableInScreen = function(tableId, winWidth) {
        var windowWidth = winWidth || $(window).width();
        var $tableWrap = $("#xcTableWrap-" + tableId);
        var tableLeft = $tableWrap.offset().left;
        var tableRight = tableLeft + $tableWrap.width();
        var mainFrameOffsetLeft = MainMenu.getOffset();

        return (tableRight >= mainFrameOffsetLeft) && (tableLeft <= windowWidth);
    };

    xcHelper.createNextName = function(str, delimiter) {
        var parts = str.split(delimiter);
        var rets = /([0-9])+/.exec(parts[parts.length-1]);
        if (rets && rets.index === 0 &&
            rets[0].length === parts[parts.length-1].length) {
            parts[parts.length-1] = parseInt(parts[parts.length-1]) + 1;
            return parts.join(delimiter);
        } else {
            return str+delimiter+"1";
        }
    };

    xcHelper.hasSpecialChar = function(str, allowSpace) {
        if (allowSpace) {
            return /[^a-zA-Z\d\s:]/.test(str);
        } else {
            return /[^a-zA-Z\d]/.test(str);
        }
    };

    xcHelper.escapeHTMlSepcialChar = function(str) {
        // esacpe & to &amp;, so text &quot; will not become " in html
        // escape < & > so external html doesn't get injected
        return str.replace(/\&/g, "&amp;")
                    .replace(/\</g, "&lt;")
                    .replace(/\>/g, "&gt;")
                    .replace(/\\t/g, "&emsp;");
    };

    xcHelper.escapeRegExp = function(str) {
        return (str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"));
    };

    xcHelper.escapeColName = function(str) {
        // adds a backslash before each of these: [ ] . \
        return (str.replace(/[\[\]\.\\]/g, "\\$&"));
    };

    xcHelper.unescapeColName = function(str) {
        str = str.replace(/\\\\/g, "\\");
        str = str.replace(/\\\./g, "\.");
        str = str.replace(/\\\[/g, "\[");
        str = str.replace(/\\\]/g, "\]");
        return (str);
    };

    xcHelper.stripeColName = function(colName) {
        var res = colName.split(/[\[\]\.\\]/g).filter(function(str) {
            return (str !== "");
        }).join("_");
        return res;
    };

    xcHelper.scrollToBottom = function($target) {
        // scroll to bottom
        var scrollDiff = $target[0].scrollHeight - $target.height();
        if (scrollDiff > 0) {
            $target.scrollTop(scrollDiff);
        }
    };

    xcHelper.createSelection = function(element, atEnd) {
        if (element == null) {
            return;
        }
        var range;
        var selection;

        if (window.getSelection && document.createRange) {
            range = document.createRange();
            range.selectNodeContents(element);
            // move the cursor to end, else select all
            if (atEnd) {
                range.collapse(false);
            }
            selection = window.getSelection();
            selection.removeAllRanges();
            try {
                selection.addRange(range);
            } catch (error) {
                console.warn(error);
            }

        } else if (document.body.createTextRange) {
            range = document.body.createTextRange();
            range.moveToElementText(element);

            if (atEnd) {
                range.collapse(false);
            }
            range.select();
        }
    };

    xcHelper.removeSelectionRange = function() {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    };

    // globally prevents all text from being selected and disables all inputs
    xcHelper.disableTextSelection = function() {
        xcHelper.removeSelectionRange();
        var style =
            '<style id="disableSelection" type="text/css">*' +
                '{ -ms-user-select:none;-moz-user-select:-moz-none;' +
                '-khtml-user-select:none;' +
                '-webkit-user-select:none;user-select:none;}' +
                'div[contenteditable]{pointer-events:none;}' +
            '</style>';
        $(document.head).append(style);
        $('.tooltip').remove();
        $('input:enabled').prop('disabled', true).addClass('tempDisabledInput');
    };

    xcHelper.reenableTextSelection = function() {
        $('#disableSelection').remove();
        $('.tempDisabledInput').removeClass('tempDisabledInput')
                               .prop('disabled', false);
    };

    xcHelper.castStrHelper = function(colName, colType) {
        var mapStr = "";
        switch (colType) {
            case ("boolean"):
                mapStr += "bool(";
                break;
            case ("float"):
                mapStr += "float(";
                break;
            case ("integer"):
                mapStr += "int(";
                break;
            case ("string"):
                mapStr += "string(";
                break;
            default:
                console.warn("XXX no such operator! Will guess");
                mapStr += colType + "(";
                break;
        }

        if (colType === "integer") {
            mapStr += colName + ", 10)";
        } else {
            mapStr += colName + ")";
        }
        
        return mapStr;
    };

    // if string is somet\"thing then str is somet\"thing
    // and startIndex is the index of the quote you're testing -> 7
    xcHelper.isCharEscaped = function(str, startIndex) {
        var backSlashCount = 0;

        for (var i = startIndex - 1; i >= 0; i--) {
            if (str[i] === "\\") {
                backSlashCount++;
            } else {
                break;
            }
        }
        return (backSlashCount % 2 === 1);
    };

    // returns true if comparison is equal
    // returns false if diff found
    xcHelper.deepCompare = function() {
        var leftChain;
        var rightChain;

        function compare2Objects(x, y) {
            // check if both are NaN
            if (isNaN(x) && isNaN(y) && typeof x === 'number' &&
                typeof y === 'number') {
                return (true);
            }

            if (x === y) {
                return (true);
            }

            if (!(x instanceof Object && y instanceof Object)) {
                return (false);
            }

            // Check for infinitive linking loops
            if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
                return (false);
            }

            // Quick checking of one object being a subset of another.
            for (var p in y) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return (false);
                } else if (typeof y[p] !== typeof x[p]) {
                    return (false);
                }
            }

            for (var p in x) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return (false);
                } else if (typeof y[p] !== typeof x[p]) {
                    return (false);
                }

                switch (typeof (x[p])) {
                    case ('object'):
                    case ('function'):

                        leftChain.push(x);
                        rightChain.push(y);

                        if (!compare2Objects(x[p], y[p])) {
                            return (false);
                        }

                        leftChain.pop();
                        rightChain.pop();
                        break;
                    default:
                        if (x[p] !== y[p]) {
                            return (false);
                        }
                        break;
                }
            }

            return (true);
        }

        if (arguments.length < 1) {
            return (true);
        }
        var len = arguments.length;
        for (var i = 1; i < len; i++) {

            leftChain = [];
            rightChain = [];

            if (!compare2Objects(arguments[0], arguments[i])) {
                return (false);
            }
        }

        return (true);
    };

    xcHelper.delimiterTranslate = function($input) {
        if ($input.hasClass("nullVal")) {
            return "";
        }

        var delimiter = $input.val();
        // this change " to \", otherwise cannot use json parse
        for (var i = 0; i < delimiter.length; i++) {
            if (delimiter[i] === "\"" &&
                !xcHelper.isCharEscaped(delimiter, i)) {
                delimiter = delimiter.slice(0, i) + "\\" + delimiter.slice(i);
                i++;
            }
        }

        // hack to turn user's escaped string into its actual value
        var obj = '{"val":"' + delimiter + '"}';
        try {
            delimiter = JSON.parse(obj).val;
        } catch (err) {
            delimiter = {fail: true, error: err};
            console.error(err);
        }

        return (delimiter);
    };

    xcHelper.checkMatchingBrackets = function(val) {
        var numOpens = 0;
        var inQuotes = false;
        var singleQuote = false; // ' is true, " is false
        var ret = {
            char : "",
            index: -1 // returns -1 if no mismatch found
        };
        for (var i = 0; i < val.length; i++) {
            if (inQuotes) {
                if ((singleQuote && val[i] === "'") ||
                    (!singleQuote && val[i] === '"')) {
                    inQuotes = false;
                } else if (val[i] === '\\') {
                    i++; // ignore next character
                }
                continue;
            }
            if (val[i] === '"') {
                inQuotes = true;
                singleQuote = false;
            } else if (val[i] === "'") {
                inQuotes = true;
                singleQuote = true;
            } else if (val[i] === '\\') {
                i++; // ignore next character
            } else if (val[i] === "(") {
                numOpens++;
            } else if (val[i] === ")") {
                numOpens--;
                if (numOpens < 0) {
                    ret.char = ")";
                    ret.index = i;
                    return (ret);
                }
            }
        }
        if (numOpens === 0) {
            return (ret);
        } else {
            ret.char = "(";
            ret.index = val.indexOf("(");
            return (ret);
        }
    };

    /**
     * @param  {$element} $target $element you're picking/clicking
     * @param  {$element} $input  input to be filled in with picked text
     * @param  {string} prefix  prefix to prepend to picked text
     * @param  {object} options:
     *         type: string, if "table", will pick from table header
     *         append: boolean, if true, will append text rather than replace
     */
    xcHelper.fillInputFromCell = function ($target, $input, prefix, options) {
        if ($target == null || $input == null) {
            console.error("error case");
            return;
        }
        // $input needs class "argument"
        if ((!$input.hasClass('argument') && !$input.hasClass('arg')) ||
            $input.closest('.colNameSection').length !== 0 ||
            $input.attr("type") !== "text")
        {
            return;
        }
        options = options || {};
        prefix = prefix || "";

        if (options.type === "table") {
            $target = $target.find('.text');
            value = prefix + $target.data('title');
        } else {
            if ($target.closest('.header').length) {
                $target = $target.closest('.header').find('.editableHead');
            } else {
                var colNum = xcHelper.parseColNum($target.closest('td'));
                $target = $target.closest('table')
                                .find('.editableHead.col' + colNum);
            }
            value = prefix + $target.val();
        }
        xcHelper.insertText($input, value, {append: options.append});
        gMouseEvents.setMouseDownTarget($input);
    };

    xcHelper.removeTooltip = function($element, selector) {
        var $elementToChange = $element;
        if (selector) {
            $elementToChange = $element.find(selector);
        }

        $elementToChange.removeAttr("title")
                        .removeAttr("data-toggle")
                        .removeAttr("data-container")
                        .removeAttr("data-placement")
                        .removeAttr("data-original-title");
        $(".tooltip").hide();
        return ($element);
    };

    xcHelper.addTooltip = function($element, selector, options) {
        var title = options.title || ""; // You must have this!
        var toggle = "tooltip";
        var container = options.container || "body";
        var placement = options.placement || "top";

        var $elementToChange = $element;
        if (selector) {
            $elementToChange = $element.find(selector);
        }

        $elementToChange.attr("title", "")
                        .attr("data-toggle", toggle)
                        .attr("data-container", container)
                        .attr("data-placement", placement)
                        .attr("data-original-title", title);
        return ($element);
    };

    xcHelper.temporarilyDisableTooltip = function($element, selector) {
        var $elementToChange = $element;
        if (selector) {
            $elementToChange = $element.find(selector);
        }

        $elementToChange.removeAttr("data-toggle")
                        .removeAttr("title");
    };

    xcHelper.reenableTooltip = function($element, selector) {
        var $elementToChange = $element;
        if (selector) {
            $elementToChange = $element.find(selector);
        }

        $elementToChange.attr("data-toggle", "tooltip");
    };

    xcHelper.changeTooltipText = function($element, selector, text) {
        var $elementToChange = $element;
        if (selector) {
            $elementToChange = $element.find(selector);
        }


        $elementToChange.attr("title", "")
                        .attr("data-original-title", text);
    };

    xcHelper.autoTooltip = function(ele) {
        var $ele = $(ele);
        if (ele.offsetWidth < ele.scrollWidth) {
            $ele.attr({
                'data-container': 'body',
                'data-toggle'   : 'tooltip'
            });
        } else {
            $ele.removeAttr('data-container data-toggle');
        }
    };

    var tooltipTimer;
    xcHelper.refreshTooltip = function($ele, timer) {
        clearTimeout(tooltipTimer);
        $ele.mouseenter();
        $ele.mouseover();
        if (timer) {
            tooltipTimer = setTimeout(function() {
                $ele.mouseleave();
            }, timer);
        }
    };

    // not only looks for gColPrefix but checks to make sure it's not preceded by
    // anything other than a comma
    xcHelper.hasValidColPrefix = function(str) {
        var hasPrefix = false;
        if (typeof str !== "string") {
            return false;
        }

        str = str.trim();

        var colNames = [];
        var cursor = 0;
        var prevCharIsComma = false;
        for (var i = 0; i < str.length; i++) {
            if (!xcHelper.isCharEscaped(str, i)) {
                if (!prevCharIsComma && str[i] === ",") {
                    colNames.push(str.slice(cursor, i).trim());
                    cursor = i + 1;
                    prevCharIsComma = true;
                } else if (!prevCharIsComma && str[i] === " ") {
                    // "colname colname" instead of "colname, colname"
                    // we will assume "colname colname" is one column with spaces
                } else if (str[i] !== " ") {
                    prevCharIsComma = false;
                }
            }
        }

        colNames.push(str.slice(cursor, i).trim());

        var colName;
        for (var i = 0; i < colNames.length; i++) {
            colName = colNames[i];
            if (colName.length < 2) {
            // colName must be at least 2 characters long including the colPrefix
                return false;
            }
            if (colName[0] === gColPrefix) {
                for (var j = 1; j < colName.length; j++) {
                    if (colName[j] === gColPrefix &&
                        !xcHelper.isCharEscaped(colName, j)) {
                        // shouldn't have non escaped colprefix in colname
                        return false;
                    }
                }
                hasPrefix = true;
            } else {
                return false;
            }
        }
        return hasPrefix;
    };

    // turns camelCase to Camel Case
    xcHelper.camelCaseToRegular = function(str) {
        return (str.replace(/([A-Z])/g, ' $1')
                             .replace(/^./, function(str) {
                                 return (str.toUpperCase());
                             }).trim());
    };

    //xx not tested
    // turns 'map(concat  ("a   ", "b"))' into 'map(concat("a   ","b"))'
    xcHelper.removeNonQuotedSpaces = function(str) {
        var tempString = "";
        var inQuotes = false;
        var singleQuote = false;
        var isEscaped = false;
        for (var i = 0; i < str.length; i++) {
            if (isEscaped) {
                tempString += str[i];
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((str[i] === '"' && !singleQuote) ||
                    (str[i] === "'" && singleQuote)) {
                    inQuotes = false;
                }
            } else {
                if (str[i] === "\"") {
                    inQuotes = true;
                    singleQuote = false;
                } else if (str[i] === "'") {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (str[i] === "\\") {
                isEscaped = true;
                tempString += str[i];
            } else if (inQuotes) {
                tempString += str[i];
            } else {
                if (str[i] !== " ") {
                    tempString += str[i];
                }
            }
        }
        return (tempString);
    }

    // a.json returns JSON
    xcHelper.getFormat = function(name) {
        var index = name.lastIndexOf(".");

        if (index < 0) {
            return null;
        }

        var ext = name.substring(index + 1, name.length).toUpperCase();
        var formatMap = {
            "JSON": "JSON",
            "CSV" : "CSV",
            "TSV" : "CSV",
            "XLSX": "Excel",
            "XLS" : "Excel",
            "TXT" : "TEXT"
        };

        if (formatMap.hasOwnProperty(ext)) {
            return (formatMap[ext]);
        } else {
            return null;
        }
    };

    // XX unit test not written
    /**
     * sortVals
     * @param  {string} a     [first value]
     * @param  {string} b     [sescond value]
     * @param  {integer} order 1 for ascending, -1 for descending
     */
    xcHelper.sortVals = function(a, b, order) {
        if (order == null) {
            order = -1;
        }
        a = a.toLowerCase();
        b = b.toLowerCase();

        // if a = "as1df12", return ["as1df12", "as1df", "12"]
        // if a = "adfads", return null
        var matchA = a.match(/(^.*?)([0-9]+$)/);
        var matchB = b.match(/(^.*?)([0-9]+$)/);
        if (matchA != null && matchB != null && matchA[1] === matchB[1]) {
            // if the rest part that remove suffix number is same,
            // compare the suffix number
            a = parseInt(matchA[2]);
            b = parseInt(matchB[2]);
        }

        if (a < b) {
            return (order);
        } else if (a > b) {
            return (-order);
        } else {
            return (0);
        }
    };

    // used to split query into array of subqueries by semicolons
    // XX not checking for /n or /r delimiter, just semicolon
    // returns array of objects, objects contain query, name, and dstTable
    // options: {}, isExport: boolean,
    xcHelper.parseQuery = function(query, options) {
        options = options || {};
        var tempString = "";
        var inQuotes = false;
        var singleQuote = false;
        var isEscaped = false;
        var queries = [];
        var subQuery;
        var operationName;
        var isExport = query.trim().indexOf('export') === 0;
          // export has semicolons between colnames and breaks most rules
        for (var i = 0; i < query.length; i++) {
            if (isEscaped) {
                tempString += query[i];
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((query[i] === "\"" && !singleQuote) ||
                    (query[i] === "'" && singleQuote)) {
                    inQuotes = false;
                }
            } else {
                if (query[i] === "\"") {
                    inQuotes = true;
                    singleQuote = false;
                } else if (query[i] === "'") {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (query[i] === "\\") {
                isEscaped = true;
                tempString += query[i];
            } else if (inQuotes) {
                tempString += query[i];
            } else {
                if (query[i] === ";" && !isExport) {
                    tempString = tempString.trim();
                    operationName = tempString.split(" ")[0];
                    subQuery = {
                        "query"    : tempString,
                        "name"     : operationName,
                        "srcTables": getSrcTableFromQuery(tempString,
                                                         operationName),
                        "dstTable": getDstTableFromQuery(tempString,
                                                          operationName)
                    };
                    queries.push(subQuery);
                    tempString = "";
                } else if (tempString === "" && query[i] === " ") {
                    // a way of trimming the front of the string
                    continue;
                } else {
                    tempString += query[i];
                }
            }
        }
        if (tempString.trim().length) {
            tempString = tempString.trim();
            operationName = tempString.split(" ")[0];
            subQuery = {
                "query"    : tempString,
                "name"     : operationName,
                "srcTables": getSrcTableFromQuery(tempString, operationName),
                "dstTable" : getDstTableFromQuery(tempString, operationName)
            };
            if (isExport) {
                subQuery.exportFileName = getExportFileNameFromQuery(tempString);
            }
            queries.push(subQuery);
        }

        return (queries);
    };

    function getSrcTableFromQuery(query, type) {
        var keyWord = "--srctable";
        if (type === "join") {
            keyWord = "--leftTable";
        }
        var index = getKeyWordIndexFromQuery(query, keyWord);
        var tableNames = [];
        if (index === -1) {
            return null;
        }
        index += keyWord.length;
        var trimmedQuery = query.slice(index).trim();
        var tableName = parseSearchTerm(trimmedQuery);
        if (tableName) {
            tableNames.push(tableName);
        }
        if (type === "join") {
            keyWord = "--rightTable";
            index = getKeyWordIndexFromQuery(query, keyWord);
            if (index !== -1) {
                index += keyWord.length;
                trimmedQuery = query.slice(index).trim();
                tableName = parseSearchTerm(trimmedQuery);
                if (tableName) {
                    tableNames.push(tableName);
                }
            }
        }
        return (tableNames);
    }

    function getDstTableFromQuery(query, type) {
        var keyWord = "--dsttable";

        if (type === "join") {
            keyWord = "--joinTable";
        } else if (type === "load") {
            keyWord = "--name";
        } else if (type === "export") {
            keyWord = "--exportName";
        }

        var index = getKeyWordIndexFromQuery(query, keyWord);
        if (index === -1) {
            return null;
        }
        // var singleQuote;

        index += keyWord.length;
        query = query.slice(index).trim();
        var tableName = parseSearchTerm(query);
        
        if (type === "load" && tableName.indexOf(gDSPrefix) === -1) {
            tableName = gDSPrefix + tableName;
        }
        return (tableName);
    }

    function getExportFileNameFromQuery(query) {
        var keyWord = "--fileName";

        var index = getKeyWordIndexFromQuery(query, keyWord);
        if (index === -1) {
            return null;
        }

        index += keyWord.length;
        query = query.slice(index).trim();
        return (parseSearchTerm(query));
    }

    // if passing in "tableNa\"me", will return tableNa\me and not tableNa
    function parseSearchTerm(str) {
        var quote = str[0];
        var wrappedInQuotes = true;
        if (quote !== "'" && quote !== '"') {
            wrappedInQuotes = false;
        } else {
            str = str.slice(1);
        }

        var isEscaped = false;
        var result = "";
        for (var i = 0; i < str.length; i++) {
            if (isEscaped) {
                isEscaped = false;
                result += str[i];
                continue;
            }
            if (str[i] === "\\") {
                isEscaped = true;
                result += str[i];
            } else if (wrappedInQuotes) {
                if (str[i] === quote) {
                    break;
                } else {
                    result += str[i];
                }
            } else if (!wrappedInQuotes) {
                if (str[i] === " " || str[i] === ";") {
                    break;
                } else {
                    result += str[i];
                }
            }
        }
        return (result);
    }

    function getKeyWordIndexFromQuery(query, keyWord) {
        var inQuotes = false;
        var singleQuote = false;
        var isEscaped = false;
        var keyLen = ("" + keyWord).length;
        for (var i = 0; i < query.length; i++) {
            if (isEscaped) {
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((query[i] === "\"" && !singleQuote) ||
                    (query[i] === "'" && singleQuote)) {
                    inQuotes = false;
                }
            } else {
                if (query[i] === "\"") {
                    inQuotes = true;
                    singleQuote = false;
                } else if (query[i] === "'") {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (query[i] === "\\") {
                isEscaped = true;
            } else if (!inQuotes) {
                if (i >= keyLen && query.slice(i - keyLen, i) === keyWord) {
                    return (i - keyLen);
                }
            }
        }
        return -1;
    }

    // returns array if all columns valid or returns an error object with
    // first invalid column name and reason why it's invalid
    // object includes the following properties
    // invalid: boolean,
    // reason : string,
    // name   : string (frontColName),
    // type   : string
    xcHelper.convertFrontColNamesToBack = function(frontColNames, tblId,
                                                    validTypes) {
        var backCols = [];
        var tableCols = gTables[tblId].tableCols;
        var foundColsArray = [];
        var numColsFound = 0;
        var numFrontColNames = frontColNames.length;
        var i;
        // var numFoundCols;
        // var isObj;
        var frontColName;

        // take all of gTables columns and filter out arrays, data, newcols, objs etc
        // put these columns into colsArray
        var splitCols = splitIntoValidAndInvalidProgCols(tableCols, validTypes);
        var colsArray =  splitCols.validProgCols;
        var invalidProgCols = splitCols.invalidProgCols;
        var numTableCols = colsArray.length;

        // after we've set up colsArray, we check the user's columns against it
        for (i = 0; i < numFrontColNames; i++) {
            var colFound = false;
            var tableCol;
            var j;
            frontColName = frontColNames[i];

            for (j = 0; j < numTableCols; j++) {
                tableCol = colsArray[j];
                // if we find a match, we push the backcolumn name into backCols
                // and remove the column from colsArray and put it into
                // foundColsArray. If we later have a duplicate backcolumn name
                // it will no longer be in colsArray and we will search for it
                // in foundColsArray
                if (frontColName === tableCol.name) {
                    if (tableCol.backName) {
                        backCols.push(tableCol.backName);
                    }
                    var foundCol = colsArray.splice(j, 1)[0];
                    foundColsArray.push(foundCol);
                    j--;
                    numTableCols--;
                    colFound = true;
                    numColsFound++;
                    break;
                }
            }

            // If column was not found,
            // column could be a duplicate so check against the columns we
            // already found and had removed
            if (!colFound) {

                for (j = 0; j < numColsFound; j++) {
                    tableCol = foundColsArray[j];
                    if (frontColName === tableCol.name) {
                        backCols.push(tableCol.backName);
                        colFound = true;
                        break;
                    }
                }
                // column name is not a duplicate and is not found in the
                // valid column array so we check if it's in one of the invalid
                // progCols

                if (!colFound) {
                    var numInvalidCols = invalidProgCols.length;
                    for (j = 0; j < numInvalidCols; j++) {
                        tableCol = invalidProgCols[j];
                        if (frontColName === tableCol.name) {
                            return {
                                invalid: true,
                                reason : 'type',
                                type   : tableCol.type,
                                name   : frontColName
                            };
                        }
                    }
                }
            }
            // if column name was not found in any of the progcols, then
            // it doesn't exist
            if (!colFound) {
                return {
                    invalid: true,
                    reason : 'notFound',
                    name   : frontColName,
                    type   : 'notFound'
                };
            }
        }
        return (backCols);
    };

    // take all of gTables columns and filter out arrays, data, newcols, objs etc
    // put these columns into one Array and the invalid columns in another array
    function splitIntoValidAndInvalidProgCols(tableCols, validTypes) {
        var numTableCols = tableCols.length;
        var colsArray = [];
        var invalidProgCols = [];
        for (var i = 0; i < numTableCols; i++) {
            var col = tableCols[i];
            if (!col.isDATACol() && !col.isEmptyCol()) {
                if (gExportNoCheck) {
                    colsArray.push(col);
                } else {
                    if (validTypes.indexOf(col.type) !== -1) {
                        colsArray.push(col);
                    } else {
                        invalidProgCols.push(col);
                    }
                }
            } else {
                invalidProgCols.push(col);
            }
        }

        return {
            validProgCols  : colsArray,
            invalidProgCols: invalidProgCols
        };
    }

    // xx not in unittest
    // returns {moduleLis: htmlStr, fnLis: htmlStr}
    xcHelper.getUDFList = function(listXdfsObj) {
        var i;
        var len = listXdfsObj.numXdfs;
        var udfs = listXdfsObj.fnDescs;
        var moduleMap = {};
        var modules = [];

        for (i = 0; i < len; i++) {
            modules.push(udfs[i].fnName);
        }

        modules.sort();

        var moduleLi = "";
        var fnLi = "";
        for (i = 0; i < len; i++) {
            var udf = modules[i].split(":");
            var moduleName = udf[0];
            var fnName = udf[1];

            if (!moduleMap.hasOwnProperty(moduleName)) {
                moduleMap[moduleName] = true;
                moduleLi += "<li>" + moduleName + "</li>";
            }

            fnLi += '<li data-module="' + moduleName + '">' +
                        fnName +
                    '</li>';
        }
        return {
            moduleLis: moduleLi,
            fnLis    : fnLi
        };
    };

    xcHelper.repositionModalOnWinResize = function(modalSpecs, windowSpecs) {
        var $modal = modalSpecs.$modal;
        var modalWidth = $modal.width();
        var modalHeight = $modal.height();
        var prevWinWidth = windowSpecs.winWidth;
        var prevWinHeight = windowSpecs.winHeight;
        // this will be used as the starting window  width/height for the
        // next window resize rather than measuring at the beginning of the
        // next resize because the maximize/minimize button will not show
        // the starting window size during the resize event
        windowSpecs.winHeight = $(window).height();
        windowSpecs.winWidth = $(window).width();
        var curWinHeight = windowSpecs.winHeight;
        var curWinWidth = windowSpecs.winWidth;
        var prevWidthAround = prevWinWidth - modalWidth;
        var prevHeightAround = prevWinHeight - modalHeight;
        if (modalWidth > curWinWidth) {
            var diff = curWinWidth - modalWidth;
            $modal.css('left', diff);
        } else if (prevWidthAround < 10) {
            $modal.css('left', (curWinWidth - modalWidth) / 2);
        } else {
            var widthAroundChangeRatio = (curWinWidth - modalWidth) /
                                          prevWidthAround;
            $modal.css('left', modalSpecs.left * widthAroundChangeRatio);
        }

        if (modalHeight > curWinHeight) {
            $modal.css('top', 0);
        } else if (prevHeightAround < 10) {
            $modal.css('top', (curWinHeight - modalHeight) / 2);
        } else {
            var heightAroundChangeRatio = (curWinHeight - modalHeight) /
                                           prevHeightAround;
            $modal.css('top', modalSpecs.top * heightAroundChangeRatio);
        }
    };

    /*
    options: {
        mouseCoors: {x: float, y: float},
        offsetX: float,
        offsetY: float,
        classes: string, ("class1 class2") to assign to $menu
        colNum: integer,
        isMutiCol: boolean,
        multipleColumns: [integers],
        isUnselect: boolean,
        shiftKey: boolean,
        floating: boolean (menu floats around and can pop up above user's mouse)
        callback: function,
        isDataTd: boolean, true if clicking on the json td
    }
    */
    xcHelper.dropdownOpen = function($dropdownIcon, $menu, options) {
        options = options || {};

        if (!($menu instanceof jQuery)) {
            console.error("Need to provide $menu");
            return;
        }

        var tableId;
        var $subMenu;
        var $allMenus;
        var menuId = $menu.attr('id');

        if ($menu.data('submenu')) {
            $subMenu = $('#' + $menu.data('submenu'));
            $allMenus = $menu.add($subMenu);
        } else {
            $allMenus = $menu;
        }

        if (menuId === "tableMenu" || menuId === "colMenu" ||
            menuId === "cellMenu" || menuId === "prefixColorMenu")
        {
            tableId = xcHelper.parseTableId($dropdownIcon.closest(".xcTableWrap"));
        }

        $('.menu .selected').removeClass('selected');
        $(".leftColMenu").removeClass("leftColMenu");
        $('.tooltip').hide();
        removeMenuKeyboardNavigation();
        $menu.removeData("rowNum");

        if (typeof options.callback === "function") {
            options.callback();
        }

        // custom options for each $menu type
        // adds classes, decides whether to close the menu and return;
        var menuHelperResult = menuHelper($dropdownIcon, $menu, $subMenu,
                                          menuId, tableId, options);

        if (menuHelperResult === "closeMenu") {
            closeMenu($allMenus);
            return;
        }

        $(".menu:visible").hide();

        // case that should open the menu (note that colNum = 0 may make it false!)
        if (options.colNum != null && options.colNum > -1) {
            $menu.data("colNum", options.colNum);
            $menu.data("tableId", tableId);
        } else {
            $menu.removeData("colNum");
            $menu.removeData("tableId");
        }
        if (menuId === "tableMenu") {
            $menu.data("tableId", tableId);
        }

        if (menuId === "prefixColorMenu") {
            $menu.data("tableId", tableId)
                .data("prefix", options.prefix || "");
            $menu.find(".wrap").removeClass("selected");
            var color = options.color;
            if (!color) {
                color = "white";
            }

            $menu.find("." + color).addClass("selected");
        }

        if (options.rowNum != null && options.rowNum > -1) {
            $menu.data("rowNum", options.rowNum);
        }

        if (options.classes != null) {
            var className = options.classes.replace("header", "");
            $menu.attr("class", "menu " + className);
            if ($subMenu) {
                $subMenu.attr("class", "menu subMenu " + className);
            }
        }

        // adjust menu height and position it properly
        positionAndShowMenu(menuId, $menu, $dropdownIcon, options);

        addMenuKeyboardNavigation($menu, $subMenu);
    };

    /*
    options: {
        mouseCoors: {x: float, y: float},
        offsetX: float,
        offsetY: float,
        floating: boolean (menu floats around and can pop up above user's mouse)
    }
    */
    function positionAndShowMenu(menuId, $menu, $dropdownIcon, options) {
        var winHeight = $(window).height();
        var bottomMargin = 5;
        var topMargin;
        var menuHeight;
        if (menuId === "cellMenu") {
            topMargin = 15;
        } else if (menuId === "colMenu" || menuId === "tableMenu") {
            topMargin = -4;
        } else {
            topMargin = 0;
        }
        var leftMargin = 5;

        var left;
        var top;
        if (options.mouseCoors) {
            left = options.mouseCoors.x - 5;
            top = options.mouseCoors.y + topMargin;
        } else {
            left = $dropdownIcon[0].getBoundingClientRect().left + leftMargin;
            top = $dropdownIcon[0].getBoundingClientRect().bottom + topMargin;
        }

        if (options.offsetX) {
            left += options.offsetX;
        }
        if (options.offsetY) {
            left += options.offsetY;
        }

        menuHeight = winHeight - top - bottomMargin;
        $menu.css('max-height', menuHeight);
        $menu.children('ul').css('max-height', menuHeight);
        $menu.css({"top": top, "left": left});
        $menu.show();
        $menu.children('ul').scrollTop(0);

        // size menu and ul
        var $ul = $menu.find('ul');
        if ($ul.length > 0) {
            var ulHeight = $menu.find('ul')[0].scrollHeight;
            if (ulHeight > menuHeight) {
                $menu.find('.scrollArea').show();
                $menu.find('.scrollArea.bottom').addClass('active');
            } else {
                $menu.children('ul').css('max-height', 'none');
                $menu.find('.scrollArea').hide();
            }
        }
        // set scrollArea states
        $menu.find('.scrollArea.top').addClass('stopped');
        $menu.find('.scrollArea.bottom').removeClass('stopped');

        // positioning if dropdown is on the right side of screen
        var rightBoundary = $(window).width() - 5;
        if ($menu[0].getBoundingClientRect().right > rightBoundary) {
            left = rightBoundary - $menu.width();
            $menu.css('left', left).addClass('leftColMenu');
        }

        //positioning if td menu is below the screen and floating option is allowed
        if (options.floating) {
            $menu.css('max-height', 'none');
            $menu.children('ul').css('max-height', 'none');
            $menu.find('.scrollArea.bottom').addClass('stopped');
            var offset = 15;
            if (menuId === "worksheetTabMenu") {
                offset = 25;
            } else if (menuId === "cellMenu") {
                offset = 20;
            }
            if (top + $menu.height() + 5 > winHeight) {
                top -= ($menu.height() + offset);
                $menu.css('top', top);
            }
        }
    }

    function menuHelper($dropdownIcon, $menu, $subMenu, menuId, tableId, options) {
        switch (menuId) {
            case ('tableMenu'):
                // case that should close table menu
                if ($menu.is(":visible") && $menu.data('tableId') === tableId) {
                    return "closeMenu";
                }
                updateTableDropdown($menu, options);
                $('.highlightBox').remove();
                break;
            case ('colMenu'):
                // case that should close column menu
                if ($menu.is(":visible") &&
                    $menu.data("colNum") === options.colNum &&
                    $menu.data('tableId') === tableId &&
                    !$menu.hasClass('tdMenu')) {
                    return "closeMenu";
                }
                if (options.multipleColNums) {
                    $menu.data('columns', options.multipleColNums);
                } else {
                    $menu.data('columns', []);
                }
                $subMenu.find('.sort').removeClass('unavailable');
                $('.highlightBox').remove();
                break;
            case ('cellMenu'):
                // case that should close column menu
                if (options.isUnSelect && !options.shiftKey) {
                    return "closeMenu";
                }
                updateTdDropdown($dropdownIcon, $menu, tableId, options);
                break;
            default:
                $('.highlightBox').remove();
                break;
        }
    }

    function updateTdDropdown($div, $menu, tableId, options) {
        // If the tdDropdown is on a non-filterable value, we need to make the
        // filter options unavailable
        var tableCol = gTables[tableId].tableCols[options.colNum - 1];
        var columnType = tableCol.type;
        var isChildOfArray = $('#xcTable-' + tableId)
                                .find('th.col' + options.colNum)
                                .find('.header').hasClass('childOfArray');
        var isUndef = $div.hasClass('undefined') ||
                      $div.find('.undefined').length;
        var shouldNotFilter = options.isMutiCol || isChildOfArray || isUndef ||
                            (
                                columnType !== "string" &&
                                columnType !== "float" &&
                                columnType !== "integer" &&
                                columnType !== "boolean"
                            );
        var notAllowed = $div.find('.null, .blank').length;
        var isMultiCell = $("#xcTable-" + tableId).find(".highlightBox").length > 1;

        var $tdFilter  = $menu.find(".tdFilter");
        var $tdExclude = $menu.find(".tdExclude");

        if (shouldNotFilter || notAllowed) {
            $tdFilter.addClass("unavailable");
            $tdExclude.addClass("unavailable");
        } else {
            $tdFilter.removeClass("unavailable");
            $tdExclude.removeClass("unavailable");
        }

        if (!options.isMutiCol &&
            (tableCol.format != null || tableCol.decimals > -1))
        {
            // when it's only on one column and column is formatted
            if (isMultiCell) {
                $tdFilter.text('Filter pre-formatted values');
                $tdExclude.text('Exclude pre-formatted values');
            } else {
                $tdFilter.text('Filter pre-formatted value');
                $tdExclude.text('Exclude pre-formatted value');
            }
            options.classes += " long";
        } else {
            if (isMultiCell) {
                $tdFilter.text('Filter these values');
                $tdExclude.text('Exclude these values');
            } else {
                $tdFilter.text('Filter this value');
                $tdExclude.text('Exclude this value');
            }
        }

        if ((columnType === "object" || columnType === "array") && !notAllowed) {
            if ($div.text().trim() === "") {
                $menu.find(".tdJsonModal").addClass("hidden");
                $menu.find(".tdUnnest").addClass("hidden");
            } else if (isMultiCell) {
                // when more than one cell is selected
                $menu.find(".tdJsonModal").addClass("hidden");
                $menu.find(".tdUnnest").addClass("hidden");
            } else {
                $menu.find(".tdJsonModal").removeClass("hidden");
                // do not allow pullall from data cell
                if (options.isDataTd) {
                    $menu.find(".tdUnnest").addClass("hidden");
                } else {
                    $menu.find(".tdUnnest").removeClass("hidden");
                }
            }
        } else {
            if ($div.parent().hasClass('truncated')) {
                $menu.find(".tdJsonModal").removeClass("hidden");
            } else {
                $menu.find(".tdJsonModal").addClass("hidden");
            }
            $menu.find(".tdUnnest").addClass("hidden");
        }
    }

    function updateTableDropdown($menu, options) {
        if (options.classes && options.classes.indexOf('locked') !== -1) {
            $menu.find('li:not(.hideTable, .unhideTable)')
                  .addClass('unavailable');
        } else {
            $menu.find('li').removeClass('unavailable');
        }
        var $subMenu = $('#' + $menu.data('submenu'));
        if (WSManager.getWSLen() <= 1) {
            $subMenu.find(".moveToWorksheet").addClass("unavailable");
        } else {
            $subMenu.find(".moveToWorksheet").removeClass("unavailable");
        }
        var tableId = gActiveTableId;
        var index = WSManager.getTableRelativePosition(tableId);
        if (index === 0) {
            $subMenu.find('.moveLeft').addClass('unavailable');
        } else {
            $subMenu.find('.moveLeft').removeClass('unavailable');
        }
        var activeWS = WSManager.getActiveWS();
        var numTables = WSManager.getWorksheets()[activeWS].tables.length;
        if (index === (numTables - 1)) {
            $subMenu.find('.moveRight').addClass('unavailable');
        } else {
            $subMenu.find('.moveRight').removeClass('unavailable');
        }
    }

    return (xcHelper);
}(jQuery, {}));
