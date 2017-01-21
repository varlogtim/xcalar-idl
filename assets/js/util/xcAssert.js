function xcAssert(statement, error, logOnly) {
    if (error == null) {
        error = "Assert failed";
    }
    if (!statement) {
        xcConsole.log(error);

        if (!logOnly) {
            throw error;
        }
    }
}
