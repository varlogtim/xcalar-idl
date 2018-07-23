window.MainMenu = (function($, MainMenu) {
    var $menuBar; // $("#menuBar");
    var $mainMenu; // $("#mainMenu");
    // var menuAction;
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
            case ("jupyterPanel"):
                $tab = $("#jupyterTab");
                break;
            default:
                break;
        }
        if ($tab) {
            var wasActive = true;
            if (!$tab.hasClass("active") || WorkbookPanel.isWBMode()) {
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
    MainMenu.restoreState = function(prevState, ignoreClose) {
        // ignoreRestoreState is temporarily set when mainMenu tab is clicked
        // and form is open
        // ignoreClose will be true if different menu tab has been clicked
        // and form is no longer visible
        if (!ignoreRestoreState && !ignoreClose) {
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
            UnionView.close();
            ExportView.close();
            SmartCastView.close();
            DFCreateView.close();
            SortView.close();
            ProjectView.close();

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
            var $curTab = $(".topMenuBarTab.active");
            if ($curTab.hasClass("noLeftPanel") || $curTab.find(".subTab.active").hasClass("noLeftPanel")) {
                return;
            }
            MainMenu.open();
        });
    }

    function setupTabbing() {
        var $tabs = $menuBar.find(".topMenuBarTab");

        $tabs.click(function(event) {
            WorkbookPanel.hide(true);

            var $curTab = $(this);
            var $target = $(event.target);

            resolveMenuAnim();
            $menuBar.removeClass("animating");
            clickable = true;

            if ($curTab.hasClass("active")) {
                if ($curTab.hasClass("noLeftPanel")) {
                    return;
                }
                var hasAnim = false;
                if ($target.closest(".mainTab").length) {
                    // clicking on active main tab
                    var $subTab = $curTab.find(".subTab.active");
                    if (!$subTab.hasClass("noLeftPanel")) {
                        hasAnim = toggleMenu($curTab);
                    }
                } else if ($target.closest(".subTab").length) {
                    var $subTab = $target.closest(".subTab");
                    if ($subTab.hasClass("noLeftPanel")) {
                        closeMenu($curTab, true);
                    } else if ($subTab.hasClass("active")) {
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

                // call this before open/close menu to get current panel size
                if (lastTabId === "workspaceTab") {
                    panelSwitchingHandler($curTab, lastTabId);
                }

                var noAnim = true;
                var $subTab = $curTab.find(".subTab.active");
                if ($curTab.hasClass("mainMenuOpen") &&
                    !$curTab.hasClass("noLeftPanel") &&
                    !$subTab.hasClass("noLeftPanel")) {
                    openMenu($curTab, noAnim);
                } else {
                    closeMenu($curTab, noAnim);
                }
                if (lastTabId !== "workspaceTab") {
                    panelSwitchingHandler($curTab, lastTabId);
                }
                xcHelper.hideSuccessBox();
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
        var menuAnimDeferred = PromiseHelper.deferred();
        menuAnimCheckers.push(menuAnimDeferred);

        return menuAnimDeferred.promise();
    }

    function panelSwitchingHandler($curTab, lastTabId) {
        if (lastTabId === "monitorTab") {
            MonitorPanel.inActive();
        } else if (lastTabId === "dataStoresTab") {
            DSCart.checkQueries();
        } else if (lastTabId === "workspaceTab") {
            WorkspacePanel.inActive();
        }
        $(".mainPanel").removeClass("active");
        $("#container").removeClass("monitorViewOpen");
        var curTab = $curTab.attr("id");
        $menuBar.find(".topMenuBarTab").removeClass("active");
        $curTab.addClass("active");

        switch (curTab) {
            case ("workspaceTab"):
                WorkspacePanel.active();
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
                    DataflowPanel.showFirstTime();
                } else {
                    DataflowPanel.show();
                }
                break;
            case ("jupyterTab"):
                BottomMenu.unsetMenuCache();
                $("#jupyterPanel").addClass("active");
                JupyterPanel.sendInit(); // used to validate session if first
                // time viewing a notebook
                break;
            default:
                $(".underConstruction").addClass("active");
        }

        StatusMessage.updateLocation();
        $(".tableDonePopupWrap").remove();
    }

    function openMenu($curTab, noAnim) {
        if (noAnim) {
            $("#dagPanelContainer").addClass("noAnim");
        }
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

        if (BottomMenu.isMenuOpen()) {
            var mainMenuOpening = true;
            BottomMenu.close(mainMenuOpening);
        }
        isMenuOpen = true;
        $("#container").addClass("mainMenuOpen");

        $curTab.addClass("mainMenuOpen");

        // recenter table titles if on workspace panel
        if (!noAnim && $("#workspacePanel").hasClass("active")) {
            xcHelper.menuAnimAligner(false, checkMenuAnimFinish);
        } else if ($("#monitor-queries").hasClass("active")) {
            QueryManager.scrollToFocused();
            menuAnimAlign = null;
        } else {
            menuAnimAlign = null;
        }
        setTimeout(function () {
            // timeout prevents flicker
            $("#dagPanelContainer").removeClass("noAnim");
        });
        return !noAnim;
    }

    // makeInactive is used in "noWorkbook" mode
    function closeMenu($curTab, noAnim, makeInactive) {
        if (noAnim) {
            $("#dagPanelContainer").addClass("noAnim");
        }

        checkAnim(noAnim);
        $mainMenu.removeClass("open");
        $mainMenu.width(defaultWidth);
        $mainMenu.find(".commonSection").removeClass("active");

        $("#container").removeClass("mainMenuOpen");
        if (!noAnim) {
            $curTab.removeClass("mainMenuOpen");
        }

        isMenuOpen = false;

        setCloseClass(noAnim);

        if (makeInactive) {
            $curTab.removeClass("active");
        }

        // recenter table titles if on workspace panel
        if (!noAnim && $("#workspacePanel").hasClass("active")) {
            xcHelper.menuAnimAligner(true, checkMenuAnimFinish);
        } else {
            IMDPanel.redraw();
            menuAnimAlign = null;
        }
        setTimeout(function () {
            // timeout prevents flicker
            $("#dagPanelContainer").removeClass("noAnim");
        });
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
