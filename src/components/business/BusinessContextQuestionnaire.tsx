
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/utils/toast";

// Country options for the form
const COUNTRIES = [
  { label: "South Africa", value: "ZA" },
  { label: "United States", value: "US" },
  { label: "United Kingdom", value: "GB" },
  { label: "Australia", value: "AU" },
  { label: "Canada", value: "CA" },
  { label: "Germany", value: "DE" },
  { label: "France", value: "FR" },
  { label: "Netherlands", value: "NL" },
  { label: "Switzerland", value: "CH" },
  { label: "Sweden", value: "SE" },
  { label: "Other", value: "OTHER" },
];

// Industry options for the form
const INDUSTRIES = [
  { label: "Technology", value: "technology" },
  { label: "Finance & Banking", value: "finance" },
  { label: "Retail", value: "retail" },
  { label: "Healthcare", value: "healthcare" },
  { label: "Education", value: "education" },
  { label: "Manufacturing", value: "manufacturing" },
  { label: "Construction", value: "construction" },
  { label: "Transportation", value: "transportation" },
  { label: "Hospitality & Tourism", value: "hospitality" },
  { label: "Professional Services", value: "professional_services" },
  { label: "Other", value: "other" },
];

// Business size options
const BUSINESS_SIZES = [
  { label: "Sole Proprietor", value: "sole_proprietor" },
  { label: "Small (1-10 employees)", value: "small" },
  { label: "Medium (11-50 employees)", value: "medium" },
  { label: "Large (51-250 employees)", value: "large" },
  { label: "Enterprise (250+ employees)", value: "enterprise" },
];

// Payment methods options
const PAYMENT_METHODS = [
  { id: "credit_card", label: "Credit Cards" },
  { id: "debit_card", label: "Debit Cards" },
  { id: "bank_transfer", label: "Bank Transfers" },
  { id: "cash", label: "Cash" },
  { id: "checks", label: "Checks" },
  { id: "online_payment", label: "Online Payment Systems" },
  { id: "mobile_payment", label: "Mobile Payment Apps" },
];

// Currency options
const CURRENCIES = [
  { label: "South African Rand (ZAR)", value: "ZAR" },
  { label: "US Dollar (USD)", value: "USD" },
  { label: "British Pound (GBP)", value: "GBP" },
  { label: "Euro (EUR)", value: "EUR" },
  { label: "Australian Dollar (AUD)", value: "AUD" },
  { label: "Canadian Dollar (CAD)", value: "CAD" },
];

// Form schema definition with zod
const formSchema = z.object({
  country: z.string().min(1, {
    message: "Please select your country",
  }),
  industry: z.string().min(1, {
    message: "Please select your industry",
  }),
  businessSize: z.string().min(1, {
    message: "Please select your business size",
  }),
  paymentMethods: z.array(z.string()).min(1, {
    message: "Please select at least one payment method",
  }),
  currency: z.string().min(1, {
    message: "Please select your primary currency",
  }),
  additionalInfo: z.string().optional(),
});

// Type for the form values
export type BusinessContextFormValues = z.infer<typeof formSchema>;

interface BusinessContextQuestionnaireProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: BusinessContextFormValues) => void;
  initialValues?: BusinessContextFormValues;
}

const BusinessContextQuestionnaire: React.FC<BusinessContextQuestionnaireProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialValues
}) => {
  const { session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize the form with defaults or initial values
  const form = useForm<BusinessContextFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues || {
      country: "ZA",
      industry: "",
      businessSize: "",
      paymentMethods: [],
      currency: "ZAR",
      additionalInfo: "",
    },
  });

  const handleSubmit = async (values: BusinessContextFormValues) => {
    if (!session?.user) {
      toast.error("You must be logged in to save business context");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Update the user profile with the business context
      const { error } = await supabase
        .from('user_profiles')
        .update({
          business_context: values
        })
        .eq('id', session.user.id);
      
      if (error) {
        throw error;
      }
      
      toast.success("Business context saved successfully");
      onComplete(values);
      onClose();
    } catch (err) {
      console.error("Error saving business context:", err);
      toast.error("Failed to save business context. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Business Context Questionnaire</DialogTitle>
          <DialogDescription>
            Help us understand your business better to provide more accurate transaction categorizations.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
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
                  <FormLabel>Industry</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
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
                  <FormLabel>Business Size</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your business size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BUSINESS_SIZES.map((size) => (
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
              name="paymentMethods"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Payment Methods</FormLabel>
                    <FormDescription>
                      Select all payment methods your business uses.
                    </FormDescription>
                  </div>
                  {PAYMENT_METHODS.map((method) => (
                    <FormField
                      key={method.id}
                      control={form.control}
                      name="paymentMethods"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={method.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(method.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, method.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== method.id
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Currency</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your primary currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
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

            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Information</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share any specific aspects of your business that might help with transaction categorization..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Business Context"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessContextQuestionnaire;
