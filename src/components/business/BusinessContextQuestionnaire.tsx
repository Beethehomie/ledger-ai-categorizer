
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/utils/toast";
import { ExtendedBusinessContextFormValues } from '@/types/business';

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
  { label: "Food & Beverage", value: "food_beverage" },
  { label: "Real Estate", value: "real_estate" },
  { label: "Media & Entertainment", value: "media" },
  { label: "Legal Services", value: "legal" },
  { label: "Agriculture", value: "agriculture" },
  { label: "Professional Services", value: "professional_services" },
  { label: "Other", value: "other" },
];

// Business model options
const BUSINESS_MODELS = [
  { label: "Service-based", value: "service_based" },
  { label: "eCommerce", value: "ecommerce" },
  { label: "SaaS / Subscription", value: "saas" },
  { label: "Hospitality", value: "hospitality" },
  { label: "Retail (physical store)", value: "retail" },
  { label: "Agency/Freelance", value: "agency_freelance" },
  { label: "Consulting", value: "consulting" },
  { label: "Content Creator", value: "content_creator" },
  { label: "Wholesaler", value: "wholesaler" },
  { label: "Other", value: "other" },
];

// Income types
const INCOME_TYPES = [
  { id: "sales_revenue", label: "Sales revenue" },
  { id: "investment_income", label: "Investment income" },
  { id: "affiliate_income", label: "Affiliate income" },
  { id: "rental_income", label: "Rental income" },
  { id: "salary", label: "Salary" },
  { id: "other", label: "Other" },
];

