var Constants;
var TankTroubleAddons = TankTroubleAddons || {
    mainFired: false,
    parseJSON: function (object) { if (object.constructor.name === String.name) { object = JSON.parse(object) } for (let [key, value] of Object.entries(object)) { if (value.constructor.name === Object.name) { object[key] = this.parseJSON(value) } try { var item = new Function('return ' + value)(); if (item.nodeType === Node.ELEMENT_NODE) { item = value } } catch (error) { switch (error.constructor) { case ReferenceError: case SyntaxError: object[key] = value; continue; default: object[key] = value; console.warn(error); continue } } object[key] = item } return object },
    setLocalStorage: function (key, value) {
        chrome.storage.local.get([key], function (result) {
            if (Object.keys(result).length === 0 && result.constructor === Object) {
                chrome.storage.local.set({ [key]: value }, function () { });
            }
        });
    },
    readFromLocalStorage: function (key) {
        chrome.storage.local.get([key], function (result) {
            return result[key];
        });
    },
    interceptPhaser: function () {
        // *********
        // Intercept Phaser CE v2.6.2.
        // Redirect request to Phaser CE v2.15.1
        // Updated NineSlice plugin to newest version.
        // *********
        chrome.webRequest.onBeforeRequest.addListener(function (details) {
            if (details.url.includes('phaser.min.js'))
                return { redirectUrl: chrome.extension.getURL('/ttaddons/phaser.js') };

            if (details.url.includes('phaser-nineslice.min.js'))
                return { redirectUrl: chrome.extension.getURL('/ttaddons/phaser-nineslice.js') };

        }, { urls: ["*://cdn.tanktrouble.com/*"] }, ["blocking"]);
    },
    main: function () {
        if (this.mainFired) {
            return;
        }
        this.mainFired = true;

        var self = this;
        fetch(chrome.runtime.getURL('Constants.json'))
            .then(response => response.json())
            .then(data => {
                Constants = self.parseJSON(data);
                
                for (var [key, value] of Object.entries(Constants.INSTALL_CONFIG)) {
                    self.setLocalStorage(key, value);
                }
                chrome.runtime.getPackageDirectoryEntry(function (directoryEntry) {
                    directoryEntry.getDirectory('images/emotes', {}, function (subDirectoryEntry) {
                        var directoryReader = subDirectoryEntry.createReader();
                        var videoEntries = [];
                        var imageEntries = [];
                        (function readNext() {
                            directoryReader.readEntries(function (entries) {
                                if (entries.length) {
                                    for (var i = 0; i < entries.length; ++i) {
                                        var name = entries[i].name;
                                        switch (true) {
                                            case name.endsWith('.png'):
                                            case name.endsWith('.jpg'):
                                                imageEntries.push(name);
                                                break;
                                            case name.endsWith('.gif'):
                                                videoEntries.push(name);
                                                break;
                                        }
                                    }
                                    readNext();
                                } else {
                                    self.setLocalStorage(Constants.REQUESTS.videoEmotes, videoEntries);
                                    self.setLocalStorage(Constants.REQUESTS.imageEmotes, imageEntries);
                                }
                            });
                        })();
                    });
                });
            });
    }
};
/*
 * TankTroubleAddons.interceptPhaser();
 * Disabled for now. Phaser CE has problems with the NineSlice plugin.
*/
chrome.runtime.onInstalled.addListener(function () {
    TankTroubleAddons.main();
});
if (TankTroubleAddons.readFromLocalStorage('version') !== chrome.runtime.getManifest().version) {
    TankTroubleAddons.main();
    TankTroubleAddons.setLocalStorage('version', chrome.runtime.getManifest().version);
}