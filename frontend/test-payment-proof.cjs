const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function testPaymentProofUpload() {
  try {
    console.log('Testing payment proof upload...');

    // First, get admin token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/dev/login', {
      email: 'admin@zai.dev'
    });

    const token = loginResponse.data.token;
    console.log('Admin login successful');

    // Create a dummy image file (1x1 PNG)
    const dummyImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Create FormData
    const FormData = require('form-data');
    const form = new FormData();
    form.append('paymentProof', Buffer.from(dummyImage, 'base64'), {
      filename: 'test-payment.png',
      contentType: 'image/png'
    });

    // Submit subscription request
    const response = await axios.post('http://localhost:5000/api/subscription/request', form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    });

    console.log('Subscription request created:', response.data);
    console.log('Payment proof path:', response.data.subscription?.paymentProof);

    // Test accessing the payment proof
    const proofPath = response.data.subscription?.paymentProof;
    if (proofPath) {
      const imageUrl = `http://localhost:5000/api${proofPath}`;
      console.log('Image URL:', imageUrl);

      // Test if the image is accessible
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });
      console.log('Image accessible:', imageResponse.status === 200);
      console.log('Image size:', imageResponse.data.length);
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testPaymentProofUpload();
