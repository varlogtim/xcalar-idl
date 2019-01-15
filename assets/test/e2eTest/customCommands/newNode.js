const EventEmitter = require('events');

class NewNode extends EventEmitter {
    command(selector, x, y, cb) {
        let dfAreaCoors;
        this.api
            .getLocation("#dagView .dataflowMainArea", function(result) {
                dfAreaCoors = result.value;
            })
            .getLocation(selector, (result) => {
                let offset = {
                    x: result.value.x - dfAreaCoors.x,
                    y: result.value.y - dfAreaCoors.y
                };
                this.api.moveToElement(selector, 0, 10)
                .mouseButtonDown("left")
                .moveTo(null, x - offset.x, y - offset.y - 10)
                .mouseButtonUp("left");
            });

        this.emit('complete');

        return this;
    }
}

module.exports = NewNode;