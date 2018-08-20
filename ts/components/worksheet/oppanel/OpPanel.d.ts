type OpPanelArgType = "value" | "column" | "function" | "regex";

interface OpPanelFunctionGroup {
    operator: string;
    args: OpPanelArg[];
    newFieldName?: string;
}

// *******************
// BaseOpPanel
// *******************
interface IOpPanel {
    setup(): void;
    show(dagNode: DagNode): void;
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
declare type NodeDef = NodeDefText | NodeDefElement
declare type NodeDefDOMNodeList = (Node & ChildNode)[];
declare interface NodeDefDOMElement extends HTMLElement {
    getAttributeNames(): string[];
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
declare type JoinOpColumnInfo = { name: string, type: XcCast, isPrefix: boolean }
declare type JoinOpColumnMapping = { source: string, dest: string, isPrefix: boolean }
declare type JoinOpColumnPair = { left: number, right: number, isCastNeed: boolean }
declare type JoinOpRenameInfo = { source: number, dest: string, isPrefix: boolean }
