import React from 'react';
// import {addFileForDiscovery} from '../../utils/discoverSchema'
// const EC = require('../utils/EtaCost.js')
// const EtaCost = new EC()

const Texts = {
    discovering: 'Discovering ...',
    discover: 'Discover'
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
    Discover
};