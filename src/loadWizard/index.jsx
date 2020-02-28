import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'

xcGlobal.setup();
setupThrift("")
Xcrpc.createClient(Xcrpc.DEFAULT_CLIENT_NAME, xcHelper.getApiUrl())

ReactDOM.render(<App />, document.getElementById('root'))