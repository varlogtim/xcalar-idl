import React from 'react'

function Container({ children }) {
    return <div className="advOption">{children}</div>
}

function Title({ children }) {
    return <header className="advOption-header">{children}</header>
}

function OptionGroup({ children }) {
    return <div className="advOption-group">{children}</div>
}

function Option({ children }) {
    return <div className="advOption-option">{children}</div>
}

function OptionLabel({ onClick, children }) {
    if (onClick != null) {
        return <label className="advOption-option-label" onClick={onClick}>{children}</label>
    } else {
        return <label className="advOption-option-label">{children}</label>
    }
}

function OptionValue({ children }) {
    return <div className="advOption-option-value">{children}</div>
}

export {
    Container,
    Title,
    OptionGroup,
    Option,
    OptionLabel,
    OptionValue
}