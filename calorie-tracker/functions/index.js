const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({ 
  origin: true,
  credentials: true 
});

admin.initializeApp();

/**
 * OLLAMA SERVER CONFIGURATION
 * 
 * In production, this function will connect to an Ollama instance running on your web server.
 * Replace YOUR_SERVER_IP with the IP address or domain of your web server where Ollama is running.
 * Make sure port 11434 is properly configured in your firewall/security group to allow connections.
 * 
 * Examples:
 * 1. If Ollama is running on the same server as your web server:
 *    const OLLAMA_SERVER = 'https://ollama-service-6dj4johwzq-uc.a.run.app/api/generate';  // Cloud Run Ollama service
 * 
 * 2. If Ollama is running on a different server:
 *    const OLLAMA_SERVER = 'https://ollama-service-6dj4johwzq-uc.a.run.app/api/generate';  // Cloud Run Ollama service
 *    (Make sure the server has proper security settings!)
 * 
 * 3. If Ollama is running on a server with a domain name:
 *    const OLLAMA_SERVER = 'https://ollama-service-6dj4johwzq-uc.a.run.app/api/generate';  // Cloud Run Ollama service
 */

// Cloud Run Ollama service
const OLLAMA_SERVER = 'https://ollama-proxy-860333214181.us-central1.run.app/api/api/generate';

