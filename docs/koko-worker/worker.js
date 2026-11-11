/**
 * SNH Koko checkout — Cloudflare Worker (koko-fee-snh)
 * Creates a Shopify draft order containing the cart plus one KOKO-FEE variant
 * whose price is overridden to exactly 4% of the merchandise subtotal.
 *
 * 11 Nov 2026 fixes (see docs/koko-worker/README.md):
 *  1. Prices: each line uses the Sri Lanka market price (contextualPricing, country LK) — the price the website
 *     shows — instead of the store's base price. (SNH40710: creatine charged 8,999 instead of 8,499.)
 *  2. Bundle offers / sales: automatic discounts now apply on the Koko draft (acceptAutomaticDiscounts: true), the
 *     same as the website checkout. They used to be switched off, so bundle prices were lost on Koko.
 *  3. The 4% fee is worked out on the subtotal AFTER those discounts (draftOrderCalculate), not before.
 *  4. Discount codes can be entered on the Koko checkout page too.
 * Shipping on the draft checkout uses the store's shipping rates (Settings → Shipping and delivery).
 */

const ENABLED = true;
const SHOP = 'sports-nutrition-hub.myshopify.com';
const STOREFRONT_ORIGINS = [
  'https://sportsnutritionhub.lk',
  'https://www.sportsnutritionhub.lk',
  'https://sports-nutrition-hub.myshopify.com'
];
const API_VERSION = '2026-07';
const CURRENCY = 'LKR';
const MARKET_COUNTRY = 'LK';
const FEE_SKU = 'KOKO-FEE';
const FEE_RATE_BPS = 400n;
const MAX_LINES = 50;
const MAX_QTY_PER_LINE = 100;
const MAX_BODY_BYTES = 50_000;
const CACHE_SECONDS = 900;

let tokenCache = { value: null, expiresAt: 0 };
const inFlight = new Map();

function allowedOrigin(request) {
  const origin = request.headers.get('Origin');
  return origin && STOREFRONT_ORIGINS.includes(origin) ? origin : null;
}

function corsHeaders(request) {
  const origin = allowedOrigin(request);

  return origin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin'
      }
    : {};
}

function json(body, status, request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request)
    }
  });
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  );

  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a, b) {
  if (
    typeof a !== 'string' ||
    typeof b !== 'string' ||
    a.length !== b.length
  ) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return difference === 0;
}

async function verifyProxySignature(request, secret) {
  const url = new URL(request.url);
  const supplied = url.searchParams.get('signature');

  if (!supplied) return false;

  const grouped = new Map();

  for (const [key, value] of url.searchParams.entries()) {
    if (key === 'signature') continue;

    const values = grouped.get(key) || [];
    values.push(value);
    grouped.set(key, values);
  }

  const message = [...grouped.keys()]
    .sort()
    .map((key) => `${key}=${grouped.get(key).join(',')}`)
    .join('');

  const expected = await hmacHex(secret, message);

  if (!timingSafeEqual(expected, supplied.toLowerCase())) return false;
  if (url.searchParams.get('shop') !== SHOP) return false;

  const timestamp = Number(url.searchParams.get('timestamp'));

  if (!Number.isFinite(timestamp)) return false;

  return Math.abs(Math.floor(Date.now() / 1000) - timestamp) <= 300;
}

async function getToken(env) {
  const now = Date.now();

  if (tokenCache.value && now < tokenCache.expiresAt) {
    return tokenCache.value;
  }

  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.SHOPIFY_CLIENT_ID,
    client_secret: env.SHOPIFY_CLIENT_SECRET
  });

  const response = await fetch(
    `https://${SHOP}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: form.toString()
    }
  );

  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body.access_token) {
    console.error('token_exchange_failed', response.status);
    throw new Error('token_exchange_failed');
  }

  const lifetimeSeconds = Math.max(
    60,
    (Number(body.expires_in) || 86399) - 300
  );

  tokenCache = {
    value: body.access_token,
    expiresAt: now + lifetimeSeconds * 1000
  };

  return tokenCache.value;
}

async function shopify(query, variables, env, retry = true) {
  const token = await getToken(env);

  const response = await fetch(
    `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      },
      body: JSON.stringify({
        query,
        variables
      })
    }
  );

  if (response.status === 401 && retry) {
    tokenCache = {
      value: null,
      expiresAt: 0
    };

    return shopify(query, variables, env, false);
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.errors) {
    console.error(
      'shopify_graphql_error',
      response.status,
      JSON.stringify(body.errors || {})
    );

    throw new Error('shopify_graphql_error');
  }

  return body.data;
}

