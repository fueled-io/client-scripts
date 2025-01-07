/**
 * Possible events:
 * checkout_started
 */
const ga4ExcludedEvents = ['checkout_started']; /* Leave this setting as is, unless you have disabled Fueled's server-side event tracking entirely. */

/**
 * Do not touch any of the code below.
 */

(() => {
	const events = [];
	let scriptLoaded = false;
	let fueledReady = false;

	function loadScript(src) {
		const script = document.createElement('script');
		script.src = src;
		script.async = true;

		const link = document.createElement('link');
		link.href = src;
		link.as = 'script';
		link.rel = 'preload';

		document.head.appendChild(script);
		document.head.appendChild(link);

		scriptLoaded = true;
	}

	function trackEvent(event) {
		const options = ga4ExcludedEvents.includes(event.name) ? {
			plugins: {
				all: true,
				'google-analytics': false,
			},
		} : null;

		window.fueled.customPixelV2.trackEvent({ event, options, api });
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
