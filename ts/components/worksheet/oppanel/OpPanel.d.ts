type OpPanelArgType = "value" | "column" | "function" | "regex";

interface OpPanelFunctionGroup {
    operator: string;
    args: OpPanelArg[];
    newFieldName?: string;
    distinct?: boolean;
}

// *******************
// BaseOpPanel
// *******************
interface IOpPanel {
    setup(): void;
    show(dagNode: DagNode, options?: any): void;
    close(): void;
}

// *******************
// opPanelCommon
// *******************
declare type OpPanelDropdownMenuItem = {
    text: string,
    value?: any,
    cssClass?: string[],
    isSelected?: boolean,
    isNotMenuItem?: boolean
}

declare type OpPanelDropdownMenuSelectCallback = (value: any) => void

// declare enum NodeDefType { element, text }
declare type NodeDefPlaceholder = { name: string }
declare type NodeDef = NodeDefText | NodeDefElement | NodeDefComponent
declare type NodeDefDOMNodeList = (Node & ChildNode)[];
declare interface NodeDefDOMElement extends HTMLElement {
    getAttributeNames(): string[];
    xcdata: NodeDefXcData;
}
declare type NodeDefXcData = {
    isForceUpdate?: boolean,
    events?: { [eventName: string]: (args:any)=>any },
    initFunc?: () => void
}
declare type NodeDefText = {
    type: NodeDefType,
    text: (string | NodeDefPlaceholder)[]
}
declare type NodeDefElement = {
    type: NodeDefType,
    tag: string,
    class?: (string | NodeDefPlaceholder)[],
    style?: string,
    attr?: { [key: string]: (string | NodeDefPlaceholder) },
    event?: { [key: string]: string },
    children?: NodeDef[]
}
declare type NodeDefComponent = {
    type: NodeDefType,
    name: string
}

// *******************
// projectOpPanel
// *******************
declare type ProjectOpPanelModelColumnInfo = {
    name: string;
    isSelected: boolean;
}

declare type ProjectOpPanelModelPrefixColumn = {
    prefix: string;
    isSelected: boolean;
    columnList: ProjectOpPanelModelColumnInfo[];
}

// *******************
// joinOpPanel
// *******************
declare type JoinOpColumnInfo = { name: string, type: ColumnType, isPrefix: boolean }
declare type JoinOpColumnPair = {
    leftName: string,
    leftCast: ColumnType,
    rightName: string,
    rightCast: ColumnType
}
declare type JoinOpRenameInfo = {
    source: string, dest: string, isPrefix: boolean
}
