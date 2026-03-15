import { useState, useRef, useEffect } from 'react';
import type { Activity } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Configuration for different environments
const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;

// In development, use local Ollama; in production, use the cloud Ollama server
const API_ENDPOINT = isDevelopment 
  ? 'http://localhost:11434/api/generate'  // Local Ollama in development
  : import.meta.env.VITE_AI_API_ENDPOINT; // Cloud Ollama server in production

// Check if AI service is available in this environment
const AI_SERVICE_AVAILABLE = isDevelopment || (import.meta.env.VITE_AI_SERVICE_ENABLED === 'true');

// Function to check if input is in the structured format
const isStructuredInputFormat = (text: string): boolean => {
  // Basic check for structured format which should contain "item:", "calories:", and "type:"
  return text.toLowerCase().includes('item:') && 
         text.toLowerCase().includes('calories:') && 
         text.toLowerCase().includes('type:');
};

// Parse structured input in format: "item: [name], calories: [number], type: [consume/burn]"
const parseStructuredInput = (text: string): { 
  name: string; 
  calories: number; 
  type: 'consume' | 'burn'; 
  isActivityUpdate: boolean;
  error?: string;
} => {
  // Initialize with default values
  const result = {
    name: '',
    calories: 0,
    type: 'consume' as 'consume' | 'burn',
    isActivityUpdate: true
  };

  try {
    // Extract name
    const nameMatch = text.match(/item:\s*([^,]+)/i);
    if (nameMatch && nameMatch[1]) {
      result.name = nameMatch[1].trim();
    } else {
      return {
        ...result,
        isActivityUpdate: false,
        error: 'Please specify the item name using "item: [name]"'
      };
    }

    // Extract calories
    const caloriesMatch = text.match(/calories:\s*(\d+)/i);
    if (caloriesMatch && caloriesMatch[1]) {
      result.calories = parseInt(caloriesMatch[1].trim(), 10);
    } else {
      return {
        ...result,
        isActivityUpdate: false,
        error: 'Please specify the calories using "calories: [number]"'
      };
    }

    // Extract type
    const typeMatch = text.match(/type:\s*(\w+)/i);
    if (typeMatch && typeMatch[1]) {
      const type = typeMatch[1].trim().toLowerCase();
      if (type === 'consume' || type === 'burn') {
        result.type = type;
      } else {
        return {
          ...result,
          isActivityUpdate: false,
          error: 'Type must be either "consume" or "burn"'
        };
      }
    } else {
      return {
        ...result,
        isActivityUpdate: false,
        error: 'Please specify the type using "type: [consume/burn]"'
      };
    }

    return result;
  } catch (err) {
    console.error('Error parsing structured input:', err);
    return {
      ...result,
      isActivityUpdate: false,
      error: 'Invalid format. Please use: "item: [name], calories: [number], type: [consume/burn]"'
    };
  }
};

type Message = {
  id: string;
  text: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  activityData?: any;
};

interface ChatInputProps {
  onActivityAdd: (activity: Activity) => void;
  onActivityDelete: (activityId: string) => void;
  onActivityEdit: (activity: Activity) => void;
  currentStats: {
    netCalories: number;
    consumedCalories: number;
    burnedCalories: number;
    targetCalories: number;
  };
  activities: Activity[];
}

