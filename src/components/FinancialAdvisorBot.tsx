import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { BrainCircuit, Send, User, MessageSquare } from "lucide-react";
import { toast } from "sonner";

type Message = {
  type: "user" | "ai";
  content: string;
};

interface FinancialAdvisorBotProps {
  systemPrompt?: string;
}

// Default prompt suggestions
const defaultPrompts = [
  "How can I start investing with a small budget?",
  "What's the best way to save for retirement?",
  "How do I create an emergency fund?",
  "Should I pay off debt or invest first?",
  "How can I improve my credit score?",
  "What's the 50/30/20 budget rule?",
];

// Predefined answers for common financial questions
const predefinedAnswers: Record<string, string> = {
  "How can I start investing with a small budget?":
    "Starting with a small budget is a great way to build investing habits! Here are some options:\n\n" +
    "1. **Micro-investing apps**: Apps like Groww or Kuvera allow you to start with as little as ₹100.\n\n" +
    "2. **SIPs (Systematic Investment Plans)**: Start with as little as ₹500 per month in mutual funds.\n\n" +
    "3. **Index funds**: These have lower expense ratios and provide diversification.\n\n" +
    "4. **Digital gold**: You can buy gold in small amounts (even ₹10) through apps.\n\n" +
    "Remember, consistency is more important than the amount when you're starting out!",

  "What's the best way to save for retirement?":
    "For retirement savings in India, consider these options:\n\n" +
    "1. **Employee Provident Fund (EPF)**: If you're employed, maximize your contributions.\n\n" +
    "2. **National Pension System (NPS)**: A government-backed retirement scheme with tax benefits.\n\n" +
    "3. **Public Provident Fund (PPF)**: A long-term investment option with tax benefits.\n\n" +
    "4. **Equity Mutual Funds**: For long-term growth, consider equity funds through SIPs.\n\n" +
    "5. **Health Insurance**: Don't forget this crucial aspect of retirement planning.\n\n" +
    "Aim to save at least 15-20% of your income for retirement, and start as early as possible to benefit from compound growth.",

  "How do I create an emergency fund?":
    "An emergency fund is your financial safety net. Here's how to build one:\n\n" +
    "1. **Target amount**: Aim for 3-6 months of essential expenses.\n\n" +
    "2. **Start small**: Begin with a goal of ₹10,000, then build up.\n\n" +
    "3. **Separate account**: Keep it in a high-yield savings account or liquid fund for easy access.\n\n" +
    "4. **Automate savings**: Set up automatic transfers on payday.\n\n" +
    "5. **Use windfalls**: Direct bonuses, tax refunds, or gifts toward your fund.\n\n" +
    "Remember, this is not for investments or planned expenses—it's for true emergencies like medical issues or job loss.",

  "Should I pay off debt or invest first?":
    "This depends on the type of debt and interest rates. Here's a general approach:\n\n" +
    "1. **High-interest debt first**: Pay off credit cards and personal loans (>10% interest) before investing.\n\n" +
    "2. **Build a small emergency fund**: Even while paying debt, save ₹10,000-20,000 for emergencies.\n\n" +
    "3. **Match employer contributions**: If your employer matches EPF or NPS contributions, contribute enough to get the full match.\n\n" +
    "4. **Balance approach for low-interest debt**: For home loans or education loans with <8% interest, you can balance between paying extra on loans and investing.\n\n" +
    "The psychological benefit of becoming debt-free is also valuable, so consider what approach motivates you more.",

  "How can I improve my credit score?":
    "To improve your credit score in India, follow these steps:\n\n" +
    "1. **Pay bills on time**: Set up auto-payments to never miss due dates.\n\n" +
    "2. **Reduce credit utilization**: Keep your credit card balances below 30% of your limit.\n\n" +
    "3. **Don't close old accounts**: Length of credit history matters.\n\n" +
    "4. **Limit hard inquiries**: Don't apply for too many loans or credit cards in a short period.\n\n" +
    "5. **Check your credit report**: Review it annually for errors and dispute any inaccuracies.\n\n" +
    "6. **Maintain a credit mix**: Having different types of credit (credit card, loan) can help.\n\n" +
    "Be patient—improving your score takes time, usually at least 3-6 months to see significant changes.",

  "What's the 50/30/20 budget rule?":
    "The 50/30/20 rule is a simple budgeting framework:\n\n" +
    "1. **50% for Needs**: Essential expenses like rent/mortgage, groceries, utilities, transportation, and minimum debt payments.\n\n" +
    "2. **30% for Wants**: Non-essential spending like dining out, entertainment, shopping, vacations, and subscriptions.\n\n" +
    "3. **20% for Savings/Debt**: Extra debt payments beyond minimums, emergency fund, retirement savings, and other financial goals.\n\n" +
    "For example, if your monthly take-home pay is ₹50,000:\n" +
    "- Needs: ₹25,000\n" +
    "- Wants: ₹15,000\n" +
    "- Savings/Debt: ₹10,000\n\n" +
    "This rule is flexible—adjust the percentages based on your cost of living and financial goals.",
};

