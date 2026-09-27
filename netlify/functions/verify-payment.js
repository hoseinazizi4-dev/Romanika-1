// تایید پرداخت نزد زرین‌پال بعد از بازگشت کاربر از درگاه.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { authority, amount } = JSON.parse(event.body || '{}');

    if (!authority || !amount) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'پارامترهای ناقص' }) };
    }

    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    if (!merchantId) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: 'ZARINPAL_MERCHANT_ID در تنظیمات Netlify ست نشده است' }) };
    }

    const isSandbox = process.env.ZARINPAL_SANDBOX === 'true';
    const verifyUrl = isSandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
      : 'https://payment.zarinpal.com/pg/v4/payment/verify.json';

    const zpRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: Math.round(Number(amount) * 10), // تومان -> ریال، باید دقیقا با مبلغ درخواست یکسان باشد
        authority,
      }),
    });
    const data = await zpRes.json();

    // کد ۱۰۰: پرداخت موفق و تازه تایید شده / کد ۱۰۱: پرداخت قبلاً تایید شده بود
    if (data && data.data && (data.data.code === 100 || data.data.code === 101)) {
      return { statusCode: 200, body: JSON.stringify({ success: true, refId: data.data.ref_id }) };
    }

    const message = (data && data.errors && data.errors.message) || 'پرداخت تایید نشد';
    return { statusCode: 200, body: JSON.stringify({ success: false, error: message }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
