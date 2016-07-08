window.RightSideBar = (function($, RightSideBar) {
    var delay = 300;
    var clickable = true;

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
        } catch (error) {
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

    function setLastRightSidePanel() {
        var lastRightSideBar = UserSettings.getPreference().lastRightSideBar;
        if (lastRightSideBar &&
            !$('.rightBarSection').hasClass('lastOpen')) {
            $('#' + lastRightSideBar).addClass('lastOpen');
        }
    }

    // setup buttons to open right side bar
    function setupButtons() {
        var $rightSideBar = $("#rightSideBar");
        $rightSideBar.on("click", ".close", function() {
            if ($rightSideBar.hasClass('poppedOut')) {
                setTimeout(function() {
                    closeRightSidebar();
                }, 100);
            } else {
                closeRightSidebar();
            }
            popInModal();
        });

        $rightSideBar.on("click", ".popOut", function() {
            if ($rightSideBar.hasClass('poppedOut')) {
                popInModal();
            } else {
                popOutModal();
            }
        });

        $rightSideBar.draggable({
            "handle"     : ".heading.draggable",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        var sideDragging;
        $rightSideBar.on('mousedown', '.ui-resizable-handle', function() {
            var $handle = $(this);
            if ($handle.hasClass("ui-resizable-w")) {
                sideDragging = "left";
            } else if ($handle.hasClass("ui-resizable-e")) {
                sideDragging = "right";
            } else if ($handle.hasClass("ui-resizable-n")) {
                sideDragging = "top";
            } else if ($handle.hasClass("ui-resizable-s")) {
                sideDragging = "bottom";
            } else if ($handle.hasClass("ui-resizable-se")) {
                sideDragging = "bottomRight";
            }
        });

        var poppedOut = false;
        var rightSideBarIsSmall = false;
        var smallWidth = 425;
        var udfEditorVisible = false;
        var $udfSection = $('#udfSection');
        var $udfFnSection = $('#udf-fnSection');
        var editor; // cannot assign it here because may not be ready

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

                udfEditorVisible = $udfSection.hasClass('active') &&
                                   !$udfFnSection.hasClass('hidden');
                if (udfEditorVisible) {
                    editor = UDF.getEditor();
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

                if ($rightSideBar.width() > 425) {
                    rightSideBarIsSmall = false;
                } else {
                    rightSideBarIsSmall = true;
                }
            },
            "stop": function() {
                $rightSideBar.css('max-width', '').css('max-height', '');

                if ($rightSideBar.width() > 425) {
                    $rightSideBar.removeClass('small');
                } else {
                    $rightSideBar.addClass('small');
                }
                if (udfEditorVisible) {
                    editor.refresh();
                }
            },
            "resize": function(event, ui) {
                if (ui.size.width > smallWidth) {
                    if (rightSideBarIsSmall) {
                        rightSideBarIsSmall = false;
                        $rightSideBar.removeClass('small');
                    }
                } else if (!rightSideBarIsSmall) {
                    rightSideBarIsSmall = true;
                    $rightSideBar.addClass('small');
                }
                if (udfEditorVisible) {
                    editor.refresh();
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

        $("#rightSideBarBtns").on("click", ".sliderBtn", function() {
            if (!clickable) {
                return;
            }

            var index = $(this).index();
            toggleRightSection(index);
        });

        $("#pulloutTab").click(function() {
            if (!clickable) {
                return;
            }
            toggleRightSection();
        });
    }

    function closeRightSidebar() {
        var $rightSideBar = $("#rightSideBar");
        $rightSideBar.removeClass("open");
        $rightSideBar.css('right', -($rightSideBar.width() - 10));
        $("#rightSideBarBtns .sliderBtn.active").removeClass("active");
        // since close right side bar has slider animition,
        // delay the close of section
        setTimeout(function() {
            $rightSideBar.find(".rightBarSection.active")
                         .removeClass("active");
        }, delay);
    }

    function toggleRightSection(sectionIndex) {
        var $rightSideBar = $("#rightSideBar");
        var $rightBarSections = $rightSideBar.find(".rightBarSection");
        var $sliderBtns = $("#rightSideBarBtns .sliderBtn");
        var $section;

        if (sectionIndex == null) {
            $section = $rightSideBar.find(".lastOpen");

            if ($section.length === 0) {
                $section = $rightBarSections.eq(0);
                sectionIndex = 0;
            } else {
                sectionIndex = $section.index();
            }
        } else {
            $section = $rightBarSections.eq(sectionIndex);
        }

        if ($rightSideBar.hasClass("open") && $section.hasClass("active")) {
            // section is active, close right side bar
            if (!$rightSideBar.hasClass('poppedOut')) {
                // disable closing if popped out
                closeRightSidebar();
            }
        } else {
            // right side bar is closed or
            // switch to this section
            $sliderBtns.removeClass("active");
            $sliderBtns.eq(sectionIndex).addClass("active");

            $rightBarSections.removeClass("active")
                             .removeClass("lastOpen");
            // mark the section and open the right side bar
            $section.addClass("active")
                    .addClass("lastOpen");

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
        }

        // dealay the next click as the rightsidebar open/close has animation
        clickable = false;
        setTimeout(function() {
            clickable = true;
        }, delay);
    }

    function popOutModal() {
        var $rightSideBar = $("#rightSideBar");
        var offset = $rightSideBar.offset();

        $rightSideBar.addClass('poppedOut');
        $('#rightSideBarBtns').appendTo($rightSideBar);
        $rightSideBar.find('.popOut')
                     .attr('data-original-title', SideBarTStr.PopBack);
        $('.tooltip').hide();
        $rightSideBar.css({
            "left": offset.left - 5,
            "top" : offset.top - 5
        });
    }

    function popInModal() {
        var $rightSideBar = $("#rightSideBar");

        $rightSideBar.removeClass('poppedOut');
        $('#rightSideBarBtns').appendTo('#worksheetBar');
        $rightSideBar.attr('style', "");
        $rightSideBar.find('.popOut')
                     .attr('data-original-title', SideBarTStr.PopOut);
        $('.tooltip').hide();
        CLIBox.realignNl();
    }

    return (RightSideBar);
}(jQuery, {}));
