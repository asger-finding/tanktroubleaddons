var FocusManager = Classy.newClass();

FocusManager.classFields({
    focused: true,
    eventListeners: [],
    EVENTS: {
        FOCUS: "focus",
        BLUR: "blur"
    }
});

FocusManager.classMethods({
    addEventListener: function(callback, context) {
        FocusManager.eventListeners.push({cb: callback, ctxt: context});
    },

    removeEventListener: function(callback, context) {
        for (var i=0;i<FocusManager.eventListeners.length;i++) {
            if (FocusManager.eventListeners[i].cb===callback && FocusManager.eventListeners[i].ctxt===context) {
                // Remove single entry from array, and return immediately
                // as continuing iteration is unsafe, as the underlying array
                // has been modified
                FocusManager.eventListeners.splice(i, 1);
                return;
            }
        }
    },

    init: function() {
        $(window).focus(function(){
            // Store focus state in convenient location.
            FocusManager.focus();
        });

        $(window).blur(function(){
            // Store focus state in convenient location.
            FocusManager.blur();
        });
    },
    
    focus: function() {
        FocusManager.focused = true;
        
        FocusManager.clearTitle();

        FocusManager._notifyEventListeners(FocusManager.EVENTS.FOCUS);
    },
    
    blur: function() {
        FocusManager.focused = false;

        FocusManager._notifyEventListeners(FocusManager.EVENTS.BLUR);
    },
    
    isFocused: function() {
        return FocusManager.focused;
    },
    
    showMessageInTitle: function(msg) {
        FocusManager.clearTitle();
        document.title += " - " + msg;
    },
    
    clearTitle: function() {
        document.title = "TankTrouble";
    },

    _notifyEventListeners: function(evt, data) {
        for (var i=0;i<FocusManager.eventListeners.length;i++) {
            FocusManager.eventListeners[i].cb(FocusManager.eventListeners[i].ctxt, evt, data);
        }
    }

});