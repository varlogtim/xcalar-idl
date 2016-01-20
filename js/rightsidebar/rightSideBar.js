window.RightSideBar = (function($, RightSideBar) {
    RightSideBar.setup = function() {
        setupButtons();
        setupSQL();
        TableList.setup();
        UDF.setup();
        CLIBox.setup();
        Help.setup();
    };

    RightSideBar.clear = function() {
        TableList.clear();
        UDF.clear();
    };

    RightSideBar.initialize = function() {
        TableList.initialize();
        setLastRightSidePanel();
        UDF.initialize();
    };

    // setup buttons to open right side bar
    function setupButtons() {
        var delay             = 300;
        var clickable         = true;
        var $btnArea          = $("#rightSideBarBtns");
        var $sliderBtns       = $btnArea.find(".sliderBtn");
        var $rightSideBar     = $("#rightSideBar");
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

        $rightSideBar.on("click", ".machineSQL", function() {
            $(this).removeClass("machineSQL");
            $(this).addClass("humanSQL");
            $("#rightBarMachineTextArea").hide();
            $("#rightBarTextArea").show();
        });

        $rightSideBar.on("click", ".humanSQL", function() {
            $(this).removeClass("humanSQL");
            $(this).addClass("machineSQL");
            $("#rightBarMachineTextArea").show();
            $("#rightBarTextArea").hide();
        });

        $rightSideBar.on("click", ".copySQL", function() {
            var $hiddenInput = $("<input>");
            $("body").append($hiddenInput);
            var value;
            if ($("#rightBarMachineTextArea").is(":visible")) {
                xcHelper.assert((!$("#rightBarTextArea").is(":visible")),
                                "human and android cannot coexist!");
                value = $("#rightBarMachineTextArea").text();
            } else {
                xcHelper.assert((!$("#rightBarMachineTextArea").is(":visible")),
                                "human and android cannot coexist!");
                xcHelper.assert(($("#rightBarTextArea").is(":visible")),
                                "At least one bar should be showing");
                value = JSON.stringify(SQL.getLogs());
            }
            $hiddenInput.val(value).select();
            document.execCommand("copy");
            $hiddenInput.remove();
        });

        $rightSideBar.draggable({
            handle     : '.heading.draggable',
            containment: 'window',
            cursor     : '-webkit-grabbing'
        });

        $rightSideBar.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : 500,
            minWidth   : 264,
            containment: "document"
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

                $sliderBtns.eq(index).addClass("active");

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
            $sliderBtns.removeClass("active");
            // since close right side bar has slider animition,
            // delay the close of section
            setTimeout(function() {
                $rightBarSections.removeClass("active");
            }, delay);
        }
    }

    function setupSQL() {
        $("#rightBarMachineTextArea").hide();
    }

    function popOutModal($rightSideBar) {
        $rightSideBar.addClass('poppedOut');
        $('#rightSideBarBtns').appendTo($rightSideBar);
        $rightSideBar.find('.popOut')
                     .attr('data-original-title', 'pop back in');
        $('.tooltip').hide();
        var offset = $('#rightSideBar').offset();
        $('#rightSideBar').css({
            left: offset.left,
            top : offset.top
        });
    }

    function popInModal($rightSideBar) {
        $rightSideBar.removeClass('poppedOut');
        $('#rightSideBarBtns').appendTo('#worksheetBar');
        $rightSideBar.attr('style', "");
        $rightSideBar.find('.popOut')
                     .attr('data-original-title', 'pop out');
        $('.tooltip').hide();
        CLIBox.realignNl();
    }

    function setLastRightSidePanel() {
        var settings = UserSettings.getSettings();
        if (settings.lastRightSideBar) {
            $('#' + settings.lastRightSideBar).addClass('lastOpen');
        }
    }

    return (RightSideBar);
}(jQuery, {}));
