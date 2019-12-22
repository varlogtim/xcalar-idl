const EventEmitter = require('events');

class SwitchTab extends EventEmitter {
    command(tabName, cb) {
        const self = this;
        const tabSelector =  `#dagTabSectionTabs .dagTab`;

        let elemFound = null;
        self.api.elements('css selector', tabSelector, function(tabs) {
            for (const elemTab of tabs.value) {
                const elemIdTab = elemTab.ELEMENT;
                self.api.elementIdElement(elemIdTab, 'css selector', 'div.name', function(nameDiv) {
                    self.api.elementIdText(nameDiv.value.ELEMENT, function(nameText) {
                        if (nameText.value === tabName) {
                            elemFound = elemIdTab;
                        }
                    });
                });
            }
        });

        self.api.perform(function() {
            if (elemFound != null) {
                self.api.elementIdClick(elemFound);
            }
        });

        self.emit('complete');

        return this;
    }
}

module.exports = SwitchTab;