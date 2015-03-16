function setupDag() {
    $('#compSwitch').click(function() {
        var compSwitch = $(this);
        var dag = $('#dagPanel');
        var workspacePanel = $('#workspacePanel');
        
        if (dag.hasClass('hidden')) {
            dag.removeClass('hidden');
            compSwitch.addClass('active');
            if (dag.hasClass('midway')) {
                $('#mainFrame').addClass('midway');
            }
        } else if (workspacePanel.hasClass('active')) {
            dag.addClass('hidden');
            compSwitch.removeClass('active');
            $('#mainFrame').removeClass('midway');
        }

        $('.mainPanel').hide().removeClass('active');
        $('.mainMenuTab').removeClass('active');
        workspacePanel.show().addClass('active');
        $('#workspaceTab').addClass('active');
    });

    $('#dagPulloutTab').click(function() {
        var dag = $('#dagPanel');
        if (dag.hasClass('midway')) {
            dag.removeClass('midway').addClass('full');
        } else {
            dag.removeClass('full').addClass('midway');
            $('#mainFrame').addClass('midway');
        }
    });

    $('#closeDag').click(function() {
        $('#compSwitch').trigger('click');
    });

    var $dagPanel = $('#dagPanel');

    // add new retina
    $dagPanel.on('click', '.addRet', function(){
        var $addBtn = $(this);
        $dagPanel.find('.retTab.active').removeClass('active');
        var $retTabSection = $addBtn.closest('.retinaArea')
                                    .find('.retTabSection');
        var len = $retTabSection.children().length;
        var retName = 'Retina ' + (len + 1);
        var html = 
            '<div class="retTab unconfirmed">' + 
                '<div class="tabWrap">' + 
                    '<input type="text" class="retTitle"' + 
                    ' placeholder="' + retName + '" >' + 
                    '<div class="retDown">' + 
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

        $retTab = $(html);
        $retTab.data('retname', retName);
        $retTabSection.append($retTab);
        $retTab.find('.retTitle').focus();
    });
    
    // keyup on retina title to confirm the input
    $dagPanel.on('keyup', '.retTitle', function(event) {
        event.preventDefault();
        if (event.which !== keyCode.Enter) {
            return;
        }
        var $input = $(this);
        var $retTab = $input.closest('.retTab');
        var retName = jQuery.trim($input.val());
        if (retName == "") {
            retName = $retTab.data('retname');
            $input.val(retName);
        }

        var tableName = $input.closest('.retinaArea')
                              .data('tablename');
        console.log('Make retina with table:', tableName,
                    'and retina name:', retName);

        // XcalarMakeRetina(retinaName, tableName)
        // .done(function() {
        //     console.log('Create New Retina for', tableName);
        // XXX Can bu put outside if you want to 
        // make this change before xcalar call
            $retTab.data('retname', retName);
            $retTab.removeClass('unconfirmed');
            $input.attr('disabled', 'disabled');
            $input.blur();
        // });
    });

    // toggle open retina pop up
    $dagPanel.on('click', '.tabWrap', function() {
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

    // create new parameters to retina
    $dagPanel.on('click', '.addParam', function() {
        var $btn = $(this);
        var $input = $btn.prev('.newParam');
        var paramName = jQuery.trim($input.val());
        if (paramName == "" || paramName == undefined) {
            var text = "Please input a valid parameter name!";
            displayErrorMessage(text, $input);
            $input.val("");
            return;
        }

        var $retPopUp = $btn.closest('.retPopUp');
        var $tbody = $retPopUp.find('tbody');

        var retName = $retPopUp.closest('.retTab').data('retname');
        $input.val("");
        console.log('New Parameter in retina:', retName,
                    'parameter name:',paramName);
        // XcalarAddVariableToRetina(retName, varName)
        // .done(function() {
            // XXX Can bu put outside if you want to 
            // make this change before xcalar call
            var $trs = $tbody.find('.unfilled');
            if ($trs.length > 0) {
                var $tr = $trs.eq(0);
                $tr.find('.paramName').html(paramName);
                $tr.removeClass('unfilled');
            }
        // });
        
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
    $dagPanel.on('click', '.paramDelete', function() {
        var $delBtn = $(this);
        var $tr = $delBtn.closest('tr');
        var paramName = $tr.find('.paramName').text();
        var options = {};
        options.title = 'DELETE RETINA PARAMETER';
        options.msg = 'Are you sure you want to delete parameter ' 
                      + paramName + '?';
        options.isCheckBox = true;
        options.confirmFunc = function() {
            $tr.find('.paramName').empty();
            $tr.find('.paramVal').empty();
            $tr.addClass('unfilled');
        }
        showAlertModal(options);
    });



    $dagParameterModal = $('#dagParameterModal');

    $dagParameterModal.find('.cancel, .close').click(function() {
        closeDagParamModal($dagParameterModal);
    });

    $dagParameterModal.find('.confirm').click(function() {
        //XX This is what we call when we click save

        updateRetina($dagParameterModal.data('id'))
        .done(function(){
            //XX right now we have this clearing the modal
            closeDagParamModal($dagParameterModal);
            // show success message??
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

}

function updateRetina(id) {
    var deferred = jQuery.Deferred();
    deferred.resolve();
    return (deferred.promise());
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
}

function showDagParamModal($currentIcon) {
    $dagModal = $('#dagParameterModal');
    $dagModal.show();
    $('#modalBackground').fadeIn(200);
    var type = $currentIcon.data('type');
    var id = $currentIcon.data('id');
    $('#dagParameterModal').data('id', id);
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
        var abbrFilterType = filterInfo.slice(0,2);
        var filterValue = filterInfo.slice(filterInfo.indexOf(',')+2, 
                                              filterInfo.indexOf(')'));
        var filterTypeMap = {
            "gt" : ">",
            "ge" : "&ge;",
            "eq" : "=",
            "lt" : "<",
            "le" : "&le;",
            "regex" : "regex",
            "like" : "like"
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
    generateParameterDefaultList(id);
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
    $dagModal.removeClass('enlarged');
    $('#addNewParameterizedQuery').removeClass('btnInactive');
    $('#modalBackground').fadeOut(200);
}

function showEditableParamQuery() {
    $dagModal = $('#dagParameterModal');
    $dagModal.find('.currentParameterList').next().show();
    $dagModal.find('.editableParamQuery').show();
    $dagModal.find('.defaultListSection').show();
    $dagModal.addClass('enlarged');
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
        return;
    }
    
    var $draggableParam = $('#'+paramId).clone();
    if ($('.editableRow').data('origin') == 'home') {
        if ($dropTarget.find('#'+paramId).length > 0) {
            return;
        }
    } else {
        if ($dropTarget.find('#'+paramId).length > 0 && 
            $dropTarget.data('target') != $('.editableRow').data('origin')) {
            return;
        }
        $('.editableRow .editableParamDiv').filter(function() {
            return $(this).data('target') == $('.editableRow').data('origin');
        }).find('#'+paramId).remove();
    }

    $draggableParam.addClass('dropped');
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

function constructDagImage(tableName) {
    drawDag(tableName)
    .done(function(dagDrawing) {
        var outerDag = '<div class="dagWrap">'+
            '<div class="header clearfix">'+
                '<div class="btn btnSmall infoIcon">'+
                    '<div class="icon"></div>'+
                '</div>'+
                '<div class="tableTitleArea">'+
                    'Table: <span class="tableName">'+tableName+'</span>'+
                '</div>'+
                '<div class="retinaArea" data-tablename="' + tableName + '">' + 
                    '<div title="Add New Retina" class="btn addRet">' + 
                        '<span class="icon"></span>' + 
                    '</div>' + 
                    '<div class="retTabSection"></div>' +
                '</div>' +
            '</div>'+
            '</div>';

        var innerDag = '<div class="dagImageWrap"><div class="dagImage">'+
                        dagDrawing+'</div></div>';
        $('.dagArea').append(outerDag);
        $('.dagWrap:last').append(innerDag);
        var canvas = createCanvas();
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#999999';
        var $dagWrap = $('.dagWrap:last');
        $dagWrap.find('.dagTableWrap').each(function() {
            var el = $(this);
            drawDagLines(el, ctx);
        });

        
        var dropdown = getDagDropDownHTML();
        $dagWrap.append(dropdown);
        $dagWrap.find('.colMenu').width('auto');
        addDagEventListeners($dagWrap);
        // $('.dagImageWrap').scrollLeft($('.dagImage').width());
    })
    .fail(function() {
        console.log('dag failed')
    });
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
                        '<span class="tableTitle">Dataset '+
                            getDagName(dagNode)+
                        '</span>';
    } else {
        dagTable += '<div class="dagTable">' +
                        '<div class="dagTableIcon"></div>'+
                        '<div class="icon"></div>'+
                        '<span class="tableTitle">'+
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

function drawDag(tableName) {
    var deferred = jQuery.Deferred();
    XcalarGetDag(tableName).done(function(dagObj) {
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
    });


    function getParentChildDagMap(dagObj) {
        var dagArray = dagObj.node;
        var numNodes = dagObj.numNode;
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
        if (value.srcTable.tableName == "") {
            children.push(value.dstTable.tableName);
        } else {
            children.push(value.srcTable.tableName);
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
        childName = value.newFieldName;
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
    // XX NEED TO FIND REAL DAGNODE ID
    dagNode.id = Math.ceil(Math.random()*10000); //XX TEMPORARY DAG NODE ID!!!
    info.id = dagNode.id;

    if (key == 'loadInput') {
        info.url = value.dataset.url;
    } else if (key == 'filterInput') {
        var filterStr = value.filterStr;
        var abbrFilterType = filterStr.slice(0,2);
        
        info.type = "filter"+abbrFilterType;
        info.text = filterStr;
        var filterType = "";

        var filterTypeMap = {
            "gt" : "greater than",
            "ge" : "reater than or equal to",
            "eq" : "equal to",
            "lt" : "less than",
            "le" : "less than or equal to",
            "regex" : false,
            "like" : false
        };

        if (filterTypeMap[abbrFilterType]) {
            var filteredOn = filterStr.slice(3, filterStr.indexOf(','));
            var filterType = filterTypeMap[abbrFilterType];
            var filterValue = filterStr.slice(filterStr.indexOf(',')+2, 
                                              filterStr.indexOf(')'));
            info.column = filteredOn;
            info.tooltip = "Filtered table &quot;"+children[0]+"&quot; where "+
                        filteredOn+" is "+filterType+" "+filterValue+".";
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
        if (value.datasetId === 0) {
            info.type = "sort";
            info.tooltip = "Sorted by "+value.keyName;
        } else {
            info.type = "index"
            info.tooltip = "Indexed on "+value.keyName;
        }
        info.text = "indexed on " + value.keyName;
        info.column = value.keyName;
    } else if (key == 'joinInput') {
        info.type = OperatorsOpTStr[value.joinType][9].toLowerCase() +
                    OperatorsOpTStr[value.joinType].slice(10);
        info.text = OperatorsOpTStr[value.joinType].slice(9);
        var joinType = info.text.slice(0, info.text.indexOf("Join"));
        info.tooltip = joinType+ " Join between table &quot;"+children[0]+
                       "&quot; and table &quot;"+children[1]+"&quot;";
        info.column = children[0] +", "+children[1];
    } else if (key == 'mapInput') {
        //XX there is a "newFieldName" property that stores the name of 
        // the new column that is currently not being used
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

function createCanvas() {
    var dagWrap = $('.dagWrap:last');
    var dagWidth = dagWrap.find('.dagImage > .joinWrap').width();
    var dagHeight = dagWrap.find('.dagImage > .joinWrap').height();
    var canvasHTML = $('<canvas class="canvas" width="'+dagWidth+
                     '" height="'+dagHeight+'"></canvas>');
    $('.dagWrap:last .dagImage').append(canvasHTML);
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