exports.generateActivity = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
  })
  .https.onRequest((request, response) => {
    // Set CORS headers manually to ensure they're set correctly
    response.set('Access-Control-Allow-Origin', 'https://apollo-7e76b.web.app');
    response.set('Access-Control-Allow-Credentials', 'true');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    cors(request, response, async () => {
      try {
        console.log('=== START OF REQUEST ===');
        console.log('Received request body:', JSON.stringify(request.body, null, 2));
        console.log('Request headers:', JSON.stringify(request.headers, null, 2));

        if (!request.body.prompt) {
          console.log('\n=== MISSING PROMPT ===');
          response.status(400).json({
            error: "Missing prompt in request body."
          });
          return;
        }
        
        // Log the Ollama request
        console.log('=== OLLAMA REQUEST ===');
        console.log('Request URL:', OLLAMA_SERVER);
        console.log('Request body:', JSON.stringify({
          model: 'mistral:7b',
          prompt: `You are a calorie tracking assistant. Analyze this input and convert it into a JSON object with the following structure:

{
  "type": "activity_update" | "question" | "edit_request" | "out_of_scope",
  "activity": null | {
    "name": "activity or item name",
    "calories": number,
    "type": "burn" | "consume"
  },
  "question_type": null | "calorie_lookup" | "stats_query" | "hypothetical_scenario",
  "edit_type": null | "modify_last" | "delete_last",
  "user_question": "${request.body.prompt}",
  "answer": "short, friendly explanation"
}

Rules:
1. For food items, activity.type = "consume"
2. For exercises, activity.type = "burn"
3. If calories aren't specified, estimate typical values
4. activity.name should be short and descriptive (e.g., "banana", "yoga", "5K run"). Remove action words like "ate", "ran", "had", etc.
5. Set type = "activity_update" only if the user is logging something they just did
6. If the user is asking a question (about food, exercise, stats, or hypotheticals), set type = "question" and fill question_type
7. Use question_type = "calorie_lookup" for food-related questions (e.g., "how many calories in..."), "stats_query" for current progress questions, and "hypothetical_scenario" for future/what-if questions
8. If the user wants to change or delete their last activity, set type = "edit_request" and use edit_type ("modify_last" or "delete_last"). You may include a corrected activity if needed.
9. If the message is unrelated to food, exercise, or calorie tracking, return type = "out_of_scope"
10. Always return all fields in the JSON. Use null if a field is not relevant.
11. Return only the JSON object — no other text.

Examples:
Input: "I ate a banana"
Output:
{
  "type": "activity_update",
  "activity": { "name": "banana", "calories": 105, "type": "consume" },
  "question_type": null,
  "edit_type": null,
  "user_question": "I ate a banana",
  "answer": "Logged 105 calories for a banana."
}

Input: "What if I eat a pizza later?"
Output:
{
  "type": "question",
  "activity": null,
  "question_type": "hypothetical_scenario",
  "edit_type": null,
  "user_question": "What if I eat a pizza later?",
  "answer": "A slice of pizza adds around 285–350 calories depending on size and toppings."
}

Input: "Change that last workout to 300 calories"
Output:
{
  "type": "edit_request",
  "activity": { "name": "previous workout", "calories": 300, "type": "burn" },
  "question_type": null,
  "edit_type": "modify_last",
  "user_question": "Change that last workout to 300 calories",
  "answer": "Updated your last workout to 300 calories burned."
}

Input: "What's the capital of France?"
Output:
{
  "type": "out_of_scope",
  "activity": null,
  "question_type": null,
  "edit_type": null,
  "user_question": "What's the capital of France?",
  "answer": "Sorry, I can only help with calorie tracking, food intake, and workouts."
}`,
          stream: false
        }, null, 2));
        console.log('=====================');

        // Make request to Ollama
        const ollamaResponse = await axios.post(OLLAMA_SERVER, {
          model: 'mistral:7b',
          prompt: `You are a calorie tracking assistant. Analyze this input and convert it into a JSON object with the following structure:

{
  "type": "activity_update" | "question" | "edit_request" | "out_of_scope",
  "activity": null | {
    "name": "activity or item name",
    "calories": number,
    "type": "burn" | "consume"
  },
  "question_type": null | "calorie_lookup" | "stats_query" | "hypothetical_scenario",
  "edit_type": null | "modify_last" | "delete_last",
  "user_question": "${request.body.prompt}",
  "answer": "short, friendly explanation"
}

Rules:
1. For food items, activity.type = "consume"
2. For exercises, activity.type = "burn"
3. If calories aren't specified, estimate typical values
4. activity.name should be short and descriptive (e.g., "banana", "yoga", "5K run"). Remove action words like "ate", "ran", "had", etc.
5. Set type = "activity_update" only if the user is logging something they just did
6. If the user is asking a question (about food, exercise, stats, or hypotheticals), set type = "question" and fill question_type
7. Use question_type = "calorie_lookup" for food-related questions (e.g., "how many calories in..."), "stats_query" for current progress questions, and "hypothetical_scenario" for future/what-if questions
8. If the user wants to change or delete their last activity, set type = "edit_request" and use edit_type ("modify_last" or "delete_last"). You may include a corrected activity if needed.
9. If the message is unrelated to food, exercise, or calorie tracking, return type = "out_of_scope"
10. Always return all fields in the JSON. Use null if a field is not relevant.
11. Return only the JSON object — no other text.

Examples:
Input: "I ate a banana"
Output:
{
  "type": "activity_update",
  "activity": { "name": "banana", "calories": 105, "type": "consume" },
  "question_type": null,
  "edit_type": null,
  "user_question": "I ate a banana",
  "answer": "Logged 105 calories for a banana."
}

Input: "What if I eat a pizza later?"
Output:
{
  "type": "question",
  "activity": null,
  "question_type": "hypothetical_scenario",
  "edit_type": null,
  "user_question": "What if I eat a pizza later?",
  "answer": "A slice of pizza adds around 285–350 calories depending on size and toppings."
}

Input: "Change that last workout to 300 calories"
Output:
{
  "type": "edit_request",
  "activity": { "name": "previous workout", "calories": 300, "type": "burn" },
  "question_type": null,
  "edit_type": "modify_last",
  "user_question": "Change that last workout to 300 calories",
  "answer": "Updated your last workout to 300 calories burned."
}

Input: "What's the capital of France?"
Output:
{
  "type": "out_of_scope",
  "activity": null,
  "question_type": null,
  "edit_type": null,
  "user_question": "What's the capital of France?",
  "answer": "Sorry, I can only help with calorie tracking, food intake, and workouts."
}`,
          stream: false
        }, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'hPxBDA0bexaxxsJDqQVcJIV02sRMV9YxSCC39N8wLGA='
          },
          timeout: 300000 // 5 minutes timeout
        });

        // Log the raw Ollama response
        console.log('\n=== OLLAMA RESPONSE ===');
        console.log('Status:', ollamaResponse.status);
        console.log('Headers:', JSON.stringify(ollamaResponse.headers, null, 2));
        
        const responseData = ollamaResponse.data;
        console.log('Response body:', JSON.stringify(responseData, null, 2));
        console.log('=====================');

        // Extract the complete response text
        let fullResponse = '';
        if (Array.isArray(responseData)) {
          fullResponse = responseData.map(chunk => chunk.response).join('');
        } else if (typeof responseData === 'string') {
          fullResponse = responseData;
        } else if (responseData.response) {
          fullResponse = responseData.response;
        }

        console.log('\n=== PARSED RESPONSE ===');
        console.log('Full response text:', fullResponse);

        // Try to parse the response as JSON
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(fullResponse);
        } catch (error) {
          console.log('=== JSON PARSE ERROR ===');
          console.log('Could not parse response as JSON:', error.message);
          throw new Error('Invalid JSON response from Ollama');
        }

        // Validate the parsed response structure
        if (!parsedResponse.type || !['activity_update', 'question', 'edit_request', 'out_of_scope'].includes(parsedResponse.type)) {
          throw new Error('Invalid response type from Ollama');
        }

        // Process the response based on type
        let result = {
          success: true,
          updatedStats: { consumed: 0, burned: 0, net: 0 },
          message: parsedResponse.answer
        };

        switch (parsedResponse.type) {
          case 'activity_update':
            if (parsedResponse.activity) {
              if (parsedResponse.activity.type === 'consume') {
                result.updatedStats.consumed = parsedResponse.activity.calories;
              } else if (parsedResponse.activity.type === 'burn') {
                result.updatedStats.burned = parsedResponse.activity.calories;
              }
              result.updatedStats.net = result.updatedStats.consumed - result.updatedStats.burned;
            }
            break;

          case 'edit_request':
            if (parsedResponse.activity) {
              if (parsedResponse.edit_type === 'modify_last') {
                // Update the last activity's calories
                if (parsedResponse.activity.type === 'consume') {
                  result.updatedStats.consumed = parsedResponse.activity.calories;
                } else if (parsedResponse.activity.type === 'burn') {
                  result.updatedStats.burned = parsedResponse.activity.calories;
                }
                result.updatedStats.net = result.updatedStats.consumed - result.updatedStats.burned;
              } else if (parsedResponse.edit_type === 'delete_last') {
                // No calorie updates needed for deletion
                result.message = 'Last activity deleted successfully.';
              }
            }
            break;

          case 'question':
          case 'out_of_scope':
            // No calorie updates needed for questions or out-of-scope messages
            break;

          default:
            throw new Error('Unknown response type from Ollama');
        }

        console.log('\n=== FINAL RESPONSE ===');
        console.log('Sending response:', JSON.stringify(result, null, 2));

        response.json(result);
      } catch (ollamaError) {
        console.log('\n=== ERROR DETAILS ===');
        console.error('Error type:', ollamaError.name);
        console.error('Error code:', ollamaError.code);
        console.error('Error message:', ollamaError.message);
        console.error('Error stack:', ollamaError.stack);
        console.error('Error response:', JSON.stringify(ollamaError.response?.data, null, 2));
        
        // Handle specific error cases
        if (ollamaError.code === 'ECONNREFUSED' || ollamaError.code === 'ENOTFOUND') {
          console.log('\n=== CONNECTION ERROR ===');
          console.log('Connection error detected:', ollamaError.code);
          response.json({
            name: "formatted input required",
            calories: 0,
            type: "consume",
            isActivityUpdate: false,
            message: "Our AI service is temporarily unavailable. Please use the structured format: item: [name], calories: [number], type: [consume/burn]"
          });
        } else if (ollamaError.response?.data?.error?.includes('model not found')) {
          console.log('\n=== INVALID MODEL ERROR ===');
          response.status(400).json({
            error: "Invalid model specified. Please use 'mistral:7b' as the model."
          });
        } else {
          console.log('\n=== UNKNOWN ERROR ===');
          response.status(500).json({
            error: ollamaError.response?.data?.error || ollamaError.message || 'Error processing request'
          });
        }
      }
      console.log('\n=== END OF REQUEST ===\n');
    });
  }); 