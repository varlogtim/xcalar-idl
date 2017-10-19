/// <reference path="../../Scripts/MadCapGlobal.js" />
/// <reference path="../../Scripts/MadCapUtilities.js" />
/// <reference path="../../Scripts/MadCapDom.js" />
/// <reference path="../../Scripts/MadCapXhr.js" />
/// <reference path="MadCapHelpSystem.js" />

/*!
 * Copyright MadCap Software
 * http://www.madcapsoftware.com/
 * Unlicensed use is strictly prohibited
 *
 * v13.3.6494.23016
 */


(function () {
    MadCap.WebHelp = MadCap.CreateNamespace("WebHelp");

    var previewMode = window.external && window.external.attached && window.external.attached(); // Previewing style changes in the skin editor
    var isTriPane = MadCap.Utilities.HasRuntimeFileType("TriPane");

    MadCap.WebHelp.TocPane = function (runtimeFileType, helpSystem, rootUl, canSync) {
        var mSelf = this;
        this._Init = false;
        this._RuntimeFileType = runtimeFileType;
        this._RootUl = rootUl;
        this._CanSync = canSync;
        this._HelpSystem = helpSystem;
        this._TocFile = this._RuntimeFileType == "Toc" ? this._HelpSystem.GetTocFile() : this._HelpSystem.GetBrowseSequenceFile();
        this._LoadedNodes = [];
        this._NodesWithChildrenLoaded = [];
        this._TocType = null;
        this._TocPath = null;
        this._TocHref = null;

        MadCap.Utilities.CrossFrame.AddMessageHandler(this.OnMessage, this);

        this._Initializing = false;
        this._InitOnCompleteFuncs = new Array();

        this.TreeNode_Expand = function (e) {
            var target = e.target;
            var offCanvasMenu = mSelf._IsOffCanvasMenu ? $('ul.menu[data-drilldown], ul.menu[data-accordion-menu]') : null;
            
            var liEl = $(target).closest("li")[0];

            if (liEl == null)
                return;

            var $liEl = $(liEl);
            var isTreeNodeLeaf = $liEl.hasClass(mSelf._TreeNodeLeafClass);

            var node = mSelf._LoadedNodes[$liEl.attr('data-mc-id')];
            var currentSkin = mSelf._HelpSystem.GetCurrentSkin()

            if (mSelf._IsTopNavMenu && mSelf._HelpSystem.NodeDepth(node) > mSelf._MaxDepth)
                return;

            if (!isTreeNodeLeaf)
                $liEl.toggleClass(mSelf._TreeNodeExpandedClass).toggleClass(mSelf._TreeNodeCollapsedClass);

            var $imgEl = $liEl.find("> div img");
            var alt2 = $imgEl.attr("data-mc-alt2");
            var alt = $imgEl.attr("alt");

            if (alt2 != "") {
                $imgEl.attr("alt", alt2);
                $imgEl.attr("data-mc-alt2", alt);
            }

            if (mSelf._IncludeIndicator) { // if tripane
                var $aEl = $liEl.find("> div a");
                if ($aEl[0] != null) {
                    var href = $aEl.attr("href");

                    if (!MadCap.String.IsNullOrEmpty(href))
                        mSelf._SelectNode(liEl);

                    // if the click didn't occur on the <a> itself, handle it ourselves
                    if ($aEl[0] != target) {
                        var frameName = $aEl.attr("target");

                        if (!MadCap.String.IsNullOrEmpty(href)) {
                            if (frameName != null)
                                window.open(href, frameName);
                            else
                                document.location.href = href;
                        }
                    }
                }
            }

            if (typeof node.n == 'undefined' || node.n.length == 0) { // leaf
                node.childrenLoaded = true;
                mSelf._NodesWithChildrenLoaded.push(node);
            }

            if (mSelf._NodesWithChildrenLoaded.indexOf(node) === -1) {
                var $a = $('a', $liEl).first();
                var $ul = $('<ul/>');
                var $subMenuClass = $(mSelf._RootUl).attr("data-mc-css-sub-menu") || "tree inner";
                $ul.addClass($subMenuClass);
                if (previewMode) {
                    $ul.attr('data-mc-style', "Navigation Panel Item");
                }

                if (mSelf._IsOffCanvasMenu &&
                    currentSkin.WebHelpOptions &&
                    currentSkin.WebHelpOptions.OffCanvasMenuStyle == "Accordion") {
                    $ul.css('display', 'none');
                }

                mSelf.LoadTocChildren(node, $ul, function () {
                    $liEl.append($ul);

                    if (mSelf._IsTopNavMenu && $liEl.hasClass(mSelf._TreeNodeHasChildrenClass)) {
                        if ($ul.length) {
                            var width = $ul.width();
                            var isRtl = $('html').attr('dir') == 'rtl';
                            var availWidth = isRtl ? $liEl.offset().left : $(window).width() - $liEl.offset().left - $liEl.width();
                            var cssClass = isRtl ? 'openRight' : 'openLeft';

                            $ul.toggleClass(cssClass, width > availWidth);
                        }
                    }

                    if (mSelf._DeferExpandEvent) {
                        setTimeout(function () {
                            if (currentSkin.WebHelpOptions &&
                                currentSkin.WebHelpOptions.OffCanvasMenuStyle == "Accordion") {
                                Foundation.Nest.Feather($liEl.children('.is-accordion-submenu'), 'accordion');
                                offCanvasMenu.foundation('down', $liEl.children('.is-accordion-submenu'));
                            } else {
                                Foundation.Nest.Feather(offCanvasMenu, 'drilldown');
                                offCanvasMenu.foundation('_show', $liEl);
                            }
                        }, 100);
                    }
                });

                if (mSelf._DeferExpandEvent) {
                    e.stopImmediatePropagation();
                    return false;
                }
            }

            // forces the content body to slide over thereby "navigating" to the selected topic
            // caveat: only works for tree node leafs
            if (isTreeNodeLeaf) {
                
                // maintain selected skin
                if (!isTriPane)
                    MadCap.Utilities.Url.OnNavigateTopic.call(target, e);
            } else {
                if (mSelf._IsOffCanvasMenu && currentSkin.WebHelpOptions) {
                    if (currentSkin.WebHelpOptions.OffCanvasMenuStyle && currentSkin.WebHelpOptions.OffCanvasMenuStyle == "Accordion") {
                        offCanvasMenu.foundation('toggle', $liEl.children('.is-accordion-submenu'));
                    } else {
                        offCanvasMenu.foundation('_show', $liEl);
                    }
                    return false;
                } else {
                    return true;
                }
            }
        };

        this.TopNavigationMenuItem_MouseEnter = function (e) {
            var $li = $(e.currentTarget).closest('li');
            var $subMenu = $li.children('ul').first();
            if ($subMenu.length) {
                var width = $subMenu.width();
                var isRtl = $('html').attr('dir') == 'rtl';
                var availWidth = isRtl ? $li.offset().left : $(window).width() - $li.offset().left - $li.width();
                var cssClass = isRtl ? 'openRight' : 'openLeft';

                $subMenu.toggleClass(cssClass, width > availWidth);
            }
        };
    };

    var TocPane = MadCap.WebHelp.TocPane;

    TocPane.prototype.OnMessage = function (message, dataValues, responseData) {
        var returnData = { Handled: false, FireResponse: true };

        if (message == "sync-toc") {
            var tocType = dataValues[0];
            var tocPath = dataValues[1];
            var href = new MadCap.Utilities.Url(dataValues[2]);

            if (this._CanSync && (tocType == null || tocType == this._RuntimeFileType)) {
                this.SyncTOC(tocPath, href);
                returnData.Handled = true;
            }
        }

        return returnData;
    };

    TocPane.prototype.Init = function (OnCompleteFunc) {
        if (this._Init) {
            if (OnCompleteFunc != null)
                OnCompleteFunc();

            return;
        }

        if (OnCompleteFunc != null)
            this._InitOnCompleteFuncs.push(OnCompleteFunc);

        if (this._Initializing)
            return;

        this._Initializing = true;

        //

        var $rootUl = $(this._RootUl);

        this._IsOffCanvasMenu = $rootUl.hasClass("off-canvas-list");
        this._IsTopNavMenu = MadCap.Dom.GetAttributeBool(this._RootUl, "data-mc-top-nav-menu", false);
        this._IsSideMenu = MadCap.Dom.GetAttributeBool(this._RootUl, "data-mc-side-menu", false);
        
        if (this._IsTopNavMenu) {
            this._TreeNodeHasChildrenClass = $rootUl.attr("data-mc-css-tree-node-has-children") || "has-children";
        } else {
            this._TreeNodeClass = $rootUl.attr("data-mc-css-tree-node") || "tree-node";
            this._TreeNodeCollapsedClass = $rootUl.attr("data-mc-css-tree-node-collapsed") || "tree-node-collapsed";
            this._TreeNodeExpandedClass = $rootUl.attr("data-mc-css-tree-node-expanded") || "tree-node-expanded";
            this._TreeNodeLeafClass = $rootUl.attr("data-mc-css-tree-node-leaf") || "tree-node-leaf";
            this._TreeNodeSelectedClass = $rootUl.attr("data-mc-css-tree-node-leaf") || "tree-node-selected";
        }

        this._SubMenuClass = $rootUl.attr("data-mc-css-sub-menu") || "tree inner";

        this._IncludeBack = MadCap.Dom.GetAttributeBool(this._RootUl, "data-mc-include-back", false);
        this._IncludeParentLink = MadCap.Dom.GetAttributeBool(this._RootUl, "data-mc-include-parent-link", false);
        this._IncludeIcon = MadCap.Dom.GetAttributeBool(this._RootUl, "data-mc-include-icon", true);
        this._IncludeIndicator = MadCap.Dom.GetAttributeBool(this._RootUl, "data-mc-include-indicator", true);
        this._DeferExpandEvent = MadCap.Dom.GetAttributeBool(this._RootUl, "data-mc-defer-expand-event", false);

        this._ExpandEvent = $rootUl.attr("data-mc-expand-event") || (this._IsSideMenu ? null : "click");
        this._BackLink = $rootUl.attr("data-mc-back-link") || "Back";
        this._MaxDepth = parseInt($rootUl.attr("data-mc-max-depth")) || 1;

        this._IncludeParent = MadCap.Dom.GetAttributeBool(this._RootUl, "data-mc-include-parent", false);
        this._IncludeSiblings = MadCap.Dom.GetAttributeBool(this._RootUl, "data-mc-include-siblings", false);
        this._IncludeChildren = MadCap.Dom.GetAttributeBool(this._RootUl, "data-mc-include-children", false);
        this._IsContextSensitive = MadCap.Dom.GetAttributeBool(this._RootUl, "data-mc-is-context-sensitive", false);

        this._LinkedToc = $rootUl.attr("data-mc-linked-toc");

        var mSelf = this;

        $rootUl.attr("data-mc-chunk", "Data/" + this._RuntimeFileType + ".xml");

        this.CreateToc(this._RootUl, function () {
            mSelf._Init = true;

            for (var i = 0; i < mSelf._InitOnCompleteFuncs.length; i++) {
                mSelf._InitOnCompleteFuncs[i]();
            }
        });
    };

    TocPane.prototype.CreateToc = function (rootUl, OnCompleteFunc) {
        var hasToc = true;

        if (this._RuntimeFileType == "Toc")
            hasToc = this._HelpSystem.HasToc;
        else
            hasToc = this._HelpSystem.HasBrowseSequences;

        if (!hasToc) {
            if (OnCompleteFunc != null)
                OnCompleteFunc();

            return;
        }

        var self = this;

        self._HelpSystem.LoadToc([this._RuntimeFileType, this._LinkedToc]).then(function (toc) {
            var $ul = $(rootUl);

            var tocDeferred = [];
            for (var i = 0; i < toc.chunks.length; i++) {
                if (!toc.chunks[i].loaded)
                    tocDeferred.push(self._HelpSystem.LoadTocChunk(toc, i));
            }

            if (previewMode) {
                $ul.attr('data-mc-style', "Navigation Panel Item");
            }

            // finish loading all tocChunks
            $.when.apply(this, tocDeferred).done(function () {
                if (self._IsTopNavMenu || self._IsOffCanvasMenu || isTriPane) {
                    self.LoadTocChildren(toc.tree, $ul, function () {
                        $ul.children("li.placeholder").remove();

                        this._Init = true;

                        if (OnCompleteFunc != null)
                            OnCompleteFunc();
                    });
                } else {
                    if (self._TocType) {
                        self._HelpSystem.FindNode(self._TocType, self._TocPath, self._TocHref, function (node) {
                            self.TocNodeMenuCallback(node, $ul, toc, OnCompleteFunc);
                        }, self._LinkedToc);
                    } else {
                        self._HelpSystem.FindTocNode(null, self._TocHref, function (node) {
                            self.TocNodeMenuCallback(node, $ul, toc, OnCompleteFunc);
                        }, self._LinkedToc);
                    }
                }
            });

        });
    };

    TocPane.prototype.TocNodeMenuCallback = function (node, el, toc, OnCompleteFunc) {
        if (this._IsContextSensitive) {
            if (node) {
                this.LoadTocMenu(node, el, this._MaxDepth, OnCompleteFunc);
            } else {
                $(el).remove();

                if (OnCompleteFunc != null)
                    OnCompleteFunc();
            }
        } else {
            this.LoadTocMenuFromRoot(toc.tree, node, el, this._MaxDepth, OnCompleteFunc);
        }
    }

    TocPane.prototype.LoadTocChildren = function (node, el, OnCompleteFunc) {
        var length = typeof node.n !== 'undefined' ? node.n.length : 0; // n property holds child nodes
        var loaded = 0;
        var self = this;

        if (length == 0) {
            node.childrenLoaded = true;
            this._NodesWithChildrenLoaded.push(node);
        }

        if (this._NodesWithChildrenLoaded.indexOf(node) !== -1) {
            if (OnCompleteFunc)
                OnCompleteFunc();

            return;
        }

        if (node.parent) {
            if (this._IncludeBack) {
                var $li = $('<li class="js-drilldown-back"/>'); // Foundation 6 back class
                $li.addClass(this._TreeNodeClass);

                var $a = $('<a href="#" />');
                $a.text(this._BackLink);

                $a.on(this._ExpandEvent, function(e) {
                    var target = e.target;
                    var $ul = $li.parent('ul');
                    var drilldownMenu = $('ul.menu[data-drilldown]');
                    drilldownMenu.foundation('_back', $ul);
                    e.preventDefault();
                });

                $li.append($a);

                el.append($li);
            }

            if (this._IncludeParentLink && this._HelpSystem.GetTocEntryHref(node) != null) {
                var $li = $('<li/>');
                $li.addClass(this._TreeNodeClass);
                $li.addClass(this._TreeNodeLeafClass);

                el.append($li);

                this.LoadTocNode(node, $li, null);
            }
        }

        // Create elements
        for (var i = 0; i < length; i++) {
            var childNode = node.n[i];

            var $li = $('<li/>');
            $li.addClass(this._TreeNodeClass);
            $li.addClass(this._TreeNodeCollapsedClass);

            if (this._IsTopNavMenu && el.hasClass(this._SubMenuClass)) {
                $li.mouseenter(this.TopNavigationMenuItem_MouseEnter);
            }

            el.append($li);

            this.LoadTocNode(childNode, $li, function () {
                loaded++;

                if (loaded == length) {
                    node.childrenLoaded = true;
                    self._NodesWithChildrenLoaded.push(node);

                    if (OnCompleteFunc != null)
                        OnCompleteFunc();
                }
            });
        }
    }

    TocPane.prototype.LoadTocMenuFromRoot = function (rootNode, currNode, el, depth, OnCompleteFunc) {
        if (rootNode.n && depth != 0) {
            var loaded = 0;
            var length = rootNode.n.length;

            if (length == 0) {
                if (OnCompleteFunc != null)
                    OnCompleteFunc();
            }
        
            depth--;
            for (var i = 0; i < length; i++) {
                var childNode = rootNode.n[i];
                var $li = $('<li/>');
                el.append($li);
                var self = this;
                this.LoadTocNode(childNode, $li, function (workingNode) {
                    var $liChild = workingNode.el;
                    if (workingNode == currNode) {
                        self.SetTocMenuItemSelected($liChild);
                    }
                    if (workingNode.n) {
                        var $ul = $('<ul/>');
                        $ul.attr("class", "sub-menu");
                        $liChild.append($ul);
                        $liChild.attr("class", "has-children");
                        self.LoadTocMenuFromRoot(workingNode, currNode, $ul, depth, function() {
                            loaded++;
                            if (loaded == length) {
                                if (OnCompleteFunc != null)
                                    OnCompleteFunc();
                            }
                        });
                    } else {
                        loaded++;
                        if (loaded == length) {
                            if (OnCompleteFunc != null)
                                OnCompleteFunc();
                        }
                    }   
                    
                });
            }
        }
    }

    TocPane.prototype.LoadTocMenu = function (node, el, depth, OnCompleteFunc) {
        if (this._IncludeParent && node.parent.c !== undefined) {
            var $li = $('<li/>');
            el.append($li);
            var self = this;
            this.LoadTocNode(node.parent, $li, function () {
                var $ul = $('<ul/>');
                $li.append($ul);
                $li.attr("class", "has-children");
                $ul.attr("class", "sub-menu");
                if (self._IncludeSiblings) {
                    self.LoadTocMenuSiblings(node, $ul, depth, OnCompleteFunc);
                } else {
                    self.LoadTocSelectedMenu(node, $ul, depth, OnCompleteFunc);
                }
            });
        } else if (this._IncludeSiblings) {
            this.LoadTocMenuSiblings(node, el, depth, OnCompleteFunc);
        } else {
            this.LoadTocSelectedMenu(node, el, depth, OnCompleteFunc);
        }
    }

    TocPane.prototype.LoadTocSelectedMenu = function (node, el, depth, OnCompleteFunc) {
        var $li = $('<li/>');
        el.append($li);
        var self = this;
        this.LoadTocNode(node, $li, function () {
            self.SetTocMenuItemSelected($li);
            self.AddTocMenuChildren(node, $li, depth, OnCompleteFunc);
        });
    }

    TocPane.prototype.LoadTocMenuSiblings = function (node, el, depth, OnCompleteFunc) {
        var length = node.parent.n.length;
        var loaded = 0;
        for (var i = 0; i < node.parent.n.length; i++) {
            var childNode = node.parent.n[i];
            var $li = $('<li/>');
            el.append($li);

            var self = this;
            this.LoadTocNode(childNode, $li, function (workingNode) {
                if (workingNode == node) {
                    var $liChild = node.el;
                    self.SetTocMenuItemSelected($liChild);
                    self.AddTocMenuChildren(node, $liChild, depth, function() {
                        loaded++;
                        if (loaded == length) {
                            if (OnCompleteFunc)
                                OnCompleteFunc();
                        }
                    });
                } else {
                    loaded++;
                    if (loaded == length) {
                        if (OnCompleteFunc)
                            OnCompleteFunc();
                    }
                }
            });
        }
    }

    TocPane.prototype.SetTocMenuItemSelected = function (el) {
        var $a = $(el).find("a");
        $a.addClass("selected");
    }

    TocPane.prototype.AddTocMenuChildren = function (node, el, depth, OnCompleteFunc) {
        if (this._IncludeChildren && node.n) {
            depth--;
            var $ul = $('<ul/>');
            el.append($ul);
            el.attr("class", "has-children");
            this.LoadTocMenuChildren(node, $ul, depth, OnCompleteFunc);
            $ul.attr("class", "sub-menu");
        } else {
            if (OnCompleteFunc)
                OnCompleteFunc();
        }
    }

    TocPane.prototype.LoadTocMenuChildren = function (node, el, depth, OnCompleteFunc) {
        var length = node.n.length;
        var loaded = 0;
        if (length == 0) {
            if (OnCompleteFunc)
                OnCompleteFunc();
        }

        for (var i = 0; i < length; i++) {
            var childNode = node.n[i];
            var $li = $('<li/>');
            el.append($li);

            var self = this;
            this.LoadTocNode(childNode, $li, function (workingNode) {
                if (depth != 0) {
                    var $liChild = workingNode.el;
                    self.AddTocMenuChildren(workingNode, $liChild, depth, function() {  
                        loaded++;
                        if (loaded == length) {
                            if (OnCompleteFunc)
                                OnCompleteFunc();
                        }
                    });
                } else {
                    loaded++;
                    if (loaded == length) {
                        if (OnCompleteFunc)
                            OnCompleteFunc();
                    }
                }
            });
        }
    }

    TocPane.prototype.LoadTocNode = function (node, el, OnCompleteFunc) {
        var self = this;
        var toc = node.toc;

        this._HelpSystem.LoadTocChunk(toc, node.c).then(function (chunk) {
            var entry = toc.entries[node.i];
            var hasFrame = typeof node.f != 'undefined';
            var isLeaf = typeof node.n == 'undefined' || node.n.length == 0;
            var hasChildren = node.n !== undefined && node.n.length > 0;
            var tocType = self._CanSync && !hasFrame ? self._RuntimeFileType : null;
            var appendTocPath = self._HelpSystem.TopNavTocPath || isTriPane;
            var href = self._HelpSystem.GetTocEntryHref(node, tocType, self._CanSync, appendTocPath);

            var $a = $('<a/>');

            if (hasFrame) {
                $a.attr('target', node.f);
            }
            if (href != null) {
                $a.attr('href', href);
            }
            else {
                $a.attr('href', 'javascript:void(0);');
            }
            $a.text(entry.title);

            if (typeof node.s != 'undefined') { // class
                el.addClass(node.s);
            }

            if (isLeaf) {
                el.removeClass(self._TreeNodeCollapsedClass);
                el.addClass(self._TreeNodeLeafClass);
            }

            if (hasChildren && (self._IsTopNavMenu && self._HelpSystem.NodeDepth(node) <= self._MaxDepth)) {
                el.addClass(self._TreeNodeHasChildrenClass);
            }

            if (self._IncludeIcon) {
                // create transparent image
                var customClass = "default";
                var language = self._HelpSystem.Language;

                // check li for custom class
                for (className in language) {
                    if (el.hasClass(className)) {
                        customClass = className;
                        break;
                    }
                }

                var $img = $('<img/>');
                $img.attr('src', 'Skins/Default/Stylesheets/Images/transparent.gif');
                $img.addClass('toc-icon');
                if (self._IncludeIndicator && typeof node.w !== 'undefined' && node.w == 1) {
                    $img.attr('alt', language[customClass]['MarkAsNewIconAlternateText']);
                }
                else if (el.hasClass(self._TreeNodeLeafClass)) {
                    $img.attr('alt', language[customClass]['TopicIconAlternateText']);
                }
                else {
                    $img.attr('alt', language[customClass]['ClosedBookIconAlternateText']);
                    $img.attr('data-mc-alt2', language[customClass]['OpenBookIconAlternateText']);
                }
                if ($img.prop('src') != "") {
                    $a.prepend($img);
                }
            }

            if (self._IncludeIndicator) {
                var $div = $('<div/>');

                if (typeof node.w !== 'undefined' && node.w == 1) // mark as new
                    $div.append("<span class='new-indicator'></span>");

                var $span = $('<span class="label" />');

                $span.append($a);

                $div.append($span);

                $a = $div;
            }

            if (!self._IsContextSensitive)
                $a.on(self._ExpandEvent, self.TreeNode_Expand);

            node.el = el; // TODO: make el a collection for multiple elements referencing the same node (e.g. IncludeParentLink, multiple tocs on a page)

            el.append($a);
            el.attr('data-mc-id', self._LoadedNodes.length);

            self._LoadedNodes.push(node);

            if (OnCompleteFunc != null)
                OnCompleteFunc(node);
        });
    };

    TocPane.prototype.SyncTOC = function (tocPath, href) {
        var self = this;

        var selected = $("." + this._TreeNodeSelectedClass + " a", this._RootUl);

        if (selected.length > 0) {
            var link = selected[0];
            if (link.href === document.location.href)
                return;
        }

        this.Init(function () {
            function OnFoundNode(node) {
                if (typeof node !== 'undefined' && node != null) {
                    var loadNodes = [];
                    var loadNode = node;

                    while (typeof loadNode !== 'undefined' && (self._NodesWithChildrenLoaded.indexOf(loadNode) === -1)) {
                        loadNodes.unshift(loadNode);
                        loadNode = loadNode.parent;
                    }

                    MadCap.Utilities.AsyncForeach(loadNodes,
                            function (loadNode, callback) {
                                var $el = $(loadNode.el);

                                var $ul = $('<ul/>');
                                $ul.addClass(self._SubMenuClass);

                                self.LoadTocChildren(loadNode, $ul, function () {
                                    $el.append($ul);
                                    callback();
                                });
                            },
                            function () {
                                var el = node.el[0];
                                self._UnhideNode(el);
                                self._SelectNode(el);
                            }
                        );
                }
            }

            function FindNode(href) {
                self._HelpSystem.FindNode(self._RuntimeFileType, tocPath, href, function (node) {
                    if (!node) { // if we don't find a node, try looking for plain path
                        if (!MadCap.String.IsNullOrEmpty(href.Fragment) || !MadCap.String.IsNullOrEmpty(href.Query)) {
                            var url = new MadCap.Utilities.Url(href.PlainPath);
                            self._HelpSystem.FindNode(self._RuntimeFileType, tocPath, url, OnFoundNode, self._LinkedToc);
                        }
                    }
                    else {
                        OnFoundNode(node);
                    }
                }, self._LinkedToc);
            }

            var cshid = href.HashMap.GetItem('cshid');

            if (cshid != null) {
                self._HelpSystem.LookupCSHID(cshid, function (idInfo) {
                    var url = idInfo.Found ? new MadCap.Utilities.Url(idInfo.Topic).ToRelative(self._HelpSystem.GetContentPath()) 
                                           : new MadCap.Utilities.Url(self._HelpSystem.DefaultStartTopic);
                    FindNode(url);
                });
            }
            else {
                FindNode(href);
            }
        });
    };

    TocPane.prototype._UnhideNode = function (tocNode) {
        var parentTocNode = MadCap.Dom.GetAncestorNodeByTagName(tocNode, "li", this._RootUl);

        while (parentTocNode != null) {
            var $parentTocNode = $(parentTocNode);
            $parentTocNode.removeClass(this._TreeNodeCollapsedClass);
            $parentTocNode.addClass(this._TreeNodeExpandedClass);

            parentTocNode = MadCap.Dom.GetAncestorNodeByTagName(parentTocNode, "li", this._RootUl);
        }
    };

    TocPane.prototype.NavigateTopic = function (moveType) {
        var selectedNode = $("." + this._TreeNodeSelectedClass, this._RootUl)[0];

        if (selectedNode == null)
            selectedNode = $("." + this._TreeNodeClass, this._RootUl)[0];

        //

        if (this.NeedsCreateToc(selectedNode)) {
            var mSelf = this;

            this.CreateToc(selectedNode, function () {
                mSelf.NavigateTopic(moveType);
            });

            return;
        }

        //

        var nextNode = moveType == "previous" ? this._GetPrevious(selectedNode) : this._GetNext(selectedNode);

        if (nextNode == null)
            return;

        this._SelectNode(nextNode);

        var a = $("> div a", nextNode)[0];

        if (a != null)
            document.location.href = $(a).attr("href");

        this._UnhideNode(nextNode);
    };

    TocPane.prototype._SelectNode = function (node) {
        var $node = $(node);

        $("." + this._TreeNodeSelectedClass, this._RootUl).removeClass(this._TreeNodeSelectedClass);
        $node.addClass(this._TreeNodeSelectedClass);
        $node.scrollintoview();
    };

    TocPane.prototype._GetNext = function (node) {
        var $node = $(node);
        var treeNodeSelector = "." + this._TreeNodeClass;

        if ($node.find(treeNodeSelector).length > 0)
            return $node.find(treeNodeSelector)[0];

        if ($node.next(treeNodeSelector).length > 0)
            return $node.next(treeNodeSelector)[0];

        var $currAnc = $node;

        while (true) {
            var $anc = $($currAnc.parent().closest(treeNodeSelector, this._RootUl));

            if ($anc.length == 0)
                break;

            if ($anc.next(treeNodeSelector).length > 0)
                return $anc.next(treeNodeSelector)[0];

            $currAnc = $anc;
        }

        return null;
    };

    TocPane.prototype._GetPrevious = function (node) {
        var $node = $(node);
        var treeNodeSelector = "." + this._TreeNodeClass;

        var $prev = $node.prev(treeNodeSelector);

        if ($prev.length == 0) {
            if ($node.parent().closest(treeNodeSelector, this._RootUl).length > 0)
                return $node.parent().closest(treeNodeSelector, this._RootUl)[0];
            else
                return null;
        }

        if ($prev.find(treeNodeSelector).length > 0)
            return $prev.find(treeNodeSelector).last()[0];

        return $prev[0];
    };
})();
