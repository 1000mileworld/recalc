'use client'

// Add this at the very top of your file, before any code
type CalculatedOutputType = {
  [year: number]: {
    months: {
      [month: number]: {
        value: number;
        debt: number;
        displayDebt?: number; // Add '?' if this property might be undefined
        equity: number;
        cashInvested: number;
        displayCashInvested?: number; // Add '?' if this property might be undefined
        totalCashInvested: number;
        interestPaid: number;
        rent: number;
        expenses: number;
        cashFlow: number;
        equityGrowth: number;
        totalReturn: number;
        returnOnInvestedCash: number;
        dscr: number;
        isRehabPeriod?: boolean; // Optional property
      };
    };
    yearlyTotals: {
      interestPaid: number;
      rent: number;
      expenses: number;
      cashFlow: number;
      equityGrowth: number;
      totalReturn: number;
      cashInvested: number;
      totalCashInvested: number;
      returnOnInvestedCash: number;
      dscr: number;
    };
  };
};

// Add these type definitions at the top of the file
type RehabItem = {
  id: string;
  description: string;
  quantity: number;
  rentalPrice: number;
  airbnbPrice: number;
  price: number;
  extended: number;
  checked: boolean;
};

type RehabCategory = {
  [key in 'flooring' | 'kitchen' | 'bathrooms' | 'general' | 'contingency']: RehabItem[];
};

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp } from 'lucide-react'


import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { saveAs } from 'file-saver';

// Add these imports for the tooltip
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

// Define tooltip components
const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={`z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className}`}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

const calculateDefaultRehabDuration = (rehabCost: number): number => {
  if (rehabCost === 0) return 0;
  if (rehabCost <= 25000) return 2;
  if (rehabCost <= 50000) return 3;
  if (rehabCost <= 75000) return 4;
  if (rehabCost <= 100000) return 5;
  return 6;
};

const roundToDollar = (value: number) => Math.round(value);

