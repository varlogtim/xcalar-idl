// Shared components go here

/**
 * Dropdown component
 * @description
 * Support building menu items on-the-fly(via a JS array)
 */
class OpPanelDropdown {
    private _$elem: JQuery = null;
    private _repo: OpPanelDataRepo;
    private _inputId: string = '';
    private _ulId: string = '';
    private _cssSelected = '';
    private static _fieldNameValue = 'xcval';
    private _setTitleFunc: ($elemTitle: JQuery, text: string) => void = null;

    /**
     * Class Constructuor
     * @param props.container JQuery object of the dropdown container
     * @param props.inputXcId The value of data-xcid html attribute of the input/div, which shows the selected menu text
     * @param props.ulXcId The data-xcid value of the UL tag
     * @param props.cssSelected OPTIONAL. CSS class name which will be set on the selected menu item
     * @param props.setTitleFunc OPTIONAL. The function to set the input/div text
     */
    constructor(props: {
        container: JQuery,
        inputXcId: string,
        ulXcId: string,
        cssSelected?: string,
        setTitleFunc?: ($elemTitle: JQuery, text: string) => void
    }) {
        const {container, inputXcId, ulXcId, cssSelected = 'selected', setTitleFunc} = props;
        this._repo = new OpPanelDataRepo();
        this._$elem = container;
        this._inputId = inputXcId;
        this._ulId = ulXcId;
        this._cssSelected = cssSelected;
        if (setTitleFunc != null) {
            this._setTitleFunc = setTitleFunc;
        } else {
            this._setTitleFunc = OpPanelDropdown._defaultSetTitleFunc;
        }
    }

    /**
     * Update the UI according to the given data model
     * @param props.menuItems The menu items to show in the dropdown
     * @param props.onSelectCallback Callback function of menu item selecting
     * @description
     * Performance: The UI update will be skipped, if the data model doesn't change from the previous update
     */
    public updateUI(props: {
        menuItems?: OpPanelDropdownMenuItem[],
        onSelectCallback?: OpPanelDropdownMenuSelectCallback
    }): void {
        if (this._repo.push(props)) {
            // console.log(`no change: ${props.menuItems[0].text}`);
            return;
        }

        const { menuItems = [], onSelectCallback = null } = (props || {});
        // Create <li> elements
        const $input = BaseOpPanel.findXCElement(this._$elem, this._inputId);
        const $liList = this._createMenuItems({
            $input: $input,
            menuItems: menuItems
        });

        // Add menu items to DOM
        const $ul = BaseOpPanel.findXCElement(this._$elem, this._ulId);
        $ul.empty();
        if ($liList.length > 0) {
            $ul.append($liList);
        }

        // Setup event listener
        this._$elem.off();
        const menuList = new MenuHelper( this._$elem, {
            onSelect: this._onMenuItemSelect({
                onSelectCallback: onSelectCallback
            })
        });
        menuList.setupListeners();
    }

    private static _defaultSetTitleFunc($elemTitle: JQuery, text: string) {
        $elemTitle.val(text);
    }

    private _onMenuItemSelect({onSelectCallback}: {
        onSelectCallback?: OpPanelDropdownMenuSelectCallback
    }): ($li: JQuery) => void {
        return ($li: JQuery) => {
            if (onSelectCallback != null) {
                onSelectCallback($li.data(OpPanelDropdown._fieldNameValue));
            }
        };
    }

    private _createMenuItems({$input, menuItems}: {
        $input: JQuery,
        menuItems: OpPanelDropdownMenuItem[]    
    }): JQuery[] {
        return menuItems.map( (menuInfo) => {
            // Create HTML element
            const $menuItem = menuInfo.isNotMenuItem
                ? BaseOpPanel.createElement('div')
                : BaseOpPanel.createElement('li')
            // Set data-xcval attribute
            if (menuInfo.value != null) {
                $menuItem.data(OpPanelDropdown._fieldNameValue, menuInfo.value);
            }
            // Set text
            $menuItem.text(menuInfo.text);
            // Set CSS classes
            if (menuInfo.cssClass != null) {
                $menuItem.addClass(menuInfo.cssClass.join(' '));
            }
            // Set input box value & select menu item
            if (menuInfo.isSelected) {
                this._setTitleFunc($input, menuInfo.text);
                $menuItem.addClass(this._cssSelected);
            }
            return $menuItem;
        });
    }
}

