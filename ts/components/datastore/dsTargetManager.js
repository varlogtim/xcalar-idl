window.DSTargetManager = (function($, DSTargetManager) {
    var targetSet = {};
    var typeSet = {};
    var $gridView;
    var $targetCreateCard;
    var $targetInfoCard;
    var $targetTypeList;
    var $udfModuleList;
    var $udfFuncList;
    var udfModuleListItems;
    var udfFuncListItems;
    var udfModuleHint;
    var udfFuncHint;

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

    DSTargetManager.isDatabaseTarget = function(targetName) {
        const target = DSTargetManager.getTarget(targetName);
        if (target && target.type_id === "dsn") {
            return true;
        } else {
            return false;
        }
    }

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
        var updateTargetType = function() {
            var typeNames = [];
            var typeNameToIdMap = {};
            for (var typeId in typeSet) {
                var typeName = typeSet[typeId].type_name;
                typeNameToIdMap[typeName] = typeId;
                typeNames.push(typeName);
            }
            typeNames.sort(function(a, b) {
                var aName = a.toLowerCase();
                var bName = b.toLowerCase();
                return (aName < bName ? -1 : (aName > bName ? 1 : 0));
            });
            var html = typeNames.map(function(typeName) {
                var typeId = typeNameToIdMap[typeName];
                return '<li data-id="' + typeId + '">' +
                            typeName +
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
            updateTargetType();
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
        if (target && target.type_id === "parquetds") {
            return true;
        } else {
            return false;
        }
    };

    DSTargetManager.updateUDF = function(listXdfsObj) {
        listUDFSection(listXdfsObj);
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
        $grid.addClass("selected");
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
        var tarInfo = typeSet[target.type_id];
        var paramList = tarInfo.parameters.map(function(param, index) {return param.name; });
        var $paramSection = $form.find(".params");
        var paramKeys = Object.keys(target.params);
        if (paramKeys.length === 0) {
            $paramSection.addClass("xc-hidden");
        } else {
            var paramHtml = paramList.map(function(paramName) {
                if (!paramKeys.includes(paramName)) {
                    // This parameter wasnt specified.
                    return "";
                }
                var paramVal = target.params[paramName];
                var classes = "text";
                if (typeof paramVal !== "string") {
                    paramVal = JSON.stringify(paramVal);
                }
                if (isSecrectParam(target.type_id, paramName)) {
                    classes += " secret";
                }
                return '<div class="formRow">' +
                            '<label>' + paramName + ':</label>' +
                            '<span class="' + classes + '">' +
                                paramVal +
                            '</span>' +
                        '</div>';
            }).join("");
            var $rows = $(paramHtml);
            encryptionSecretField($rows);
            $paramSection.removeClass("xc-hidden")
                         .find(".formContent").html($rows);
        }

        var $deletBtn = $("#dsTarget-delete");
        if (isDefaultTarget(targetName)) {
            $deletBtn.addClass("xc-disabled");
        } else {
            $deletBtn.removeClass("xc-disabled");
        }
    }

    function encryptionSecretField($rows) {
        $rows.each(function() {
            var $text = $(this).find(".text");
            if ($text.hasClass("secret")) {
                // const val = $text.text();
                const encryptedVal = "*".repeat(6);
                $text.text(encryptedVal);
                // Note: can add code here to display/hide password
                // if we need this use case
            }
        });
    }

    function selectUDFModule(module) {
        if (module == null) {
            module = "";
        }
        module = module.split("/").pop(); // use relative module name

        udfModuleHint.setInput(module);

        if (module === "") {
            $udfFuncList.addClass("disabled");
            selectUDFFunc("");
        } else {
            $udfFuncList.removeClass("disabled");
            var $funcLis = $udfFuncList.find(".list li").addClass("hidden")
                            .filter(function() {
                                var relativeModule = $(this).data("module").split("/").pop();
                                return relativeModule === module;
                            }).removeClass("hidden");
            if ($funcLis.length === 1) {
                selectUDFFunc($funcLis.eq(0).text());
            } else {
                selectUDFFunc("");
            }
        }
    }

    function selectUDFFunc(func) {
        func = func || "";
        if (func) {
            udfFuncHint.setInput(func);
        } else {
            udfFuncHint.clearInput();
        }
    }

    function validateUDF() {
        var $moduleInput = $udfModuleList.find("input");
        var $funcInput = $udfFuncList.find("input");
        var module = $moduleInput.val();
        var func = $funcInput.val();

        var isValid = xcHelper.validate([
            {
                "$ele": $moduleInput,
                "error": ErrTStr.NoEmptyList
            },
            {
                "$ele": $moduleInput,
                "error": ErrTStr.InvalidUDFModule,
                "check": function() {
                    var inValid = true;
                    $udfModuleList.find(".list li").each(function($li) {
                    if (module === $(this).text()){
                        inValid = false;
                        return false;
                    }
                    });
                    return inValid;
                }
            },
            {
                "$ele": $funcInput,
                "error": ErrTStr.NoEmptyList
            },
            {
                "$ele": $funcInput,
                "error": ErrTStr.InvalidUDFFunction,
                "check": function() {
                    var inValid = true;
                    $udfFuncList.find(".list li").each(function($li) {
                        var relativeModule = $(this).data("module").split("/").pop();
                    if (relativeModule === module && $(this).text() === func){
                        inValid = false;
                        return false;
                    }
                    });
                    return inValid;
                }
            }
        ]);

        if (!isValid) {
            return false;
        }

        return true;
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

        var $menuparms = $('#dsTarget-params-targets');
        $udfModuleList = $("#dsTarget-params-udfModule");
        $udfFuncList = $("#dsTarget-params-udfFunc");

        new MenuHelper($menuparms, {
            "onSelect": function($li) {
                var typeId = $li.data("id");
                var $input = $menuparms.find(".text");
                if ($input.data("id") === typeId) {
                    return;
                }
                $input.data("id", typeId).val($li.text());
                StatusBox.forceHide();
            },
            "container": "#dsTarget-create-card",
            "bounds": "#dsTarget-create-card"
        }).setupListeners();

        var moduleMenuHelper = new MenuHelper($udfModuleList, {
                "onSelect": function($li) {
                    var module = $li.text();
                    selectUDFModule(module);
                },
                "container": "#dsTarget-create-card",
                "bounds": "#dsTarget-create-card"
            });

        var funcMenuHelper = new MenuHelper($udfFuncList, {
                "onSelect": function($li) {
                    var func = $li.text();
                    selectUDFFunc(func);
                },
                "container": "#dsTarget-create-card",
                "bounds": "#dsTarget-create-card"
            });

        udfModuleHint = new InputDropdownHint($udfModuleList, {
            "menuHelper": moduleMenuHelper,
            "onEnter": selectUDFModule
        });

        udfFuncHint = new InputDropdownHint($udfFuncList, {
            "menuHelper": funcMenuHelper,
            "onEnter": selectUDFFunc
        });

        selectUDFModule("");
    }

    function getTargetsForParamOptions(param, index) {
        var labelName = "dsTarget-param-" + index;
        var targets = Object.values(DSTargetManager.getAllTargets());
        var lstHtml = targets.map(function(target) {
                        return '<li data-id="' + target.type_id + '">' +
                                    target.name +
                                '</li>';
                    }).join("");
        return '<div class="formRow">' +
                  '<label for="' + labelName + '" ' +
                        'data-name="' + param.name + '">' +
                            param.name + ":" +
                  '</label>' +
                  '<div id="dsTarget-params-targets" class="dropDownList yesclickable">' +
                    '<input class="text" type="text" value="" spellcheck="false" disabled="disabled">' +
                    '<div class="iconWrapper">' +
                      '<i class="icon xi-arrow-down"></i>' +
                    '</div>' +
                    '<div id="dsTarget-params-targets-menu" class="list">' +
                      '<ul>' +
                        lstHtml +
                      '</ul>' +
                      '<div class="scrollArea top stopped">' +
                        '<i class="arrow icon xi-arrow-up"></i>' +
                      '</div>' +
                      '<div class="scrollArea bottom">' +
                        '<i class="arrow icon xi-arrow-down"></i>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                '</div>'
    }

    function getUDFsForParamOptions(param, index) {
        var labelName = "dsTarget-param-" + index;
        var type = param.secret ? "password" : "text";
        var inputClass = "xc-input";
        var descrp = param.description;
        if(!udfModuleListItems) {
            udfModuleListItems = "";
        }
        if (!udfFuncListItems) {
            udfFuncListItems = "";
        }
        return '<div class="formRow">' +
                    '<label for="' + labelName + '" ' +
                    'data-name="' + param.name + '">' +
                        param.name + ":" +
                    '</label>' +
                    '<div class="listSection" data-original-title="" title=""">' +
                      '<div id="dsTarget-params-udfModule" class="rowContent dropDownList yesclickable"">' +
                        '<input class="text inputable" type="text" spellcheck="false" placeholder="UDF Module">' +
                        '<div class="iconWrapper">' +
                          '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<div class="list">' +
                          '<ul>' +
                            udfModuleListItems +
                          '</ul>' +
                          '<div class="scrollArea top">' +
                            '<i class="arrow icon xi-arrow-up"></i>' +
                          '</div>' +
                          '<div class="scrollArea bottom">' +
                            '<i class="arrow icon xi-arrow-down"></i>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                      '<div id="dsTarget-params-udfFunc" class="dropDownList disabled yesclickable">' +
                        '<input class="text inputable" type="text" spellcheck="false" placeholder="UDF Function">' +
                        '<div class="iconWrapper">' +
                          '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<div class="list">' +
                          '<ul>' +
                            udfFuncListItems +
                          '</ul>' +
                          '<div class="scrollArea top">' +
                            '<i class="arrow icon xi-arrow-up"></i>' +
                          '</div>' +
                          '<div class="scrollArea bottom">' +
                            '<i class="arrow icon xi-arrow-down"></i>' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                    '</div>' +
                '</div>';
    }

    function listUDFSection(listXdfsObj) {
        var deferred = PromiseHelper.deferred();
        updateUDFList(listXdfsObj);
        deferred.resolve();

        return deferred.promise();
    }

    function updateUDFList(listXdfsObj) {
        var udfObj = xcHelper.getUDFList(listXdfsObj);
        udfModuleListItems = udfObj.moduleLis;
        udfFuncListItems = udfObj.fnLis;
    }

    function isSecrectParam(typeId, paramName) {
        try {
            var targetType = typeSet[typeId];
            for (var i = 0; i < targetType.parameters.length; i++) {
                var param = targetType.parameters[i];
                if (param.name === paramName) {
                    return param.secret;
                }
            }
        } catch (e) {
            console.error(e);
        }
        return false;
    }

    function getTargetTypeParamOptions(params) {
        return params.map(function(param, index) {
            var labelName = "dsTarget-param-" + index;
            var type = param.secret ? "password" : "text";
            var inputClass = "xc-input";
            var descrp = param.description;

            if (param.optional) {
                inputClass += " optional";
                descrp = "(" + CommonTxtTstr.Optional + ") " + descrp;
            }
            if (param.name === 'backingTargetName') {
                return getTargetsForParamOptions(param, index);
            }
            else if (param.name === 'listUdf') {
                return getUDFsForParamOptions(param, index);
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
            deferred.reject();
            return deferred.promise();
        }
        var params = args[2]
        if (params.listUdf) {
            // need to create abspolute path for the udfModule
            if (params.listUdf === "default") {
                params.listUdf = UDFFileManager.Instance.getDefaultUDFPath();
            } else {
                params.listUdf = UDFFileManager.Instance.getCurrWorkbookPath() + params.listUdf;
            }

            var funVal = $udfFuncList.find("input").val();

            params.listUdf += ":" + funVal;
            if(!validateUDF()) {
                deferred.reject();
                return deferred.promise();
            }
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
