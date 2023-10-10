/**
 * Possible events:
 * product_added_to_cart, checkout_started, checkout_contact_info_submitted, checkout_address_info_submitted, checkout_shipping_info_submitted, payment_info_submitted
 */
const trackEvents = [
    'product_added_to_cart',
    'checkout_started',
    'checkout_contact_info_submitted',
    'checkout_address_info_submitted',
    'checkout_shipping_info_submitted',
    'payment_info_submitted'
];

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
        window.fueled.customPixel.trackEvent(event);
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
});