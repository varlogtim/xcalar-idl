$(document).ready(function(){

    var numRowsToAdd = 20;
    var numCols = $('#autoGenTable th').length;
    for (var i = 0; i < numRowsToAdd; i++) {
        $('#autoGenTable tbody tr:last').after('<tr></tr>');
        for (var j = 0; j < numCols; j++) {
            $('#autoGenTable tbody tr:last').append('<td></td>');
        }
    }
    
    $('#autoGenTable th:eq(2)').after('<th class="pinkCell">Header</th>');
    $('#autoGenTable tbody tr').each(function(){
        $(this).children().eq(2).after('<td class="pinkCell">1</td>');
    });
    $('#autoGenTable tfoot td:eq(2)').after('<td class="pinkCell"></td>');

    $('#autoGenTable th:eq(2)').after('<th class="darkCell"></th>');
    $('#autoGenTable tbody tr').each(function(){
        $(this).children().eq(2).after('<td class="darkCell">1</td>');
    });
    $('#autoGenTable tfoot td:eq(2)').after('<td class="darkCell"></td>');
});