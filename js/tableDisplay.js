function fillPageWithBlankCol() {
    var tableWidth = $("#autoGenTable").width();
    var screenWidth = window.screen.availWidth;
    var numColsToFill = Math.ceil((screenWidth - tableWidth)/gNewCellWidth) ;
    var startColId = $("#autoGenTable tr:first th").length;
    for (var i = 0; i<numColsToFill; i++) {
        addCol("headCol"+(startColId+i), "", {'isDark': true});
    }
}

function generateBlankTable() {
    var screenWidth = window.screen.availWidth;
    var numColsToFill = Math.ceil(screenWidth/gNewCellWidth);
    var html = "";
    // XX may not need to empty if we just start out empty, but
    // we need to adjust the other functions that depend on the id and
    // data column
    $('#autoGenTable thead, #autoGenTable tbody').empty();
    html += '<tr>';
    html += '<th style="width:'+(gRescol.cellMinWidth+10)+'px;"></th>';
    for (var i = 0; i < numColsToFill; i++) {
            html += '<th style="width:'+gNewCellWidth+'px;"></th>';
    }
    html += '</tr>';
    $('#autoGenTable thead').append(html);
    html = "";
    for (var i = 1; i <= 60;  i++) {
    // XXX make a variable for 60 || num rows
        html += '<tr>';
        html += '<td align="center" id="bodyr'+
                    i+'c1"'+
                    'style="height:'+gRescol.minCellHeight+'px;">'+
                    '<div class="idWrap"><span class="idSpan">'+
                    i+'</span>'+
                    '<div class="rowGrab"></div>'+
                    '</div>'+
                '</td>';
        for (var j = 0; j<numColsToFill; j++) {
            html += '<td></td>';
        }
        html += '</tr>';
    }
    $('#autoGenTable tbody').html(html);
    $('#autoGenTable').width(screenWidth);
    $('#autoGenTable .rowGrab').mousedown(function(event) {
        resrowMouseDown($(this), event);
    });
}

function generateRowWithCurrentTemplate(json, id, rowTemplate, direction) {
    // Replace JSON
    var firstPart = rowTemplate.firstPart;
    var secondPart = rowTemplate.secondPart;
    var finalString = firstPart+json+secondPart;
    // Replace id
    firstIndex = finalString.indexOf('idSpan">')+('idSpan">').length;
    secondIndex = finalString.indexOf("<", firstIndex);
    firstPart = finalString.substring(0, firstIndex);
    secondPart = finalString.substring(secondIndex);
    finalString = "<tr>"+firstPart + id + secondPart+"</tr>";

    if (direction == 1) {
        var row = "tr:first-child";
    } else {
        var row = "tr:last-child";
    }

    if ($("#autoGenTable tbody tr").length == 0) {
        $("#autoGenTable tbody").append(finalString);
    } else { 
        if (direction == 1) {
            $("#autoGenTable").prepend(finalString);
        } else {
            $("#autoGenTable").append(finalString);
        }    
    }

    // Replace element id
    $("#autoGenTable tbody "+row).find("[id]").each(function() {
        var colNoInd = (this.id).indexOf("c");
        var colNo = (this.id).substring(colNoInd+1);
        this.id = "bodyr"+id+"c"+colNo;
    });

    $('#autoGenTable tbody '+row+' .jsonElement').dblclick(function() {
        showJsonModal($(this));
    });

    $('#autoGenTable  tbody '+row+' .rowGrab').mousedown(function(event) {
        resrowMouseDown($(this), event);
    });
}

function generateRowWithAutoIndex(text, hoverable) {
    var URIEncoded = encodeURIComponent(text);
    console.log(URIEncoded);
    if (hoverable) {
        var clickable = 'class="mousePointer"';
    } 
    else { 
        var clickable = "";
    }
    $("#autoGenTable tr:last").after('<tr><td height="18" align="center"'+
        'bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        gTableRowIndex+"c1"+'" onmouseover="javascript: console.log(this.id)">'+
        gTableRowIndex+'</td>'+
        '<td bgcolor="#FFFFFF" class="monacotype" id="bodyr'+
        gTableRowIndex+"c2"+'" onmouseover="javascript: console.log(this.id)"'+
        ' onclick="javascript: window.location.href=\'cat_table.html?'+
        'tablename='+
        URIEncoded+'\'">'+
        '<div class="cellRelative"><span '+clickable+'>'+text+'</span>'+
        '<div class="dropdownBox"></div>'+
        '</div></td></tr>');
    gTableRowIndex++;
}

function generateFirstScreen(value, idNo, height) {
    if (height == undefined) {
        var cellHeight = gRescol.minCellHeight;
    } else {
        var cellHeight = height;
    }
    $("#autoGenTable tbody").append('<tr>'+
        '<td align="center" id="bodyr'+
        idNo+'c1"'+
        'style="height:'+cellHeight+'px;">'+
        '<div class="idWrap"><span class="idSpan">'+
        idNo+'</span><div class="rowGrab"></div></div></td>'+
        '<td class="jsonElement" id="bodyr'+
        idNo+'c2">'+
        '<div class="elementTextWrap" style="max-height:'+
        (cellHeight-4)+'px;">'+
        '<div class="elementText">'+
        value+'</div>'+
        '</div>'+
        '</td>'+
        '</tr>');

    $('#autoGenTable tbody tr:eq('+(idNo-1)+') .jsonElement').dblclick(
        function(){
            showJsonModal($(this));
        }
    );
    $('#bodyr'+idNo+'c1 .rowGrab').mousedown(function(event) {
        resrowMouseDown($(this), event);
    });
}

function createRowTemplate() {
    var startString = '<div class="elementText">';
    var endString="</div>";
    var originalString = $("#autoGenTable tbody tr:nth-last-child(1)").html() ||
                         gTempStyle;
    var index = originalString.indexOf(startString);
    var firstPart = originalString.substring(0, index+startString.length);
    var secondPart = originalString.substring(index+startString.length+1);
    var secondIndex = secondPart.indexOf(endString);
    secondPart = secondPart.substring(secondIndex);
    var parts = {};
    parts.firstPart = firstPart;
    parts.secondPart = secondPart;
    return (parts);
}