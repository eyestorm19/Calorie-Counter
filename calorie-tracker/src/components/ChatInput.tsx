import { useState, useRef, useEffect } from 'react';
import type { Activity } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Single backend for both dev and prod: Cloud Function (Gemini). Set VITE_AI_API_ENDPOINT in .env.
const API_ENDPOINT = import.meta.env.VITE_AI_API_ENDPOINT || '';
const AI_SERVICE_AVAILABLE = Boolean(API_ENDPOINT);

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
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  const toggleDetails = (messageId: string) => {
    setExpandedDetails(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

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
          // Backend builds the full prompt; send only the user message.
          const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ prompt: message, stream: false }),
          });

          const data = await response.json();

          if (!response.ok || data.error) {
            const text = data.fallbackMessage || data.error || 'Our AI service is temporarily unavailable. Please use the structured format: item: [name], calories: [number], type: [consume/burn]';
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text,
              type: 'assistant',
              timestamp: new Date()
            }]);
            setMessage('');
            return;
          }

          if (!data.response) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: "Sorry, I couldn't understand that. You can try rephrasing, or use the structured format: \"item: [name], calories: [number], type: [consume/burn]\"",
              type: 'assistant',
              timestamp: new Date()
            }]);
            setMessage('');
            return;
          }

          try {
            const activityData = JSON.parse(data.response);
            await handleActivityData(activityData);
          } catch (parseErr) {
            console.warn('Failed to parse AI response', parseErr);
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: "Sorry, I couldn't understand that. You can try rephrasing, or use the structured format: \"item: [name], calories: [number], type: [consume/burn]\"",
              type: 'assistant',
              timestamp: new Date()
            }]);
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
      // Bubble shows only short text; full response is in expandable "Thinking" section via activityData
      switch (activityData.type) {
        case 'activity_update':
          if (activityData.activity) {
            onActivityAdd(activityData.activity);
            const shortText = activityData.answer ?? `Got it! Logged ${activityData.activity.type === 'consume' ? '' : 'a '}${activityData.activity.name} (${activityData.activity.calories} cal).`;
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: shortText,
              type: 'assistant',
              timestamp: new Date(),
              activityData
            }]);
          }
          break;

        case 'edit_request':
          if (activityData.edit_type === 'delete_last') {
            const lastActivity = activities[0];
            if (lastActivity?.id) {
              try {
                await onActivityDelete(lastActivity.id);
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  text: activityData.answer ?? 'Removed your last activity from the log.',
                  type: 'assistant',
                  timestamp: new Date(),
                  activityData
                }]);
              } catch (err) {
                console.error('Failed to delete activity:', err);
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  text: "Sorry, I couldn't delete the activity. Please try again.",
                  type: 'assistant',
                  timestamp: new Date()
                }]);
              }
            }
          } else if (activityData.edit_type === 'modify_last' && activityData.activity) {
            const lastActivity = activities[0];
            if (lastActivity?.id) {
              const updatedActivity = {
                ...activityData.activity,
                id: lastActivity.id,
                timestamp: lastActivity.timestamp
              };
              onActivityEdit(updatedActivity);
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: activityData.answer ?? `Updated your last activity to ${activityData.activity.name} (${activityData.activity.calories} cal).`,
                type: 'assistant',
                timestamp: new Date(),
                activityData
              }]);
            }
          }
          break;

        case 'question':
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: activityData.answer ?? "Here's what I found.",
            type: 'assistant',
            timestamp: new Date(),
            activityData
          }]);
          break;

        case 'out_of_scope':
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: activityData.answer ?? "I can only help with calorie tracking.",
            type: 'assistant',
            timestamp: new Date(),
            activityData
          }]);
          break;

        default:
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: activityData.answer ?? "I'm not sure how to handle that. Try rephrasing or use the structured format.",
            type: 'assistant',
            timestamp: new Date(),
            activityData
          }]);
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
              {msg.type === 'assistant' && msg.activityData && (
                <>
                  <button
                    type="button"
                    className="thinking-toggle"
                    onClick={() => toggleDetails(msg.id)}
                    aria-expanded={expandedDetails.has(msg.id)}
                  >
                    {expandedDetails.has(msg.id) ? 'Hide full response' : 'Thinking'}
                  </button>
                  {expandedDetails.has(msg.id) && (
                    <pre className="thinking-details">
                      {JSON.stringify(msg.activityData, null, 2)}
                    </pre>
                  )}
                </>
              )}
              <span className="message-time">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {!AI_SERVICE_AVAILABLE && (
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