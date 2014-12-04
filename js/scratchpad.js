// XXX FIXME Move globals to script.js
var equationCellRow;
var equationCellCol;
var equations = [];

function generateScratchpad(row, col) {
    $("#scratchpadTitle").attr("colspan", col);
    var spHTML = "";
    for (var i = 0; i<row; i++) {
        spHTML += ("<tr class=row"+i+">");
        equations[i] = [];
        for (var j = 0; j<col; j++) {
            equations[i][j] = "";
            spHTML += "<td class=col"+j+">";
            spHTML += "<input class='editableHead' type='text'></input>";
            spHTML += "</td>";
        }
        spHTML += "</tr>";
    }
    $(".scratchpad tbody").append(spHTML);
    attachEqualsListener();
}

function attachEqualsListener() {
    $(".scratchpad .editableHead").each(function() {
        $(this).keyup(function(e) {
            if (e.which === 187) {
                if (equationCellRow != undefined ||
                    equationCellCol != undefined) {
                    console.log("double equals!");
                    return;
                }
                console.log("equals!");
                equationCellRow = $(this).parent().parent().attr("class");
                equationCellCol = $(this).parent().attr("class");
                equationMode();
            } else if (e.which === 13) {
                if (equationCellRow == undefined &&
                    equationCellCol == undefined) {
                    $(".scratchpad .editableHead").blur();
                    return;
                }
                undoEquationMode();
                executeFunction();
                equationCellRow = undefined;
                equationCellCol = undefined;
            }
        });
    });
    $(".scratchpad .editableHead").each(function() {
        $(this).click(function() {
            if (equationCellRow == undefined &&
                equationCellCol == undefined) {
                var cellRow = $(this).parent().parent().attr("class");
                var cellCol = $(this).parent().attr("class");
                $("#functionBar").val(
                    equations[parseInt(cellRow.substring(3))]
                             [parseInt(cellCol.substring(3))]);
            }
        });
    });
}

function clickToAppendCell() {
    var selector = $(".scratchpad ." + equationCellRow+" ."
                     + equationCellCol + " .editableHead");
    selector.val(selector.val() + $(this).parent().attr("class") +
                 $(this).attr("class"));
    $(".scratchpad ."+equationCellRow+" ."+equationCellCol+
    " .editableHead").focus();
}

function equationMode() {
    console.log("EquationMode!");
    $(".scratchpad td")
        .not(".scratchpad ."+equationCellRow+" ."+equationCellCol)
        .children(".editableHead").each(function() {
            $(this).prop('readonly', true);
        });
    $(".scratchpad td")
        .not(".scratchpad ."+equationCellRow+" ."+equationCellCol)
        .click(clickToAppendCell);
}

function undoEquationMode() {
    console.log("No EquationMode!");
    $(".scratchpad td")
        .not(".scratchpad ."+equationCellRow+" ."+equationCellCol)
        .children(".editableHead").each(function() {
            $(this).prop('readonly', false);
        });
    $(".scratchpad td")
        .not(".scratchpad ."+equationCellRow+" ."+equationCellCol)
        .unbind("click", clickToAppendCell);
    $(".scratchpad .editableHead").blur();
}

function replaceValuesInEvalString(str) {
    while (str.indexOf("row") != -1) {
        var regExp = /(row\d*col\d*)/;
        var matches = regExp.exec(str);
        var regExp2 = /row(\d*)col(\d*)/;
        var matches2 = regExp2.exec(matches[1]);
        var cellRow = matches2[1];
        var cellCol = matches2[2];
        var cellVal = $(".scratchpad .row"+cellRow+" .col"+cellCol
                      +" .editableHead").val();
        if (cellVal == "") {
            cellVal = "(0)";
        }
        str = str.replace(matches[1], cellVal);
    }
    return (str);
}

function executeFunction() {
    var selector = $(".scratchpad ." + equationCellRow+" ."
                     + equationCellCol + " .editableHead");
    try {
        equations[parseInt(equationCellRow.substring(3))]
                 [parseInt(equationCellCol.substring(3))] = selector.val();
        console.log("Here");
        var evalString = replaceValuesInEvalString(selector.val().substring(1));
        var value = eval(evalString);
        selector.val(value);
    } catch(err) {
        // Change color
        selector.parent().addClass("selectedCell");
        console.log("Eval failed!");
        selector.val("##NaN##");
    }
}
