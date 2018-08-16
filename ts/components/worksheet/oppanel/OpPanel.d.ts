type OpPanelArgType = "value" | "column" | "function" | "regex";

interface OpPanelFunctionGroup {
    operator: string;
    args: OpPanelArg[]
}

