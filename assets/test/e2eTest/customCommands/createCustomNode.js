const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class CreateCustomNode extends EventEmitter {
    command(nodes) {
        console.log("Custom");
        console.log(nodes);
        // Deselect any prior node:
        this.api
                .execute(execFunctions.scrollIntoView, ['.dataflowArea.active [data-nodeid="' + nodes[0] + '"]'], () => {})
                .moveToElement('.dataflowArea.active [data-nodeid="' + nodes[0] + '"]', 30, 15)
                .mouseButtonClick('left')
        // select each node
        this.api.keys([this.api.Keys.SHIFT]);
        nodes.forEach((id) => {
            this.api
                .execute(execFunctions.scrollIntoView, ['.dataflowArea.active [data-nodeid="' + id + '"]'], () => {})
                .moveToElement('.dataflowArea.active [data-nodeid="' + id + '"]', 30, 15)
                .mouseButtonClick('left')
        });
        this.api
            .keys([this.api.Keys.NULL])
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.createCustom", 10, 1)
            .mouseButtonClick('left')
        this.emit('complete');
        return this;
    }
}

module.exports = CreateCustomNode;