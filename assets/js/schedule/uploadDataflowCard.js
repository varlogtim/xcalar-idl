window.UploadDataflowCard = (function($, UploadDataflowCard) {
    var $card;             // $('#uploadDataflowCard')
    var retName;
    var file;

    UploadDataflowCard.setup = function() {
        $card = $('#uploadDataflowCard');
        addCardEvents();
    };

    UploadDataflowCard.show = function() {
        $card.show();
    };

    function readRetinaFromFile(file, moduleName) {
        var reader = new FileReader();
        reader.onload = function(event) {
            var entireString = event.target.result;

            XcalarImportRetina(moduleName, true, entireString)
            .then(function() {
                xcHelper.showSuccess();
            })
            .fail(function() {
                // JJJ Handle error
            });
        };

         // XXX this should really be read as data URL
        // But requires that backend changes import retina to not
        // do default base 64 encoding. Instead take it as flag
        reader.readAsBinaryString(file);
    }

    function submitForm() {
        readRetinaFromFile(file, retName);
        closeCard();
    }

    function addCardEvents() {
        // click cancel or close button
        $card.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeCard();
        });

        // click upload button
        $card.on("click", ".confirm", function() {
            submitForm();
        });

        // click browse button
        var $browserBtn = $("#dataflow-browse");
        $("#dataflow-fakeBrowse").click(function() {
            $(this).blur();
            $browserBtn.click();
            return false;
        });

        // display the chosen file's path
        $browserBtn.change(function() {
            var path = $(this).val().replace(/C:\\fakepath\\/i, '');
            file = $browserBtn[0].files[0];
            retName = path.substring(0, path.indexOf(".")).toLowerCase()
                          .replace(/ /g, "");
            if (path.indexOf(".tar.gz") > 0) {
                $card.find("#retinaPath").val(path);
                // JJJ allow upload
            } else {
                // JJJ Fill in
                console.log("Not of type .tar.gz");
            }
        });

    }

    function closeCard() {
        // JJJ Clear path
        $card.hide();
        retName = "";
        file = "";
        // JJJ Disallow upload
    }

    return (UploadDataflowCard);

}(jQuery, {}));
