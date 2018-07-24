window.FnBar = (function(FnBar, $) {
    var $functionArea; // $("#functionArea");
    var $fnBar; // $('#functionArea .CodeMirror')

    var $lastColInput = null;
    var searchHelper;
    var editor;
    var mainOperators = ['pull', 'map', 'filter'];
    var suggestedMainOperators = ['pull', 'map'];
    var xdfMap = {};
    var udfMap = {};
    var aggMap = {};
    var colNamesCache = {};
    var lastFocusedCol;
    var isAlertOpen = false;
    var initialTableId;//used to track table that was initially active
    var setup = false;
    // when user started searching

    FnBar.setup = function() {
        setup = true;
        $functionArea = $("#functionArea");

        editor = CodeMirror.fromTextArea($('#fnBar')[0], {
            "mode": "spreadsheetCustom",
            "indentWithTabs": true,
            "indentUnit": 4,
            "matchBrackets": true,
            "matchTags": true,
            "placeholder": WSTStr.SearchTableAndColumn,
            "autoCloseBrackets": true
        });

        setupAutocomplete();

        $(window).blur(function() {
            editor.getInputField().blur();
        });

        $functionArea.find('pre').addClass('fnbarPre');
        $fnBar = $('#functionArea .CodeMirror');

        $functionArea.find(".exitFnBar").click(function() {
            FnBar.unlock();
        });

        setupSearchHelper();

        editor.on("keydown", function(instance, event) {
            if ($('.CodeMirror-hints').length) { // do not submit fn if hints
                return;
            }
            if (event.which !== keyCode.Enter) {
                return;
            }

            var val = editor.getValue();
            var mismatch = xcHelper.checkMatchingBrackets(val);

            if (mismatch.index === -1) {
                // stop bubbling in case alert modal
                // keydown also gets triggered by this
                event.stopPropagation();
                functionBarEnter();
            } else {
                // Note: hitting "x" on the tooltip that results from this
                // deselects the current column
                var funcStr = "\"" + val.slice(0, mismatch.index) +
                                '<span class="mismatchBracket">' +
                                mismatch.char + "</span>" +
                                val.slice(mismatch.index + 1) + "\"";
                var pos = editor.charCoords({line: 0, ch: mismatch.index + 1},
                                            "window");

                setTimeout(function() {
                    var error = ErrTStr.BracketsMis + "<br/>" +
                                xcHelper.escapeHTMLSpecialChar(funcStr);
                    StatusBox.show(error, $fnBar.prev().prev(), null, {
                        "offsetX": pos.left - 178,
                        "side": "bottom",
                        "html": true
                    });
                }, 0); // gets closed immediately without timeout;
            }
        });

        editor.on("mousedown", function() {
            $fnBar.addClass("inFocus");
            $fnBar.find('.CodeMirror-placeholder').show();
            // show autocomplete menu if fnbar is blank except for =, so
            // we suggest map or pull
            // delay or codemirror will autoclose hint menu
            setTimeout(function() {
                var val = editor.getValue().trim();
                if (val === "=") {
                    editor.execCommand("autocomplete");
                }
            }, 0);
        });

        editor.on("focus", function() {
            if (!$functionArea.hasClass("searching")) {
                fnBarLock();
            }
            xcTooltip.hideAll();
            FnBar.updateColNameCache();
        });

        // editor.on("blur") is triggered during selection range mousedown
        // which it shouldn't (due to dragndrop) so it's not reliable to use


        // disallow adding newlines
        editor.on("beforeChange", function(instance, change) {
        // remove ALL \n
            var newText = change.text.join("").replace(/\n/g, "");
            // Notes: "change" arg is incremental- user can type in "="
            // anywhere and be caught by this, but doesn't catch paste as long
            // as equal sign is not at beginning
            if (newText.trim().indexOf("=") === 0 &&
                lastFocusedCol === undefined) {
                // No active column, disallow user from typing in a
                newText = "";
                var $div = $('#funcBarMenuArea');
                var timeoutTime;
                if ($('#container').hasClass('columnPicker')) {
                    xcTooltip.changeText($div, TooltipTStr.NoFnBarFormOpen);
                    timeoutTime = 2500;
                } else {
                    xcTooltip.changeText($div, TooltipTStr.SelectCol);
                    timeoutTime = 1200;
                }
                xcTooltip.refresh($div, timeoutTime);
            }
            if (change.update) {
                change.update(change.from, change.to, [newText]);
            }
            return true;
        });


        // change is triggered during user's input or when clearing/emptying
        // the input field
        editor.on("change", function(instance, change) {
            var val = editor.getValue();
            var trimmedVal = val.trim();
            if ($fnBar.hasClass('disabled')) {
                // $functionArea.removeClass('searching');
                return;
            }
            // only search if string does not begin with =
            // if string is empty, then it should at least have a class searching
            // otherwise we do not search
            if (trimmedVal.indexOf('=') === 0) {
                clearSearch();
            } else if (trimmedVal === "" &&
                        change.removed[0].indexOf("=") === 0) {
                // "=" was deleted so stay focused on column
            } else {
                $functionArea.addClass('searching');
                if (!$fnBar.hasClass('inFocus')) {
                    // change event can be triggered when removing focus from
                    // a table column and switching to search mode when clicking
                    // away. We do not want to trigger search if fnBar is not
                    // in focus because user is not actually typing a change
                    return;
                }
                lastFocusedCol = undefined;
                colNamesCache = {};

                var args = {
                    "value": trimmedVal,
                    "searchBar": searchHelper,
                    "initialTableId": initialTableId
                };
                ColManager.execCol("search", null, null, null, args);
                $lastColInput = null;
                FnBar.unlock();
            }
        });
    };

    function fnBarLock() {
        if (!$("#container").hasClass("columnPicker")) {
            $functionArea.addClass("fnBarLocked");
            $("#container").addClass("columnPicker");
            $("#container").addClass("formOpen");
            DagPanel.updateExitMenu("Function Bar");
            TblMenu.updateExitOptions("#tableMenu", "Function Bar");
            TblMenu.updateExitOptions("#colMenu", "Function Bar");

            const selector = ".xcTable .header, .xcTable td.clickable";
            $("#mainFrame").on("mousedown.columnPicker", selector, function(event) {
                if (!editor.getValue().trim().startsWith("=")) {
                    $functionArea.find(".exitFnBar").click();
                    $(this).trigger(event);
                } else {
                    // prevents fnbar from blurring
                    event.preventDefault();
                    event.stopPropagation();
                }
            });
            $("#mainFrame").on("click.columnPicker", selector, function(event) {
                const $target = $(event.target);
                if ($target.closest('.dataCol').length ||
                    $target.closest('.jsonElement').length ||
                    $target.closest('.dropdownBox').length) {
                    return;
                }

                // check to see if cell has a valid type
                const $td = $target.closest('td');
                let $header;
                if ($td.length) {
                    const colNum = xcHelper.parseColNum($td);
                    $header = $td.closest('.xcTable').find('th.col' + colNum)
                                                     .find('.header');
                } else {
                    $header = $(this);
                }
                const $prefixDiv = $header.find('.topHeader .prefix');
                const colPrefix = $prefixDiv.hasClass('immediate') ?
                                        "" : $prefixDiv.text();
                const columnVal = xcHelper.getPrefixColName(colPrefix,
                                           $header.find(".editableHead").val());
                editor.replaceSelection(columnVal, "around");
            });
            $(document).on("keydown", function(event) {
                if ($('.CodeMirror-hints').length) {
                    return;
                }
                if (event.which === keyCode.Escape) {
                    $functionArea.find(".exitFnBar").click(); // causes blur
                    // and exits
                }
            });
        }
    }

    FnBar.unlock = function() {
        if ($functionArea.hasClass("fnBarLocked")) {
            $("#container").removeClass("columnPicker");
            $("#container").removeClass("formOpen");
            $functionArea.removeClass("fnBarLocked");
            TblMenu.updateExitOptions("#tableMenu");
            TblMenu.updateExitOptions("#colMenu");
            DagPanel.updateExitMenu();
            $("#mainFrame").off(".columnPicker");
        }
    }

    FnBar.updateOperationsMap = function(opMap, isOnlyUDF) {
        opMap = xcHelper.deepCopy(opMap);
        if (isOnlyUDF) {
            udfMap = {};
        } else {
            xdfMap = {};
            udfMap = {};
        }

        for (var i = 0; i < opMap.length; i++) {
            var op = opMap[i];

            if (op.displayName) {
                op.fnName = op.displayName;
            }

            var fnName = op.fnName.toLowerCase();
            if (op.category === FunctionCategoryT.FunctionCategoryUdf) {
                if (!udfMap[fnName]) {
                    udfMap[fnName] = [];
                }
                udfMap[fnName].push(op);
            } else if (op.category !==
                        FunctionCategoryT.FunctionCategoryAggregate) {
                if (!xdfMap[fnName]) {
                    xdfMap[fnName] = [];
                }
                xdfMap[fnName].push(op);
            }

            op.template = createFuncTemplate(op);
            var secondTemplate = createSecondaryTemplate(op);
            op.templateTwo = secondTemplate.template;
            op.modArgDescs = secondTemplate.argDescs;
        }

        // the text that shows up in the list
        function createFuncTemplate(op) {
            var fnTemplate = op.fnName + '(';
            var len = op.argDescs.length;
            var argDesc;
            for (var j = 0; j < len; j++) {
                argDesc = op.argDescs[j].argDesc;
                fnTemplate += '<span class="argDesc">' + argDesc + '</span>';
                if (j + 1 < len) {
                    fnTemplate += ",";
                }
            }
            fnTemplate += ')';
            return fnTemplate;
        }

        // the text that shows up in the fnBar when selected
        function createSecondaryTemplate(op) {
            var fnTemplate = op.fnName + '(';
            var len = op.argDescs.length;
            var argDesc;
            var argDescs = [];
            for (var j = 0; j < len; j++) {
                argDesc = op.argDescs[j].argDesc.trim();
                argDescSplit = argDesc.split(" "); // separate by spaces
                if (argDescSplit.length > 2) {
                    argDesc = argDesc = "arg" + (j + 1);
                } else if (argDescSplit.length === 2) {
                    // camel case and join 2 words together
                    argDesc = argDescSplit[0] +
                            argDescSplit[1][0].toUpperCase() +
                            argDescSplit[1].slice(1);
                }
                argDescs.push(argDesc);

                fnTemplate += argDesc;
                if (j + 1 < len) {
                    fnTemplate += ", ";
                }
            }
            fnTemplate += ')';
            return {template: fnTemplate, argDescs: argDescs};
        }
    };

    FnBar.updateAggMap = function(aggs) {
        aggMap = {};
        for (var a in aggs) {
            aggMap[aggs[a].aggName] = aggs[a].aggName;
        }
    };

    FnBar.updateColNameCache = function() {
        if (initialTableId && initialTableId !== gActiveTableId ||
            $.isEmptyObject(colNamesCache)) {
            resetColNamesCache(gActiveTableId);
        }
        initialTableId = gActiveTableId;
    };

    FnBar.focusOnCol = function($colInput, tableId, colNum, forceFocus) {
        // Note: forceFocus is ONLY ever true in colmanager.renamecol
        var newFocus = false;
        if (lastFocusedCol == null) {
            newFocus = true;
        }
        lastFocusedCol = gTables[tableId].tableCols[colNum - 1];
        if (!forceFocus && $lastColInput != null &&
            $colInput.get(0) === $lastColInput.get(0) &&
            !$fnBar.parent().hasClass('searching'))
        {
            // the function bar origin hasn't changed so just return
            // and do not rehighlight or update any text
            return;
        }

        $lastColInput = $colInput;
        var progCol = gTables[tableId].tableCols[colNum - 1];
        if ($colInput.parent().hasClass("editable")) {
            if (!progCol.isNewCol) {
                throw "Error Case, only new column can be editable";
            }
            editor.setValue(FnBarTStr.NewCol);
            $fnBar.addClass("disabled").removeClass('active');
            // var keepVal = false;
            // if ($lastColInput) {
            //     keepVal = true;
            // }
            clearSearch();
        } else {
            editor.getInputField().blur(); // hack to reset blur
            var userStr = progCol.userStr;
            if (userStr.trim() === "") {
                userStr = "= ";
            } else {
                userStr = "= " + xcHelper.parseUserStr(userStr);
            }
            editor.setValue(userStr);
            $fnBar.addClass('active').removeClass('disabled');
            clearSearch();
            if (newFocus) {
                resetColNamesCache(tableId);
            }
        }
    };

    FnBar.clear = function() {
        if (isAlertOpen || !setup) {
            return;
        }
        lastFocusedCol = undefined;
        $lastColInput = null;
        editor.setValue("");
        $fnBar.removeClass("active inFocus disabled");
        $functionArea.addClass("searching");
        colNamesCache = {};

        FnBar.unlock();
    };

    // sets cursor to blink at the end of the input string
    FnBar.focusCursor = function() {
        var valLen = editor.getValue().length;
        editor.focus();
        editor.setCursor(0, valLen);
    };

    FnBar.getEditor = function() {
        return editor;
    };

    function clearSearch() {
        $functionArea.removeClass('searching');
        $functionArea.find('.position').hide();
        $functionArea.find('.counter').hide();
        $functionArea.find('.arrows').hide();
        if ($fnBar.hasClass("CodeMirror-focused")) {
            fnBarLock();
        }
    }

    function setupAutocomplete() {
        var keysToIgnore = [keyCode.Left, keyCode.Right, keyCode.Down,
                            keyCode.Up, keyCode.Tab, keyCode.Enter,
                            keyCode.Escape];

        // trigger autcomplete menu on keyup, except when keysToIgnore
        editor.on("keyup", function(cm, e) {
            var val = editor.getValue().trim();
            if (val.indexOf('=') === 0 && keysToIgnore.indexOf(e.keyCode) < 0) {
                editor.execCommand("autocompleteFnBar");
            }
        });

        // set up codemirror autcomplete command
        CodeMirror.commands.autocompleteFnBar = function(cm) {
            CodeMirror.showHint(cm, CodeMirror.hint.fnBarHint, {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true
            });
        };
        // var timer1;
        // set up autcomplete hint function that filters matches
        CodeMirror.registerHelper("hint", "fnBarHint", function(editor) {
            var fullVal = editor.getValue();
            var onlyMainOperators = false;
            if (fullVal.indexOf("(") === -1) {
                onlyMainOperators = true;
            }
            var word = /[\w$:^\s]+/; // allow : and ^
            var wordNoSpace = /[\w$:^]+/; // allow : and ^ and space
            var cur = editor.getCursor();
            var fnBarText = editor.getLine(0);
            var list = [];
            var seen = {};
            var end = cur.ch;
            var start = end;
            while (end && wordNoSpace.test(fnBarText.charAt(end))) {
                ++end;
            }
            while (start && word.test(fnBarText.charAt(start - 1))) {
                --start;
            }
            while (start && fnBarText.charAt(start) === " " && start < end) {
                ++start;
            }
            var curWord = (start !== end && fnBarText.slice(start, end));

            if (!curWord) {
                if (onlyMainOperators) {
                    for (var i = 0; i < suggestedMainOperators.length; i++) {
                        seen[suggestedMainOperators[i]] = true;
                        list.push({
                            text: suggestedMainOperators[i] + "()",
                            displayText: suggestedMainOperators[i],
                            hint: autocompleteSelect,
                            render: renderMainOpLi,
                            className: "operator mainOperator"
                        });
                    }
                } else {
                    return;
                }
            }

            if (onlyMainOperators) {
                for (var i = 0; i < suggestedMainOperators.length; i++) {
                    if (!seen.hasOwnProperty(suggestedMainOperators[i]) &&
                        suggestedMainOperators[i].indexOf(curWord) !== -1) {
                        seen[suggestedMainOperators[i]] = true;
                        list.push({
                            text: suggestedMainOperators[i] + "()",
                            displayText: suggestedMainOperators[i],
                            hint: autocompleteSelect,
                            render: renderMainOpLi,
                            className: "operator mainOperator"
                        });
                        break;
                    }
                }
            } else {
                var op = getOperationFromFuncStr(fullVal);
                if (op === "pull") {
                    return;
                }
                curWord = curWord.toLowerCase();
                // search columnNames
                for (var name in colNamesCache) {
                    if (name.indexOf(curWord) !== -1 &&
                        !seen.hasOwnProperty(name)) {
                        seen[name] = true;
                        list.push({
                            text: colNamesCache[name],
                            displayText: colNamesCache[name],
                            render: renderList,
                            className: "colName"
                        });
                    }
                }

                // search xdfMap
                for (var xdfFn in xdfMap) {
                    searchMapFunction(xdfFn, xdfMap[xdfFn]);
                }

                // search udfMap
                for (var udfFn in udfMap) {
                    searchMapFunction(udfFn, udfMap[udfFn]);
                }

                // search aggMap
                for (var agg in aggMap) {
                    if (agg.indexOf(curWord) !== -1 &&
                        !seen.hasOwnProperty(agg)) {
                        list.push({
                            text: agg,
                            displayText: agg,
                            render: renderList,
                            className: "colName"
                        });
                    }
                }
            }

            list.sort(function(a, b) {
                return a.displayText.length - b.displayText.length;
            });
            // do not show hint if only hint is an exact match
            if (list.length === 1 && curWord === list[0].text) {
                list = [];
            }

            return ({
                list: list,
                from: CodeMirror.Pos(0, start),
                to: CodeMirror.Pos(0, end)
            });

            function searchMapFunction(fnName, mapFuncs) {
                if (fnName.lastIndexOf(curWord, 0) === 0 &&
                    !seen.hasOwnProperty(fnName)) {
                    seen[fnName] = true;
                    var mapFunc;
                    for (var i = 0; i < mapFuncs.length; i++) {
                        mapFunc = mapFuncs[i];
                        list.push({
                            text: mapFunc.fnName + "()",
                            displayText: mapFunc.fnName,
                            template: mapFunc.template,
                            templateTwo: mapFunc.templateTwo,
                            argDescs: mapFunc.modArgDescs,
                            hint: autocompleteSelect,
                            render: renderOpLi,
                            className: "operator"
                        });
                    }
                }
            }
        });

        function autocompleteSelect(cm, data, completion) {
            var text = completion.templateTwo || completion.text;
            cm.replaceRange(text, data.from, data.to, "complete");
            var firstEndIndex;

            // highlight arguments and place cursor right after the end of the
            // first argument
            if (completion.argDescs) {
                var start = text.indexOf('(');
                var arg;
                for (var i = 0 ; i < completion.argDescs.length; i++) {
                    arg = completion.argDescs[i];
                    start = text.indexOf(arg, start);
                    if (!firstEndIndex && arg.length) {
                        // firstStartIndex = data.from.ch + start;
                        firstEndIndex = data.from.ch + start + arg.length;
                    }

                    cm.markText({line: 0, ch: data.from.ch + start},
                        {line: 0, ch: data.from.ch + start + arg.length},
                        {className: "argDesc", atomic: true});
                }
            }
            if (firstEndIndex) {
                cm.setCursor(0, firstEndIndex);
                // xx selection doesn't work on atomic sections
                // cm.setSelection({line: 0, ch: firstStartIndex},
                //                 {line: 0, ch: firstEndIndex});
            } else {
                var to = data.from.ch + text.length - 1;
                cm.setCursor(0, to);
            }
        }

        function renderMainOpLi(el, data, cur) {
            el.innerHTML = '<span class="displayText">' +
                                cur.displayText +
                            '</span>' +
                            '<span class="template">' +
                                cur.text +
                          '</span>';
        }

        function renderOpLi(el, data, cur) {
            el.innerHTML = '<span class="displayText">' + cur.displayText +
                           '</span><span class="template">' + cur.template +
                           '</span>';
        }

        function renderList(el, data, cur) {
            el.appendChild(document.createTextNode(cur.displayText));
        }

        editor.setOption("extraKeys", {
            Tab: function(cm) {
                var cursorPos = cm.getCursor().ch;
                var valLen = cm.getValue().length;
                if (valLen <= cursorPos) {
                    $('#rowInput').focus();
                    return false; // prevent tabbing so that pressing tab skips
                    //to the next input on the page, in this case the "#rowInput"
                } else {
                    cm.setCursor(0, valLen);
                }
            }
        });
    }

    function resetColNamesCache(tableId) {
        if (!gTables[tableId]) {
            return;
        }
        colNamesCache = xcHelper.getColNameMap(tableId);
    }

    function setupSearchHelper() {
        searchHelper = new SearchBar($functionArea, {
            "removeSelected": function() {
                $('.xcTable').find('.selectedCell')
                             .removeClass('selectedCell');
                if (!$("#container").hasClass("columnPicker")) {
                    $('.xcTable').find('.modalHighlighted')
                             .removeClass('modalHighlighted');
                }
            },
            "highlightSelected": function($match) {
                if (!$("#container").hasClass("columnPicker")) {
                    $('.xcTable').find('.modalHighlighted')
                                 .removeClass('modalHighlighted');
                }

                if ($match.is('th')) {
                    TblManager.highlightColumn($match);
                    $('#mainFrame').find('.tblTitleSelected')
                                   .removeClass('tblTitleSelected');
                    $('.dagWrap.selected').removeClass('selected')
                                          .addClass('notSelected');
                    RowScroller.empty();
                } else if ($match.is('.tableTitle')) {
                    var tableId = $match.closest('.xcTableWrap').data('id');
                    TblFunc.focusTable(tableId, true);
                }
            },
            "scrollMatchIntoView": function($match) {
                var $mainFrame = $('#mainFrame');
                var mainFrameOffset = MainMenu.getOffset();
                var rightBoundary = mainFrameOffset + $mainFrame.width();
                var matchOffsetLeft = $match.offset().left;
                var matchWidth = $match.width();
                var matchDiff = matchOffsetLeft - (rightBoundary - matchWidth);

                if (matchDiff > 0 || matchOffsetLeft < (mainFrameOffset)) {
                    var scrollLeft = $mainFrame.scrollLeft();
                    var mainFrameWidth = $mainFrame.width();
                    $mainFrame.scrollLeft(scrollLeft + matchDiff +
                                        ((mainFrameWidth - matchWidth) / 2));
                }
            },
            "codeMirror": editor,
            "$input": $fnBar,
            "ignore": "=",
            "arrowsPreventDefault": true
        });
    }

    function functionBarEnter() {
        var deferred = PromiseHelper.deferred();

        var fnBarVal = editor.getValue().trim();
        var $colInput = $lastColInput;

        if (!$colInput || !$colInput.closest("body").length) {
            // $colInput.length could return a number  even if it's no longer
            // in the DOM so check for body
            $lastColInput = null;
            deferred.reject();
            return deferred.promise();
        }

        if (fnBarVal.indexOf("=") !== 0) {
            return PromiseHelper.reject();
        }

        var $table = $colInput.closest('.dataTable');
        var tableId = xcHelper.parseTableId($table);
        var table = gTables[tableId];

        if (table.hasLock()) {
            return PromiseHelper.reject();
        }

        var colNum = xcHelper.parseColNum($colInput);

        var tableCol = table.tableCols[colNum - 1];
        var colName = tableCol.getBackColName();
        var frontColName = tableCol.getFrontColName();
        var cursor = editor.getCursor().ch;
        var alertTitle;
        var alertMsg;
        var confirmFunc;

        if (tableCol.isNewCol && frontColName === "") {
            // when it's new column and do not give name yet
            StatusBox.show(ErrTStr.NoEmpty, $colInput);
            return PromiseHelper.reject();
        }

        $fnBar.removeClass("inFocus");

        var newFuncStr = '"' + frontColName + '" ' + fnBarVal;
        var oldUsrStr  = tableCol.userStr;
        var fnBarValNoSpace = xcHelper.removeNonQuotedSpaces(
                                                    fnBarVal.slice(1));
        var oldUsrStrNoSpace = tableCol.stringifyFunc();

        $colInput.blur();
        // when usrStr not change
        if (fnBarValNoSpace === oldUsrStrNoSpace) {
            return PromiseHelper.reject();
        }

        var operation = getOperationFromFuncStr(newFuncStr);
        if (mainOperators.indexOf(operation) < 0) {
            invalidOperationHandler(operation, fnBarVal);
            return PromiseHelper.reject();
        } else if (operation !== "pull") {
            // check if correct number of parenthesis exists, should have
            // at least two
            if (newFuncStr.replace(/[^(]/g, "").length < 2) {
                invalidNumParensHandler(operation);
                return PromiseHelper.reject();
            }
        }

        // prevent doing a map on an existing column
        if (operation === "map" && !tableCol.isNewCol) {
            alertTitle = FnBarTStr.NewColTitle;
            alertMsg = FnBarTStr.NewColMsg;
            confirmFunc = function() {
                tableCol.userStr = oldUsrStr;
                ColManager.addNewCol(colNum, tableId, ColDir.Left, {
                    userStr: '"" ' + fnBarVal
                });
                isAlertOpen = false;
            };
            var buttonOption = {
                name: CommonTxtTstr.NEWCOLUMN,
                func: confirmFunc
            };
            showConfirmAlert($colInput, alertTitle, alertMsg, cursor,
                             confirmFunc, buttonOption);
            deferred.reject();
        } else {
            confirmFunc = function() {
                var innerDeferred = PromiseHelper.deferred();
                ColManager.execCol(operation, newFuncStr, tableId, colNum)
                .then(function(ret) {
                    if (ret === "update") {
                        TblManager.updateHeaderAndListInfo(tableId);
                        KVStore.commit();
                    }
                    FnBar.focusCursor();
                    innerDeferred.resolve(ret);
                })
                .fail(innerDeferred.reject);

                isAlertOpen = false;

                return innerDeferred.promise();
            };

            var funcStr = xcHelper.parseUserStr(fnBarVal);
            funcStr = funcStr.substring(funcStr.indexOf("(") + 1,
                                                funcStr.lastIndexOf(")"));
            var funcObj = ColManager.parseFuncString(funcStr);

            var selectedColNames;
            if (operation !== "pull") {
                selectedColNames = xcHelper.getNamesFromFunc(funcObj);
            }

            // show alert if column in string does not match selected col,
            // only used for filter since map cannot be performed on filled
            // column
            if (!tableCol.isEmptyCol() &&
                !checkForSelectedColName(operation, colName, selectedColNames)) {
                alertTitle = AlertTStr.CONFIRMATION;
                alertMsg = xcHelper.replaceMsg(FnBarTStr.DiffColumn, {
                    colName: colName
                });
                showConfirmAlert($colInput, alertTitle, alertMsg, cursor,
                                 confirmFunc);
                deferred.reject();
            } else if (checkDuplicatePull(tableId, colNum, operation, funcStr)) {
                // only checks for pull operation
                duplicatePullHandler();
                return PromiseHelper.reject();
            } else {
                if (operation === "pull") {
                    confirmFunc()
                    .then(deferred.resolve)
                    .fail(function() {
                        parseErrorHandler();
                        deferred.reject();
                    });
                } else {
                    if (funcStr[funcStr.length - 1] !== ")") {
                        invalidNumParensHandler(operation);
                        return PromiseHelper.reject();
                    }

                    var unknownColNames = getUnknownSelectedColNames(
                                            selectedColNames, tableId);
                    var unknownFuncs = getUnknownFuncs(funcObj);
                    if (unknownColNames.length || unknownFuncs.length) {
                        alertTitle = AlertTStr.CONFIRMATION;
                        alertMsg = "";
                        if (unknownColNames.length) {
                            alertMsg += xcHelper.replaceMsg(FnBarTStr.UnknownColumnOp, {
                                columns: unknownColNames.join().split(",")
                            }) + "<br/>";
                        }
                        if (unknownFuncs.length) {
                            alertMsg += xcHelper.replaceMsg(FnBarTStr.UnknownFuncOp, {
                                funcs: unknownFuncs.join().split(",")
                            }) + "<br/>";
                        }
                        alertMsg += FnBarTStr.WantContinue;

                        showConfirmAlert($colInput, alertTitle, alertMsg, cursor,
                                         confirmFunc);
                        return PromiseHelper.reject();
                    }

                    confirmFunc()
                    .then(deferred.resolve)
                    .fail(function() {
                        parseErrorHandler();
                        deferred.reject();
                    });
                }
            }
        }

        return deferred.promise();
    }

    function invalidOperationHandler(operation, fnBarVal) {
        var text = "";
        var endText = false;

        if (operation.length) {
            opeartion = xcHelper.escapeHTMLSpecialChar(operation);
            text = "Invalid Operator: <b>" + operation + "</b>.<br/>";
        } else {
            if (fnBarVal.indexOf("(") === -1) {
                text = FnBarTStr.InvalidOpParen;
                endText = true;
            } else {
                text = "Invalid Operator.<br/>";
            }
        }
        if (!endText) {
            text += FnBarTStr.ValidOps;
        }

        setTimeout(function() {
            StatusBox.show(text, $fnBar.prev().prev(), null, {
                "offsetX": 50,
                "side": "bottom",
                "html": true
            });
        }, 0); // gets closed immediately without timeout;
    }

    function invalidNumParensHandler(operation) {
        var text = xcHelper.replaceMsg(FnBarTStr.InvalidNumParens, {
            operation: operation
        });
        setTimeout(function() {
            StatusBox.show(text, $fnBar.prev().prev(), null, {
                "offsetX": 50,
                "side": "bottom"
            });
        }, 0);
    }

    function duplicatePullHandler() {
        setTimeout(function() {
            StatusBox.show(FnBarTStr.PullExists, $fnBar.prev().prev(), null, {
                "offsetX": 70,
                "side": "bottom"
            });
        }, 0);
    }

    function parseErrorHandler() {
        setTimeout(function() {
            StatusBox.show(FnBarTStr.ParseError, $fnBar.prev().prev(), null, {
                "offsetX": 70,
                "side": "bottom"
            });
        }, 0);
    }

    function showConfirmAlert($colInput, alertTitle, alertMsg, cursor,
                             confirmFunc, btnOption) {
        var btns;
        if (btnOption) {
            btns = [btnOption];
        }
        isAlertOpen = true;
        Alert.show({
            "title": alertTitle,
            "msgTemplate": alertMsg,
            "keepFnBar": true,
            "buttons": btns,
            "onCancel": function() {
                if ($colInput.length) {
                    $colInput.trigger(fakeEvent.mousedown);
                    $colInput.trigger(fakeEvent.mouseup);

                    $fnBar.removeAttr("disabled").focus();
                    $fnBar.addClass("inFocus");
                    editor.focus();
                    editor.setCursor(0, cursor);
                }
                $fnBar.removeAttr("disabled");
                isAlertOpen = false;
            },
            "onConfirm": function() {
                confirmFunc();
                isAlertOpen = false;
            }
        });
    }

    function checkDuplicatePull(tableId, colNum, op, name) {
        if (op !== "pull") {
            return false;
        }
        var exists = ColManager.checkDuplicateName(tableId, colNum, name);
        return exists;
    }


    // will return false if column names detected and colName is not found
    // among them. Otherwise, will return true
    function checkForSelectedColName(op, colName, selectedColNames) {
        if (op === "pull") {
            return true; // ignore check for pull
        }
        if (selectedColNames.length && selectedColNames.indexOf(colName) === -1) {
            return false;
        } else {
            return true;
        }
    }

    function getOperationFromFuncStr(funcStr) {
        var operation = xcHelper.parseUserStr(funcStr);
        operation = operation.substr(0, operation.indexOf("(")).trim();
        return (operation);
    }

    function getUnknownSelectedColNames(selectedColNames, tableId) {
        var table = gTables[tableId];
        var unknowns = [];
        var colName;
        var splitColName;
        for (var i = 0; i < selectedColNames.length; i++) {
            colName = selectedColNames[i];

            if (!table.hasColWithBackName(colName, true) &&
                !aggMap.hasOwnProperty(colName)) {
                // try first part of obj/array names
                splitColName = colName.split(/[.[]+/);
                if (splitColName.length === 1 ||
                    !table.hasColWithBackName(splitColName[0])) {
                    unknowns.push(colName);
                }
            }
        }

        return unknowns;
    }

    function getUnknownFuncs(funcObj) {
        var unknownFuncs = [];
        var funcs = [];
        getFuncs(funcObj);

        function getFuncs(fnObj) {
            if (fnObj.name) {
                if (funcs.indexOf(fnObj.name) === -1) {
                    funcs.push(fnObj.name);
                }
            }
            for (var i = 0; i < fnObj.args.length; i++) {
                if (typeof fnObj.args[i] === "object") {
                    getFuncs(fnObj.args[i]);
                }
            }
        }

        for (var i = 0; i < funcs.length; i++) {
            var fLower = funcs[i].toLowerCase();
            if (!xdfMap.hasOwnProperty(fLower) &&
                !udfMap.hasOwnProperty(fLower)) {
                unknownFuncs.push(funcs[i]);
            } else {
                var found = false;
                if (udfMap.hasOwnProperty(fLower)) {
                    for (var j = 0; j < udfMap[fLower].length; j++) {
                        if (udfMap[fLower][j].fnName === funcs[i]) {
                            found = true;
                            break;
                        }
                    }
                }

                if (!found && xdfMap.hasOwnProperty(fLower)) {
                    for (var j = 0; j < xdfMap[fLower].length; j++) {
                        if (xdfMap[fLower][j].fnName === funcs[i]) {
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    unknownFuncs.push(funcs[i]);
                }
            }
        }
        return unknownFuncs;
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        FnBar.__testOnly__ = {};
        FnBar.__testOnly__.functionBarEnter = functionBarEnter;
        FnBar.__testOnly__.getUnknownFuncs = getUnknownFuncs;
        FnBar.__testOnly__.getUnknownSelectedColNames = getUnknownSelectedColNames;
    }
    /* End Of Unit Test Only */

    return (FnBar);
}({}, jQuery));
