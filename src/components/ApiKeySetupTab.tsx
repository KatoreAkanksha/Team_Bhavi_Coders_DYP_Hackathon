import React, { useState, useEffect } from 'react';
import { useFinnhub } from '../contexts/FinnhubContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, ExternalLink, Key, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const ApiKeySetupTab: React.FC = () => {
  const { t } = useLanguage();
  const { apiKey, setApiKey, isApiKeySet } = useFinnhub();
  const [inputKey, setInputKey] = useState(apiKey);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputKey.trim()) {
      toast.error(t("Please enter a valid API key"));
      return;
    }

    setIsValidating(true);

    try {
      // Simple validation - check if the key has the expected format
      // Most Finnhub API keys are alphanumeric and have a specific length
      if (!/^[a-zA-Z0-9_]{10,}$/.test(inputKey.trim())) {
        toast.warning(t("The API key format looks unusual. Please verify it's correct."));
      }

      // Set the API key regardless
      setApiKey(inputKey.trim());
      setShowSuccess(true);
      toast.success(t("API key has been set successfully"));

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      toast.error(t("Failed to set API key. Please try again."));
      console.error("Error setting API key:", error);
    } finally {
      setIsValidating(false);
    }
  };

  // Update input when apiKey changes
  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Key className="h-5 w-5 mr-2 text-primary" />
          {t("Finnhub API Setup")}
        </CardTitle>
        <CardDescription>
          {t("Enter your Finnhub API key to access real-time stock market data and news.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                {t("API Key")}
              </label>
              <Input
                id="apiKey"
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={t("Enter your Finnhub API key")}
                className="w-full font-mono"
              />
              <div className="flex items-start gap-2 mt-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {t("You can get a free API key by signing up at")}{' '}
                  <a
                    href="https://finnhub.io/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center hover:underline"
                  >
                    finnhub.io
                    <ExternalLink className="h-3 w-3 ml-0.5" />
                  </a>
                </p>
              </div>
            </div>

            {showSuccess && (
              <Alert variant="success" className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">{t("Success")}</AlertTitle>
                <AlertDescription className="text-green-700">
                  {t("API key has been set successfully. You can now access real-time financial data.")}
                </AlertDescription>
              </Alert>
            )}

            {isApiKeySet && !showSuccess && (
              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">{t("API Key Set")}</AlertTitle>
                <AlertDescription className="text-blue-700">
                  {t("Your Finnhub API key is currently set and ready to use.")}
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{t("About Finnhub API")}</AlertTitle>
              <AlertDescription>
                {t("The free tier of Finnhub API allows up to 60 API calls per minute. This is sufficient for personal use but may be limited for frequent updates.")}
              </AlertDescription>
            </Alert>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button
          type="submit"
          onClick={handleSubmit}
          className="w-full"
          disabled={!inputKey.trim() || inputKey === apiKey || isValidating}
        >
          {isValidating ? t("Validating...") : isApiKeySet ? t("Update API Key") : t("Set API Key")}
        </Button>

        {isApiKeySet && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setApiKey('');
              setInputKey('');
              toast.info(t("API key has been removed"));
            }}
          >
            {t("Remove API Key")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ApiKeySetupTab;