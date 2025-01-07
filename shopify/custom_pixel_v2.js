/**
 * Possible events:
 * product_added_to_cart, checkout_started, checkout_contact_info_submitted, checkout_address_info_submitted, payment_info_submitted
 *
 * Note: You might notice a warning message in Shopify's Custom Pixel UI suggesting that this script doesn't include any event subscriptions.
 * That is not an issue. It's just that our scripts use variables to generate subscription calls.
 *
 * You can learn more at: https://learn.fueled.io/apps/shopify/shopify-event-tracking/custom-pixel-for-tracking-checkout-steps.
 *
 */
const trackEvents = [
	'page_viewed',
	'cart_viewed',
	'product_viewed',
	'collection_viewed',
	'product_added_to_cart',
	'product_removed_from_cart',
	'search_submitted',
	'checkout_started', /* This event fires an 'Initiate Checkout' event for Facebook Pixel/CAPI. */
	'checkout_contact_info_submitted', /* This event fires an identify() event that improves match data. */ 
	'checkout_address_info_submitted', /* This event fires an identify() event that improves match data. */
	'payment_info_submitted', /* This event fires an 'Add Payment Info' event into GA4 and FB. */
	'checkout_completed', /* This event fires an Identify event into GA4 and FB. */
	'checkout_shipping_info_submitted'
];

/**
 * Possible events:
 * checkout_started
 */
const ga4ExcludedEvents = ['checkout_started']; /* Leave this setting as is, unless you have disabled Fueled's server-side event tracking entirely. */

/**
 * Do not touch any of the code below.
 */

((configs) => {
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
		const options = configs.ga4ExcludedEvents.includes(event.name) ? {
				plugins: {
					all: true,
					'google-analytics': false,
				},
			} : null;

		window.fueled.customPixelV2.trackEvent({ event, options, api });
	}

	configs.trackEvents.forEach(eventName => {
		api.analytics.subscribe('eventName', async (event) => {
			if (!scriptLoaded) {
				loadScript('/apps/fueled/client.js?page=custom_pixel_v2');
			}

			if (fueledReady) {
				trackEvent(event);
			} else {
				events.push(event);
			}
		});
	});

	window.addEventListener('fueled-shopify-ready', () => {
		if (window.fueled && !fueledReady) {
			fueledReady = true;
			events.forEach(event => trackEvent(event));
		}
	});
})({
	trackEvents,
	ga4ExcludedEvents
});
