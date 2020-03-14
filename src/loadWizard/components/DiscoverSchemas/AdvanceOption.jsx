import React from 'react'

function Container({ children }) {
    return <div className="advOption">{children}</div>
}

function Title({ children }) {
    return <header className="advOption-header">{children}</header>
}

function Option({ children }) {
    return <div className="advOption-option">{children}</div>
}

function OptionLabel({ children }) {
    return <label className="advOption-option-label">{children}</label>
}

function OptionValue({ children }) {
    return <div className="advOption-option-value">{children}</div>
}

export {
    Container,
    Title,
    Option,
    OptionLabel,
    OptionValue
}