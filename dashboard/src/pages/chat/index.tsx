import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Bot, Loader2, RotateCcw, Send, User } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

const DASHBOARD_AUTH_TOKEN = import.meta.env.VITE_DASHBOARD_AUTH_TOKEN || 'dashboard-secret';
const SESSION_STORAGE_KEY = 'chat_session_id';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function FormattedMessageLine({ line, index, isLast }: { line: string; index: number; isLast: boolean }) {
  const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return (
    <span key={index}>
      <span dangerouslySetInnerHTML={{ __html: formatted }} />
      {!isLast && <br />}
    </span>
  );
}

function FormattedMessageContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <FormattedMessageLine key={i} line={line} index={i} isLast={i === lines.length - 1} />
      ))}
    </>
  );
}

function ChatMessageBubble({ message }: { message: Message }) {
  return (
    <div
      className={cn(
        'flex gap-3',
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.role === 'assistant' && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <div className="text-sm whitespace-pre-wrap">
          <FormattedMessageContent content={message.content} />
        </div>
        <div
          className={cn(
            'text-xs mt-1',
            message.role === 'user'
              ? 'text-primary-foreground/70'
              : 'text-muted-foreground'
          )}
        >
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
      {message.role === 'user' && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="h-4 w-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    return localStorage.getItem(SESSION_STORAGE_KEY) || `dashboard-${Date.now()}`;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { api } = useAuth();

  // Persist session ID
  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset conversation
  const resetConversation = () => {
    const newSessionId = `dashboard-${Date.now()}`;
    setSessionId(newSessionId);
    setMessages([]);
    localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
  };

  // Send message to test-chat endpoint
  const sendMessage = async (text: string): Promise<string> => {
    try {
      const response = await api.post(
        '/whatsapp/test-chat',
        { message: text, sessionId },
        {
          headers: {
            'X-Dashboard-Auth': DASHBOARD_AUTH_TOKEN,
          },
        }
      );
      return response.data.response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessage(userMessage.content);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              WhatsApp Chat Tester
            </CardTitle>
            <Button variant="outline" size="sm" onClick={resetConversation} className="gap-1">
              <RotateCcw className="h-4 w-4" />
              New Chat
            </Button>
          </div>
          <CardDescription>
            Test the transit bot functionality. Messages are processed by the same AI as WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation by sending a message.</p>
                <p className="text-sm mt-2">
                  Try: "hi", "route 500", or "from Majestic to Koramangala"
                </p>
              </div>
            )}
            {messages.map(message => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chat;
