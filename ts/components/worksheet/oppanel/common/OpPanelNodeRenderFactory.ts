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