const initialMessages: Message[] = [
  {
    type: "ai",
    content: "Hello! I'm your AI financial advisor. How can I help you today? You can ask me about budgeting, investing, saving, or any other financial topics.",
  },
];

export function FinancialAdvisorBot({
  systemPrompt,
}: FinancialAdvisorBotProps) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom of the messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (messageText = input) => {
    if (!messageText.trim()) return;

    // Add user message to the conversation
    const userMessage: Message = {
      type: "user",
      content: messageText,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Simulate AI thinking time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if we have a predefined answer for this exact question
      let aiResponse = "";

      // Check for exact match in predefined answers
      if (predefinedAnswers[messageText]) {
        aiResponse = predefinedAnswers[messageText];
      }
      // Otherwise use keyword-based responses as fallback
      else if (messageText.toLowerCase().includes("savings") || messageText.toLowerCase().includes("save")) {
        aiResponse = "Based on your current spending patterns, I recommend setting aside 20% of your monthly income for savings. Consider automating transfers to a high-yield savings account on payday.";
      } else if (messageText.toLowerCase().includes("invest") || messageText.toLowerCase().includes("investment")) {
        aiResponse = "For beginners, I recommend starting with index funds which provide diversification. Consider splitting your investments between equity and debt funds based on your risk tolerance.";
      } else if (messageText.toLowerCase().includes("debt") || messageText.toLowerCase().includes("loan")) {
        aiResponse = "I recommend using the avalanche method to tackle your debts - focus on high-interest debts first while making minimum payments on others. This will save you money on interest in the long run.";
      } else if (messageText.toLowerCase().includes("budget")) {
        aiResponse = "The 50/30/20 budget rule is a good starting point: 50% for needs, 30% for wants, and 20% for savings and debt repayment. Based on your income, that would be approximately ₹25,000 for needs, ₹15,000 for wants, and ₹10,000 for savings.";
      } else if (messageText.toLowerCase().includes("credit") || messageText.toLowerCase().includes("score")) {
        aiResponse = "To improve your credit score, focus on paying bills on time, keeping credit utilization below 30%, not closing old accounts, and limiting new credit applications. Check your credit report regularly for errors.";
      } else if (messageText.toLowerCase().includes("retirement")) {
        aiResponse = "For retirement planning in India, consider a mix of EPF, NPS, PPF, and equity mutual funds. Aim to save at least 15-20% of your income for retirement, and start as early as possible.";
      } else if (messageText.toLowerCase().includes("emergency") || messageText.toLowerCase().includes("fund")) {
        aiResponse = "An emergency fund should cover 3-6 months of essential expenses. Keep it in a liquid account like a high-yield savings account or liquid fund for easy access when needed.";
      } else {
        aiResponse = "Thank you for your question. To provide more personalized financial advice, I would need more details about your financial situation, including your income, expenses, savings, and financial goals.";
      }

      // Add AI response to the conversation
      const aiMessage: Message = {
        type: "ai",
        content: aiResponse,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      toast.error(t("Failed to get response. Please try again."));
      console.error("Error getting AI response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clicking on a suggested prompt
  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-lg overflow-hidden">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="flex max-w-[80%] gap-2">
                <Avatar className={message.type === "user" ? "order-2" : ""}>
                  {message.type === "user" ? (
                    <>
                      <AvatarImage src="/avatars/user.png" />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </>
                  ) : (
                    <>
                      <AvatarImage src="/avatars/ai.png" />
                      <AvatarFallback>
                        <BrainCircuit className="h-4 w-4" />
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div
                  className={`rounded-lg p-3 ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <Separator />

      {/* Show suggested prompts if there are only initial messages */}
      {messages.length <= 1 && (
        <div className="px-4 pt-3">
          <div className="mb-2 flex items-center">
            <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("Suggested questions:")}</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {defaultPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                className="text-xs h-auto py-1.5 text-left"
                onClick={() => handlePromptClick(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder={t("Ask a financial question...")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">{t("Send")}</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
