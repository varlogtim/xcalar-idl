function setupDag() {
    $('#compSwitch').click(function() {
        var compSwitch = $(this);
        var dag = $('#dagWrap');
        var workspacePanel = $('#workspacePanel');
        
        if (dag.hasClass('hidden')) {
            dag.removeClass('hidden');
            compSwitch.addClass('active');
        } else if (workspacePanel.hasClass('active')) {
            dag.addClass('hidden');
            compSwitch.removeClass('active');
        }

        $('.mainPanel').hide().removeClass('active');
        $('.mainMenuTab').removeClass('active');
        workspacePanel.show().addClass('active');
        $('#workspaceTab').addClass('active');
    });

    $('#dagPulloutTab').click(function() {
        var dag = $('#dagWrap');
        if (dag.hasClass('midway')) {
            dag.removeClass('midway').addClass('full');
        } else {
            dag.removeClass('full').addClass('midway');
        }
    });
}