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

    FnBar.setup = function() {
        $functionArea = $("#functionArea");

        editor = CodeMirror.fromTextArea($('#fnBar')[0], {
            "mode"             : "spreadsheetCustom",
            "indentWithTabs"   : true,
            "indentUnit"       : 4,
            "matchBrackets"    : true,
            "placeholder"      : WSTStr.SearchTableAndColumn,
            "autoCloseBrackets": true
        });

        setupAutocomplete();

        $(window).blur(function() {
            editor.getInputField().blur();
        });

        $functionArea.find('pre').addClass('fnbarPre');
        $fnBar = $('#functionArea .CodeMirror');

        setupSearchHelper();
        var initialTableId; //used to track table that was initially active
        // when user started searching

        editor.on("keydown", function(instance, event) {
            if (event.which !== keyCode.Enter) {
                return;
            }
            if ($('.CodeMirror-hints').length) { // do not submit fn if hints
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
                var funcStr = "\"" + val.slice(0, mismatch.index) +
                                '<span class="mismatchBracket">' +
                                mismatch.char + "</span>" +
                                val.slice(mismatch.index + 1) + "\"";
                var pos = editor.charCoords({line: 0, ch: mismatch.index + 1},
                                            "window");

                setTimeout(function() {
                    var error = ErrTStr.BracketsMis + "<br/>" + funcStr;
                    StatusBox.show(error, $fnBar.prev().prev(), null, {
                        "offsetX": pos.left - 178,
                        "side"   : "bottom",
                        "html"   : true
                    });
                }, 0); // gets closed immediately without timeout;
            }
        });

        editor.on("mousedown", function() {
            $fnBar.addClass("inFocus");
            $fnBar.find('.CodeMirror-placeholder').show();

            // delay or codemirror will autoclose hint menu
            setTimeout(function() {
                var val = editor.getValue().trim();
                if (val.indexOf('=') === 0) {
                    editor.execCommand("autocomplete");
                }
            }, 0);
        });

        editor.on("focus", function() {
            if (initialTableId && initialTableId !== gActiveTableId) {
                resetColNamesCache(gActiveTableId);
            }
            initialTableId = gActiveTableId;
        });

        // editor.on("blur") is triggered during selection range mousedown
        // which it shouldn't (due to dragndrop) so it's not reliable to use


        // disallow adding newlines
        editor.on("beforeChange", function(instance, change) {
        // remove ALL \n
            var newText = change.text.join("").replace(/\n/g, "");
            if (newText.trim().indexOf("=") === 0 &&
                lastFocusedCol === undefined) {
                // No active column, disallow user from typing in a
                newText = "";
                xcTooltip.refresh($('#funcBarMenuArea'), 1000);
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
                    "value"         : trimmedVal,
                    "searchBar"     : searchHelper,
                    "initialTableId": initialTableId
                };
                ColManager.execCol("search", null, null, null, args);
                $lastColInput = null;
            }
        });
    };

    FnBar.updateOperationsMap = function(opMap, isOnlyUDF) {
        if (isOnlyUDF) {
            udfMap = {};
        } else {
            xdfMap = {};
            udfMap = {};
        }

        for (var i = 0; i < opMap.length; i++) {
            var op = opMap[i];
            var fnName = op.fnName.toLowerCase();
            if (op.category === FunctionCategoryT.FunctionCategoryUdf) {
                udfMap[fnName] = op;
            } else if (op.category !==
                        FunctionCategoryT.FunctionCategoryAggregate) {
                xdfMap[fnName] = op;
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

    FnBar.focusOnCol = function($colInput, tableId, colNum, forceFocus) {
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
                userStr = userStr.substring(userStr.indexOf('='));
            }
            editor.setValue(userStr);
            $fnBar.addClass('active').removeClass('disabled');
            clearSearch();
            if (newFocus) {
                resetColNamesCache(tableId);
            }
        }
    };

    FnBar.clear = function(noSave) {
        if (isAlertOpen) {
            return;
        }
        lastFocusedCol = undefined;
        if (!noSave) {
            saveInput();
        }
        $lastColInput = null;
        editor.setValue("");
        $fnBar.removeClass("active inFocus disabled");
        colNamesCache = {};
    };

    // sets cursor to blink at the end of the input string
    FnBar.focusCursor = function() {
        var valLen = editor.getValue().length;
        editor.focus();
        editor.setCursor(0, valLen);
    };

    FnBar.getEditor = function() {
        return editor;
    }

    function clearSearch() {
        $functionArea.removeClass('searching');
        $functionArea.find('.position').hide();
        $functionArea.find('.counter').hide();
        $functionArea.find('.arrows').hide();
    }

    function setupAutocomplete() {
        var keysToIgnore = [keyCode.Left, keyCode.Right, keyCode.Down,
                            keyCode.Up, keyCode.Tab, keyCode.Enter];

        // trigger autcomplete menu on keyup, except when keysToIgnore
        editor.on("keyup", function(cm, e) {
            var val = editor.getValue().trim();
            if (val.indexOf('=') === 0 && keysToIgnore.indexOf(e.keyCode) < 0) {
                editor.execCommand("autocomplete");
            }
        });

        // set up codemirror autcomplete command
        CodeMirror.commands.autocomplete = function(cm) {
            CodeMirror.showHint(cm, CodeMirror.hint.fnBarHint, {
                alignWithWord        : true,
                completeSingle       : false,
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
            var word = /[\w$:^]+/; // allow : and ^
            var cur = editor.getCursor();
            var fnBarText = editor.getLine(0);
            var list = [];
            var seen = {};
            var end = cur.ch;
            var start = end;
            while (end && word.test(fnBarText.charAt(end))) {
                ++end;
            }
            while (start && word.test(fnBarText.charAt(start - 1))) {
                --start;
            }
            var curWord = (start !== end && fnBarText.slice(start, end));
            if (!curWord) {
                if (onlyMainOperators) {
                    for (var i = 0; i < suggestedMainOperators.length; i++) {
                        seen[suggestedMainOperators[i]] = true;
                        list.push({
                            text       : suggestedMainOperators[i] + "()",
                            displayText: suggestedMainOperators[i],
                            hint       : autcompleteSelect,
                            render     : renderMainOpLi,
                            className  : "operator mainOperator"
                        });
                    }
                } else {
                    return;
                }
            }
            // to find words in the editor
            // var re = new RegExp(word.source, "g");
            // var line = cur.line;
            // var m;
            // while (m = re.exec(fnBarText)) {
            //     if (line == cur.line && m[0] === curWord) {
            //         // ignore current word that is being compared
            //         continue;
            //     }
            //     if ((curWord && m[0].lastIndexOf(curWord, 0) === 0) &&
            //         !Object.prototype.hasOwnProperty.call(seen, m[0])) {
            //         seen[m[0]] = true;
            //         list.push(m[0]);
            //     }
            // }

            if (onlyMainOperators) {
                for (var i = 0; i < suggestedMainOperators.length; i++) {
                    if (!seen.hasOwnProperty(suggestedMainOperators[i]) &&
                        suggestedMainOperators[i].indexOf(curWord) !== -1) {
                        seen[suggestedMainOperators[i]] = true;
                        list.push({
                            text       : suggestedMainOperators[i] + "()",
                            displayText: suggestedMainOperators[i],
                            hint       : autcompleteSelect,
                            render     : renderMainOpLi,
                            className  : "operator mainOperator"
                        });
                        break;
                    }
                }
            } else {
                curWord = curWord.toLowerCase();
                // search columnNames
                for (var name in colNamesCache) {
                    if (name.indexOf(curWord) !== -1 &&
                        !seen.hasOwnProperty(name)) {
                        seen[name] = true;
                        list.push({
                            text       : colNamesCache[name],
                            displayText: colNamesCache[name],
                            render     : renderList,
                            className  : "colName"
                        });
                    }
                }

                if (getOperationFromFuncStr(fullVal) !== "pull") {
                    // search xdfMap
                    for (var xdfFn in xdfMap) {
                        seachMapFunction(xdfFn, xdfMap[xdfFn]);
                    }

                    // search udfMap
                    for (var udfFn in udfMap) {
                        seachMapFunction(udfFn, udfMap[udfFn]);
                    }

                    // search aggMap
                    for (var agg in aggMap) {
                        if (agg.indexOf(curWord) !== -1 &&
                            !seen.hasOwnProperty(agg)) {
                            list.push({
                                text       : agg,
                                displayText: agg,
                                render     : renderList,
                                className  : "colName"
                            });
                        }
                    }
                }
            }
            // clearTimeout(timer1);
            // timer1 = setTimeout(function(){
            //     debugger;
            // }, 2000);
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
                to  : CodeMirror.Pos(0, end)
            });

            function seachMapFunction(fnName, mapFunc) {
                if (fnName.lastIndexOf(curWord, 0) === 0 &&
                    !seen.hasOwnProperty(fnName)) {
                    seen[fnName] = true;
                    list.push({
                        text       : mapFunc.fnName + "()",
                        displayText: mapFunc.fnName,
                        template   : mapFunc.template,
                        templateTwo: mapFunc.templateTwo,
                        argDescs   : mapFunc.modArgDescs,
                        hint       : autcompleteSelect,
                        render     : renderOpLi,
                        className  : "operator"
                    });
                }
            }
        });
    

        function autcompleteSelect(cm, data, completion) {
            var text = completion.templateTwo || completion.text;
            cm.replaceRange(text, data.from, data.to, "complete");
            // var firstStartIndex;
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

    function saveInput() {
        if (!$lastColInput || !$lastColInput.length) {
            return;
        }
        var fnBarVal = editor.getValue().trim();
        if (fnBarVal.indexOf("=") === 0) {
            fnBarVal = fnBarVal.substring(1);
        } else {
            return;
        }
        fnBarVal = fnBarVal.trim();
        var $colInput = $lastColInput;
        var $table = $colInput.closest('.dataTable');
        if ($table.length === 0) {
            // may trigger it if last table is removed
            return;
        }

        var tableId = xcHelper.parseTableId($table);
        var table = gTables[tableId];
        if (!table) {
            return;
        }
        var colNum = xcHelper.parseColNum($colInput);
        
        
        var tableCol = table.tableCols[colNum - 1];

        tableCol.userStr = "\"" + tableCol.getFrontColName() + "\"" + " = " +
                            fnBarVal;
    }

    function resetColNamesCache(tableId) {
        if (!gTables[tableId]) {
            return;
        }
        colNamesCache = {};
        var cols = gTables[tableId].tableCols;
        for (var i = 0; i < cols.length; i++) {
            var name = cols[i].backName.trim();
            if (name.length && !cols[i].isDATACol()) {
                colNamesCache[name.toLowerCase()] = name;
            }
        }
    }

    function setupSearchHelper() {
        searchHelper = new SearchBar($functionArea, {
            "removeSelected": function() {
                $('.xcTable:visible').find('.selectedCell')
                                     .removeClass('selectedCell');
            },
            "highlightSelected": function($match) {
                if ($match.is('th')) {
                    highlightColumn($match);
                    $('#mainFrame').find('.tblTitleSelected')
                                   .removeClass('tblTitleSelected');
                    $('.dagWrap.selected').removeClass('selected')
                                          .addClass('notSelected');
                    RowScroller.empty();
                } else if ($match.is('.tableTitle')) {
                    var tableId = $match.closest('.xcTableWrap').data('id');
                    focusTable(tableId, true);
                }
            },
            "scrollMatchIntoView": function($match) {
                var $mainFrame = $('#mainFrame');
                var mainFrameWidth = $mainFrame.width();
                var matchOffsetLeft = $match.offset().left;
                var scrollLeft = $mainFrame.scrollLeft();
                var matchWidth = $match.width();
                if (matchOffsetLeft > mainFrameWidth - matchWidth) {
                    $mainFrame.scrollLeft(matchOffsetLeft + scrollLeft -
                                        ((mainFrameWidth - matchWidth) / 2));
                } else if (matchOffsetLeft < 25) {
                    $mainFrame.scrollLeft(matchOffsetLeft + scrollLeft -
                                        ((mainFrameWidth - matchWidth) / 2));
                }
            },
            "codeMirror"          : editor,
            "$input"              : $fnBar,
            "ignore"              : "=",
            "arrowsPreventDefault": true
        });

        searchHelper.setup();
    }

    function functionBarEnter() {
        var deferred = jQuery.Deferred();

        var fnBarVal = editor.getValue().trim();
        var $colInput = $lastColInput;

        if (!$colInput || !$colInput.length) {
            deferred.reject();
            return deferred.promise();
        }

        if (fnBarVal.indexOf('=') === 0) {
            var $table   = $colInput.closest('.dataTable');
            var tableId  = xcHelper.parseTableId($table);
            var colNum   = xcHelper.parseColNum($colInput);
            var table    = gTables[tableId];
            var tableCol = table.tableCols[colNum - 1];
            var colName = tableCol.getBackColName();
            var frontColName  = tableCol.getFrontColName();
            var cursor = editor.getCursor();

            if (tableCol.isNewCol && frontColName === "") {
                // when it's new column and do not give name yet
                StatusBox.show(ErrTStr.NoEmpty, $colInput);
                deferred.reject();
                return deferred.promise();
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
                deferred.reject();
                return deferred.promise();
            }

            var operation = getOperationFromFuncStr(newFuncStr);
            if (mainOperators.indexOf(operation) < 0) {
                invalidOperationHandler(operation, fnBarVal);
                deferred.reject();
                return deferred.promise();
            } else if (operation !== "pull") {
                // check if correct number of parenthesis exists, should have
                // at least two
                if (newFuncStr.replace(/[^(]/g, "").length < 2) {
                    invalidNumParensHandler(operation);
                    deferred.reject();
                    return deferred.promise();
                }
            }
           
            // prevent doing a map on an existing column
            if (operation === "map" && !tableCol.isNewCol) {
                var alertTitle = FnBarTStr.NewColTitle;
                var alertMsg = FnBarTStr.NewColMsg;
                
                var confirmFunc = function() {
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
                var confirmFunc = function() {
                    var innerDeferred = jQuery.Deferred();
                    ColManager.execCol(operation, newFuncStr, tableId, colNum)
                    .then(function(ret) {
                        if (ret === "update") {
                            TblManager.updateHeaderAndListInfo(tableId);
                            KVStore.commit();
                        }
                        innerDeferred.resolve(ret);
                    })
                    .fail(innerDeferred.reject);

                    isAlertOpen = false;

                    return innerDeferred.promise();
                };

                // show alert if column in string does not match selected col
                if (!tableCol.isEmptyCol() &&
                    !checkForSelectedColName(fnBarVal, colName)) {
                    var alertTitle = AlertTStr.CONFIRMATION;
                    var alertMsg = xcHelper.replaceMsg(FnBarTStr.DiffColumn, {
                        colName: colName
                    });
                    showConfirmAlert($colInput, alertTitle, alertMsg, cursor,
                                     confirmFunc);
                    deferred.reject();
                } else {
                    // no errors, submit the function
                    confirmFunc()
                    .then(deferred.resolve)
                    .fail(deferred.reject);
                }
            }
        } else {
            deferred.reject();
        }
        return deferred.promise();
    }

    function invalidOperationHandler(operation, fnBarVal) {
        var text = "";
        var endText = false;

        if (operation.length) {
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
                "side"   : "bottom",
                "html"   : true
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
                "side"   : "bottom"
            });
        }, 0);
    }

    function showConfirmAlert($colInput, alertTitle, alertMsg, cursor, confirm,
                             btnOption) {
        var btns;
        if (btnOption) {
            btns = [btnOption];
        }
        isAlertOpen = true;
        Alert.show({
            "title"         : alertTitle,
            "msgTemplate"   : alertMsg,
            "keepFnBar"     : true,
            "focusOnConfirm": true,
            "buttons"       : btns,
            "onCancel"      : function() {
                if ($colInput.length) {
                    $colInput.trigger(fakeEvent.mousedown);
                    $colInput.trigger(fakeEvent.mouseup);

                    $fnBar.removeAttr("disabled").focus();
                    $fnBar.addClass("inFocus");
                    editor.focus();
                    editor.setCursor(cursor);
                }
                $fnBar.removeAttr("disabled");
                isAlertOpen = false;
            },
            "onConfirm": function() {
                confirm();
                isAlertOpen = false;
            }
        });
    }
                    

    // will return false if column names detected and colName is not found
    // among them. Otherwise, will return true
    function checkForSelectedColName(funcStr, colName) {
        var op = getOperationFromFuncStr(funcStr);
        if (op === "pull") {
            return true; // ignore check for pull
        }
        var func = {args: []};
        ColManager.parseFuncString(funcStr, func);
        var names = [];
        getNames(func.args);

        if (names.length && names.indexOf(colName) === -1) {
            return false;
        }

        return true;

        function getNames(args) {
            for (var i = 0; i < args.length; i++) {
                if (typeof args[i] === "string") {
                    if (args[i][0] !== "\"" &&
                        args[i][args.length - 1] !== "\"" &&
                        names.indexOf(args[i]) === -1) {
                        names.push(args[i]);
                    }
                } else if (typeof args[i] === "object") {
                    getNames(args[i].args);
                }
            }
        }
    }

    function getOperationFromFuncStr(funcStr) {
        var operation = funcStr.substring(funcStr.indexOf("=") + 1).trim();
        operation = operation.substr(0, operation.indexOf("(")).trim();
        return (operation);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        FnBar.__testOnly__ = {};
        FnBar.__testOnly__.functionBarEnter = functionBarEnter;
    }
    /* End Of Unit Test Only */

    return (FnBar);
}({}, jQuery));
