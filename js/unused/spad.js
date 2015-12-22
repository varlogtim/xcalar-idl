var mode = SPMode.Normal;
var equations = [];
var affectedCells = [];
var focusedCell;

function scratchpadStartup() {
    generateScratchpad(20, 4);
    attachCellListeners();
    attachScratchpadEmptySpaceListeners();
}

function attachScratchpadEmptySpaceListeners() {
    $(".scratchpad").mouseup(function() {
        if (document.activeElement.tagName !== "INPUT") {
            switch (mode) {
            case (SPMode.Selected):
                changeAffectedCells(AffectedEntryAction.DelConnected);
                mode = SPMode.Normal;
                focusedCell = undefined;
            break;
            case (SPMode.Equation):
                focusedCell.focus();
                break;
            default:
                break;
            }
        }
    });
}
    
function generateScratchpad(row, col) {
    $("#scratchpadTitle").attr("colspan", col);
    var spHTML = "";
    for (var i = 0; i < row; i++) {
        spHTML += ("<tr class=row" + i + ">");
        equations[i] = [];
        affectedCells[i] = [];
        for (var j = 0; j < col; j++) {
            equations[i][j] = "";
            affectedCells[i][j] = [];
            spHTML += "<td class=col" + j + ">";
            spHTML += "<input class='editableHead' type='text'></input>";
            spHTML += "</td>";
        }
        spHTML += "</tr>";
    }
    $(".scratchpad tbody").append(spHTML);
}

function attachCellListeners() {
    $(".scratchpad .editableHead").each(function() {
        $(this).keyup(function(e) {
            cellKeyUpListener(e);
        });
        $(this).mousedown(function(e) {
            cellMouseDownListener($(this), e);
        });
    });
    $("#functionBar").keyup(function(e) {
        barKeyUpListener(e);
    });
    $("#functionBar").mousedown(function(e) {
        barKeyUpListener(e);
    });
}

function cellKeyUpListener(e) {
    console.log(mode);
    switch (mode) {
    case (SPMode.Normal):
        // Do nothing
        break;
    case (SPMode.Selected):
        mode = SPMode.Type;
        switch (e.which) {
        case (keyCode.Equal):
            if (focusedCell.val().indexOf("=") === 0) {
                mode = SPMode.Equation;
            }
            break;
        case (keyCode.Delete):
            clearCell();
            break;
        default:
            break;
        }
        break;
    case (SPMode.Equation):
        switch (e.which) {
        case (keyCode.Enter):
            executeFunction(ExecuteAction.Eval);
            reevaluateAffectedCells();
            break;
        default:
            if (focusedCell.val().indexOf("=") !== 0) {
                deEquationCell();
            }
        }
        break;
    case (SPMode.Type):
        switch (e.which) {
        case (keyCode.Enter):
            reevaluateAffectedCells();
            focusedCell.blur();
            break;
        case (keyCode.Equal):
            if (focusedCell.val().indexOf("=") === 0) {
                mode = SPMode.Equation;
            }
            break;
        case (keyCode.Escape):
            focusedCell.blur();
            // XXX: This UX is wrong. It should go back to the state prior
            // to this select. Future project
            break;
        default:
            break;
        }
        break;
    default:
        break;
    }
}

function clearCell() {
    if (!focusedCell) {
        console.log("XXX No focused cell!");
        return;
    }
    var cellRow = focusedCell.parent().parent().attr("class");
    var cellCol = focusedCell.parent().attr("class");
    equations[parseInt(cellRow.substring(3))]
             [parseInt(cellCol.substring(3))] = "";
    clearAffectedCells(AffectedEntryAction.DelConnectedRemoveEntry);
    focusedCell.prop("readonly", false);
    focusedCell.blur();
}

function changeAffectedCells(action) {
    if (!focusedCell) {
        // Noop
        return;
    }
    var cellRow = focusedCell.parent().parent().attr("class");
    var cellCol = focusedCell.parent().attr("class");
    var affected = affectedCells[parseInt(cellRow.substring(3))]
                                [parseInt(cellCol.substring(3))];
    for (var i = 0; i < affected.length; i++) {
        var temp1 = affected[i].indexOf("col");
        var affectedRow = parseInt(affected[i].substring(3, temp1));
        var affectedCol = parseInt(affected[i].substring(temp1 + 3));

        if (action === AffectedEntryAction.DelConnected ||
            action === AffectedEntryAction.DelConnectedRemoveEntry) {
            $(".scratchpad .row" + affectedRow + " .col" + affectedCol +
              " .editableHead").removeClass("connected");
        } else if (action === AffectedEntryAction.AddConnected) {
            $(".scratchpad .row" + affectedRow + " .col" + affectedCol +
              " .editableHead").addClass("connected");
        } else {
            console.log("XXX Illegal action!", action);
        }
    }
    if (action === AffectedEntryAction.DelConnectedRemoveEntry) {
        affectedCells[parseInt(cellRow.substring(3))]
                     [parseInt(cellCol.substring(3))] = [];
    }
}

function replaceValuesInEvalString(str, row, col) {
    // XXX: TODO: Over here, add all the aggr functions!
    affectedCells[row][col] = [];
    while (str.indexOf("row") !== -1) {
        var regExp = /(row\d*col\d*)/;
        var matches = regExp.exec(str);
        var regExp2 = /row(\d*)col(\d*)/;
        var matches2 = regExp2.exec(matches[1]);
        var cellRow = matches2[1];
        var cellCol = matches2[2];
        var cellVal = $(".scratchpad .row" + cellRow + " .col" + cellCol +
                        " .editableHead").val();
        if (cellVal === "") {
            cellVal = "(0)";
        }
        str = str.replace(matches[1], cellVal);
        affectedCells[row][col].push(matches[1]);
    }
    return (str);
}

