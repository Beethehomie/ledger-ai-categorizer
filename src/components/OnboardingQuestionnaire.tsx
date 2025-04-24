import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { CheckSquare } from 'lucide-react';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth';

const businessContextSchema = z.object({
  country: z.string().min(1, 'Please select a country'),
  industry: z.string().min(1, 'Please select an industry'),
  businessSize: z.string().min(1, 'Please select a business size'),
  paymentMethods: z.array(z.string()).min(1, 'Please select at least one payment method'),
  currency: z.string().min(1, 'Please select a currency'),
  additionalInfo: z.string().optional(),
});

type BusinessContextFormValues = z.infer<typeof businessContextSchema>;

const countries = [
  { value: 'ZA', label: 'South Africa' },
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'OTHER', label: 'Other' },
];

const industries = [
  { value: 'service', label: 'Service-based (e.g., consulting, coaching)' },
  { value: 'software', label: 'SaaS / Software' },
  { value: 'ecommerce', label: 'eCommerce (products)' },
  { value: 'freelance', label: 'Freelancing / Contract work' },
  { value: 'nonprofit', label: 'Non-profit' },
  { value: 'personal', label: 'Personal use' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'hospitality', label: 'Hospitality / Food Service' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'construction', label: 'Construction' },
  { value: 'logistics', label: 'Logistics / Transportation' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'other', label: 'Other' },
];

const businessSizes = [
  { value: 'individual', label: 'Individual / Sole Proprietor' },
  { value: 'micro', label: 'Micro (1-9 employees)' },
  { value: 'small', label: 'Small (10-49 employees)' },
  { value: 'medium', label: 'Medium (50-249 employees)' },
  { value: 'large', label: 'Large (250+ employees)' },
];

const paymentMethods = [
  { value: 'eft', label: 'EFT / ACH / Bank Transfers' },
  { value: 'card', label: 'Credit/Debit Cards' },
  { value: 'cash', label: 'Cash' },
  { value: 'payroll', label: 'Payroll Systems (e.g., Gusto, ADP)' },
  { value: 'mobile', label: 'Mobile Payments (e.g., Apple Pay, Google Pay)' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'check', label: 'Checks / Cheques' },
  { value: 'other', label: 'Other' },
];

const currencies = [
  { value: 'ZAR', label: 'South African Rand (ZAR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'OTHER', label: 'Other' },
];

interface OnboardingQuestionnaireProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (data: BusinessContextFormValues) => void;
  initialValues?: Partial<BusinessContextFormValues>;
}

const OnboardingQuestionnaire: React.FC<OnboardingQuestionnaireProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialValues = {}
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();
  
  const form = useForm<BusinessContextFormValues>({
    resolver: zodResolver(businessContextSchema),
    defaultValues: {
      country: initialValues.country || '',
      industry: initialValues.industry || '',
      businessSize: initialValues.businessSize || '',
      paymentMethods: initialValues.paymentMethods || [],
      currency: initialValues.currency || '',
      additionalInfo: initialValues.additionalInfo || '',
    }
  });

  const handleSubmit = async (data: BusinessContextFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (session?.user) {
        // Save to user profile or a dedicated table
        const { error } = await supabase
          .from('user_profiles')
          .update({
            business_context: data
          })
          .eq('id', session.user.id);
          
        if (error) {
          throw error;
        }
      }
      
      toast.success('Business context saved successfully');
      
      if (onComplete) {
        onComplete(data);
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving business context:', err);
      toast.error('Failed to save business context');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-[hsl(var(--primary))]" />
            Business Context Questionnaire
          </DialogTitle>
          <DialogDescription>
            Help us better understand your business to improve transaction categorization and vendor recognition.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Which country is your business primarily based in?</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What industry does your business operate in?</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry.value} value={industry.value}>
                            {industry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="businessSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is the size of your business?</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {businessSizes.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is your primary currency?</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="col-span-1 md:col-span-2">
                <FormField
                  control={form.control}
                  name="paymentMethods"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>How do you get paid by your customers/employers?</FormLabel>
                        <FormDescription>Select all that apply</FormDescription>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {paymentMethods.map((method) => (
                          <FormField
                            key={method.value}
                            control={form.control}
                            name="paymentMethods"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={method.value}
                                  className="flex flex-row items-center space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(method.value)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, method.value])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== method.value
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {method.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <FormField
                  control={form.control}
                  name="additionalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Any additional context that might help with vendor recognition?</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Common vendors, business-specific transactions, etc."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Business Context'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingQuestionnaire;
