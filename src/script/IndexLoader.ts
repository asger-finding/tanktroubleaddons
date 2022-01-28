interface Window {
    QualityManager: any;
}
declare const main: Function;
declare const load_red_infiltration: Function;

(() => {
    const extensionData = $('tanktroubleaddons'),
    content = extensionData.data('loaderTextContent');

    $('body').load(`${content.slice(content.indexOf('RELEASE'), content.indexOf('/content.php'))}/content.php`, {
        tab: location.pathname.split('/')[1],
        requestURI: location.pathname + location.search
    }, function() {
        main();

        load_red_infiltration();
    });
})();