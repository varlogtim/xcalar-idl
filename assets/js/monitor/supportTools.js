window.SupportTools = (function(SupportTools, $) {
    var $supportCard;
    var $btnArea;
    SupportTools.setup = function() {
        $supportCard = $("#supportToolsCard");
        $btnArea = $supportCard.find('.btnArea');
        addListeners();
    };

    SupportTools.show = function() {
        Alert.forceClose();
        $('#container').addClass('supportOnly');

        MainMenu.close(true);
        $('.mainPanel').removeClass('active');
        $("#monitorPanel").addClass('active').find(".monitorSection")
                                             .removeClass("active");
        $("#monitorSupportTools").addClass("active");
        $(".topMenuBarTab").removeClass('active');
        $("#monitorTab").addClass('active');
        StatusMessage.updateLocation();
    };

    function addListeners() {
        $btnArea.find('.btn').click(function() {
            var action = $(this).data('action');
            triggerSupport(action);
        });
    }

    function triggerSupport(action) {
        switch (action) {
            case ("status"):
                XFTSupportTools.statusXcalarServices()
                .then(function(ret) {
                    console.log(ret);
                })
                .fail(function() {

                });
            break;
            default:
            break;
        }
    }


    return (SupportTools);
}({}, jQuery));
