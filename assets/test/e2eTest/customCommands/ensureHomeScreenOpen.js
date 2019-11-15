const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class EnsureHomeScreenOpen extends EventEmitter {
    command() {
        this.api.isVisible('#workbookPanel', results => {
            if (results.value) {
                /* is visible */
            } else {
                this.api.moveToElement("#homeBtn", 0, 0)
                    .mouseButtonClick("left");
            }
        });
        this.api.pause(1000);
        this.emit('complete');
        return this;
    }
}

module.exports = EnsureHomeScreenOpen;