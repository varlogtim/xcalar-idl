import React from 'react';

function Dialog({
    children
}) {
    return (
        <div className='modal' onClick={(e) => { e.stopPropagation(); }}>
            <section className="modal-content">{children}</section>
        </div>
    );
}

function Body({
    children
}) {
    return <section className="modal-body">{children}</section>
}


function Header({
    onClose,
    children
}) {
    return (
        <header className='modal-header'>
            <span className="text">{children}</span>
            <div className="close" onClick={()=>{ onClose(); }}>
                <i className="icon xi-close" />
            </div>
        </header>
    );
}

function Footer({
    children
}) {
    return <section className="modal-footer">{children}</section>
}


export { Dialog, Header, Body, Footer};