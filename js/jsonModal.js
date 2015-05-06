window.JSONModal = (function($, JSONModal) {
    var $jsonModal = $("#jsonModal");
    var $jsonWrap = $("#jsonWrap");
    var $modalBackground = $("#modalBackground");

    JSONModal.setup = function() {
         $('#jsonModal .closeJsonModal, #modalBackground').click(function() {
            if ($('#jsonModal').css('display') == 'block') {
                $('#modalBackground').hide();
                $('body').removeClass('hideScroll');
            }
            $('#jsonModal').hide();
        });

        $('#jsonModal .jsonDragArea').mousedown(function(event) {
            JSONModal.mouseDown(event);
        });
    }

    JSONModal.show = function ($jsonTd) {
        var tableTitle = $jsonTd.closest(".xcTableWrap")
                                .find(".xcTheadWrap .tableTitle input")
                                .data("title");

        $jsonModal.find(".jsonDragArea").text(tableTitle);
        xcHelper.removeSelectionRange();

        positionJsonModal($jsonTd);
        jsonModalEvent($jsonTd);

        $("body").addClass("hideScroll");
    }

    JSONModal.mouseDown = function (event) {
        gMouseStatus    = "movingJson"
        gDragObj.mouseX = event.pageX;
        gDragObj.mouseY = event.pageY;
        gDragObj.left   = parseInt($('#jsonModal').css('left'));
        gDragObj.top    = parseInt($('#jsonModal').css('top'));

        var cursorStyle = 
            '<style id="moveCursor" type="text/css">*' + 
            '{cursor:move !important; cursor: -webkit-grabbing !important;' + 
            'cursor: -moz-grabbing !important;}</style>';

        $(document.head).append(cursorStyle);
        disableTextSelection();
    }

    JSONModal.mouseMove = function (event) {
        var newX  = event.pageX;
        var newY  = event.pageY;
        var distX = newX - gDragObj.mouseX;
        var distY = newY - gDragObj.mouseY;

        $jsonModal.css("left" ,(gDragObj.left + distX) + "px");
        $jsonModal.css("top"  ,(gDragObj.top + distY) + "px");
    }

    JSONModal.mouseUp = function () {
        gMouseStatus = null;
        reenableTextSelection();

        $("#moveCursor").remove();
    }

    function jsonModalEvent($jsonTd) {
        $jsonWrap.on({
            "click": function() {
                var tableNum = parseInt($jsonTd.closest('table').attr('id')
                                        .substring(7));
                var name     = createJsonSelectionExpression($(this));
                var usrStr   = '"' + name.name + '" = pull(' + 
                                name.escapedName + ')';
                var $id      = $("#xcTable" + tableNum + " tr:first th")
                                    .filter(function() {
                                        var val = $(this).find("input").val();
                                        return val === "DATA";
                                });

                var colNum      = parseColNum($id);
                var table       = gTables[tableNum];
                var frontName   = table.frontTableName;
                var siblColName = table.tableCols[colNum - 1].name;

                addCol("col" + colNum, "xcTable" + tableNum, name.name, 
                      {"direction": "L", "select": true});

                // now the column is different as we add a new column
                var col         = table.tableCols[colNum-1];
                col.func.func   = "pull";
                col.func.args   = [name.escapedName];
                col.userStr     = usrStr;

                execCol(col, tableNum)
                .then(function() {
                    updateTableHeader(tableNum);
                    RightSideBar.updateTableInfo(table);

                    autosizeCol($('#xcTable' + tableNum + ' th.col' + (colNum)), 
                                {"includeHeader" : true, 
                                 "resizeFirstRow": true});

                    $('#xcTable' + tableNum + ' tr:first th.col' + (colNum + 1)
                        + ' .editableHead').focus();
                    // XXX call autosizeCol after focus if you want to make
                    // column wide enough to show the entire 
                    // function in the header
                    // autosizeCol($('#xcTable'+tableNum+' th.col'+(colNum+1)), 
                    //             {includeHeader: true, resizeFirstRow: true});

                    // add sql
                    SQL.add("Add Column", {
                        "operation"   : "addCol",
                        "tableName"   : frontName,
                        "newColName"  : name.name,
                        "siblColName" : siblColName,
                        "siblColIndex": colNum,
                        "direction"   : "L"
                    });

                    closeJSONModal();
                })
                .fail(function(error) {
                    console.error("execCol fails!", error);
                })
            }
        }, ".jKey, .jArray>.jString, .jArray>.jNum");
    }

    function closeJSONModal() {
        $jsonWrap.off();
        $jsonModal.hide();
        $modalBackground.fadeOut(100);
        $("body").removeClass("hideScroll");
    }

    function positionJsonModal($jsonTd) {
        var $window      = $(window);
        var winHeight    = $window.height();
        var winWidth     = $window.width();
        var jsonTdHeight = $jsonTd.outerHeight();
        var jsonTdWidth  = $jsonTd.outerWidth();
        var jsonTdPos    = $jsonTd[0].getBoundingClientRect();
        var text         = $jsonTd.find(".elementText").text();
        var jsonString;

        try {
            jsonString = jQuery.parseJSON(text);
        } catch (err) {
            console.error(error, text);
            closeJSONModal();
            return;
        }

        $("#jsonObj").html(prettifyJson(jsonString));
        $("#jsonWrap").height(500).width(500);

        $jsonModal.show();
        $modalBackground.fadeIn(100);

        var modalHeight = $jsonModal.outerHeight();
        var modalWidth  = $jsonModal.outerWidth();

        var modalTop;
        var modalLeft;

        if (jsonTdPos.top < winHeight/2) {
            modalTop = jsonTdPos.top; 
        } else {
            modalTop = jsonTdPos.top - modalHeight + jsonTdHeight;
        }

        if (modalTop < 5) {
            modalTop = 5;
        } else if (modalTop + modalHeight > winHeight) {
            modalTop = Math.max(winHeight - modalHeight - 5, 5);
        }

        if (jsonTdPos.left + (jsonTdWidth/2) > (winWidth/2)) {
            modalLeft = Math.min((jsonTdPos.left + (jsonTdWidth/2)) 
                        - modalWidth, winWidth - modalWidth - 20);
        } else {
            modalLeft = Math.max(jsonTdPos.left+(jsonTdWidth/2) , 20);
        }

        $jsonModal.css({
            "left": modalLeft, 
            "top" : modalTop
        });
    }

    function prettifyJson(obj, indent, options) {
        if (typeof obj != "object") {
            return (JSON.stringify(obj));
        }

        var result  = "";
        var indent  = indent || "";
        var options = options || {};

        options['inarray'] = options['inarray'] || 0;

        for (var key in obj) {
            var value = obj[key];

            switch (typeof value) {
                case ('string'):
                    value = '"<span class="jString">' + value + '</span>"';

                    if (options.inarray) {
                        value = 
                            '<span class="jArray jInfo" data-key="'+key+'">' + 
                                value +
                            '</span>, ';
                    }

                    break;
                case ('number'):
                    value = '<span class="jNum">' + value + '</span>';

                    if (options.inarray) {
                        value = 
                            '<span class="jArray jInfo" data-key="'+key+'">' +
                                value +
                            '</span>,';
                    }

                    break;
                case ('boolean'):
                    value = '<span class="jBool">' + value + '</span>';

                    if (options.inarray) {
                        value += ',';
                    }

                    break;
                case ('object'):
                    if (value.constructor == Array) {
                        ++options.inarray;
                        value = 
                            '[<span class="jArray jInfo" data-key="'+key+'">' +
                                prettifyJson(value, indent, options) +
                            '</span>],';
                    } else {
                        var object = prettifyJson(value,
                                        indent + '&nbsp;&nbsp;&nbsp;&nbsp;');

                        value = '{\n' + object + indent + '}';

                        if (options.inarray) {
                            value = 
                            '<span class="jArray jInfo" data-key="'+key+'">' + 
                                value + 
                            '</span>,';
                        }
                    }

                    break;
                default:
                    value = '<span class="jUndf">' + value + '</span>';
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
                        '"<span class="jKey">'+key+'</span>": '+value+','+ 
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

        // XXX .parents() is different with .closest()
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

            name        = key + name;
            escapedName = escapedKey + escapedName;
        });

        if (name.charAt(0) == '.') {
            name        = name.substr(1);
            escapedName = escapedName.substr(1);
        }

        return ({"name"       : name, 
                 "escapedName": escapedName});
    }

    return (JSONModal);
}(jQuery, {}));
