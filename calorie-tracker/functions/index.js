const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ 
  origin: true,
  credentials: true 
});
const { getLLMResponse } = require('./lib/llm');

admin.initializeApp();

/** Build the calorie-assistant prompt (same schema for any LLM). */
function buildCaloriePrompt(userInput) {
  return `You are a calorie tracking assistant. Analyze this input and convert it into a JSON object with the following structure:

{
  "type": "activity_update" | "question" | "edit_request" | "out_of_scope",
  "activity": null | {
    "name": "activity or item name",
    "calories": number,
    "type": "burn" | "consume"
  },
  "question_type": null | "stats_query" | "log_count" | "log_list" | "goal_check" | "calorie_lookup" | "hypothetical_scenario",
  "edit_type": null | "modify_last" | "delete_last",
  "item_name": null | "string (single item name for log_count/log_list, e.g. banana, run)",
  "period": null | "today" | "week",
  "user_question": "${userInput.replace(/"/g, '\\"')}",
  "answer": "short, friendly explanation (use null for stats_query, log_count, log_list, goal_check; the app will compute the answer)"
}

Rules:
1. For food items, activity.type = "consume"
2. For exercises, activity.type = "burn"
3. If calories aren't specified, estimate typical values
4. activity.name should be short and descriptive (e.g., "banana", "yoga", "5K run"). Remove action words like "ate", "ran", "had", etc.
5. Set type = "activity_update" only if the user is logging something they just did
6. If the user is asking a question, set type = "question" and set question_type and slots (item_name, period) as follows:
   - stats_query: user asks about totals (calories consumed/burned, net). Set period to "today" or "week" from context; item_name null. Set answer to null.
   - log_count: user asks "how many X did I eat/log?". Set item_name to the item (e.g. "banana", "run"); set period to "today" or "week" if implied, else "today". Set answer to null.
   - log_list: user asks what they ate/logged (list). Set period to "today" or "week"; item_name null unless they ask about a specific item. Set answer to null.
   - goal_check: user asks whether they are over/under/at their calorie goal (e.g. "Will I be above my calorie goal?", "Am I over my goal?"). Set period to "today" or "week" if implied, else "today"; item_name null. Set answer to null.
   - calorie_lookup: general calorie info (e.g. "how many calories in an avocado?"). item_name and period null. Fill answer with the info.
   - hypothetical_scenario: what-if or future (e.g. "what if I eat pizza later?"). item_name and period null. Fill answer.
7. If the user wants to change or delete their last activity, set type = "edit_request" and use edit_type ("modify_last" or "delete_last"). You may include a corrected activity if needed.
8. If the message is unrelated to food, exercise, or calorie tracking, return type = "out_of_scope"
9. Always return all fields. Use null when not relevant.
10. Return only the JSON object — no other text.

Examples:
Input: "I ate a banana"
Output:
{"type": "activity_update", "activity": {"name": "banana", "calories": 105, "type": "consume"}, "question_type": null, "edit_type": null, "item_name": null, "period": null, "user_question": "I ate a banana", "answer": "Logged 105 calories for a banana."}

Input: "How many calories did I consume today?"
Output:
{"type": "question", "activity": null, "question_type": "stats_query", "edit_type": null, "item_name": null, "period": "today", "user_question": "How many calories did I consume today?", "answer": null}

Input: "How many bananas did I eat?"
Output:
{"type": "question", "activity": null, "question_type": "log_count", "edit_type": null, "item_name": "banana", "period": "today", "user_question": "How many bananas did I eat?", "answer": null}

Input: "What did I eat today?"
Output:
{"type": "question", "activity": null, "question_type": "log_list", "edit_type": null, "item_name": null, "period": "today", "user_question": "What did I eat today?", "answer": null}

Input: "Will I be above my calorie goal?" or "Am I over my goal?"
Output:
{"type": "question", "activity": null, "question_type": "goal_check", "edit_type": null, "item_name": null, "period": "today", "user_question": "Will I be above my calorie goal?", "answer": null}

Input: "How many calories in an avocado?"
Output:
{"type": "question", "activity": null, "question_type": "calorie_lookup", "edit_type": null, "item_name": null, "period": null, "user_question": "How many calories in an avocado?", "answer": "A medium avocado has about 240 calories."}

Input: "What if I eat a pizza later?"
Output:
{"type": "question", "activity": null, "question_type": "hypothetical_scenario", "edit_type": null, "item_name": null, "period": null, "user_question": "What if I eat a pizza later?", "answer": "A slice of pizza adds around 285–350 calories depending on size and toppings."}

Input: "Change that last workout to 300 calories"
Output:
{"type": "edit_request", "activity": {"name": "previous workout", "calories": 300, "type": "burn"}, "question_type": null, "edit_type": "modify_last", "item_name": null, "period": null, "user_question": "Change that last workout to 300 calories", "answer": "Updated your last workout to 300 calories burned."}

Input: "What's the capital of France?"
Output:
{"type": "out_of_scope", "activity": null, "question_type": null, "edit_type": null, "item_name": null, "period": null, "user_question": "What's the capital of France?", "answer": "Sorry, I can only help with calorie tracking, food intake, and workouts."}

Input: "${userInput.replace(/"/g, '\\"')}"`;
}

exports.generateActivity = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
  })
  .https.onRequest((request, response) => {
    const origin = request.headers.origin || '';
    const allowedOrigins = ['https://apollo-7e76b.web.app', 'http://localhost:5173', 'http://localhost:3000'];
    const allowOrigin = allowedOrigins.includes(origin) ? origin : 'https://apollo-7e76b.web.app';
    response.set('Access-Control-Allow-Origin', allowOrigin);
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
        
        // Call LLM via generic layer (provider from env: default Gemini)
        const prompt = buildCaloriePrompt(request.body.prompt);
        console.log('=== LLM REQUEST ===');
        const fullResponse = await getLLMResponse(prompt, { jsonMode: true });
        console.log('\n=== LLM RESPONSE ===');

        console.log('\n=== PARSED RESPONSE ===');
        console.log('Full response text:', fullResponse);

        // Try to parse the response as JSON
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(fullResponse);
        } catch (error) {
          console.log('=== JSON PARSE ERROR ===');
          console.log('Could not parse response as JSON:', error.message);
          throw new Error('Invalid JSON response from LLM');
        }

        // Validate the parsed response structure
        if (!parsedResponse.type || !['activity_update', 'question', 'edit_request', 'out_of_scope'].includes(parsedResponse.type)) {
          throw new Error('Invalid response type from LLM');
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
            throw new Error('Unknown response type from LLM');
        }

        // Include raw JSON string for frontend (ChatInput expects data.response)
        result.response = JSON.stringify(parsedResponse);

        console.log('\n=== FINAL RESPONSE ===');
        console.log('Sending response:', JSON.stringify(result, null, 2));

        response.json(result);
      } catch (llmError) {
        console.log('\n=== ERROR DETAILS ===');
        console.error('Error type:', llmError.name);
        console.error('Error message:', llmError.message);
        console.error('Error stack:', llmError.stack);

        const isMissingKey = llmError.message && llmError.message.includes('API key');
        if (isMissingKey) {
          response.status(500).json({
            error: 'LLM API key not configured. Set GEMINI_API_KEY or firebase functions:config:set gemini.key'
          });
        } else {
          response.status(500).json({
            error: llmError.message || 'Error processing request',
            fallbackMessage: 'Our AI service is temporarily unavailable. Please use the structured format: item: [name], calories: [number], type: [consume/burn]'
          });
        }
      }
      console.log('\n=== END OF REQUEST ===\n');
    });
  }); 