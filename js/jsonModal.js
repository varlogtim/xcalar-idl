window.JSONModal = (function($, JSONModal) {
    var $jsonModal = $("#jsonModal");
    var $jsonWrap = $("#jsonWrap");
    var $modalBackground = $("#modalBackground");
    var $searchInput = $('#jsonSearch').find('input');
    var $jsonText = $('#jsonObj');
    var $counter = $('#jsonSearch').find('.counter');
    var $matches;
    var numMatches = 0;
    var matchIndex;

    JSONModal.setup = function() {
        $('#jsonModal .closeJsonModal, #modalBackground').click(function() {
            if ($('#jsonModal').css('display') === 'block') {
                closeJSONModal();
            }
        });

        $jsonModal.draggable({
            handle: '.jsonDragArea',
            cursor: '-webkit-grabbing'
        });

        $jsonModal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : 300,
            minWidth   : 300,
            containment: "document"
        });

        $searchInput.on('input', function() {
            searchText($(this));
        });
        $jsonModal.find('.closeBox').click(clearSearch);
        $jsonModal.find('.upArrow').click(cycleMatchUp);
        $jsonModal.find('.downArrow').click(cycleMatchDown);
        $jsonModal.find('.searchIcon').click(toggleSearch);
    };

    JSONModal.show = function ($jsonTd) {
        if ($.trim($jsonTd.text()).length === 0) {
            return;
        }
        var tableTitle = $jsonTd.closest(".xcTableWrap")
                                .find(".xcTheadWrap .tableTitle .text")
                                .data("title");

        $jsonModal.find(".jsonDragArea").text(tableTitle);
        xcHelper.removeSelectionRange();

        $searchInput.val("");
        fillJsonModal($jsonTd);
        centerPositionElement($jsonModal);
        jsonModalEvent($jsonTd);
        $jsonTd.addClass('modalHighlighted');
        $("body").addClass("hideScroll");
    };

    // XX JSONModal.mouseDown and MouseMove are tentatively replaced by
    // jquery's draggable function

    JSONModal.mouseDown = function (event) {
        gMouseStatus = "movingJson";
        gDragObj.mouseX = event.pageX;
        gDragObj.mouseY = event.pageY;
        gDragObj.left = parseInt($('#jsonModal').css('left'));
        gDragObj.top = parseInt($('#jsonModal').css('top'));

        var cursorStyle =
            '<style id="moveCursor" type="text/css">*' +
            '{cursor:move !important; cursor: -webkit-grabbing !important;' +
            'cursor: -moz-grabbing !important;}</style>';

        $(document.head).append(cursorStyle);
        disableTextSelection();
    };

    JSONModal.mouseMove = function (event) {
        var newX  = event.pageX;
        var newY  = event.pageY;
        var distX = newX - gDragObj.mouseX;
        var distY = newY - gDragObj.mouseY;

        $jsonModal.css("left", (gDragObj.left + distX) + "px");
        $jsonModal.css("top", (gDragObj.top + distY) + "px");

    };

    JSONModal.mouseUp = function () {
        gMouseStatus = null;
        reenableTextSelection();

        $("#moveCursor").remove();
    };

    function jsonModalEvent($jsonTd) {
        $jsonWrap.on({
            "click": function() {
                var $table  = $jsonTd.closest('table');
                var tableId = $table.data('id');

                var name    = createJsonSelectionExpression($(this));
                var usrStr  = '"' + name.name + '" = pull(' +
                                name.escapedName + ')';

                var $id = $table.find("tr:first th").filter(function() {
                    var val = $(this).find("input").val();
                    return (val === "DATA");
                });

                var colNum      = xcHelper.parseColNum($id);
                var table       = xcHelper.getTableFromId(tableId);
                var tableName   = table.tableName;
                var siblColName = table.tableCols[colNum - 1].name;
                var newName     = xcHelper.getUniqColName(name.name,
                                                            table.tableCols);

                ColManager.addCol(colNum, tableId, newName, {
                    "direction": "L",
                    "select"   : true
                });

                // now the column is different as we add a new column
                var col = table.tableCols[colNum - 1];
                col.func.func = "pull";
                col.func.args = [name.escapedName];
                col.userStr = usrStr;

                ColManager.execCol(col, tableId)
                .then(function() {
                    updateTableHeader(tableId);
                    RightSideBar.updateTableInfo(tableId);

                    autosizeCol($table.find("th.col" + colNum), {
                        "includeHeader" : true,
                        "resizeFirstRow": true
                    });

                    $table.find("tr:first th.col" + (colNum + 1) +
                                " .editableHead").focus();

                    // add sql
                    SQL.add("Add Column", {
                        "operation"   : "addCol",
                        "tableName"   : tableName,
                        "newColName"  : name.name,
                        "siblColName" : siblColName,
                        "siblColIndex": colNum,
                        "direction"   : "L"
                    });

                    closeJSONModal();
                })
                .fail(function(error) {
                    console.error("execCol fails!", error);
                });
            }
        }, ".jKey, .jArray>.jString, .jArray>.jNum");

        $('body').on('keydown', cycleMatches);
    }

    function searchText($input) {
        $jsonText.find('.highlightedText').contents().unwrap();
        var text = $input.val().toLowerCase();
        if (text === "") {
            $counter.find('.position, .total').html('');
            numMatches = 0;
            $searchInput.css("padding-right", 25);
            return;
        }
        $targets = $jsonText.find('.text').filter(function() {
            return ($(this).text().toLowerCase().indexOf(text) !== -1);
        });
        var regex = new RegExp(text, "gi");

        $targets.each(function() {
            var foundText = $(this).text();
            foundText = foundText.replace(regex, function (match) {
                return ('<span class="highlightedText">' + match +
                        '</span>');
            });
            $(this).html(foundText);
        });
        $matches = $jsonText.find('.highlightedText');
        numMatches = $matches.length;
        matchIndex = 0;
        var position = Math.min(1, numMatches);
        $counter.find('.position').text(position);
        $counter.find('.total').text('of ' + numMatches);
        $searchInput.css("padding-right", $counter.width() + 25);

        $matches.eq(0).addClass('selected');
        if (numMatches !== 0) {
            scrollMatchIntoView($matches.eq(0));
        }
    }

    function clearSearch() {
        $jsonText.find('.highlightedText').contents().unwrap();
        $searchInput.val("");
        $searchInput.focus();
        $counter.find('.position, .total').html('');
        numMatches = 0;
        $searchInput.css("padding-right", 25);
    }

    function cycleMatches(event) {
        var $lastMousedownTarget = gMouseEvents.getLastMouseDownTarget();
        if (numMatches === 0 ||
            $lastMousedownTarget.closest('#jsonSearch').length === 0) {
            return;
        }
        if (event.which === keyCode.Up || event.which === keyCode.Down) {
            if (event.which === keyCode.Up) {
                matchIndex--;
                if (matchIndex < 0) {
                    matchIndex = numMatches - 1;
                }
                var val = $searchInput.val();
                // doesn't work unless we use settimeout, dunno why
                setTimeout(function() {
                    $searchInput[0].selectionStart =
                    $searchInput[0].selectionEnd = val.length;
                }, 0);
                
            } else if (event.which === keyCode.Down) {
                matchIndex++;
                if (matchIndex >= numMatches) {
                    matchIndex = 0;
                }
            }
            $jsonText.find('.selected').removeClass('selected');
            var $selectedMatch = $matches.eq(matchIndex);
            $selectedMatch.addClass('selected');
            $counter.find('.position').text(matchIndex + 1);
            scrollMatchIntoView($selectedMatch);
        }
    }

    function cycleMatchDown() {
        var evt = {which: keyCode.Down};
        cycleMatches(evt);
    }

    function cycleMatchUp() {
        var evt = {which: keyCode.Up};
        cycleMatches(evt);
    }

    function scrollMatchIntoView($match) {
        var $modalWindow = $jsonWrap.find('.prettyJson');
        var modalHeight = $modalWindow.height();
        var scrollTop = $modalWindow.scrollTop();
        var matchOffsetTop = $match.position().top;
        if (matchOffsetTop > (scrollTop + modalHeight - 35)) {
            // $modalWindow.scrollTop(matchOffsetTop - (modalHeight / 2));
            $modalWindow.scrollTop(matchOffsetTop + 40 - (modalHeight / 2));
        } else if (matchOffsetTop < (scrollTop - 25)) {
            $modalWindow.scrollTop(matchOffsetTop + 30 - (modalHeight / 2));
        }
    }

    function toggleSearch() {
        var $searchBar = $('#jsonSearch');
        if ($searchBar.hasClass('closed')) {
            $searchBar.removeClass('closed');
            setTimeout(function() {
                $searchBar.find('input').focus();
            }, 310);
            
        } else {
            $searchBar.addClass('closed');
        }
    }

    function closeJSONModal() {
        $jsonWrap.off();
        $jsonModal.hide();
        $modalBackground.fadeOut(200, function() {
            Tips.refresh();
        });
        $('#sideBarModal').fadeOut(200, function(){
            $('#rightSideBar').removeClass('modalOpen');
        });
        $('.modalHighlighted').removeClass('modalHighlighted');
        $("body").removeClass("hideScroll");
        clearSearch();
        $('body').off('keydown', cycleMatches);
        $matches = [];
    }

    function fillJsonModal($jsonTd) {
        var text = $jsonTd.find(".elementText").text();
        var jsonString;

        try {
            jsonString = jQuery.parseJSON(text);
        } catch (error) {
            console.error(error, text);
            closeJSONModal();
            return;
        }

        $jsonModal.height(500).width(500);
        $jsonModal.show();
        $modalBackground.fadeIn(100);
        $('#sideBarModal').fadeIn(100);
        $('#rightSideBar').addClass('modalOpen');

        $("#jsonObj").html(prettifyJson(jsonString));
    }

    function prettifyJson(obj, indent, options) {
        if (typeof obj != "object") {
            return (JSON.stringify(obj));
        }

        var result = "";
        indent = indent || "";
        options = options || {};

        options.inarray = options.inarray || 0;

        for (var key in obj) {
            var value = obj[key];

            switch (typeof value) {
                case ('string'):
                    value = '"<span class="jString text">' + value + '</span>"';

                    if (options.inarray) {
                        value =
                            '<span class="jArray jInfo" ' +
                                'data-key="' + key + '">' +
                                value +
                            '</span>, ';
                    }

                    break;
                case ('number'):
                    value = '<span class="jNum text">' + value + '</span>';

                    if (options.inarray) {
                        value =
                            '<span class="jArray jInfo" ' +
                                'data-key="' + key + '">' +
                                value +
                            '</span>,';
                    }

                    break;
                case ('boolean'):
                    value = '<span class="jBool text">' + value + '</span>';

                    if (options.inarray) {
                        value += ',';
                    }

                    break;
                case ('object'):
                    if (value == null) {
                        value = '<span class="jNull text">' + value + '</span>';
                        if (options.inarray) {
                            value += ',';
                        }
                    } else if (value.constructor === Array) {
                        ++options.inarray;
                        value =
                            '[<span class="jArray jInfo" ' +
                                'data-key="' + key + '">' +
                                prettifyJson(value, indent, options) +
                            '</span>],';
                    } else {
                        var object = prettifyJson(value,
                                        indent + '&nbsp;&nbsp;&nbsp;&nbsp;');

                        value = '{\n' + object + indent + '}';

                        if (options.inarray) {
                            value =
                            '<span class="jArray jInfo" ' +
                                'data-key="' + key + '">' +
                                value +
                            '</span>,';
                        }
                    }

                    break;
                default:
                    value = '<span class="jUndf text">' + value + '</span>';
                    if (options.inarray) {
                        value += ',';
                    }

                    break;
            }

            if (options.inarray) {
                result += value;
            } else {
                value = value.replace(/,$/, "");
                result +=
                    '<div class="jsonBlock jInfo" data-key="' + key + '">' +
                        indent +
                        '"<span class="jKey text">' + key + '</span>": ' +
                        value + ',' +
                    '</div>';
            }
        }

        --options.inarray;

        return (result.replace(/\,<\/div>$/, "</div>").replace(/\, $/, "")
                                                      .replace(/\,$/, ""));
        // .replace used to remove comma if last value in object
    }

    function createJsonSelectionExpression($el) {
        var name        = "";
        var escapedName = "";

        // .parents() is different with .closest()
        $el.parents(".jInfo").each(function(){
            var $jInfo     = $(this);
            var key        = "";
            var escapedKey = "";

            if ($jInfo.parent().hasClass('jArray') &&
                !$jInfo.hasClass('jsonBlock')) {
                key = '[' + $jInfo.data('key') + ']';
            } else if (!$jInfo.hasClass('jArray')) {
                key = '.' + $jInfo.data('key');
            }

            escapedKey = key;

            if (key.substr(1).indexOf('.') > -1) {
                escapedKey = key.replace(/\./g, "\\\.").substr(1);
            }

            name = key + name;
            escapedName = escapedKey + escapedName;
        });

        if (name.charAt(0) === '.') {
            name = name.substr(1);
            escapedName = escapedName.substr(1);
        }

        return ({"name"       : name,
                 "escapedName": escapedName});
    }

    return (JSONModal);
}(jQuery, {}));
