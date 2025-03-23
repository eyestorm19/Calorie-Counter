import { useState, useRef, useEffect } from 'react';
import type { Activity } from '../types';

interface Message {
  id: string;
  text: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  activityData?: Omit<Activity, 'id' | 'timestamp'>;
}

interface ChatInputProps {
  onActivityAdd: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
}

export default function ChatInput({ onActivityAdd }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    text: "👋 Hi! I'm your calorie tracking assistant. You can tell me what you ate or what exercise you did, and I'll help you log it. Try something like 'I ate a banana' or 'I went for a 30-minute run'.",
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
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral',
          prompt: `Analyze this input and convert it into a JSON object with the following structure:
{
  "name": "activity name",
  "calories": number,
  "type": "burn" or "consume",
  "isActivityUpdate": boolean
}

Rules:
1. For food items, type should be "consume"
2. For exercise/activities, type should be "burn"
3. If calories aren't specified, estimate them based on typical values
4. Keep the name concise but descriptive
5. Remove action words like "ate", "had", "did", "ran" - just keep the item or activity name
6. Set isActivityUpdate to true only if the input is describing an activity that just happened or is happening
7. Set isActivityUpdate to false if the input is a question or general statement
8. Return ONLY the JSON object, no other text

Examples:
Input: "I ate a banana" -> { "name": "banana", "calories": 105, "type": "consume", "isActivityUpdate": true }
Input: "I ran 5K" -> { "name": "5K run", "calories": 300, "type": "burn", "isActivityUpdate": true }
Input: "How many calories in a banana?" -> { "name": "banana", "calories": 105, "type": "consume", "isActivityUpdate": false }
Input: "What's the best exercise?" -> { "name": "exercise advice", "calories": 0, "type": "burn", "isActivityUpdate": false }

Input: "${message}"`,
          stream: false,
        }),
      });

      const data = await response.json();
      try {
        const activityData = JSON.parse(data.response);
        const assistantMessage: Message = {
          id: Date.now().toString(),
          text: activityData.isActivityUpdate 
            ? `Got it! Logged ${activityData.type === 'consume' ? '' : 'a '}${activityData.name} (${activityData.calories} cal)`
            : `This doesn't seem to be about logging an activity. Try phrases like "I ate..." or "I did..."`,
          type: 'assistant',
          timestamp: new Date(),
          activityData
        };
        setMessages(prev => [...prev, assistantMessage]);
        if (activityData.isActivityUpdate) {
          onActivityAdd(activityData);
        }
        setMessage('');
      } catch (err) {
        console.error('Failed to parse activity data:', err);
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: 'Sorry, I couldn\'t understand that activity. Please try again.',
          type: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      console.error('Failed to process activity:', err);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Sorry, there was an error processing your request. Please try again.',
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
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
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your activity (e.g., 'I ate a banana' or 'I ran for 30 minutes')"
          className="chat-input"
          disabled={isProcessing}
        />
        <button 
          type="submit" 
          className="chat-submit"
          disabled={isProcessing || !message.trim()}
        >
          {isProcessing ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );
} 