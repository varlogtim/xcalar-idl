window.RightSideBar = (function($, RightSideBar) {
    RightSideBar.setup = function() {
        setupButtons();
        SQL.setup();
        TableList.setup();
        UDF.setup();
        CLIBox.setup();
        Help.setup();
    };

    RightSideBar.initialize = function() {
        try {
            TableList.initialize();
            UDF.initialize();
            setLastRightSidePanel();
        } catch(error) {
            console.error(error);
            Alert.error(ThriftTStr.SetupErr, error);
        }
    };

    RightSideBar.clear = function() {
        TableList.clear();
        UDF.clear();
        SQL.clear();
        CLIBox.clear();
    };

    // setup buttons to open right side bar
    function setupButtons() {
        var delay     = 300;
        var clickable = true;

        var $btnArea = $("#rightSideBarBtns");
        var $sliderBtns = $btnArea.find(".sliderBtn");
        var $rightSideBar = $("#rightSideBar");
        var $rightBarSections = $rightSideBar.find(".rightBarSection");

        $btnArea.on("click", ".sliderBtn", function() {
            if (!clickable) {
                return;
            }

            var $sliderBtn = $(this);
            var index      = $sliderBtn.index();
            var $section   = $rightSideBar.find('.rightBarSection').eq(index);

            if (!$rightSideBar.hasClass("open") ||
                !$section.hasClass("active"))
            {
                // right side bar is closed or
                // switch to this section
                $sliderBtns.removeClass("active");
                $sliderBtn.addClass("active");

                $rightBarSections.removeClass("active");
                $rightBarSections.removeClass("lastOpen");
                // mark the section and open the right side bar
                $section.addClass("active");
                $section.addClass("lastOpen");

                $rightSideBar.addClass("open");

                if ($section.attr("id") === "sqlSection") {
                    SQL.scrollToBottom();
                    $("#sqlButtonWrap").show();
                } else {
                    $("#sqlButtonWrap").hide();
                }
                if ($section.attr("id") === "cliSection") {
                    CLIBox.realignNl();
                }
            } else {
                // section is active, close right side bar
                if (!$rightSideBar.hasClass('poppedOut')) {
                    // disable closing if popped out
                    closeRightSidebar();
                }

            }

            delayClick();
        });

        $rightSideBar.on("click", ".iconClose", function() {
            if ($rightSideBar.hasClass('poppedOut')) {
                setTimeout(function() {
                    closeRightSidebar();
                }, 100);
            } else {
                closeRightSidebar();
            }
            popInModal($rightSideBar);
        });

        $rightSideBar.on("click", ".popOut", function() {
            if ($rightSideBar.hasClass('poppedOut')) {
                popInModal($rightSideBar);
            } else {
                popOutModal($rightSideBar);
            }

        });

        $rightSideBar.draggable({
            handle     : '.heading.draggable',
            containment: 'window',
            cursor     : '-webkit-grabbing'
        });

        var sideDragging;

        $rightSideBar.on('mousedown', '.ui-resizable-handle', function() {
            if ($(this).hasClass('ui-resizable-w')) {
                sideDragging = "left";
            } else if ($(this).hasClass('ui-resizable-e')) {
                sideDragging = "right";
            } else if ($(this).hasClass('ui-resizable-n')) {
                sideDragging = "top";
            } else if ($(this).hasClass('ui-resizable-s')) {
                sideDragging = "bottom";
            } else if ($(this).hasClass('ui-resizable-se')) {
                sideDragging = "bottomRight";
            }
        });

        var poppedOut = false;
        var tableListVisible = false;
        var rightSideBarIsSmall = false;
        var smallWidth = 425;

        $rightSideBar.resizable({
            "handles"  : "n, e, s, w, se",
            "minWidth" : 264,
            "minHeight": 300,
            "start"    : function() {
                if (!$rightSideBar.hasClass('poppedOut')) {
                    poppedOut = false;
                } else {
                    poppedOut = true;
                }

                // set boundaries so it can't resize past window
                var panelRight = $rightSideBar[0].getBoundingClientRect().right;
                var panelBottom = $rightSideBar[0].getBoundingClientRect().bottom;

                if (sideDragging === "left") {
                    $rightSideBar.css('max-width', panelRight - 10);
                } else if (sideDragging === "right") {
                    panelRight = $(window).width() - panelRight +
                                 $rightSideBar.width();
                    $rightSideBar.css('max-width', panelRight);
                } else if (sideDragging === "top") {
                    $rightSideBar.css('max-height', panelBottom);
                } else if (sideDragging === "bottom") {
                    panelBottom = $(window).height() - panelBottom +
                                  $rightSideBar.height();
                    $rightSideBar.css('max-height', panelBottom);
                } else if (sideDragging === "bottomRight") {
                    panelRight = $(window).width() - panelRight +
                                 $rightSideBar.width();
                    $rightSideBar.css('max-width', panelRight);
                    panelBottom = $(window).height() - panelBottom +
                                  $rightSideBar.height();
                    $rightSideBar.css('max-height', panelBottom);
                }

                if ($('#tableListSection').hasClass('active')) {
                    tableListVisible = true;
                }
                if ($rightSideBar.width() > 425) {
                    rightSideBarIsSmall = false;
                } else {
                    rightSideBarIsSmall = true;
                }
            },
            "stop": function() {
                $rightSideBar.css('max-width', '').css('max-height', '');
                tableListVisible = false;
                if ($rightSideBar.width() > 425) {
                    $rightSideBar.removeClass('small');
                } else {
                    $rightSideBar.addClass('small');
                }
            },
            "resize": function(event, ui) {
                if (tableListVisible) {
                    if (ui.size.width > smallWidth) {
                        if (rightSideBarIsSmall) {
                            rightSideBarIsSmall = false;
                            $rightSideBar.removeClass('small');
                        }
                    } else if (!rightSideBarIsSmall) {
                        rightSideBarIsSmall = true;
                        $rightSideBar.addClass('small');
                    }
                }
                if (!poppedOut) {
                    return;
                }
                if (ui.position.left <= 0) {
                    $rightSideBar.css('left', 0);
                }
                if (ui.position.top <= 0) {
                    $rightSideBar.css('top', 0);
                }
            }
            // containment: "document"
        });

        $rightSideBar.on("resize", function() {
            CLIBox.realignNl();
        });

        $("#pulloutTab").click(function() {
            if (!clickable) {
                return;
            }

            var $section = $rightSideBar.children(".lastOpen");
            var index    = 0;

            if (!$rightSideBar.hasClass("open")) {
                if ($section.length === 0) {
                     // first time open right side bar
                    $section = $rightBarSections.eq(0);
                } else {
                    // open last opened section
                    index = $section.index();
                }

                $section.addClass("active")
                        .addClass("lastOpen");

                $sliderBtns.eq(index - 1).addClass("active");

                $rightSideBar.addClass("open");
            } else {
                closeRightSidebar();
            }

            delayClick();
        });

        function delayClick() {
            clickable = false;

            setTimeout(function() {
                clickable = true;
            }, delay);
        }

        function closeRightSidebar() {
            $rightSideBar.removeClass("open");
            $rightSideBar.css('right', -($rightSideBar.width() - 10));
            $sliderBtns.removeClass("active");
            // since close right side bar has slider animition,
            // delay the close of section
            setTimeout(function() {
                $rightBarSections.removeClass("active");
            }, delay);
        }
    }

    function popOutModal($rightSideBar) {
        var offset = $('#rightSideBar').offset();
        $rightSideBar.addClass('poppedOut');
        $('#rightSideBarBtns').appendTo($rightSideBar);
        $rightSideBar.find('.popOut')
                     .attr('data-original-title', SideBarTStr.PopBack);
        $('.tooltip').hide();
        $('#rightSideBar').css({
            left: offset.left - 5,
            top : offset.top - 5
        });
    }

    function popInModal($rightSideBar) {
        $rightSideBar.removeClass('poppedOut');
        $('#rightSideBarBtns').appendTo('#worksheetBar');
        $rightSideBar.attr('style', "");
        $rightSideBar.find('.popOut')
                     .attr('data-original-title', SideBarTStr.PopOut);
        $('.tooltip').hide();
        CLIBox.realignNl();
    }

    function setLastRightSidePanel() {
        var lastRightSideBar = UserSettings.getPreference().lastRightSideBar;
        if (lastRightSideBar &&
            !$('.rightBarSection').hasClass('lastOpen')) {
            $('#' + lastRightSideBar).addClass('lastOpen');
        }
    }

    return (RightSideBar);
}(jQuery, {}));
