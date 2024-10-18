(function(d,s) {
  d.head.appendChild(Object.assign(d.createElement('link'),{
    href: s,    
    as: 'script',
    rel: 'preload'
  }));
  d.head.appendChild(Object.assign(d.createElement('script'), {
    src: s,
    async: 1
  }));

  window.addEventListener('fueled-shopify-ready', () => {
    if (window.fueled && window.fueled.initPixel) {
      window.fueled.initPixel(api);
    }
  })
})(document, '/apps/fueled/client.js?page=custom_pixel_v2');
