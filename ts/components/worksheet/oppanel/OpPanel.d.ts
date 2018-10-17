type OpPanelArgType = "value" | "column" | "function" | "regex" | "aggregate";

interface OpPanelFunctionGroup {
    operator: string;
    args: OpPanelArg[];
    newFieldName?: string;
    distinct?: boolean;
}

interface GroupByOpPanelFunctionGroup extends OpPanelFunctionGroup {
    distinct: boolean;
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
    genHTMLFunc?: () => HTML, // Custom HTML shown in list
    text: string, // Text shown in list, or in selected text section
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
    initFunc?: () => void,
    elementMountDone?: (node: NodeDefDOMElement) => void
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

declare type AddMoreButtonProps = {
    btnText: string, cssClass?: string, onClick: () => void
}

declare interface AutogenSectionProps {
    type: string;
    name: string;
    valueCheck?: { checkType: string, args: any[] | Function };
    onElementMountDone?: (elem: HTMLElement) => void;
}

declare interface HintDropdownProps extends AutogenSectionProps {
    inputVal: string;
    placeholder: string;
    menuList: { colType: ColumnType, colName: string}[];
    onDataChange?: (data: string) => void;
    addMoreButton?: AddMoreButtonProps;
}

declare interface SimpleInputProps<T> extends AutogenSectionProps {
    inputVal: T;
    placeholder: string;
    onChange?: (data: T) => void;
    onInput?: (data: T) => void;
    inputTimeout?: number;
    onBlur?: (data: T) => void;
}

declare type ValueCheckResult<T> = {
    errMsg?: string,
    value?: T
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

// *******************
// exportOpPanel
// *******************
declare type ExportOpPanelModelColumnInfo = {
    name: string;
    isSelected: boolean;
    type: string;
}
