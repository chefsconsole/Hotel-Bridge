import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Bot, Send, Sparkles, Loader2 } from 'lucide-react';

export const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your HotelBridge AI assistant. I can help you with:\n\n• Adding new group bookings\n• Updating hotel contracts\n• Querying revenue and commission data\n• Providing business insights\n\nTry asking me something like:\n\"Add new group with 30 rooms in Paris for 2 nights at 100 euro from Nexus DMC\"\n\"Show total confirmed business this month\"\n\"Show pending commission payments\"",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Mock AI response - will be replaced with actual OpenAI API call
    setTimeout(() => {
      let aiResponse = '';
      
      if (input.toLowerCase().includes('add') && input.toLowerCase().includes('group')) {
        aiResponse = "I've analyzed your request to add a new group booking.\n\n📋 **Booking Details:**\n• Group: 30 rooms\n• Destination: Paris\n• Duration: 2 nights\n• Rate: €100/room\n• Operator: Nexus DMC\n\n**Total Revenue:** €6,000\n\nWould you like me to proceed with creating this booking? Please confirm the hotel property in Paris.";
      } else if (input.toLowerCase().includes('total') && input.toLowerCase().includes('business')) {
        aiResponse = "📊 **Business Summary for Current Month:**\n\n💰 Total Confirmed Revenue: €64,000\n🛏️ Total Room Nights: 460\n💵 Total Commission Earned: €7,660\n⏳ Pending Payments: €5,500\n\n📈 **Performance:**\n• 3 confirmed bookings\n• Average booking value: €21,333\n• Top hotel: Grand Hotel Europa (2 bookings)";
      } else if (input.toLowerCase().includes('pending') && input.toLowerCase().includes('commission')) {
        aiResponse = "💳 **Pending Commission Payments:**\n\n1. Delhi Wedding Group - €2,700\n   • Due: May 14, 2025\n   • Hotel: Château de Luxe\n\n2. Bangalore Cultural Tour - €2,800\n   • Due: June 24, 2025\n   • Hotel: Alpine Resort\n\n**Total Pending:** €5,500\n\nWould you like me to send payment reminders?";
      } else {
        aiResponse = "I understand you're asking about: \"" + input + "\"\n\nI can help you with:\n• Adding/updating bookings and hotels\n• Querying business data\n• Generating reports\n• Providing insights\n\nCould you please rephrase your question or try one of the example commands I mentioned earlier?";
      }

      const assistantMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const exampleQueries = [
    "Show total confirmed business this month",
    "Add group booking for 25 rooms in Rome",
    "Show pending commission payments",
    "List top performing hotels"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">AI Assistant</h1>
        <p className="text-gray-600">Get instant help with bookings, data queries, and business insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <CardTitle>HotelBridge AI</CardTitle>
                  <p className="text-xs text-gray-500">Powered by OpenAI GPT-4o</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Online
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages */}
            <div className="h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-secondary text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                    <p className="text-xs mt-2 opacity-70">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4 flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                    <span className="text-sm text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your bookings, hotels, or revenue..."
                  className="resize-none"
                  rows={3}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-secondary hover:bg-secondary/90 self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                <span>Quick Commands</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exampleQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => setInput(query)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors text-sm"
                >
                  {query}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-primary/10">
            <CardContent className="p-6">
              <Bot className="w-12 h-12 text-secondary mb-4" />
              <h3 className="font-semibold text-primary mb-2">AI Capabilities</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ Natural language booking creation</li>
                <li>✓ Real-time data queries</li>
                <li>✓ Business insights & analytics</li>
                <li>✓ Smart data updates</li>
                <li>✓ Commission calculations</li>
                <li>✓ Report generation</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> AI responses are currently simulated with mock data. Full OpenAI GPT-4o integration will be implemented in the backend phase.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