/**
 * Component data model repository
 * @description
 * Use cases:
 * 1. Check data model changes
 * 2. Keep track of data model history
 */
class OpPanelDataRepo {
    private _dataHistory: string[] = [];
    private _options: {
        capacity: number,
    };

    private static _defaultCapacity = 10;

    public constructor(options?: {
        capacity?: number
    }) {
        const {
            capacity = OpPanelDataRepo._defaultCapacity
        } = (options || {});
        this._options = {
            capacity: capacity
        };
    }

    /**
     * Push the data model to the repo.
     * @param data The data model object
     * @returns A flag to indicate if the data model is changed. true: No change
     */
    public push(data: any): boolean {
        let newStr = '{}';
        if (data != null) {
            newStr = JSON.stringify(data);
        }

        const currentIndex = this._dataHistory.length - 1;
        if (currentIndex >= 0) {
            if (newStr === this._dataHistory[currentIndex]) {
                return true;
            }
        }

        this._dataHistory.push(newStr);
        if (this._dataHistory.length > this._options.capacity) {
            this._dataHistory.shift();
        }

        return false;
    }
}

enum NodeDefType {
    element, text
}

/**
 * Class to manage HTML templates
 */
class OpPanelTemplateManager {
    private _nodeDefMap: { [key: string]: NodeDef[] } = {};

    /**
     * Load HTML template from DOM, then create and cache virtual DOM definition
     * @param container ancestor of the template
     * @param templateId data-xcid of the template
     */
    public loadTemplate(templateId: string, container: JQuery) {
        this._getTemplateFromDOM(templateId, container);
    }

    /**
     * Create/Cache VDOM definition from HTML string
     * @param templateId template ID
     * @param templateString HTML string
     */
    public loadTemplateFromString(templateId: string, templateString: string) {
        this._getTemplateFromString(templateId, templateString)
    }

    /**
     * Create VDOM tree by combining VDOM definition and placeholder values
     * @param templateId template ID
     * @param replaces actual values to replace placeholders
     * @returns a list of VDOM
     */
    public createElements(templateId: string, replaces?: { [key: string]: any }) {
        const nodeDef = this._nodeDefMap[templateId];
        if (nodeDef == null) {
            return [];
        }

        return OpPanelNodeRenderFactory.createNode(nodeDef, replaces);
    }

    /**
     * Compare the real DOM with VCOM, and replace any elements updated
     * @param container Container element in the real DOM tree
     * @param newNodeList VDOM tree list
     */
    public updateDOM(
        container: HTMLElement,
        newNodeList: NodeDefDOMElement[],
    ): void {
        OpPanelNodeRenderFactory.updateDOM(container, newNodeList);
    }

    private _getTemplateFromString(templateId: string, templateString: string) {
        if (this._nodeDefMap[templateId] == null) {
            const nodes = this._createDOMFromString(templateString);
            this._nodeDefMap[templateId] = OpPanelNodeDefFactory.createNodeDef(nodes);
        }
        return this._nodeDefMap[templateId];
    }

    private _getTemplateFromDOM(templateId: string, container: JQuery): NodeDef[] {
        if (this._nodeDefMap[templateId] == null) {
            const templateContainer = this._getXCElement(container, templateId);
            let nodes: NodeDefDOMNodeList;
            if (this._isHTMLTemplate(templateContainer)) {
                const domNodes = templateContainer.content.childNodes;
                nodes = new Array(domNodes.length);
                for (let i = 0; i < domNodes.length; i ++) {
                    nodes[i] = domNodes[i];
                }
            } else {
                nodes = this._createDOMFromString(templateContainer.innerHTML);
            }
            this._nodeDefMap[templateId] = OpPanelNodeDefFactory.createNodeDef(nodes);
        }
        return this._nodeDefMap[templateId];
    }

