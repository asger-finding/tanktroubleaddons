var OverlayManager = Classy.newClass();

OverlayManager.classFields({
    initialOverlayParams: {},
    overlayQueue: [],

    // jQuery objects.
    overlay: null,
    closeButton: null,

    // State.
    overlayShowing: false,
    currentOverlay: null,
    inTransition: false,
    content: null

});

OverlayManager.classMethods({

    init: function(hashString) {
        if (hashString.length > 0) {
            const overlayString = decodeURIComponent(hashString.substr(1));
            const overlayParams = overlayString.split('&');
            for (let i = 0; i < overlayParams.length; ++i) {
                const overlayParam = overlayParams[i].split('=');

                if (overlayParam.length == 2) {
                    OverlayManager.initialOverlayParams[overlayParam[0]] = overlayParam[1];
                }
            }
        }

        OverlayManager.overlay = $('<div id="overlay" class="noselect"/>');
        OverlayManager.closeButton = $('<button class="warning medium">×</button>');

        OverlayManager.overlay.append(OverlayManager.closeButton);

        $('body').append(OverlayManager.overlay);
    },

    hasInitialOverlay: function() {
        return OverlayManager.initialOverlayParams.type !== undefined;
    },

    isOverlayShowing: function() {
        return OverlayManager.overlayShowing;
    },

    getCurrentOverlay: function() {
        return OverlayManager.currentOverlay;
    },

    enqueueInitialOverlay: function() {
        const initialOverlayParams = OverlayManager.initialOverlayParams;
        switch(initialOverlayParams.type) {
            case 'verify':
            {
                if (initialOverlayParams.playerid !== undefined && initialOverlayParams.token !== undefined) {
                    OverlayManager.enqueueOverlay(
                        TankTrouble.AccountVerificationOverlay,
                        {playerId: initialOverlayParams.playerid, token: initialOverlayParams.token}
                    );
                }
                break;
            }
            case 'recover':
            {
                if (initialOverlayParams.playerid !== undefined && initialOverlayParams.token !== undefined) {
                    OverlayManager.enqueueOverlay(
                        TankTrouble.AccountRecoveryOverlay,
                        {playerId: initialOverlayParams.playerid, token: initialOverlayParams.token}
                    );
                }
                break;
            }
            case 'revert':
            {
                if (initialOverlayParams.playerid !== undefined && initialOverlayParams.token !== undefined) {
                    OverlayManager.enqueueOverlay(
                        TankTrouble.AccountReversalOverlay,
                        {playerId: initialOverlayParams.playerid, token: initialOverlayParams.token}
                    );
                }
                break;
            }
            case 'unsubscribenewsletter':
            {
                if (initialOverlayParams.playerid !== undefined) {
                    OverlayManager.enqueueOverlay(
                        TankTrouble.NewsletterUnsubscriptionOverlay,
                        {playerId: initialOverlayParams.playerid}
                    );
                }
                break;
            }
            case 'messages':
            {
                OverlayManager.enqueueOverlay(
                    TankTrouble.MessagesOverlay,
                    {}
                );
                break;
            }
        }
    },

    /**
     * Enqueues an overlay behind any existing.
     * Will always succeed.
     * This function should be used by non-user initiated events (e.g. NOT from a button).
     *
     * @param overlayClass
     * @param overlayParams
     * @param closeCb
     */
    enqueueOverlay: function(overlayClass, overlayParams, closeCb) {
        OverlayManager.overlayQueue.push({
            overlay: overlayClass,
            params: overlayParams,
            closeCb: closeCb
        });

        // Show overlay if only one is in the queue.
        if (OverlayManager.overlayQueue.length == 1) {
            OverlayManager._showOverlay(0);
        }
    },

    /**
     * Pushes overlay in front of any existing.
     * Will fail if an existing overlay is in transition.
     * This function should be used by user-initiated events (e.g. button presses).
     *
     * @param overlayClass
     * @param overlayParams
     * @param closeCb
     * @returns {boolean} Return whether the push succeeded or not.
     */
    pushOverlay: function(overlayClass, overlayParams, closeCb) {
        if (OverlayManager.inTransition) {
            return false;
        }

        if (OverlayManager.overlayQueue.length >= 1) {
            const currentOverlay = OverlayManager.overlayQueue[0];
            currentOverlay.overlay.hide();
        }

        OverlayManager.overlayQueue.unshift({
            overlay: overlayClass,
            params: overlayParams,
            closeCb: closeCb
        });

        if (OverlayManager.overlayQueue.length >= 2) {
            OverlayManager._updateOverlay();
        } else {
            OverlayManager._showOverlay(0)
        }

        return true;
    },

    /**
     * Pops any existing overlay.
     * If preserveQueue is false, any queued overlays will be popped as well.
     * If force is false, the pop will fail if an existing overlay is in transition OR if the current overlay should not hide.
     * Force should never be true when calling this function from a user-initiated, repeatable event.
     *
     * @param preserveQueue
     * @param force
     * @returns {boolean} Return whether the pop succeeded or not.
     */
    popOverlay: function(preserveQueue, force) {
        if (preserveQueue === undefined) {
            preserveQueue = false;
        }

        if (force === undefined) {
            force = false;
        }

        if (!force && OverlayManager.inTransition) {
            return false;
        }

        // Attempt to pop first overlay.
        if (OverlayManager._attemptToHideCurrentOverlay(force)) {
            OverlayManager.overlayQueue.shift();
        } else {
            return false;
        }

        if (!preserveQueue) {
            // Unravel entire queue.
            while(OverlayManager.overlayQueue.length >= 1) {
                if (OverlayManager._attemptToHideCurrentOverlay(true)) {
                    OverlayManager.overlayQueue.shift();
                } else {
                    return false; // Should never happen, since force is true in above call.
                }
            }
        }

        // Show next overlay if any is in the queue or hide overlay.
        if (OverlayManager.overlayQueue.length >= 1) {
            OverlayManager._updateOverlay();
        } else {
            OverlayManager._hideOverlay();
        }

        return true;
    },

    /**
     * Replaces existing overlay if one exists, otherwise just enqueues the given overlay.
     * See documentation for replaceOverlay
     */
    replacePotentialOverlay: function(overlayClass, overlayParams, force, closeCb) {
        if (OverlayManager.isOverlayShowing()) {
            OverlayManager.replaceOverlay(overlayClass, overlayParams, force, closeCb);
        } else {
            OverlayManager.enqueueOverlay(overlayClass, overlayParams, closeCb);
        }
    },

    /**
     * Replaces existing overlay.
     * If force is false, the replacement will fail if an existing overlay is in transition OR if the current overlay should not hide.
     * Force should never be true when calling this function from a user-initiated, repeatable event.
     *
     * @param overlayClass
     * @param overlayParams
     * @param force
     * @param closeCb
     * @returns {boolean} Return whether the replacement succeeded or not.
     */
    replaceOverlay: function(overlayClass, overlayParams, force, closeCb) {
        if (force === undefined) {
            force = false;
        }

        if (!force && OverlayManager.inTransition) {
            return false;
        }

        if (OverlayManager._attemptToHideCurrentOverlay(force)) {
            OverlayManager.overlayQueue.shift();
        } else {
            return false;
        }

        OverlayManager.overlayQueue.unshift({
            overlay: overlayClass,
            params: overlayParams,
            closeCb: closeCb
        });

        OverlayManager._updateOverlay();

        return true;
    },

    _attemptToHideCurrentOverlay: function(force) {
        if (OverlayManager.overlayQueue.length >= 1) {
            const currentOverlay = OverlayManager.overlayQueue[0];

            // Check if overlay should hide.
            if (force || currentOverlay.overlay.shouldHide()) {
                currentOverlay.overlay.hide();
                if (currentOverlay.closeCb !== undefined) {
                    currentOverlay.closeCb();
                }
            } else {
                // Cancel any further behaviour.
                return false;
            }

            return true;
        }

        return false;
    },

    _updateOverlay: function() {
        OverlayManager.content.stop().fadeOut(UIConstants.OVERLAY_FADE_TIME);
        OverlayManager.closeButton.stop().fadeOut(UIConstants.OVERLAY_FADE_TIME);

        $(document).off("keyup.overlay");

        OverlayManager.closeButton.off("click.overlay");

        OverlayManager._showOverlay(UIConstants.OVERLAY_FADE_TIME);
    },

    _showOverlay: function(delay) {
        OverlayManager.inTransition = true;

        const newOverlay = OverlayManager.overlayQueue[0];

        setTimeout(function() {
            if (OverlayManager.content) {
                OverlayManager.content.detach();
            }
            OverlayManager.content = newOverlay.overlay.getContents().hide();
            OverlayManager.overlay.prepend(OverlayManager.content);

            GameManager.disableGameInput();

            OverlayManager.overlayShowing = true;
            OverlayManager.currentOverlay = newOverlay.overlay;

            $("body").addClass("noscroll");

            OverlayManager.overlay.stop().fadeIn(UIConstants.OVERLAY_FADE_TIME);
            OverlayManager.content.stop().fadeIn(UIConstants.OVERLAY_FADE_TIME, function() {
                OverlayManager.inTransition = false;
            });

            newOverlay.overlay.show(newOverlay.params);

            if (newOverlay.overlay.canBeCancelled()) {
                OverlayManager.closeButton.stop().fadeIn(UIConstants.OVERLAY_FADE_TIME);

                $(document).on("keyup.overlay", function(event) {
                    if (event.which == 27) {
                        $(document).off("keyup.overlay");
                        OverlayManager.popOverlay(false, false);
                    }
                });

                OverlayManager.closeButton.on("click.overlay", function(event) {
                    OverlayManager.popOverlay(false, false);
                });
            } else {
                OverlayManager.closeButton.hide();
            }
        },
        delay);
    },

    _hideOverlay: function() {
        OverlayManager.inTransition = true;

        OverlayManager.overlay.stop().fadeOut(UIConstants.OVERLAY_FADE_TIME, function() {
            OverlayManager.inTransition = false;
        });

        $(document).off("keyup.overlay");

        OverlayManager.closeButton.off("click.overlay");

        GameManager.enableGameInput();

        OverlayManager.overlayShowing = false;
        OverlayManager.currentOverlay = null;

        $("body").removeClass("noscroll");
    }
});
