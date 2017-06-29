
window.onload = toBottom;

function toBottom()
{
    var questionNumOriginal = 9;
    var questionNumNetApp1 = 20;
    var questionNumNetApp2 = 27;

    var element = document.getElementById("main");
    element.scrollTop = element.scrollHeight;

    var progressBar = document.getElementById('div-progressBarID');
    var width = 0;
    var totalQuestionNum = 9;

    switch(document.getElementsByClassName('adventure')[0].innerHTML) {
        case "Xcalar Adventure": {totalQuestionNum = 9; break;}
        case "Xcalar Adventure 2": {totalQuestionNum = 9; break;}
    }
    var answeredQuestionNum = document.forms.length == 0 ? 0 : document.forms.length - 1;
    var arr1 = document.getElementsByClassName('textarea-lastQuestion correct');
    var arr2 = document.getElementsByClassName('entireInput correct');
    if(arr1.length != 0 || arr2.length == totalQuestionNum) {
        answeredQuestionNum++;
    }
    if(answeredQuestionNum != 0) {
        width = (answeredQuestionNum / totalQuestionNum) * 100;
    }
    progressBar.setAttribute("style","width:" + width + "%");
}
