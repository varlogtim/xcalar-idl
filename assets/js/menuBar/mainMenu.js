window.MainMenu = (function($, MainMenu) {
    var delay = 200;
    var $menuBar; // $('#menuBar');
    var $mainMenu; // $('#mainMenu');
    var slideTimeout; // setTimeout for setting closed state after animation finishes
    var isMenuOpen = false;
    MainMenu.setup = function() {
        $menuBar = $('#menuBar');
        $mainMenu = $('#mainMenu');
        setupTabbing();
        setupBtns();
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

    MainMenu.close = function(bottomOpening) {
        closeMenu($menuBar.find(".topMenuBarTab.active"), bottomOpening);
    };

    MainMenu.switchSubTab = function(newTab) {
        
    };

    // checks main menu and bottom menu
    // xx add option to check which menu is open
    MainMenu.isMenuOpen = function() {
        return (isMenuOpen || BottomMenu.isMenuOpen());
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
            var $curTab = $(this);

            if ($curTab.hasClass("active")) {
                var $target = $(event.target);
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

            $tabs.removeClass("active");
            $curTab.addClass("active");

            var noAnim = true;
            if ($curTab.hasClass('mainMenuOpen')) {
                openMenu($curTab, noAnim);
            } else {
                closeMenu($curTab, noAnim);
            }

            panelSwitchingHandler($curTab, lastTabId);
            
            StatusMessage.updateLocation();
            $('.tableDonePopupWrap').remove();
        });
    }

    function panelSwitchingHandler($curTab, lastTabId) {
        $('.mainPanel').removeClass('active');
        var curTab = $curTab.attr('id');

        switch (curTab) {
            case ("workspaceTab"):
                $("#workspacePanel").addClass("active");
                WSManager.focusOnWorksheet();
                break;
            case ("schedulerTab"):
                $('#schedulerPanel').addClass("active");
                break;
            case ("dataStoresTab"):
                $("#datastorePanel").addClass("active");
                DSTable.refresh();
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
            case ("extensionTab"):
                $('#extensionPanel').addClass("active");
                ExtensionPanel.active();
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
    }

    function openMenu($curTab, noAnim) {
        $mainMenu.addClass('open').removeClass('closed');

        var id = $curTab.attr("id");
        $mainMenu.find(".commonSection").removeClass("active").filter(function() {
            return $(this).data("tab") === id;
        }).addClass("active");
        if ($('#bottomMenu').hasClass('open')) {
            noAnim = true;
        }
        checkAnim(noAnim, true);
        var mainMenuOpening = true;
        BottomMenu.close(mainMenuOpening);
        $('#container').addClass('mainMenuOpen');
        isMenuOpen = true;
        $curTab.addClass('mainMenuOpen');
        clearTimeout(slideTimeout);

        // recenter table titles if on workspace panel
        if (!noAnim && $('#workspacePanel').hasClass('active')) {
            moveTableTitles(null, {offset: 285, menuAnimating: true, animSpeed: delay});
        }
    }

    function closeMenu($curTab, noAnim) {
        $mainMenu.removeClass("open");
        $mainMenu.find(".commonSection").removeClass("active");
        checkAnim(noAnim);
        $('#container').removeClass('mainMenuOpen');
        isMenuOpen = false;
        $curTab.removeClass('mainMenuOpen');
        setCloseTimer(noAnim);
        // recenter table titles if on workspace panel
        if (!noAnim && $('#workspacePanel').hasClass('active')) {
            moveTableTitles(null, {offset: -285, menuAnimating: true, animSpeed: delay});
        }
    }

    // turns off animation during open or close
    function checkAnim(noAnim, isOpening) {
        $mainMenu.removeClass('noAnim');
        $('#container').removeClass('noMenuAnim');
        if (noAnim) {
            $mainMenu.addClass('noAnim');
            $('#container').addClass('noMenuAnim')
            setTimeout(function() {
                $mainMenu.removeClass('noAnim');
                $('#container').removeClass('noMenuAnim');
            }, delay);
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
