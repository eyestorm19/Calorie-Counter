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

/** Get activity timestamp in ms (supports Firestore Timestamp). */
function getActivityTimeMs(a: Activity): number {
  const t = (a as any).timestamp;
  if (!t) return 0;
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  if (typeof t.toDate === 'function') return t.toDate().getTime();
  return 0;
}

/** Deterministic answers for log-based questions. Returns NL text only. */
function answerLogQuestion(
  questionType: string,
  slots: { item_name?: string | null; period?: string | null },
  activities: Activity[],
  currentStats: { consumedCalories: number; burnedCalories: number; netCalories: number; targetCalories?: number }
): { text: string } {
  // goal_check: compare consumed to target (no activity filter needed)
  if (questionType === 'goal_check') {
    const consumed = currentStats.consumedCalories;
    const goal = currentStats.targetCalories ?? 0;
    if (goal <= 0) {
      return { text: "You don't have a calorie goal set. Set one in Profile to see how you're doing." };
    }
    const diff = consumed - goal;
    if (diff > 0) return { text: `You've consumed ${consumed} cal. Your goal is ${goal} cal. You're over by ${diff} cal.` };
    if (diff < 0) return { text: `You've consumed ${consumed} cal. Your goal is ${goal} cal. You're under by ${-diff} cal.` };
    return { text: `You've consumed ${consumed} cal. You're right at your goal of ${goal} cal!` };
  }

  const period = slots.period === 'week' ? 'week' : 'today';
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();
  const endOfTodayMs = startOfTodayMs + 24 * 60 * 60 * 1000 - 1;
  const weekAgoMs = startOfTodayMs - 7 * 24 * 60 * 60 * 1000;

  const inPeriod = (ms: number) =>
    period === 'today'
      ? ms >= startOfTodayMs && ms <= endOfTodayMs
      : ms >= weekAgoMs;

  const filtered = activities.filter((a) => inPeriod(getActivityTimeMs(a)));

  if (questionType === 'stats_query') {
    const consumed = filtered
      .filter((a) => a.type === 'consume')
      .reduce((s, a) => s + a.calories, 0);
    const burned = filtered
      .filter((a) => a.type === 'burn')
      .reduce((s, a) => s + a.calories, 0);
    const net = consumed - burned;
    const periodLabel = period === 'today' ? 'today' : 'in the last 7 days';
    return {
      text: `You consumed ${consumed} cal and burned ${burned} cal ${periodLabel}. Net: ${net} cal.`
    };
  }

  if (questionType === 'log_count') {
    const itemName = (slots.item_name ?? '').trim().toLowerCase();
    if (!itemName) {
      return { text: "I'm not sure which item you mean. Try asking e.g. 'How many bananas did I eat?'" };
    }
    const matching = filtered.filter((a) =>
      (a.name ?? '').toLowerCase().includes(itemName)
    );
    const count = matching.length;
    const totalCal = matching.reduce((s, a) => s + a.calories, 0);
    const periodLabel = period === 'today' ? 'today' : 'in the last 7 days';
    if (count === 0) {
      return { text: `You didn't log "${slots.item_name}" ${periodLabel}.` };
    }
    const calPart = totalCal > 0 ? ` (${totalCal} cal total)` : '';
    return {
      text: `You logged ${slots.item_name} ${count} time(s) ${periodLabel}${calPart}.`
    };
  }

  if (questionType === 'log_list') {
    const periodLabel = period === 'today' ? 'Today' : 'In the last 7 days';
    if (filtered.length === 0) {
      return { text: `${periodLabel} you didn't log any activities.` };
    }
    const parts = filtered
      .slice(0, 20)
      .map((a) => `${a.name} (${a.calories} cal${a.type === 'burn' ? ' burned' : ''})`);
    const more = filtered.length > 20 ? ` … and ${filtered.length - 20} more` : '';
    return { text: `${periodLabel} you logged: ${parts.join(', ')}${more}.` };
  }

  return { text: "I couldn't answer that from your log." };
}

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

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ChatInput({ onActivityAdd, onActivityDelete, onActivityEdit, currentStats, activities }: ChatInputProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    text: AI_SERVICE_AVAILABLE
      ? "👋 Try something like 'I ate a banana' or '30 minute run'."
      : "👋 Use: item: [name], calories: [number], type: [consume/burn].",
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

  const EXAMPLE_PROMPTS = [
    'I ate a banana',
    '30 minute run',
    'Chicken salad for lunch'
  ];

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        setAttachedImage({ data: match[2], mimeType: file.type });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearAttachedImage = () => setAttachedImage(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    if (!message.trim() && !attachedImage) return;

    const displayText = message.trim() || (attachedImage ? '[Photo]' : '');
    const userMessage: Message = {
      id: Date.now().toString(),
      text: displayText,
      type: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // If image attached, always use AI (multimodal). Otherwise check structured format.
      if (attachedImage && AI_SERVICE_AVAILABLE) {
        try {
          const body: { prompt: string; stream: boolean; image?: { data: string; mimeType: string } } = {
            prompt: message.trim() || ' ',
            stream: false,
            image: { data: attachedImage.data, mimeType: attachedImage.mimeType }
          };
          const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
          });
          const data = await response.json();
          setAttachedImage(null);
          if (!response.ok || data.error) {
            const text = data.fallbackMessage || data.error || "Couldn't process the image. Try again or use text.";
            setMessages(prev => [...prev, { id: Date.now().toString(), text, type: 'assistant', timestamp: new Date() }]);
            setMessage('');
            return;
          }
          if (!data.response) {
            setMessages(prev => [...prev, { id: Date.now().toString(), text: "Sorry, I couldn't understand that image.", type: 'assistant', timestamp: new Date() }]);
            setMessage('');
            return;
          }
          const activityData = JSON.parse(data.response);
          await handleActivityData(activityData);
        } catch (err) {
          console.warn('Image request failed', err);
          setMessages(prev => [...prev, { id: Date.now().toString(), text: "Couldn't process the image. Try again.", type: 'assistant', timestamp: new Date() }]);
          setAttachedImage(null);
        }
        setMessage('');
        setIsProcessing(false);
        return;
      }

      if (!attachedImage && isStructuredInputFormat(message)) {
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
          setAttachedImage(null);

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

        case 'question': {
          const deterministicTypes = ['stats_query', 'log_count', 'log_list', 'goal_check'];
          const qt = activityData.question_type;
          const slots = {
            item_name: activityData.item_name ?? activityData.itemName ?? null,
            period: activityData.period ?? 'today'
          };
          const displayText =
            qt && deterministicTypes.includes(qt)
              ? answerLogQuestion(qt, slots, activities, currentStats).text
              : (activityData.answer ?? "Here's what I found.");
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: displayText,
            type: 'assistant',
            timestamp: new Date(),
            activityData
          }]);
          break;
        }

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

      {messages.length <= 1 && (
        <div className="chat-examples" aria-label="Example prompts">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="chat-example-chip"
              onClick={() => setMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {!AI_SERVICE_AVAILABLE && (
        <div className="structured-input-badge">
          <span>Structured Input Mode</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-form">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          onChange={handleImageAttach}
          className="chat-file-input"
          aria-label="Attach image"
        />
        <div className="chat-input-row">
          {AI_SERVICE_AVAILABLE && (
            <button
              type="button"
              className="chat-icon-button chat-icon-left"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="24"
                height="24"
              >
                <rect x="3" y="7" width="18" height="14" rx="2" />
                <circle cx="12" cy="14" r="4" />
                <path d="M9 7l1.5-3h3L15 7" />
              </svg>
            </button>
          )}

          <div className="chat-input-pill">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                AI_SERVICE_AVAILABLE
                  ? 'Describe what you ate or did...'
                  : 'item: [name], calories: [number], type: [consume/burn]'
              }
              className="chat-input"
              disabled={isProcessing}
            />
          </div>

          <button
            type="submit"
            className="chat-icon-button chat-icon-right"
            disabled={isProcessing || (!message.trim() && !attachedImage)}
            aria-label="Send message"
          >
            {isProcessing ? (
              <div className="thinking-icon" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="24"
                height="24"
              >
                <path d="M12 19V5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            )}
          </button>
        </div>
        {attachedImage && (
          <div className="chat-image-preview">
            <span>Image attached</span>
            <button type="button" className="chat-image-clear" onClick={clearAttachedImage} aria-label="Remove image">×</button>
          </div>
        )}
      </form>
    </div>
  );
} 