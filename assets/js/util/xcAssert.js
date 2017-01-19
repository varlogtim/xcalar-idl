function xcAssert(statement) {
    if (window.debugOn) {
        if (!statement) {
            xcConsole.log('Assert failed');
        }
    }
}