// 11 Nov: also asks for the Sri Lanka market price of each variant (what the website charges)
const CART_AND_FEE_QUERY = `
  query CartAndFee($ids: [ID!]!, $feeSearch: String!) {
    shop {
      currencyCode
    }

    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        sku
        price

        contextualPricing(context: { country: ${MARKET_COUNTRY} }) {
          price {
            amount
            currencyCode
          }
        }

        product {
          status
        }
      }
    }

    productVariants(first: 10, query: $feeSearch) {
      nodes {
        id
        sku

        product {
          status
        }
      }
    }
  }
`;

// 11 Nov: works out the subtotal after automatic discounts (bundle offers, sales) before the fee is added
const CALCULATE_DRAFT = `
  mutation CalculateKokoDraft($input: DraftOrderInput!) {
    draftOrderCalculate(input: $input) {
      calculatedDraftOrder {
        subtotalPriceSet {
          shopMoney {
            amount
          }
        }
      }

      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_DRAFT = `
  mutation CreateKokoDraft($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        invoiceUrl
      }

      userErrors {
        field
        message
      }
    }
  }
`;

function moneyToCents(value) {
  const match = String(value)
    .trim()
    .match(/^(\d+)(?:\.(\d+))?$/);

  if (!match) {
    throw new Error('bad_price');
  }

  const fraction = (match[2] || '').padEnd(3, '0');

  let cents =
    BigInt(match[1]) * 100n +
    BigInt(fraction.slice(0, 2));

  if (fraction[2] >= '5') {
    cents += 1n;
  }

  return cents;
}

function centsToMoney(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

function calculateFee(baseCents) {
  const numerator = baseCents * FEE_RATE_BPS;
  const quotient = numerator / 10000n;
  const remainder = numerator % 10000n;

  return remainder * 2n >= 10000n
    ? quotient + 1n
    : quotient;
}

function normalizeProperties(properties) {
  if (
    !properties ||
    typeof properties !== 'object' ||
    Array.isArray(properties)
  ) {
    return [];
  }

  return Object.entries(properties)
    .filter(
      ([key, value]) =>
        key &&
        value !== null &&
        value !== ''
    )
    .slice(0, 20)
    .map(([key, value]) => ({
      key: String(key).slice(0, 100),
      value: String(value).slice(0, 500)
    }));
}

function cleanItems(payload) {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : [];

  if (!items.length || items.length > MAX_LINES) {
    throw new Error('bad_cart');
  }

  return items.map((item) => {
    const numericId = String(item?.id ?? '').trim();
    const quantity = Number(item?.quantity);

    if (!/^\d{1,32}$/.test(numericId)) {
      throw new Error('bad_line');
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QTY_PER_LINE
    ) {
      throw new Error('bad_line');
    }

    if (
      item?.selling_plan ||
      item?.selling_plan_allocation
    ) {
      throw new Error('subscriptions_not_supported');
    }

    return {
      gid: `gid://shopify/ProductVariant/${numericId}`,
      quantity,
      customAttributes: normalizeProperties(item.properties)
    };
  });
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function cacheKeyFor(payload, items, request) {
  const cartToken = String(
    payload?.cartToken ||
    payload?.token ||
    ''
  ).trim();

  if (!cartToken) {
    return null;
  }

  const digest = await sha256Hex(
    JSON.stringify({
      v: 2, // 11 Nov: new pricing rules — don't reuse drafts cached by the old version
      cartToken,
      items
    })
  );

  const cacheUrl = new URL(request.url);

  cacheUrl.pathname = `/__koko_draft_cache/${digest}`;
  cacheUrl.search = '';

  return new Request(cacheUrl.toString(), {
    method: 'GET'
  });
}

async function readCached(cacheKey) {
  if (!cacheKey) return null;

  const response = await caches.default.match(cacheKey);

  return response
    ? response.json()
    : null;
}