    private _isHTMLTemplate(
        element: HTMLElement | HTMLTemplateElement
    ): element is HTMLTemplateElement {
        return element.nodeName && element.nodeName === 'template';
    }

    private _getXCElement(container: JQuery, xcid: string): HTMLElement{
        return container.find(`[data-xcid="${xcid}"]`)[0];
    }

    private _createDOMFromString(text) {
        let nodeList: (Node & ChildNode)[];
        let domList: (JQuery | NodeListOf<Node & ChildNode>);

        text = OpPanelTemplateManager._minimizeHTMLString(text);
        if (DOMParser != null) {
            domList = new DOMParser().parseFromString(text, 'text/html').body.childNodes;
        } else {
            domList = $(text);
        }
        nodeList = new Array(domList.length);
        for (let i = 0; i < domList.length; i ++) {
            nodeList[i] = domList[i];
        }

        return nodeList;
    }

    private static _minimizeHTMLString(text) {
        const replaces = {
            '[\t\n\r]': '',
            '(>[ ]+)': '>',
            '([ ]+<)': '<' 
        };
        return xcHelper.replaceTemplate(text, replaces, true);
    }
}

/**
 * !!! Should only be called by OpPanelTemplateManager !!!
 * Factory to ceate virtual DOM definition from template.
 */
class OpPanelNodeDefFactory {

    public static createNodeDef(
        domNodeList: NodeDefDOMNodeList
    ): NodeDef[] {
        try {
            if (domNodeList == null) {
                return [];
            }

            const nodeDefList: NodeDef[] = [];
            for (const domNode of domNodeList) {
                if (domNode.nodeType === Node.ELEMENT_NODE) {
                    const nodeDef = this._createElementNodeDef(domNode as NodeDefDOMElement);
                    if (nodeDef != null) {
                        nodeDefList.push(nodeDef);
                    }
                } else if (domNode.nodeType === Node.TEXT_NODE) {
                    const nodeDef = this._createTextNodeDef(domNode as NodeDefDOMElement);
                    if (nodeDef != null) {
                        nodeDefList.push(nodeDef);
                    }
                } else {
                    console.error(`${domNode.nodeName} is skipped`);
                }
            }
            return nodeDefList;    
        } catch(e) {
            console.error('NodeDefFactory.createNodeDef', e);
            return [];
        }
    }

    private static _createTextNodeDef(domNode: NodeDefDOMElement) {
        try {
            if (domNode == null) {
                return null;
            }
            const textContent = domNode.textContent || '';
            if (textContent.length === 0) return null;
        
            const nodeDef: NodeDefText = { type: NodeDefType.text, text: []};
            const sep = '{{';
            for (const section of textContent.split(sep)) {
                if (section.length === 0) {
                    continue;
                }
                const closePos = section.indexOf('}}');
                if (closePos >= 0) {
                    const phName = section.substring(0, closePos).trim();
                    const text = section.substring(closePos + 2);
                    if (phName.length > 0) {
                        nodeDef.text.push( {name: phName} );
                    }
                    if (text != null && text.length > 0) {
                        nodeDef.text.push(this._replaceSpecialChar(text));
                    }
                } else {
                    nodeDef.text.push(this._replaceSpecialChar(section));
                }
            }
            return nodeDef;
        } catch(e) {
            console.error('NodeDefFactory._createTextNodeDef', e);
            return null;
        }
    }

    private static _replaceSpecialChar(text) {
        return text.replace('\\{', '{').replace('\\}', '}');
    }

