window.MainMenu = (function($, MainMenu) {
    var $menuBar; // $("#menuBar");
    var $mainMenu; // $("#mainMenu");
    var menuAction;
    var isMenuOpen = false;
    var menuAnimCheckers = [];
    var closedOffset = 65; // in pixels, how much the panels are horizonally
    // offset when a menu is closed (includes 5px padding in .mainContent)
    var openOffset = 350; // when the menu is open
    var defaultWidth = 295;
    var currWidth = defaultWidth;
    var isFormOpen = false; // if export, join, map etc is open
    var ignoreRestoreState = false; // boolean flag - if closing of a form is
    // triggered by the clicking of a mainMenu tab, we do not want to restore
    // the pre-form state of the menu so we turn the flag on temporarily
    var clickable = true;
    MainMenu.setup = function() {
        $menuBar = $("#menuBar");
        $mainMenu = $("#mainMenu");
        setupTabbing();
        setupBtns();
        setupResizable();
    };

    MainMenu.close = function(noAnim, makeInactive) {
        var wasClickable = clickable;
        closeMenu($menuBar.find(".topMenuBarTab.active"), noAnim,
                  makeInactive);
        if (!noAnim && wasClickable) {
            addAnimatingClass();
        }
    };

    // checks main menu and bottom menu
    // or checks specific one if you pass in the id
    MainMenu.isMenuOpen = function(menu) {
        if (menu) {
            if (menu === "mainMenu") {
                return isMenuOpen;
            } else {
                return BottomMenu.isMenuOpen();
            }
        } else {
            return (isMenuOpen || BottomMenu.isMenuOpen());
        }
    };

    MainMenu.open = function(noAnim) {
        var wasClickable = clickable;
        var hasAnim = openMenu($menuBar.find(".topMenuBarTab.active"), noAnim);
        if (hasAnim && wasClickable) {
            addAnimatingClass();
        }
    };

    MainMenu.openPanel = function(panelId, subTabId, options) {
        options = options || {};
        var $tab;
        switch (panelId) {
            case ("workspacePanel"):
                $tab = $("#workspaceTab");
                break;
            case ("monitorPanel"):
                $tab = $("#monitorTab");
                break;
            case ("datastorePanel"):
                $tab = $("#dataStoresTab");
                break;
            case ("dataflowPanel"):
                $tab = $("#dataflowTab");
                break;
            default:
                break;
        }
        if ($tab) {
            var wasActive = true;
            if (!$tab.hasClass("active") || Workbook.isWBMode()) {
                wasActive = false;
                $tab.click();
            }

            if (subTabId && $tab.find("#" + subTabId).length) {
                var $subTab =  $tab.find("#" + subTabId);
                if (!$subTab.hasClass("active")) {
                    $subTab.click();
                }
            }
            if (options.hideDF && !wasActive) {
                if ($('#maximizeDag').hasClass('unavailable') &&
                    !$('#dagPanel').hasClass('hidden'))
                {
                    $('#dfPanelSwitch').trigger('click');
                }
            }
        }
    };


    MainMenu.getOffset = function() {
        if (isMenuOpen) {
            return (openOffset);
        } else if (BottomMenu.isMenuOpen()) {
            if (BottomMenu.isPoppedOut()) {
                return (closedOffset);
            } else {
                return (openOffset);
            }
        } else {
            return (closedOffset);
        }
    };

    MainMenu.getState = function() {
        var state = {
            isPoppedOut: BottomMenu.isPoppedOut(),
            isTopOpen: isMenuOpen,
            isBottomOpen: BottomMenu.isMenuOpen(),
            $activeTopSection: $mainMenu.find(".commonSection.active"),
            $activeBottomSection: $("#bottomMenu").find(".menuSection.active"),
            $activeWorkspaceMenu: $("#workspaceMenu")
                                   .find(".menuSection:not(.xc-hidden)")
        };
        return (state);
    };

    MainMenu.setFormOpen = function() {
        isFormOpen = true;
        return isFormOpen;
    };

    MainMenu.setFormClose = function() {
        isFormOpen = false;
        return isFormOpen;
    };

    // xx currently only supporting form views in the worksheet panel
    MainMenu.restoreState = function(prevState) {
        // ignoreRestoreState is temporarily set when mainMenu tab is clicked
        // and form is open
        if (!ignoreRestoreState) {
            var noAnim;
            if (prevState.isBottomOpen && !BottomMenu.isMenuOpen()) {
                BottomMenu.openSection(prevState.$activeBottomSection.index());
            }
            if (isMenuOpen && !prevState.isTopOpen) {
                noAnim = false;
                if (prevState.isBottomOpen) {
                    noAnim = true;
                }
                MainMenu.close(noAnim);
            }
        }

        // restore worksheet list view or table list view
        $("#workspaceMenu").find(".menuSection").addClass("xc-hidden");
        prevState.$activeWorkspaceMenu.removeClass("xc-hidden");
    };

    MainMenu.tempNoAnim = function() {
        checkAnim(true);
    };

    MainMenu.closeForms = function() {
        if (isFormOpen) {
            ignoreRestoreState = true;
            OperationsView.close();
            JoinView.close();
            ExportView.close();
            SmartCastView.close();
            DFCreateView.close();
            ignoreRestoreState = false;
        }
    };

    function setupResizable() {
        var $menuPanel = $mainMenu;
        var minWidth = defaultWidth + 3;
        var isSmall = true;
        $mainMenu.resizable({
            "handles": "e",
            "minWidth": 295,
            "distance": 2,
            "start": function() {
                // set boundaries so it can"t resize past window
                var panelRight = $menuPanel[0].getBoundingClientRect().right;

                panelRight = $(window).width() - panelRight +
                             $menuPanel.width();
                $menuPanel.css("max-width", panelRight - 10);
                $mainMenu.addClass("resizing");
            },
            "stop": function() {
                $menuPanel.css("max-width", "").css("max-height", "");
                var width = $menuPanel.width();

                width = Math.min(width, $(window).width() - $("#menuBar").width() - 10);

                $menuPanel.width(width);
                $mainMenu.removeClass("resizing");
                var newWidth = $mainMenu.width();
                if (newWidth < minWidth) {
                    $mainMenu.width(defaultWidth);
                    $mainMenu.removeClass("expanded");
                    isSmall = true;
                } else {
                    $mainMenu.addClass("expanded");
                    isSmall = false;
                }
                currWidth = newWidth;
            },
            "resize": function(event, ui) {
                if (!isSmall && ui.size.width < minWidth) {
                    $mainMenu.removeClass("expanded");
                    isSmall = true;
                } else if (isSmall && ui.size.width >= minWidth) {
                    $mainMenu.addClass("expanded");
                    isSmall = false;
                }
                DS.resize();
            }
        });
    }

    function setupBtns() {
        $mainMenu.find(".minimizeBtn").click(function() {
            MainMenu.close();
        });
        $mainMenu.find(".minimizedContent").click(function() {
            MainMenu.open();
        });
    }

    function setupTabbing() {
        var $tabs = $menuBar.find(".topMenuBarTab");

        $tabs.click(function(event) {
            Workbook.hide(true);

            var $curTab = $(this);
            var $target = $(event.target);

            if ($curTab.hasClass("active")) {
                var hasAnim = false;
                if ($target.closest(".mainTab").length) {
                    // clicking on active main tab
                    hasAnim = toggleMenu($curTab);
                } else if ($target.closest(".subTab").length) {
                    var $subTab = $target.closest(".subTab");
                    if ($subTab.hasClass("active")) {
                        // clicking on active sub tab
                        hasAnim = toggleMenu($curTab);
                    } else if ($("#bottomMenu").hasClass("open")) {
                        openMenu($curTab, true);
                        hasAnim = false;
                    } else {
                        hasAnim = false;
                    }
                    $curTab.find(".subTab").removeClass("active");
                    $subTab.addClass("active");

                }
                if (hasAnim) {
                    addAnimatingClass();
                }
            } else { // this tab was inactive, will make active
                var $lastActiveTab = $tabs.filter(".active");
                var lastTabId = $lastActiveTab.attr("id");
                $lastActiveTab.addClass("noTransition")
                              .find(".icon")
                              .addClass("noTransition");
                // we dont want transition when active tab goes to inactive
                setTimeout(function() {
                    $tabs.removeClass("noTransition")
                         .find(".icon")
                         .removeClass("noTransition");
                }, 100);

                var noAnim = true;
                if ($curTab.hasClass("mainMenuOpen")) {
                    openMenu($curTab, noAnim);
                } else {
                    closeMenu($curTab, noAnim);
                }
                xcHelper.hideSuccessBox();
                panelSwitchingHandler($curTab, lastTabId);

            }

        });

        $mainMenu[0].addEventListener(transitionEnd, function(event) {
            if (!$(event.target).is("#mainMenu")) {
                return;
            }
            resolveMenuAnim();
        });
    }

    function resolveMenuAnim() {
        for (var i = 0; i < menuAnimCheckers.length; i++) {
            if (menuAnimCheckers[i]) {
                menuAnimCheckers[i].resolve();
            }
        }
        menuAnimCheckers = [];
    }


    function checkMenuAnimFinish() {
        var menuAnimDeferred = jQuery.Deferred();
        menuAnimCheckers.push(menuAnimDeferred);

        return menuAnimDeferred.promise();
    }

    function panelSwitchingHandler($curTab, lastTabId) {
        if (lastTabId === "workspaceTab") {
            // hide off screen tables so that the next time we return to the
            // workspace panel, the switch is quicker because we have less html
            // to render. WSManager.focusOnWorksheet() will reveal hidden tables
            TblFunc.hideOffScreenTables();
        }
        $(".mainPanel").removeClass("active");
        $("#container").removeClass("monitorViewOpen");
        var curTab = $curTab.attr("id");
        $menuBar.find(".topMenuBarTab").removeClass("active");
        $curTab.addClass("active");

        switch (curTab) {
            case ("workspaceTab"):
                $("#workspacePanel").addClass("active");
                WSManager.focusOnWorksheet();
                if (!$("#dagPanel").hasClass("hidden")) {
                    xcTooltip.changeText($("#dfPanelSwitch"),
                                         TooltipTStr.CloseQG);
                }
                break;
            case ("dataStoresTab"):
                $("#datastorePanel").addClass("active");
                DSTable.refresh();
                DSCart.refresh();
                DSCart.checkQueries();
                if ($curTab.hasClass("firstTouch")) {
                    $curTab.removeClass("firstTouch");
                    DS.setupView();
                    DSForm.initialize();
                    // relese the old ref count if any
                    DS.release();
                    DSUploader.refreshFiles();
                }
                DS.resize();
                break;
            case ("monitorTab"):
                $("#monitorPanel").addClass("active");
                $("#container").addClass("monitorViewOpen");
                MonitorPanel.active();
                if ($curTab.hasClass("firstTouch")) {
                    $curTab.removeClass("firstTouch");
                    QueryManager.scrollToFocused();
                }
                break;
        case ("dataflowTab"):
                $("#dataflowPanel").addClass("active");
                if ($curTab.hasClass("firstTouch")) {
                    $curTab.removeClass("firstTouch");
                    var $dfList = $("#dfMenu .dfList");
                    $dfList.addClass("disabled");
                    var promise = DF.restore();
                    xcHelper.showRefreshIcon($dfList, false, promise);

                    promise
                    .always(function() {
                        $dfList.removeClass("disabled");
                    });
                }
                break;
            default:
                $(".underConstruction").addClass("active");
        }
        if (curTab !== "dataStoresTab") {
            // when switch to other tab, release result set
            DS.release();
        }

        if (lastTabId === "monitorTab") {
            MonitorPanel.inActive();
        } else if (lastTabId === "dataStoresTab") {
            DSCart.checkQueries();
        } else if (lastTabId === "workspaceTab") {
            xcTooltip.changeText($("#dfPanelSwitch"), TooltipTStr.OpenQG);
        }

        StatusMessage.updateLocation();
        $(".tableDonePopupWrap").remove();
    }

    function openMenu($curTab, noAnim) {
        var id = $curTab.attr("id");
        $mainMenu.find(".commonSection").removeClass("active").filter(function() {
            return $(this).data("tab") === id;
        }).addClass("active");
        if ($("#bottomMenu").hasClass("open") && !BottomMenu.isPoppedOut()) {
            noAnim = true;
        }
        checkAnim(noAnim);
        resolveMenuAnim();
        $mainMenu.addClass("open").removeClass("closed");
        $mainMenu.width(currWidth);

        var mainMenuOpening = true;
        if (BottomMenu.isMenuOpen()) {
            BottomMenu.close(mainMenuOpening);
        }
        $("#container").addClass("mainMenuOpen");
        isMenuOpen = true;
        $curTab.addClass("mainMenuOpen");

        // recenter table titles if on workspace panel
        if (!noAnim && $("#workspacePanel").hasClass("active")) {
            xcHelper.menuAnimAligner(false, checkMenuAnimFinish);
        } else {
            menuAnimAlign = null;
        }
        return !noAnim;
    }

    // makeInactive is used in "noWorkbook" mode
    function closeMenu($curTab, noAnim, makeInactive) {
        checkAnim(noAnim);
        $mainMenu.removeClass("open");
        $mainMenu.width(defaultWidth);
        $mainMenu.find(".commonSection").removeClass("active");

        $("#container").removeClass("mainMenuOpen");
        $curTab.removeClass("mainMenuOpen");
        isMenuOpen = false;

        setCloseClass(noAnim);

        if (makeInactive) {
            $curTab.removeClass("active");
        }

        // recenter table titles if on workspace panel
        if (!noAnim && $("#workspacePanel").hasClass("active")) {
            xcHelper.menuAnimAligner(true, checkMenuAnimFinish);
        } else {
            menuAnimAlign = null;
        }
    }

    // turns off animation during open or close
    function checkAnim(noAnim) {
        $mainMenu.removeClass("noAnim");
        $("#container").removeClass("noMenuAnim");
        if (noAnim) {
            $mainMenu.addClass("noAnim");
            $("#container").addClass("noMenuAnim");

            // noAnim classes only need to take effect for a split second
            // to get rid of transition animations
            setTimeout(function() {
                $mainMenu.removeClass("noAnim");
                $("#container").removeClass("noMenuAnim");
            }, 0);
        } else {
            menuAction = null;
        }
    }

    function toggleMenu($curTab) {
        var hasAnim;
        if ($mainMenu.hasClass("open")) {
            closeMenu($curTab);
            hasAnim = true;
        } else {
            hasAnim = openMenu($curTab);
        }
        return hasAnim;
    }

    function setCloseClass(noAnim) {
        if (noAnim) {
            menuAction = null;
            $mainMenu.addClass("closed");
        } else {
            checkMenuAnimFinish()
            .then(function() {
                $mainMenu.addClass("closed");
            });
        }
    }

    function addAnimatingClass() {
        clickable = false;
        $menuBar.addClass("animating");
        checkMenuAnimFinish()
        .then(function() {
            $menuBar.removeClass("animating");
            clickable = true;
        });
    }

    return (MainMenu);
}(jQuery, {}));
