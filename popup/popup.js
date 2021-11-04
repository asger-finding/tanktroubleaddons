var Constants;
var TankTroubleAddons = TankTroubleAddons || {
    _initialized: false,
    parseJSON: function (object) {
        if (object.constructor.name === String.name) {
            object = JSON.parse(object)
        }
        for (let [key, value] of Object.entries(object)) {
            if (value.constructor.name === Object.name) {
                object[key] = this.parseJSON(value)
            }
            try {
                var item = new Function('return ' + value)();
                if (item.nodeType === Node.ELEMENT_NODE) {
                    item = value
                }
            } catch (error) {
                switch (error.constructor) {
                    case ReferenceError:
                    case SyntaxError:
                        object[key] = value;
                        continue;
                    default:
                        object[key] = value;
                        console.warn(error);
                        continue
                }
            }
            object[key] = item
        }
        return object
    },
    toggle: function (elemQuery, storageKey, method, callback, tooltipsterQuery) {
        $(tooltipsterQuery).tooltipster();
        $(elemQuery).on('click', function () {
            chrome.storage.local.get([storageKey], function (result) {
                if (result[storageKey]) {
                    chrome.storage.local.set({
                        [storageKey]: false
                    }, function () { })
                } else {
                    chrome.storage.local.set({
                        [storageKey]: true
                    }, function () { })
                }
                chrome.storage.local.get([storageKey], function (result) {
                    var storageData = result[storageKey];
                    chrome.tabs.query({
                        active: true
                    }, function (tab) {
                        tab = tab[0];
                        chrome.tabs.sendMessage(tab.id, {
                            method: method,
                            data: storageData
                        }, function (response) {
                            if (typeof callback === 'function') {
                                callback(response)
                            }
                        })
                    })
                })
            })
        })
    },
    setPopupTheme: function () {
        chrome.storage.local.get([Constants.REQUESTS.darkTheme], function (result) {
            $('#stylesheet').attr('href', result[Constants.REQUESTS.darkTheme] ? Constants.CSS_POPUP_DARK_STYLESHEET : Constants.CSS_POPUP_DEFAULT_STYLESHEET)
        });
    },
    disablePopup: function () {
        this.setPopupTheme();
        $('main').addClass('disabled');
        if (!document.getElementsByClassName('disabledTitle')[0]) {
            $('body').append('<div class="disabledTitle">Disabled</div><div class="disabledDescription">TankTroubleAddons only functions on <a href="https://tanktrouble.com" target="_blank">TankTrouble.com</a> and its subdomains</div >')
        }
    },
    main: function () {
        if (this._initialized) {
            return;
        }

        var self = this;
        fetch(chrome.runtime.getURL('Constants.json'))
            .then(response => response.json())
            .then(data => {
                Constants = self.parseJSON(data);

                $(document).ready(function () {
                    chrome.storage.local.get(null, function (items) {
                        var allKeys = Object.keys(items);

                        function toggleSwitch(key) {
                            chrome.storage.local.get([key], function (result) {
                                switch (true) {
                                    case result[key].constructor.name === Boolean.name && !result[key]:
                                        $('#' + key).button('toggle');
                                        break;
                                    case result[key].constructor.name === String.name:
                                        $('#' + result[key]).addClass('active');
                                        break;
                                }
                            });
                        }
                        allKeys.forEach(function (key) {
                            toggleSwitch(key);
                        });
                    });
                });
                chrome.tabs.query({
                    active: true,
                    windowId: chrome.windows.WINDOW_ID_CURRENT
                }, function (tab) {
                    tab = tab[0];

                    var host = new URL(tab.url).host;
                    if (!(host.includes('tanktrouble.com') && !host.includes('classic'))) {
                        self.disablePopup();
                        return;
                    }
                    $(document).ready(function () {
                        $('.section .maze div:not(.subtitle)').tooltipster();
                        self.toggle(Constants.POPUP.ELEMENT_ID.darkTheme, Constants.REQUESTS.darkTheme, Constants.REQUESTS.darkTheme, function (result) {
                            self.setPopupTheme();
                        });
                        self.toggle(Constants.POPUP.ELEMENT_ID.classicMouse, Constants.REQUESTS.classicMouse, Constants.REQUESTS.classicMouse, function (result) { }, Constants.POPUP.ELEMENT_CLASS.classicMouse);
                        self.toggle(Constants.POPUP.ELEMENT_ID.systemMessages, Constants.REQUESTS.systemMessages, Constants.REQUESTS.systemMessages, function (result) { }, Constants.POPUP.ELEMENT_CLASS.systemMessages);
                        self.toggle(Constants.POPUP.ELEMENT_ID.musicTheme, Constants.REQUESTS.musicTheme, Constants.REQUESTS.musicTheme, function (result) { }, Constants.POPUP.ELEMENT_CLASS.musicTheme);
                        self.toggle(Constants.POPUP.ELEMENT_ID.alternativeFont, Constants.REQUESTS.alternativeFont, Constants.REQUESTS.alternativeFont, function (result) { }, Constants.POPUP.ELEMENT_CLASS.alternativeFont);
                        self.toggle(Constants.POPUP.ELEMENT_ID.colouredBullets, Constants.REQUESTS.colouredBullets, Constants.REQUESTS.colouredBullets, function (result) { }, Constants.POPUP.ELEMENT_CLASS.colouredBullets);
                        self.toggle(Constants.POPUP.ELEMENT_ID.highResTanks, Constants.REQUESTS.highResTanks, Constants.REQUESTS.highResTanks, function (result) { }, Constants.POPUP.ELEMENT_CLASS.highResTanks);

                        $(Constants.POPUP.ELEMENT_CLASS.mazeTheme).each(function () {
                            $(this).on('mouseup', function () {
                                if (!$(this).hasClass('active')) {
                                    var value = $(this).val();
                                    $(Constants.POPUP.ELEMENT_CLASS.mazeTheme).removeClass('active');
                                    $(this).toggleClass('active');
                                    chrome.storage.local.set({
                                        mazeTheme: value
                                    }, function () { });
                                    chrome.tabs.getSelected(null, function (tab) {
                                        chrome.tabs.sendMessage(tab.id, {
                                            method: Constants.REQUESTS.mazeTheme,
                                            data: value
                                        }, function (response) { });
                                    });
                                }
                            });
                        });
                    });

                    self.setPopupTheme();
                });
                self._initialized = true;
            });

    }
}
TankTroubleAddons.main();