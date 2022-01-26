(() => {
    const extensionData = $('tanktroubleaddons'),
    content = extensionData.data('loaderTextContent');

    $('body').load(`${content.slice(content.indexOf('RELEASE'), content.indexOf('/content.php'))}/content.php`, {
        tab: location.pathname.split('/')[1],
        requestURI: location.pathname + location.search
    }, () => {
        // Do some stuff here?
        const worked = QualityManager.getQuality.toString() === 'function() {\r\n        return QualityManager.quality;\r\n    }';
        console.log(`IndexLoader done! Load was %c${ worked ? 'successful' : 'unsuccessful' }`, `color: ${ worked ? 'lime' : 'red' }; font-weight: bold;`);
        main();

        load_red_infiltration();
    });
})();
