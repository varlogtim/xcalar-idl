window.JSONModal = (function($, JSONModal) {
    var $jsonModal = $("#jsonModal");
    var $jsonWrap = $("#jsonWrap");
    var $modalBackground = $("#modalBackground");
    var $searchInput = $('#jsonSearch').find('input');
    var $jsonText = $('.prettyJson');
    var $counter = $('#jsonSearch').find('.counter');
    var $matches;
    var numMatches = 0;
    var matchIndex;
    var $activeJsonTd;
    var jsonIsArray;

    var minHeight = 300;
    var minWidth  = 300;
    var modalHelper = new xcHelper.Modal($jsonModal, {
        "minHeight" : minHeight,
        "minWidth"  : minWidth,
        "noTabFocus": true
    });

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
            minHeight  : minHeight,
            minWidth   : minWidth,
            containment: "document"
        });

        $searchInput.on('input', function() {
            searchText($(this));
        });
        $jsonModal.find('.closeBox').click(clearSearch);
        $jsonModal.find('.arrows').mousedown(function(event) {
            event.preventDefault();
            event.stopPropagation();
        });
        $jsonModal.find('.upArrow').click(cycleMatchUp);
        $jsonModal.find('.downArrow').click(cycleMatchDown);
        $jsonModal.find('.searchIcon').click(toggleSearch);

        $jsonWrap.on({
            "click": function() {
                var tableId  = $activeJsonTd.closest('table').data('id');
                var isDataTd = $activeJsonTd.hasClass('jsonElement');
                var colNum   = xcHelper.parseColNum($activeJsonTd);
                var nameInfo = createJsonSelectionExpression($(this));

                var pullColOptions = {
                    "isDataTd" : isDataTd,
                    "isArray"  : jsonIsArray,
                    "noAnimate": true
                };
                // console.log(colNum, tableId, nameInfo, pullColOptions)
                ColManager.pullCol(colNum, tableId, nameInfo, pullColOptions)
                .always(function() {
                    closeJSONModal();
                });
            }
        }, ".jKey, .jArray>.jString, .jArray>.jNum");
    };

    JSONModal.show = function ($jsonTd, isArray) {
        if ($.trim($jsonTd.text()).length === 0) {
            return;
        }
        $activeJsonTd = $jsonTd;
        jsonIsArray = isArray;
        $(".tooltip").hide();
        var tableTitle = $jsonTd.closest(".xcTableWrap")
                                .find(".xcTheadWrap .tableTitle .text")
                                .data("title");
        $(".xcTable").find(".highlightBox").remove();

        $jsonModal.find(".jsonDragArea").text(tableTitle);

        $searchInput.val("");
        modalHelper.setup();
        fillJsonModal($jsonTd, isArray); // shows json modal
        jsonModalEvent($jsonTd, isArray);
        $("body").addClass("hideScroll");
    };

    function jsonModalEvent($jsonTd, isArray) {
        $(document).on("keydown.jsonModal", function(event) {
            cycleMatches(event);

            if (event.which === keyCode.Escape) {
                closeJSONModal();
                return false;
            }
        });
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
        
        text = escapeRegExp(text);
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

    function escapeRegExp(str) {
        return (str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"));
    }

    function clearSearch(event, noFocus) {
        $jsonText.find('.highlightedText').contents().unwrap();
        $searchInput.val("");
        if (!noFocus) {
            $searchInput.focus();
        }
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
        if (event.which === keyCode.Up || event.which === keyCode.Down ||
            event.which === keyCode.Enter) {
            if (event.preventDefault) {
                event.preventDefault();
            }
            if (event.which === keyCode.Up) {
                matchIndex--;
                if (matchIndex < 0) {
                    matchIndex = numMatches - 1;
                }
                var val = $searchInput.val();
                
            } else if (event.which === keyCode.Down ||
                       event.which === keyCode.Enter) {
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

    function cycleMatchDown(event) {
        var evt = {which: keyCode.Down};
        cycleMatches(evt);
    }

    function cycleMatchUp(event) {
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
        $(document).off(".jsonModal");
        $matches = [];
        $('.modalHighlighted').removeClass('modalHighlighted');
        clearSearch(null, true);
        $('#jsonSearch').addClass('closed');

        var fadeOutTime = gMinModeOn ? 0 : 300;

        $jsonModal.hide();
        $modalBackground.fadeOut(fadeOutTime, function() {
            Tips.refresh();
            $(".prettyJson").empty();
        });

        modalHelper.clear();
        $('#sideBarModal').hide();
        $('#rightSideBar').removeClass('modalOpen');
        $('.xcTable').removeClass('tableJsonModal');
        $("body").removeClass("hideScroll");
        $('.darkenedCell').remove();
    }

    function fillJsonModal($jsonTd, isArray) {
        var text = $jsonTd.find("div").eq(0).text();
        if (isArray) {
            text = text.split(', ');
            text = JSON.stringify(text);
        }
        var jsonString;

        try {
            jsonString = jQuery.parseJSON(text);
        } catch (error) {
            console.error(error, text);
            closeJSONModal();
            return;
        }

        $jsonModal.height(500).width(500);
        var darkenedCell = '<div class="darkenedCell"></div>';

        if (gMinModeOn) {
            $('#sideBarModal').show();
            $('#rightSideBar').addClass('modalOpen');
            $jsonTd.closest('.xcTable').find('.idSpan').append(darkenedCell);
            $('.darkenedCell').show();
            $modalBackground.show();
            $jsonModal.show();
            $jsonTd.addClass('modalHighlighted');
        } else {
            $('#sideBarModal').fadeIn(300);
            $('#rightSideBar').addClass('modalOpen');
            $jsonTd.closest('.xcTable').find('.idSpan').append(darkenedCell);

            $modalBackground.fadeIn(300);
            $('.darkenedCell').show();
            $jsonModal.fadeIn(200);
            $jsonTd.addClass('modalHighlighted');
        }

        var prettyJson = prettifyJson(jsonString, null, {inarray: isArray});
        prettyJson = '<div id="jsonObj" class="jObject"><span class="jArray jInfo">' +
                         prettyJson +
                         '</span></div>';
        if (isArray) {
            prettyJson = '[' + prettyJson + ']';
        } else {
            prettyJson = '{' + prettyJson + '}';
        }
        $(".prettyJson").html(prettyJson);
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
                    value = value.replace(/\</g, "&lt;")
                                 .replace(/\>/g, "&gt;");
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