    private static _createElementNodeDef(domNode: NodeDefDOMElement) {
        try {
            if (domNode == null) {
                return null;
            }
    
            const nodeDef: NodeDefElement = { type: NodeDefType.element, tag: domNode.nodeName };
        
            const attrNames = this._getAttributeNames(domNode);
            if (attrNames.length > 0) {
                nodeDef.attr = {};
                nodeDef.event = {};
                for (const attrName of attrNames) {
                    const attrValue = domNode.getAttribute(attrName);
                    if (attrName === 'class') {
                        const classString = attrValue.trim();
                        if (classString.length > 0) {
                            nodeDef.class = this._createClassDef(classString);
                        }
                    } else if (attrName === 'style') {
                        const styleString = attrValue.trim();
                        if (styleString.length > 0) {
                            nodeDef.style = styleString;
                        }
                    } else if (this._isEventHandler(attrName)) {
                        nodeDef.event[this._getEventName(attrName)] = attrValue.trim();
                    } else {
                        nodeDef.attr[attrName] = this._isPlaceholder(attrValue)
                            ? { name: this._getPlaceholderName(attrValue) }
                            : attrValue;
                    }
                }
            }
        
            const childNodeRaw = domNode.childNodes;
            const childNodes: NodeDefDOMNodeList = new Array(childNodeRaw.length);
            for (let i = 0; i < childNodeRaw.length; i ++) {
                childNodes[i] = childNodeRaw[i];
            }
            nodeDef.children = this.createNodeDef(childNodes);
        
            return nodeDef;
        } catch(e) {
            console.error('NodeDefFactory._createElementNodeDef', e);
            return null;
        }
    }

    private static _createClassDef(
        classString: string
    ): (string | NodeDefPlaceholder)[] {
        try {
            const classDef: (string | NodeDefPlaceholder)[] = [];
    
            const classList = classString.split(' ').filter( (word) => (word.length > 0) );
            for (const cls of classList) {
                if (this._isPlaceholder(cls)) {
                    classDef.push({ name: this._getPlaceholderName(cls) });
                } else {
                    classDef.push(cls);
                }
            }
            return classDef;
        } catch(e) {
            console.error('NodeDefFactory._createClassDef', e);
            return [];
        }
    }
    
    public static _getAttributeNames(
        domNode: NodeDefDOMElement
    ): string[] {
        if (domNode.getAttributeNames != null) {
            return domNode.getAttributeNames();
        } else {
            const attrs = domNode.attributes;
            const len = attrs.length;
            const names = new Array(len);
            for (let i = 0; i < len; i ++) {
                names[i] = attrs[i].name;
            }
            return names;
        }
    }
    
    private static _isPlaceholder(text: string): boolean {
        return text.indexOf('{{') === 0 && text.indexOf('}}') == text.length - 2;
    }
    
    private static _getPlaceholderName(text: string): string {
        return text.substring(2, text.length - 2);
    }
    
    private static _getEventName(attrName: string): string {
        return attrName.substring(1, attrName.length - 1);
    }
    
    private static _isEventHandler(attrName: string): boolean {
        return attrName[0] === '(' && attrName[attrName.length - 1] === ')';
    }
}

/**
 * !!! Should only be called by OpPanelTemplateManager !!!
 * Factory to create/update DOM from virtual DOM definition.
 */
class OpPanelNodeRenderFactory {

    /**
     * Create VDOM trees from VDOM definitions
     * @param nodeDefList VDOM definition list
     * @param args acutal values to replace placeholders in the template
     * @returns a list of detached dom trees
     */
    public static createNode(
        nodeDefList: NodeDef[],
        args: { [key: string]: any } = {}
    ): NodeDefDOMElement[] {
        try {
            if (nodeDefList == null) {
                return [];
            }
            const nodeList: NodeDefDOMElement[] = [];
            for (const nodeDef of nodeDefList) {
                if (this._isNodeTypeElement(nodeDef)) {
                    const node = this._createElementNode(nodeDef, args);
                    if (node != null) {
                        nodeList.push(node);
                    }
                } else if (this._isNodeTypeText(nodeDef)) {
                    const node = this._createTextNode(nodeDef, args);
                    if (node != null) {
                        nodeList.push(node as any);
                    }
                }
            }
            return nodeList;
        } catch(e) {
            console.error('NodeRender.createNode', e);
            return [];
        }
    }

