function setupDag() {

    $("#worksheetTabs").on("click", ".dagTab", function(event) {
        var $compSwitch = $("#worksheetTabs .dagTab");
        var dag = $('#dagPanel');
        var workspacePanel = $('#workspacePanel');
        
        event.stopPropagation();

        if (dag.hasClass('hidden')) {
            dag.removeClass('hidden');
            $compSwitch.addClass('active');
            if (dag.hasClass('midway')) {
                $('#mainFrame').addClass('midway');
            }
        } else if (workspacePanel.hasClass('active')) {
            dag.addClass('hidden');
            $compSwitch.removeClass('active');
            $('#mainFrame').removeClass('midway');
        }

        $('.mainPanel').removeClass('active');
        $('.mainMenuTab').removeClass('active');
        workspacePanel.addClass('active');
        $('#workspaceTab').addClass('active');
        $('.xcTheadWrap').css('z-index', 9);
        StatusMessage.updateLocation();
    });

    $('#dagPulloutTab').click(function() {
        var dag = $('#dagPanel');
        if (dag.hasClass('midway')) {
            dag.removeClass('midway').addClass('full');
        } else {
            dag.removeClass('full').addClass('midway');
            $('#mainFrame').addClass('midway');
        }
        $('.xcTheadWrap').css('z-index', 9);
    });

    $('#closeDag').click(function() {
        // only triiger the first dagTab is enough
        $('#compSwitch').trigger('click');
    });

    var $dagPanel = $('#dagPanel');

    // Remove focus when click other places other than retinaArea
    $dagPanel.on('click', function(){
        $dagPanel.find('.retTab.active').removeClass('active');
    });
    $dagPanel.on('click', '.retinaArea', function(event){
        event.stopPropagation();
    });
    // add new retina
    $dagPanel.on('click', '.addRet', function(event) {
        event.stopPropagation();
        var $addBtn = $(this);
        $dagPanel.find('.retTab.active').removeClass('active');
        var $retTabSection = $addBtn.closest('.retinaArea')
                                    .find('.retTabSection');
        createRetina($retTabSection);
    });
    
    // Press Enter on retina title to confirm the input
    $dagPanel.on('keyup', '.retTitle', function(event) {
        event.preventDefault();
        if (event.which !== keyCode.Enter) {
            return;
        }
        var $input = $(this);
        var $retTab = $input.closest('.retTab');
        var $retTabSection = $retTab.closest('.retTabSection');
        if (!$retTab.hasClass('unconfirmed')) {
            return;
        }
        var retName = jQuery.trim($input.val());
        if (retName == "") {
            retName = $retTab.data('retname');
        }

        // Check name conflict
        var isNameConflict = false;
        $retTab.siblings(':not(.unconfirmed)').each(function(index, sibl) {
            if (isNameConflict === true) {
                return;
            }
            var $sibl = $(sibl);
            var name = $sibl.find('.tabWrap input').val();
            if (retName === name) {
                isNameConflict = true;
            }
        })
        if (isNameConflict === true) {
            var text = "Retina " + retName + " already exists!";
            StatusBox.show(text, $input, true);
            return;
        }

        var tableName = $input.closest('.retinaArea')
                              .data('tablename');

        XcalarMakeRetina(retName, tableName)
        .then(function() {
            console.log('Create New Retina', retName, 'for', tableName);
            $retTab.data('retname', retName);
            $retTab.removeClass('unconfirmed');
            $input.blur();
            $input.val(retName);
            if ($retTabSection.find('.retTitle[disabled="disabled"]').length == 0) {
                $input.attr('disabled', 'disabled');
            }
        })
        .fail(function(error) {
            Alert.error("Make Retina fails", error);
        });
    });

    // toggle open retina pop up
    $dagPanel.on('click', '.tabWrap', function(event) {
        event.stopPropagation();
        var $tab = $(this).closest('.retTab');
        if ($tab.hasClass('unconfirmed')) {
            return;
        }
        // the tab is open, close it
        if ($tab.hasClass('active')) {
            $tab.removeClass('active');
        } else {
            $dagPanel.find('.retTab.active').removeClass('active');
            $tab.addClass('active');
        }
    });

    $dagPanel.on('keyup', '.newParam', function(event){
        event.preventDefault();
        if (event.which !== keyCode.Enter) {
            return;
        }
        var $btn = $(this).siblings('.addParam');
        $btn.click();
    });

    // create new parameters to retina
    $dagPanel.on('click', '.addParam', function(event) {
        event.stopPropagation();
        var $btn = $(this);
        var $input = $btn.prev('.newParam');
        var paramName = jQuery.trim($input.val());

        // empty input
        if (paramName == "") {
            var text = "Please input a valid parameter name!";
            StatusBox.show(text, $input, true);
            $input.val("");
            return;
        }

        var $retPopUp = $btn.closest('.retPopUp');
        var $tbody = $retPopUp.find('tbody');

        // var retName = $retPopUp.closest('.retTab').data('retname');
        // console.log('New Parameter in retina:', retName,
        //             'parameter name:',paramName);

        // Check name conflict
        var isNameConflict = false;
        $tbody.find('tr:not(.unfilled)').each(function(index, tr) {
            if (isNameConflict === true) {
                return;
            }
            var $tr = $(tr);
            var name = $tr.find('.paramName').html();
            if (paramName === name) {
                isNameConflict = true;
            }
        });
        if (isNameConflict === true) {
            var text = "Parameter " + paramName + " already exists!";
            StatusBox.show(text, $input, true);
            return;
        }

        $input.val("");
        addParamToRetina($tbody, paramName);

        // XXX currently, it is useless code
        // else {
        //     var html = '<tr>' +
        //                     '<td class="paramName">' + 
        //                             paramName +  
        //                     '</td>' + 
        //                     '<td>' + 
        //                         '<div class="paramVal"></div>' + 
        //                         '<div class="delete paramDelete">' +
        //                             '<span class="icon"></span>' + 
        //                         '</div>' + 
        //                     '</td>' + 
        //                '</tr>';
        //     $tbody.append(html);
        // }
    });

    // delete retina para
    $dagPanel.on('click', '.paramDelete', function(event) {
        event.stopPropagation();
        var $delBtn = $(this);
        var $tr = $delBtn.closest('tr');
        var $tbody = $tr.parent();
        var paramName = $tr.find('.paramName').text();
        var options = {};
        options.title = 'DELETE RETINA PARAMETER';
        options.msg = 'Are you sure you want to delete parameter ' 
                      + paramName + '?';
        options.isCheckBox = true;
        options.confirm = function() {
            $tr.find('.paramName').empty();
            $tr.find('.paramVal').empty();
            $tr.addClass('unfilled');
            $tbody.append($tr);
        }
        Alert.show(options);
    });



    var $dagParameterModal = $('#dagParameterModal');

    $dagParameterModal.find('.cancel, .close').click(function() {
        closeDagParamModal($dagParameterModal);
    });

    $dagParameterModal.find('.confirm').click(function() {
        //XX need to check if all default inputs are filled
        var retName = $(".retTitle:disabled").val();
        var dagNum = $dagParameterModal.data('dagNum');
        var dagNodeId = $dagParameterModal.data('id');

        (function storeUserFields() {
            gRetinaObj[dagNodeId] = {};
            gRetinaObj[dagNodeId].paramQuery = [];
            gRetinaObj[dagNodeId].params = [];
            $dagParameterModal.find('.editableParamDiv').each(function() {
                var html = $(this).html();
                gRetinaObj[dagNodeId].paramQuery.push(html);
            });

            $dagParameterModal.find(".tableWrapper tbody tr")
                .not(".unfilled").each(function() {
                    var name = $(this).find(".paramName").text();       
                    var val = $(this).find(".paramVal").val();
                    gRetinaObj[dagNodeId].params.push({name: name, val: val});
                    $('.dagWrap').eq(dagNum).find('.retTabSection tbody')
                        .find('tr:not(".unfilled")').filter(function() {
                            return ($(this).find(".paramName").text() == name);
                        }).find(".paramVal").text(val);
                });
        })();
        
        function bindParams() {
            // First, for each param we have to issue a create param call
            var promises = [];

            $("#dagParameterModal .tableWrapper tbody tr")
                .not(".unfilled").each(function() {
                    var name = $(this).find(".paramName").text();       
                    var val = $(this).find(".paramVal").val();
                    console.log("Name: "+name+", val: "+val);
                    promises.push(XcalarAddParameterToRetina.bind(this, retName,
                                                                  name, val));
                });

            return (chain(promises));
        }
        bindParams()
        .then(function() {
            var $table = $("#dagParameterModal .editableTable");
            var paramInput = new XcalarApiParamInputT();
            // XXX: HACK!!!
            var dagId = $dagParameterModal.data('id');
            console.log(dagId);
            if (retName == "") {
                // XXX: Insert hack in case demo fail
            }
            switch ($table.find("td:first").text()) {
                case ("filter"):
                    var $editableDivs = $table.find('.editableParamDiv');
                    var filterText = $editableDivs.eq(1).text();
                    filterText = jQuery.trim(filterText);
                    var str1 = $editableDivs.eq(0).text().replace(/\+/g, "");
                    str1 = jQuery.trim(str1);
                    var str2 = $editableDivs.eq(2).text().replace(/\+/g, "");
                    str2 = jQuery.trim(str2);
                    var filter;
                    // Only support these filter now
                    switch (filterText) {
                        case (">"):
                            filter = "gt";
                            break;
                        case ("<"):
                            filter = "lt";
                            break;
                        case (">="):
                            filter = "ge";
                            break;
                        case ("<="):
                            filter = "le";
                            break;
                        case ("="):
                            filter = "eq";
                            break;
                        default:
                            console.log("currently not supported filter");
                            return;
                    }
                    var str = filter + "(" + str1 + "," + str2 + ")";
                    console.log("Filter String:", str);
                    paramInput.paramFilter = new XcalarApiParamFilterT();
                    paramInput.paramFilter.filterStr = str;
                    return (XcalarUpdateRetina(retName,
                                               dagId,
                                               XcalarApisT.XcalarApiFilter,
                                               paramInput));
                    break;
                case ("Load"):
                    var str = $(".editableParamDiv").text();
                    str = str.replace(/\+/g, "");
                    console.log(str);
                    paramInput.paramLoad = new XcalarApiParamLoadT();
                    paramInput.paramLoad.datasetUrl = str;
                    return (XcalarUpdateRetina(retName,
                                               dagId,
                                               XcalarApisT.XcalarApiBulkLoad,
                                               paramInput));
                    break;
                default:
                    console.log("currently not supported");
                    break;
            }
        })
        .then(function() {
            closeDagParamModal($dagParameterModal);
            // show success message??
        })
        .fail(function(error) {
            Alert.error("Update Params fails", error);
        });
    });

    $dagParameterModal.on('click', '.draggableDiv .close', function() {
        var value = $(this).siblings('.value').text();
        $(this).parent().remove();

        var duplicates = $dagParameterModal.find('.editableRow').find('.value')
            .filter(function() {
                return ($(this).text() == value);
            });

        if (duplicates.length > 0) {
            return;
        }

        $('.defaultListSection').find('.paramName').filter(function() {
            return ($(this).text() == value);
        }).closest('tr').remove();

        var newRow = '<tr class="unfilled">' +
                        '<td class="paramName"></td>' + 
                        '<td>' + 
                            '<input class="paramVal" />' +
                            '<div class="options">' +
                                 '<div class="option paramEdit">' +
                                    '<span class="icon"></span>' + 
                                '</div>' + 
                            '</div>'+
                        '</td>' + 
                   '</tr>';
        $('.defaultListSection').find('tr:last').after(newRow);
    });

    $('#addNewParameterizedQuery').click(function() {
        $(this).addClass('btnInactive');
        showEditableParamQuery();
    }); 

    $dagParameterModal.on('focus', '.paramVal', function() {
        $(this).next().find('.paramEdit').addClass('selected');
    });

    $dagParameterModal.on('blur', '.paramVal', function() {
        $(this).next().find('.paramEdit').removeClass('selected');
    });

    $dagParameterModal.draggable({
        handle: '.modalHeader',
        cursor: '-webkit-grabbing'
    });

}

