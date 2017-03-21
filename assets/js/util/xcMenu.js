window.xcMenu = (function(xcMenu, $) {
    // adds default menu behaviors to menus passed in as arguments
    // behaviors include highlighting lis on hover, opening submenus on hover
    // options:
    //  keepOpen: if set true, main menu will not close when click the li
    xcMenu.add = function($mainMenu, options) {
        var $subMenu;
        var $allMenus = $mainMenu;
        var subMenuId = $mainMenu.data('submenu');
        var hideTimeout;
        var showTimeout;
        var subListScroller;
        options = options || {};

        if (subMenuId) {
            $subMenu = $('#' + subMenuId);
            $allMenus = $allMenus.add($subMenu);
            subListScroller = new MenuHelper($subMenu, {
                "scrollerOnly": true,
                "bottomPadding": 4
            });

            $subMenu.on('mousedown', '.subMenuArea', function(event) {
                if (event.which !== 1) {
                    return;
                }
                xcMenu.close($allMenus);
            });
            $subMenu.on('mouseenter', '.subMenuArea', function() {
                var className = $(this).siblings(':visible').attr('class');
                $mainMenu.find('.' + className).addClass('selected');
                clearTimeout(hideTimeout);
            });

            // prevents input from closing unless you hover over a different li
            // on the main column menu
            // $subMenu.find('input').on({
            $subMenu.on({
                "focus": function() {
                    $(this).parents('li').addClass('inputSelected')
                           .parents('.subMenu').addClass('inputSelected');
                },
                "blur": function() {
                    $(this).parents('li').removeClass('inputSelected')
                           .parents('.subMenu').removeClass('inputSelected');
                },
                "keyup": function() {
                    if ($subMenu.find('li.selected').length) {
                        return;
                    }
                    var $input = $(this);
                    $input.parents('li').addClass('inputSelected')
                    .parents('.subMenu').addClass('inputSelected');

                }
            }, 'input');

            $subMenu.on('mouseup', 'li', function(event) {
                if (event.which !== 1) {
                    return;
                }
                var $li = $(this);
                event.stopPropagation();

                if (!$li.hasClass('unavailable') &&
                    $li.closest('input').length === 0 &&
                    $li.closest('.clickable').length === 0) {
                    // hide li if doesnt have an input field
                    xcMenu.close($allMenus);
                    clearTimeout(showTimeout);
                }
            });

            $subMenu.on({
                "mouseenter": function() {
                    if ($(this).closest('.dropDownList').length) {
                        return;
                    }
                    $subMenu.find('li').removeClass('selected');

                    var $li = $(this);
                    var className = $li.parent().attr('class');
                    $mainMenu.find('.' + className).addClass('selected');
                    $li.addClass('selected');

                    if (!$li.hasClass('inputSelected')) {
                        $subMenu.find('.inputSelected').removeClass('inputSelected');
                    }
                    clearTimeout(hideTimeout);
                },
                "mouseleave": function() {
                    $subMenu.find('li').removeClass('selected');
                    var $li = $(this);
                    $li.find('.dropDownList').removeClass("open")
                        .find('.list').hide();
                    // $li.removeClass('selected');
                    $('.tooltip').remove();
                }
            }, "li");

            $subMenu.on('contextmenu', function(e) {
                e.preventDefault();
            });
        }

        $mainMenu.on('mouseup', 'li', function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            if ($li.hasClass('parentMenu')) {
                return;
            }
            event.stopPropagation();

            if (!$li.hasClass('unavailable') && !options.keepOpen) {
                // hide li if doesnt have a submenu or an input field
                xcMenu.close($allMenus);
                clearTimeout(showTimeout);
            }
        });

        $mainMenu.on({
            "mouseenter": function(event) {
                if ($mainMenu.hasClass('disableMouseEnter')) {
                    $mainMenu.removeClass('disableMouseEnter');
                    return;
                }
                var $li = $(this);
                $mainMenu.find('.selected').removeClass('selected');
                $mainMenu.addClass('hovering');
                $li.addClass('selected');
                var hasSubMenu = $li.hasClass('parentMenu');

                if (!hasSubMenu || $li.hasClass('unavailable')) {
                    if ($subMenu) {
                        if (event.keyTriggered) {
                            $subMenu.hide();
                        } else {
                            clearTimeout(hideTimeout);
                            hideTimeout = setTimeout(function() {
                                $subMenu.hide();
                            }, 150);
                        }
                    }
                    return;
                }

                clearTimeout(hideTimeout);
                var subMenuClass = $li.data('submenu');
                if (event.keyTriggered) { // mouseenter triggered by keypress
                    showSubMenu($li, subMenuClass);
                } else {
                    showTimeout = setTimeout(function() {
                        showSubMenu($li, subMenuClass);
                    }, 150);
                }

            },
            "mouseleave": function() {
                if ($mainMenu.hasClass('disableMouseEnter')) {
                    return;
                }
                $mainMenu.removeClass('hovering');
                $mainMenu.find('.selected').removeClass('selected');
                var $li = $(this);
                $li.children('ul').removeClass('visible');
                $('.tooltip').remove();
            }
        }, "li");

        $mainMenu.on('contextmenu', function(e) {
            e.preventDefault();
        });

        function showSubMenu($li, subMenuClass) {
            if ($li.hasClass('selected')) {
                $subMenu.show();
                var $targetSubMenu = $subMenu.find('.' + subMenuClass);
                var visible = false;
                if ($targetSubMenu.is(':visible')) {
                    visible = true;
                }
                $subMenu.children('ul').hide().css('max-height', 'none');
                $subMenu.find('li').removeClass('selected');
                $subMenu.css('max-height', 'none');
                $targetSubMenu.show();

                if (!visible) {
                    StatusBox.forceHide();
                }
                var top = $li.offset().top + 28;
                var left = $li.offset().left + 155;
                var shiftedLeft = false;

                // move submenu to left if overflowing to the right
                var viewportRight = $(window).width() - 5;
                if (left + $subMenu.width() > viewportRight) {
                    $subMenu.addClass('left');
                    shiftedLeft = true;
                    top -= 27;
                } else {
                    $subMenu.removeClass('left');
                }

                // move submenu up if overflowing to the bottom
                var viewportBottom = $(window).height();
                if (top + $subMenu.height() > viewportBottom) {
                    top -= $subMenu.height();
                    if (shiftedLeft) {
                        top += 27;
                    }
                }
                top = Math.max(2, top);

                $subMenu.css({left: left, top: top});
                $subMenu.find('.scrollArea').hide();
                subListScroller.showOrHideScrollers($targetSubMenu);
            }
        }

        if ($mainMenu.find('.scrollArea').length !== 0) {
            new MenuHelper($mainMenu, {
                $subMenu: $subMenu,
                scrollerOnly: true
            });
        }
    };

    xcMenu.close = function($menu) {
        $menu.hide();
        xcMenu.removeKeyboardNavigation();
    };

    // options:
    //      allowSelection: boolean, if true will not clear selected text
    xcMenu.addKeyboardNavigation = function($menu, $subMenu, options) {
        options = options || {};
        if (!options.allowSelection) {
            $('body').addClass('noSelection');
        }
        $(document).on('keydown.menuNavigation', function(event) {
            listHighlight(event);
        });
        var $lis = $menu.find('li:visible:not(.unavailable)');
        var numLis = $lis.length;

        function listHighlight(event) {
            var keyCodeNum = event.which;
            var direction;
            var lateral = false;
            var enter;

            switch (keyCodeNum) {
                case (keyCode.Up):
                    direction = -1;
                    break;
                case (keyCode.Down):
                    direction = 1;
                    break;
                case (keyCode.Left):
                    if ($(event.target).is('input')) {
                        if ($(event.target).attr('type') === "number") {
                            return;
                        }
                        if ($(event.target)[0].selectionStart !== 0) {
                            return;
                        }
                    }
                    lateral = true;
                    break;
                case (keyCode.Right):
                    if ($(event.target).is('input')) {
                        return;
                    }
                    lateral = true;
                    break;
                case (keyCode.Enter):
                    enter = true;
                    break;
                case (keyCode.Escape):
                case (keyCode.Backspace):
                    if ($(event.target).is('input')) {
                        return;
                    }
                    event.preventDefault();
                    xcMenu.close($menu.add($subMenu));
                    return;
                default:
                    return; // key not supported
            }

            if (!enter) {
                event.preventDefault();
            }

            var $highlightedLi = $lis.filter(function() {
                return ($(this).hasClass('selected'));
            });

            var $highlightedSubLi = "";
            var $subLis;
            var numSubLis;
            if ($subMenu) {
                $subLis = $subMenu.find('li:visible');
                numSubLis = $subLis.length;
                $highlightedSubLi = $subLis.filter('.selected');
            }

            if (enter) {
                if ($highlightedSubLi.length === 1) {
                    if (!$highlightedSubLi.hasClass('unavailable')) {
                        $highlightedSubLi.trigger(fakeEvent.mouseup);
                    }
                    return;
                } else if ($highlightedSubLi.length === 0 &&
                            $highlightedLi.length === 1) {
                    if (!$highlightedLi.hasClass('unavailable')) {
                        if ($highlightedLi.hasClass('parentMenu')) {
                            // if li has submenu, treat enter key as a
                            // right keypress
                            lateral = true;
                            keyCodeNum = keyCode.Right;
                        } else {
                            $highlightedLi.trigger(fakeEvent.mouseup);
                            return;
                        }
                    } else {
                        return;
                    }
                }
            }

            // if no visible lis, do not navigate up/down left/right
            if (!$lis.length) {
                return;
            }

            if (!lateral) { // up and down keys
                var index;
                var newIndex;
                if ($subMenu && $subMenu.is(':visible')) {
                    // navigate vertically through sub menu if it's open
                    if ($highlightedSubLi.length) {
                        if ($highlightedSubLi.hasClass('inputSelected')) {
                            // we don't want navigation if an input has focus
                            return;
                        }
                        index = $subLis.index($highlightedSubLi);
                        $highlightedSubLi.removeClass('selected');
                        newIndex = (index + direction + numSubLis) % numSubLis;
                        $highlightedSubLi = $subLis.eq(newIndex);
                    } else {
                        index = (direction === -1) ? (numSubLis - 1) : 0;
                        $highlightedSubLi = $subLis.eq(index);
                    }
                    $highlightedSubLi.addClass('selected');
                } else {
                    // navigate vertically through main menu
                    if ($highlightedLi.length) {// When a li is highlighted
                        index = $lis.index($highlightedLi);
                        $highlightedLi.removeClass('selected');
                        newIndex = (index + direction + numLis) % numLis;
                        $highlightedLi = $lis.eq(newIndex);
                    } else {
                        index = (direction === -1) ? (numLis - 1) : 0;
                        $highlightedLi = $lis.eq(index);
                    }
                    $highlightedLi.addClass('selected');

                    // adjust scroll position if newly highlighted li is not visible
                    var menuHeight = $menu.height();
                    var liTop = $highlightedLi.position().top;
                    var liHeight = 30;
                    var currentScrollTop;

                    if (liTop > menuHeight - liHeight) {
                        currentScrollTop = $menu.find('ul').scrollTop();
                        var newScrollTop = liTop - menuHeight + liHeight +
                                           currentScrollTop;
                        $menu.find('ul').scrollTop(newScrollTop);
                        if ($menu.hasClass('hovering')) {
                            $menu.addClass('disableMouseEnter');
                        }
                    } else if (liTop < 0) {
                        currentScrollTop = $menu.find('ul').scrollTop();
                        $menu.find('ul').scrollTop(currentScrollTop + liTop);
                        if ($menu.hasClass('hovering')) {
                            $menu.addClass('disableMouseEnter');
                        }
                    }
                }
            } else { // left or right key is pressed
                if (!$subMenu) { // if no submenu, do nothing
                    return;
                }
                if ($highlightedLi.length &&
                    $highlightedLi.hasClass('parentMenu')) {
                    var e;
                    // if mainmenu li is highlighted and has a submenu
                    if (keyCodeNum === keyCode.Right) {
                        if ($subMenu.is(':visible')) {
                            if (!$highlightedSubLi.length) {
                                // select first sub menu li if sub menu is open
                                // but no sub menu li is highlighted
                                e = $.Event('mouseenter');
                                e.keyTriggered = true;
                                $highlightedLi.trigger(e);
                                $subLis = $subMenu.find('li:visible');
                                $subLis.eq(0).mouseover();
                                if ($subLis.find('input').length > 0) {
                                    $subLis.find('input').eq(0).focus();
                                }
                            } else {
                                // close menus if sub menu li is already highlighted
                                xcMenu.close($menu.add($subMenu));
                            }
                        } else {
                            // open submenu and highlight first li
                            e = $.Event('mouseenter');
                            e.keyTriggered = true;
                            $highlightedLi.trigger(e);
                            $subLis = $subMenu.find('li:visible');
                            $subLis.eq(0).mouseover();
                            if ($subLis.find('input').length > 0) {
                                $subLis.find('input').eq(0).focus();
                            }
                        }
                    } else { // left key is pressed
                        if ($subMenu.is(':visible')) { // if submenu open, hide it
                            $subMenu.hide();
                        } else { // if no submenu is open, close all menus
                            xcMenu.close($menu);
                        }
                    }
                } else {
                    xcMenu.close($menu.add($subMenu));
                }
            }
        }
    };

    xcMenu.removeKeyboardNavigation = function() {
        $(document).off('keydown.menuNavigation');
        $('body').removeClass('noSelection');
    };

    return (xcMenu);
}({}, jQuery));