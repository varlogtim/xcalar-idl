/*
    This file is where all the document.ready functions go.
    Any misc functions that kind of applies to the
    entire page and doesn't really have any specific purpose should come here as
    well.
*/
// ========================== Document Ready ==================================
function documentReadyIndexFunction(): void {
    $(document).ready(function() {
        xcManager.setup();
    });
}