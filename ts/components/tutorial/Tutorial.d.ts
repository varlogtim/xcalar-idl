interface TooltipInfo {
    highlight_div: string;
    text: string;
    type: TooltipType;
    interact_div?: string;
    value?: string;
}

interface WalkthroughInfo {
    tooltipTitle: string;
    background: boolean;
    startScreen: TooltipStartScreen;
    isSingleTooltip?: boolean;
    description?: string;
}

interface TooltipStoredInfo {
    seenDataflow: boolean;
    seenSQL: boolean;
}