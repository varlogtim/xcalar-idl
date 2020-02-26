import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'

global.gKVScope = {
    "GLOB": XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal,
    "USER": XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal,
    "WKBK": XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeSession,
};
setupThrift("")
Xcrpc.createClient(Xcrpc.DEFAULT_CLIENT_NAME, xcHelper.getApiUrl())

ReactDOM.render(<App />, document.getElementById('root'))