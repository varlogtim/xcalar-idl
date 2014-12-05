// XXX FIXME Move globals to script.js
var equationCellRow;
var equationCellCol;
var equations = [];
var affectedCells = [];

function scratchpadStartup() {
    generateScratchpad(20, 4);
    attachScratchpadTabListener();
    attachEqualsListener();
}

function attachScratchpadTabListener() {
    $(".scratchpad .editableHead").each(function() {
        $(this).removeClass("selected");
        $(this).removeClass("connected");
    });
    $("#scratchpadArea").toggle();
    $("#scratchpadTab").click(function() {
        $("#scratchpadArea").toggle();
        $("#scratchpadTab").toggleClass("tabSelected");        
    });
    if ($(".scratchpad").has(gFnBarOrigin)) {
        gFnBarOrigin = undefined;
    }
}

function generateScratchpad(row, col) {
    $("#scratchpadTitle").attr("colspan", col);
    var spHTML = "";
    for (var i = 0; i<row; i++) {
        spHTML += ("<tr class=row"+i+">");
        equations[i] = [];
        affectedCells[i] = [];
        for (var j = 0; j<col; j++) {
            equations[i][j] = "";
            affectedCells[i][j] = [];
            spHTML += "<td class=col"+j+">";
            spHTML += "<input class='editableHead' type='text'></input>";
            spHTML += "</td>";
        }
        spHTML += "</tr>";
    }
    $(".scratchpad tbody").append(spHTML);
}

function enterEquationMode() {
    equationCellRow = gFnBarOrigin.parent().parent().attr("class");
    equationCellCol = gFnBarOrigin.parent().attr("class");
    equationMode();
}

function attachEqualsListener() {
    $(".scratchpad .editableHead").each(function() {
        $(this).keyup(function(e) {
            switch (e.which) {
            case (keyCode.Equal):
                if (equationCellRow != undefined ||
                    equationCellCol != undefined) {
                    console.log("double equals!");
                    return;
                }
                if ($(this).val().indexOf("=") != 0) {
                    console.log("equal not at start of equation");
                    return;
                }
                equationCellRow = $(this).parent().parent().attr("class");
                equationCellCol = $(this).parent().attr("class");
                equationMode();
                break;
            case (keyCode.Enter):
                if (equationCellRow == undefined &&
                    equationCellCol == undefined) {
                    $(".scratchpad .editableHead").blur();
                    return;
                }
                undoEquationMode();
                executeFunction();
                equationCellRow = undefined;
                equationCellCol = undefined;
                break;
            case (keyCode.Delete):
                if (equationCellRow == undefined &&
                    equationCellCol == undefined) {
                   $(this).val("");
                   $("#fnBar").val("");
                   var cellRow = $(this).parent().parent().attr("class");
                   var cellCol = $(this).parent().attr("class");
                   equations[parseInt(cellRow.substring(3))]
                            [parseInt(cellCol.substring(3))] = "";
                   $(this).prop("readonly", false);
                   $(this).blur();
                }
                break;
            default:
                break;
            }
        });
    });
    $(".scratchpad .editableHead").each(function() {
        $(this).click(function() {
            if (equationCellRow == undefined &&
                equationCellCol == undefined) {
                $(".scratchpad .editableHead").each(function() {
                    $(this).removeClass("selected");
                    $(this).removeClass("connected");
                });
                $(this).addClass("selected");
                var cellRow = $(this).parent().parent().attr("class");
                var cellCol = $(this).parent().attr("class");
                var affected = affectedCells[parseInt(cellRow.substring(3))]
                                            [parseInt(cellCol.substring(3))];
                jQuery.each(affected, function() {
                    console.log($(this));
                });
                var value = equations[parseInt(cellRow.substring(3))]
                                     [parseInt(cellCol.substring(3))];
                if ($(this).parent().hasClass("error")) {
                    console.log("Has error");
                    $(this).removeClass("error");
                    $(this).val(value);
                    $(this).focus();
                }
                $("#fnBar").val(value);
                gFnBarOrigin = $(this);
                if (value && value.indexOf("=") == 0) {
                }
            }
        });
    });
    $(".scratchpad .editableHead").on("input", function() {
        var cellRow = $(this).parent().parent().attr("class");
        var cellCol = $(this).parent().attr("class");
        equations[parseInt(cellRow.substring(3))]
                 [parseInt(cellCol.substring(3))] = $(this).val();
        $("#fnBar").val($(this).val());
        gFnBarOrigin = $(this);
    });
}

function clickToAppendCell() {
    var selector = $(".scratchpad ." + equationCellRow+" ."
                     + equationCellCol + " .editableHead");
    selector.val(selector.val() + $(this).parent().attr("class") +
                 $(this).attr("class"));
    $(".scratchpad ."+equationCellRow+" ."+equationCellCol+
    " .editableHead").focus();
    $("#fnBar").val(selector.val());
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

function replaceValuesInEvalString(str, row, col) {
    affectedCells[row][col] = [];
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
        affectedCells[row][col].push(matches[1]);
    }
    return (str);
}

function executeFunction() {
    var selector = $(".scratchpad ." + equationCellRow+" ."
                     + equationCellCol + " .editableHead");
    console.log("executing function");
    try {
        var row = parseInt(equationCellRow.substring(3));
        var col = parseInt(equationCellCol.substring(3));
        equations[row][col] = selector.val();
        var evalString = replaceValuesInEvalString(selector.val().substring(1),
                                                   row, col);
        var value = eval(evalString);
        selector.val(value);
        selector.prop("readonly", true);
    } catch(err) {
        // Change color
        selector.parent().addClass("error");
        console.log("Eval failed!");
        selector.removeClass("selected");
        equations[parseInt(equationCellRow.substring(3))]
                 [parseInt(equationCellCol.substring(3))] =
                 selector.val().substring(1);
        selector.val(selector.val().substring(1));
    }
}