// Form schema definition with zod
const formSchema = z.object({
  entityType: z.enum(["business", "individual"], {
    required_error: "Please select if you're using this app as a business or individual",
  }),
  country: z.string().min(1, {
    message: "Please select your country",
  }),
  businessName: z.string().optional(),
  businessModel: z.string().optional(),
  industry: z.string().min(1, {
    message: "Please select your industry",
  }),
  businessDescription: z.string().optional(),
  revenueChannels: z.string().optional(),
  hasEmployees: z.enum(["employees", "contractors", "none"], {
    required_error: "Please select if you have employees or contractors",
  }).optional(),
  runsPayroll: z.boolean().optional(),
  mixedUseAccount: z.boolean().optional(),
  receivesPaymentsInAccount: z.boolean().optional(),
  incomeTypes: z.array(z.string()).min(1, {
    message: "Please select at least one income type",
  }),
  costsOfSales: z.string().optional(),
  mealsEntertainmentUse: z.enum(["business", "personal", "mixed"], {
    required_error: "Please select how you use meals and entertainment expenses",
  }).optional(),
  softwareSubscriptionsForBusiness: z.enum(["yes", "no", "depends"], {
    required_error: "Please select if software subscriptions are for business",
  }).optional(),
  workspaceType: z.enum(["office", "home", "hybrid"], {
    required_error: "Please select your workspace type",
  }).optional(),
  topMonthlyExpenses: z.string().optional(),
  additionalInfo: z.string().optional(),
  offerType: z.enum(["physical", "digital", "both"], {
    required_error: "Please select what type of products/services you offer",
  }).optional(),
  customerSegments: z.string().optional(),
  valueProposition: z.string().optional(),
  keyActivities: z.string().optional(),
  keyResources: z.string().optional(),
  keyPartnerships: z.string().optional(),
  costStructure: z.string().optional(),
  businessSize: z.string().optional(),
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
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // Initialize the form with defaults or initial values
  const form = useForm<BusinessContextFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues || {
      entityType: "business",
      country: "ZA",
      industry: "",
      businessName: "",
      businessModel: "",
      businessDescription: "",
      revenueChannels: "",
      hasEmployees: "none",
      runsPayroll: false,
      mixedUseAccount: false,
      receivesPaymentsInAccount: true,
      incomeTypes: ["sales_revenue"],
      costsOfSales: "",
      mealsEntertainmentUse: "business",
      softwareSubscriptionsForBusiness: "yes",
      workspaceType: "office",
      topMonthlyExpenses: "",
      additionalInfo: "",
      offerType: "both",
      businessSize: "small",
      customerSegments: "",
      valueProposition: "",
      keyActivities: "",
      keyResources: "",
      keyPartnerships: "",
      costStructure: "",
    },
  });

  const watchEntityType = form.watch("entityType");

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Business Context Questionnaire</DialogTitle>
          <DialogDescription>
            Help us understand your business better to provide more accurate transaction categorizations.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Step 1: Entity Definition with simplified questions */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">Entity Definition</h3>
                  <p className="text-sm text-muted-foreground">These questions help define the type of entity and its operational context.</p>
                </div>

                <FormField
                  control={form.control}
                  name="entityType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Are you using this app as a business or individual?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="business" />
                            </FormControl>
                            <FormLabel className="font-normal">Business</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="individual" />
                            </FormControl>
                            <FormLabel className="font-normal">Individual</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What country is your {watchEntityType === "business" ? "business" : ""} based in?</FormLabel>
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

                {watchEntityType === "business" && (
                  <>
                    <FormField
                      control={form.control}
                      name="businessModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What is your primary business model?</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your business model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {BUSINESS_MODELS.map((model) => (
                                <SelectItem key={model.value} value={model.value}>
                                  {model.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What industry are you in?</FormLabel>
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
                  name="businessDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Briefly describe what your {watchEntityType === "business" ? "business does and who your typical customer is" : "financial goals are"}
                      </FormLabel>
                      <FormDescription>
                        This helps us customize the experience and categorize your transactions better
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder={watchEntityType === "business" 
                            ? "We provide accounting services for small businesses..."
                            : "I'm tracking my expenses to save for..."
                          }
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Revenue & Operations (simplified) */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">Revenue & Operations</h3>
                  <p className="text-sm text-muted-foreground">
                    These help us understand how your business operates and generates income.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="revenueChannels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are your primary income streams and how do you get paid?</FormLabel>
                      <FormDescription>
                        E.g., platforms, direct clients, subscriptions, etc.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Direct deposit, Stripe, PayPal, Upwork, subscriptions..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="topMonthlyExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are your most common monthly or recurring expenses?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Software subscriptions, rent, marketing, contractors..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="offerType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Do you sell physical products, digital services, or both—and do you hold inventory?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="physical" />
                            </FormControl>
                            <FormLabel className="font-normal">Physical products (with inventory)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="digital" />
                            </FormControl>
                            <FormLabel className="font-normal">Digital products/services (no inventory)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="both" />
                            </FormControl>
                            <FormLabel className="font-normal">Both physical and digital</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasEmployees"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Do you use contractors, freelancers, or staff—and how do you pay them?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="employees" />
                            </FormControl>
                            <FormLabel className="font-normal">Yes, employees (payroll)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="contractors" />
                            </FormControl>
                            <FormLabel className="font-normal">Yes, contractors/freelancers (invoices)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="none" />
                            </FormControl>
                            <FormLabel className="font-normal">No team members</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Account Usage & Preferences (simplified) */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">Account Usage & Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    These help us understand how you use your accounts and categorize transactions.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="mixedUseAccount"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Do you use this account for personal expenses?
                        </FormLabel>
                        <FormDescription>
                          {field.value ? "Yes, mixed-use" : "No, business-only"}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workspaceType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Where do you primarily work from?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="office" />
                            </FormControl>
                            <FormLabel className="font-normal">Office/retail space</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="home" />
                            </FormControl>
                            <FormLabel className="font-normal">Home office</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="hybrid" />
                            </FormControl>
                            <FormLabel className="font-normal">Hybrid/multiple locations</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mealsEntertainmentUse"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Are meals and entertainment usually for business or personal use?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="business" />
                            </FormControl>
                            <FormLabel className="font-normal">Business (e.g., client dinners)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="personal" />
                            </FormControl>
                            <FormLabel className="font-normal">Personal</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="mixed" />
                            </FormControl>
                            <FormLabel className="font-normal">Both (mixed)</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Any additional information that could help with transaction categorization?</FormLabel>
                      <FormDescription>
                        Special expenses, unique business arrangements, etc.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="For example: Car expenses are for delivery only, not commuting"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter className="flex justify-between items-center pt-4 border-t">
              {currentStep > 1 ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              ) : (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              
              <div className="flex space-x-2 items-center">
                <span className="text-sm text-muted-foreground">
                  Step {currentStep} of {totalSteps}
                </span>
                {currentStep < totalSteps ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Business Context"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessContextQuestionnaire;