export default function ChatInput({ onActivityAdd, onActivityDelete, onActivityEdit, currentStats, activities }: ChatInputProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    text: AI_SERVICE_AVAILABLE 
      ? "👋 Hi! I'm your calorie tracking assistant. You can tell me what you ate or what exercise you did, and I'll help you log it. Try something like 'I ate a banana' or 'I went for a 30-minute run'.\n\nYou can also use structured format: \"item: [name], calories: [number], type: [consume/burn]\""
      : "👋 Hi! I'm your calorie tracking assistant. Please log your activities using the structured format: \"item: [name], calories: [number], type: [consume/burn]\"\n\nExamples:\nitem: banana, calories: 105, type: consume\nitem: 30-minute run, calories: 300, type: burn",
    type: 'assistant',
    timestamp: new Date()
  }]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.parentElement;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      type: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // First check if it's in structured format
      if (isStructuredInputFormat(message)) {
        // Use structured input parser directly for structured format
        const activityData = parseStructuredInput(message);
        await handleActivityData(activityData);
      } else if (!AI_SERVICE_AVAILABLE) {
        // If AI service is not available and input is not structured, guide the user
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: "Please use the structured format: \"item: [name], calories: [number], type: [consume/burn]\"",
          type: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setMessage('');
        setIsProcessing(false);
      } else {
        // Try AI processing if available
        try {
          // Prepare headers
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          
          // The prompt is the same in development and production
          const promptText = `Analyze this input and convert it into a JSON object with the following structure:

{
  "type": "activity_update" | "question" | "edit_request" | "out_of_scope",
  "activity": null | {
    "name": "activity or item name",
    "calories": number,
    "type": "burn" | "consume"
  },
  "question_type": null | "calorie_lookup" | "stats_query" | "hypothetical_scenario",
  "edit_type": null | "modify_last" | "delete_last",
  "user_question": "${message}",
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
}

Input: "${message}"`;

          // Use the selected model from context
          const requestBody = {
            prompt: promptText,
            stream: false,
          };

          const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(requestBody),
          });

          const data = await response.json();
          try {
            // Parse the AI response
            let activityData;
            // The response format is the same for all models
            activityData = JSON.parse(data.response);
            
            await handleActivityData(activityData);
          } catch (parseErr) {
            // If parsing fails, inform the user they can use structured format
            console.warn('Failed to parse AI response', parseErr);
            const errorMessage: Message = {
              id: Date.now().toString(),
              text: "Sorry, I couldn't understand that. You can try rephrasing, or use the structured format: \"item: [name], calories: [number], type: [consume/burn]\"",
              type: 'assistant',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
            setMessage('');
          }
        } catch (fetchErr) {
          // If AI service is unreachable, suggest using structured format
          console.warn('AI service unreachable', fetchErr);
          const errorMessage: Message = {
            id: Date.now().toString(),
            text: "Our AI service is temporarily unavailable. Please use the structured format: \"item: [name], calories: [number], type: [consume/burn]\"",
            type: 'assistant',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          setMessage('');
        }
      }
    } catch (err) {
      // Handle any unexpected errors
      console.error('Failed to process activity:', err);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Sorry, there was an error processing your request. Please try using the format: "item: [name], calories: [number], type: [consume/burn]"',
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to handle activity data and update UI
  const handleActivityData = async (activityData: any) => {
    if (activityData.error) {
      // If there's an error in the structured format, provide guidance
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: activityData.error,
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } else {
      // Format the JSON response for display
      const jsonResponse = JSON.stringify(activityData, null, 2).replace(/"/g, '\\"');
      
      // Handle different types of responses
      switch (activityData.type) {
        case 'activity_update':
          if (activityData.activity) {
            // Add activity to the log
            onActivityAdd(activityData.activity);
            
            const responseText = `Got it! Logged ${activityData.activity.type === 'consume' ? '' : 'a '}${activityData.activity.name} (${activityData.activity.calories} cal)\n\nResponse:\n\`\`\`json\n${jsonResponse}\n\`\`\``;
            const assistantMessage: Message = {
              id: Date.now().toString(),
              text: responseText,
              type: 'assistant',
              timestamp: new Date(),
              activityData
            };
            setMessages(prev => [...prev, assistantMessage]);
          }
          break;

        case 'edit_request':
          if (activityData.edit_type === 'delete_last') {
            // Get the last activity from the database
            const lastActivity = activities[0]; // Activities are sorted by timestamp in descending order
            
            if (lastActivity?.id) {
              try {
                // Delete the last activity and wait for completion
                await onActivityDelete(lastActivity.id);
                const responseText = `Removed your last activity from the log.\n\nResponse:\n\`\`\`json\n${jsonResponse}\n\`\`\``;
                const assistantMessage: Message = {
                  id: Date.now().toString(),
                  text: responseText,
                  type: 'assistant',
                  timestamp: new Date(),
                  activityData
                };
                setMessages(prev => [...prev, assistantMessage]);
              } catch (err) {
                console.error('Failed to delete activity:', err);
                const errorMessage: Message = {
                  id: Date.now().toString(),
                  text: "Sorry, I couldn't delete the activity. Please try again.",
                  type: 'assistant',
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, errorMessage]);
              }
            }
          } else if (activityData.edit_type === 'modify_last' && activityData.activity) {
            // Get the last activity from the database
            const lastActivity = activities[0]; // Activities are sorted by timestamp in descending order
            
            if (lastActivity?.id) {
              // Update the last activity
              const updatedActivity = {
                ...activityData.activity,
                id: lastActivity.id,
                timestamp: lastActivity.timestamp
              };
              onActivityEdit(updatedActivity);
              const responseText = `Updated your last activity to ${activityData.activity.name} (${activityData.activity.calories} cal)\n\nResponse:\n\`\`\`json\n${jsonResponse}\n\`\`\``;
              const assistantMessage: Message = {
                id: Date.now().toString(),
                text: responseText,
                type: 'assistant',
                timestamp: new Date(),
                activityData
              };
              setMessages(prev => [...prev, assistantMessage]);
            }
          }
          break;

        case 'question':
          // Display the answer for questions
          const assistantMessage: Message = {
            id: Date.now().toString(),
            text: `${activityData.answer}\n\nResponse:\n\`\`\`json\n${jsonResponse}\n\`\`\``,
            type: 'assistant',
            timestamp: new Date(),
            activityData
          };
          setMessages(prev => [...prev, assistantMessage]);
          break;

        case 'out_of_scope':
          // Display the polite fallback message
          const outOfScopeMessage: Message = {
            id: Date.now().toString(),
            text: `${activityData.answer}\n\nResponse:\n\`\`\`json\n${jsonResponse}\n\`\`\``,
            type: 'assistant',
            timestamp: new Date(),
            activityData
          };
          setMessages(prev => [...prev, outOfScopeMessage]);
          break;

        default:
          // Handle unknown response types
          const unknownMessage: Message = {
            id: Date.now().toString(),
            text: `I'm not sure how to handle that. Could you try rephrasing or use the structured format?\n\nResponse:\n\`\`\`json\n${jsonResponse}\n\`\`\``,
            type: 'assistant',
            timestamp: new Date(),
            activityData
          };
          setMessages(prev => [...prev, unknownMessage]);
      }
    }
    setMessage('');
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`chat-message ${msg.type === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              <p>{msg.text}</p>
              <span className="message-time">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {!AI_SERVICE_AVAILABLE && !isDevelopment && (
        <div className="structured-input-badge">
          <span>Structured Input Mode</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={AI_SERVICE_AVAILABLE 
            ? "Describe your activity or use structured format" 
            : "Use format: item: [name], calories: [number], type: [consume/burn]"}
          className="chat-input"
          disabled={isProcessing}
        />
        <button 
          type="submit" 
          className="chat-submit"
          disabled={isProcessing || !message.trim()}
        >
          {isProcessing ? (
            <div className="thinking-icon" />
          ) : (
            <div className="send-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="20"
                height="20"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </div>
          )}
        </button>
      </form>
    </div>
  );
} 