const services = {
  facebook: {
    config: {
      pixelId: {{your_pixel_id}},
      valueField: "subtotal",
      contentIdPurchase: "product_id",
      contentTypePurchase: "product_group",
    },
    async loadScript() {
      if (window.fbq) return Promise.resolve();

      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        t.onerror = undefined;
        f.fbq.disablePushState = false;
        f.fbq.allowDuplicatePageViews = false;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

      return utils.waitForLoad(() => window.fbq); 
    },
    async init (event) {
      const windowFbq = window?.fbq;
      const userData = await utils.getUserData(event);
    
      windowFbq("init", this.config.pixelId, userData, {
        eventID: await utils.getEventId([
          userData.external_id,
          event?.timestamp || Date.now(),
          Math.random().toString(36)
        ].join("_"))
      });
    },
    async format(event) {
      const checkoutData = event?.data?.checkout || event?.customData?.checkout;
      const value = Number(this.config.valueField === "total" ? checkoutData?.totalPrice?.amount : checkoutData?.subtotalPrice?.amount);
      
      return {
        currency: checkoutData?.currencyCode || checkoutData?.currency || "USD",
        contents: (checkoutData?.lineItems || []).map(item => ({
          id: utils.shopifyGidToId(this.config.contentIdPurchase === "variant_id" ? item.variant?.id : item.variant?.product?.id),
          title: item.variant?.product?.title || item.title,
          ...(item.variant?.product?.vendor ? { brand: item.variant?.product?.vendor } : {}),
          ...(item.variant?.price?.amount ? { item_price: parseFloat(item.variant?.price?.amount) } : {}),
          ...(item.variant?.product?.type ? { category: item.variant?.product?.type } : {}),
          quantity: item.quantity || 1
        })),
        content_type: this.config.contentTypePurchase,
        value,
        order_id: utils.shopifyGidToId(checkoutData?.order?.id),
        num_items: (checkoutData?.lineItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0),
      };
    },
    async handler (event) {
      const windowFbq = window?.fbq;
      const payload = await this.format(event);

      if (payload.value === 0) {
        return;
      }

      const eventId = await utils.getEventId(payload.order_id);
      
      windowFbq("track", "Purchase", payload, { eventID: eventId });

      const checkoutData = event?.data?.checkout || event?.customData?.checkout;
      
      const isSubscription = (checkoutData?.lineItems || []).some(item => 
        Boolean(item?.sellingPlanAllocation?.sellingPlan?.id)
      );
      
      let isFirstTime = checkoutData?.order?.customer?.isFirstOrder;
      if (typeof isFirstTime !== "boolean") {
        const ordersCountCookie = await utils.readCookie("fueled_customer_order_count");
        const ordersCountShopify = api.init?.data?.customer?.ordersCount;
        const ordersCount = ordersCountCookie ? +ordersCountCookie + 1 : ordersCountShopify;
        
        if (typeof ordersCount === "number") {
          isFirstTime = Number(ordersCount) === 1;
        }
      }
      
      const additionalEventTypes = [isSubscription ? "purchase_subscription" : "purchase_onetime"];

      if (typeof isFirstTime !== "undefined") {
        additionalEventTypes.push(isFirstTime ? "purchase_firsttime" : "purchase_returning");
      }

      for (const type of additionalEventTypes) {
        windowFbq("trackCustom", type, payload, {
          eventID: await utils.getEventId([payload.order_id, type].join("_"))
        });
      }

    },
  },
  // datahub: {},
};