// Define the formatNumber function outside of the component
const formatNumber = (num: number) => {
  return Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Add logging utility at the top of the file
const log = (message: string, data?: unknown) => {
  console.log(`[Calculator]: ${message}`, data || '');
};

// Updated code using CalculatedOutputType
const findMaxTotalCashInvested = (output: CalculatedOutputType) => {
  let maxCash = 0;
  Object.keys(output).forEach(year => {
    Object.keys(output[parseInt(year)].months).forEach(month => {
      const totalCashInvested = output[parseInt(year)].months[parseInt(month)].totalCashInvested;
      if (totalCashInvested > maxCash) {
        maxCash = totalCashInvested;
      }
    });
  });
  return maxCash;
};

const findMinTotalCashInvested = (
  output: CalculatedOutputType, 
  type: string = 'buyAndHold',
  details: { holdingPeriod: string } = { holdingPeriod: '0' }
) => {
  log('Finding after refinance cash invested', { type, details });
  
  // For BRRRR, we want the total cash invested in the month after refinance
  if (type === 'brrrr') {
    const rehabDuration = parseInt(details.holdingPeriod) || 0;
    const refinanceMonth = rehabDuration + 1;
    const refinanceYear = Math.floor(refinanceMonth / 12) + 1;
    const monthInYear = refinanceMonth % 12 || 12;
    
    log('Refinance timing calculated:', { rehabDuration, refinanceMonth, refinanceYear, monthInYear });
    
    // Return the total cash invested for the refinance month
    return output[refinanceYear]?.months[monthInYear]?.totalCashInvested || 0;
  }
  
  // For other investment types, find the minimum across all months
  return Object.values(output).reduce((min, yearData) => {
    const yearMin = Object.values(yearData.months).reduce((monthMin, monthData) => {
      return Math.min(monthMin, monthData.totalCashInvested);
    }, Infinity);
    return Math.min(min, yearMin);
  }, Infinity);
};

// Update any other helper functions similarly

// Add or update this helper function
const calculateYearlyTotals = (data: {
  months: {
    [key: string]: {
      cashFlow: number;
      // Add other properties that might be needed
    };
  };
}) => {
  const totals = {
    cashFlow: 0,
    // Add other properties that need to be totaled
  };

  // Sum up the monthly values
  Object.values(data.months).forEach(month => {
    totals.cashFlow += month.cashFlow;
    // Add other properties that need to be summed
  });

  return totals;
};

// Add this helper function to sum all years of cash flow
const calculateTotalCashFlow = (output: CalculatedOutputType) => {
  return Object.values(output).reduce((total, yearData) => {
    return total + Object.values(yearData.months).reduce((yearTotal, monthData) => {
      return yearTotal + (monthData.cashFlow || 0);
    }, 0);
  }, 0);
};

export function Page() {
  const [investmentType, setInvestmentType] = useState('buyAndHold')
  const [activeTab, setActiveTab] = useState('property')
  const [propertyDetails, setPropertyDetails] = useState({
    address: '',
    squareFootage: '',
    bedrooms: '',
    bathrooms: ''
  })
  const [dealDetails, setDealDetails] = useState({
    purchasePrice: '',
    rehabCost: '',
    holdingPeriod: '',
    closingCosts: '',
    afterRepairValue: ''
  })
  const [shortTermFinancing, setShortTermFinancing] = useState({
    interestRate: '10',
    lendersPoints: '1',
    purchaseLoaned: '80',
    rehabLoaned: '80'
  })
  const [financingDetails, setFinancingDetails] = useState({
    loanTerm: '30',
    interestRate: '7',
    lenderPoints: '0',
    loanToValue: '75'
  })
  const [rentalDetails, setRentalDetails] = useState({
    rentalType: 'longTerm',
    annualAppreciation: '2',
    annualInsurance: '1200',
    annualPropertyTax: '',
    monthlyRent: '',
    annualMaintenance: '7',
    annualCapex: '7',
    pmFee: '10',
    averageLeaseLength: '3',
    leaseUpFee: '',
    furnitureAndDecorations: '10000',
    personalUsage: '0',
    shortTermPmFee: '20',
    vacancyRate: '3'  // New field for Vacancy Rate
  })
  const [rehabStrategy, setRehabStrategy] = useState('rental')
  const [rehabDetails, setRehabDetails] = useState<RehabCategory>({
    flooring: [
      { id: 'lvpFlooring', description: 'LVP Flooring:', quantity: 0, rentalPrice: 6, airbnbPrice: 7, price: 6, extended: 0, checked: false },
      { id: 'carpeting', description: 'Carpeting:', quantity: 0, rentalPrice: 2.5, airbnbPrice: 3.5, price: 2.5, extended: 0, checked: false },
    ],
    kitchen: [
      { id: 'newKitchen', description: 'New Kitchen:', quantity: 0, rentalPrice: 7000, airbnbPrice: 12500, price: 7000, extended: 0, checked: false },
      { id: 'kitchenAppliances', description: 'Kitchen Appliances:', quantity: 0, rentalPrice: 3000, airbnbPrice: 3500, price: 3000, extended: 0, checked: false },
      { id: 'newCountertops', description: 'New Countertops:', quantity: 0, rentalPrice: 1500, airbnbPrice: 3500, price: 1500, extended: 0, checked: false },
      { id: 'paintCabinets', description: 'Paint Cabinets + Pulls:', quantity: 0, rentalPrice: 1200, airbnbPrice: 1200, price: 1200, extended: 0, checked: false },
    ],
    bathrooms: [
      { id: 'newBathroom', description: 'New Bathroom:', quantity: 0, rentalPrice: 5500, airbnbPrice: 7500, price: 5500, extended: 0, checked: false },
      { id: 'newVanity', description: 'New Vanity:', quantity: 0, rentalPrice: 400, airbnbPrice: 600, price: 400, extended: 0, checked: false },
      { id: 'newMirrorLight', description: 'New Mirror/Light:', quantity: 0, rentalPrice: 300, airbnbPrice: 300, price: 300, extended: 0, checked: false },
      { id: 'newToilet', description: 'New Toilet:', quantity: 0, rentalPrice: 450, airbnbPrice: 450, price: 450, extended: 0, checked: false },
    ],
    general: [
      { id: 'doorKnobs', description: 'Door Knobs:', quantity: 0, rentalPrice: 40, airbnbPrice: 60, price: 40, extended: 0, checked: false },
      { id: 'newInteriorDoors', description: 'New Interior Doors:', quantity: 0, rentalPrice: 275, airbnbPrice: 275, price: 275, extended: 0, checked: false },
      { id: 'newExteriorDoors', description: 'New Exterior Doors:', quantity: 0, rentalPrice: 500, airbnbPrice: 750, price: 500, extended: 0, checked: false },
      { id: 'newWindows', description: 'New Windows:', quantity: 0, rentalPrice: 450, airbnbPrice: 450, price: 450, extended: 0, checked: false },
      { id: 'drywall', description: 'Drywall:', quantity: 0, rentalPrice: 15.5, airbnbPrice: 17, price: 15.5, extended: 0, checked: false },
      { id: 'interiorPaint', description: 'Interior Paint:', quantity: 0, rentalPrice: 3, airbnbPrice: 3, price: 3, extended: 0, checked: false },
      { id: 'exteriorPaint', description: 'Exterior Paint:', quantity: 0, rentalPrice: 5500, airbnbPrice: 5500, price: 5500, extended: 0, checked: false },
      { id: 'electrical', description: 'Electrical:', quantity: 0, rentalPrice: 8000, airbnbPrice: 8000, price: 8000, extended: 0, checked: false },
      { id: 'newRoof', description: 'New Roof:', quantity: 0, rentalPrice: 10000, airbnbPrice: 10000, price: 10000, extended: 0, checked: false },
      { id: 'newSidingFascia', description: 'New Siding + Fascia:', quantity: 0, rentalPrice: 15000, airbnbPrice: 20000, price: 15000, extended: 0, checked: false },
      { id: 'landscaping', description: 'Landscaping:', quantity: 0, rentalPrice: 1500, airbnbPrice: 2500, price: 1500, extended: 0, checked: false },
      { id: 'basementDryLock', description: 'Basement Dry Lock:', quantity: 0, rentalPrice: 2000, airbnbPrice: 2000, price: 2000, extended: 0, checked: false },
      { id: 'concretePorchWork', description: 'Concrete Porch Work:', quantity: 0, rentalPrice: 1500, airbnbPrice: 1500, price: 1500, extended: 0, checked: false },
      { id: 'newAC', description: 'New AC:', quantity: 0, rentalPrice: 3500, airbnbPrice: 3500, price: 3500, extended: 0, checked: false },
      { id: 'newFurnace', description: 'New Furnace:', quantity: 0, rentalPrice: 3500, airbnbPrice: 3500, price: 3500, extended: 0, checked: false },
      { id: 'waterHeater', description: 'Water Heater:', quantity: 0, rentalPrice: 1500, airbnbPrice: 1500, price: 1500, extended: 0, checked: false },
      { id: 'smokeCoDetectors', description: 'Smoke/CO2 Detectors:', quantity: 0, rentalPrice: 50, airbnbPrice: 50, price: 50, extended: 0, checked: false },
      { id: 'windowBlinds', description: 'Window Blinds:', quantity: 0, rentalPrice: 35, airbnbPrice: 60, price: 35, extended: 0, checked: false },
    ],
    contingency: [
      { id: 'unexpectedPerFoot', description: 'Unexpected Per Foot:', quantity: 0, rentalPrice: 5, airbnbPrice: 5, price: 5, extended: 0, checked: false },
      { id: 'customItem1', description: '', quantity: 0, rentalPrice: 0, airbnbPrice: 0, price: 0, extended: 0, checked: false },
    ],
  })
  const [expandedYears, setExpandedYears] = useState({})
  const [saleInputs, setSaleInputs] = useState({
    agentCommission: 6,
    closingCosts: 1,
    timeOnMarket: 2,
    marginalTaxRate: 24  // Add default value of 24%
  })
// Use the type alias you just created
const [calculatedOutput, setCalculatedOutput] = useState<CalculatedOutputType>({});

  const [isCalculated, setIsCalculated] = useState(false);
  const [userDetails] = useState({
    name: '',
    phone: '',
    email: ''
  });

  // Add this near the top of your component
  const isInitialMount = useRef(true);
  const previousRehabStrategy = useRef(rehabStrategy);
  const previousPropertyDetails = useRef(propertyDetails);

  // Move calculateTotalRehabCost up here
  const calculateTotalRehabCost = useCallback((state = rehabDetails) => {
    log('Calculating total rehab cost');
    return Object.values(state).reduce((total, category) => 
      total + category.reduce((categoryTotal, item) => 
        categoryTotal + (item.checked ? item.extended : 0), 0)
    , 0);
  }, [rehabDetails]);

  // Move this effect after calculateTotalRehabCost definition
  useEffect(() => {
    const totalRehabCost = calculateTotalRehabCost();
    if (totalRehabCost > 0) {
      log('Updating deal details with new rehab cost', { totalRehabCost });
      setDealDetails(prevDetails => ({
        ...prevDetails,
        rehabCost: totalRehabCost.toFixed(2)
      }));
    }
  }, [rehabDetails, calculateTotalRehabCost]); // Add calculateTotalRehabCost to dependencies

  // Replace the existing useEffect with these two separate effects
  useEffect(() => {
    log('Initial setup');
    setActiveTab('property');
  }, []); // This effect only runs once on mount

  useEffect(() => {
    // Skip the first render and check if values actually changed
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousRehabStrategy.current = rehabStrategy;
      previousPropertyDetails.current = propertyDetails;
      return;
    }

    // Check if we actually need to update
    const strategyChanged = previousRehabStrategy.current !== rehabStrategy;
    const detailsChanged = JSON.stringify(previousPropertyDetails.current) !== JSON.stringify(propertyDetails);
    
    if (!strategyChanged && !detailsChanged) {
      return;
    }

    // Update refs
    previousRehabStrategy.current = rehabStrategy;
    previousPropertyDetails.current = propertyDetails;

    log('Updating rehab details due to changes', { strategyChanged, detailsChanged });

    // Only update if we have valid property details
    if (propertyDetails.squareFootage || propertyDetails.bedrooms || propertyDetails.bathrooms) {
      const isFlipAirbnb = rehabStrategy === 'flipAirbnb';
      const squareFootage = parseFloat(propertyDetails.squareFootage) || 0;
      const bathroomCount = Math.ceil(parseFloat(propertyDetails.bathrooms) || 0);
      const bedroomCount = Math.ceil(parseFloat(propertyDetails.bedrooms) || 0);
      const doorCount = bedroomCount + bathroomCount + 1;

      setRehabDetails(prevState => {
        const newState = { ...prevState };

        (Object.keys(newState) as Array<keyof typeof newState>).forEach(category => {
          newState[category].forEach(item => {
            // Set the price based on the strategy
            item.price = isFlipAirbnb ? item.airbnbPrice : item.rentalPrice;

            // Update quantities based on property details
            if (item.id === 'unexpectedPerFoot') {
              item.quantity = squareFootage;
            } else if (item.id.startsWith('customItem')) {
              // Keep existing quantity
            } else if (['lvpFlooring', 'carpeting', 'drywall', 'interiorPaint', 'unexpectedPerFoot'].includes(item.id)) {
              item.quantity = squareFootage;
            } else if (['newBathroom', 'newVanity', 'newMirrorLight', 'newToilet'].includes(item.id)) {
              item.quantity = bathroomCount;
            } else if (['doorKnobs', 'newInteriorDoors'].includes(item.id)) {
              item.quantity = doorCount;
            } else if (item.id === 'newExteriorDoors') {
              item.quantity = 2;
            } else if (['newWindows', 'windowBlinds'].includes(item.id)) {
              item.quantity = 10;
            } else if (item.id === 'smokeCoDetectors') {
              item.quantity = bedroomCount + 2;
            } else if (category === 'kitchen' || ['newRoof', 'electrical', 'landscaping', 'basementDryLock', 'concretePorchWork', 
                                                'newAC', 'newFurnace', 'waterHeater', 'exteriorPaint', 'newSidingFascia'].includes(item.id)) {
              item.quantity = 1;
            }

            // Calculate extended price
            item.extended = item.checked ? item.price * item.quantity : 0;
          });
        });

        return newState;
      });
    }
  }, [propertyDetails, rehabStrategy]);

  useEffect(() => {
    log('Component mounted');
    if (dealDetails.afterRepairValue) {
      updateAnnualPropertyTax(dealDetails.afterRepairValue);
    }
    if (rentalDetails.monthlyRent) {
      updateLeaseUpFee(rentalDetails.monthlyRent);
    }
  }, [dealDetails.afterRepairValue, rentalDetails.monthlyRent]);

  useEffect(() => {
    setActiveTab('property')
  }, [investmentType])

  const resetCalculationState = () => {
    log('Resetting calculation state');
    setCalculatedOutput({});
    setIsCalculated(false);
    setExpandedYears({});
  };

  const handleInvestmentTypeChange = (type: InvestmentType) => {
    log('Changing investment type to:', type);
    setInvestmentType(type);
    
    // Get available tabs for the new investment type
    const availableTabs = getTabsForInvestmentType(type).map(tab => tab.value);
    
    // If current active tab is not available in new investment type,
    // switch to first available tab
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
    // Otherwise, keep the current tab
    
    resetCalculationState();
  };

  const handlePropertyDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    log('Property details changed', { name, value });
    
    resetCalculationState();
    
    setPropertyDetails(prevDetails => ({
      ...prevDetails,
      [name]: value
    }));
    
    // The useEffect will handle updating rehab details automatically
    // when propertyDetails changes, so we don't need to call updateRehabDetails here
  };

  const handleDealDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    resetCalculationState();
    
    setDealDetails(prevDetails => {
      const newDetails = { ...prevDetails, [name]: value };
      
      if (name === 'purchasePrice') {
        // Calculate ARV based on purchase price and rehab cost
        const purchasePrice = parseFloat(value) || 0;
        const rehabCost = parseFloat(prevDetails.rehabCost) || 0;
        newDetails.afterRepairValue = (purchasePrice + (1.5 * rehabCost)).toFixed(2);
        newDetails.closingCosts = (purchasePrice * 0.01).toFixed(2);
        updateAnnualPropertyTax(newDetails.afterRepairValue);
      } else if (name === 'rehabCost') {
        // Recalculate ARV when rehab cost changes
        const purchasePrice = parseFloat(prevDetails.purchasePrice) || 0;
        const rehabCost = parseFloat(value) || 0;
        newDetails.afterRepairValue = (purchasePrice + (1.5 * rehabCost)).toFixed(2);
        updateAnnualPropertyTax(newDetails.afterRepairValue);
        
        // Set holding period based on rehab cost
        newDetails.holdingPeriod = calculateDefaultRehabDuration(rehabCost).toString();
      } else if (name === 'afterRepairValue') {
        updateAnnualPropertyTax(value);
      }
      
      return newDetails;
    });
  };

  const handleShortTermFinancingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetCalculationState();
    setShortTermFinancing({ ...shortTermFinancing, [e.target.name]: e.target.value });
  };

  const handleFinancingDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetCalculationState();
    setFinancingDetails({ ...financingDetails, [e.target.name]: e.target.value });
  };

  const handleRentalDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    resetCalculationState();
    
    setRentalDetails(prevDetails => {
      const newDetails = { ...prevDetails, [name]: value };
      
      if (name === 'monthlyRent') {
        updateLeaseUpFee(value);
      }
      
      return newDetails;
    });
  };

  const handleRentalTypeChange = (value: string) => {
    resetCalculationState();
    setRentalDetails({ ...rentalDetails, rentalType: value });
  };

  const handleRehabStrategyChange = (value: string) => {
    log('Rehab strategy changed', { value });
    resetCalculationState();
    setRehabStrategy(value);
    // Remove the updateRehabDetails call since the useEffect will handle this
  };

  const handleRehabDetailsChange = (category: string, id: string, field: string, value: string | boolean | number) => {
    log('Updating rehab details', { category, id, field, value });
    
    resetCalculationState();
    
    setRehabDetails(prevState => {
      // Create a deep copy of the previous state
      const newState: RehabCategory = JSON.parse(JSON.stringify(prevState));

      // Find and update the specific item
      if (category in newState) {
        const items = newState[category as keyof RehabCategory];
        const itemIndex = items.findIndex(item => item.id === id);
        
        if (itemIndex !== -1) {
          const item = items[itemIndex];
          
          // Update the specified field
          if (field === 'checked') {
            item.checked = value as boolean;
          } else if (field === 'description') {
            item.description = value as string;
          } else if (field === 'quantity' || field === 'price') {
            item[field] = parseFloat(value as string) || 0;
          }

          // Calculate extended price based on rehab strategy
          if (rehabStrategy === 'rental') {
            item.extended = item.checked ? item.quantity * item.rentalPrice : 0;
          } else {
            item.extended = item.checked ? item.quantity * item.airbnbPrice : 0;
          }

          // If price field was updated, update both rental and airbnb prices
          if (field === 'price') {
            const newPrice = parseFloat(value as string) || 0;
            item.rentalPrice = newPrice;
            item.airbnbPrice = newPrice;
          }
        }
      }

      return newState;
    });
  };

  const handleSaleInputsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetCalculationState();
    setSaleInputs({ ...saleInputs, [e.target.name]: parseFloat(e.target.value) });
  };

  const handleSave = async () => {
    log('Saving investment details...');
    
    if (!isCalculated) {
      calculateInvestment();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const doc = new jsPDF();
    let yPos = 40;
    
    // Define a type for the section content function
    type SectionContentFunction = () => void;

    // Update the addSection function signature
    const addSection = (title: string, content: SectionContentFunction) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(41, 128, 185);
      doc.rect(0, yPos - 15, 220, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(title, 10, yPos - 8);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      content();
    };
    
    // Title bar
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 220, 25, 'F');
    
    // Title (centered)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${investmentType.toUpperCase()} Investment Analysis`, 105, 15, { align: "center" });
    
    // Key Metrics Section
    doc.setFillColor(41, 128, 185);
    doc.rect(0, yPos - 15, 220, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("KEY METRICS", 10, yPos - 8);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    yPos += 10;
    
    if (investmentType === 'buyAndHold') {
      const roi = calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash;
      const totalReturn = calculatedOutput[1]?.yearlyTotals?.totalReturn;
      const cashRequired = findMaxTotalCashInvested(calculatedOutput);
      
      setTextColorForValue(doc, roi);
      doc.text(`Annual Return on Invested Cash: ${!roi || isNaN(roi) ? 'No Input' : roi === Infinity ? '∞' : roi.toFixed(2) + '%'}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, totalReturn);
      doc.text(`Total Return: ${formatPDFNumber(totalReturn)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, cashRequired);
      doc.text(`Cash Required: ${formatPDFNumber(cashRequired)}`, 10, yPos);
      yPos += 15;
    } else if (investmentType === 'brrrr') {
      const cashRequired = findMaxTotalCashInvested(calculatedOutput);
      const afterRefinance = findMinTotalCashInvested(calculatedOutput, 'brrrr', dealDetails);
      const roi = calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash;
      const totalReturn = calculatedOutput[1]?.yearlyTotals?.totalReturn;
      const brrrPercentage = calculateBrrrPercentage();
      
      setTextColorForValue(doc, cashRequired);
      doc.text(`Cash Required: ${formatPDFNumber(cashRequired)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, afterRefinance);
      doc.text(`After Refinance Cash Invested: ${formatPDFNumber(afterRefinance)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, roi);
      doc.text(`Annual Return on Invested Cash: ${!roi || isNaN(roi) ? 'No Input' : roi === Infinity ? '∞' : roi.toFixed(2) + '%'}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, totalReturn);
      doc.text(`Total Return: ${formatPDFNumber(totalReturn)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, brrrPercentage);
      doc.text(`BRRRR Percentage: ${!brrrPercentage || isNaN(brrrPercentage) ? 'No Input' : brrrPercentage.toFixed(2) + '%'}`, 10, yPos);
      yPos += 15;
    } else if (investmentType === 'flip') {
      const cashRequired = findMaxTotalCashInvested(calculatedOutput);
      const profit = calculateProfit();
      const profitAfterTax = profit * (1 - parseFloat(saleInputs.marginalTaxRate) / 100);
      
      setTextColorForValue(doc, cashRequired);
      doc.text(`Cash Required: ${formatPDFNumber(cashRequired)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, profit);
      doc.text(`Profit: ${formatPDFNumber(profit)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, profitAfterTax);
      doc.text(`Profit After Tax: ${formatPDFNumber(profitAfterTax)}`, 10, yPos);
      yPos += 15;
    }

    // Property Overview
    addSection("Property Overview", () => {
      yPos += 10;
      doc.text(`Address: ${propertyDetails.address}`, 10, yPos);
      doc.text(`Square Footage: ${propertyDetails.squareFootage}`, 120, yPos);
      yPos += 7;
      doc.text(`Bedrooms: ${propertyDetails.bedrooms}`, 10, yPos);
      doc.text(`Bathrooms: ${propertyDetails.bathrooms}`, 120, yPos);
      yPos += 15;
    });

    // Deal Structure
    addSection("Deal Structure", () => {
      yPos += 10;
      doc.text(`Purchase Price: $${formatNumber(parseFloat(dealDetails.purchasePrice))}`, 10, yPos);
      doc.text(`After Repair Value: $${formatNumber(parseFloat(dealDetails.afterRepairValue))}`, 120, yPos);
      yPos += 7;
      doc.text(`Rehab Cost: $${formatNumber(parseFloat(dealDetails.rehabCost))}`, 10, yPos);
      doc.text(`Rehab Duration: ${dealDetails.holdingPeriod} months`, 120, yPos);
      yPos += 15;
    });

    // Financing Details
    addSection("Financing", () => {
      yPos += 10;
      if (investmentType === 'brrrr' || investmentType === 'flip') {
        doc.text("Short Term Financing:", 10, yPos);
        yPos += 7;
        doc.text(`Interest Rate: ${shortTermFinancing.interestRate}%`, 15, yPos);
        doc.text(`Points: ${shortTermFinancing.lendersPoints}`, 120, yPos);
        yPos += 7;
        doc.text(`Purchase Loaned: ${shortTermFinancing.purchaseLoaned}%`, 15, yPos);
        doc.text(`Rehab Loaned: ${shortTermFinancing.rehabLoaned}%`, 120, yPos);
        yPos += 10;
      }
      
      if (investmentType !== 'flip') {
        doc.text("Long Term Financing:", 10, yPos);
        yPos += 7;
        doc.text(`Interest Rate: ${financingDetails.interestRate}%`, 15, yPos);
        doc.text(`Term: ${financingDetails.loanTerm} years`, 120, yPos);
        yPos += 7;
        doc.text(`LTV: ${financingDetails.loanToValue}%`, 15, yPos);
        doc.text(`Points: ${financingDetails.lenderPoints}`, 120, yPos);
      }
      yPos += 15;
    });

    // Rehab Details
    addSection("Rehab Details", () => {
      yPos += 10;
      Object.entries(rehabDetails).forEach(([category, items]) => {
        const selectedItems = items.filter(item => item.checked);
        if (selectedItems.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.text(category.charAt(0).toUpperCase() + category.slice(1), 10, yPos);
          yPos += 7;
          
          doc.setFont("helvetica", "normal");
          selectedItems.forEach(item => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(`${item.description}: $${formatNumber(item.extended)}`, 15, yPos);
            yPos += 7;
          });
          yPos += 3;
        }
      });
    });

    // Annual Projections
    if (investmentType !== 'flip') {
      addSection("5 Year Projections", () => {
        yPos += 10;
        // Headers
        const headers = ['Year', 'Value', 'Equity', 'Cash Flow', 'ROI'];
        const colWidths = [30, 40, 40, 40, 30];
        headers.forEach((header, i) => {
          const x = 10 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.text(header, x, yPos);
        });
        yPos += 7;
        
        // Data rows
        for (let year = 1; year <= 5; year++) {
          const yearData = calculatedOutput[year];
          if (yearData) {
            const values = [
              year.toString(),
              `$${formatNumber(yearData.months[12].value)}`,
              `$${formatNumber(yearData.months[12].equity)}`,
              `$${formatNumber(yearData.yearlyTotals.cashFlow)}`,
              `${formatNumber(yearData.yearlyTotals.returnOnInvestedCash)}%`
            ];
            
            values.forEach((value, i) => {
              const x = 10 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
              doc.text(value, x, yPos);
            });
            yPos += 7;
          }
        }
      });
    }

    // Save the PDF with dynamic filename
    const pdfBlob = doc.output('blob');
    const filename = propertyDetails.address 
      ? `${propertyDetails.address.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      : 'RE_Calculator.pdf';
    saveAs(pdfBlob, filename);
    
    log('PDF saved successfully', { filename });
  };

  // Helper function to calculate profit for flips
  const calculateProfit = () => {
    const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
    const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
    const purchasePrice = parseFloat(dealDetails.purchasePrice) || 0;
    const initialClosingCosts = parseFloat(dealDetails.closingCosts) || 0;
    const agentCommission = parseFloat(saleInputs.agentCommission) / 100 || 0;
    const saleClosingCosts = parseFloat(saleInputs.closingCosts) / 100 || 0;
    const totalCashFlow = calculateTotalCashFlow(calculatedOutput);
    
    return (afterRepairValue - rehabCost - purchasePrice - initialClosingCosts) - 
           (afterRepairValue * (agentCommission + saleClosingCosts)) + 
           totalCashFlow;
  };

  const handleSendToOffLeash = () => {
    log('Opening send to Off Leash dialog');
    // Since we're not using a dialog, let's just trigger the email directly
    const subject = encodeURIComponent(`${propertyDetails.address} - Estimated Rehab: $${formatNumber(parseFloat(dealDetails.rehabCost))}`);
    const body = encodeURIComponent(`Name: ${userDetails.name}
Phone: ${userDetails.phone}
Email: ${userDetails.email}

Investment Details:
Address: ${propertyDetails.address}
Estimated Rehab: $${formatNumber(parseFloat(dealDetails.rehabCost))}
Purchase Price: $${formatNumber(parseFloat(dealDetails.purchasePrice))}
After Repair Value: $${formatNumber(parseFloat(dealDetails.afterRepairValue))}`);

    // Create and trigger mailto link
    const mailtoLink = `mailto:info@offleashconstruction.com?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
    
    log('Email prepared and mailto link triggered');
  }

  const calculateInvestment = () => {
    console.log('Calculating investment...', { 
      investmentType, 
      propertyDetails, 
      dealDetails, 
      shortTermFinancing, 
      financingDetails, 
      rentalDetails, 
      rehabDetails, 
      saleInputs 
    });
    
    // Clear previous calculations
    setCalculatedOutput({});
    
    // Reset expanded years
    setExpandedYears({});

    // Perform new calculations
    calculateOutput();

    // If it's a flip, automatically expand year 1
    if (investmentType === 'flip') {
      setExpandedYears(prev => ({
        ...prev,
        1: true
      }));
    }

    // Set isCalculated to true
    setIsCalculated(true);
  };

  const calculateOutput = () => {
    log('Recalculating investment with updated expense calculation');
    const newOutput: CalculatedOutputType = {};
    const purchasePrice = parseFloat(dealDetails.purchasePrice) || 0;
    const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
    const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
    
    // Ensure minimum rehab duration of 1 month for BRRRR and flip
    const rehabDuration = (investmentType === 'brrrr' || investmentType === 'flip') 
      ? Math.max(1, parseInt(dealDetails.holdingPeriod) || 0)
      : parseInt(dealDetails.holdingPeriod) || 0;
    
    // Add this line to calculate monthly appreciation rate
    const annualAppreciation = parseFloat(rentalDetails.annualAppreciation) / 100 || 0;
    const monthlyAppreciation = Math.pow(1 + annualAppreciation, 1/12) - 1;
    
    // Calculate the month when the property will be sold for flips
    const saleMonth = investmentType === 'flip' ? rehabDuration + rehabDuration + 1 : 0;
    
    // Long term financing details
    const loanToValue = parseFloat(financingDetails.loanToValue) / 100;
    const longTermInterestRate = parseFloat(financingDetails.interestRate) / 100 / 12; // monthly rate
    const loanTermMonths = parseInt(financingDetails.loanTerm) * 12;
    const longTermLenderPoints = parseFloat(financingDetails.lenderPoints) / 100;

    // Short term financing details
    const purchaseLoaned = parseFloat(shortTermFinancing.purchaseLoaned) / 100;
    const rehabLoaned = parseFloat(shortTermFinancing.rehabLoaned) / 100;
    const shortTermInterestRate = parseFloat(shortTermFinancing.interestRate) / 100 / 12; // monthly rate
    const shortTermLenderPoints = parseFloat(shortTermFinancing.lendersPoints) / 100;

    const calculateMortgagePayment = (principal: number, rate: number, termMonths: number) => {
      return (principal * rate * Math.pow(1 + rate, termMonths)) / (Math.pow(1 + rate, termMonths) - 1);
    };

    let debt, monthlyPayment, interestPaid;
    // Remove cumulativeCashInvested variable

    const calculateExpenses = (year: number, month: number, monthlyRent: number, interestPaid: number, principalPaid: number, isRehabPeriod: boolean) => {
      console.log('Calculating expenses for year:', year, 'month:', month, 'isRehabPeriod:', isRehabPeriod);
      const annualAppreciation = parseFloat(rentalDetails.annualAppreciation) / 100 || 0;
      const annualInsurance = parseFloat(rentalDetails.annualInsurance) || 0;
      const annualPropertyTax = parseFloat(rentalDetails.annualPropertyTax) || 0;
      
      // Apply appreciation only from year 2 onwards
      const appreciationFactor = year > 1 ? Math.pow(1 + annualAppreciation, year - 1) : 1;
      
      let expenses = appreciationFactor * (annualInsurance / 12 + annualPropertyTax / 12);

      if (rentalDetails.rentalType === 'longTerm') {
        const annualMaintenance = parseFloat(rentalDetails.annualMaintenance) / 100 || 0;
        const vacancyRate = parseFloat(rentalDetails.vacancyRate) / 100 || 0;
        const annualCapex = parseFloat(rentalDetails.annualCapex) / 100 || 0;
        const pmFee = parseFloat(rentalDetails.pmFee) / 100 || 0;
        const leaseUpFee = parseFloat(rentalDetails.leaseUpFee) || 0;
        const averageLeaseLength = parseFloat(rentalDetails.averageLeaseLength) || 1;

        expenses += monthlyRent * (annualMaintenance + vacancyRate + annualCapex + pmFee) +
                    leaseUpFee / (12 * averageLeaseLength);
      } else if (rentalDetails.rentalType === 'shortMidTerm') {
        const annualMaintenance = parseFloat(rentalDetails.annualMaintenance) / 100 || 0;
        const vacancyRate = parseFloat(rentalDetails.vacancyRate) / 100 || 0;
        const annualCapex = parseFloat(rentalDetails.annualCapex) / 100 || 0;
        const pmFee = parseFloat(rentalDetails.shortTermPmFee) / 100 || 0;
        const personalUsage = parseFloat(rentalDetails.personalUsage) / 100 || 0;

        expenses += monthlyRent * (annualMaintenance + vacancyRate + annualCapex + pmFee + personalUsage);
      }

      // Add interest paid to expenses during rehab period for BRRRR and Flip
      if (isRehabPeriod && (investmentType === 'brrrr' || investmentType === 'flip')) {
        expenses += Math.abs(interestPaid);
      }

      // Add the entire mortgage payment (interest + principal) to expenses only after rehab period
      if (!isRehabPeriod) {
        expenses += Math.abs(interestPaid) + Math.abs(principalPaid);
      }

      console.log('Calculated expenses:', expenses);
      return isNaN(expenses) ? 0 : expenses;
    };

    const calculateRent = (year: number, month: number) => {
      console.log('Calculating rent for year:', year, 'month:', month);
      if (rentalDetails.rentalType === 'noRental') {
        console.log('No rental, returning 0');
        return 0;
      }

      const totalMonths = (year - 1) * 12 + month;
      const rehabDuration = parseInt(dealDetails.holdingPeriod) || 0;

      if (totalMonths <= rehabDuration) {
        console.log('Still in rehab period, no rent');
        return 0;
      }

      const monthsSinceRehab = totalMonths - rehabDuration;
      const yearsElapsed = Math.floor(monthsSinceRehab / 12);
      
      // Use the monthly rent from rentalDetails
      const baseMonthlyRent = parseFloat(rentalDetails.monthlyRent) || 0;
      const calculatedRent = baseMonthlyRent * Math.pow(1 + (parseFloat(rentalDetails.annualAppreciation) / 100), yearsElapsed);
      
      console.log('Calculated rent:', calculatedRent);
      return calculatedRent;
    };

    console.log('Calculating investment with debt as negative numbers');

    let runningTotalCashInvested = 0;

    for (let year = 1; year <= 30; year++) {
      newOutput[year] = {
        months: {},
        yearlyTotals: {
          interestPaid: 0,
          rent: 0,
          expenses: 0,
          cashFlow: 0,
          equityGrowth: 0,
          totalReturn: 0,
          cashInvested: 0,
          totalCashInvested: 0,
          dscr: 0, // This will be updated after processing all months
        }
      };

      for (let month = 1; month <= 12; month++) {
        const totalMonths = (year - 1) * 12 + month;
        let value, equityGrowth = 0, cashFlow = 0, expenses = 0;
        let cashInvested = 0;
        const rent = calculateRent(year, month);
        let principalPaid = 0;
        const isRehabPeriod = totalMonths <= rehabDuration;

        if (investmentType === 'flip') {
          if (totalMonths < saleMonth) {
            // Before sale
            if (isRehabPeriod) {
              value = purchasePrice;
              debt = purchaseLoaned * purchasePrice + rehabLoaned * rehabCost;
              interestPaid = debt * shortTermInterestRate;
              if (totalMonths === 1) {
                cashInvested = (1 - purchaseLoaned) * purchasePrice + 
                              (1 - rehabLoaned) * rehabCost + 
                              shortTermLenderPoints * (purchaseLoaned * purchasePrice + rehabLoaned * rehabCost);
              }
              expenses = calculateExpenses(year, month, rent, interestPaid, principalPaid, isRehabPeriod);
              cashFlow = rent - expenses;
              // Remove both equityGrowth and totalReturn calculations here
              // They will be calculated later in the code
            } else {
              value = afterRepairValue;
              debt = purchaseLoaned * purchasePrice + rehabLoaned * rehabCost;
              interestPaid = debt * shortTermInterestRate;
              cashFlow = rent - expenses;
            }
          } else if (totalMonths === saleMonth) {
            // Month of sale
            const agentCommissionRate = parseFloat(saleInputs.agentCommission) / 100;
            const closingCostsRate = parseFloat(saleInputs.closingCosts) / 100;
            const previousMonthDebt = newOutput[year].months[parseInt(month) - 1]?.debt || 0;
            
            value = 0;
            debt = 0;
            interestPaid = 0;
            cashInvested = -1 * (afterRepairValue * (1 - agentCommissionRate - closingCostsRate) - previousMonthDebt);
            cashFlow = 0;
            // equityGrowth and totalReturn will be set to 0 later
          } else {
            // After sale - all values set to 0
            value = 0;
            debt = 0;
            interestPaid = 0;
            cashInvested = 0;
            cashFlow = 0;
            // equityGrowth and totalReturn will be set to 0 later
          }
        } else if (investmentType === 'buyAndHold') {
          if (totalMonths === 1) {
            // Calculate initial cash investment
            const downPayment = purchasePrice * (1 - loanToValue);
            const closingCost = parseFloat(dealDetails.closingCosts) || 0;
            const lenderPointsCost = (purchasePrice * loanToValue) * (longTermLenderPoints);
            const rehabCostAmount = parseFloat(dealDetails.rehabCost) || 0;
            
            cashInvested = downPayment + closingCost + lenderPointsCost + rehabCostAmount;
            
            log('Initial cash investment calculated:', {
              downPayment,
              closingCost,
              lenderPointsCost,
              rehabCostAmount,
              cashInvested
            });

            value = rehabDuration === 0 ? afterRepairValue : purchasePrice;
            debt = purchasePrice * loanToValue;
            monthlyPayment = calculateMortgagePayment(debt, longTermInterestRate, loanTermMonths);
            log('Month 1 value set:', { value, rehabDuration, afterRepairValue, purchasePrice });
          } else if (totalMonths <= rehabDuration) {
            // During rehab period (if any), maintain purchase price
            value = purchasePrice;
            log('During rehab, maintaining purchase price:', { value, purchasePrice });
          } else if (totalMonths === rehabDuration + 1) {
            // First month after rehab (if any), jump to ARV
            value = afterRepairValue;
            log('Setting to ARV:', { value, afterRepairValue });
          } else {
            // Apply monthly appreciation
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            const prevValue = newOutput[prevYear]?.months[prevMonth]?.value || afterRepairValue;
            value = prevValue * (1 + monthlyAppreciation);
            log('Monthly appreciation applied:', { 
              value, 
              prevValue, 
              monthlyAppreciation, 
              totalMonths, 
              month, 
              year 
            });
          }
          
          interestPaid = debt * longTermInterestRate;
          principalPaid = monthlyPayment - interestPaid;
          debt -= principalPaid;
        } else if (investmentType === 'brrrr') {
          if (isRehabPeriod) {
            value = purchasePrice;
            debt = purchaseLoaned * purchasePrice + rehabLoaned * rehabCost;
            interestPaid = debt * shortTermInterestRate;
            if (totalMonths === 1) {
              cashInvested = (1 - purchaseLoaned) * purchasePrice + (1 - rehabLoaned) * rehabCost + 
                             shortTermLenderPoints * (purchaseLoaned * purchasePrice + rehabLoaned * rehabCost);
            }
          } else if (totalMonths === rehabDuration + 1) {
            value = afterRepairValue;
            debt = afterRepairValue * loanToValue;
            monthlyPayment = calculateMortgagePayment(debt, longTermInterestRate, loanTermMonths);
            interestPaid = debt * longTermInterestRate;
            principalPaid = monthlyPayment - interestPaid;
            debt -= principalPaid;
            const refinanceCashFlow = (afterRepairValue * loanToValue) - 
                                      (purchaseLoaned * purchasePrice + rehabLoaned * rehabCost) - 
                                      (longTermLenderPoints * afterRepairValue * loanToValue);
            cashInvested = -refinanceCashFlow; // This can be negative if cash is pulled out
          } else {
            const monthsSinceRehab = totalMonths - rehabDuration - 1;
            value = afterRepairValue * Math.pow(1 + monthlyAppreciation, monthsSinceRehab);
            interestPaid = debt * longTermInterestRate;
            principalPaid = monthlyPayment - interestPaid;
            debt -= principalPaid;
          }
        } else if (investmentType === 'flip') {
          if (isRehabPeriod) {
            value = purchasePrice;
            debt = purchaseLoaned * purchasePrice + rehabLoaned * rehabCost;
            interestPaid = debt * shortTermInterestRate;
            if (totalMonths === 1) {
              cashInvested = (1 - purchaseLoaned) * purchasePrice + (1 - rehabLoaned) * rehabCost + 
                             shortTermLenderPoints * (purchaseLoaned * purchasePrice + rehabLoaned * rehabCost);
            }
          } else {
            value = afterRepairValue;
            debt = 0;
            interestPaid = 0;
            cashInvested = 0;
          }
        }

        expenses = calculateExpenses(year, month, rent, interestPaid, principalPaid, isRehabPeriod);
        cashFlow = rent - expenses;

        const equity = value - debt;
        if (month > 1 || year > 1) {
          const prevMonth = month === 1 ? 12 : month - 1;
          const prevYear = month === 1 ? year - 1 : year;
          equityGrowth = equity - newOutput[prevYear].months[prevMonth].equity;
        }

        runningTotalCashInvested += cashInvested;

        const totalMortgagePayment = Math.abs(interestPaid) + Math.abs(principalPaid);
        const dscr = rent === 0 ? 0 : (rent - Math.abs(expenses) + totalMortgagePayment) / totalMortgagePayment;

        newOutput[year].months[month] = {
          value: roundToDollar(value),
          debt: roundToDollar(debt),
          displayDebt: roundToDollar(-debt),
          equity: roundToDollar(equity),
          cashInvested: roundToDollar(cashInvested),
          displayCashInvested: roundToDollar(cashInvested),
          totalCashInvested: roundToDollar(runningTotalCashInvested),
          interestPaid: roundToDollar(-Math.abs(interestPaid)),
          rent: roundToDollar(rent),
          expenses: roundToDollar(-Math.abs(expenses)),
          cashFlow: investmentType === 'flip' && totalMonths >= saleMonth ? 0 : roundToDollar(cashFlow),
          equityGrowth: investmentType === 'flip' && totalMonths >= saleMonth ? 0 : roundToDollar(equityGrowth),
          totalReturn: investmentType === 'flip' && totalMonths >= saleMonth ? 0 : roundToDollar(cashFlow + equityGrowth),
          returnOnInvestedCash: runningTotalCashInvested <= 0 
            ? Infinity 
            : ((cashFlow + equityGrowth) / runningTotalCashInvested) * 100,
          isRehabPeriod: isRehabPeriod,
          dscr: isNaN(dscr) ? 0 : dscr,
        };

        // Ensure no NaN values
        for (const key in newOutput[year].months[month]) {
          if (isNaN(newOutput[year].months[month][key])) {
            newOutput[year].months[month][key] = 0;
          }
        }

        // Update yearly totals
        newOutput[year].yearlyTotals.interestPaid += interestPaid;
        newOutput[year].yearlyTotals.rent += rent;
        newOutput[year].yearlyTotals.expenses += expenses;
        newOutput[year].yearlyTotals.cashFlow += cashFlow;
        newOutput[year].yearlyTotals.equityGrowth += equityGrowth;
        newOutput[year].yearlyTotals.totalReturn += (cashFlow + equityGrowth);
        newOutput[year].yearlyTotals.cashInvested += cashInvested;
        newOutput[year].yearlyTotals.totalCashInvested = runningTotalCashInvested;
        // Remove the DSCR accumulation here
      }
      
      // Set the yearly DSCR to the last month's DSCR
      newOutput[year].yearlyTotals.dscr = newOutput[year].months[12].dscr;
      
      // Round the yearly totals
      newOutput[year].yearlyTotals.interestPaid = roundToDollar(newOutput[year].yearlyTotals.interestPaid);
      newOutput[year].yearlyTotals.rent = roundToDollar(newOutput[year].yearlyTotals.rent);
      newOutput[year].yearlyTotals.expenses = roundToDollar(newOutput[year].yearlyTotals.expenses);
      newOutput[year].yearlyTotals.cashFlow = roundToDollar(newOutput[year].yearlyTotals.cashFlow);
      newOutput[year].yearlyTotals.equityGrowth = roundToDollar(newOutput[year].yearlyTotals.equityGrowth);
      newOutput[year].yearlyTotals.totalReturn = roundToDollar(newOutput[year].yearlyTotals.totalReturn);
      newOutput[year].yearlyTotals.cashInvested = roundToDollar(newOutput[year].yearlyTotals.cashInvested);
      newOutput[year].yearlyTotals.returnOnInvestedCash = runningTotalCashInvested <= 0
        ? Infinity
        : (newOutput[year].yearlyTotals.totalReturn / runningTotalCashInvested) * 100;
    }

    console.log('Investment calculation completed with updated expense calculation:', newOutput);

    setCalculatedOutput(newOutput);
  };

  const updateAnnualPropertyTax = (afterRepairValue: string) => {
    const taxValue = (parseFloat(afterRepairValue) * 0.01).toFixed(2);
    setRentalDetails(prevDetails => ({
      ...prevDetails,
      annualPropertyTax: taxValue
    }));
  };

  const toggleYearExpansion = (year: number) => {
    setExpandedYears(prevState => ({
      ...prevState,
      [year]: !prevState[year]
    }))
  }

  const getTabsForInvestmentType = () => {
    switch (investmentType) {
      case 'buyAndHold':
        return [
          { value: 'property', label: 'Property Details' },
          { value: 'deal', label: 'Deal Details' },
          { value: 'rehab', label: 'Rehab Estimator' },
          { value: 'rental', label: 'Rental Details' },
          { value: 'longTerm', label: 'Long Term Financing' },
        ]
      case 'brrrr':
        return [
          { value: 'property', label: 'Property Details' },
          { value: 'deal', label: 'Deal Details' },
          { value: 'rehab', label: 'Rehab Estimator' },
          { value: 'rental', label: 'Rental Details' },
          { value: 'shortTerm', label: 'Short Term Financing' },
          { value: 'longTerm', label: 'Long Term Financing' },
        ]
      case 'flip':
        return [
          { value: 'property', label: 'Property Details' },
          { value: 'deal', label: 'Deal Details' },
          { value: 'rehab', label: 'Rehab Estimator' },
          { value: 'rental', label: 'Ongoing Expenses' },
          { value: 'shortTerm', label: 'Short Term Financing' },
          { value: 'sale', label: 'Sales Inputs' },
        ]
      default:
        return []
    }
  }

  // Update addCustomRehabItem to avoid immediate updates
  const addCustomRehabItem = () => {
    setRehabDetails(prevState => {
      const newState = {
        ...prevState,
        contingency: [
          ...prevState.contingency,
          { 
            id: `customItem${prevState.contingency.length}`, 
            description: '', 
            quantity: 1, 
            rentalPrice: 0, 
            airbnbPrice: 0, 
            price: 0, 
            extended: 0, 
            checked: true 
          }
        ]
      };
      return newState;
    });
  };

  const updateLeaseUpFee = (monthlyRent: string) => {
    const leaseUpFee = (parseFloat(monthlyRent) * 0.5).toFixed(2);
    setRentalDetails(prevDetails => ({
      ...prevDetails,
      leaseUpFee: leaseUpFee
    }));
  };

  // Move the calculateBrrrPercentage function inside the Page component
  const calculateBrrrPercentage = () => {
    log('Calculating BRRRR percentage');
    const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
    const loanToValue = parseFloat(financingDetails.loanToValue) / 100 || 0;
    const afterRefinanceCashInvested = findMinTotalCashInvested(calculatedOutput, investmentType, dealDetails);
    
    const percentage = ((afterRepairValue * (1 - loanToValue)) - afterRefinanceCashInvested) / 
                    (afterRepairValue * (1 - loanToValue)) * 100;
    
    log('BRRRR percentage calculated:', { percentage });
    return percentage;
  };

  // Helper function to format numbers with negative values
  const formatPDFNumber = (value: number, prefix: string = '$') => {
    if (isNaN(value)) return 'No Input';
    if (value === Infinity) return '∞';
    
    const isNegative = value < 0;
    const formattedValue = `${prefix}${formatNumber(Math.abs(value))}`;
    return isNegative ? `-${formattedValue}` : formattedValue;
  };

  // Helper function to set text color based on value
  const setTextColorForValue = (doc: jsPDF, value: number) => {
    doc.setTextColor(value < 0 ? 255 : 0, 0, 0);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 min-h-screen bg-background text-foreground transition-colors duration-300 max-w-7xl">
      {/* Update the header section */}
      <div className="flex flex-col sm:flex-row items-center justify-between py-6 mb-8 gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
          <Link 
            href="https://www.offleashconstruction.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <Image 
              src="/logo-menu.png"
              alt="Calculator Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">
            Real Estate Calculator
          </h1>
        </div>
      </div>

      {/* Replace the existing investment type card with this */}
      <Card className="mb-8 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Investment Type
          </CardTitle>
          <CardDescription className="text-base">
            Select your investment strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TooltipProvider>
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        investmentType === 'buyAndHold'
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary'
                      }`}
                      onClick={() => handleInvestmentTypeChange('buyAndHold')}
                    >
                      <Label className="cursor-pointer font-semibold">Buy and Hold</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Long-term rental property investment strategy
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Traditional rental property investment for long-term wealth building</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <TooltipProvider>
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        investmentType === 'brrrr'
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary'
                      }`}
                      onClick={() => handleInvestmentTypeChange('brrrr')}
                    >
                      <Label className="cursor-pointer font-semibold">BRRRR</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Buy, Rehab, Rent, Refinance, Repeat
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Strategy to recycle capital through renovation and refinancing</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <TooltipProvider>
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        investmentType === 'flip'
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary'
                      }`}
                      onClick={() => handleInvestmentTypeChange('flip')}
                    >
                      <Label className="cursor-pointer font-semibold">Flip</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Buy, Renovate, and Sell for profit
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Short-term strategy to generate profit through property renovation and sale</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Update the tabs section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full flex flex-wrap justify-start gap-2 p-1 bg-muted/20">
          {getTabsForInvestmentType().map((tab) => (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value} 
              className="flex-grow data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {/* Update tab content cards */}
        <TabsContent value="property">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Property Details
              </CardTitle>
              <CardDescription className="text-base">
                Enter the property specifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="address">Address</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Physical address of the property</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="address" name="address" value={propertyDetails.address} onChange={handlePropertyDetailsChange} />
                  </div>
                </TooltipProvider>
                
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="squareFootage">Square Footage</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>LIVABLE total area of the property in square feet</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="squareFootage" name="squareFootage" type="number" value={propertyDetails.squareFootage} onChange={handlePropertyDetailsChange} />
                  </div>
                </TooltipProvider>
                
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of bedrooms in the property</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="bedrooms" name="bedrooms" type="number" value={propertyDetails.bedrooms} onChange={handlePropertyDetailsChange} />
                  </div>
                </TooltipProvider>
                
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of bathrooms in the property</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="bathrooms" name="bathrooms" type="number" value={propertyDetails.bathrooms} onChange={handlePropertyDetailsChange} />
                  </div>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="deal">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Deal Details
              </CardTitle>
              <CardDescription className="text-base">
                Enter the financial details of the deal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="purchasePrice">Purchase Price</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Amount paid to acquire the property</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="purchasePrice" name="purchasePrice" type="number" value={dealDetails.purchasePrice} onChange={handleDealDetailsChange} />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="rehabCost">Rehab Cost</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Estimated cost for all renovations and repairs</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      id="rehabCost"
                      name="rehabCost"
                      type="number" 
                      value={dealDetails.rehabCost}
                      onChange={handleDealDetailsChange}
                      placeholder={calculateTotalRehabCost().toFixed(2)}
                    />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="holdingPeriod">Rehab Duration (months)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Expected time in months to complete the rehab</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="holdingPeriod" name="holdingPeriod" type="number" value={dealDetails.holdingPeriod} onChange={handleDealDetailsChange} />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="closingCosts">Closing Costs</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Costs associated with closing the deal, like title insurance, fees, and taxes</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="closingCosts" name="closingCosts" type="number" value={dealDetails.closingCosts} onChange={handleDealDetailsChange} />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="afterRepairValue">After Repair Value</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Estimated property value after all repairs and upgrades are completed</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="afterRepairValue" name="afterRepairValue" type="number" value={dealDetails.afterRepairValue} onChange={handleDealDetailsChange} />
                  </div>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rehab">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Rehab Estimator
              </CardTitle>
              <CardDescription className="text-base">
                Estimate the costs for various renovation items.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="rehabStrategy">Rehab Strategy</Label>
                <RadioGroup
                  onValueChange={handleRehabStrategyChange}
                  value={rehabStrategy}
                  className="flex space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rental" id="rental" />
                    <Label htmlFor="rental">Rental Grade</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flipAirbnb" id="flipAirbnb" />
                    <Label htmlFor="flipAirbnb">Flip/AirBNB Grade</Label>
                  </div>
                </RadioGroup>
              </div>
              {Object.entries(rehabDetails).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-semibold capitalize mb-2">{category}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price ($)</TableHead>
                        <TableHead>Extended Price ($)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={item.id} 
                                checked={item.checked}
                                onCheckedChange={(checked) => 
                                  handleRehabDetailsChange(category, item.id, 'checked', checked)
                                }
                              />
                              {item.id.startsWith('customItem') ? (
                  <Input
                                  value={item.description}
                                  onChange={(e) => handleRehabDetailsChange(category, item.id, 'description', e.target.value)}
                                  placeholder="Enter custom item description"
                                  className="w-full"
                                />
                              ) : (
                                <label htmlFor={item.id}>{item.description}</label>
                              )}
                </div>
                          </TableCell>
                          <TableCell>
                  <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleRehabDetailsChange(category, item.id, 'quantity', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleRehabDetailsChange(category, item.id, 'price', e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>${item.checked ? item.extended.toFixed(2) : '0.00'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {category === 'contingency' && (
                    <Button onClick={addCustomRehabItem} className="mt-2">
                      Add Another Line
                    </Button>
                  )}
                </div>
              ))}
              <div className="text-right text-lg font-semibold">
                Total Rehab Cost: ${calculateTotalRehabCost().toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rental">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                {investmentType === 'flip' ? 'Ongoing Expenses' : 'Rental Details'}
              </CardTitle>
              <CardDescription className="text-base">
                {investmentType === 'flip' 
                  ? 'Enter the expected ongoing expenses for the property.' 
                  : 'Enter the expected rental income and expenses.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="rentalType">Rental Type</Label>
                <Select onValueChange={handleRentalTypeChange} value={rentalDetails.rentalType}>
                  <SelectTrigger id="rentalType">
                    <SelectValue placeholder="Select rental type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="longTerm">Long Term Rental</SelectItem>
                    <SelectItem value="shortMidTerm">Short/Mid Term Rental</SelectItem>
                    <SelectItem value="noRental">No Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Common fields for all rental types */}
                <div className="space-y-2">
                  <Label htmlFor="annualAppreciation">Annual Appreciation (%)</Label>
                  <Input id="annualAppreciation" name="annualAppreciation" type="number" step="0.1" value={rentalDetails.annualAppreciation} onChange={handleRentalDetailsChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualInsurance">Annual Insurance</Label>
                  <Input id="annualInsurance" name="annualInsurance" type="number" value={rentalDetails.annualInsurance} onChange={handleRentalDetailsChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualPropertyTax">Annual Property Tax</Label>
                  <Input id="annualPropertyTax" name="annualPropertyTax" type="number" value={rentalDetails.annualPropertyTax} onChange={handleRentalDetailsChange} />
                </div>

                {/* Fields for Long Term Rental */}
                {rentalDetails.rentalType === 'longTerm' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="monthlyRent">Monthly Rent</Label>
                      <Input id="monthlyRent" name="monthlyRent" type="number" value={rentalDetails.monthlyRent} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualMaintenance">Annual Maintenance (%)</Label>
                      <Input id="annualMaintenance" name="annualMaintenance" type="number" step="0.1" value={rentalDetails.annualMaintenance} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualCapex">Annual CAPEX (%)</Label>
                      <Input id="annualCapex" name="annualCapex" type="number" step="0.1" value={rentalDetails.annualCapex} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pmFee">PM Fee/mo (%)</Label>
                      <Input id="pmFee" name="pmFee" type="number" step="0.1" value={rentalDetails.pmFee} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="averageLeaseLength">Average Lease Length (Yrs)</Label>
                      <Input id="averageLeaseLength" name="averageLeaseLength" type="number" step="0.1" value={rentalDetails.averageLeaseLength} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leaseUpFee">Lease Up Fee ($)</Label>
                      <Input id="leaseUpFee" name="leaseUpFee" type="number" value={rentalDetails.leaseUpFee} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vacancyRate">Vacancy Rate (%)</Label>
                      <Input id="vacancyRate" name="vacancyRate" type="number" step="0.1" value={rentalDetails.vacancyRate} onChange={handleRentalDetailsChange} />
                    </div>
                  </>
                )}

                {/* Fields for Short/Mid Term Rental */}
                {rentalDetails.rentalType === 'shortMidTerm' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="furnitureAndDecorations">Furniture & Decorations ($)</Label>
                      <Input id="furnitureAndDecorations" name="furnitureAndDecorations" type="number" value={rentalDetails.furnitureAndDecorations} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthlyRent">Monthly Rent</Label>
                      <Input id="monthlyRent" name="monthlyRent" type="number" value={rentalDetails.monthlyRent} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualMaintenance">Annual Maintenance (%)</Label>
                      <Input id="annualMaintenance" name="annualMaintenance" type="number" step="0.1" value={rentalDetails.annualMaintenance} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualCapex">Annual CAPEX (%)</Label>
                      <Input id="annualCapex" name="annualCapex" type="number" step="0.1" value={rentalDetails.annualCapex} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shortTermPmFee">PM Fee/mo (%)</Label>
                      <Input id="shortTermPmFee" name="shortTermPmFee" type="number" step="0.1" value={rentalDetails.shortTermPmFee} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="personalUsage">Personal Usage (%)</Label>
                      <Input id="personalUsage" name="personalUsage" type="number" step="0.1" value={rentalDetails.personalUsage} onChange={handleRentalDetailsChange} />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="shortTerm">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Short Term/Rehab Financing
              </CardTitle>
              <CardDescription className="text-base">
                Enter the details of your short term or rehab financing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="shortTermInterest">Short Term Finance Interest (%)</Label>
                  <Input id="shortTermInterest" name="interestRate" type="number" step="0.01" value={shortTermFinancing.interestRate} onChange={handleShortTermFinancingChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lendersPoints">Lender&apos;s Points</Label>
                  <Input id="lendersPoints" name="lendersPoints" type="number" step="0.1" value={shortTermFinancing.lendersPoints} onChange={handleShortTermFinancingChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseLoaned">Amount of Purchase Loaned (%)</Label>
                  <Input id="purchaseLoaned" name="purchaseLoaned" type="number" step="0.1" value={shortTermFinancing.purchaseLoaned} onChange={handleShortTermFinancingChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rehabLoaned">Amount of Rehab Loaned (%)</Label>
                  <Input id="rehabLoaned" name="rehabLoaned" type="number" step="0.1" value={shortTermFinancing.rehabLoaned} onChange={handleShortTermFinancingChange} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="longTerm">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Long Term Financing Details
              </CardTitle>
              <CardDescription className="text-base">
                Enter the details of your long term financing arrangement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="loanTerm">Loan Term (years)</Label>
                  <Input id="loanTerm" name="loanTerm" type="number" value={financingDetails.loanTerm} onChange={handleFinancingDetailsChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input id="interestRate" name="interestRate" type="number" step="0.01" value={financingDetails.interestRate} onChange={handleFinancingDetailsChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lenderPoints">Lender Points</Label>
                  <Input id="lenderPoints" name="lenderPoints" type="number" step="0.25" value={financingDetails.lenderPoints} onChange={handleFinancingDetailsChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loanToValue">Loan to Value (%)</Label>
                  <Input id="loanToValue" name="loanToValue" type="number" step="0.1" value={financingDetails.loanToValue} onChange={handleFinancingDetailsChange} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sale">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Sale Inputs
              </CardTitle>
              <CardDescription className="text-base">
                Enter the details related to the sale of the property.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="agentCommission">Agent Commission (%)</Label>
                  <Input
                    id="agentCommission"
                    name="agentCommission"
                    type="number"
                    step="0.1"
                    value={saleInputs.agentCommission}
                    onChange={handleSaleInputsChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closingCosts">Closing Costs (%)</Label>
                  <Input
                    id="closingCosts"
                    name="closingCosts"
                    type="number"
                    step="0.1"
                    value={saleInputs.closingCosts}
                    onChange={handleSaleInputsChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeOnMarket">Time on Market (months)</Label>
                  <Input
                    id="timeOnMarket"
                    name="timeOnMarket"
                    type="number"
                    value={saleInputs.timeOnMarket}
                    onChange={handleSaleInputsChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marginalTaxRate">Marginal Tax Rate (%)</Label>
                  <Input
                    id="marginalTaxRate"
                    name="marginalTaxRate"
                    type="number"
                    step="0.1"
                    value={saleInputs.marginalTaxRate}
                    onChange={handleSaleInputsChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update the action buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={calculateInvestment} 
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
        >
          Calculate Investment
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={handleSave} 
                  className="w-full shadow-lg hover:shadow-xl transition-all" 
                  disabled={!isCalculated}
                >
                  Save PDF
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isCalculated ? "Save your calculation as PDF" : "Calculate investment first"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={handleSendToOffLeash} 
                  className="w-full shadow-lg hover:shadow-xl transition-all" 
                  disabled={!isCalculated}
                >
                  Send to Off Leash
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isCalculated 
                  ? "This feature is coming soon. For now - email to info@offleashconstruction.com and we will review with you!" 
                  : "Calculate investment first"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Update the results card */}
      <Card className="mt-8 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Investment Analysis
          </CardTitle>
          <CardDescription className="text-base">
            Detailed breakdown of your investment over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCalculated && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {investmentType === 'buyAndHold' && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary tracking-tight">
                          Yr 1 Annual Return on Invested Cash
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash < 0 ? 'text-red-500' : ''}`}>
                          {calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash === Infinity 
                            ? '∞' 
                            : `${calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash < 0 ? '-' : ''}${formatNumber(Math.abs(calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash || 0))}%`}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary tracking-tight">
                          Yr 1 Total Return
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${calculatedOutput[1]?.yearlyTotals?.totalReturn < 0 ? 'text-red-500' : ''}`}>
                          {calculatedOutput[1]?.yearlyTotals?.totalReturn < 0 ? '-' : ''}${formatNumber(Math.abs(calculatedOutput[1]?.yearlyTotals?.totalReturn || 0))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary tracking-tight">
                          Cash Required
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${findMaxTotalCashInvested(calculatedOutput) < 0 ? 'text-red-500' : ''}`}>
                          {findMaxTotalCashInvested(calculatedOutput) < 0 ? '-' : ''}${formatNumber(Math.abs(findMaxTotalCashInvested(calculatedOutput)))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {investmentType === 'brrrr' && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary tracking-tight">
                          Cash Required
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${findMaxTotalCashInvested(calculatedOutput) < 0 ? 'text-red-500' : ''}`}>
                          {findMaxTotalCashInvested(calculatedOutput) < 0 ? '-' : ''}${formatNumber(Math.abs(findMaxTotalCashInvested(calculatedOutput)))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary tracking-tight">
                          After Refinance Cash Invested
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${findMinTotalCashInvested(calculatedOutput, 'brrrr', dealDetails) < 0 ? 'text-red-500' : ''}`}>
                          {findMinTotalCashInvested(calculatedOutput, 'brrrr', dealDetails) < 0 ? '-' : ''}${formatNumber(Math.abs(findMinTotalCashInvested(calculatedOutput, 'brrrr', dealDetails)))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary tracking-tight">
                          Yr 1 Annual Return on Invested Cash
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash < 0 ? 'text-red-500' : ''}`}>
                          {calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash === Infinity 
                            ? '∞' 
                            : `${calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash < 0 ? '-' : ''}${formatNumber(Math.abs(calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash || 0))}%`}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary tracking-tight">
                          Yr 1 Total Return
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${calculatedOutput[1]?.yearlyTotals?.totalReturn < 0 ? 'text-red-500' : ''}`}>
                          {calculatedOutput[1]?.yearlyTotals?.totalReturn < 0 ? '-' : ''}${formatNumber(Math.abs(calculatedOutput[1]?.yearlyTotals?.totalReturn || 0))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary tracking-tight">
                          BRRR Percentage
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {(() => {
                            const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
                            const loanToValue = parseFloat(financingDetails.loanToValue) / 100 || 0;
                            const afterRefinanceCashInvested = findMinTotalCashInvested(calculatedOutput, investmentType, dealDetails);
                            
                            const brrrPercentage = ((afterRepairValue * (1 - loanToValue)) - afterRefinanceCashInvested) / 
                                                     (afterRepairValue * (1 - loanToValue)) * 100;
                            
                            return `${formatNumber(Math.max(0, brrrPercentage))}%`;
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {investmentType === 'flip' && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary tracking-tight">
                          Cash Required
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${findMaxTotalCashInvested(calculatedOutput) < 0 ? 'text-red-500' : ''}`}>
                          {findMaxTotalCashInvested(calculatedOutput) < 0 ? '-' : ''}${formatNumber(Math.abs(findMaxTotalCashInvested(calculatedOutput)))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary tracking-tight">
                          Profit
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${(() => {
                          const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
                          const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
                          const purchasePrice = parseFloat(dealDetails.purchasePrice) || 0;
                          const initialClosingCosts = parseFloat(dealDetails.closingCosts) || 0;  // Dollar amount
                          const agentCommission = parseFloat(saleInputs.agentCommission) / 100 || 0;  // Percentage
                          const saleClosingCosts = parseFloat(saleInputs.closingCosts) / 100 || 0;  // Percentage
                          const totalCashFlow = calculateTotalCashFlow(calculatedOutput);
                          
                          const profit = (afterRepairValue - rehabCost - purchasePrice - initialClosingCosts) - 
                                        (afterRepairValue * (agentCommission + saleClosingCosts)) + 
                                          totalCashFlow;
                          return profit < 0 ? 'text-red-500' : '';
                        })()}`}>
                          {(() => {
                            const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
                            const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
                            const purchasePrice = parseFloat(dealDetails.purchasePrice) || 0;
                            const initialClosingCosts = parseFloat(dealDetails.closingCosts) || 0;  // Dollar amount
                            const agentCommission = parseFloat(saleInputs.agentCommission) / 100 || 0;  // Percentage
                            const saleClosingCosts = parseFloat(saleInputs.closingCosts) / 100 || 0;  // Percentage
                            const totalCashFlow = calculateTotalCashFlow(calculatedOutput);
                            
                            const profit = (afterRepairValue - rehabCost - purchasePrice - initialClosingCosts) - 
                                          (afterRepairValue * (agentCommission + saleClosingCosts)) + 
                                            totalCashFlow;
                            return `${profit < 0 ? '-' : ''}${formatNumber(Math.abs(profit))}`;
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary tracking-tight">
                          Profit Net of Taxes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${(() => {
                          const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
                          const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
                          const purchasePrice = parseFloat(dealDetails.purchasePrice) || 0;
                          const initialClosingCosts = parseFloat(dealDetails.closingCosts) || 0;  // Dollar amount
                          const agentCommission = parseFloat(saleInputs.agentCommission) / 100 || 0;  // Percentage
                          const saleClosingCosts = parseFloat(saleInputs.closingCosts) / 100 || 0;  // Percentage
                          const marginalTaxRate = parseFloat(saleInputs.marginalTaxRate) / 100 || 0;
                          const totalCashFlow = calculateTotalCashFlow(calculatedOutput);
                          
                          const profit = (afterRepairValue - rehabCost - purchasePrice - initialClosingCosts) - 
                                        (afterRepairValue * (agentCommission + saleClosingCosts)) + 
                                          totalCashFlow;
                          const profitAfterTax = profit * (1 - marginalTaxRate);
                          return profitAfterTax < 0 ? 'text-red-500' : '';
                        })()}`}>
                          {(() => {
                            const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
                            const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
                            const purchasePrice = parseFloat(dealDetails.purchasePrice) || 0;
                            const initialClosingCosts = parseFloat(dealDetails.closingCosts) || 0;  // Dollar amount
                            const agentCommission = parseFloat(saleInputs.agentCommission) / 100 || 0;  // Percentage
                            const saleClosingCosts = parseFloat(saleInputs.closingCosts) / 100 || 0;  // Percentage
                            const marginalTaxRate = parseFloat(saleInputs.marginalTaxRate) / 100 || 0;
                            const totalCashFlow = calculateTotalCashFlow(calculatedOutput);
                            
                            const profit = (afterRepairValue - rehabCost - purchasePrice - initialClosingCosts) - 
                                          (afterRepairValue * (agentCommission + saleClosingCosts)) + 
                                            totalCashFlow;
                            const profitAfterTax = profit * (1 - marginalTaxRate);
                            return `${profitAfterTax < 0 ? '-' : ''}$${formatNumber(Math.abs(profitAfterTax))}`;
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Debt</TableHead>
                  <TableHead>Equity</TableHead>
                  <TableHead>Cash Invested</TableHead>
                  <TableHead>Total Cash Invested</TableHead>
                  <TableHead>Interest Paid</TableHead>
                  {investmentType !== 'flip' && (
                    <>
                      <TableHead>DSCR</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Expenses</TableHead>
                    </>
                  )}
                  <TableHead>Cash Flow</TableHead>
                  <TableHead>Equity Growth</TableHead>
                  <TableHead>Total Return</TableHead>
                  {investmentType !== 'flip' && (
                    <TableHead>Annual Return on Invested Cash</TableHead>
                  )}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(calculatedOutput).map(([year, data]) => (
                  <React.Fragment key={`year-${year}`}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleYearExpansion(parseInt(year))}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{year}</span>
                          {expandedYears[parseInt(year)] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </TableCell>
                      <TableCell>${formatNumber(data.months[12].value)}</TableCell>
                      <TableCell className="text-red-500">${formatNumber(data.months[12].displayDebt)}</TableCell>
                      <TableCell className={data.months[12].equity < 0 ? 'text-red-500' : ''}>${formatNumber(data.months[12].equity)}</TableCell>
                      <TableCell className={data.yearlyTotals.cashInvested < 0 ? 'text-red-500' : ''}>${formatNumber(data.yearlyTotals.cashInvested)}</TableCell>
                      <TableCell className={data.yearlyTotals.totalCashInvested < 0 ? 'text-red-500' : ''}>${formatNumber(data.yearlyTotals.totalCashInvested)}</TableCell>
                      <TableCell className="text-red-500">${formatNumber(Math.abs(data.yearlyTotals.interestPaid))}</TableCell>
                      {investmentType !== 'flip' && (
                        <>
                          <TableCell>{formatNumber(data.yearlyTotals.dscr)}</TableCell>
                          <TableCell>${formatNumber(data.yearlyTotals.rent)}</TableCell>
                          <TableCell className="text-red-500">${formatNumber(Math.abs(data.yearlyTotals.expenses))}</TableCell>
                        </>
                      )}
                      <TableCell className={calculatedOutput[year].yearlyTotals.cashFlow < 0 ? 'text-red-500' : ''}>${formatNumber(calculateYearlyTotals(data).cashFlow)}</TableCell>
                      <TableCell className={data.yearlyTotals.equityGrowth < 0 ? 'text-red-500' : ''}>${formatNumber(data.yearlyTotals.equityGrowth)}</TableCell>
                      <TableCell className={data.yearlyTotals.totalReturn < 0 ? 'text-red-500' : ''}>${formatNumber(data.yearlyTotals.totalReturn)}</TableCell>
                      {investmentType !== 'flip' && (
                        <TableCell className={data.yearlyTotals.returnOnInvestedCash < 0 ? 'text-red-500' : ''}>
                          {data.yearlyTotals.returnOnInvestedCash === Infinity ? '∞' : `${formatNumber(data.yearlyTotals.returnOnInvestedCash)}%`}
                        </TableCell>
                      )}
                    </TableRow>
                    {expandedYears[parseInt(year)] && (
                      <TableRow key={`year-${year}-expanded`}>
                        <TableCell colSpan={investmentType === 'flip' ? 11 : 14} className="p-0 bg-muted/40">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/60 hover:bg-muted/60">
                                <TableHead>Month</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Debt</TableHead>
                                <TableHead>Equity</TableHead>
                                <TableHead>Cash Invested</TableHead>
                                <TableHead>Total Cash Invested</TableHead>
                                <TableHead>Interest Paid</TableHead>
                                {investmentType !== 'flip' && (
                                  <>
                                    <TableHead>DSCR</TableHead>
                                    <TableHead>Rent</TableHead>
                                    <TableHead>Expenses</TableHead>
                                  </>
                                )}
                                <TableHead>Cash Flow</TableHead>
                                <TableHead>Equity Growth</TableHead>
                                <TableHead>Total Return</TableHead>
                                {investmentType !== 'flip' && (
                                  <TableHead>Return on Invested Cash</TableHead>
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(data.months).map(([month, monthData]) => (
                                <TableRow key={`year-${year}-month-${month}`} className="bg-muted/40 hover:bg-muted/50">
                                  <TableCell>{month}</TableCell>
                                  <TableCell>${formatNumber(monthData.value)}</TableCell>
                                  <TableCell className="text-red-500">${formatNumber(monthData.displayDebt)}</TableCell>
                                  <TableCell className={monthData.equity < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.equity)}</TableCell>
                                  <TableCell className={monthData.displayCashInvested < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.displayCashInvested)}</TableCell>
                                  <TableCell className={monthData.totalCashInvested < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.totalCashInvested)}</TableCell>
                                  <TableCell className={monthData.interestPaid < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.interestPaid)}</TableCell>
                                  {investmentType !== 'flip' && (
                                    <>
                                      <TableCell>{formatNumber(monthData.dscr)}</TableCell>
                                      <TableCell>${formatNumber(monthData.rent)}</TableCell>
                                      <TableCell className={monthData.expenses < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.expenses)}</TableCell>
                                    </>
                                  )}
                                  <TableCell className={monthData.cashFlow < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.cashFlow)}</TableCell>
                                  <TableCell className={monthData.equityGrowth < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.equityGrowth)}</TableCell>
                                  <TableCell className={monthData.totalReturn < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.totalReturn)}</TableCell>
                                  {investmentType !== 'flip' && (
                                    <TableCell className={monthData.returnOnInvestedCash < 0 ? 'text-red-500' : ''}>
                                      {monthData.returnOnInvestedCash === Infinity ? '∞' : `${formatNumber(monthData.returnOnInvestedCash)}%`}
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}