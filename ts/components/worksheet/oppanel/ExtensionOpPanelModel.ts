class ExtensionOpPanelModel {
    private dagNode: DagNodeExtension;
    private extensions: ExtensionInfo[];
    private _module: string;
    private _func: string;
    private _args: object;

    public constructor(dagNode: DagNodeExtension) {
        this.dagNode = dagNode;
        this.extensions = ExtensionManager.getEnabledExtensions();
        this._initialize(dagNode.getParam());
    }

    get moduleText(): string {
        return this._getModuleText(this._module);
    }


    set moduleName(moduleName: string) {
        if (moduleName !== this._module) {
            this._module = moduleName;
            this._func = null; // when switch module, reset func and args
            this._args = null;
        }
    }

    get func(): ExtensionFuncInfo {
        return this._getSelectedFunc();
    }

    set funcName(funcName: string) {
        if (funcName !== this._func) {
            this._func = funcName;
            this._args = null; // when switch function, reset args
        }
    }

    get args(): object {
        return this._args;
    }

    set args(args: object) {
        this._args = args;
    }

    /**
     * Get Available's modules, return their name and disaply text name
     */
    public getAvailableModules(): {text: string, name: string}[] {
        return this.extensions.map((ext) => {
            const name: string = ext.name;
            const text: string = this._getModuleText(name);
            return {
                text: text,
                name: name
            };
        });
    }

    /**
     * Get Available's functions, return their name and disaply text name
     */
    public getAvailableFunctions(): {text: string, name: string}[] {
        const extModule: ExtensionInfo = this._getSelectedModule();
        if (extModule == null) {
            return [];
        }
        return extModule.buttons.map((funcInfo) => {
            return {
                text: funcInfo.buttonText,
                name: funcInfo.fnName
            }
        });
    }

    /**
     * Get how many parent nodes are connected with
     */
    public getAvailableNodeNum(): number {
        return this.dagNode.getNumParent();
    }

    /**
     * Get columns of a parent node
     * @param index
     */
    public getColumns(index): ProgCol[] {
        const parentNode: DagNode = this.dagNode.getParents()[index];
        return parentNode ? parentNode.getLineage().getColumns(false, true) : [];
    }

    /**
     * Return false if the extension is configured as notTableDependent
     */
    public hasDependentTable(): boolean {
        const extModule: ExtensionInfo = this._getSelectedModule();
        let res: boolean = false;
        if (extModule != null) {
            res = extModule.configParams ? !extModule.configParams.notTableDependent : true;
        }
        return res;
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param: DagNodeExtensionInputStruct = this._getParam();
        this.dagNode.setParam(param);
    }

    // public switchMode(
    //     toAdvancedMode: boolean,
    //     editor: CodeMirror.EditorFromTextArea
    // ): {error: string} {
    //     if (toAdvancedMode) {
    //         const param: DagNodeSetInputStruct = this._getParam();
    //         editor.setValue(JSON.stringify(param, null, 4));
    //     } else {
    //         try {
    //             const param: DagNodeSetInputStruct = <DagNodeSetInputStruct>JSON.parse(editor.getValue());
    //             this._initialize(param);
    //             this._update();
    //         } catch (e) {
    //             return {error: e};
    //         }
    //     }
    //     return null;
    // }

    private _initialize(param: DagNodeExtensionInputStruct) {
        this.moduleName = param.moduleName;
        this.funcName = param.functName;
        this.args = param.args;
    }

    private _getParam(): DagNodeExtensionInputStruct {
        return {
            moduleName: this._module,
            functName: this._func,
            args: this._args
        }
    }

    private _getSelectedModule(): ExtensionInfo {
        const res: ExtensionInfo[] = this.extensions.filter(ext => ext.name === this._module);
        return (res.length === 1) ? res[0] : null;
    }

    private _getSelectedFunc(): ExtensionFuncInfo {
        const extModule: ExtensionInfo = this._getSelectedModule();
        if (extModule == null) {
            return null;
        }
        const res: ExtensionFuncInfo[] = extModule.buttons.filter((funcInfo) => {
            return funcInfo.fnName === this._func;
        });
        return (res.length === 1) ? res[0] : null;
    }

    private _getModuleText(name: string): string {
        let modText: string = name;
        if (modText.startsWith("UExt")) {
            modText = modText.substring(4);
        }
        return modText;
    }
}