const utils = {
  async waitForLoad(readyFunc, callback, {
    timeout = 5000,
    interval = 100,
    warningMessage = "Condition not met"
  } = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let timeoutId = null;

      const check = async () => {
        try {
          const result = readyFunc();
          const isReady = result instanceof Promise ? await result : result;
          
          if (isReady) {
            if (timeoutId) clearTimeout(timeoutId);
            if (callback) callback();
            resolve();
            return;
          }

          const elapsed = Date.now() - startTime;
          if (elapsed > timeout) {
            if (timeoutId) clearTimeout(timeoutId);
            console.warn(`${warningMessage} after ${timeout}ms`);
            reject(new Error(warningMessage));
            return;
          }

          timeoutId = setTimeout(check, interval);
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          reject(error);
        }
      };

      check();
    });
  },
  shopifyGidToId(gid = "")  {
    return gid.replace(/gid:\/\/shopify\/\w+\//, "");
  },
  async getHash(value = "") {
    if (!value) return "";
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  },
  
  async getCleanHash(value) {
    if (!value) return null;

    const cleanValue = value.trim().toLowerCase();
    return await this.getHash(cleanValue);
  },

  async getExternalId() {
    const userToken = this.readCookie("fueledUserToken");
    if (userToken) {
      return userToken;
    }

    const cartToken = await Promise.any([this.readCookie("cart"), this.readCookie("fueledCartToken")]).catch(() => undefined);
    const anonymousId = await Promise.any([
      this.readCookie("__anon_id"),
      this.readCookie("external_fueled_session"),
      this.readCookie("pack_session"),
      this.readCookie("shopify_y")
    ]).catch(() => undefined);
    const externalCustomerId = api.init?.data?.customer?.id  || undefined;
    
    const externalId = cartToken || anonymousId || externalCustomerId;
    return externalId ? await this.getHash(externalId) : undefined;
  },
  async getTraits() {
    const cookieTraits = await this.readCookie("__user_traits");
    const apiTraits = api.init?.data?.customer;
    let traits;
    if (apiTraits && Object.keys(apiTraits).some((key) => apiTraits[key] != null && apiTraits[key] !== "")) {
      traits = cookieTraits ? { ...cookieTraits, ...Object.fromEntries(Object.entries(apiTraits).filter(([_, v]) => v != null && v !== "")) } : apiTraits;
    } else {
      traits = cookieTraits;
    }

    return traits;
  },
  async getUserData(event) {
    const traits = await this.getTraits();
    const checkoutData = event?.data?.checkout || event?.customData?.checkout;
    
    const firstName = checkoutData?.billingAddress?.firstName ||
      event?.data?.checkout?.shippingAddress?.firstName ||
      api.init?.data?.customer?.firstName ||
      traits?.firstName;

    const lastName = checkoutData?.billingAddress?.lastName ||
      checkoutData?.shippingAddress?.lastName ||
      api.init?.data?.customer?.lastName ||
      traits?.lastName;

    const email = checkoutData?.email ||
      api.init?.data?.customer?.email ||
      traits?.email;

    const phone = checkoutData?.phone ||
      api.init?.data?.customer?.phone ||
      traits?.phone;

    const city = checkoutData?.billingAddress?.city ||
      checkoutData?.shippingAddress?.city ||
      traits?.address?.city;

    const stateCode = checkoutData?.billingAddress?.provinceCode ||
      checkoutData?.shippingAddress?.provinceCode ||
      traits?.address?.stateCode;

    const postalCode = checkoutData?.billingAddress?.zip ||
      checkoutData?.shippingAddress?.zip ||
      traits?.address?.postalCode;

    const countryCode = checkoutData?.billingAddress?.countryCode ||
      checkoutData?.shippingAddress?.countryCode ||
      traits?.address?.countryCode;
    
    const emailHash = await this.getCleanHash(email);

    const firstNameHash = firstName ? await this.getCleanHash(firstName) : undefined;
    const lastNameHash = lastName ? await this.getCleanHash(lastName) : undefined;


    const cityHash = city ? await this.getCleanHash(city.replace(/ /g, "")) : undefined;
    const stateCodeHash = stateCode ? await this.getCleanHash(stateCode) : undefined;
    const postalCodeHash = postalCode ? await this.getCleanHash(postalCode) : undefined;

    const notHashedCountryCode = [
      countryCode,
      await this.readCookie("fueled_country_code")
    ].find((code) => typeof code === "string" && /^[A-Z]{2,}$/i.test(code));

    const countryCodeHash = notHashedCountryCode ? await this.getCleanHash(notHashedCountryCode) : undefined;

    const phoneNumber =
    utils.formatPhone(phone, notHashedCountryCode) || utils.formatPhone(phone);
    const phoneNumberHash = await this.getCleanHash(phoneNumber?.replace(/^\+/, "")?.replace(/^0{1,}/, ""));

    const externalId = await this.getExternalId();

    return {
      ...(emailHash ? { em: emailHash } : {}),
      ...(firstNameHash ? { fn: firstNameHash } : {}),
      ...(lastNameHash ? { ln: lastNameHash } : {}),
      ...(cityHash ? { ct: cityHash } : {}),
      ...(stateCodeHash ? { st: stateCodeHash } : {}),
      ...(postalCodeHash ? { zp: postalCodeHash } : {}),
      ...(countryCodeHash ? { country: countryCodeHash } : {}),
      ...(externalId ? { external_id: externalId } : {}),
      ...(phoneNumberHash ? { ph: phoneNumberHash } : {}),
    };
  },

  async getFbc() {
    const fbc = await Promise.any([this.readCookie("_fbc"), this.readCookie("fueled_fbc")]).catch(() => undefined);
    if (fbc) {
      return fbc;
    }

    return undefined;
  },
  async getFbp() {
    const fbp = await Promise.any([this.readCookie("_fbp"), this.readCookie("fueled_fbp")]).catch(() => undefined);
    if (fbp) {
      return fbp;
    }

    return undefined;
  },

  getEventId: async (str) => {
    return await utils.getHash(str);
  },

  async readCookie(name) {
    try {
      const value = await browser.cookie.get(name);
      if (!value) return null;
      const decodedValue = decodeURIComponent(value);
      try {
        return JSON.parse(decodedValue);
      } catch {
        return decodedValue;
      }
    } catch {
      return null;
    }
  },
  formatPhone(p,c){
    const cd = [['US','USA','1',[10]],['CA','CAN','1',[10]],['MX','MEX','52',[10,11]],['DO','DOM','1',[10]],['PR','PRI','1',[10]],['JM','JAM','1',[10]],['TT','TTO','1',[10]],['BS','BHS','1',[10]],['BB','BRB','1',[10]],['CR','CRI','506',[8]],['PA','PAN','507',[8]],['GT','GTM','502',[8]],['BR','BRA','55',[10,11]],['AR','ARG','54',[8,9,10,11,12]],['CO','COL','57',[10]],['CL','CHL','56',[9]],['PE','PER','51',[9]],['VE','VEN','58',[10]],['EC','ECU','593',[9]],['BO','BOL','591',[8]],['PY','PRY','595',[9]],['UY','URY','598',[8]],['GB','GBR','44',[10]],['DE','DEU','49',[10,11]],['FR','FRA','33',[9]],['IT','ITA','39',[9,10]],['ES','ESP','34',[9]],['NL','NLD','31',[9,11]],['BE','BEL','32',[8,9]],['CH','CHE','41',[9]],['AT','AUT','43',[10,11,12,13,14]],['PT','PRT','351',[9]],['IE','IRL','353',[9]],['LU','LUX','352',[9]],['SE','SWE','46',[9]],['NO','NOR','47',[8]],['DK','DNK','45',[8]],['FI','FIN','358',[6,7,9,10]],['IS','ISL','354',[7]],['PL','POL','48',[9]],['UA','UKR','380',[9]],['RO','ROU','40',[9]],['CZ','CZE','420',[9]],['HU','HUN','36',[9]],['BG','BGR','359',[8,9]],['SK','SVK','421',[9]],['BY','BLR','375',[9]],['GR','GRC','30',[10]],['HR','HRV','385',[8,9]],['SI','SVN','386',[8]],['RS','SRB','381',[8,9]],['BA','BIH','387',[8,9]],['AL','ALB','355',[9]],['MK','MKD','389',[8]],['CY','CYP','357',[8]],['MT','MLT','356',[8]],['EE','EST','372',[7,8]],['LV','LVA','371',[8]],['LT','LTU','370',[8]],['CN','CHN','86',[11]],['IN','IND','91',[10]],['JP','JPN','81',[10]],['AU','AUS','61',[9]]];
    if(!p)return null;
    let n=String(p).replace(/\D/g,''),h=String(p).trim()[0]==='+';
    let d=c?cd.find(x=>x[0]===c.toUpperCase()||x[1]===c.toUpperCase()):cd[0];
    if(!d)d=cd[0];
    n=n.replace(/^0+/,'');
    if(d[1]==='RUS'&&n.length===11&&n[0]==='8')n=n.substring(1);
    if(!h&&d[3].includes(n.length))n=d[2]+n;
    let l=n.length-d[2].length;
    return n.startsWith(d[2])&&d[3].includes(l)?'+'+n:null;
  }
};

const initializedServices = new Set();
analytics.subscribe("checkout_completed", async (event) => {
  for (const service of Object.values(services)) {
    if (!initializedServices.has(service)) {
      await service.loadScript();
      await service.init(event);
      initializedServices.add(service);
      await service.handler(event);
    }
  }
});