    /**
     * Compare the real DOM with VCOM, and replace any elements updated
     * @param container Container element in the real DOM tree
     * @param newNodeList VDOM tree list
     */
    public static updateDOM(
        container: HTMLElement,
        newNodeList: NodeDefDOMElement[],
    ): void {
        try {
            if (container.hasChildNodes()) {
                const oldNodeList = container.childNodes;
                let oldIndex;
                for (oldIndex = 0; oldIndex < oldNodeList.length; oldIndex ++) {
                    const oldNode = oldNodeList[oldIndex] as NodeDefDOMElement;
                    if (oldIndex < newNodeList.length) {
                        const newNode = newNodeList[oldIndex];
                        if (this._compareNode(oldNode, newNode) != null) {
                            // Node is updated, replace the whole subtree
                            container.replaceChild(newNode, oldNode);
                            // console.log(`Node replace: ${newNode.nodeName}`);
                        } else {
                            // No change of this node, keep checking the subtree
                            const childNodes = [];
                            if (newNode.hasChildNodes()) {
                                for (const child of newNode.childNodes) {
                                    childNodes.push(child);
                                }
                            }
                            this.updateDOM(oldNode, childNodes);
                        }
                    } else {
                        // More old children, delete them
                        container.removeChild(oldNode);
                        // console.log(`Node remove: ${oldNode.nodeName}`);
                    }
                }
    
                if (oldIndex < newNodeList.length) {
                    // More new children, add them
                    for (let i = oldIndex; i < newNodeList.length; i ++) {
                        container.appendChild(newNodeList[i]);
                        // console.log(`Node add1: ${newNodeList[i].nodeName}`);
                    }
                }
            } else {
                // Empty tree, add new children
                for (const child of newNodeList) {
                    container.appendChild(child);
                    // console.log(`Node add2: ${child.nodeName}`);
                }
            }
        } catch(e) {
            console.error('NodeRender.updateDOM', e);
        }
    }

    private static _compareNode(
        oldNode: NodeDefDOMElement,
        newNode: NodeDefDOMElement,
    ) {
        try {
            const oldNodeType = oldNode.nodeType;
            const newNodeType = newNode.nodeType;
            if (oldNodeType !== newNodeType) {
                return newNode;
            }
            if (newNodeType === Node.TEXT_NODE) {
                return this._compareTextNode(oldNode, newNode);
            } else {
                return this._compareElementNode(oldNode, newNode);
            }
        } catch(e) {
            console.error('NodeRender._compareNode', e);
            return null;
        }
    }

    private static _compareTextNode(oldNode: NodeDefDOMElement, newNode: NodeDefDOMElement) {
        try {
            if (newNode.textContent !== oldNode.textContent) {
                return newNode;
            }
            return null;
        } catch(e) {
            console.error('NodeRender._compareTextNode', e);
            return null;
        }
    }

    private static _compareElementNode(oldNode: NodeDefDOMElement, newNode: NodeDefDOMElement) {
        try {
            if (oldNode == null || newNode == null) {
                return null;
            }
    
            // Compare node type
            if (oldNode.nodeType !== newNode.nodeType) {
                return newNode;
            }
            // Compare node tag
            if (oldNode.nodeName !== newNode.nodeName) {
                return newNode;
            }
            // Compare attributes
            const attrsNew = newNode.attributes;
            const attrsOld = oldNode.attributes;
    
            const copyAttrs = ['aria-describedby'];
            for (const key of copyAttrs) {
                const oldValue = attrsOld[key];
                if (oldValue != null) {
                    newNode.setAttribute(key, oldValue.value);
                }
            }
    
            if (attrsNew.length !== attrsOld.length) {
                return newNode;
            }
            for (let i = 0; i < attrsNew.length; i ++) {
                const {name: newName, value: newValue} = attrsNew[i];
                const attrOld = attrsOld[newName];
                if (attrOld == null) {
                    return newNode;
                }
                if (attrOld.value != newValue) {
                    return newNode;
                }
            }
            return null;
        } catch(e) {
            console.error('NodeRender._compareElementNode', e);
            return null;
        }
    }

