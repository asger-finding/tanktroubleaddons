var Content = Classy.newClass().name('Content');

Content.classFields({
    activeTab: null
});

Content.classMethods({
    init: function() {
        if (history['scrollRestoration']) {
            // We will handle restoration of scroll position manually.
            history.scrollRestoration = 'manual';
        }

        $(window).on('popstate', function(event) {

            // Ignore initial pop state from some browsers (e.g. Safari).
            if (!event.originalEvent.state) {
                return;
            }

            if (event.originalEvent.state) {
                if (event.originalEvent.state.tab) {
                    if (event.originalEvent.state.tab !== Content.activeTab) {
                        Content._getPrimaryContent(event.originalEvent.state.tab, location.pathname + location.search);
                        Content._setActiveTab(event.originalEvent.state.tab);
                    } else {
                        Content._updatePage(event.originalEvent.state.tab, event.originalEvent.state.data);
                    }
                }
            } else {
                window.location = location.href;
            }
        });

        $('#gameTab').click(function() {
            Content.navigateToTab('game', '/game', {});
        });

        $('#shopTab').click(function() {
            Content.navigateToTab('shop', '/shop', {});
        });

        $('#newsTab').click(function() {
            Content.navigateToTab('news', '/news', {});
        });

        $('#forumTab').click(function() {
            Content.navigateToTab('forum', '/forum', {});
        });

        $('#garageTab').click(function() {
            Content.navigateToTab('garage', '/garage', {});
        });

        $('#labTab').click(function() {
            Content.navigateToTab('lab', '/lab', {});
        });

        Content._initPage(g_initialTab);
        Content._setActiveTab(g_initialTab);
        var state = {tab: g_initialTab, data: g_initialData};
        Content._replaceHistory(state, location.pathname + location.search);
    },

    shutdown: function() {
        Content._deinitPage(Content.activeTab);
        $('#mainContent').empty();
    },

    /**
     * Do navigation, by updating primary content area to load content from the
     * specified tab. Additionally, a path must be provided, to allow it to get pushed
     * to the browser history. The path (really an absolute URI like this:
     * /forum/thread-7/?param1=1&param2=2) must contain the complete URI (no domain)
     * to push to the browser history, including parameters, anchors etc.
     * The URI is parsed by the JSON-RPC server to determine what content to deliver
     *
     * @param tab The tab to use
     * @param path The URI used to determine what content to return
     */
    navigateToTab: function(tab, path, data) {
        var state = {tab: tab, data: data};
        if (tab !== Content.activeTab) {
            Content._getPrimaryContent(tab, path);
            Content._setActiveTab(tab);
        } else {
            Content._updatePage(tab, state.data);
        }
        Content._pushHistory(state, path);
    },

    getActiveTab: function() {
        return Content.activeTab;
    },

    updateTab: function(tab, path, data, replace) {
        var state = {tab: tab, data: data};
        if (replace) {
            Content._replaceHistory(state, path);
        } else {
            Content._pushHistory(state, path);
        }
    },

    _getPrimaryContent: function(tab, path) {

        Content._deinitPage(Content.activeTab);
        $('#mainContent').empty();

        Backend.getInstance().getPrimaryContent(
            function(content) {
                $('#mainContent').html(content);
                Content._initPage(tab);
            },
            function() {},
            function() {},
            tab,
            path
        );
    },

    _setActiveTab: function(tab) {
        Content.activeTab = tab;
        $(".tab").removeClass("selected");
        $("#"+tab+"Tab").addClass("selected");
    },

    _pushHistory: function(state, path) {
        history.pushState(
            state,
            '',
            path
        );
    },

    _replaceHistory: function(state, path) {
        history.replaceState(
            state,
            '',
            path
        );
    },

    _initPage: function(tab) {
        // Place everything properly.
        ResizeManager.refresh();
        // Refresh banner ads.
        if (AdvertisementManager.shouldPresentBanner()) {
            AdvertisementManager.requestBanner($("#leftBanner").find(".banner"), "4740394483", true);
            AdvertisementManager.requestBanner($("#rightBanner").find(".banner"), "6217127687", true);
        }
        // Initialize page.
        switch(tab) {
            case 'news':
            {
                News.initNews();
                break;
            }
            case 'forum':
            {
                Forum.initForum();
                break;
            }
            case 'garage':
            {
                UIGarage.initGarage();
                break;
            }
            case 'game':
            {
                GameManager.initGame();
                break;
            }
            case 'shop':
            {
                Shop.initShop();
                break;
            }
        }

        // MUAAAHAAHA - they'll never find this!
        reload_red_infiltration();
    },

    _updatePage: function(tab, data) {
        switch(tab) {
            case 'news':
            {
                News.updateNews(data);
                break;
            }
            case 'forum':
            {
                Forum.updateForum(data);
                break;
            }
            case 'garage':
            {
                break;
            }
            case 'game':
            {
                break;
            }
            case 'shop':
            {
                Shop.updateShop(data);
                break;
            }
        }
    },

    _deinitPage: function(tab) {
        switch(tab) {
            case 'news':
            {
                News.deinitNews();
                break;
            }
            case 'forum':
            {
                Forum.deinitForum();
                break;
            }
            case 'garage':
            {
                UIGarage.deinitGarage();
                break;
            }
            case 'game':
            {
                GameManager.deinitGame();
                break;
            }
            case 'shop':
            {
                Shop.deinitShop();
                break;
            }
        }
    }
});
