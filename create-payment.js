// درخواست پرداخت از زرین‌پال. مبلغ ورودی به تومان است، زرین‌پال ریال می‌خواهد (ضربدر ۱۰).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { amount, description, phone } = JSON.parse(event.body || '{}');

    if (!amount || Number(amount) < 1000) {
      return { statusCode: 400, body: JSON.stringify({ error: 'مبلغ نامعتبر است' }) };
    }

    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    if (!merchantId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'ZARINPAL_MERCHANT_ID در تنظیمات Netlify ست نشده است' }) };
    }

    const isSandbox = process.env.ZARINPAL_SANDBOX === 'true';
    const requestUrl = isSandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
      : 'https://payment.zarinpal.com/pg/v4/payment/request.json';

    const siteUrl = process.env.URL || `https://${event.headers.host}`;
    // amount را در callback نگه می‌داریم تا در مرحله verify دوباره لازم داشته باشیم
    const callbackUrl = `${siteUrl}/?amount=${encodeURIComponent(amount)}`;

    const payload = {
      merchant_id: merchantId,
      amount: Math.round(Number(amount) * 10), // تومان -> ریال
      description: description || 'خرید از فروشگاه',
      callback_url: callbackUrl,
    };
    if (phone) payload.metadata = { mobile: phone };

    const zpRes = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await zpRes.json();

    if (data && data.data && data.data.code === 100) {
      const authority = data.data.authority;
      const gatewayBase = isSandbox
        ? 'https://sandbox.zarinpal.com/pg/StartPay/'
        : 'https://payment.zarinpal.com/pg/StartPay/';
      return { statusCode: 200, body: JSON.stringify({ url: gatewayBase + authority }) };
    }

    const message = (data && data.errors && data.errors.message) || 'درخواست پرداخت توسط زرین‌پال رد شد';
    return { statusCode: 400, body: JSON.stringify({ error: message }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
