interface Window {
	QualityManager: any;
}
declare const main: Function;
declare const load_red_infiltration: Function;

(function() {
	const extensionData = document.querySelector('tanktroubleaddons');
	if (extensionData instanceof HTMLElement && extensionData.dataset.loader) {
		const content = extensionData.dataset.loader;

		$('body').load(`${ content.slice(content.indexOf('RELEASE'), content.indexOf('/content.php')) }/content.php`, {
			tab: location.pathname.split('/')[1],
			requestURI: location.pathname + location.search
		}, function() {
			main();
	
			load_red_infiltration();
		});
	} else throw new Error('Invalid or unfound extension data element');
})();