async function writeCached(cacheKey, result) {
  if (!cacheKey) return;

  await caches.default.put(
    cacheKey,
    new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${CACHE_SECONDS}`
      }
    })
  );
}

// the price the website charges in Sri Lanka; the base price only if Shopify gives no market price
function unitPriceOf(variant) {
  const market = variant.contextualPricing?.price;

  if (market?.amount && (!market.currencyCode || market.currencyCode === CURRENCY)) {
    return market.amount;
  }

  return variant.price;
}

async function buildCheckout(items, env) {
  const catalogue = await shopify(
    CART_AND_FEE_QUERY,
    {
      ids: items.map((item) => item.gid),
      feeSearch: `sku:${FEE_SKU}`
    },
    env
  );

  if (catalogue.shop?.currencyCode !== CURRENCY) {
    throw new Error('currency_mismatch');
  }

  const variantsById = new Map(
    (catalogue.nodes || [])
      .filter(Boolean)
      .map((variant) => [
        variant.id,
        variant
      ])
  );

  let listCents = 0n;

  const lineItems = items.map((item) => {
    const variant = variantsById.get(item.gid);

    if (
      !variant ||
      variant.product?.status !== 'ACTIVE'
    ) {
      throw new Error('variant_not_found');
    }

    if (
      String(variant.sku || '').toUpperCase() === FEE_SKU
    ) {
      throw new Error('fee_in_source_cart');
    }

    const unit = unitPriceOf(variant);
    const unitCents = moneyToCents(unit);

    listCents += unitCents * BigInt(item.quantity);

    return {
      variantId: item.gid,
      quantity: item.quantity,

      // only when the market price differs from the base price, so Shopify charges what the website showed
      ...(unitCents !== moneyToCents(variant.price)
        ? {
            priceOverride: {
              amount: centsToMoney(unitCents),
              currencyCode: CURRENCY
            }
          }
        : {}),

      ...(item.customAttributes.length
        ? {
            customAttributes:
              item.customAttributes
          }
        : {})
    };
  });

  const feeMatches = (
    catalogue.productVariants?.nodes || []
  ).filter(
    (variant) =>
      String(variant.sku || '').toUpperCase() === FEE_SKU &&
      variant.product?.status === 'ACTIVE'
  );

  if (feeMatches.length !== 1) {
    console.error(
      'fee_variant_match_count',
      feeMatches.length
    );

    throw new Error(
      feeMatches.length
        ? 'duplicate_fee_variant'
        : 'fee_variant_not_found'
    );
  }

  // subtotal after bundle offers / sales (automatic discounts); falls back to the list total if Shopify can't say
  let merchandiseCents = listCents;

  try {
    const calc = await shopify(
      CALCULATE_DRAFT,
      {
        input: {
          lineItems,
          presentmentCurrencyCode: CURRENCY,
          acceptAutomaticDiscounts: true
        }
      },
      env
    );

    const amount =
      calc.draftOrderCalculate?.calculatedDraftOrder?.subtotalPriceSet?.shopMoney?.amount;

    if (amount && !calc.draftOrderCalculate.userErrors?.length) {
      merchandiseCents = moneyToCents(amount);
    } else {
      console.error('calculate_user_errors', JSON.stringify(calc.draftOrderCalculate?.userErrors || []));
    }
  } catch (error) {
    console.error('calculate_failed', error.message);
  }

  const feeCents = calculateFee(merchandiseCents);

  if (feeCents < 1n) {
    throw new Error('cart_too_small');
  }

  const merchandiseAmount =
    centsToMoney(merchandiseCents);

  const feeAmount =
    centsToMoney(feeCents);

  lineItems.push({
    variantId: feeMatches[0].id,
    quantity: 1,

    priceOverride: {
      amount: feeAmount,
      currencyCode: CURRENCY
    },

    customAttributes: [
      {
        key: '_koko_fee_rate',
        value: '4%'
      },
      {
        key: '_koko_fee_base',
        value: merchandiseAmount
      }
    ]
  });

  const created = await shopify(
    CREATE_DRAFT,
    {
      input: {
        lineItems,
        presentmentCurrencyCode: CURRENCY,

        // 11 Nov: bundle offers and sales apply on Koko too, and codes can be entered at checkout
        acceptAutomaticDiscounts: true,
        allowDiscountCodesInCheckout: true,

        tags: [
          'koko-route',
          'koko-fee-4pct'
        ],

        note:
          'Koko route — 4% of merchandise subtotal (after automatic discounts) applied automatically.',

        customAttributes: [
          {
            key: '_payment_route',
            value: 'koko'
          },
          {
            key: '_koko_fee_rate',
            value: '4%'
          },
          {
            key: '_koko_fee_base',
            value: merchandiseAmount
          }
        ]
      }
    },
    env
  );

  const payload = created.draftOrderCreate;

  if (payload.userErrors?.length) {
    console.error(
      'draft_user_errors',
      JSON.stringify(payload.userErrors)
    );

    throw new Error('draft_failed');
  }

  if (!payload.draftOrder?.invoiceUrl) {
    throw new Error('invoice_url_missing');
  }

  return {
    url: payload.draftOrder.invoiceUrl,
    fee: feeAmount,
    feeBase: merchandiseAmount,
    currency: CURRENCY
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      if (!allowedOrigin(request)) {
        return new Response(null, {
          status: 403
        });
      }

      return new Response(null, {
        status: 204,
        headers: corsHeaders(request)
      });
    }

    if (request.method !== 'POST') {
      return json(
        { error: 'method_not_allowed' },
        405,
        request
      );
    }

    if (!ENABLED) {
      return json(
        { error: 'disabled' },
        503,
        request
      );
    }

    if (
      !env.SHOPIFY_CLIENT_ID ||
      !env.SHOPIFY_CLIENT_SECRET
    ) {
      return json(
        { error: 'server_misconfigured' },
        500,
        request
      );
    }

    const url = new URL(request.url);

    const hasProxySignature =
      url.searchParams.has('signature');

    const requireProxy =
      String(
        env.REQUIRE_PROXY_SIGNATURE || ''
      ).toLowerCase() === 'true';

    if (hasProxySignature) {
      const validSignature =
        await verifyProxySignature(
          request,
          env.SHOPIFY_CLIENT_SECRET
        );

      if (!validSignature) {
        return json(
          { error: 'bad_signature' },
          401,
          request
        );
      }
    } else if (requireProxy) {
      return json(
        { error: 'proxy_required' },
        401,
        request
      );
    } else if (!allowedOrigin(request)) {
      return json(
        { error: 'origin_not_allowed' },
        403,
        request
      );
    }

    const rawBody = await request.text();

    if (
      !rawBody ||
      rawBody.length > MAX_BODY_BYTES
    ) {
      return json(
        { error: 'bad_body' },
        400,
        request
      );
    }

    let payload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json(
        { error: 'bad_json' },
        400,
        request
      );
    }

    let items;

    try {
      items = cleanItems(payload);
    } catch (error) {
      return json(
        { error: error.message },
        400,
        request
      );
    }

    const cacheKey = await cacheKeyFor(
      payload,
      items,
      request
    );

    const cached = await readCached(cacheKey);

    if (cached) {
      return json(
        {
          ...cached,
          cached: true
        },
        200,
        request
      );
    }

    const inFlightKey =
      cacheKey?.url || null;

    try {
      let operation = inFlightKey
        ? inFlight.get(inFlightKey)
        : null;

      if (!operation) {
        operation = buildCheckout(
          items,
          env
        );

        if (inFlightKey) {
          inFlight.set(
            inFlightKey,
            operation
          );
        }
      }

      const result = await operation;

      if (cacheKey) {
        ctx.waitUntil(
          writeCached(
            cacheKey,
            result
          )
        );
      }

      return json(
        result,
        200,
        request
      );
    } catch (error) {
      console.error(
        'koko_checkout_error',
        error.message
      );

      const safeErrors = new Set([
        'token_exchange_failed',
        'shopify_graphql_error',
        'variant_not_found',
        'fee_in_source_cart',
        'fee_variant_not_found',
        'duplicate_fee_variant',
        'currency_mismatch',
        'cart_too_small',
        'draft_failed',
        'invoice_url_missing'
      ]);

      const code = safeErrors.has(error.message)
        ? error.message
        : 'server_error';

      return json(
        { error: code },
        500,
        request
      );
    } finally {
      if (inFlightKey) {
        inFlight.delete(inFlightKey);
      }
    }
  }
};
