
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionUploader } from '@/components/TransactionUploader';
import { UploadCloud, BarChart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, signOut } = useAuth();
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Financial Bookkeeper</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user?.email}
          </span>
          <Button variant="outline" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </header>

      <div className="grid gap-6">
        {isUploaderOpen ? (
          <TransactionUploader />
        ) : (
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5" />
                Upload Transactions
              </CardTitle>
              <CardDescription>
                Upload your bank transactions CSV file to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsUploaderOpen(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                Start Upload
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Financial Summary
            </CardTitle>
            <CardDescription>
              View your financial data at a glance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">
              Upload transactions to see your financial summary
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
