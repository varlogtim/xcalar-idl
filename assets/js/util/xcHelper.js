window.xcHelper = (function($, xcHelper) {
    xcHelper.assert = function(statement, error) {
        error = error || "Assert failed";
        if (!statement) {
            throw error;
        }
    };

    xcHelper.reload = function() {
        location.reload();
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

    xcHelper.parseRowNum = function($tr) {
        var keyword = "row";
        var classNames = $tr.attr("class");

        if (classNames == null) {
            console.error("Unexpected element to parse row", $tr);
            return null;
        }

        var index = classNames.indexOf(keyword);
        var substring = classNames.substring(index + keyword.length);
        var rowNum = parseInt(substring);

        if (isNaN(rowNum)) {
            console.error("Unexpected element to parse row", $tr);
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
                value = xcHelper.escapeHTMLSepcialChar(value);
            }
        }
        return (value);
    };

    //define type of the column
    xcHelper.parseColType = function(val, oldType) {
        return xcSuggest.parseColType(val, oldType);
    };

    xcHelper.getPreviewSize = function(previewSize, unit) {
        if (previewSize === "" || previewSize == null) {
            previewSize = gMaxSampleSize;
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

        return Math.round(previewSize);
    };

    xcHelper.getJoinRenameMap = function(oldName, newName, type) {
        if (!type) {
            type = DfFieldTypeT.DfUnknown;
        }
        return {
            "orig": oldName,
            "new" : newName,
            "type": type
        };
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

    xcHelper.getUserPrefix = function() {
        return Support.getUser();
    };

    xcHelper.wrapDSName = function(dsName) {
        dsName = dsName || "";
        var fulldsName = xcHelper.getUserPrefix() + ".";
        fulldsName = xcHelper.randName(fulldsName, 5);
        fulldsName += "." + dsName;
        return fulldsName;
    };

    xcHelper.parseDSName = function(fulldsName) {
        var nameSplits = fulldsName.split(".");
        var user;
        var randId;
        var dsName;

        if (nameSplits.length === 1) {
            user = DSTStr.UnknownUser;
            dsName = nameSplits[0];
        } else if (nameSplits.length === 2) {
            user = nameSplits[0];
            randId = DSTStr.UnknownId;
            dsName = nameSplits[1];
        } else {
            randId = nameSplits[nameSplits.length - 2];
            dsName = nameSplits[nameSplits.length - 1];
            user = nameSplits.splice(0, nameSplits.length - 2).join(".");
        }

        return {
            "user"  : user,
            "randId": randId,
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

    xcHelper.getPrefixColName = function(prefix, colName) {
        if (prefix == null || prefix === "") {
            return colName;
        } else {
            return prefix + gPrefixSign + colName;
        }
    };

    xcHelper.parsePrefixColName = function(colName) {
        var index = colName.indexOf(gPrefixSign);
        var prefix = "";
        if (index >= 0) {
            prefix = colName.substring(0, index);
            colName = colName.substring(index + gPrefixSign.length);
        }

        return {
            "prefix": prefix,
            "name"  : colName,
        };
    };

    xcHelper.normalizePrefix = function(prefix) {
        if (prefix.length >= gPrefixLimit) {
            // if prefix is auto generated by table name and
            // the table name is too long, slice it
            // XXX Possible TODO: machine learning to decide the prefix
            prefix = prefix.substring(0, gPrefixLimit);
        }

        // Strip all random characters from dsName
        prefix = prefix.split(/\W/).join("_");

        return prefix;
    };

    // get unique column name
    xcHelper.getUniqColName = function(tableId, colName, onlyCheckPulledCol) {
        if (colName == null) {
            return xcHelper.randName("NewCol");
        }

        var parseName = xcHelper.parsePrefixColName(colName);
        colName = parseName.name;
        var table = gTables[tableId];
        if (table == null) {
            console.error("table not has meta, cannot check");
            return colName;
        }

        if (!table.hasCol(colName, parseName.prefix, onlyCheckPulledCol)) {
            return colName;
        }

        var newColName;
        var tryCount = 0;
        while (tryCount <= 50) {
            ++tryCount;
            newColName = colName + "_" + tryCount;

            if (!table.hasCol(newColName, parseName.prefix)) {
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

    // extract op and arguments from a string delimited by delimiter
    xcHelper.extractOpAndArgs = function(string, delim) {
        // For example, eq("agwe", 3)
        // You will call this function with delim=','
        // And the function will return {"op": "eq", "args": ["agwe", 3]}
        // This handles edge conditions like eq("eqt,et", ",")
        var leftParenLocation = string.indexOf('(');
        var rightParenLocation = string.lastIndexOf(')');
        var op = jQuery.trim(string.slice(0, leftParenLocation));
        var argString = jQuery.trim(string.slice(leftParenLocation + 1,
                                                rightParenLocation));

        var args = [];
        var i = 0;
        var inQuote = false;
        var curArg = "";

        for (i = 0; i < argString.length; i++) {
            switch (argString[i]) {
                case ('"'):
                    curArg += argString[i];
                    inQuote = !inQuote;
                    break;
                case ('\\'):
                    curArg += argString[i];
                    curArg += argString[i + 1];
                    i++;
                    break;
                case (delim):
                    if (!inQuote) {
                        args.push(curArg);
                        curArg = "";
                    } else {
                        curArg += argString[i];
                    }
                    break;
                default:
                    curArg += argString[i];
            }
        }

        args.push(curArg);

        for (i = 0; i < args.length; i++) {
            args[i] = jQuery.trim(args[i]);
        }

        return {
            "op"  : op,
            "args": args
        };
    };

    xcHelper.getTableKeyFromMeta = function(tableMeta) {
        var keyAttr = tableMeta.keyAttr;
        var keyName = keyAttr.name;
        var valueArrayIndex = keyAttr.valueArrayIndex;

        var valueAttrs = tableMeta.valueAttrs || [];
        var prefixOfKey = "";
        if (valueArrayIndex >= 0 && valueAttrs[valueArrayIndex] != null &&
            valueAttrs[valueArrayIndex].type === DfFieldTypeT.DfFatptr)
        {
            prefixOfKey = valueAttrs[valueArrayIndex].name;
        }

        keyName = xcHelper.getPrefixColName(prefixOfKey, keyName);
        return keyName;
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
            var len = binarySearchEllipsisLen(checkLen, text.length, maxWidth);
            finalText = ellispsiText(text, len);
        }

        if ($ele.is("input")) {
            $ele.val(finalText);
        } else {
            $ele.text(finalText);
        }

        function binarySearchEllipsisLen(minLen, maxLen, desiredWidth) {
            while (minLen < maxLen) {
                var midLen = Math.floor((maxLen + minLen) / 2);
                var str = ellispsiText(text, midLen);
                var width = ctx.measureText(str).width;

                if (width > desiredWidth) {
                    maxLen = midLen - 1;
                } else if (width < desiredWidth) {
                    minLen = midLen + 1;
                } else {
                    return midLen;
                }
            }

            return minLen;
        }

        function ellispsiText(str, ellpsisLen) {
            var strLen = str.length;
            // if strLen is 22 and ellpsisLen is 21
            // then the finalText may be longer if no this check
            if (strLen - 3 > 0 && ellpsisLen > strLen - 3) {
                ellpsisLen = strLen - 3;
            }
            var res = str.slice(0, ellpsisLen - 3) + "..." +
                      str.slice(str.length - 3);
            return res;
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
        var widthOption = {"defaultHeaderStyle": true};

        if (colNum > 0) {
            var cellWidth;
            if (options.replaceColumn) {
                // xx not sure if we're passing in width anywhere
                // if (options.width) {
                //     cellWidth = options.width;
                // } else
                if (options.resize) {
                    cellWidth = getTextWidth($(), colName, widthOption);
                } else {
                    cellWidth = copiedCols[colNum - 1].width;
                }
                sizedToHeader = copiedCols[colNum - 1].sizedToHeader;
            } else {
                cellWidth = xcHelper.getDefaultColWidth(colName);
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

    xcHelper.getDefaultColWidth = function(colName, prefix) {
        var widthOption = {"defaultHeaderStyle": true};
        var prefixText = prefix;
        if (prefixText === "" || prefixText == null) {
            prefixText = CommonTxtTstr.Immediates;
        }

        var width = getTextWidth(null, colName, widthOption);
        var prefixW = getTextWidth(null, prefixText, widthOption);

        return Math.max(width, prefixW);
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
        // accepts parameters in the form of "23GB" or "56.2 mb"
        // and converts them to bytes
        var units  = ["B", "KB", "MB", "GB", "TB", "PB"];
        var num = parseFloat(numText);
        var text = numText.match(/[a-zA-Z]+/)[0].toUpperCase();
        var index = units.indexOf(text);
        var bytes = Math.round(num * Math.pow(1024, index));
        return (bytes);
    };

    var successTimers = {};

    xcHelper.showSuccess = function() {
        showSuccessBoxMessage(true);
    };

    xcHelper.showFail = function() {
        showSuccessBoxMessage(false);
    };

    function showSuccessBoxMessage(isSuccess) {
        var $successMessage = $('#successMessageWrap');
        xcHelper.hideSuccessBox();
        if (!isSuccess) {
            $successMessage.addClass("failed");
        }

        $successMessage.show();
        if (!gMinModeOn) {
            var $checkMark = $successMessage.find('.checkMark');
            var $text = $successMessage.find('.successMessage');
            var $largeText = $successMessage.find('.largeText');
            $text = $text.add($largeText);
            var $textAndCheckMark = $checkMark.add($text);
            $textAndCheckMark.addClass('hidden');
            $checkMark.hide().addClass('bounceInDown');

            successTimers.step1 = setTimeout(function() {
                $text.removeClass('hidden');
            }, 200);

            successTimers.step2 = setTimeout(function() {
                $checkMark.show().removeClass('hidden');
            }, 400);

            successTimers.step3 = setTimeout(function() {
                $textAndCheckMark.addClass('hidden');
            }, 2000);

            successTimers.step4 = setTimeout(function() {
                xcHelper.hideSuccessBox();
            }, 2600);
        } else {
            $successMessage.find('.hidden').removeClass('hidden');
            $successMessage.find('.checkMark').removeClass('bounceInDown')
                                              .show();
            successTimers.step4 = setTimeout(function() {
                xcHelper.hideSuccessBox();
            }, 1800);
        }
    }

    xcHelper.hideSuccessBox = function() {
        var $successMessage = $('#successMessageWrap');
        var $checkMark = $successMessage.find('.checkMark');
        $successMessage.find('.checkMark, .successMessage, .largeText')
                       .addClass('hidden');
        $successMessage.removeClass("failed");
        $checkMark.hide();
        $successMessage.hide();
        for (var timer in successTimers) {
            clearTimeout(successTimers[timer]);
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
            xcTooltip.changeText($btn, TooltipTStr.ToGridView);
        } else {
            // toggle to grid view
            $btn.removeClass("listView").addClass("gridView")
                .removeClass("xi-grid-view").addClass("xi-list-view");
            xcTooltip.changeText($btn, TooltipTStr.ToListView);
        }
        // refresh tooltip
        if (!noRefresh) {
            xcTooltip.refresh($btn);
        }
    };

    xcHelper.showRefreshIcon = function($location, manualClose, options) {
        options = options || {};

        var $waitingIcon = $('<div class="refreshIcon"><img src=""' +
                            'style="display:none;height:0px;width:0px;' +
                            '"></div>');
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
            if (callback != null && callback instanceof Function) {
                callback(option, $radioButton);
            }
        });
    };

    xcHelper.supportButton = function(type) {
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
                        sql = SQL.getLocalStorage() || SQL.getBackup();
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
                    SupTicketModal.show();
                    $(this).blur();
                    Alert.tempHide();
                    MonitorGraph.stop();
                });

                break;
            case "adminSupport":
                html = '<button type="button" ' +
                        'class="btn adminOnly adminSupport" ' +
                        'data-toggle="tooltip" ' +
                        'title="' + "Support Tools" + '">' +
                            "Support Tools" +
                        '</button>';
                $btn = $(html);

                $btn.click(function() {
                    Admin.showSupport();
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

           $ele: jquery element to check
           check: function to check validation, if empty, will check if the
                  value of selecor is empty. Val of the $ele will be
                  passed into the function
           error: error to show if now pass the check
           quite: if set true, will not show any warnning box.
           onErr: if not null, will call it before showing the StatusBox
           callback: if not null, will call it after check fails
           isAlert: if set true, will show Alert Modal, default is StatusBox
           formMode: if set true, will use StatusBox's form mode
           side: string, side to show the pop up
           ...: to be extened in the future.

         * Check will run in array's order.
         */

        if (!(eles instanceof Array)) {
            eles = [eles];
        }

        for (var i = 0; i < eles.length; i++) {
            var ele = eles[i];
            var $e = ele.$ele;
            var val = $e.is("input") ? $e.val() : $e.text();
            var error;
            var notValid;

            if (ele.check != null) {
                notValid = ele.check(val);
                error = ele.error || ErrTStr.InvalidField;
            } else {
                notValid = (val.trim() === "");
                error = ele.error || ErrTStr.NoEmpty;
            }

            if (notValid) {
                if (ele.quite) {
                    return false;
                }
                var options = {};
                if (ele.side) {
                    options.side = ele.side;
                }

                // before error
                if (ele.onErr && ele.onErr instanceof Function) {
                    ele.onErr();
                }

                // show error
                if (ele.isAlert) {
                    Alert.error(ErrTStr.InvalidField, error);
                } else {
                    StatusBox.show(error, $e, ele.formMode, options);
                }

                // callback
                if (ele.callback && ele.callback instanceof Function) {
                    ele.callback();
                }

                return false;
            }
        }

        return true;
    };

    xcHelper.tableNameInputChecker = function($input, options) {
        var newTableName = $input.val().trim();
        var defaultOpts = {
            "preventImmediateHide": true,
            "formMode"            : true
        };
        options = $.extend(defaultOpts, options);

        var formMode = options.formMode || false;
        var error = null;

        if (newTableName === "") {
            error = ErrTStr.NoEmpty;
        } else if (!xcHelper.isValidTableName(newTableName)) {
            error = ErrTStr.InvalidTableName;
        } else if (newTableName.length >=
            XcalarApisConstantsT.XcalarApiMaxTableNameLen) {
            error = ErrTStr.TooLong;
        } else {
            var validTableName = xcHelper.checkDupTableName(newTableName);
            if (!validTableName) {
                error = ErrTStr.TableConflict;
            }
        }

        if (error != null) {
            if (options.onErr && options.onErr instanceof Function) {
                options.onErr();
            }

            StatusBox.show(error, $input, formMode, options);
            return false;
        } else {
            return true;
        }
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
        for (var tableId in gTables) {
            var table = gTables[tableId];
            var tableType = table.getType();
            if (tableType === TableType.Active ||
                tableType === TableType.Archived) {
                if (xcHelper.getTableName(table.getName()) === tableName) {
                    return false;
                }
            }
        }

        return true;
    };

    xcHelper.suggestType = function(datas, currentType, confidentRate) {
        var inputs = {
            'colInfo': {
                'data': datas,
                'type': currentType
            },
            'confidentRate': confidentRate
        };
        return xcSuggest.suggestTypeHeuristic(inputs);
    };

    xcHelper.lockTable = function(tableId, txId) {
        // lock worksheet as well
        xcHelper.assert((tableId != null), "Invalid Parameters!");
        if (!gTables[tableId]) {
            return;
        }

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
        if (!table) {
            // case if table was deleted before unlock is called;
            return;
        }
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
                                    TblManager.alignTableEls();
                                    xcHelper.removeSelectionRange();
                                    deferred.resolve();
                                });
        } else {
            $('#mainFrame').scrollLeft(scrollPosition);
            TblManager.alignTableEls();
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
                                    TblManager.alignTableEls();
                                    xcHelper.removeSelectionRange();
                                });
        } else {
            $('#mainFrame').scrollLeft(scrollPosition);
            TblManager.alignTableEls();
        }
    };

    xcHelper.isTableInScreen = function(tableId, winWidth) {
        var $tableWrap = $("#xcTableWrap-" + tableId);
        if ($tableWrap.length === 0) {
            return false;
        }

        var windowWidth = winWidth || $(window).width();
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

    xcHelper.hasSpecialChar = function(str, allowSpace, allowUndDash) {
        if (allowSpace) {
            return /[^a-zA-Z\d\s:]/.test(str);
        } else if (allowUndDash) {
            return /[^a-zA-Z\d\_\-]/.test(str);
        } else {
            return /[^a-zA-Z\d]/.test(str);
        }
    };

    xcHelper.isValidTableName = function(str) {
        if (str == null || str === "") {
            return false;
        }

        // has to start with alpha character
        if (!xcHelper.isStartWithLetter(str)) {
            return false;
        }

        // cannot have any characters other than alphanumeric
        // or _ -
        return !/[^a-zA-Z\d\_\-]/.test(str);
    };

    xcHelper.hasInvalidCharInCol = function(str) {
        return /^ | $|[\^,\(\)\[\]'"\.\\]|:/.test(str);
    };

    xcHelper.escapeHTMLSepcialChar = function(str) {
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

    xcHelper.isStartWithLetter = function(str) {
        if (str == null) {
            return false;
        }
        return /^[a-zA-Z]/.test(str);
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
            // if user tries to select column without focusing on input
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
            var $header = $target.closest('.header');
            if ($header.length) {
                $target = $target.closest('.header').find('.editableHead');
            } else {
                var colNum = xcHelper.parseColNum($target.closest('td'));
                $target = $target.closest('table')
                                .find('.editableHead.col' + colNum);
                $header = $target.closest('.header');
            }
            var $prefixDiv = $header.find(".topHeader .prefix");
            var colPrefix;
            if ($prefixDiv.hasClass('immediate')) {
                colPrefix = "";
            } else {
                colPrefix = $prefixDiv.text();
            }
            value = xcHelper.getPrefixColName(colPrefix, $target.val());
            value = prefix + value;
        }
        xcHelper.insertText($input, value, {append: options.append});
        gMouseEvents.setMouseDownTarget($input);
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

    //xx not fully tested
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
    };

    // a.json returns JSON
    xcHelper.getFormat = function(name) {
        name = "" + name; // In case name is an integer
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

    xcHelper.convertToHtmlEntity = function(s) {
        return s.replace(/[\u00A0-\u9999<>\&]/g, function(i) {
            return '&#' + i.charCodeAt(0) + ';';
        });
    };

    /**
     * sortVals
     * @param  {string} a     [first value]
     * @param  {string} b     [sescond value]
     * @param  {integer} order -1 for ascending, 1 for descending
     */
    xcHelper.sortVals = function(a, b, order) {
        if (order == null) {
            order = ColumnSortOrder.ascending;
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
        // XXx Cheng: this function may need to refactor
        var backCols = [];
        var table = gTables[tblId];
        if (!table) {
            return {
                invalid: true,
                reason : 'tableNotFound',
                name   : frontColNames[0],
                type   : 'tableNotFound'
            };
        }

        var tableCols = table.tableCols;
        var foundColsArray = [];
        var numColsFound = 0;
        var numFrontColNames = frontColNames.length;
        var i;

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
            var frontColName = frontColNames[i];

            for (j = 0; j < numTableCols; j++) {
                tableCol = colsArray[j];
                // if we find a match, we push the backcolumn name into backCols
                // and remove the column from colsArray and put it into
                // foundColsArray. If we later have a duplicate backcolumn name
                // it will no longer be in colsArray and we will search for it
                // in foundColsArray
                if (frontColName === tableCol.getFrontColName(true)) {
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
                    if (frontColName === tableCol.getFrontColName(true)) {
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
                        if (frontColName === tableCol.getFrontColName(true)) {
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

    // modalSpecs: {$modal: $modal, top: int, left: int}
    // windowSpecs: {winWidth: int, winHeight: int}
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

    xcHelper.menuAnimAligner = function(close) {
        var options;
        var openOffset = 350; // when the menu is open;
        var menuOffset = 285;
        var menuAnimTime = 200; // length of time menu takes to animate
        var extraDelay = 80; // in case of lag
        if (close) {
            options = {marginRight: openOffset};
            menuOffset *= -1;
        }
        hideOffScreenTables(options);
        $('#mainFrame').addClass('scrollLocked');
        $('#dagScrollBarWrap').addClass('xc-hidden');
        moveTableTitles(null, {
            "offset"       : menuOffset,
            "menuAnimating": true,
            "animSpeed"    : menuAnimTime
        });
        setTimeout(function() {
            unhideOffScreenTables();
            TblManager.alignTableEls();
            $('#mainFrame').removeClass('scrollLocked');
            $('#dagScrollBarWrap').removeClass('xc-hidden');
            DagPanel.adjustScrollBarPositionAndSize();
        }, menuAnimTime + extraDelay);
    };


    // adds commas to large numbers (52000 becomes "52,000")
    xcHelper.numToStr = function(value, maxDecimals) {
        if (maxDecimals == null) {
            maxDecimals = 3;
        }
        if (value != null) {
            value = Number(value).toLocaleString("en",
                                        {"maximumFractionDigits": maxDecimals});
        }
        return value;
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
        isDataTd: boolean, true if clicking on the json td,
        toClose: function, return true if want to close the menu
        toggle: boolean, if set true, will toggle open/close of menu
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
        } else if (menuId === "colMenu") {
            topMargin = -4;
        } else {
            topMargin = 0;
        }
        var leftMargin = 5;

        var left;
        var top;
        if (options.mouseCoors) {
            left = options.mouseCoors.x;
            top = options.mouseCoors.y + topMargin;
        } else {
            left = $dropdownIcon[0].getBoundingClientRect().left + leftMargin;
            top = $dropdownIcon[0].getBoundingClientRect().bottom + topMargin;
        }

        if (options.offsetX) {
            left += options.offsetX;
        }
        if (options.offsetY) {
            top += options.offsetY;
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
        var toClose = options.toClose;
        if (toClose instanceof Function && options.toClose() === true) {
            return "closeMenu";
        }

        if (options.toggle && $menu.is(":visible")) {
            return "closeMenu";
        }

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
        // allow fnfs but not array elements, multi-type, or anything but
        // valid types
        var validTypes = ["string", "float", "integer", "boolean"];
        var shouldNotFilter = options.isMutiCol || isChildOfArray ||
                            validTypes.indexOf(columnType) === -1;
        var notAllowed = $div.find('.null, .blank').length;
        var isMultiCell = $("#xcTable-" + tableId).find(".highlightBox")
                                                  .length > 1;

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
            (tableCol.getFormat() !== ColFormat.Default ||
            tableCol.getDecimal() > -1))
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

        toggleUnnestandJsonOptions($menu, $div, columnType, isMultiCell,
                                    notAllowed, options);
    }

    function toggleUnnestandJsonOptions($menu, $div, columnType,
                                        isMultiCell, notAllowed, options) {
        var $unnestLi = $menu.find('.tdUnnest');
        var $jsonModalLi = $menu.find('.tdJsonModal');
        $unnestLi.addClass('hidden');
        $jsonModalLi.addClass('hidden');

        if ((columnType === "object" || columnType === "array") &&
            !notAllowed) {
            if ($div.text().trim() !== "" && !isMultiCell) {
                // when  only one cell is selected
                $jsonModalLi.removeClass("hidden");
                
                // do not allow pullall from data cell
                if (!options.isDataTd) {
                    $unnestLi.removeClass("hidden");
                }
            }
        } else {
            if ($div.parent().hasClass('truncated')) {
                $jsonModalLi.removeClass("hidden");
            }

            if (columnType === "mixed" && !notAllowed) {
                var text = $div.text().trim();
                if (text !== "" && !isMultiCell &&
                    !$div.find('.undefined').length) {
                    // when only one cell is selected

                    var mixedVal;
             
                    try {
                        mixedVal = JSON.parse(text);
                    } catch (err) {
                        mixedVal = null;
                    }
                    if (mixedVal && typeof mixedVal === "object") {
                        $jsonModalLi.removeClass("hidden");
                        $unnestLi.removeClass("hidden");
                    }
                }
            }
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
        if (WSManager.getNumOfWS() <= 1) {
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
        var $dagWrap = $('#dagWrap-' + tableId);
        if ($dagWrap.hasClass('fromRetina')) {
            $menu.find('.createDf').addClass('unavailable');
            xcTooltip.add($menu.find('.createDf'), {
                title: DFGTStr.CannotCreateMsg
            });
        } else {
            $menu.find('.createDf').removeClass('unavailable');
            xcTooltip.remove($menu.find('.createDf'));
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        xcHelper.__testOnly__ = {};
        xcHelper.__testOnly__.toggleUnnestandJsonOptions =
                              toggleUnnestandJsonOptions;
    }
    /* End Of Unit Test Only */

    return (xcHelper);
}(jQuery, {}));
