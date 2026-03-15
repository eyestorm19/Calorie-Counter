import fetch from 'node-fetch';

const API_KEY = 'hPxBDA0bexaxxsJDqQVcJIV02sRMV9YxSCC39N8wLGA=';
const PROXY_URL = 'https://ollama-proxy-860333214181.us-central1.run.app';

async function testHealth() {
  console.log('\n1. Testing health endpoint...');
  try {
    const response = await fetch(`${PROXY_URL}/health`);
    const data = await response.json();
    console.log('Health check response:', data);
    console.log('✓ Health check passed');
  } catch (error) {
    console.error('✗ Health check failed:', error);
  }
}

async function testCORS() {
  console.log('\n2. Testing CORS headers...');
  try {
    const response = await fetch(`${PROXY_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers')
    };
    console.log('CORS headers:', corsHeaders);
    console.log('✓ CORS test passed');
  } catch (error) {
    console.error('✗ CORS test failed:', error);
  }
}

async function testAuth() {
  console.log('\n3. Testing API key authentication...');
  try {
    // Test without API key
    const responseNoKey = await fetch(`${PROXY_URL}/ollama/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral:7b',
        messages: [{ role: 'user', content: 'test' }],
        stream: false
      })
    });
    console.log('Response without API key:', responseNoKey.status);
    
    // Test with API key
    const responseWithKey = await fetch(`${PROXY_URL}/ollama/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        model: 'mistral:7b',
        messages: [{ role: 'user', content: 'test' }],
        stream: false
      })
    });
    console.log('Response with API key:', responseWithKey.status);
    console.log('✓ Authentication test passed');
  } catch (error) {
    console.error('✗ Authentication test failed:', error);
  }
}

async function testChat() {
  console.log('\n4. Testing Ollama chat...');
  try {
    const response = await fetch(`${PROXY_URL}/ollama/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        model: 'mistral:7b',
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        stream: false
      })
    });
    const data = await response.json();
    console.log('Chat response:', data.message.content);
    console.log('✓ Chat test passed');
  } catch (error) {
    console.error('✗ Chat test failed:', error);
  }
}

async function testRateLimit() {
  console.log('\n5. Testing rate limiting...');
  try {
    const requests = Array(5).fill().map(() => 
      fetch(`${PROXY_URL}/ollama/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          model: 'mistral:7b',
          messages: [{ role: 'user', content: 'test' }],
          stream: false
        })
      })
    );
    
    const responses = await Promise.all(requests);
    const statusCodes = responses.map(r => r.status);
    console.log('Response status codes:', statusCodes);
    console.log('✓ Rate limit test passed');
  } catch (error) {
    console.error('✗ Rate limit test failed:', error);
  }
}

async function runTests() {
  console.log('Starting Ollama proxy tests...\n');
  await testHealth();
  await testCORS();
  await testAuth();
  await testChat();
  await testRateLimit();
  console.log('\nAll tests completed!');
}

runTests().catch(console.error); 