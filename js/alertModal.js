function showAlertModal(options) {
    /* options includes:
        title: titile of the alert
        instruction: instruction information
        msg: alert cnotent
        isAlter: if it is an alert or a confirm
        isCheckBox: if checkbox is enabled  or disabled
        confirmFunc: callback when click confirm button
    */

    configAlertModal(options);

    // put alert modal in the middle of screen
    var winHeight = $(window).height();
    var winWidth = $(window).width();

    var $alertModal = $('#alertModal');

    var alertHeight = $alertModal.outerHeight();  // reference to CSS
    var alertWidth = $alertModal.outerWidth(); 
    
    var modalLeft = (winWidth - alertWidth) / 2;
    var modalTop = Math.max(winHeight / 2 - alertHeight, 100);

    $alertModal.css({'left': modalLeft, 'top': modalTop, 
                     'display': 'block'});
   
    // set modal background
    $('#modalBackground').fadeIn(100);
    window.getSelection().removeAllRanges();
}

function closeAlertModal() {
    $('#alertModal').css({'display': 'none'});
    $('#modalBackground').fadeOut(200);
    
    // remove all event listener
    $('#alertHeader').off();
    $('#alertActions').off();
    $('#alertCheckBox').off();
}

// configuration for alert modal
/* Cheng: how alertModal behaves when checkbox is checbox to "don't show again" 
    may need further discussion */
function configAlertModal(options) {
    var $alertHeader = $('#alertHeader');
    var $alertBtn = $('#alertActions');
    var $checkbox = $('#alertCheckBox');
    
    // close icon
    $alertHeader.on('click', '.close', function() {
        closeAlertModal();
    });

    // cancel button
    $alertBtn.on('click', '.cancel', function() {
        closeAlertModal();
    });

    // check box, default is unchecked
    $checkbox.find('.checkbox').removeClass('checked');
    $checkbox.addClass('inactive'); // now make it disabled

    // set all given options
    if (options) {
        if (options.title) {    // set title
            $alertHeader.find('.text').text(options.title);
        } else {
            $alertHeader.find('.text').text("");
        }

        if (options.msg) {      // set alert message
            $('#alertContent').text(options.msg);
        } else {
            $('#alertContent').text(""); 
        }

        if (options.instruction) {  // set alert instruction
            $('#alertInstruction .text').text(options.instruction);
            $('#alertInstruction').show();
        } else {
            $('#alertInstruction').hide();
        }

        if (options.isAlert) {  // set confirm button
            $alertBtn.find('.confirm').hide();
        } else {
            $alertBtn.find('.confirm').show();
            $alertBtn.on('click', '.confirm', function() {
                if(options.confirmFunc) {
                    options.confirmFunc();
                }
                closeAlertModal();
            });
        }

        if (options.isCheckBox) {   // set checkbox
             $checkbox.on('click', '.checkbox', function() {
                $(this).toggleClass('checked');
            });
            $checkbox.show();
        } else {
            $checkbox.hide();
        }
    }
}