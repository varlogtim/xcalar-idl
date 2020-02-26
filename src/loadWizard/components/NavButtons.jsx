import React from "react";

export default function NavButtons({left, right, setScreen, setScreenName}) {
    const screenNameToScreenDisplayName ={
        "SourceData": "Select Data Source",
        "FilterData": "Browse Data Source",
        "SchemaDiscovery": "Discover Schemas",
        "TableLoad": "Create Tables",
    }

    function handleScreenChange(screenName) {
        setScreen(screenName)
        setScreenName(screenNameToScreenDisplayName[screenName])
    }

    const leftButtons = left ?
    <div className="backButton">
        <button onClick={() => {
            if (left.onClick) {
                left.onClick()
            }
            handleScreenChange(left.toScreen)
        }}>
            {left.name}
        </button>
    </div> : ''

    const rightButtons = right ?
    <div className="nextButton">
        <button onClick={() => {
            if (right.onClick) {
                right.onClick()
            }
            handleScreenChange(right.toScreen)
        }}>
            {right.name}
        </button>
    </div> : ''

    return (
        <div className="navButtons">
            {leftButtons}
            {rightButtons}
        </div>
    );
}