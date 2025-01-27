(() => {
	const events = [];
	let scriptLoaded = false;
	let fueledReady = false;

	function loadScript(src) {
		const script = document.createElement('script');
		script.src = src;
		script.async = true;
		document.head.appendChild(script);
		scriptLoaded = true;
	}

	function trackEvent(event) {
		window.fueled.customPixelV2.trackEvent({ event, api });
	}

	api.analytics.subscribe('all_events', async (event) => {
		if (!scriptLoaded) {
			loadScript('/apps/fueled/client.js?page=custom_pixel_v2');
		}

		if (fueledReady) {
			trackEvent(event);
		} else {
			events.push(event);
		}
	});

	window.addEventListener('fueled-shopify-ready', () => {
		if (window.fueled && !fueledReady) {
			fueledReady = true;
			events.forEach(event => trackEvent(event));
		}
	});
})();
