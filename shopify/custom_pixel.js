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
  //'product_added_to_cart', /* Uncomment this event if you have disabled Fueled's standard "Add to Cart" tracking in our app configuration. */
  'checkout_started', /* This event fires an "Initiate Checkout" event for Facebook Pixel/CAPI. */
  'checkout_contact_info_submitted', /* This event fires an identify() event that improves match data. */
  'checkout_address_info_submitted', /* This event fires an identify() event that improves match data. */
  'payment_info_submitted', /* This event fires an "Add Payment Info" event into GA4 and FB. */
  'checkout_completed' /* This event fires a "Purchase" event into GA4 and FB. */
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
    const script = document.createElement("script");
    script.src = src;
    document.head.appendChild(script);
    scriptLoaded = true;
  }

  function trackEvent(event) {
    const options = ga4ExcludedEvents.includes(event.name) ? {
      plugins: {
        all: true,
        "google-analytics": false,
      }
    } : null;

    window.fueled.customPixel.trackEvent(event, options, init);
  }

  configs.trackEvents.forEach(eventName => {
    analytics.subscribe(eventName, async (event) => {
      if (!scriptLoaded)
        loadScript(`/apps/fueled/client.js?page=custom_pixel&rand=1`);

      if (fueledReady)
        trackEvent(event);
      else
        events.push(event);
    });
  });

  window.addEventListener("fueled-shopify-ready", () => {
    if (!fueledReady) {
      fueledReady = true;
      events.forEach(event => trackEvent(event));
    }
  });

})({
  trackEvents,
  ga4ExcludedEvents
});
