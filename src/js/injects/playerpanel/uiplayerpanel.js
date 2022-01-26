var UIPlayerPanel = Classy.newClass();

UIPlayerPanel.classFields({
    phaserInstance: null,
});

UIPlayerPanel.classMethods({
    insertPanel: function(parentElement) {
        ResizeManager.addEventListener(UIPlayerPanel._resizeEventHandler, this);

        parentElement.empty();
        
        var config = {
            width: parentElement.width(),
            height: parentElement.height(),
            renderer: Phaser.WEBGL,
            parent: parentElement[0],
            transparent: true,
            enableDebug: false    
        };
        UIPlayerPanel.phaserInstance = new Phaser.Game(config);

        UIPlayerPanel.phaserInstance.state.add('Boot', PlayerPanel.UIBootState.create());
        UIPlayerPanel.phaserInstance.state.add('Preload', PlayerPanel.UIPreloadState.create());
        UIPlayerPanel.phaserInstance.state.add('Main', PlayerPanel.UIMainState.create());

        UIPlayerPanel.phaserInstance.state.start('Boot');
        
        return UIPlayerPanel.phaserInstance;
    },
    
    removePanel: function() {
        ResizeManager.removeEventListener(UIPlayerPanel._resizeEventHandler, this);

        if (UIPlayerPanel.phaserInstance) {
            if (UIPlayerPanel.phaserInstance.load) {
                UIPlayerPanel.phaserInstance.load.reset(true, true);
            }
            UIPlayerPanel.phaserInstance.destroy();
            UIPlayerPanel.phaserInstance = null;
        }
    },

    disableInput: function() {
        $(UIPlayerPanel.phaserInstance.parent).addClass('inputDisabled');
    },

    enableInput: function() {
        $(UIPlayerPanel.phaserInstance.parent).removeClass('inputDisabled');
    },

    showLoginIcon: function() {
        // A bit of a nasty hack to hide and show login icon in menu.
        if (UIPlayerPanel.phaserInstance) {
            if (UIPlayerPanel.phaserInstance.state.current == 'Main') {
                UIPlayerPanel.phaserInstance.state.getCurrentState().scheduleUpdate(true, true);
            }
        }
    },
    
    hideLoginIcon: function() {
        // A bit of a nasty hack to hide and show login icon in menu.
        if (UIPlayerPanel.phaserInstance) {
            if (UIPlayerPanel.phaserInstance.state.current == 'Main') {
                UIPlayerPanel.phaserInstance.state.getCurrentState().scheduleUpdate(false);
            }
        }
    },
    
    getTankIconPosition: function(playerId) {
        var localPosition = this.getLocalTankIconPosition(playerId);
        if (!localPosition) {
            return this.getOnlineTankIconPosition(playerId);
        }
        
        return localPosition;
    },
    
    getLocalTankIconPosition: function(playerId) {
        if (UIPlayerPanel.phaserInstance) {
            if (UIPlayerPanel.phaserInstance.state.current == 'Main') {
                return UIPlayerPanel.phaserInstance.state.getCurrentState().getLocalTankIconPosition(playerId);
            }
        }
        
        return undefined;
    },
    
    getOnlineTankIconPosition: function(playerId) {
        if (UIPlayerPanel.phaserInstance) {
            if (UIPlayerPanel.phaserInstance.state.current == 'Main') {
                return UIPlayerPanel.phaserInstance.state.getCurrentState().getOnlineTankIconPosition(playerId);
            }
        }
        
        return undefined;
    },

    showRankChanges: function(rankChanges) {
        if (UIPlayerPanel.phaserInstance) {
            if (UIPlayerPanel.phaserInstance.state.current == 'Main') {
                UIPlayerPanel.phaserInstance.state.getCurrentState().showRankChanges(rankChanges);
            }
        }
    },

    _resizeEventHandler: function(self, evt, data) {
        switch(evt) {
            case ResizeManager.EVENTS.REFRESH:
            {
                if (UIPlayerPanel.phaserInstance && UIPlayerPanel.phaserInstance.scale) {
                    UIPlayerPanel.phaserInstance.scale.refresh();
                }
                break;
            }
        }        
    }
});
