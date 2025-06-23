const ga4ExcludedEvents = ["checkout_started"];

(() => {
	const events = [];
	let scriptLoaded = false;
	let fueledReady = false;

	function loadScript(src) {
		const link = document.createElement('link');
		link.href = src;
		link.as = 'script';
		link.rel = 'preload';
		document.head.appendChild(link);

		const script = document.createElement('script');
		script.src = src;
		script.async = true;
		document.head.appendChild(script);
		scriptLoaded = true;
	}

	function trackEvent(event) {
      const options = ga4ExcludedEvents.includes(event.name) ? {
            plugins: {
              all: true,
              "google-analytics": false,
            },
          }
        : null;

		window.fueled.customPixelV2.trackEvent({ event, api, options });
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
