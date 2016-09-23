window.MainMenu = (function($, MainMenu) {
    var delay = 200;
    var $menuBar; // $('#menuBar');
    var $mainMenu; // $('#mainMenu');
    var slideTimeout; // setTimeout for setting closed state after animation finishes
    var isMenuOpen = false;
    var closedOffset = 65; // in pixels, how much the panels are horizonally
    // offset when a menu is closed (includes 5px padding in .mainContent)
    var openOffset = 350; // when the menu is open
    var defaultWidth = 295;
    var currWidth = defaultWidth;
    var isFormOpen = false; // if export, join, map etc is open
    var ignoreRestoreState = false; // boolean flag - if closing of a form is
    // triggered by the clicking of a mainMenu tab, we do not want to restore
    // the pre-form state of the menu so we turn the flag on temporarily
    MainMenu.setup = function() {
        $menuBar = $('#menuBar');
        $mainMenu = $('#mainMenu');
        setupTabbing();
        setupBtns();
        setupResizable();
    };

    MainMenu.initialize = function() {
        try {
            // TableList.initialize();
        } catch (error) {
            console.error(error);
            Alert.error(ThriftTStr.SetupErr, error);
        }
    };

    MainMenu.clear = function() {
        // TableList.clear();
    };

    MainMenu.close = function(noAnim, makeInactive) {
        closeMenu($menuBar.find(".topMenuBarTab.active"), noAnim,
                  makeInactive);
    };

    // checks main menu and bottom menu
    // or checks specific one if you pass in the id
    MainMenu.isMenuOpen = function(menu) {
        if (menu) {
            if (menu === "mainMenu") {
                return (isMenuOpen);
            } else {
                return (BottomMenu.isMenuOpen());
            }
        } else {
            return (isMenuOpen || BottomMenu.isMenuOpen());
        }
    };

    MainMenu.open = function(noAnim) {
        openMenu($menuBar.find(".topMenuBarTab.active"), noAnim);
    };

    MainMenu.openPanel = function(panelId) {
        var $tab;
        switch (panelId) {
            case ('workspacePanel'):
                $tab = $('#workspaceTab');
                break;
            case ('monitorPanel'):
                $tab = $('#monitorTab');
                break;
            case ('datastorePanel'):
                $tab = $('#dataStoresTab');
                break;
            case ('dataflowPanel'):
                $tab = $('#dataflowTab');
                break;
            default:
                break;
        }
        if ($tab) {
            lastTabId = $menuBar.find(".topMenuBarTab.active").attr('id');
            panelSwitchingHandler($tab, lastTabId);
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
            isPoppedOut         : BottomMenu.isPoppedOut(),
            isTopOpen           : isMenuOpen,
            isBottomOpen        : BottomMenu.isMenuOpen(),
            $activeTopSection   : $mainMenu.find('.commonSection.active'),
            $activeBottomSection: $('#bottomMenu').find('.menuSection.active'),
            $activeWorkspaceMenu: $("#workspaceMenu")
                                   .find('.menuSection:not(.xc-hidden)')
        };
        return (state);
    };

    MainMenu.setFormOpen = function() {
        isFormOpen = true;
    };

    MainMenu.setFormClose = function() {
        isFormOpen = false;
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
        $("#workspaceMenu").find('.menuSection').addClass('xc-hidden');
        prevState.$activeWorkspaceMenu.removeClass('xc-hidden');
    };

    function setupResizable() {
        var $menuPanel = $mainMenu;
        var minWidth = defaultWidth + 3;
        var isSmall = true;
        $mainMenu.resizable({
            "handles"  : "e",
            "minWidth" : 295,
            "distance": 2,
            "start"    : function() {
                // set boundaries so it can't resize past window
                var panelRight = $menuPanel[0].getBoundingClientRect().right;

                panelRight = $(window).width() - panelRight +
                             $menuPanel.width();
                $menuPanel.css('max-width', panelRight - 10);
                $mainMenu.addClass('resizing');
               
            },
            "stop": function() {
                $menuPanel.css('max-width', '').css('max-height', '');
                var width = $menuPanel.width();

                width = Math.min(width, $(window).width() - $("#menuBar").width() - 10);

                $menuPanel.width(width);
                $mainMenu.removeClass('resizing');
                var newWidth = $mainMenu.width();
                if (newWidth < minWidth) {
                    $mainMenu.width(defaultWidth);
                    $mainMenu.removeClass('expanded');
                    isSmall = true;
                } else {
                    $mainMenu.addClass('expanded');
                    isSmall = false;
                }
                currWidth = newWidth;
            },
            "resize": function(event, ui) {
                if (!isSmall && ui.size.width < minWidth) {
                    $mainMenu.removeClass('expanded');
                    isSmall = true;
                } else if (isSmall && ui.size.width >= minWidth) {
                    $mainMenu.addClass('expanded');
                    isSmall = false;
                }
            }
        });
    }

    function setupBtns() {
        $mainMenu.find('.minimizeBtn').click(function() {
            closeMenu($menuBar.find(".topMenuBarTab.active"));
        });
        $mainMenu.find('.minimizedContent').click(function() {
            openMenu($menuBar.find(".topMenuBarTab.active"));
        });
    }

    function setupTabbing() {
        var $tabs = $menuBar.find(".topMenuBarTab");

        $tabs.click(function(event) {
            if (isFormOpen) {
                ignoreRestoreState = true;
                OperationsView.close();
                JoinView.close();
                ExportView.close();
                SmartCastView.close();
                DFCreateView.close();
                ignoreRestoreState = false;
            }
            Workbook.hide(true);

            var $curTab = $(this);
            var $target = $(event.target);

            if ($curTab.hasClass("active")) {
                if ($target.closest('.mainTab').length) {
                    toggleMenu($curTab);
                } else if ($target.closest('.subTab').length) {
                    var $subTab = $target.closest('.subTab');
                    if ($subTab.hasClass('active')) {
                        toggleMenu($curTab);
                    } else if ($('#bottomMenu').hasClass('open')) {
                        openMenu($curTab, true);
                    }
                    $curTab.find('.subTab').removeClass('active');
                    $subTab.addClass('active');
                }

                return;
            }
            var $lastActiveTab = $tabs.filter(".active");
            var lastTabId = $lastActiveTab.attr("id");
            $lastActiveTab.addClass('noTransition')
                          .find('.icon')
                          .addClass('noTransition');
            // we dont want transition when active tab goes to inactive
            setTimeout(function() {
                $tabs.removeClass('noTransition')
                     .find('.icon')
                     .removeClass('noTransition');
            }, 100);

            var noAnim = true;
            if ($curTab.hasClass('mainMenuOpen')) {
                openMenu($curTab, noAnim);
            } else {
                closeMenu($curTab, noAnim);
            }

            panelSwitchingHandler($curTab, lastTabId);
        });
    }

    function panelSwitchingHandler($curTab, lastTabId) {
        if (lastTabId === "workspaceTab") {
            // hide off screen tables so that the next time we return to the
            // workspace panel, the switch is quicker because we have less html
            // to render. WSManager.focusOnWorksheet() will reveal hidden tables
            hideOffScreenTables();
        }
        $('.mainPanel').removeClass('active');
        var curTab = $curTab.attr('id');
        $menuBar.find(".topMenuBarTab").removeClass("active");
        $curTab.addClass("active");

        switch (curTab) {
            case ("workspaceTab"):
                $("#workspacePanel").addClass("active");
                WSManager.focusOnWorksheet();
                break;
            case ("dataflowTab"):
                $('#dataflowPanel').addClass("active");
                DataflowPanel.active();
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
                }
                break;
            case ("monitorTab"):
                $('#monitorPanel').addClass("active");
                MonitorPanel.active();
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
            var $activeCompSwitch = $('.dagTab.active');
            if ($activeCompSwitch.length) {
                $activeCompSwitch.attr('data-original-title',
                                        TooltipTStr.OpenQG);
            }
        }

        StatusMessage.updateLocation();
        $('.tableDonePopupWrap').remove();
    }

    function openMenu($curTab, noAnim) {
        
        var id = $curTab.attr("id");
        $mainMenu.find(".commonSection").removeClass("active").filter(function() {
            return $(this).data("tab") === id;
        }).addClass("active");
        if ($('#bottomMenu').hasClass('open') && !BottomMenu.isPoppedOut()) {
            noAnim = true;
        }
        checkAnim(noAnim, true);
        $mainMenu.addClass('open').removeClass('closed');
        $mainMenu.width(currWidth);

        var mainMenuOpening = true;
        BottomMenu.close(mainMenuOpening);
        $('#container').addClass('mainMenuOpen');
        isMenuOpen = true;
        $curTab.addClass('mainMenuOpen');
        clearTimeout(slideTimeout);

        // recenter table titles if on workspace panel
        if (!noAnim && $('#workspacePanel').hasClass('active')) {
            $('#mainFrame').addClass('scrollLocked');
            hideOffScreenTables();
            moveTableTitles(null, {
                "offset"       : 285,
                "menuAnimating": true,
                "animSpeed"    : delay
            });
            setTimeout(function() {
                unhideOffScreenTables();
                moveTableTitles();
                moveTableDropdownBoxes();
                moveFirstColumn();
                $('#mainFrame').removeClass('scrollLocked');
            }, delay + 50);
        }
    }

    // makeInactive is used in "noWorkbook" mode
    function closeMenu($curTab, noAnim, makeInactive) {
        checkAnim(noAnim);
        $mainMenu.removeClass("open");
        $mainMenu.width(defaultWidth);
        $mainMenu.find(".commonSection").removeClass("active");
        
        $('#container').removeClass('mainMenuOpen');
        $curTab.removeClass('mainMenuOpen');
        isMenuOpen = false;

        setCloseTimer(noAnim);

        if (makeInactive) {
            $curTab.removeClass('active');
        }

        // recenter table titles if on workspace panel
        if (!noAnim && $('#workspacePanel').hasClass('active')) {
            hideOffScreenTables({marginRight: openOffset});
            $('#mainFrame').addClass('scrollLocked');
            moveTableTitles(null, {
                "offset"       : -285,
                "menuAnimating": true,
                "animSpeed"    : delay
            });
            setTimeout(function() {
                unhideOffScreenTables();
                moveTableTitles();
                moveTableDropdownBoxes();
                moveFirstColumn();
                $('#mainFrame').removeClass('scrollLocked');
            }, delay + 50);
        }
    }

    // turns off animation during open or close
    function checkAnim(noAnim) {
        $mainMenu.removeClass('noAnim');
        $('#container').removeClass('noMenuAnim');
        if (noAnim) {
            $mainMenu.addClass('noAnim');
            $('#container').addClass('noMenuAnim');
            setTimeout(function() {
                $mainMenu.removeClass('noAnim');
                $('#container').removeClass('noMenuAnim');
            }, delay + 50);
        }
    }

    function toggleMenu($curTab) {
        if ($mainMenu.hasClass('open')) {
            closeMenu($curTab);
        } else {
            openMenu($curTab);
        }
    }

    function setCloseTimer(noAnim) {
        if (noAnim) {
            $mainMenu.addClass('closed');
        } else {
            slideTimeout = setTimeout(function() {
                $mainMenu.addClass('closed');
            }, delay);
        }
    }

    return (MainMenu);
}(jQuery, {}));
