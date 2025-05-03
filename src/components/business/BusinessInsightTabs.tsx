
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Lightbulb,
  DollarSign,
  FileText,
  BriefCase,
  Wrench,
  Layers,
  BarChart
} from "lucide-react";
import { BusinessContextFormValues } from './BusinessContextQuestionnaire';

interface BusinessInsightTabsProps {
  businessContext?: BusinessContextFormValues;
  onEditContext: () => void;
}

const BusinessInsightTabs: React.FC<BusinessInsightTabsProps> = ({
  businessContext,
  onEditContext
}) => {
  const [activeTab, setActiveTab] = useState('customers');

  // Helper to show if info is available for a particular section
  const hasInfoForSection = (section: string): boolean => {
    if (!businessContext) return false;
    
    switch(section) {
      case 'customers':
        return Boolean(businessContext.customerSegments || businessContext.targetAudience || businessContext.businessDescription);
      case 'value':
        return Boolean(businessContext.valueProposition || businessContext.uniqueValue || businessContext.businessDescription);
      case 'channels':
        return Boolean(businessContext.marketingChannels || businessContext.salesChannels || businessContext.businessModel);
      case 'relationships':
        return Boolean(businessContext.customerRelationship || businessContext.supportType);
      case 'revenue':
        return Boolean(businessContext.revenueChannels || businessContext.incomeTypes || businessContext.receivesPaymentsInAccount);
      case 'resources':
        return Boolean(businessContext.keyResources || businessContext.physicalSpace || businessContext.techPlatforms);
      case 'activities':
        return Boolean(businessContext.keyActivities || businessContext.businessModel);
      case 'partnerships':
        return Boolean(businessContext.keyPartnerships || businessContext.outsourcedOperations);
      case 'costs':
        return Boolean(businessContext.costStructure || businessContext.topMonthlyExpenses);
      default:
        return false;
    }
  };

  const renderEmptyState = (title: string) => (
    <div className="text-center py-6">
      <p className="text-muted-foreground mb-4">No information provided for {title} yet.</p>
      <Button onClick={onEditContext}>Add Information</Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
          Extended Business Context
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 md:grid-cols-9 mb-6">
            <TabsTrigger value="customers" className="flex flex-col items-center gap-1 py-3">
              <Users className="h-4 w-4" />
              <span className="text-xs">Customers</span>
            </TabsTrigger>
            <TabsTrigger value="value" className="flex flex-col items-center gap-1 py-3">
              <Lightbulb className="h-4 w-4" />
              <span className="text-xs">Value</span>
            </TabsTrigger>
            <TabsTrigger value="channels" className="flex flex-col items-center gap-1 py-3">
              <Layers className="h-4 w-4" />
              <span className="text-xs">Channels</span>
            </TabsTrigger>
            <TabsTrigger value="relationships" className="flex flex-col items-center gap-1 py-3">
              <Users className="h-4 w-4" />
              <span className="text-xs">Relations</span>
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex flex-col items-center gap-1 py-3">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Revenue</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex flex-col items-center gap-1 py-3">
              <Briefcase className="h-4 w-4" />
              <span className="text-xs">Resources</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex flex-col items-center gap-1 py-3">
              <Wrench className="h-4 w-4" />
              <span className="text-xs">Activities</span>
            </TabsTrigger>
            <TabsTrigger value="partnerships" className="flex flex-col items-center gap-1 py-3">
              <Users className="h-4 w-4" />
              <span className="text-xs">Partners</span>
            </TabsTrigger>
            <TabsTrigger value="costs" className="flex flex-col items-center gap-1 py-3">
              <BarChart className="h-4 w-4" />
              <span className="text-xs">Costs</span>
            </TabsTrigger>
          </TabsList>

          {/* Customer Segments */}
          <TabsContent value="customers">
            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
              <h3 className="font-medium text-lg flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Customer Segments
              </h3>
              
              {hasInfoForSection('customers') ? (
                <div className="space-y-4">
                  {businessContext?.customerSegments && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Primary Customers</h4>
                      <p>{businessContext.customerSegments}</p>
                    </div>
                  )}
                  
                  {businessContext?.targetAudience && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Target Audience</h4>
                      <Badge className="mr-2 mt-1">
                        {businessContext.targetAudience === 'b2b' ? 'Business (B2B)' : 
                         businessContext.targetAudience === 'b2c' ? 'Consumer (B2C)' : 
                         businessContext.targetAudience === 'both' ? 'Both B2B & B2C' : 'Not specified'}
                      </Badge>
                    </div>
                  )}
                  
                  {businessContext?.customerLocation && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Customer Location</h4>
                      <Badge className="mr-2 mt-1">
                        {businessContext.customerLocation === 'local' ? 'Local' : 
                         businessContext.customerLocation === 'regional' ? 'Regional' : 
                         businessContext.customerLocation === 'global' ? 'Global' : 'Not specified'}
                      </Badge>
                    </div>
                  )}
                  
                  {businessContext?.businessDescription && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Business Description</h4>
                      <p className="italic">{businessContext.businessDescription}</p>
                    </div>
                  )}
                </div>
              ) : renderEmptyState('Customer Segments')}
            </div>
          </TabsContent>

          {/* Value Proposition */}
          <TabsContent value="value">
            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
              <h3 className="font-medium text-lg flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                Value Proposition
              </h3>
              
              {hasInfoForSection('value') ? (
                <div className="space-y-4">
                  {businessContext?.valueProposition && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Problem Solved</h4>
                      <p>{businessContext.valueProposition}</p>
                    </div>
                  )}
                  
                  {businessContext?.uniqueValue && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Unique Value</h4>
                      <p>{businessContext.uniqueValue}</p>
                    </div>
                  )}
                  
                  {businessContext?.businessDescription && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Products/Services</h4>
                      <p className="italic">{businessContext.businessDescription}</p>
                    </div>
                  )}
                </div>
              ) : renderEmptyState('Value Proposition')}
            </div>
          </TabsContent>

          {/* Channels */}
          <TabsContent value="channels">
            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
              <h3 className="font-medium text-lg flex items-center">
                <Layers className="h-5 w-5 mr-2" />
                Channels
              </h3>
              
              {hasInfoForSection('channels') ? (
                <div className="space-y-4">
                  {businessContext?.marketingChannels && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Marketing Channels</h4>
                      <p>{businessContext.marketingChannels}</p>
                    </div>
                  )}
                  
                  {businessContext?.salesChannels && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Sales Channels</h4>
                      <p>{businessContext.salesChannels}</p>
                    </div>
                  )}
                  
                  {businessContext?.businessModel && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Business Model</h4>
                      <p>{businessContext.businessModel}</p>
                    </div>
                  )}
                </div>
              ) : renderEmptyState('Channels')}
            </div>
          </TabsContent>

          {/* Customer Relationships */}
          <TabsContent value="relationships">
            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
              <h3 className="font-medium text-lg flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Customer Relationships
              </h3>
              
              {hasInfoForSection('relationships') ? (
                <div className="space-y-4">
                  {businessContext?.customerRelationship && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Customer Interaction</h4>
                      <p>{businessContext.customerRelationship}</p>
                    </div>
                  )}
                  
                  {businessContext?.supportType && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Support Type</h4>
                      <Badge className="mr-2 mt-1">
                        {businessContext.supportType === 'personalized' ? 'Personalized' : 
                         businessContext.supportType === 'self-service' ? 'Self-service' : 
                         businessContext.supportType === 'community' ? 'Community-based' : 'Not specified'}
                      </Badge>
                    </div>
                  )}
                  
                  {businessContext?.salesType && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Sales Type</h4>
                      <Badge className="mr-2 mt-1">
                        {businessContext.salesType === 'one-time' ? 'One-time purchases' : 
                         businessContext.salesType === 'recurring' ? 'Recurring subscription' : 
                         businessContext.salesType === 'both' ? 'Both one-time and recurring' : 'Not specified'}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : renderEmptyState('Customer Relationships')}
            </div>
          </TabsContent>

          {/* Revenue Streams */}
          <TabsContent value="revenue">
            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
              <h3 className="font-medium text-lg flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Revenue Streams
              </h3>
              
              {hasInfoForSection('revenue') ? (
                <div className="space-y-4">
                  {businessContext?.revenueChannels && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Revenue Channels</h4>
                      <p>{businessContext.revenueChannels}</p>
                    </div>
                  )}
                  
                  {businessContext?.receivesPaymentsInAccount !== undefined && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Receives Payments In Account</h4>
                      <p>{businessContext.receivesPaymentsInAccount ? "Yes" : "No"}</p>
                    </div>
                  )}
                  
                  {businessContext?.incomeTypes && businessContext.incomeTypes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Income Types</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {businessContext.incomeTypes.map((type, index) => (
                          <Badge key={index} variant="outline">
                            {type === 'sales_revenue' ? 'Sales Revenue' :
                             type === 'investment_income' ? 'Investment Income' :
                             type === 'affiliate_income' ? 'Affiliate Income' :
                             type === 'rental_income' ? 'Rental Income' :
                             type === 'salary' ? 'Salary' : type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : renderEmptyState('Revenue Streams')}
            </div>
          </TabsContent>

          {/* Key Resources */}
          <TabsContent value="resources">
            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
              <h3 className="font-medium text-lg flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Key Resources
              </h3>
              
              {hasInfoForSection('resources') ? (
                <div className="space-y-4">
                  {businessContext?.keyResources && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Essential Resources</h4>
                      <p>{businessContext.keyResources}</p>
                    </div>
                  )}
                  
                  {businessContext?.workspaceType && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Workspace</h4>
                      <Badge className="mr-2 mt-1">
                        {businessContext.workspaceType === 'office' ? 'Office Space' : 
                         businessContext.workspaceType === 'home' ? 'Work From Home' : 
                         businessContext.workspaceType === 'hybrid' ? 'Hybrid' : businessContext.workspaceType}
                      </Badge>
                    </div>
                  )}
                  
                  {businessContext?.techPlatforms && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Technology Platforms</h4>
                      <p>{businessContext.techPlatforms}</p>
                    </div>
                  )}
                </div>
              ) : renderEmptyState('Key Resources')}
            </div>
          </TabsContent>

          {/* Key Activities */}
          <TabsContent value="activities">
            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
              <h3 className="font-medium text-lg flex items-center">
                <Wrench className="h-5 w-5 mr-2" />
                Key Activities
              </h3>
              
              {hasInfoForSection('activities') ? (
                <div className="space-y-4">
                  {businessContext?.keyActivities && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Main Activities</h4>
                      <p>{businessContext.keyActivities}</p>
                    </div>
                  )}
                  
                  {businessContext?.businessModel && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Business Model</h4>
                      <p>{businessContext.businessModel}</p>
                    </div>
                  )}
                </div>
              ) : renderEmptyState('Key Activities')}
            </div>
          </TabsContent>

          {/* Key Partnerships */}
          <TabsContent value="partnerships">
            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
              <h3 className="font-medium text-lg flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Key Partnerships
              </h3>
              
              {hasInfoForSection('partnerships') ? (
                <div className="space-y-4">
                  {businessContext?.keyPartnerships && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Partners</h4>
                      <p>{businessContext.keyPartnerships}</p>
                    </div>
                  )}
                  
                  {businessContext?.hasEmployees && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Team</h4>
                      <Badge className="mr-2 mt-1">
                        {businessContext.hasEmployees === 'employees' ? 'Has Employees' : 
                         businessContext.hasEmployees === 'contractors' ? 'Uses Contractors' : 
                         businessContext.hasEmployees === 'none' ? 'No Team' : businessContext.hasEmployees}
                      </Badge>
                    </div>
                  )}
                  
                  {businessContext?.outsourcedOperations && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Outsourced Operations</h4>
                      <p>{businessContext.outsourcedOperations}</p>
                    </div>
                  )}
                </div>
              ) : renderEmptyState('Key Partnerships')}
            </div>
          </TabsContent>

          {/* Cost Structure */}
          <TabsContent value="costs">
            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
              <h3 className="font-medium text-lg flex items-center">
                <BarChart className="h-5 w-5 mr-2" />
                Cost Structure
              </h3>
              
              {hasInfoForSection('costs') ? (
                <div className="space-y-4">
                  {businessContext?.costStructure && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Cost Structure</h4>
                      <p>{businessContext.costStructure}</p>
                    </div>
                  )}
                  
                  {businessContext?.costsOfSales && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Costs of Sales</h4>
                      <p>{businessContext.costsOfSales}</p>
                    </div>
                  )}
                  
                  {businessContext?.topMonthlyExpenses && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Top Expenses</h4>
                      <p>{businessContext.topMonthlyExpenses}</p>
                    </div>
                  )}
                </div>
              ) : renderEmptyState('Cost Structure')}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BusinessInsightTabs;
