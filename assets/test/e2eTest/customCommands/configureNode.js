const EventEmitter = require('events');

class ConfigureNode extends EventEmitter {
    command(nodeId, input, _cb) {
        this.api
        .openOpPanel('.operator[data-nodeid="' + nodeId + '"]')
        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4), 20000);

        this.emit('complete');
        return this;
    }
}

module.exports = ConfigureNode;