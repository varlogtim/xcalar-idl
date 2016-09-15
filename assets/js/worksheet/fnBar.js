window.FnBar = (function(FnBar, $) {
    var $functionArea; // $("#functionArea");
    var $fnBar; // $('#functionArea .CodeMirror')

    var $lastColInput = null;
    var searchHelper;
    var editor;
    var mainOperators = ['pull', 'map', 'filter'];
    var xdfMap = {};
    var udfMap = {};
    var colNamesCache = [];
    var lastFocusedCol;

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
                functionBarEnter();
            } else {
                var savedStr = editor.getValue();
                var savedColInput = $lastColInput;
                var funcStr = "\"" + val.slice(0, mismatch.index) +
                                '<span class="mismatchBracket">' +
                                mismatch.char + "</span>" +
                                val.slice(mismatch.index + 1) + "\"";

                Alert.show({
                    "title"      : AlertTStr.BracketsMis,
                    "msgTemplate": ErrTStr.BracketsMis + "<br/>" + funcStr,
                    "isAlert"    : true,
                    "onCancel"   : function() {
                        if (savedColInput) {
                            savedColInput.trigger({
                                type : "mousedown",
                                which: 1
                            });
                            $fnBar.removeAttr("disabled");
                            editor.setValue(savedStr);
                            $fnBar.focus();
                        } else {
                            $fnBar.removeAttr("disabled");
                        }
                    }
                });

                editor.setValue(savedStr);
                $fnBar.prop("disabled", "true");
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
                xcHelper.refreshTooltip($('#funcBarMenuArea'), 1000);
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
                $functionArea.removeClass('searching');
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
                colNamesCache = [];
                
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
            for (var i = 0; i < opMap.length; i++) {
                udfMap[opMap[i].fnName.toLowerCase()] = opMap[i];
                opMap[i].template = createFuncTemplate(opMap[i]);
                var secondTemplate = createSecondaryTemplate(opMap[i]);
                opMap[i].templateTwo = secondTemplate.template;
                opMap[i].modArgDescs = secondTemplate.argDescs;
            }

        } else {
            xdfMap = {};
            udfMap = {};
            var op;
            for (var i = 0; i < opMap.length; i++) {
                op = opMap[i]
                if (op.category === FunctionCategoryT.FunctionCategoryUdf) {
                    udfMap[op.fnName.toLowerCase()] = op;
                } else if (op.category !== 
                            FunctionCategoryT.FunctionCategoryAggregate) {
                    xdfMap[op.fnName.toLowerCase()] = op;
                }
               
                op.template = createFuncTemplate(op);
                var secondTemplate = createSecondaryTemplate(op);
                op.templateTwo = secondTemplate.template;
                op.modArgDescs = secondTemplate.argDescs;
            }
        }

        function createFuncTemplate(op) {
            var fnTemplate = op.fnName + '(';
            var len = op.argDescs.length;
            var argDesc;
            for (var j = 0; j < len; j++) {
                argDesc = op.argDescs[j].argDesc;
                fnTemplate += '<span class="argDesc">' +  argDesc + '</span>';
                if (j + 1 < len) {
                    fnTemplate += ",";
                }
            }
            fnTemplate += ')';
            return fnTemplate;
        }
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

            $functionArea.removeClass('searching');
            $functionArea.find('.position').hide();
            $functionArea.find('.counter').hide();
            $functionArea.find('.arrows').hide();
        } else {
            editor.getInputField().blur(); // hack to reset blur
            var userStr = progCol.userStr;
            userStr = userStr.substring(userStr.indexOf('='));
            editor.setValue(userStr);
            $fnBar.addClass('active').removeClass('disabled');
            $fnBar.parent().removeClass('searching');
            if (newFocus) {
                resetColNamesCache(tableId);
            }
        }
    };

    FnBar.clear = function(noSave) {
        lastFocusedCol = undefined;
        if (!noSave) {
            saveInput();
        }
        $lastColInput = null;
        editor.setValue("");
        $fnBar.removeClass("active inFocus disabled");
        colNamesCache = [];
    };

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
            CodeMirror.showHint(cm, CodeMirror.hint.fnBarHint,  {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true
            });
        };
        var timer1;
        // set up autcomplete hint function that filters matches
        CodeMirror.registerHelper("hint", "fnBarHint", function(editor) {
            var fullVal = editor.getValue();
            var onlyMainOperators = false;
            if (fullVal.indexOf("(") === -1) {
                onlyMainOperators = true;
            }
            var word = /[\w$:]+/;
            var cur = editor.getCursor();
            var fnBarText = editor.getLine(0);
            var list = []
            var seen = {};
            var end = cur.ch;
            var start = end;
            while (end && word.test(fnBarText.charAt(end))) {
                ++end;
            }
            while (start && word.test(fnBarText.charAt(start - 1))) {
                --start
            };
            var curWord = start != end && fnBarText.slice(start, end);
            if (!curWord) {
                if (onlyMainOperators) {
                    for (var i = 0; i < mainOperators.length; i++) {
                        seen[mainOperators[i]] = true;
                        list.push({text: mainOperators[i] + "()", 
                                  displayText: mainOperators[i],
                                  hint: autcompleteSelect,
                                  render: renderMainOpLi,
                                  className: "operator mainOperator"
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
                for (var i = 0; i < mainOperators.length; i++) {
                    if (!seen.hasOwnProperty(mainOperators[i]) &&
                        mainOperators[i].indexOf(curWord) !== -1) {
                        seen[mainOperators[i]] = true;
                        list.push({text: mainOperators[i] + "()", 
                                displayText: mainOperators[i],
                                hint: autcompleteSelect,
                                render: renderMainOpLi,
                                className: "operator mainOperator"
                              });
                        break;
                    }
                }
            } else {
                // search columnNames
                for (var i = 0; i < colNamesCache.length; i++) {
                    if (!seen.hasOwnProperty(colNamesCache[i]) &&
                        colNamesCache[i].lastIndexOf(curWord, 0) === 0) {
                        seen[colNamesCache[i]] = true;
                        list.push({text: colNamesCache[i],
                                  displayText: colNamesCache[i],
                                  render: renderList,
                                  className: "colName"
                              });
                    }
                }

                if (getOperationFromFuncStr(fullVal) !== "pull") {
                    // search xdfMap
                    curWord = curWord.toLowerCase();
                    for (var fnName in xdfMap) {
                        if (fnName.lastIndexOf(curWord, 0) === 0 &&
                            !seen.hasOwnProperty(fnName)) {
                            seen[fnName] = true;
                            list.push({text: xdfMap[fnName].fnName + "()", 
                                        displayText: fnName,
                                        template: xdfMap[fnName].template,
                                        templateTwo: xdfMap[fnName].templateTwo,
                                        argDescs: xdfMap[fnName].modArgDescs,
                                        hint: autcompleteSelect,
                                        render: renderOpLi,
                                        className: "operator"});
                        }
                    }

                    // search udfMap
                    for (var fnName in udfMap) {
                        if (fnName.lastIndexOf(curWord, 0) === 0 &&
                            !seen.hasOwnProperty(fnName)) {
                            seen[fnName] = true;
                            list.push({text: udfMap[fnName].fnName + "()", 
                                        displayText: fnName,
                                        template: udfMap[fnName].template,
                                        templateTwo: udfMap[fnName].templateTwo,
                                        argDescs: udfMap[fnName].modArgDescs,
                                        hint: autcompleteSelect,
                                        render: renderOpLi,
                                        className: "operator"});
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
            return ({list: list, 
                    from: CodeMirror.Pos(0, start), 
                    to: CodeMirror.Pos(0, end)});
        });
    

        function autcompleteSelect(cm, data, completion) {
            var text = completion.templateTwo || completion.text;
            cm.replaceRange(text, data.from, data.to, "complete");
            var firstStartIndex;
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
                        firstStartIndex = data.from.ch + start;
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
            el.innerHTML = '<span class="displayText">' + cur.displayText +
                          '</span><span class="template">' + cur.text + 
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
        var $table   = $colInput.closest('.dataTable');
        var tableId  = xcHelper.parseTableId($table);
        var colNum   = xcHelper.parseColNum($colInput);
        var table    = gTables[tableId];
        var tableCol = table.tableCols[colNum - 1];

        tableCol.userStr = "\"" + tableCol.name + "\"" + " = " +
                            fnBarVal;
    }

    function resetColNamesCache(tableId) {
        colNamesCache = [];
        var cols = gTables[tableId].tableCols;
        var name;
        for (var i = 0; i < cols.length; i++) {
            name = cols[i].backName.trim();
            if (name.length && name !== "DATA") {
                colNamesCache.push(name);
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
        var fnBarVal = editor.getValue();
        var fnBarValTrim = fnBarVal.trim();
        var $colInput = $lastColInput;

        if (!$colInput || !$colInput.length) {
            return;
        }

        if (fnBarValTrim.indexOf('=') === 0) {
            var $table   = $colInput.closest('.dataTable');
            var tableId  = xcHelper.parseTableId($table);
            var colNum   = xcHelper.parseColNum($colInput);
            var table    = gTables[tableId];
            var tableCol = table.tableCols[colNum - 1];
            var colName  = tableCol.name;

            if (tableCol.isNewCol && colName === "") {
                // when it's new column and do not give name yet
                StatusBox.show(ErrTStr.NoEmpty, $colInput);
                return;
            }

            $fnBar.removeClass("inFocus");

            var newFuncStr = '"' + colName + '" ' + fnBarValTrim;
            var oldUsrStr  = tableCol.userStr;

            $colInput.blur();
            // when usrStr not change
            if (newFuncStr === oldUsrStr) {
                return;
            }

            $colInput.closest('th').removeClass('unusedCell');
            $table.find('td:nth-child(' + colNum + ')')
                  .removeClass('unusedCell');

            var operation = getOperationFromFuncStr(newFuncStr);
            if (mainOperators.indexOf(operation) < 0) {
                var text = "";
                var endText = false;

                if (operation.length) {
                    text = "Invalid Operator: <b>" + operation + "</b>.<br/>";
                } else {
                    if (fnBarValTrim.indexOf("(") === -1) {
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

                return;
            }


            ColManager.execCol(operation, newFuncStr, tableId, colNum)
            .then(function(ret) {
                if (ret === "update") {
                    updateTableHeader(tableId);
                    TableList.updateTableInfo(tableId);
                    KVStore.commit();
                }
            });
        }
    }

    function getOperationFromFuncStr(funcStr) {
        var operation = funcStr.substring(funcStr.indexOf("=") + 1).trim();
        operation = operation.substr(0, operation.indexOf("(")).trim();
        return (operation);
    }

    return (FnBar);
}({}, jQuery));
