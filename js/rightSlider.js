function setupRightSideBar() {
    var clickable = true;
    $('#worksheetBar').find('.sliderBtn').click(function() {
        if (!clickable) {
            return;
        }
        var sidebar = $('#rightSideBar');
        var index = $(this).index();
        var sidebarSection = sidebar.find('.rightBarSection').eq(index);
        if (!sidebar.hasClass('open')) {
            //sidebar is closed so open the correlating section
            sidebar.addClass('open');
            sidebarSection.addClass('active');
            //display correct section
        } else {
            // sidebar is already open, check for close or switch sections
            if (sidebarSection.hasClass('active')) {
                // button clicked has an active section so close slider
                sidebar.removeClass('open');
                setTimeout(function() {
                    sidebarSection.removeClass('active');
                }, 300);
            } else {
                // close current section, open new section
                sidebar.find('.active').removeClass('active');
                sidebarSection.addClass('active');
                $('#cliSection').find('textarea').focus();
            }
        }

        clickable = false;
        setTimeout(function() {
            clickable = true
        }, 300);
    });

    $('#pulloutTab').click(function() {
        if (!clickable) {
            return;
        }
        var sidebar = $('#rightSideBar');
        if (!sidebar.hasClass('open')) {
            sidebar.addClass('open');
            if (sidebar.find('.active').length == 0) {
                sidebar.find('.rightBarSection').eq(0).addClass('active');
            }
        } else {
            sidebar.removeClass('open');
        }

        clickable = false;
        setTimeout(function() {
            clickable = true;
        }, 300);
    });

    $('#rightSideBar').find('.iconClose').click(function() {
        $('#rightSideBar').removeClass('open');
    });
}