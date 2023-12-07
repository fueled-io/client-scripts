/**
 * Possible events:
 * product_added_to_cart, checkout_started, checkout_contact_info_submitted, checkout_address_info_submitted, checkout_shipping_info_submitted, payment_info_submitted
 */
const trackEvents = [
  'checkout_started',
  'product_added_to_cart',
  'checkout_address_info_submitted',
  'checkout_shipping_info_submitted',
  'payment_info_submitted'
];

/**
 * Possible events:
 * checkout_started
 */
const ga4ExcludedEvents = ['checkout_started'];

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

    window.fueled.customPixel.trackEvent(event, options);
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

  window.addEventListener("fueled-ready", () => {
    if (!fueledReady) {
      fueledReady = true;
      events.forEach(event => trackEvent(event));
    }
  });

})({
  trackEvents,
  ga4ExcludedEvents
});
