const EventEmitter = require('events');

class CreateCustomNode extends EventEmitter {
    command(nodes) {
        console.log("Custom");
        console.log(nodes);
        // Deselect any prior node:
        this.api
                .moveToElement('.dataflowArea.active [data-nodeid="' + nodes[0] + '"]', 30, 15)
                .mouseButtonClick('left')
        // select each node
        this.api.keys([this.api.Keys.SHIFT]);
        nodes.forEach((id) => {
            this.api
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