import React from 'react';
// import {addFileForDiscovery} from '../../utils/discoverSchema'
// const EC = require('../utils/EtaCost.js')
// const EtaCost = new EC()

const Texts = {
    discovering: 'Discovering ...',
    discover: 'Discover',
    expandError: 'Expand',
    collapseError: 'Collapse'
};

/**
 * Component: Loading
 */
function Loading() {
    return (
        <span>{Texts.discovering}</span>
    );
}

/**
 * Component: Error
 * @param {*} param0
 */
function Error({
    message,
    onClick
}) {
    return (
        <span onClick={() => { onClick(); }}>{message}</span>
    );
}

class InlineError extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            expanded: false
        };
    }

    showError(isShown) {
        this.setState({ expanded: isShown });
    }

    render() {
        const { errorMsg = '', errorTitle = '' } = this.props;
        const { expanded } = this.state;
        const safeErrorMsg = `${errorMsg}`;

        if (safeErrorMsg.length <= 20) {
            // when error is too short
            return (
                <span>{safeErrorMsg}</span>
            )
        } else if (expanded) {
            return (
                <div className="error">
                    <span>{safeErrorMsg}</span>
                    <span className="action xc-action" onClick={() => { this.showError(false); }}>{Texts.collapseError}</span>
                </div>
            )
        } else {
            return (
                <div className="error">
                    <span className="label">{errorTitle}</span>
                    <span data-toggle="tooltip" data-container="body" data-title={safeErrorMsg}>
                        {"(" + safeErrorMsg.substring(0, 7) + "...)"}
                    </span>
                    <span className="action xc-action" onClick={() => { this.showError(true); }}>{Texts.expandError}</span>
                </div>
            )
        }

    }
}

/**
 * Component: Schema
 * @param {*} param0
 */
function Schema({
    schemaName,
    onClick
}) {
    return (
        <button
            className="schemaBtn btn btn-secondary"
            data-toggle="tooltip"
            data-placement="top"
            data-container="body"
            data-original-title="click to view schema"
            onClick={() => { onClick(); }}
        >
                {schemaName}
        </button>
    );
}

/**
 * Component: Discover
 * @param {*} param0
 */
function Discover({
    onClick
}) {
    return (
        <button className="schemaBtn btn btn-secondary" onClick={() => { onClick(); }}>{Texts.discover}</button>
    );
}

export {
    Loading,
    Error,
    Schema,
    Discover,
    InlineError
};