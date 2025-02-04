((gtmContainerId) => {
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer', gtmContainerId);
})('GTM-XXXXXXX');  

analytics.subscribe("checkout_completed", (event) => {
  const checkout = event.data?.checkout;
  const ordersCount = api.init.data?.customer?.ordersCount || 0;
  const isNewCustomer = checkout.order?.customer?.isFirstOrder || Number(ordersCount) === 1;
  const coupon = (checkout?.discountApplications || [])
    .map((item) => item.title).join(",");

  const customerData = {
    customer_id: checkout.order?.customer?.id ?? null,
    customer_email: checkout.email ?? null,
    customer_first_name: checkout.billingAddress?.firstName ?? null,
    customer_last_name: checkout.billingAddress?.lastName ?? null,
    customer_phone: checkout.phone ?? checkout.billingAddress?.phone ?? null,
    customer_city: checkout.billingAddress?.city ?? null,
    customer_zip: checkout.billingAddress?.zip ?? null,
    customer_address_1: checkout.billingAddress?.address1 ?? null,
    customer_address_2: checkout.billingAddress?.address2 ?? null,
    customer_country: checkout.billingAddress?.country ?? null,
    customer_country_code: checkout.billingAddress?.countryCode ?? null,
    customer_province: checkout.billingAddress?.province ?? null,
    customer_province_code: checkout.billingAddress?.provinceCode ?? null,
    orders_count: ordersCount,
    customer_type: isNewCustomer ? "new" : "returning",
  };

  const orderData = {
    shop_name: api.init.data.shop.name ?? null,
    checkout_id: checkout.token ?? null,
    order_id: checkout.order?.id ?? null,
    revenue: checkout.totalPrice?.amount ?? 0,
    currency: checkout.currencyCode ?? "",
    tax: checkout.totalTax?.amount ?? 0,
    shipping: checkout.shippingLine?.price?.amount ?? 0,
    order_subtotal: checkout.subtotalPrice?.amount ?? 0,
    order_line_items_subtotal: checkout.subtotalPrice?.amount ?? 0,
    ...(coupon && { coupon }),
    discount_amount: checkout.discountsAmount?.amount ?? 0,
    order_total_product_count: (checkout.lineItems || []).reduce((acc, item) => {
      return acc + (item.quantity ?? 0);
    }, 0),
    includes_subscription: (checkout.lineItems || []).some((item) => item?.sellingPlanAllocation?.sellingPlan?.id),
  };

  const itemsData = (checkout.lineItems || []).map((lineItem) => {
    return {
      name: lineItem.title ?? null,
      product_id: lineItem.variant?.product?.id ?? null,
      variant: lineItem.variant?.title ?? null,
      variant_id: lineItem.variant?.id ?? null,
      sku: lineItem.variant?.sku ?? null,
      brand: lineItem.variant?.product?.vendor ?? null,
      category: lineItem.variant?.product?.type ?? null,
      price: lineItem.variant?.price?.amount ?? 0,
      original_price: lineItem.variant?.price?.amount ?? 0,
      quantity: lineItem.quantity ?? 0,
      line_item_discount: lineItem.discountAllocations.reduce((acc, item) => acc + item.amount.amount, 0),
      subscription_line_item: lineItem?.sellingPlanAllocation?.sellingPlan?.id ? true : false,
    };
  });

  window.dataLayer = window.dataLayer || [];
  
  // Add additional data to the dataLayer['fueled'] object
  window.dataLayer.fueled = {
    customer: customerData,
    order: orderData,
    orderItems: itemsData,
  };

  // Push the event to the data layer
  window.dataLayer.push({
    event: "orderDataLoaded",
    fueled: window.dataLayer.fueled,
  });
});


