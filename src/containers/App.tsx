import * as React from "react";
import DeleteTableModal from "../components/modals/DeleteTableModal";
import DeletePbTableModal from  "../components/modals/DeletePbTableModal";
import SQLEditorShortcutsModal from "../components/modals/SQLEditorShortcutsModal";

const App = () => (
    <div>
        <DeleteTableModal />
        <DeletePbTableModal />
        <SQLEditorShortcutsModal />
    </div>
);

export default App;