function appendRetinas(){
    var $dagWrap = $('#dagPanel').find('.dagWrap');
    if ($dagWrap.length > 1) {
        return;
    }
    var $retTabSection = $dagWrap.find('.retTabSection');
    // List All Retinas and now append to first table 
    XcalarListRetinas()
    .then(function(listRetinasOutput) {
        console.log(listRetinasOutput);
        var len =  listRetinasOutput.numRetinas;
        var retinas = listRetinasOutput.retinaDescs;
        var promises = [];
        for (var i = 0; i < len; i ++) {
            var name = retinas[i].retinaName;
            promises.push(createRetina.bind(this, $retTabSection, name));
        }
        return (chain(promises));
    })
    .fail(function(error) {
        console.log("appendRetinas fails!");
    });
}

function createRetina($retTabSection, retName) {
    var deferred = jQuery.Deferred();
    var retClass = "retTab";
    var inputVal = "";
    var isNewRetina = false;
    if (retName == undefined) {
        var len = $retTabSection.children().length;
        retName = 'Retina ' + (len + 1);
        retClass += " unconfirmed";
        isNewRetina = true;
        intputHTML = '<input type="text" class="retTitle"' +  
                     '" placeholder="' + retName + '">';
    } else {
        intputHTML = '<input type="text" class="retTitle">'; 
    }

    var html = 
        '<div class="' + retClass + '">' + 
            '<div class="tabWrap">' + 
                intputHTML + 
                '<div class="caret">' + 
                    '<span class="icon"></span>' + 
                '</div>' + 
            '</div>' + 
            '<div class="retPopUp">' + 
                '<div class="divider"></div>' + 
                '<div class="inputSection">' + 
                    '<input class="newParam" type="text"' + 
                    ' placeholder="Input New Parameter">' + 
                    '<div class="btn addParam">' + 
                        '<span class="icon"></span>' + 
                        '<span class="label">' + 
                            'CREATE NEW PARAMETER' + 
                        '</span>' + 
                    '</div>' +
                '</div>' + 
                '<div class="tableContainer">' + 
                    '<div class="tableWrapper">' + 
                        '<table>' + 
                            '<thead>' + 
                                '<tr>' +
                                    '<th>' + 
                                        '<div class="thWrap">' + 
                                            'Current Parameter' + 
                                        '</div>' + 
                                    '</th>' + 
                                    '<th>' + 
                                        '<div class="thWrap">' + 
                                            'Default Value' + 
                                        '</div>' + 
                                    '</th>' + 
                                '</tr>' + 
                            '</thead>' +
                            '<tbody>';
    for (var i = 0; i < 7; i++) {
        html += '<tr class="unfilled">' +
                    '<td class="paramName"></td>' + 
                    '<td>' + 
                        '<div class="paramVal"></div>' + 
                        '<div class="delete paramDelete">' +
                            '<span class="icon"></span>' + 
                        '</div>' + 
                    '</td>' + 
               '</tr>';
    }

    html += '</tbody></table></div></div></div></div>';

    var $retTab = $(html);
    $retTab.data('retname', retName);
    $retTabSection.append($retTab);

    if (isNewRetina) {
        $retTab.find('.retTitle').focus();
        deferred.resolve();
    } else {
        var $input = $retTab.find('.retTitle');
        $input.val(retName);
        if ($retTabSection.find('.retTitle[disabled="disabled"]').length == 0) {
            $input.attr('disabled', 'disabled');
        }
        var $tbody = $retTab.find('tbody');
        // Only disable the first retina
        XcalarListParametersInRetina(retName)
        .then(function(output) {
            var num = output.numParameters;
            var params = output.parameters;
            for (var i = 0; i < num; i ++) {
                var param = params[i];
                var paramName = param.parameterName;
                var paramVal = param.parameterValue;
                addParamToRetina($tbody, paramName, paramVal);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.log("list retina parameters fails!");
            deferred.reject(error);
        });
    }
    return (deferred.promise());
}

function addParamToRetina($tbody, name, val) {
    var $trs = $tbody.find('.unfilled');
    // Now only allow to add 7 parameters
    if ($trs.length > 0) {
        var $tr = $trs.eq(0);
        $tr.find('.paramName').html(name);
        if (val) {
            $tr.find('.paramVal').html(val);
        }
        $tr.removeClass('unfilled');
    }
}

function getDagDropDownHTML() {
    var html = 
    '<ul class="colMenu dagDropDown">'+
        '<li class="createParamQuery">Create Parameterized Query</li>'+
        '<li class="modifyParams">Modify Existing Parameters</li>'+
        // '<li class="listParams">List of ? Parameters</li>'+
    '</ul>';
    return (html);
}

function addDagEventListeners($dagWrap) {
    var $currentIcon; 
    $dagWrap.on('click', '.dagTable.dataStore, .actionType', function() {
        $('.colMenu').hide();
        $currentIcon = $(this);
        var $menu = $dagWrap.find('.dagDropDown');
        var el = $(this);
        //position colMenu
        var topMargin = 0;
        var leftMargin = 0;
        var top = el[0].getBoundingClientRect().bottom + topMargin;
        var left = el[0].getBoundingClientRect().left + leftMargin;
        var offsetTop = $('#workspaceBar')[0].getBoundingClientRect().bottom;
        if ($('#dagPanel').hasClass('midway')) {
            top -= $('#dagPanel').offset().top;
        }       
        $menu.css({'top':top, 'left':left});
        $menu.show();

        //positioning if dropdown menu is on the right side of screen
        var leftBoundary = $('#rightSideBar')[0].getBoundingClientRect().left;
        if ($menu[0].getBoundingClientRect().right > leftBoundary) {
            left = el[0].getBoundingClientRect().right - $menu.width();
            $menu.css('left', left).addClass('leftColMenu');
        }
        $menu.find('.subColMenu').each(function() {
            if ($(this)[0].getBoundingClientRect().right > leftBoundary) {
                $menu.find('.subColMenu').addClass('leftColMenu');
            }
        });
    });

    $dagWrap.find('.colMenu li')
        .mouseenter(function() {
            $(this).children('ul').addClass('visible');
            $(this).addClass('selected');
        }).mouseleave(function(event) {
            $(this).children('ul').removeClass('visible');
            $(this).removeClass('selected');
    });

    $dagWrap.find('.colMenu .createParamQuery').click(function() {
        showDagParamModal($currentIcon);
    });

    //XX both dropdown options will do the same thing
    $dagWrap.find('.colMenu .modifyParams').click(function() {
        showDagParamModal($currentIcon);
    });
}

function showDagParamModal($currentIcon) {
    $dagModal = $('#dagParameterModal');
    $dagModal.show();
    centerPositionElement($dagModal);

    $('#modalBackground').fadeIn(200);
    var type = $currentIcon.data('type');
    var id = $currentIcon.data('id');
    var dagNum = $currentIcon.closest('.dagWrap').index();
    $dagModal.data({'id': id, 'dagNum': dagNum});
    var defaultText = ""; // The html corresponding to Current Query:
    var editableText = ""; // The html corresponding to Parameterized Query:
    if ($currentIcon.hasClass('dataStore')) {
        defaultText += '<td>Load</td>';
        defaultText += '<td><div class="boxed large">'+
                        $currentIcon.data('url')+
                        '</div></td>';
        editableText += "<td class='static'>Load</td>";
        editableText += '<td>'+
                            '<div class="editableParamDiv boxed large load" '+
                            'ondragover="allowParamDrop(event)"'+ 
                            'ondrop="paramDrop(event)" '+
                            'data-target="0" '+
                            'contenteditable="true" '+
                            'spellcheck="false"></div>'+
                        '</td>';
    } else { // not a datastore but a table
        defaultText += "<td>"+type+"</td>";
        defaultText += "<td><div class='boxed medium'>"+
                        $currentIcon.data('column')+
                        "</div></td>";
        editableText += "<td class='static'>"+type+"</td>";
    }
    
    if (type == "filter") {
        var filterInfo = $currentIcon.data('info')+" ";
        var parenIndex = filterInfo.indexOf("(");
        var abbrFilterType = filterInfo.slice(0,parenIndex);
        var filterValue = filterInfo.slice(filterInfo.indexOf(',')+2, 
                                              filterInfo.indexOf(')'));
        var filterTypeMap = {
            "gt" : ">",
            "ge" : "&ge;",
            "eq" : "=",
            "lt" : "<",
            "le" : "&le;",
            "regex" : "regex",
            "like" : "like",
            "not" : "not"
        };
        
        defaultText += "<td class='static'>by</td>";
        defaultText += "<td><div class='boxed small'>"+
                        filterTypeMap[abbrFilterType]+"</div></td>";
        defaultText += "<td><div class='boxed medium'>"+
                        filterValue+"</div></td>";

        editableText += '<td>'+
                            '<div class="editableParamDiv boxed medium" '+
                            'ondragover="allowParamDrop(event)"'+ 
                            'ondrop="paramDrop(event)" '+
                            'data-target="0" '+
                            'contenteditable="true" '+
                            'spellcheck="false"></div>'+
                        '</td>'+
                        '<td class="static">by</td>'+
                        '<td>'+
                            '<div class="editableParamDiv boxed medium" '+
                            'ondragover="allowParamDrop(event)"'+ 
                            'ondrop="paramDrop(event)" '+
                            'data-target="1" '+
                            'contenteditable="true" '+
                            'spellcheck="false"></div>'+
                        '</td>'+
                        '<td>'+
                            '<div class="editableParamDiv boxed medium" '+
                            'ondragover="allowParamDrop(event)"'+ 
                            'ondrop="paramDrop(event)" '+
                            'data-target="2" '+
                            'contenteditable="true" '+
                            'spellcheck="false"></div>'+
                        '</td>';
        
    } else if ($currentIcon.hasClass('dataStore')) {
        // do nothing
    } else { // index, sort, map etc to be added in later
        defaultText += "<td>by</td>";
    }
    $dagModal.find('.template').html(defaultText);
    $dagModal.find('.editableRow').html(editableText);
    var $dagWrap = $currentIcon.closest('.dagWrap')
    var draggableInputs = generateDraggableParams($dagWrap);
    $dagModal.find('.draggableParams').append(draggableInputs);
    if ($('.draggableDiv').length == 0) {
        $dagModal.addClass('minimized');
    } else {
        $dagModal.removeClass('minimized');
    }

    generateParameterDefaultList(id);
    populateSavedFields();
}

function populateSavedFields() {
    var $dagModal = $('#dagParameterModal');
    var id = $dagModal.data('id')
    if (!gRetinaObj[id]) {
        return;
    }

    var paramQueryLen = gRetinaObj[id]['paramQuery'].length;
    for (var i = 0; i < paramQueryLen; i++) {
        $dagModal.find('.editableParamDiv').eq(i)
            .html(gRetinaObj[id]['paramQuery'][i]);
    }

    var $tbody = $dagModal.find(".tableWrapper tbody");
    var paramListLen = gRetinaObj[id]['params'].length;
    for (var i = 0; i < paramListLen; i++) {
        $tbody.find(".unfilled:first")
            .removeClass("unfilled")
            .find(".paramName").text(gRetinaObj[id]['params'][i]['name'])
            .next().find(".paramVal").val(gRetinaObj[id]['params'][i]['val']);
    }

    $('#addNewParameterizedQuery').trigger("click");
}

function generateDraggableParams($dagWrap) {
    var html = "";
    //XX use id to get current parameters to loop and create draggable divs
    $dagWrap.find('.retTabSection tbody')
            .find('tr:not(".unfilled")').each(function() {
                var value = $(this).find('.paramName').text();
                html += '<div id="draggableParam'+value+'" class="draggableDiv" '+
                    'draggable="true" '+
                    'ondragstart="paramDragStart(event)" '+
                    'ondragend="paramDragEnd(event)" '+
                    'ondrop="return false" '+
                    'title="click and hold to drag" '+
                    'contenteditable="false">'+
                        '<div class="icon"></div>'+
                        '<span class="delim"><</span>'+
                        '<span class="value">'+value+'</span>'+
                        '<span class="delim">></span>'+
                        '<div class="close"><span>+</span></div>'+
                    '</div>';
            });
    return (html);
}

function generateParameterDefaultList() {
    var html = '<div class="tableContainer">' + 
                    '<div class="tableWrapper">' + 
                        '<table>' + 
                            '<thead>' + 
                                '<tr>' +
                                    '<th>' +  
                                        '<div class="thWrap">' + 
                                            'Parameter' + 
                                        '</div>' + 
                                    '</th>' +  
                                    '<th>' +  
                                        '<div class="thWrap">' + 
                                            'Default' + 
                                        '</div>' + 
                                    '</th>' +   
                                '</tr>' + 
                            '</thead>' +
                            '<tbody>';
        for (var i = 0; i < 6; i ++) {
            html += '<tr class="unfilled">' +
                        '<td class="paramName"></td>' + 
                        '<td>' + 
                            '<input class="paramVal" />' +
                            '<div class="options">' +
                                 '<div class="option paramEdit">' +
                                    '<span class="icon"></span>' + 
                                '</div>' + 
                            '</div>'+
                        '</td>' + 
                   '</tr>';
        }
    html += '</tbody></table></div></div>';

    $dagModal = $('#dagParameterModal');
    $dagModal.find('.defaultListSection').append(html);

    $('.paramEdit').click(function() {
        $(this).parent().prev().focus();
    })
}

function closeDagParamModal($modal) {
    $modal.hide();
    $dagModal.find('.editableRow').empty();
    $dagModal.find('.editableParamQuery').hide();
    $dagModal.find('.draggableParams').empty();
    $dagModal.find('.defaultListSection').empty().hide();
    $dagModal.find('.currentParameterList').next().hide();
    $dagModal.removeClass('enlarged minimized');
    $('#addNewParameterizedQuery').removeClass('btnInactive');
    $('#modalBackground').fadeOut(200);
}

function showEditableParamQuery() {
    $dagModal = $('#dagParameterModal');
    $dagModal.find('.currentParameterList').next().show();
    $dagModal.find('.editableParamQuery').show();
    $dagModal.find('.defaultListSection').show();
    $dagModal.removeClass('minimized').addClass('enlarged');
}


/* Drag and Drop */
function paramDragStart(event) {
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.dropEffect = "copy"; 
    event.dataTransfer.setData("text", event.target.id);
    event.stopPropagation();
    var origin;
    if ($(event.target).parent().hasClass('draggableParams')) {
        origin = 'home';
    } else {
        origin = $(event.target).parent().data('target');
    }

    $('.editableRow').data('origin', origin);
}

function paramDragEnd(event) {
    event.stopPropagation();
    $('.editableRow').data('copying', false);
}

function paramDrop(event) {
    // console.log(event)
    event.stopPropagation();
    var $dropTarget = $(event.target)
    var paramId = event.dataTransfer.getData("text");
    if (!$dropTarget.hasClass('editableParamDiv')) {
        return; // only allow dropping into the appropriate boxes
    }
    
    var $draggableParam = $('#'+paramId).clone();
    if ($('.editableRow').data('origin') != 'home') {
        // the drag origin is from another box, therefore we're moving the div
        // so we have to remove it from its old location
        $('.editableRow .editableParamDiv').filter(function() {
            return $(this).data('target') == $('.editableRow').data('origin');
        }).find('#'+paramId+':first').remove();
        // we remove the dragging div from its source
    }

    $dropTarget.append($draggableParam);
    var value = $draggableParam.find('.value').text();

    var paramRow = $('.defaultListSection').find('.paramName')
                    .filter(function() {
                        return ($(this).text() == value);
                    });
    if (paramRow.length == 0) {
        var $row = $('.defaultListSection').find('.unfilled:first');
        $row.find('.paramName').text(value);
        $row.removeClass('unfilled');
    }
}

function allowParamDrop(event) {
    event.preventDefault();
}



/* Generation of dag elements and canvas lines */

function constructDagImage(tableName, tableNum) {
    var deferred = jQuery.Deferred();

    drawDag(tableName, tableNum)
    .then(function(dagDrawing) {
        var outerDag = '<div class="dagWrap" id="dagWrap'+tableNum+'">'+
            '<div class="header clearfix">'+
                '<div class="btn btnSmall infoIcon">'+
                    '<div class="icon"></div>'+
                '</div>'+
                '<div class="tableTitleArea">'+
                    'Table: <span class="tableName">'+tableName+'</span>'+
                '</div>'+
                '<div class="retinaArea" data-tablename="' + tableName + '">' + 
                    '<div data-toggle="tooltip" data-container="body" '+
                    'data-placement="top" title="Create New Retina" '+
                    'class="btn addRet">' + 
                        '<span class="icon"></span>' + 
                    '</div>' + 
                    '<div class="retTabSection"></div>' +
                '</div>' +
            '</div>'+
            '</div>';

        var innerDag = '<div class="dagImageWrap"><div class="dagImage">'+
                        dagDrawing+'</div></div>';

        if (tableNum == 0) {
            $('.dagArea').prepend(outerDag);
        } else {
            $('#dagWrap'+(tableNum-1)).after(outerDag);
        }

        var $dagWrap = $('#dagWrap'+tableNum);
        $dagWrap.append(innerDag);
        var canvas = createCanvas($dagWrap);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#999999';
        $dagWrap.find('.dagTableWrap').each(function() {
            var el = $(this);
            drawDagLines(el, ctx);
        });

        var dropdown = getDagDropDownHTML();
        $dagWrap.append(dropdown);
        addDagEventListeners($dagWrap);
        appendRetinas();
        // $('.dagImageWrap').scrollLeft($('.dagImage').width());

        deferred.resolve();
    })
    .fail(function(error) {
        console.log('dag failed');
        deferred.reject(error);
    });

    return (deferred.promise());
}

function drawDagNode(dagNode, prop, dagArray, html, index, parentChildMap) {
    var properties = {};
    properties.x = prop.x+1;
    properties.width = prop.width;
    var numChildren = parentChildMap[index].length;
    var accumulatedDrawings = "";

    for (var i = 0; i < numChildren; i++) {
        var childIndex = parentChildMap[index][i];
        properties.y = i*2 +1 - numChildren + prop.y;
        accumulatedDrawings += drawDagNode(dagArray[childIndex], properties, 
                               dagArray, html, childIndex, parentChildMap);
    }
    
    var oneTable = drawDagTable(dagNode, prop, dagArray);
    var newHtml;
    if (accumulatedDrawings) {
        newHtml = "<div class='joinWrap'><div class='childContainer'>"+
                  accumulatedDrawings+"</div>"+oneTable+"</div>";
    }

    if (newHtml) {
        return (newHtml);
    } else {
        return (accumulatedDrawings+oneTable);
    }
}

function drawDagTable(dagNode, prop, dagArray) {
    var top = 200 + (prop.y*60);
    var right = 100 + (prop.x*170);
    var dagOrigin = drawDagOrigin(dagNode, prop, dagArray);
    var dagTable = '<div class="dagTableWrap clearfix">' +
                    dagOrigin;
    if (dagOrigin == "") {
        var key = dagApiMap[dagNode.api];
        var dagInfo = getDagNodeInfo(dagNode, key);
        var url = dagInfo.url;
        var id = dagInfo.id;
        dagTable += '<div class="dagTable dataStore" '+
                    'data-type="dataStore" '+
                    'data-id="'+id+'" '+
                    'data-url="'+url+'">'+
                        '<div class="dataStoreIcon"></div>'+
                        '<div class="icon"></div>'+
                        '<span class="tableTitle" '+
                        'data-toggle="tooltip" '+
                        'data-placement="bottom" '+
                        'data-container="body" '+
                        'title="'+getDagName(dagNode)+'">'+
                        'Dataset '+
                            getDagName(dagNode)+
                        '</span>';
    } else {
        dagTable += '<div class="dagTable">' +
                        '<div class="dagTableIcon"></div>'+
                        '<div class="icon"></div>'+
                        '<span class="tableTitle" '+
                        'data-toggle="tooltip" '+
                        'data-placement="bottom" '+
                        'data-container="body" '+
                        'title="'+getDagName(dagNode)+'">'+
                            getDagName(dagNode)+
                        '</span>';
    }
    dagTable += '</div></div>';
    return (dagTable);
}

function drawDagOrigin(dagNode, prop, dagArray) {
    var originHTML = "";
    var numChildren = getDagNumChildren(dagNode);

    if (numChildren > 0) {
        var children = getDagChildrenNames(dagNode.api, dagNode);
        var additionalInfo = "";
        if (numChildren == 2) {
            additionalInfo += " & "+children[1];
        }
        var key = dagApiMap[dagNode.api];
        var name = key.substring(0, key.length - 5);
        var info = getDagNodeInfo(dagNode, key, children);
        if (info.type == "sort") {
            name = "sort";
        }

        var top = 210 + (prop.y*60);
        var right = 180 + (prop.x*170);
        originHTML += '<div class="actionType '+name+'" '+
                    'style="top:'+0+'px; right:'+0+'px;" '+
                    'data-type="'+name+'" '+
                    'data-info="'+info.text+'" '+
                    'data-column="'+info.column+'" '+
                    'data-id="'+info.id+'" '+
                    'data-toggle="tooltip" '+
                    'data-placement="top" '+
                    'data-container="body" '+
                    'title="'+info.tooltip+'">'+
                        '<div class="actionTypeWrap" >'+
                            '<div class="dagIcon '+name+' '+info.type+'">'+
                                '<div class="icon"></div>';
        if (name == 'groupBy') {
            originHTML +=   '<div class="icon icon2 '+info.type+'"></div>';
        }
        originHTML +=           '</div>'+
                            '<span class="typeTitle">'+name+
                            '</span>'+
                            '<span class="childrenTitle">'+
                                children[0]+additionalInfo+
                            '</span>'+
                        '</div>'+
                    '</div>';
    }
    
    return (originHTML);
}

function drawDag(tableName, tableNum) {
    var deferred = jQuery.Deferred();
    if (!gTables[tableNum].isTable) {
        var dagObj = {node: [{}], numNodes:1};
        var node = dagObj.node[0];
        var datasetName = gTableIndicesLookup[tableName].datasetName;
        node.api = 2;
        node.dagNodeId = Math.ceil(Math.random()*10000);
        node.input = {loadInput: {}};
        node.input.loadInput.dataset = {};
        node.input.loadInput.dataset.datasetId = 0;
        node.input.loadInput.dataset.name = datasetName;
        // return (deferred.promise());
        XcalarGetDatasets()
        .then(function(datasets) {

            for (var i = 0; i < datasets.numDatasets; i++) {
                if (datasetName == datasets.datasets[i].name) {
                    console.log(datasets.datasets[i].url);
                    node.input.loadInput.dataset.url = datasets.datasets[i].url;
                    drawDagHelper(dagObj);
                    break;
                }
            }
        })
        .fail(function() {
            Alert.error("getDatasetSets for Dag fails", error);
        });
        return (deferred.promise());
    } else {
        XcalarGetDag(tableName).then(function(dagObj) {

           return drawDagHelper(dagObj);
        })
        .fail(function(error) {
            console.log("drawDag fail!");
            deferred.reject(error);
        });
    }
    

    function drawDagHelper(dagObj) {
        var prop = {
            x:0, 
            y:0, 
            childCount: 0,
        };
        var index = 0;
        var dagArray = dagObj.node;
        var parentChildMap = getParentChildDagMap(dagObj);
        console.log(dagObj);
        deferred.resolve(drawDagNode(dagArray[index], prop, dagArray, "", 
                         index, parentChildMap));
    }

    function getParentChildDagMap(dagObj) {
        var dagArray = dagObj.node;
        var numNodes = dagObj.numNodes;
        var map = {}; // will hold a map of nodes, and array indices of children
        var childIndex = 0;
        for (var i = 0; i < numNodes; i++) {
            var dagNode = dagArray[i];
            var numChildren = getDagNumChildren(dagNode);
            map[i] = []; 
            for (var j = 0; j < numChildren; j++) {
                map[i].push(++childIndex);
            }
        }
        return (map);
    }

    return (deferred.promise());
}

function getDagNumChildren(dagNode) {
    var numChildren = 0;
    if (dagNode.api == XcalarApisT.XcalarApiJoin) {
        var numChildren = 2;
    } else if (dagNode.api != XcalarApisT.XcalarApiBulkLoad) {
        var numChildren = 1;
    } 
    return (numChildren);
}

function getDagChildrenNames(api, dagNode) {
    var children = [];
    var key = dagApiMap[api];
    var value = dagNode.input[key];
    if (key == 'filterInput') {
        children.push(value.srcTable.tableName);
    } else if (key == 'groupByInput') {
        children.push(value.table.tableName);
    } else if (key == 'indexInput') {
        if (value.source.name == "") {
            children.push(value.dstTable.tableName);
        } else {
            children.push(value.source.name);
        }
    } else if (key == 'joinInput') {
        children.push(value.leftTable.tableName);
        children.push(value.rightTable.tableName);
    } else if (key == 'mapInput') {
        children.push(value.srcTable.tableName);
    }
    return (children);
}

function getDagName(dagNode) {
    var key = dagApiMap[dagNode.api];
    var value = dagNode.input[key];
    var childName;
    if (key == 'filterInput') {
        childName = value.dstTable.tableName;
    } else if (key == 'groupByInput') {
        childName = value.groupByTable.tableName;
    } else if (key == 'indexInput') {
        childName = value.dstTable.tableName;
    } else if (key == 'joinInput') {
        childName = value.joinTable.tableName;
    } else if (key == 'loadInput') {
        childName = value.dataset.name;
    } else if (key = 'mapInput') {
        childName = value.dstTable.tableName;
    }
    return (childName);
}

function getDagNodeInfo(dagNode, key, children) {
    var value = dagNode.input[key];
    var info = {};
    info.type = "";
    info.text = "";
    info.tooltip = "";
    info.column = "";
    info.id = dagNode.dagNodeId;

    if (key == 'loadInput') {
        info.url = value.dataset.url;
    } else if (key == 'filterInput') {
        var filterStr = value.filterStr;
        var parenIndex = filterStr.indexOf("(");
        var abbrFilterType = filterStr.slice(0, parenIndex);
        
        info.type = "filter"+abbrFilterType;
        info.text = filterStr;
        var filterType = "";
        var filterTypeMap = {
            "gt" : "greater than",
            "ge" : "reater than or equal to",
            "eq" : "equal to",
            "lt" : "less than",
            "le" : "less than or equal to",
            "regex" : "regex",
            "like" : "like",
            "not" : "not"
        };

        if (filterTypeMap[abbrFilterType]) {
            var filteredOn = filterStr.slice(parenIndex+1, 
                                             filterStr.indexOf(','));
            var filterType = filterTypeMap[abbrFilterType];
            var filterValue = filterStr.slice(filterStr.indexOf(',')+2, 
                                              filterStr.indexOf(')'));
            info.column = filteredOn;
            if (filterType == "regex") {
                info.tooltip = "Filtered table &quot;" + children[0] + 
                               "&quot; using regex: &quot;" + filterValue + 
                               "&quot; " + "on " + filteredOn + ".";
            } else if (filterType == "not") {
                filteredOn = filteredOn.slice(filteredOn.indexOf("(")+1);
                info.column = filteredOn;
                info.tooltip = "Filtered table &quot;" + children[0] +
                               "&quot; excluding " + filterValue + 
                               " from " + filteredOn + ".";
            } else {
                info.tooltip = "Filtered table &quot;" + children[0] + 
                               "&quot; where "+ filteredOn + 
                               " is " + filterType + " "+ filterValue + ".";
            }
            
        } else {
            info.tooltip = "Filtered table &quot;"+children[0]+"&quot;: "+filterStr;
        }
    } else if (key == 'groupByInput') {
        info.type = "groupBy" + 
                    OperatorsOpTStr[value.groupByOp].slice(9)
                    .replace('Keys', '');
        info.text = OperatorsOpTStr[value.groupByOp].slice(9) + ":" +
                    value.fieldName;
        info.tooltip = "Grouped by " +
                        OperatorsOpTStr[value.groupByOp].slice(9)
                        .toLowerCase()
                        .replace('keys', '') + 
                        " on " + value.fieldName;
        info.column = value.fieldName;
    } else if (key == 'indexInput') {
        if (value.source.isTable) {
            info.type = "sort";
            info.tooltip = "Sorted by "+value.keyName;
        } else {
            info.type = "index"
            info.tooltip = "Indexed on "+value.keyName;
        }
        info.text = "indexed on " + value.keyName;
        info.column = value.keyName;
    } else if (key == 'joinInput') {
        info.text = JoinOperatorTStr[value.joinType];
        var joinType = info.text.slice(0, info.text.indexOf("Join"));
        info.type = joinType;
        var joinText = "";
        if (joinType.indexOf("Outer") > -1) {
            var firstPart = joinType.slice(0, joinType.indexOf("Outer"));
            firstPart = firstPart[0].toUpperCase() + firstPart.slice(1);
            joinText = firstPart + " Outer";
        } else {
            joinText = joinType[0].toUpperCase() + joinType.slice(1);
        }
        
        info.tooltip = joinText + " Join between table &quot;"+children[0]+
                       "&quot; and table &quot;"+children[1]+"&quot;";
        info.column = children[0] +", "+children[1];
    } else if (key == 'mapInput') {
        //XX there is a "newFieldName" property that stores the name of 
        // the new column. Currently, we are not using or displaying 
        // the name of this new column anywhere.
        var evalStr = value.evalStr;
        info.type = "map"+evalStr.slice(0,evalStr.indexOf('('));
        info.text = evalStr;
        info.tooltip = "Map: "+evalStr;
        info.column = evalStr.slice(evalStr.indexOf('(')+1, evalStr.indexOf(')'));
    }
    return (info);
}

var dagApiMap = {
    2 : 'loadInput', 
    3 : 'indexInput',
    6 : 'statInput', 
    7 : 'statByGroupIdInput', 
    10 : 'listTablesInput', 
    13 : 'makeResultSetInput', 
    14 : 'resultSetNextInput', 
    15 : 'joinInput', 
    16 : 'filterInput', 
    17 : 'groupByInput', 
    19 : 'editColInput', 
    20 : 'resultSetAbsoluteInput', 
    21 : 'freeResultSetInput', 
    22 : 'deleteTableInput', 
    23 : 'getTableRefCountInput', 
    23 : 'tableInput', 
    24 : 'bulkDeleteTablesInput', 
    25 : 'destroyDsInput', 
    26 : 'mapInput', 
    27 : 'aggregateInput', 
    28 : 'queryInput', 
    29 : 'queryStateInput', 
    30 : 'exportInput', 
    31 : 'dagTableNameInput', 
    32 : 'listFilesInput'
};

function createCanvas($dagWrap) {
    var dagWidth = $dagWrap.find('.dagImage > div').width();
    var dagHeight = $dagWrap.find('.dagImage > div').height();
    var canvasHTML = $('<canvas class="canvas" width="'+dagWidth+
                     '" height="'+dagHeight+'"></canvas>');
    $dagWrap.find('.dagImage').append(canvasHTML);
    return (canvasHTML[0]);
}

// this function draws all the lines going into a blue table icon and its
// corresponding gray origin rectangle 
function drawDagLines(dagTable, ctx) {
    if (dagTable.prev().children().length != 2 ) { // exclude joins
        if (dagTable.children('.dataStore').length == 0) { //exclude datasets
            drawStraightDagConnectionLine(dagTable, ctx);
        } 
    } else { // draw lines for joins

        var origin1 = dagTable.prev().children().eq(0)
                      .children().eq(1).find('.dagTable');
        var origin2 = dagTable.prev().children().eq(1)
                      .children().eq(1).find('.dagTable');

        var desiredY = (origin1.position().top + origin2.position().top)/2;
        var currentY = dagTable.find('.dagTable').position().top;
        var yAdjustment = (desiredY - currentY)*2;
        dagTable.css({'margin-top': yAdjustment}); 

        var tableX = dagTable.find('.dagTable').position().left;
        var tableY = dagTable.find('.dagTable').position().top +
                     dagTable.height()/2;
        drawLine(ctx, tableX, tableY); // line entering table

        curvedLineCoor = {
            x1: origin1.position().left + origin1.width(),
            y1: origin1.position().top + origin1.height()/2,
            x2: Math.floor(dagTable.find('.actionTypeWrap').position().left+12),
            y2: Math.floor(dagTable.find('.actionTypeWrap').position().top)
        }
        drawCurve(ctx, curvedLineCoor); 
    }
}

// draw the lines corresponding to tables not resulting from joins
function drawStraightDagConnectionLine(dagTable, ctx) {
    var tableX = dagTable.find('.dagTable').position().left;
    var farLeftX = dagTable.position().left;
    var currentY = dagTable.offset().top;
    if (dagTable.prev().children().children('.dagTableWrap').length > 0) {
        var desiredY = dagTable.prev().children().children('.dagTableWrap').offset().top;
    } else {
         var desiredY = dagTable.prev().children('.dagTableWrap').offset().top;
    }
    var yAdjustment = (desiredY - currentY)*2;
    dagTable.css({'margin-top': yAdjustment});
    var tableCenterY = dagTable.find('.dagTable').position().top + 
                 dagTable.height()/2;
    drawLine(ctx, tableX, tableCenterY, (tableX - farLeftX + 20));
}

function drawCurve(ctx, coor) {
    var x1 = coor.x1;
    var y1 = coor.y1;
    var x2 = coor.x2;
    var y2 = coor.y2;
    var vertDist = y2 - y1;

    var xoffset = 0;
    if (vertDist < 60) {
        xoffset = 1000 / vertDist;
    }
   
    ctx.beginPath();
    ctx.moveTo(x1 + xoffset, y1);
    ctx.bezierCurveTo( x2+50, y1,
                        x2+50, y1 + (vertDist + 16)*2,
                        x1 + xoffset, y1 + (vertDist + 16)*2 + 1);
    ctx.moveTo(x1 - 10, y1);
    ctx.lineTo(x1 + xoffset, y1);
    ctx.moveTo(x1 - 10, y1 + (vertDist + 17)*2);
    ctx.lineTo(x1 + xoffset, y1 + (vertDist + 16)*2 +1);
    ctx.stroke();
}


function drawLine(ctx, x, y, length) {
    // draw a horizontal line
    var dist = 30;
    if (length != undefined) {
        dist = length;
    }
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x - dist, y);
    ctx.stroke();
}

function drawDot(x, y) {
    var html = '<div style="font-size: 8px; width:3px;height:3px;'+
               'background-color:green;position:absolute; left:'+x+
               'px;top:'+y+'px;">'+x+','+y+'</div>';
    $('.dagImage').append(html);
}
