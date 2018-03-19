function xcAssert(statement: boolean, error: any, logOnly: boolean): void {
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
