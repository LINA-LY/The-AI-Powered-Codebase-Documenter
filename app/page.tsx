import { useState }from 'react';
import { Button } from "@components/ui/button";//C:\Users\walid\OneDrive\Bureau\NEW PROJECT\codelens-ai\components\ui\button.tsx
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { title } from 'process';

export default function Home() {
  const [repoURL, setRepoURL] = useState('');
  const [isLoading, setIsLoading]= useState(false);
  const [isReady, setIsReady] = useState(false); // True when the repo is ingested

  //This is for showing notifications 
  const {toast } = useToast();

  const handleIngest =async () => {
    if (!repoURL.includes('github.com')){
      toast ({
        title: "Invalid URL",
        description : "Please enter a valid Github repository URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsReady(false);


    try {
      const response = await fetch ('/api/ingest', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body : JSON.stringify({repoURL}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something want wrong');
      }

      toast({
        title: "success!",
        description: "The repository has been analyzed. You can nwo ask a questions"
      });
      setIsReady(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Ingestion failed",
        description: errorMessage,
        variant: "destructive",
      });
    }finally{
      setIsLoading(false);
    }
  };
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              CodeLens AI 🤖
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isReady ? (
              <div className="space-y-4">
                <p className="text-center text-gray-600 dark:text-gray-300">
                  Enter a public GitHub repository URL to get started.
                </p>
                <div className="flex w-full items-center space-x-2">
                  <Input
                    type="url"
                    placeholder="https://github.com/facebook/react"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button onClick={handleIngest} disabled={isLoading}>
                    {isLoading ? 'Analyzing...' : 'Analyze'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-xl font-semibold text-green-600">Repo analyzed successfully!</h3>
                <p className="text-gray-500 mt-2">Ready to answer your questions.</p>
                {/* Chat interface will go here in the next step */}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
