
window.onload = toBottom;

function toBottom()
{
    var element = document.getElementById("main");
    element.scrollTop = element.scrollHeight;

    var progressBar = document.getElementById('div-progressBarID');
    var width = 0;
    var totalQuestionNum = 9;
    var answeredQuestionNum = document.forms.length == 0 ? 0 : document.forms.length - 1;
    var arr = document.getElementsByClassName('textarea-lastQuestion correct');
    
    if(arr.length != 0) {
        answeredQuestionNum++;
    }
    if(answeredQuestionNum != 0) {
        width = (answeredQuestionNum / totalQuestionNum) * 100;
    }
    progressBar.setAttribute("style","width:" + width + "%");
}
