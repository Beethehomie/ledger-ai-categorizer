
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
            {/* Step 1: Entity Definition */}
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
                        {watchEntityType === "business" 
                          ? "Briefly describe what your business sells or does" 
                          : "Briefly describe your financial goals"
                        }
                      </FormLabel>
                      <FormDescription>
                        This helps us customize the experience for you (optional)
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

            {/* Step 2: Operational & Financial Structure */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">Operational & Financial Structure</h3>
                  <p className="text-sm text-muted-foreground">
                    These help distinguish between COGS, operating expenses, owner drawings, and personal spending.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="revenueChannels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How do you receive revenue?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Direct deposit, payment platforms, checks..."
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
                  name="hasEmployees"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Do you have employees or contractors?</FormLabel>
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
                            <FormLabel className="font-normal">Yes, employees</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="contractors" />
                            </FormControl>
                            <FormLabel className="font-normal">Yes, contractors/freelancers</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="none" />
                            </FormControl>
                            <FormLabel className="font-normal">No</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(form.watch("hasEmployees") === "employees" || form.watch("hasEmployees") === "contractors") && (
                  <FormField
                    control={form.control}
                    name="runsPayroll"
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
                            Do you run payroll through this account?
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

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
                  name="receivesPaymentsInAccount"
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
                          Do you receive client/customer payments in this account?
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incomeTypes"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>What types of regular income do you receive?</FormLabel>
                        <FormDescription>
                          Select all that apply.
                        </FormDescription>
                      </div>
                      {INCOME_TYPES.map((type) => (
                        <FormField
                          key={type.id}
                          control={form.control}
                          name="incomeTypes"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={type.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(type.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, type.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== type.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {type.label}
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
              </div>
            )}

            {/* Step 3: Categorization Context */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">Categorization Context</h3>
                  <p className="text-sm text-muted-foreground">
                    These refine how transactions like "Uber", "Takealot", or "Woolworths" should be handled.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="costsOfSales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What would you typically consider a 'Cost of Sales' (direct costs)?</FormLabel>
                      <FormDescription>
                        Examples: raw ingredients, packaging, freelancers
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="List your typical direct costs..."
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
                  name="softwareSubscriptionsForBusiness"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Are software subscriptions (e.g., Zoom, Google Workspace) business-related?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="yes" />
                            </FormControl>
                            <FormLabel className="font-normal">Yes</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="no" />
                            </FormControl>
                            <FormLabel className="font-normal">No</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="depends" />
                            </FormControl>
                            <FormLabel className="font-normal">Depends (you'll classify case-by-case)</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workspaceType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Do you rent office space or work from home?</FormLabel>
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
                            <FormLabel className="font-normal">Rent office</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="home" />
                            </FormControl>
                            <FormLabel className="font-normal">Work from home</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="hybrid" />
                            </FormControl>
                            <FormLabel className="font-normal">Hybrid</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchEntityType === "individual" && (
                  <FormField
                    control={form.control}
                    name="topMonthlyExpenses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are your top 3 recurring monthly expenses?</FormLabel>
                        <FormDescription>
                          This is useful for pattern recognition
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            placeholder="Rent, utilities, groceries..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
