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
        
        MainMenu.openPanel('monitorPanel');
        $('#setupButton').click();
        MainMenu.open(true);
        MonitorGraph.stop();
        $('#container').addClass('supportOnly');
        $('#configCard').addClass('xc-hidden');
        StatusMessage.updateLocation();
        // $('#supportToolsCard').removeClass('xc-hidden');
  
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