    private static _decodeText(text: string): string {
        return text.replace(/&gt;/, '>')
            .replace(/&lt;/, '<');
    }
    
    private static _createTextNode(
        nodeDef: NodeDefText, args: { [key: string]: any }
    ): Text {
        try {
            let textString = '';
            for (const txt of nodeDef.text) {
                if (this._isTypePlaceholder(txt)) {
                    if (args != null) {
                        textString = `${textString}${args[txt.name]}`;
                    } else {
                        console.error('NodeRender.createTextNode: args not defined');
                    }
                } else {
                    textString = `${textString}${txt}`;
                }
            }
            return document.createTextNode(this._decodeText(textString));
        } catch(e) {
            console.error('NodeRender._createTextNode', e);
            return null;
        }
    }

    private static _createElementNode(
        nodeDef: NodeDefElement, args: { [key: string]: any }
    ): NodeDefDOMElement {
        try {
            const node = this._createElementNodeNoChildren(nodeDef, args);
            if (node == null) {
                return null;
            }
            if (nodeDef.children != null) {
                for (const childNode of this.createNode(nodeDef.children, args)) {
                    node.appendChild(childNode);
                }
            }
            return node;
        } catch(e) {
            console.error('NodeRender._createElementNode', e);
            return null;
        }
    }

    private static _createElementNodeNoChildren(
        nodeDef: NodeDefElement, args: { [key: string]: any }
    ): NodeDefDOMElement {
        try {
            const node = document.createElement(nodeDef.tag) as NodeDefDOMElement;
            if (nodeDef.class != null) {
                let className = '';
                for (const cls of nodeDef.class) {
                    if (!this._isTypePlaceholder(cls)) {
                        className = `${className} ${cls}`;
                    } else {
                        if (args != null) {
                            className = `${className} ${args[cls.name]}`;
                        } else {
                            console.error('NodeRender.createElementNode(class): args not defined');
                        }
                    }
                }
                node.className = className;
            }
            if (nodeDef.style != null) {
                node.setAttribute('style', nodeDef.style);
            }
            if (nodeDef.attr != null) {
                for (const key of Object.keys(nodeDef.attr)) {
                    const value = nodeDef.attr[key];
                    if (!this._isTypePlaceholder(value)) {
                        node.setAttribute(key, `${value}`);
                    } else {
                        if (args != null) {
                            node.setAttribute(key, `${args[value.name]}`);
                        } else {
                            console.error('NodeRender.createElementNode(attr): args not defined');
                        }
                    }
                }
            }
            if (nodeDef.event != null) {
                for (const eventName of Object.keys(nodeDef.event)) {
                    if (args != null) {
                        const func = args[nodeDef.event[eventName]];
                        node.addEventListener(eventName, func);
                    } else {
                        console.error('NodeRender.createElementNode(event): args not defined');
                    }
                }
            }
            return node;
        } catch(e) {
            console.error('NodeRender._createElementNodeNoChildren', e);
            return null;
        }
    }

    private static _isTypePlaceholder(
        txt: (string | NodeDefPlaceholder)
    ): txt is NodeDefPlaceholder {
        return (typeof txt === 'object' && txt.name != null);
    }

    private static _isNodeTypeElement(nodeDef: NodeDef): nodeDef is NodeDefElement {
        return nodeDef.type === NodeDefType.element;
    }

    private static _isNodeTypeText(nodeDef: NodeDef): nodeDef is NodeDefText {
        return nodeDef.type === NodeDefType.text;
    }    
}