function executeFunction(action) {
    if (mode !== SPMode.Equation && action === ExecuteAction.Eval) {
        console.log("XXX Wrong mode!" + mode);
        return;
    }
    
    try {
        var cellRow = focusedCell.parent().parent().attr("class");
        var cellCol = focusedCell.parent().attr("class");
        var row = parseInt(cellRow.substring(3));
        var col = parseInt(cellCol.substring(3));
        var evalString;

        if (action === ExecuteAction.Eval) {
            evalString = replaceValuesInEvalString(
                                focusedCell.val().substring(1),
                                row, col);
        } else {
            evalString = replaceValuesInEvalString(
                                equations[row][col].substring(1),
                                row, col);
        }
        console.log(evalString);
        var value = eval(evalString);
        if (action === ExecuteAction.Eval) {
            equations[row][col] = focusedCell.val();
        }
        focusedCell.val(value);
        focusedCell.prop("readonly", true);
        changeAffectedCells(AffectedEntryAction.AddConnected);
        mode = SPMode.Selected;
    } catch(err) {
        console.log(err);
        alert("Error with function string. Please check!");
    }
}

function deEquationCell() {
    if (!focusedCell) {
        console.log("XXX No focused cell to deEquation!");
        return;
    }

    if (mode !== SPMode.Equation) {
        console.log("XXX Wrong mode!" + mode);
        return;
    }

    if (focusedCell.val().indexOf("=") === 0) {
        console.log("Still should be in equation mode");
        return;
    } else {
        var cellRow = focusedCell.parent().parent().attr("class");
        var cellCol = focusedCell.parent().attr("class");
        var row = parseInt(cellRow.substring(3));
        var col = parseInt(cellCol.substring(3));
        equations[row][col] = "";
        changeAffectedCells(AffectedEntryAction.DelConnectedRemoveEntry);
        mode = SPMode.Selected;
    }
}

function reevaluateAffectedCells() {
    var numRows = affectedCells.length;
    var numCols = affectedCells[0].length;
    var currRow = focusedCell.parent().parent().attr("class");
    var currCol = focusedCell.parent().attr("class");
    var cellName = currRow + currCol;
    var oldFocusedCell = focusedCell;
    console.log(cellName);
    var rerun = false;
    var numEqns = 0;
    for (var i = 0; i < numRows; i++) {
        for (var j = 0; j < numCols; j++) {
            if (equations[i][j] !== "") {
                numEqns++;
            }
        }
    }
    var numTimes = 0;
    do {
        numTimes++;
        if (numTimes > numEqns) {
            // XXX: There may be an issue with this method of detection. Think
            // more carefully
            console.log("XXX Cycle detected!");
            // XXX: Handle this!
            break;
        }
        rerun = false;
        for (var i = 0; i < numRows; i++) {
            for (var j = 0; j < numCols; j++) {
                if (equations[i][j] !== "") {
                    focusedCell = $(".scratchpad .row" + i + " .col" + j +
                                    " .editableHead");
                    var oldValue = focusedCell.val();
                    executeFunction(ExecuteAction.Update);
                    changeAffectedCells(AffectedEntryAction.DelConnected);
                    var newValue = focusedCell.val();
                    if (oldValue !== newValue) {
                        // Reeval everything
                        // XXX Use more efficient method
                        rerun = true;
                    }
                }
            }
        }
    } while (rerun);
    focusedCell = oldFocusedCell;
}

function cellMouseDownListener(cell, e) {
    console.log(mode);
    switch (mode) {
    case (SPMode.Normal):
        mode = SPMode.Selected;
        // Fall through
    case (SPMode.Selected):
        changeAffectedCells(AffectedEntryAction.DelConnected);
        focusedCell = cell;
        changeAffectedCells(AffectedEntryAction.AddConnected);
        break;
    case (SPMode.Equation):
        if (cell.get(0) !== focusedCell.get(0)) {
            var oldROProp = cell.prop("readonly");
            cell.prop("readonly", true);
            focusedCell.val(focusedCell.val() +
                            cell.parent().parent().attr("class") +
                            cell.parent().attr("class"));
            focusedCell.click();
            e.preventDefault();
            cell.prop("readonly", oldROProp);
        }
        break;
    case (SPMode.Type):
        if (cell.get(0) !== focusedCell.get(0)) {
            focusedCell = cell;
            changeAffectedCells(AffectedEntryAction.AddConnected);
        }
        mode = SPMode.Selected;
        break;
    default:
        console.log("Illegal mode!" + mode);
    }
}

function barKeyUpListener(e) {
    if (!focusedCell) {
        console.log("No selected Cell");
        $("#functionBar").blur();
        return;
    }
    switch (mode) {
        case (SPMode.Normal):
            console.log("XXX FocusedCell non null but mode is normal");
            return;
        case (SPMode.Selected):
        case (SPMode.Equation):
        case (SPMode.Type):
            focusedCell.trigger("keyup", {keyCode: e.which});
            focusedCell.val(focusedCell.val() + String.fromCharCode(e.which));
            break;
        default:
            console.log("XXX Illegal mode." + mode);
    }
}

function barMouseUpListener() {
    if (!focusedCell) {
        // XXX: Add style. Gray out perhaps. Don't allow clicking. Maybe RO
        console.log("No selected cell");
        $("#functionBar").blur();
        return;
    }
}
