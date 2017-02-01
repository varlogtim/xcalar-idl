window.Tips = (function($, Tips) {
    var $targets   = [];
    var defaultOpt = {
        "trigger": "manual",
        "placement": "top",
        "container": "body",
        "template": '<div class="tooltip tutorial" role="tooltip">' +
                        '<div class="tooltip-arrow"></div>' +
                        '<div class="tooltip-inner"></div>' +
                     '</div>'
    };

    // template that have z-index 10
    var templateZ10 =
        '<div class="tooltip tutorial z-10" role="tooltip">' +
            '<div class="tooltip-arrow"></div>' +
                '<div class="tooltip-inner"></div>' +
        '</div>';

    // template that have z-index 0
    var templateZ0 =
        '<div class="tooltip tutorial z-0" role="tooltip">' +
            '<div class="tooltip-arrow"></div>' +
                '<div class="tooltip-inner"></div>' +
        '</div>';

    var timer;
    var isOn = false;

    // disply tips
    Tips.display = function() {
        lastPos = 0;
        isOn = true;
        showTips();
        addTipsEvent();
    };

    // destroy tips
    Tips.destroy = function() {
        isOn = false;
        hideTips();
        removeTipsEvent();
    };

    // refresh tips, some place should manually call it for refreshing
    // e.g some event.stopPropagation stop the trigger in addTipsEvent()
    Tips.refresh = function() {
        if (isOn) {
            // prevent it to be called in case user keep clicking or scrolling
            clearTimeout(timer);
            timer = setTimeout(function() {
                hideTips();
                showTips();
            }, 100);
        }
    };

    // main function to show tips
    function showTips() {
        $(".tooltip").hide();

        if ($("#modalBackground").is(":visible")) {
            // when any modal is on
            addJSONModalTips();
        } else {
            addTopMenuBarTips();
            addWorksheetListTips();
            addTableListTips();
            addDatastoreTips();

            if ($("#dagPanel").hasClass("hidden") ||
                $("#dagPanel").hasClass("midway"))
            {
                // when dag panel is not on
                addWorksheetTips();
            } else {
                // currently dag has no tips
            }
        }

        $targets.forEach(function($target) {
            if ($target.is(":visible")) {
                $target.tooltip("show");
            }
        });
    }

    // main function to hide tips
    function hideTips() {
        $targets.forEach(function($target) {
            $target.tooltip("destroy");
        });

        $targets = [];

        $(".tooltip.tutorial").remove();
    }

    function addTipsEvent() {
        $(document).on("click", Tips.refresh);
        $("#mainFrame").on("scroll", Tips.refresh);
        $(window).on("resize", Tips.refresh);
    }

    function removeTipsEvent() {
        $(document).off("click", Tips.refresh);
        $("#mainFrame").off("scroll", Tips.refresh);
        $(window).off("resize", Tips.refresh);
    }

    /* Section of adding tips */
    function addTopMenuBarTips() {
        // xcalar horizontal scrollbar
        // only show when there is row scroller in the area
        var $rowScroller = $("#rowScrollerArea .rowScroller:visible");
        if ($rowScroller.length > 0) {
            setTooltip($rowScroller, {
                "title": TipsTStr.Scrollbar,
                "container": "#workspaceBar",
                "placement": "left"
            });
        }

        // // function bar
        // setTooltip($("#fnBar"), {
        //     "title": "Programmatically manipulating the table",
        //     "container": "#workspaceBar",
        // });
    }

    function addWorksheetListTips() {
        // tips for add worksheet tab
        var $wsIcon = $(".worksheetTab.active .wsMenu");
        setTooltip($wsIcon, {
            "title": TipsTStr.WSOpts,
            "container": "#worksheetTabs"
        });
    }

    function addWorksheetTips() {
        var $tables = $(".xcTableWrap");

        for (var i = 0; i < $tables.length; i++) {
            var $table = $tables.eq(i);

            // only show tips on focused table
            if (!$table.filter(':visible').find(".tableTitle")
                                          .hasClass("tblTitleSelected")) {
                continue;
            }
            var tableId = getIdStr($table);

            // tips on table header
            var $header = getMiddleElement($table.find('th:not(".dataCol")'))
                                            .find(".header");
            // padding:"1px" is a trick to put this tip in right place,
            // the format is not right, should be corrected
            setTooltip($header.find(".type"), {
                "title": TipsTStr.DataType,
                "container": tableId,
                "template": templateZ10,
                "viewport": {
                    "selector": tableId,
                    "padding": "1px"
                }
            });

            // column dropdown menu
            setTooltip($header.find(".dropdownBox"), {
                "container": tableId,
                "placement": "bottom"
            });

            // tips on bookmark
            var tableLeft = $table.find(".idSpan").offset().left + 10;
            var tdX = Math.max(0, tableLeft);
            var tdY = 168; //top rows's distance from top of window
            var $ele = getElementFromPoint(tdX, tdY);

            // make sure the pointed ele is line marker
            // (when scroll, the point may be other element)
            if ($ele.find(".idWrap").length > 0 ||
                $ele.closest(".idWrap").length > 0)
            {
                var $lineMarker = $ele;
                setTooltip($lineMarker, {
                    "title": TipsTStr.LineMarker,
                    "placement": "right",
                    "container": tableId,
                    "template": templateZ10
                });
            }

            // tips on jsonString
            // the tdY should be at the first visible row
            // no matter tdX finds the line marker
            var $tr = $ele.closest("tr");
            setTooltip($tr.find(".jsonElement"), {
                "title": TipsTStr.JSONEle,
                "container": tableId,
                "template": templateZ10,
                "viewport": {
                    "selector": tableId,
                    "padding": "1px"
                }
            });
        }
    }

    function addDatastoreTips() {
        var dataView = "#datastorePanel";
        var $grids = $("#dsListSection .grid-unit:not(.xc-hidden)");
        if ($grids.length > 0) {
            var $grid = $grids.eq($grids.length - 1);
            // grid view section
            setTooltip($grid, {
                "title": TipsTStr.DragGrid,
                "container": dataView,
                "placement": "right"
            });
        }

        // dataset table
        setTooltip($("#dsTable"), {
            "title": TipsTStr.DSTable,
            "container": "#dsTableView"
        });

        // data cart area
        setTooltip($("#dataCartWrap"), {
            "title": TipsTStr.DSCart,
            "container": "#dataCartContainer",
            "template": templateZ0,
            "placement": "left"
        });
    }

    function addTableListTips() {
        // tablelist in activeTableListSection
        var $tableList = $("#activeTableListSection").find(".tableListBox").eq(0);
        setTooltip($tableList, {
            "title": TipsTStr.TablList,
            "container": "#activeTablesList .timeLine:first-child"
        });

        // tablelist in archivedList
        $tableList = $("#archivedTableListSection").find(".tableListBox").eq(0);
        setTooltip($tableList, {
            "title": TipsTStr.TablList,
            "container": "#archivedTableListSection .timeLine:first-child"
        });
    }
    /* End of Section of adding tips */

    /* Section for adding modal tips */
    function addJSONModalTips() {
        var $jsonModal = $("#jsonModal");

        if ($jsonModal.is(":visible")) {
            setTooltip($jsonModal.find(".jKey").eq(0), {
                "title": TipsTStr.PullColumn,
                "container": getIdStr($jsonModal),
                "placement": "left"
            });
        }
    }
    /* End of Section for adding modal tips */

    /* Section of helper function in Tips */
    function setTooltip($target, options) {
        // options reference:
        // http://www.w3schools.com/bootstrap/bootstrap_ref_js_tooltip.asp
        xcAssert($target != null, "Invalid target!");

        options = $.extend({}, defaultOpt, options);

        $target.tooltip(options);
        $targets.push($target);
    }

    // get the element in the middle
    function getMiddleElement($eles) {
        return ($eles.eq(Math.floor($eles.length / 2)));
    }

    // return a jQuery element
    function getElementFromPoint(x, y) {
        if (document.elementFromPoint) {
            return $(document.elementFromPoint(x, y));
        }
    }

    function getIdStr($e) {
        return ("#" + $e.attr("id"));
    }
    /* End of Section of helper function in Tips*/

    return (Tips);
}(jQuery, {}));
