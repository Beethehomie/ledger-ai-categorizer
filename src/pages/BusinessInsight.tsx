
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { Check, X, Loader2, AlertCircle, RefreshCw, Save } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/utils/toast';
import { Json } from '@/types/supabase';

// Define interfaces for our form data
export interface BusinessContextFormValues {
  // Core questions
  businessDescription: string;
  incomeStreams: string;
  commonExpenses: string;
  productType: string; // 'physical' | 'digital' | 'both' | 'services'
  hasInventory: boolean;
  usesContractors: boolean;
  paymentMethods: string;
  
  // Extended questions
  customerSegments: {
    primaryCustomers: string;
    customerType: string; // 'B2C' | 'B2B' | 'both'
    customerLocation: string; // 'local' | 'regional' | 'global'
    isNicheMarket: boolean;
  };
  valuePropositions: {
    problemsSolved: string;
    productServices: string;
    competitiveAdvantage: string;
    uniqueFeatures: string;
  };
  channels: {
    reachMethods: string;
    platforms: string;
    salesMethod: string; // 'direct' | 'third-party' | 'both'
  };
  customerRelationships: {
    interactionStyle: string;
    supportType: string;
    relationshipType: string; // 'ongoing' | 'one-off' | 'mixed'
  };
  revenueStreams: {
    moneyMakingMethods: string;
    revenueModel: string; // 'one-time' | 'recurring' | 'mixed'
    paymentCollection: string;
    secondaryIncome: string;
  };
  keyResources: {
    essentialAssets: string;
    physicalSpace: string;
    techPlatforms: string;
  };
  keyActivities: {
    mainTasks: string;
    businessOperations: string;
    selfPerformedTasks: string;
  };
  keyPartnerships: {
    partners: string;
    essentialPlatforms: string;
    outsourcedOperations: string;
  };
  costStructure: {
    biggestExpenses: string;
    costType: string; // 'fixed' | 'variable' | 'mixed'
    recurringExpenses: string;
    seasonalExpenses: string;
  };
}

interface AIInsight {
  summary: string;
  generatedAt: string;
  contextSnapshot?: Record<string, any>;
}

// Helper function to convert BusinessContextFormValues to Json compatible object
const businessContextToJson = (values: BusinessContextFormValues): Record<string, any> => {
  return JSON.parse(JSON.stringify(values));
};

const BusinessInsightPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [aiInsight, setAIInsight] = useState<AIInsight | null>(null);
  
  const form = useForm<BusinessContextFormValues>({
    defaultValues: {
      businessDescription: '',
      incomeStreams: '',
      commonExpenses: '',
      productType: 'services',
      hasInventory: false,
      usesContractors: false,
      paymentMethods: '',
      
      customerSegments: {
        primaryCustomers: '',
        customerType: 'both',
        customerLocation: 'global',
        isNicheMarket: false
      },
      valuePropositions: {
        problemsSolved: '',
        productServices: '',
        competitiveAdvantage: '',
        uniqueFeatures: ''
      },
      channels: {
        reachMethods: '',
        platforms: '',
        salesMethod: 'both'
      },
      customerRelationships: {
        interactionStyle: '',
        supportType: '',
        relationshipType: 'mixed'
      },
      revenueStreams: {
        moneyMakingMethods: '',
        revenueModel: 'mixed',
        paymentCollection: '',
        secondaryIncome: ''
      },
      keyResources: {
        essentialAssets: '',
        physicalSpace: '',
        techPlatforms: ''
      },
      keyActivities: {
        mainTasks: '',
        businessOperations: '',
        selfPerformedTasks: ''
      },
      keyPartnerships: {
        partners: '',
        essentialPlatforms: '',
        outsourcedOperations: ''
      },
      costStructure: {
        biggestExpenses: '',
        costType: 'mixed',
        recurringExpenses: '',
        seasonalExpenses: ''
      }
    }
  });
  
  // Fetch user's business context and insight on load
  useEffect(() => {
    async function fetchBusinessContext() {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('business_context, business_insight')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          return;
        }
        
        if (profileData?.business_context) {
          form.reset(profileData.business_context as unknown as BusinessContextFormValues);
        }
        
        if (profileData?.business_insight) {
          setAIInsight(profileData.business_insight as unknown as AIInsight);
        }
      } catch (error) {
        console.error('Error fetching business context:', error);
        toast.error('Failed to load business data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchBusinessContext();
  }, [user, form]);
  
  // Save business context to Supabase
  const saveBusinessContext = async (values: BusinessContextFormValues) => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          business_context: businessContextToJson(values),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Business context saved successfully');
    } catch (error) {
      console.error('Error saving business context:', error);
      toast.error('Failed to save business context');
    } finally {
      setSaving(false);
    }
  };
  
  // Generate AI insight based on business context
  const generateAIInsight = async () => {
    if (!user?.id) return;
    
    const values = form.getValues();
    
    try {
      setGeneratingInsight(true);
      
      const { data, error } = await supabase.functions.invoke('generate-business-insight', {
        body: { 
          businessContext: businessContextToJson(values),
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      if (data) {
        const newInsight: AIInsight = {
          summary: data.insight,
          generatedAt: data.timestamp,
          contextSnapshot: businessContextToJson(values)
        };
        
        setAIInsight(newInsight);
        toast.success('New business insight generated');
      }
    } catch (error) {
      console.error('Error generating business insight:', error);
      toast.error('Failed to generate business insight');
    } finally {
      setGeneratingInsight(false);
    }
  };
  
  const onSubmit = async (values: BusinessContextFormValues) => {
    await saveBusinessContext(values);
    
    // Option to also generate new insight when saving
    // await generateAIInsight();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading business data...</span>
      </div>
    );
  }
  
  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Business Insight</h1>
        <p className="text-muted-foreground mt-2">
          Complete your business profile to help us better categorize your transactions
        </p>
      </div>
      
      {aiInsight && (
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span>AI Business Insight</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-auto"
                onClick={generateAIInsight}
                disabled={generatingInsight}
              >
                {generatingInsight ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Update Insight
                  </>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              Last generated: {new Date(aiInsight.generatedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg italic">{aiInsight.summary}</div>
          </CardContent>
        </Card>
      )}
      
      {!aiInsight && (
        <Alert className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Business Insight Available</AlertTitle>
          <AlertDescription>
            Complete your business profile and generate your first AI insight to help better categorize your transactions.
            <div className="mt-4">
              <Button
                onClick={generateAIInsight}
                disabled={generatingInsight}
                className="flex items-center"
              >
                {generatingInsight ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Business Insight
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Core Business Information</CardTitle>
              <CardDescription>
                Please answer these key questions about your business to help us categorize your transactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Core Questions */}
              <FormField
                control={form.control}
                name="businessDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Briefly describe what your business does and who your typical customer is</FormLabel>
                    <FormDescription>
                      This helps us understand your value proposition and customer segments for transaction classification
                    </FormDescription>
                    <FormControl>
                      <Textarea placeholder="e.g., We create custom web applications for small businesses looking to automate their workflows" {...field} className="min-h-[120px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="incomeStreams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What are your primary income streams and how do you get paid?</FormLabel>
                    <FormDescription>
                      For example: platforms, direct clients, subscriptions, etc.
                    </FormDescription>
                    <FormControl>
                      <Textarea placeholder="e.g., Monthly retainers from clients via bank transfer, project-based work through Upwork, subscription revenue via Stripe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="commonExpenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What are your most common monthly or recurring expenses?</FormLabel>
                    <FormDescription>
                      This helps us accurately classify your regular transactions
                    </FormDescription>
                    <FormControl>
                      <Textarea placeholder="e.g., Software subscriptions (Adobe, GitHub), office rent, contractor payments, marketing tools" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Do you sell physical products, digital services, or both?</FormLabel>
                    <FormDescription>
                      This helps us determine if costs like materials or shipping relate to cost of sales
                    </FormDescription>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product/service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="physical">Physical products</SelectItem>
                        <SelectItem value="digital">Digital products</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="both">Combination of products and services</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hasInventory"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Do you hold inventory?</FormLabel>
                      <FormDescription>
                        This helps us classify purchases of materials and supplies
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="usesContractors"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Do you use contractors, freelancers, or staff?</FormLabel>
                      <FormDescription>
                        This helps distinguish between labor expenses versus external services
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="paymentMethods"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How do you pay contractors, freelancers, or staff?</FormLabel>
                    <FormDescription>
                      For example: payroll service, direct deposit, PayPal, etc.
                    </FormDescription>
                    <FormControl>
                      <Input placeholder="e.g., Wise for international contractors, direct bank transfers for local staff" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Accordion type="multiple" className="w-full">
            {/* Extended Business Model Questions */}
            <AccordionItem value="customer-segments">
              <AccordionTrigger className="text-xl font-semibold">
                🧍‍♂️ Customer Segments
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="customerSegments.primaryCustomers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who are your primary customers or target audiences?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customerSegments.customerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you serve individuals (B2C), businesses (B2B), or both?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="B2C">Individuals (B2C)</SelectItem>
                          <SelectItem value="B2B">Businesses (B2B)</SelectItem>
                          <SelectItem value="both">Both B2B and B2C</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customerSegments.customerLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are your customers local, regional, or global?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="local">Local</SelectItem>
                          <SelectItem value="regional">Regional</SelectItem>
                          <SelectItem value="global">Global</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customerSegments.isNicheMarket"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Do you target a niche market?</FormLabel>
                        <FormDescription>
                          Rather than a broad customer base
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
            
            {/* Value Propositions Section */}
            <AccordionItem value="value-propositions">
              <AccordionTrigger className="text-xl font-semibold">
                🎁 Value Propositions
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="valuePropositions.problemsSolved"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What problem(s) does your business solve for your customers?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="valuePropositions.productServices"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What products or services do you offer?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="valuePropositions.competitiveAdvantage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why do customers choose your product/service over competitors?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="valuePropositions.uniqueFeatures"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What makes your offering unique?</FormLabel>
                      <FormDescription>
                        For example: speed, cost, innovation, support
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
            
            {/* The rest of the accordion sections follow the same pattern */}
            
            {/* Let's add the Channels section */}
            <AccordionItem value="channels">
              <AccordionTrigger className="text-xl font-semibold">
                📡 Channels
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="channels.reachMethods"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How do you reach your customers?</FormLabel>
                      <FormDescription>
                        For example: online store, social media, resellers, in-person
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="channels.platforms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Through which platforms do customers discover and buy from you?</FormLabel>
                      <FormDescription>
                        For example: Shopify, Instagram, email, Upwork
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="channels.salesMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you use third-party platforms or direct sales?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="direct">Direct sales only</SelectItem>
                          <SelectItem value="third-party">Third-party platforms only</SelectItem>
                          <SelectItem value="both">Both direct and third-party</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
            
            {/* Customer Relationships Section */}
            <AccordionItem value="customer-relationships">
              <AccordionTrigger className="text-xl font-semibold">
                💬 Customer Relationships
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="customerRelationships.interactionStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How do you interact with customers during and after a sale?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customerRelationships.supportType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you offer personalized support, self-service tools, or a community-based approach?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customerRelationships.relationshipType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you maintain ongoing relationships or are sales mostly one-off?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ongoing">Ongoing relationships</SelectItem>
                          <SelectItem value="one-off">Mostly one-off sales</SelectItem>
                          <SelectItem value="mixed">Mix of both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
            
            {/* Revenue Streams */}
            <AccordionItem value="revenue-streams">
              <AccordionTrigger className="text-xl font-semibold">
                💵 Revenue Streams
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="revenueStreams.moneyMakingMethods"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How does your business make money?</FormLabel>
                      <FormDescription>
                        For example: product sales, services, licensing, ads, subscriptions
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="revenueStreams.revenueModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you operate on a one-time purchase model or recurring revenue?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="one-time">One-time purchases</SelectItem>
                          <SelectItem value="recurring">Recurring revenue</SelectItem>
                          <SelectItem value="mixed">Mix of both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="revenueStreams.paymentCollection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you collect payments manually or through platforms?</FormLabel>
                      <FormDescription>
                        For example: Stripe, PayPal, manual invoicing
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="revenueStreams.secondaryIncome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are there secondary income sources?</FormLabel>
                      <FormDescription>
                        For example: affiliate marketing, grants
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
            
            {/* Key Resources Section */}
            <AccordionItem value="key-resources">
              <AccordionTrigger className="text-xl font-semibold">
                🧱 Key Resources
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="keyResources.essentialAssets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What assets or resources are essential to operate your business?</FormLabel>
                      <FormDescription>
                        For example: staff, tools, inventory, IP, software
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="keyResources.physicalSpace"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you require physical space?</FormLabel>
                      <FormDescription>
                        For example: warehouse, studio, kitchen
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="keyResources.techPlatforms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What tech platforms or software do you rely on regularly?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
            
            {/* Key Activities */}
            <AccordionItem value="key-activities">
              <AccordionTrigger className="text-xl font-semibold">
                🔧 Key Activities
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="keyActivities.mainTasks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are the main tasks or processes your business performs daily?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="keyActivities.businessOperations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you manufacture, ship, design, consult, or develop products?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="keyActivities.selfPerformedTasks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you do your own marketing, fulfillment, or accounting?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
            
            {/* Key Partnerships */}
            <AccordionItem value="key-partnerships">
              <AccordionTrigger className="text-xl font-semibold">
                🤝 Key Partnerships
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="keyPartnerships.partners"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you work with suppliers, contractors, freelancers, agencies, or platforms?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="keyPartnerships.essentialPlatforms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are there platforms or services that are essential to your operation?</FormLabel>
                      <FormDescription>
                        For example: AWS, Couriers, Fiverr, Shopify
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="keyPartnerships.outsourcedOperations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you outsource any part of your operations?</FormLabel>
                      <FormDescription>
                        For example: manufacturing, marketing
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
            
            {/* Cost Structure */}
            <AccordionItem value="cost-structure">
              <AccordionTrigger className="text-xl font-semibold">
                💰 Cost Structure
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="costStructure.biggestExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are your biggest and most frequent business expenses?</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="costStructure.costType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you spend more on fixed costs or variable costs?</FormLabel>
                      <FormDescription>
                        Fixed costs: rent, salaries. Variable costs: marketing, inventory.
                      </FormDescription>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">Mostly fixed costs</SelectItem>
                          <SelectItem value="variable">Mostly variable costs</SelectItem>
                          <SelectItem value="mixed">Mix of both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="costStructure.recurringExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you have recurring monthly/annual expenses?</FormLabel>
                      <FormDescription>
                        For example: software subscriptions, contractors
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="costStructure.seasonalExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are any expenses seasonal or tied to revenue?</FormLabel>
                      <FormDescription>
                        For example: delivery costs, packaging, advertising
                      </FormDescription>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Reset
            </Button>
            <Button 
              type="submit"
              disabled={saving}
              className="flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Business Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default BusinessInsightPage;
