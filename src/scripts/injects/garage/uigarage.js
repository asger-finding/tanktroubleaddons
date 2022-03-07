const UIGarage = Classy.newClass();

UIGarage.classFields({
    phaserInstance: null 
});

UIGarage.classMethods({
    initGarage: function() {
        AudioManager.addEventListener(UIGarage._audioEventHandler, this);
        ResizeManager.addEventListener(UIGarage._resizeEventHandler, this);
        
        UIGarage.insertGarage($("#garage"));
        UIPlayerPanel.insertPanel($("#playerPanel"));
    },
    
    deinitGarage: function() {
        AudioManager.removeEventListener(UIGarage._audioEventHandler, this);
        ResizeManager.removeEventListener(UIGarage._resizeEventHandler, this);

        UIGarage.removeGarage();
        UIPlayerPanel.removePanel();
    },
    
    insertGarage: function(parentElement) {
        parentElement.empty();

        const config = {
            width: parentElement.width(),
            height: parentElement.height(),
            renderer: Phaser.WEBGL,
            //multiTexture: true,
            parent: parentElement[0],
            transparent: true,
            enableDebug: false    
        };
        UIGarage.phaserInstance = new Phaser.Game(config);

        UIGarage.phaserInstance.state.add('Boot', Garage.UIBootState.create());
        UIGarage.phaserInstance.state.add('Preload', Garage.UIPreloadState.create());
        UIGarage.phaserInstance.state.add('Load', Garage.UILoadState.create());
        UIGarage.phaserInstance.state.add('NoUsers', Garage.UINoUsersState.create());
        UIGarage.phaserInstance.state.add('Main', Garage.UIMainState.create());

        UIGarage.phaserInstance.state.start('Boot');

        return UIGarage.phaserInstance;
    },
    
    removeGarage: function() {
        if (UIGarage.phaserInstance) {
            UIGarage.phaserInstance.destroy();
            UIGarage.phaserInstance = null;
        }
    },

    getAccessoryPosition: function(type, number) {
        if (UIGarage.phaserInstance) {
            if (UIGarage.phaserInstance.state.current == 'Main') {
                return UIGarage.phaserInstance.state.getCurrentState().getAccessoryPosition(type, number);
            }
        }

        return undefined;
    },

    _audioEventHandler: function(self, evt, data) {
        switch(evt) {
            case AudioManager.EVENTS.SOUND_ON:
            {
                if (UIGarage.phaserInstance) {
                    UIGarage.phaserInstance.sound.mute = false;
                    UIGarage.phaserInstance.sound.volume = AudioManager.getSoundVolume();
                }
                
                break;
            }
            case AudioManager.EVENTS.SOUND_OFF:
            {
                if (UIGarage.phaserInstance) {
                    UIGarage.phaserInstance.sound.mute = true;
                }
                
                break;
            }
            case AudioManager.EVENTS.MUSIC_ON:
            case AudioManager.EVENTS.MUSIC_OFF:
            {
                break;
            }
        }
    },
    
    _resizeEventHandler: function(self, evt, data) {
        switch(evt) {
            case ResizeManager.EVENTS.REFRESH:
            {
                if (UIGarage.phaserInstance && UIGarage.phaserInstance.scale) {
                    UIGarage.phaserInstance.scale.refresh();
                }
                break;
            }
        }
    }
    
});
