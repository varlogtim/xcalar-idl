window.xcHelper = (function($, xcHelper) {
    xcHelper.parseTableId = function(idOrEl) {
        // can pass in a string or jQuery element
        var id;
        if (idOrEl instanceof jQuery) {
            id = idOrEl.attr('id');
        } else if (typeof (idOrEl) == "object") {
            id = $(idOrEl).attr('id');
        } else {
            id = idOrEl;
        }
        return (id.split("-")[1]);
    };

    xcHelper.parseRowNum = function($el) {
        var keyword    = "row";
        var classNames = $el.attr("class");
        var index      = classNames.indexOf(keyword);
        var substring  = classNames.substring(index + keyword.length);

        return (parseInt(substring));
    };

    xcHelper.parseColNum = function($el) {
        var keyword    = "col";
        var classNames = $el.attr("class");
        if (classNames == null) {
            // this is in case we meet some error and cannot goon run the code!
            console.error("Error Case!");
            return null;
        }

        var index      = classNames.indexOf(keyword);
        var substring  = classNames.substring(index + keyword.length);

        return (parseInt(substring));
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
                value = value.replace(/\</g, "&lt;")
                             .replace(/\>/g, "&gt;")
                             .replace(/\\t/g, "&emsp;");
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

    xcHelper.getLastVisibleRowNum = function(tableId) {
        var $tableWrap = $("#xcTableWrap-" + tableId);
        if ($tableWrap.length === 0) {
            return null;
        }

        var tableBottom = $tableWrap.offset().top + $tableWrap.height();
        var $trs = $tableWrap.find(".xcTable tbody tr");

        for (var i = $trs.length - 1; i >= 0; i--) {
            var $tr = $trs.eq(i);

            if ($tr.offset().top < tableBottom) {
                var rowNum = xcHelper.parseRowNum($tr) + 1;
                return rowNum;
            }
        }

        return null;
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
            user = "Unknow User";
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
    }

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

    xcHelper.middleEllipsis = function(str, $ele, maxLen, isMultiLine) {
        var ele = $ele.get(0);
        var strLen = str.length;
        maxLen = Math.min(maxLen, strLen);

        // back to initial value first
        if ($ele.is("input")) {
            $ele.val(str);
        } else {
            $ele.text(str);
        }

        if (isMultiLine) {
            var scrollWidth = ele.scrollWidth;
            var widthNotOverflow = ele.offsetWidth + 1;

            while (scrollWidth > widthNotOverflow && maxLen > 5) {
                ellipsisHelper();
                scrollWidth = ele.scrollWidth;
                maxLen--;
            }
        } else {
            var scrollHeight = ele.scrollHeight;
            var heightNotOverFlow = ele.offsetHeight + 1;

            while (scrollHeight > heightNotOverFlow && maxLen > 5) {
                ellipsisHelper();
                scrollHeight = ele.scrollHeight;
                maxLen--;
            }
        }

        function ellipsisHelper() {
            var ellipsisStr;

            if (strLen <= maxLen) {
                ellipsisStr = str;
            } else {
                // always show the last three characters
                ellipsisStr = str.substring(0, maxLen - 4) + '...' +
                                str.substring(strLen - 3);
            }

            if ($ele.is("input")) {
                $ele.val(ellipsisStr);
            } else {
                $ele.text(ellipsisStr);
            }
        }
    };

    xcHelper.mapColGenerate = function(colNum, colName, mapStr, tableCols,
                                       options) {
        options = options || {};
        var copiedCols = xcHelper.deepCopy(tableCols);

        if (colNum > -1) {
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
            var escapedName = xcHelper.escapeColName(colName.replace(/\./g, "\\."));

            var newProgCol = ColManager.newCol({
                "backName": escapedName,
                "name"    : colName,
                "width"   : cellWidth,
                "userStr" : '"' + colName + '" = map(' + mapStr + ')',
                "isNewCol": false
            });


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

    xcHelper.toggleModal = function(tableId, isHide, options) {
        var $modalBackground = $("#modalBackground");
        var $mainFrame    = $("#mainFrame");
        var $sideBarModal = $("#sideBarModal");
        var $rightSideBar = $("#rightSideBar");
        var $tableWrap;

        if (tableId === "all") {
            $tableWrap = $('.xcTableWrap:visible');
        } else {
            $tableWrap = $("#xcTableWrap-" + tableId);
        }

        options = options || {};

        if (isHide) {
            var fadeOutTime = options.time || 150;
            // when close the modal
            $modalBackground.fadeOut(fadeOutTime, function() {
                $(this).removeClass('light');
                $mainFrame.removeClass('modalOpen');
            });

            $sideBarModal.fadeOut(fadeOutTime, function() {
                $(this).removeClass('light');
                $rightSideBar.removeClass('modalOpen');
            });

            $('.xcTableWrap').not('#xcTableWrap-' + tableId)
                             .removeClass('tableDarkened');

            $tableWrap.removeClass('modalOpen');
        } else {
            // when open the modal
            $tableWrap.addClass('modalOpen');
            if (tableId !== "all") {
                $('.xcTableWrap').not('#xcTableWrap-' + tableId)
                                 .addClass('tableDarkened');
            }

            $rightSideBar.addClass('modalOpen');
            $mainFrame.addClass('modalOpen');
            var fadeInTime = options.time || 150;

            $sideBarModal.addClass('light').fadeIn(fadeInTime);
            $modalBackground.addClass('light').fadeIn(fadeInTime);
        }
    };

    xcHelper.randName = function(name, digits, strip) {
        if (digits == null) {
            digits = 5; // default
        }

        var max = Math.pow(10, digits);
        var rand = Math.floor((Math.random() * max) + 1);

        if (strip) {
            // strip when name is "abc-000"
            var index = name.lastIndexOf("-");
            if (index > 0) {
                name = name.substring(0, index) + "-";
            }
        }

        function padZero(number, numDigits) {
            number = number.toString();
            return ((number.length < numDigits) ?
                    padZero("0" + number, numDigits) : number);
        }
        rand = padZero(rand, digits);
        return (name + rand);
    };

    xcHelper.uniqueRandName = function(name, checkFunc, checkCnt) {
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
            } catch(error) {
                console.error(error);
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

    xcHelper.capitalize = function(s) {
        if (!s) {
            return s;
        }
        return s[0].toUpperCase() + s.slice(1);
    };

    xcHelper.isFloat = function(num) {
        return (num % 1 !== 0);
    };

    xcHelper.isArray = function(obj) {
        return (obj.constructor.toString().indexOf("Array") > -1);
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

        return (date);
    };

    xcHelper.getTime = function(d, timeStamp) {
        if (d == null) {
            d = (timeStamp == null) ? new Date() : new Date(timeStamp);
        }

        return (d.toLocaleTimeString());
    };

    // time in million seconds
    xcHelper.getTimeInMS = function(d, timeStamp) {
        if (d == null) {
            d = (timeStamp == null) ? new Date() : new Date(timeStamp);
        }

        return d.getTime();
    };

    xcHelper.getTwoWeeksDate = function() {
        var res = [];
        var d   = new Date();
        var day = d.getDate();
        var date;

        d.setHours(0, 0, 0, 0);

        // date from today to lastweek, all dates' time is 0:00 am
        for (var i = 0; i < 7; i++) {
            date = new Date(d);
            date.setDate(day - i);
            res.push(date);
        }

        // older than one week
        date = new Date(d);
        date.setDate(day - 13);
        res.push(date);

        return (res);
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
            html = '<div class="wrapper">' +
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

    // handle dropdown list generally
    xcHelper.dropdownList = function($dropDownList, options) {
        options = options || {};
        /*
         * options include:
            onlyClickIcon: if set true, only toggle dropdown menu when click
                             dropdown icon, otherwise, toggle also on click
                             input section
            onSelect: callback to trigger when select an item on list, $li will
                      be passed into the callback
            onOpen: callback to trigger when list opens/shows
            container: will hide all other list in the container when focus on
                       this one. Default is $dropDownList.parent()
            bounds: restrain the dropdown list size to this element
            bottomPadding: integer for number of pixels of spacing between
                           bottom of list and $bounds,
            exclude: selector for an element to exclude from default click
                     behavior
         *
         * Note that options can be extented if nesessary
         */
        var $container = options.container ? $(options.container) :
                                              $dropDownList.parent();
        var $list;
        if ($dropDownList.is('.list,.menu')) {
            $list = $dropDownList;
        } else {
            $list = $dropDownList.find('.list, .menu');
        }
        /*
        $menu needs to have the following structure:
            <div class="menu/list">
                <ul></ul>
                <div class="scrollArea top"></div>
                <div class="scrollArea bottom"></div>
            </div>
        where the outer div has the same height as the ul
        */
        var $ul = $list.children('ul');
        var $scrollAreas = $list.find('.scrollArea');
        var numScrollAreas = $scrollAreas.length;
        var $subList = options.$subList;
        var $bounds = options.bounds ? $(options.bounds) : $(window);
        var bottomPadding = options.bottomPadding || 0;
        var scrollerOnly = options.scrollerOnly;
        var exclude = options.exclude ? options.exclude : false;
        var outerHeight;
        var innerHeight;
        var isMouseInScroller = false;
        var isMouseMoving = false;
        var timer = {
            "fadeIn"           : null,
            "fadeOut"          : null,
            "setMouseMoveFalse": null,
            "hovering"         : null,
            "scroll"           : null,
            "mouseScroll"      : null
        };
        setupListScroller();

        if (!scrollerOnly) {
            var onOpen = options.onOpen;
            // toggle list section
            if (options.onlyClickIcon) {
                $dropDownList.on("click", ".icon", function(event) {
                    event.stopPropagation();
                    toggleDropdownList($(this).closest(".dropDownList"));
                });
            } else {
                $dropDownList.on("click", function(event) {
                    if (exclude && $(event.target).closest(exclude).length) {
                        return;
                    }
                    event.stopPropagation();
                    toggleDropdownList($(this));
                });
            }

            $dropDownList.on("mousedown", function(event) {
                if (event.which === 1) {
                    // stop propagation of left mousedown
                    // because hide dropdown is triggered by it
                    // should invalid that when mousedown on dropDownList
                    event.stopPropagation();
                    var mousedownTarget;
                    if ($(this).find('input').length === 1) {
                        mousedownTarget = $(this).find('input');
                    } else {
                        mousedownTarget = $(this);
                    }
                    gMouseEvents.setMouseDownTarget(mousedownTarget);
                }
            });

            // on click a list
            $dropDownList.on({
                "click": function(event) {
                    var keepOpen = false;

                    event.stopPropagation();
                    if (options.onSelect) {    // trigger callback
                        // keepOpen be true, false or undefined
                        keepOpen = options.onSelect($(this));
                    }

                    if (!keepOpen) {
                        hideDropdowns();
                    }
                },
                "mouseenter": function() {
                    $(this).addClass("hover");

                },
                "mouseleave": function() {
                    $(this).removeClass("hover");
                }
            }, ".list li");
        }

        function toggleDropdownList($curlDropDownList) {
            if ($curlDropDownList.hasClass("open")) {    // close dropdown
                hideDropdowns($curlDropDownList);
            } else {
                // hide all other dropdowns that are open on the page
                var $currentList;
                if ($list.length === 1) {
                    $currentList = $list;
                } else {
                    // this is triggered when $list contains more that one .list
                    // such as the xcHelper.dropdownlist in mulitiCastModal.js
                    $currentList = $curlDropDownList.find(".list");
                }

                if (!$list.parents('.list, .menu').length) {
                    $('.list, .menu').not($currentList)
                                    .hide()
                                    .removeClass('openList')
                                    .parent('.dropDownList')
                                    .removeClass('open');
                }

                // open dropdown
                var $lists = $curlDropDownList.find(".list");
                if ($lists.children().length === 0) {
                    return;
                }
                $curlDropDownList.addClass("open");
                $lists.show().addClass("openList");
                $(document).on('click.closeDropDown', function() {
                    hideDropdowns();
                });
                if (typeof onOpen === "function") {
                    onOpen($curlDropDownList);
                }
                showOrHideScrollers();
                $('.selectedCell').removeClass('selectedCell');
                FnBar.clear();
            }
            $('.tooltip').hide();
        }

        function hideDropdowns() {
            var $sections = $container.find(".dropDownList");
            $sections.find(".list").hide().removeClass("openList");
            $sections.removeClass("open");
            $(document).off('click.closeDropDown');
        }

        function setupListScroller() {
            if (numScrollAreas === 0) {
                return;
            }
            $list.mouseleave(function() {
                clearTimeout(timer.fadeIn);
                $scrollAreas.removeClass('active');
            });

            $list.mouseenter(function() {
                outerHeight = $list.height();
                innerHeight = $ul[0].scrollHeight;
                isMouseMoving = true;
                fadeIn();
            });

            $list.mousemove(function() {
                clearTimeout(timer.fadeOut);
                clearTimeout(timer.setMouseMoveFalse);
                isMouseMoving = true;

                timer.fadeIn = setTimeout(fadeIn, 200);

                timer.fadeOut = setTimeout(fadeOut, 800);

                timer.setMouseMoveFalse = setTimeout(setMouseMoveFalse, 100);
            });

            $scrollAreas.mouseenter(function() {
                isMouseInScroller = true;
                $(this).addClass('mouseover');

                if ($subList) {
                    $subList.hide();
                }
                var scrollUp = $(this).hasClass('top');
                scrollList(scrollUp);
            });

            $scrollAreas.mouseleave(function() {
                isMouseInScroller = false;
                clearTimeout(timer.scroll);

                var scrollUp = $(this).hasClass('top');

                if (scrollUp) {
                    $scrollAreas.eq(1).removeClass('stopped');
                } else {
                    $scrollAreas.eq(0).removeClass('stopped');
                }

                timer.hovering = setTimeout(hovering, 200);
            });

            $ul.scroll(function() {
                clearTimeout(timer.mouseScroll);
                timer.mouseScroll = setTimeout(mouseScroll, 300);
            });
        }

        function mouseScroll() {
            var scrollTop = $ul.scrollTop();
            if (scrollTop === 0) {
                $scrollAreas.eq(0).addClass('stopped');
                $scrollAreas.eq(1).removeClass('stopped');
            } else if (outerHeight + scrollTop >= innerHeight) {
                $scrollAreas.eq(0).removeClass('stopped');
                $scrollAreas.eq(1).addClass('stopped');
            } else {
                $scrollAreas.eq(0).removeClass('stopped');
                $scrollAreas.eq(1).removeClass('stopped');
            }
        }

        function scrollList(scrollUp) {
            var top;
            var scrollTop = $ul.scrollTop();

            if (scrollUp) { // scroll upwards
                if (scrollTop === 0) {
                    $scrollAreas.eq(0).addClass('stopped');
                    return;
                }
                timer.scroll = setTimeout(function() {
                    top = scrollTop - 7;
                    $ul.scrollTop(top);
                    scrollList(scrollUp);
                }, 30);
            } else { // scroll downwards
                if (outerHeight + scrollTop >= innerHeight) {
                    $scrollAreas.eq(1).addClass('stopped');
                    return;
                }

                timer.scroll = setTimeout(function() {
                    top = scrollTop + 7;
                    $ul.scrollTop(top);
                    scrollList(scrollUp);
                }, 30);
            }
        }

        function fadeIn() {
            if (isMouseMoving) {
                $scrollAreas.addClass('active');
            }
        }

        function fadeOut() {
            if (!isMouseMoving) {
                clearTimeout(timer.fadeIn);
                $scrollAreas.removeClass('active');
            }
        }

        function setMouseMoveFalse() {
            isMouseMoving = false;
        }

        function hovering() {
            if (!isMouseInScroller) {
                $scrollAreas.removeClass('mouseover');
            }
        }

        function showOrHideScrollers($newUl) {
            if ($newUl) {
                $ul = $newUl;
            }
            if (numScrollAreas === 0) {
                return;
            }
            var offset = $bounds.offset();
            var offsetTop;
            if (offset) {
                offsetTop = offset.top;
            } else {
                offsetTop = 0;
            }

            var listHeight = offsetTop + $bounds.height() - $list.offset().top -
                             bottomPadding;
            listHeight = Math.min($(window).height() - $list.offset().top,
                                  listHeight);
            listHeight = Math.max(listHeight - 1, 40);
            $list.css('max-height', listHeight);
            $ul.css('max-height', listHeight).scrollTop(0);

            var ulHeight = $ul[0].scrollHeight;

            if (ulHeight > $list.height()) {
                $ul.css('max-height', listHeight);
                $list.find('.scrollArea').show();
                $list.find('.scrollArea.bottom').addClass('active');
            } else {
                $ul.css('max-height', 'auto');
                $list.find('.scrollArea').hide();
            }
            // set scrollArea states
            $list.find('.scrollArea.top').addClass('stopped');
            $list.find('.scrollArea.bottom').removeClass('stopped');
        }
        this.showOrHideScrollers = showOrHideScrollers;
    };

    xcHelper.hideDropdowns = function($container) {
        var $sections = $container.find(".dropDownList");
        $sections.find(".list").hide().removeClass("openList");
        $sections.removeClass("open");
        $(document).off('click.closeDropDown');
    };

    xcHelper.hasSpecialChar = function(str, allowSpace) {
        if (allowSpace) {
            return /[^a-zA-Z\d\s:]/.test(str);
        } else {
            return /[^a-zA-Z\d]/.test(str);
        }
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
                notValid = (jQuery.trim(val) === "");
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
        return (tableName);
    };

    xcHelper.getTableId = function(wholeName) {
        // get out hashId from tableName + hashId
        var hashIndex = wholeName.lastIndexOf('#');
        if (hashIndex > -1) {
            return (wholeName.substring(hashIndex + 1));
        } else {
            console.warn('Table name does not contain hashId');
            return (null);
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

    xcHelper.checkDuplicateTableName = function(tableName) {
        var deferred = jQuery.Deferred();

        XcalarGetTables()
        .then(function(result) {
            var tables = result.nodeInfo;
            for (var i = 0; i < result.numNodes; i++) {
                var name = xcHelper.getTableName(tables[i].name);
                if (name === tableName) {
                    return (deferred.reject('table'));
                }
            }
            deferred.resolve('success');
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    xcHelper.suggestType = function(datas, currentType) {
        if (currentType === "integer" || currentType === "float") {
            return currentType;
        }

        if (!xcHelper.isArray(datas)) {
            datas = [datas];
        }

        var isNumber;
        var isInteger;
        var isFloat;
        // var isOnly10;
        var isBoolean;

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

            if (isNumber == null || isNumber) {
                var num = Number(data);
                if (isNaN(num)) {
                    isNumber = false;
                    isInteger = false;
                    isFloat = false;
                } else {
                    isNumber = true;
                    if ((isInteger == null || isInteger) &&
                        Number.isInteger(num))
                    {
                        isInteger = true;
                        isFloat = false;

                        // if ((isOnly10 == null || isOnly10) &&
                        //     (num === 0 || num === 1))
                        // {
                        //     isOnly10 = true;
                        // } else {
                        //     isOnly10 = false;
                        // }
                    } else {
                        isFloat = true;
                        isInteger = false;
                    }
                }
            } else if (isBoolean == null || isBoolean) {
                isBoolean = (data === "true" || data === "false" ||
                             data === "t" || data === "f");
            }
        }

        if (currentType === "integer" || isInteger) {
            // if (isOnly10) {
            //     return "boolean";
            // }
            return "integer";
        } else if (isFloat) {
            return "float";
        } else if (isBoolean) {
            return "boolean";
        }

        return "string";
    }

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

        gTables[tableId].isLocked = true;
        WSManager.lockTable(tableId);
    };

    xcHelper.unlockTable = function(tableId, isHidden) {
        xcHelper.assert((tableId != null), "Invalid Parameters!");

        gTables[tableId].isLocked = false;
        if (!isHidden) {
            var $tableWrap = $("#xcTableWrap-" + tableId);
            $tableWrap.find('.lockedIcon').remove();
            $tableWrap.find('.tableCover').remove();
            $tableWrap.removeClass('tableLocked');
            $('#rowScroller-' + tableId).removeClass('locked');
        }

        WSManager.unlockTable(tableId);
    };

    xcHelper.disableSubmit = function($submitBtn) {
        $submitBtn.prop('disabled', true);
    };

    xcHelper.enableSubmit = function($submitBtn) {
        $submitBtn.prop('disabled', false);
    };

    // inserts text into an input field and adds commas
    // detects where the current cursor is and if some text is already selected
    xcHelper.insertText = function($input, textToInsert, prefix) {
        var value  = $input.val();
        var valLen = value.length;
        var newVal;
        var initialScrollPosition = $input.scrollLeft();
        var currentPos = $input[0].selectionStart;
        var selectionEnd = $input[0].selectionEnd;
        var numCharSelected = selectionEnd - currentPos;
        var strLeft;
        if (prefix == null) {
            prefix = "";
        }

        textToInsert = prefix + textToInsert;

        if (valLen === 0) {
            // add to empty input box
            newVal = textToInsert;
            currentPos = newVal.length;
        } else if (numCharSelected > 0) {
            // replace a column
            strLeft = value.substring(0, currentPos);
            newVal = textToInsert;
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

            currentPos = value.length + newVal.length;
        } else if (currentPos === 0) {
            // prepend a column
            if (value.startsWith(",")) {
                // value starts with ",""
                newVal = textToInsert + " ";
            } else if (value.trimLeft().startsWith(",")) {
                // value start with sth like "  ,"
                newVal = textToInsert;
            } else {
                newVal = textToInsert + ", ";
            }

            currentPos = newVal.length; // cursor at the start of value
        } else {
            // insert a column. numCharSelected == 0
            strLeft = value.substring(0, currentPos);

            newVal = textToInsert + ", ";
            currentPos = strLeft.length + newVal.length;
        }

        $input.focus();
        if (!document.execCommand("insertText", false, newVal)) {
            $input.val(value + newVal);
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

    xcHelper.assert = function(statement, error) {
        error = error || "Assert fail!";
        if (!statement) {
            throw error;
        }
    };

    // animate: boolean indicating whether to animate the scrolling
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

    xcHelper.escapeRegExp = function(str) {
        return (str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"));
    };

    xcHelper.escapeColName = function(str) {
        // adds a backslash before each of these: [ ] / . \
        return (str.replace(/[\[\]\/\.\\]/g, "\\$&"));
    };

    xcHelper.unescapeColName = function(str) {

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
            Alert.error(CommonTxtTstr.SuppoortBundleFail, error);
            deferred.reject(error);
        });

        return (deferred.promise());
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

        return (mapStr);
    };

    // determines that "votes.funny" is an object but "votes\.funny" isn't
    xcHelper.isColNameObject = function(colName) {
        var splitName = colName.split(".");
        // var nonEscapedDotFound = false;
        for (var i = 0; i < splitName.length - 1; i++) {
            if (splitName[i].lastIndexOf('\\') !== (splitName[i].length - 1)) {
                return true;
            }
        }
        return false;
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

    return (xcHelper);
}(jQuery, {}));
