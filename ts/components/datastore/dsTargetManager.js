window.DSTargetManager = (function($, DSTargetManager) {
    var targetSet = {};
    var typeSet = {};
    var $gridView;
    var $targetCreateCard;
    var $targetInfoCard;
    var $targetTypeList;

    DSTargetManager.setup = function() {
        $gridView = $("#dsTarget-list .gridItems");
        $targetCreateCard = $("#dsTarget-create-card");
        $targetInfoCard = $("#dsTarget-info-card");
        $targetTypeList = $("#dsTarget-type");

        addEventListeners();
        setupGridMenu();
    };

    DSTargetManager.getTarget = function(targetName) {
        return targetSet[targetName];
    };

    DSTargetManager.getAllTargets = function() {
        return targetSet;
    };

    DSTargetManager.isGeneratedTarget = function(targetName) {
        var target = DSTargetManager.getTarget(targetName);
        if (target && target.type_id === "memory") {
            return true;
        } else {
            return false;
        }
    };

    DSTargetManager.isPreSharedTarget = function(targetName) {
        var target = DSTargetManager.getTarget(targetName);
        if (target && target.type_id === "sharednothingsymm") {
            return true;
        } else {
            return false;
        }
    };

    DSTargetManager.isSlowPreviewTarget = function(targetName) {
        // azblobenviron, azblobfullaccount, gcsenviron
        var target = DSTargetManager.getTarget(targetName);
        var idLists = ["gcsenviron"];
        if (target && idLists.includes(target.type_id)) {
            return true;
        } else {
            return false;
        }
    };

    DSTargetManager.refreshTargets = function(noWaitIcon) {
        var deferred = PromiseHelper.deferred();
        var updateTargetMenu = function(targets) {
            var html = targets.map(function(targetName) {
                return "<li>" + targetName + "</li>";
            }).join("");
            $("#dsForm-targetMenu ul").html(html);
            JupyterUDFModal.refreshTarget(html);

            var $input = $("#dsForm-target input");
            var targetName = $input.val();
            if (DSTargetManager.getTarget(targetName) == null) {
                $input.val("");
            }
        };
        var updateNumTargets = function(num) {
            $(".numDSTargets").html(num);
        };
        if (!noWaitIcon) {
            xcHelper.showRefreshIcon($("#dsTarget-list"));
        }

        var $activeIcon = $gridView.find(".target.active");
        var activeName;
        if ($activeIcon.length) {
            activeName = $activeIcon.data("name");
        }

        XcalarTargetList()
        .then(function(targetList) {
            var targets = cacheTargets(targetList);
            updateTargetMenu(targets);
            updateTargetGrids(targets, activeName);
            updateNumTargets(targets.length);
            deferred.resolve(targetList);
        })
        .fail(deferred.reject);


        return deferred.promise();
    };

    DSTargetManager.getTargetTypeList = function() {
        var deferred = PromiseHelper.deferred();
        var updateTargetType = function(typeList) {
            var html = typeList.map(function(typeId) {
                return '<li data-id="' + typeId + '">' +
                            typeSet[typeId].type_name +
                        '</li>';
            }).join("");
            $targetTypeList.find("ul").html(html);
        };

        $targetCreateCard.addClass("loading");
        XcalarTargetTypeList()
        .then(function(typeList) {
            typeList.forEach(function(targetType) {
                typeSet[targetType.type_id] = targetType;
            });
            updateTargetType(Object.keys(typeSet).sort());
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(function() {
            $targetCreateCard.removeClass("loading");
        });

        var promise = deferred.promise();
        xcHelper.showRefreshIcon($targetCreateCard, null, promise);
        return promise;
    };

    DSTargetManager.clickFirstGrid = function() {
        $gridView.find(".target").eq(0).click();
    };

    DSTargetManager.isSparkParquet = function(targetName) {
        var target = DSTargetManager.getTarget(targetName);
        if (target && target.type_id === "sparkparquet") {
            return true;
        } else {
            return false;
        }
    };

    function addEventListeners() {
        $("#dsTarget-refresh").click(function() {
            DSTargetManager.refreshTargets();
        });

        $("#dsTarget-create").click(function() {
            if (!$("#datastoreMenu").hasClass("noAdmin")) {
                showTargetCreateView();
            }
        });

        $("#dsTarget-delete").click(function() {
            var $grid = $gridView.find(".grid-unit.active");
            deleteTarget($grid);
        });

        $gridView.on("click", ".grid-unit", function() {
            // event.stopPropagation(); // stop event bubbling
            selectTarget($(this));
        });

        new MenuHelper($targetTypeList, {
            "onSelect": function($li) {
                var typeId = $li.data("id");
                var $input = $targetTypeList.find(".text");
                if ($input.data("id") === typeId) {
                    return;
                }
                $input.data("id", typeId).val($li.text());
                selectTargetType(typeId);
                StatusBox.forceHide();
            },
            "container": "#dsTarget-create-card",
            "bounds": "#dsTarget-create-card"
        }).setupListeners();

        $("#dsTarget-submit").click(function(event) {
            event.preventDefault();
            submitForm();
        });

        $("#dsTarget-reset").click(function() {
            var $form = $("#dsTarget-form");
            $form.find(".description").addClass("xc-hidden")
                 .find("#dsTarget-description").empty();
            $form.find(".params").addClass("xc-hidden")
                 .find(".formContent").empty();
            $("#dsTarget-type .text").val("").removeData("id");
            $("#dsTarget-name").val("").focus();
        });
    }

    function setupGridMenu() {
        var $gridMenu = $("#dsTarget-menu");
        xcMenu.add($gridMenu);

        $gridView.closest(".mainSection").contextmenu(function(event) {
            var $target = $(event.target);
            var $grid = $target.closest(".grid-unit");
            var classes = "";
            clearSelectedTarget();

            if ($grid.length) {
                $grid.addClass("selected");
                $gridMenu.data("grid", $grid);
                $(document).on("mouseup.gridSelected", function(event) {
                    // do not deselect if mouseup is on the menu or menu open
                    if (!$(event.target).closest("#dsTarget-menu").length &&
                        !$gridMenu.is(":visible")) {
                        clearSelectedTarget();
                        $(document).off("mouseup.gridSelected");
                    }
                });
                classes += " targetOpts";
            } else {
                classes += " bgOpts";
            }
            var $deleteLi = $gridMenu.find('.targetOpt[data-action="delete"]');
            if (isDefaultTarget($grid.data("name")) || (!Admin.isAdmin())) {
                $deleteLi.addClass("unavailable");
                xcTooltip.add($deleteLi, {
                    title: DSTargetTStr.NoDelete
                });
            } else {
                $deleteLi.removeClass("unavailable");
                xcTooltip.remove($deleteLi);
            }

            xcHelper.dropdownOpen($target, $gridMenu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "classes": classes,
                "floating": true
            });
            return false;
        });

        $gridMenu.on("mouseup", "li", function(event) {
            if (event.which !== 1) {
                return;
            }
            var action = $(this).data("action");
            if (!action) {
                return;
            }
            if ($(this).hasClass("unavailable")) {
                return;
            }

            switch (action) {
                case ("view"):
                    selectTarget($gridMenu.data("grid"));
                    break;
                case ("delete"):
                    deleteTarget($gridMenu.data("grid"));
                    break;
                case ("create"):
                    showTargetCreateView();
                    break;
                case ("refresh"):
                    DSTargetManager.refreshTargets();
                    break;
                default:
                    console.warn("menu action not recognized:", action);
                    break;
            }
            clearSelectedTarget();
        });
    }

    function isDefaultTarget(targetName) {
        var defaultTargetList = ["Default Shared Root",
                                "Preconfigured Azure Storage Account",
                                "Preconfigured Google Cloud Storage Account",
                                "Preconfigured S3 Account"];
        return defaultTargetList.includes(targetName);
    }

    function cacheTargets(targetList) {
        targetSet = {};
        targetList.forEach(function(target) {
            targetSet[target.name] = target;
        });
        return Object.keys(targetSet).sort();
    }

    function updateTargetGrids(targets, activeTargetName) {
        var getGridHtml = function(targetName) {
            var html =
                '<div class="target grid-unit" ' +
                'data-name="' + targetName + '">' +
                    '<div class="gridIcon">' +
                        '<i class="icon xi-data-target"></i>' +
                    '</div>' +
                    '<div class="label" data-dsname="' + targetName +
                    '" data-toggle="tooltip" data-container="body"' +
                    ' data-placement="right" title="' + targetName + '">' +
                        targetName +
                    '</div>' +
                '</div>';
            return html;
        };
        var html = targets.map(getGridHtml).join("");
        $gridView.html(html);
        if (activeTargetName) {
            var $activeGrid = $gridView.find('.target[data-name="' +
                                             activeTargetName + '"]');
            if (!$activeGrid.length) {
                showTargetCreateView();
            } else {
                $activeGrid.addClass("active");
            }
        }
    }

    function clearSelectedTarget() {
        $gridView.find(".grid-unit.selected").removeClass("selected");
    }

    function clearActiveTarget() {
        $gridView.find(".grid-unit.active").removeClass("active");
    }

    function selectTarget($grid) {
        clearSelectedTarget();
        if ($grid.hasClass("active")) {
            return;
        }
        clearActiveTarget();
        $grid.addClass("active");
        showTargetInfoView($grid.data("name"));
    }

    function showTargetCreateView() {
        clearActiveTarget();
        if ($targetCreateCard.hasClass("xc-hidden")) {
            $targetCreateCard.removeClass("xc-hidden");
            $targetInfoCard.addClass("xc-hidden");
            resetForm();
        } else {
            $("#dsTarget-name").focus();
        }
    }

    function showTargetInfoView(targetName) {
        $targetCreateCard.addClass("xc-hidden");
        $targetInfoCard.removeClass("xc-hidden");

        var target = targetSet[targetName];
        var $form = $targetInfoCard.find("form");

        $form.find(".name .text").text(target.name);
        $form.find(".type .text").text(target.type_name);

        var $paramSection = $form.find(".params");
        var paramKeys = Object.keys(target.params).sort();
        if (paramKeys.length === 0) {
            $paramSection.addClass("xc-hidden");
        } else {
            var paramHtml = paramKeys.map(function(paramName) {
                var paramVal = target.params[paramName];
                if (typeof paramVal !== "string") {
                    paramVal = JSON.stringify(paramVal);
                }
                return '<div class="formRow">' +
                            '<label>' + paramName + ':</label>' +
                            '<span class="text">' +
                                paramVal +
                            '</span>' +
                        '</div>';
            }).join("");

            $paramSection.removeClass("xc-hidden")
                         .find(".formContent").html(paramHtml);
        }

        var $deletBtn = $("#dsTarget-delete");
        if (isDefaultTarget(targetName)) {
            $deletBtn.addClass("xc-disabled");
        } else {
            $deletBtn.removeClass("xc-disabled");
        }
    }

    function selectTargetType(typeId) {
        var $form = $("#dsTarget-form");
        var targetType = typeSet[typeId];
        $form.find(".description").removeClass("xc-hidden")
             .find("#dsTarget-description").text(targetType.description);
        if (targetType.parameters.length > 0) {
            var html = getTargetTypeParamOptions(targetType.parameters);
            $form.find(".params").removeClass("xc-hidden")
                 .find(".formContent").html(html);
        } else {
            $form.find(".params").addClass("xc-hidden")
                 .find(".formContent").empty();
        }
    }

    function getTargetTypeParamOptions(params) {
        return params.map(function(param, index) {
            var labelName = "dsTarget-param-" + index;
            var type = param.secret ? "password" : "text";
            var inputClass = "xc-input";
            var descrp = param.description;

            if (param.optional) {
                inputClass += " optional";
                descrp += " (" + CommonTxtTstr.Optional + ")";
            }

            return '<div class="formRow">' +
                        '<label for="' + labelName + '" ' +
                        'data-name="' + param.name + '">' +
                            param.name + ":" +
                        '</label>' +
                        '<input ' +
                        'class="' + inputClass + '" ' +
                        'style="display:none"' +
                        'placeholder="' + descrp + '" ' +
                        'autocomplete="off" ' +
                        'spellcheck="false">' +
                        '<input id="' + labelName + '" ' +
                        'class="' + inputClass + '" ' +
                        'type="' + type + '" ' +
                        'placeholder="' + descrp + '" ' +
                        'autocomplete="off" ' +
                        'spellcheck="false">' +
                    '</div>';
        }).join("");
    }

    function deleteTarget($grid) {
        var targetName = $grid.data("name");
        var msg = xcHelper.replaceMsg(DSTargetTStr.DelConfirmMsg, {
            target: targetName
        });
        Alert.show({
            title: DSTargetTStr.DEL,
            msg: msg,
            onConfirm: function() {
                XcalarTargetDelete(targetName)
                .then(function() {
                    if ($grid.hasClass("active")) {
                        // when still focus on grid to delete
                        showTargetCreateView();
                    }
                    $grid.remove();
                    DSTargetManager.refreshTargets();
                })
                .fail(function(error) {
                    Alert.error(DSTargetTStr.DelFail, error.error);
                });
            }
        });
    }

    function validateForm($form) {
        var $targetName = $("#dsTarget-name");
        var targetType = $("#dsTarget-type .text").data("id");
        var targetName = $targetName.val();
        var targetParams = {};
        var eles = [{
            $ele: $targetName
        }, {
            $ele: $targetName,
            error: ErrTStr.InvalidTargetName,
            check: function() {
                return !xcHelper.checkNamePattern("target", "check", targetName);
            },
        }, {
            $ele: $targetName,
            error: xcHelper.replaceMsg(DSTargetTStr.TargetExists, {
                target: targetName
            }),
            check: function() {
                return $gridView.find(".grid-unit").filter(function() {
                    return $(this).data("name") === targetName;
                }).length > 0;
            }
        }, {
            $ele: $("#dsTarget-type .text")
        }];

        $form.find(".params .formRow").each(function() {
            var $param = $(this);
            var $input = $(this).find("input:visible");
            if ($input.length &&
                (!$input.hasClass("optional") || $input.val().trim() !== "")) {
                eles.push({$ele: $input});
                targetParams[$param.find("label").data("name")] = $input.val();
            }
        });

        if (xcHelper.validate(eles)) {
            return [targetType, targetName, targetParams];
        } else {
            return null;
        }
    }

    function resetForm() {
        $("#dsTarget-reset").click();
    }

    function submitForm() {
        var deferred = PromiseHelper.deferred();
        var $form = $("#dsTarget-form");
        $form.find("input").blur();
        var $submitBtn = $("#dsTarget-submit").blur();

        var args = validateForm($form);
        if (!args) {
            return;
        }
        xcHelper.toggleBtnInProgress($submitBtn, true);
        var errorParser = function(log) {
            try {
                return log.split("ValueError:")[1].split("\\")[0];
            } catch (e) {
                console.error(e);
                return null;
            }
        };
        xcHelper.disableSubmit($submitBtn);
        checkMountPoint()
        .then(function() {
            return XcalarTargetCreate.apply(this, args);
        })
        .then(function() {
            xcHelper.toggleBtnInProgress($submitBtn, true);
            xcHelper.showSuccess(SuccessTStr.Target);
            DSTargetManager.refreshTargets(true);
            resetForm();
            deferred.resolve();
        })
        .fail(function(error) {
            // fail case being handled in submitForm
            xcHelper.toggleBtnInProgress($submitBtn, false);
            if (error.invalidMountPoint) {
                var $mountpointInput =  $form.find("label[data-name=mountpoint]")
                                        .closest(".formRow")
                                        .find(".xc-input:visible");
                StatusBox.show(FailTStr.Target, $mountpointInput, false, {
                    detail: error.log
                });
            } else {
                StatusBox.show(FailTStr.Target, $submitBtn, false, {
                    detail: errorParser(error.log)
                });
            }
            deferred.reject(error);
        })
        .always(function() {
            xcHelper.enableSubmit($submitBtn);
        });

        function checkMountPoint() {
            var innerDeferred = PromiseHelper.deferred();
            if ((!args) || (args[0] !== "shared")) {
                innerDeferred.resolve();
            } else {
                var url = args[2].mountpoint;
                XcalarListFiles({
                    targetName: gDefaultSharedRoot,
                    path: url
                })
                .then(function() {
                    innerDeferred.resolve();
                })
                .fail(function() {
                    var errorLog = xcHelper.replaceMsg(DSTargetTStr.MountpointNoExists, {
                        mountpoint: url
                    });
                    innerDeferred.reject({
                        log: errorLog,
                        invalidMountPoint: true
                    });
                });
            }
            return innerDeferred.promise();
        }
        return deferred.promise();
    }

    return (DSTargetManager);
}(jQuery, {}));
