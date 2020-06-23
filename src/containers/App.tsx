import * as React from "react";
import DeleteTableModal from "../components/modals/DeleteTableModal";
import DeletePbTableModal from  "../components/modals/DeletePbTableModal";
import DeleteSQLModal from "../components/modals/DeleteSQLModal";
import DeleteModuleModal from "../components/modals/DeleteModuleModal";
import DeleteTableFuncModal from "../components/modals/DeleteTableFuncModal";
import DeleteAppModal from "../components/modals/DeleteAppModal";
import SQLEditorShortcutsModal from "../components/modals/SQLEditorShortcutsModal";

const App = () => (
    <div>
        <DeleteTableModal/>
        <DeletePbTableModal/>
        <DeleteSQLModal/>
        <DeleteModuleModal />
        <DeleteTableFuncModal />
        <DeleteAppModal />
        <SQLEditorShortcutsModal/>
    </div>
);

export default App;