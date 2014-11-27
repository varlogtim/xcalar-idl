function fillPageWithBlankCol() {
    var tableWidth = $("#autoGenTable").width();
    var screenWidth = window.screen.availWidth;
    var numColsToFill = Math.ceil((screenWidth - tableWidth)/gNewCellWidth) ;
    var startColId = $("#autoGenTable tr:first th").length;
    for (var i = 0; i<numColsToFill; i++) {
        addCol("headCol"+(startColId+i), "", {'isDark': true});
    }
}

function generateRowWithCurrentTemplate(json, id, direction) {
    // Replace JSON
    var startString = '<div class="elementText">';
    var endString="</div>";
    var originalString = $("#autoGenTable tbody tr:nth-last-child(1)").html() ||
                         gTempStyle;
    var index = originalString.indexOf(startString);
    var firstPart = originalString.substring(0, index+startString.length);
    var secondPart = originalString.substring(index+startString.length+1);
    var secondIndex = secondPart.indexOf(endString);
    secondPart = secondPart.substring(secondIndex);
    var finalString = firstPart+json+secondPart;
    // console.log(finalString,1)
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
            $("#autoGenTable tbody tr:first-child").before(finalString);
        } else {
            $("#autoGenTable tbody tr:nth-last-child(1)").after(finalString);
        }    
    }

    // Replace element id
    $("#autoGenTable tbody "+row).find("[id]").each(function() {
        var colNoInd = (this.id).indexOf("c");
        var colNo = (this.id).substring(colNoInd+1);
        this.id = "bodyr"+id+"c"+colNo;
    });

    $('#autoGenTable tbody '+row+' .jsonElement').dblclick(function() {
        showJsonPopup($(this));
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
            showJsonPopup($(this));
        }
    );
    $('#bodyr'+idNo+'c1 .rowGrab').mousedown(function(event) {
        resrowMouseDown($(this), event);
    });
}
