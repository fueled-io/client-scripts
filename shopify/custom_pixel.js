/**
 * Possible events:
 * product_added_to_cart, checkout_started, checkout_contact_info_submitted, checkout_address_info_submitted, checkout_shipping_info_submitted, payment_info_submitted
 */
const events = [
    'product_added_to_cart',
    'checkout_started',
    'checkout_contact_info_submitted',
    'checkout_address_info_submitted',
    'checkout_shipping_info_submitted',
    'payment_info_submitted'
];

((configs) => {
    function loadScript(src) {
        const script = document.createElement("script");
        script.src = src;
        document.head.appendChild(script);
    }

    loadScript(`https://cdn-client.fueled.io/shopify-fueled-client-2.2.0.min.js?mb=https://mb.fueled.io&mid=${configs.mbid}`);


    window.addEventListener('fueled-load', () => {
        window.Fueled.setDataLayerItem('page', 'custom_pixel');
        window.Fueled.setDataLayerItem('config', {
            eventNames: configs.events,
            analytics,
        });
    });

})({
    events: events,
    mbid: '[[MBID]]'
});