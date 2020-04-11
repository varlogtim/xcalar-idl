import * as React from "react";
import DeleteTableModal from "../components/modals/DeleteTableModal";
import DeletePbTableModal from  "../components/modals/DeletePbTableModal";

const App = () => (
    <div>
        <DeleteTableModal />
        <DeletePbTableModal />
    </div>
);

export default App;