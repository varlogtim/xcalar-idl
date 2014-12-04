// XXX FIXME Move globals to script.js
var equationCellRow;
var equationCellCol;

function generateScratchpad(row, col) {
    $("#scratchpadTitle").attr("colspan", col);
    var spHTML = "";
    for (var i = 0; i<row; i++) {
        spHTML += ("<tr class=row"+i+">");
        for (var j = 0; j<col; j++) {
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
                console.log("equals!");
                equationCellRow = $(this).parent().parent().attr("class");
                equationCellCol = $(this).parent().attr("class");
                equationMode();
            }
        });
    });
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
        .click(
        function() {
            $(".scratchpad ."+equationCellRow+" ."+equationCellCol+
            " .editableHead").val($(this).parent().attr("class") +
            $(this).attr("class"));
            $(".scratchpad ."+equationCellRow+" ."+equationCellCol+
            " .editableHead").focus();
        }
    );
}
