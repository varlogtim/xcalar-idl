window.xcHelper = (function($, xcHelper) {
    xcHelper.assert = function(statement, error) {
        error = error || "Assert failed";
        if (!statement) {
            throw error;
        }
    };

    // looks for xcTable-AB12 or $('#xcTable-AB12')
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
                                'title="Field Not Found">FNF</span>';
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

        if (val != null && oldType !== "mixed") {
            // note: "" is empty string
            var valType = typeof val;
            type = valType;
            // get specific type
            if (type === "number") {
                // the case when type is float
                if (oldType === "float" ||
                    xcHelper.isFloat(val))
                {
                    type = "float";
                } else {
                    type = "integer";
                }
            } else if (type === "object") {
                if (val instanceof Array) {
                    type = "array";
                }
            }

            var isAllNum = (valType === "number") &&
                           ((oldType === "float") || (oldType === "integer"));
            if (oldType != null && oldType !== "undefined" &&
                oldType !== type && !isAllNum)
            {
                type = "mixed";
            }
        }

        return (type);
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

        if (colNum > 0) {
            var cellWidth;
            if (options.replaceColumn) {
                if (options.width) {
                    cellWidth = options.width;
                } else {
                    cellWidth = copiedCols[colNum - 1].width;
                }
            } else {
                var widthOptions = {
                    defaultHeaderStyle: true
                };
                cellWidth = getTextWidth($(), colName, widthOptions);
            }

            // backend will return an escaped name and then we'll have to use
            // an escaped version of that escaped name to access it =)
            // var escapedName = xcHelper.escapeColName(colName.replace(/\./g, "\\."));
            var escapedName = colName;

            var newProgCol = ColManager.newCol({
                "backName": escapedName,
                "name"    : colName,
                "width"   : cellWidth,
                "userStr" : '"' + colName + '" = map(' + mapStr + ')',
                "isNewCol": false
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
            ColManager.parseFunc(newProgCol.userStr, colNum,
                                {tableCols: copiedCols}, true);
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

    xcHelper.getTime = function(d, timeStamp) {
        if (d == null) {
            d = (timeStamp == null) ? new Date() : new Date(timeStamp);
        }

        return (d.toLocaleTimeString());
    };

    xcHelper.getCurrentTimeStamp = function() {
        return new Date().getTime();
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
    xcHelper.sizeTranslator = function(size, unitSeparated, convertTo) {
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
                size = Math.ceil(size);
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
        var text = $.trim(numText.substr(("" + num).length)).toUpperCase();
        var index = units.indexOf(text);
        var bytes = num * Math.pow(1024, index);
        return (bytes);
    };

    xcHelper.autoTooltip = function(ele) {
        var $ele = $(ele);
        if (ele.offsetWidth < ele.scrollWidth){
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

    xcHelper.showSuccess = function() {
        var $successMessage = $('#successMessageWrap');
        $successMessage.show();
        if (!gMinModeOn) {
            var $checkMark = $successMessage.find('.checkMark');
            var $text = $successMessage.find('.successMessage');
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
            }, 1800);

            setTimeout(function() {
                $successMessage.hide();
            }, 2400);
        } else {
            setTimeout(function() {
                $successMessage.hide();
            }, 1600);
        }
    };

    xcHelper.showFail = function() {

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
            $btn.removeClass("gridView").addClass("listView");
            // suggest become 'to grid view'
            $btn.attr("data-original-title", TooltipTStr.ToGridView);
        } else {
            // toggle to grid view
            $btn.removeClass("listView").addClass("gridView");
            $btn.attr("data-original-title", TooltipTStr.ToListView);
        }
        // refresh tooltip
        if (!noRefresh) {
            xcHelper.refreshTooltip($btn);
        }
    };

    xcHelper.showRefreshIcon = function($location) {
        var $waitingIcon = $('<div class="refreshIcon"><img src=""' +
                            'style="display:none;height:0px;width:0px;"></div>');
        $location.append($waitingIcon);
        $waitingIcon.find('img').show();
        setTimeout(function() {
            $waitingIcon.find('img').attr('src', paths.waitIcon)
                                    .height(37)
                                    .width(35);
        }, 0);

        setTimeout(function(){
            $waitingIcon.fadeOut(100, function() {
                $waitingIcon.remove();
            });
        }, 1400);
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
                html = '<button type="button" class="btn btnMid copySql" ' +
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
                html = '<button type="button" class="btn btnMid genSub" ' +
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
                            .addClass("btnInactive");
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
                html = '<button type="button" class="btn btnMid logout">' +
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

                if (ele.callback) {
                    StatusBox.show(error, $e, ele.formMode);
                    ele.callback();
                } else if (ele.isAlert) {
                    Alert.error(ErrTStr.InvalidField, ele.text);
                } else {
                    StatusBox.show(error, $e, ele.formMode);
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
                if (table.tableName.indexOf(tableName) === 0) {
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

    xcHelper.lockTable = function(tableId) {
        // lock worksheet as well
        xcHelper.assert((tableId != null), "Invalid Parameters!");

        var $tableWrap = $("#xcTableWrap-" + tableId);
        if ($tableWrap != null &&
            $tableWrap.length !== 0 &&
            !$tableWrap.hasClass('tableLocked'))
        {
            // tableWrap may not exist during multijoin on self
            var $lockedIcon = $('<div class="lockedIcon">' +
                                '<img src="' + paths.hourglass + '" /></div>');
            var tableHeight = $tableWrap.find('.xcTbodyWrap').height();
            var tbodyHeight = $tableWrap.find('tbody').height();
            var mainFrameHeight = $('#mainFrame').height();
            var topPos = 100 * ((tableHeight / mainFrameHeight) / 2);

            topPos = Math.min(topPos, 40);
            $lockedIcon.css('top', topPos + '%');

            $tableWrap.addClass('tableLocked').append($lockedIcon);
            $tableWrap.find('.xcTbodyWrap').append('<div class="tableCover">' +
                                                   '</div>');
            $tableWrap.find('.tableCover').height(tbodyHeight);
            $('#rowScroller-' + tableId).addClass('locked');
            moveTableTitles();
        }

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
            $tableWrap.find('.lockedIcon').remove();
            $tableWrap.find('.tableCover').remove();
            $tableWrap.removeClass('tableLocked');
            $('#rowScroller-' + tableId).removeClass('locked');
        }

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
    xcHelper.insertText = function($input, textToInsert) {
        var inputType = $input.attr('type');
        if (inputType !== "text") {
            console.warn('inserting text on inputs of type: "' + inputType +
                            '" is not supported');
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

    // animate: boolean indicating whether to animate the scrolling
    // options:
    //      onlyIfOffScreen: boolean, if true, will only animate table if visible
    xcHelper.centerFocusedTable = function($tableWrap, animate, options) {
        options = options || {};
        var windowWidth = $(window).width();
        var tableWidth = $tableWrap.width();
        var tableOffset = $tableWrap.offset().left;
        var tableRight = tableOffset + tableWidth;
        var animateRight = false;

         // only centers the table if table is visible
        if (options.onlyIfOffScreen) {
            // if table is slightly visible we will apply animation
            // otherwise we go with whatever was passed in
            if (tableRight < 150 && tableRight > 0) {
                // table is slightly visible on the left
                animate = true;
            } else if (windowWidth - tableOffset < 150 &&
                       windowWidth - tableOffset > 0) {
                // table is slightly visible on the right
                animateRight = true;
                animate = true;
            } else if (tableRight < 0 ||
                (windowWidth - tableOffset) < 0) {
                // table is offscreen, proceed to center the table
            } else {
                // table is in view
                return;
            }
        }

        var currentScrollPosition = $('#mainFrame').scrollLeft();
        var leftPosition = currentScrollPosition + tableOffset;

        if (animateRight) {
            scrollPosition = leftPosition;
        } else {
            scrollPosition = leftPosition - ((windowWidth - tableWidth) / 2);
        }

        if (animate && !gMinModeOn) {
            $('#mainFrame').animate({scrollLeft: scrollPosition}, 500,
                                function() {
                                    moveFirstColumn();
                                    xcHelper.removeSelectionRange();
                                });
        } else {
            $('#mainFrame').scrollLeft(scrollPosition);
            moveFirstColumn();
        }
    };

    // animate: boolean indicating whether to animate the scrolling
    xcHelper.centerFocusedColumn = function(tableId, colNum, animate) {
        var $tableWrap = $('#xcTableWrap-' + tableId);
        var windowWidth = $(window).width();
        var currentScrollPosition = $('#mainFrame').scrollLeft();
        var $th = $tableWrap.find('th.col' + (colNum + 1));
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

    xcHelper.isTableInScreen = function(tableId) {
        var windowWidth = $(window).width();
        var $tableWrap = $("#xcTableWrap-" + tableId);
        var tableLeft = $tableWrap.offset().left;
        var tableRight = tableLeft + $tableWrap.width();

        return (tableRight >= 0) && (tableLeft <= windowWidth);
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

    xcHelper.genSub = function() {
        var deferred = jQuery.Deferred();

        XcalarSupportGenerate()
        .then(function(filePath, bid) {
            var msg = xcHelper.replaceMsg(CommonTxtTstr.SupportBundleMsg, {
                "id"  : bid,
                "path": filePath
            });
            Alert.show({
                "title"  : CommonTxtTstr.SupportBundle,
                "instr"  : CommonTxtTstr.SupportBundleInstr,
                "msg"    : msg,
                "isAlert": true
            });
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error(CommonTxtTstr.GenBundleFail, error);
            deferred.reject(error);
        });

        return (deferred.promise());
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

        mapStr += colName + ")";

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

    xcHelper.fillInputFromCell = function ($target, $input, prefix, type) {
        // if no prefix, must pass in "" instead of null
        // $input needs class "argument"
        if (!$input.hasClass('argument') ||
            $input.closest('.colNameSection').length !== 0 ||
            $input.attr("type") !== "text")
        {
            return;
        }

        if (type === "table") {
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

        xcHelper.insertText($input, value);
        gMouseEvents.setMouseDownTarget($input);
    };

    // not only looks for colPrefix but checks to make sure it's not preceded by
    // anything other than a comma
    xcHelper.hasValidColPrefix = function(str, colPrefix) {
        var hasPrefix = false;
        if (typeof str !== "string") {
            return false;
        }
        str = str.replace(/\s/g, '');

        var colNames = [];
        var cursor = 0;
        for (var i = 0; i < str.length; i++) {
            if (str[i] === "," && !xcHelper.isCharEscaped(str, i)) {
                colNames.push(str.slice(cursor, i));
                cursor = i + 1;
            }
        }
        colNames.push(str.slice(cursor, i));

        var colName;
        for (var i = 0; i < colNames.length; i++) {
            colName = colNames[i];
            if (colName.length < 2) {
                return false;
            }
            if (colName[0] === colPrefix) {
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
            "TXT" : "TEXT"
        };

        if (formatMap.hasOwnProperty(ext)) {
            return (formatMap[ext]);
        } else {
            return null;
        }
    };

    // XX unit test not written
    xcHelper.sortVals = function(a, b, order) {
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

    // XX Not tested in unit test
    // used to split query into array of subqueries by semicolons
    // XX not checking for /n or /r delimiter, just semicolon
    // returns array of objects, objects contain query, name, and dstTable
    xcHelper.parseQuery =  function(query) {
        var tempString = "";
        var inQuotes = false;
        var singleQuote = false;
        var isEscaped = false;
        var queries = [];
        var subQuery;
        var operationName;

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
                if (query[i] === ";") {
                    tempString = tempString.trim();
                    operationName = tempString.split(" ")[0];
                    subQuery = {
                        query: tempString,
                        name: operationName,
                        dstTable: getDstTableFromQuery(tempString, operationName)
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
                query: tempString,
                name: operationName,
                dstTable: getDstTableFromQuery(tempString, operationName)
            };
            queries.push(subQuery);
        }

        return (queries);
    };

    function getDstTableFromQuery(query, type) {
        var keyWord = "--dsttable";
        if (type) {
            if (type === "join") {
                keyWord = "--joinTable";
            }
        }
        var index = getKeyWordIndexFromQuery(query, keyWord);
        var singleQuote;

        index += keyWord.length;
        query = query.slice(index).trim();
        var quote = query[0];
        var wrappedInQuotes = true;
        if (quote !== "'" && quote !== '"') {
            console.warn('table name is not wrapped in quotes');
            wrappedInQuotes = false;
        } else {
            query = query.slice(1);
        }

        var isEscaped = false;
        var tableName = "";
        for (var i = 0; i < query.length; i++) {
            if (isEscaped) {
                isEscaped = false;
                tableName += query[i];
                continue;
            }
            if (query[i] === "\\") {
                isEscaped = true;
                tableName += query[i];
            } else if (wrappedInQuotes) {
                if (query[i] === quote) {
                    break;
                } else {
                    tableName += query[i];
                }
            } else if (!wrappedInQuotes) {
                if (query[i] === " " || query[i] === ";") {
                    break;
                } else {
                    tableName += query[i];
                }
            }
        }
        return (tableName);
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
        ignoreSidebar: boolean, (ignore rightsidebar if in the way)
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
            menuId === "cellMenu") {
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
        ignoreSidebar: boolean, (ignore rightsidebar if in the way)
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

        //positioning if dropdown menu is on the right side of screen
        if (!options.ignoreSideBar) {
            var leftBoundary = $('#rightSideBar')[0].getBoundingClientRect().left;
            if ($menu[0].getBoundingClientRect().right > leftBoundary) {
                left = leftBoundary - $menu.width();
                $menu.css('left', left).addClass('leftColMenu');
            }
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
        var shouldNotFilter = options.isMutiCol || isChildOfArray ||
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
        if (WSManager.getWSLen() <= 1) {
            $menu.find(".moveToWorksheet").addClass("unavailable");
        } else {
            $menu.find(".moveToWorksheet").removeClass("unavailable");
        }
    }

    return (xcHelper);
}(jQuery, {}));
