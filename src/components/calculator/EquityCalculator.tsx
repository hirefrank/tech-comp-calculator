import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EquityCalculatorProps {
  package: any; // TODO: Use proper type from PackageComparison
  onUpdate: (pkg: any) => void;
}

const DEFAULT_TAX_RATES = {
  federal: 37,
  state: 13,
  amt: 28,
  capitalGains: {
    shortTerm: 37,
    longTerm: 20
  }
};

export default function EquityCalculator({ package: pkg, onUpdate }: EquityCalculatorProps) {
  const [taxRates, setTaxRates] = useState(DEFAULT_TAX_RATES);

  const handleEquityChange = (field: string, value: any) => {
    onUpdate({
      ...pkg,
      equity: {
        ...pkg.equity,
        [field]: value
      }
    });
  };

  const calculateYearlyEquity = (year: number) => {
    // Calculate vested equity
    const vestedPercent = pkg.equity.vestingSchedule[year];
    const vestedValue = pkg.equity.initialGrant * (vestedPercent / 100);

    // Add refresh grants for that year
    const refreshValue = pkg.equity.refreshGrants
      .filter(grant => grant.year === year + 1)
      .reduce((sum, grant) => sum + grant.amount, 0);

    let totalValue = vestedValue + refreshValue;

    // Apply private company adjustments
    if (pkg.company.type === 'private') {
      totalValue *= (1 - pkg.equity.liquidityDiscount / 100);
      totalValue *= pkg.equity.exitMultiple;
    }

    // Calculate tax implications
    let taxAmount = 0;
    if (pkg.equity.type === 'RSU') {
      taxAmount = totalValue * ((taxRates.federal + taxRates.state) / 100);
    } else if (pkg.equity.type === 'ISO') {
      // AMT calculation for ISOs
      const amtIncome = totalValue - (pkg.equity.shares * pkg.equity.strikePrice);
      taxAmount = Math.max(0, amtIncome * (taxRates.amt / 100));
    } else { // NSO
      const spread = totalValue - (pkg.equity.shares * pkg.equity.strikePrice);
      taxAmount = spread * ((taxRates.federal + taxRates.state) / 100);
    }

    return {
      gross: totalValue,
      tax: taxAmount,
      net: totalValue - taxAmount
    };
  };

  const chartData = Array(4).fill(null).map((_, year) => {
    const values = calculateYearlyEquity(year);
    return {
      year: `Year ${year + 1}`,
      ...values
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equity Details</CardTitle>
        <CardDescription>Configure equity grant and vesting details</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="grant">
          <TabsList>
            <TabsTrigger value="grant">Grant Details</TabsTrigger>
            <TabsTrigger value="vesting">Vesting</TabsTrigger>
            <TabsTrigger value="tax">Tax</TabsTrigger>
          </TabsList>

          <TabsContent value="grant" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Equity Type</label>
                <Select
                  value={pkg.equity.type}
                  onValueChange={(value) => handleEquityChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RSU">RSUs</SelectItem>
                    <SelectItem value="ISO">ISOs</SelectItem>
                    <SelectItem value="NSO">NSOs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Initial Grant Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={pkg.equity.initialGrant}
                    onChange={(e) => handleEquityChange('initialGrant', Number(e.target.value))}
                    className="pl-6"
                  />
                </div>
              </div>

              {pkg.equity.type !== 'RSU' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Strike Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="number"
                        value={pkg.equity.strikePrice}
                        onChange={(e) => handleEquityChange('strikePrice', Number(e.target.value))}
                        className="pl-6"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Number of Shares</label>
                    <Input
                      type="number"
                      value={pkg.equity.shares}
                      onChange={(e) => handleEquityChange('shares', Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Current FMV</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="number"
                        value={pkg.equity.currentFMV}
                        onChange={(e) => handleEquityChange('currentFMV', Number(e.target.value))}
                        className="pl-6"
                      />
                    </div>
                  </div>
                </>
              )}

              {pkg.company.type === 'private' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Liquidity Discount (%)</label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={pkg.equity.liquidityDiscount}
                        onChange={(e) => handleEquityChange('liquidityDiscount', Number(e.target.value))}
                        className="pr-6"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Exit Multiple</label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={pkg.equity.exitMultiple}
                        onChange={(e) => handleEquityChange('exitMultiple', Number(e.target.value))}
                        step="0.1"
                        className="pr-6"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">x</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="vesting" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Vesting Schedule</label>
                <div className="grid grid-cols-4 gap-4">
                  {pkg.equity.vestingSchedule.map((percent, index) => (
                    <div key={index}>
                      <label className="block text-xs mb-1">Year {index + 1}</label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={percent}
                          onChange={(e) => {
                            const newSchedule = [...pkg.equity.vestingSchedule];
                            newSchedule[index] = Number(e.target.value);
                            handleEquityChange('vestingSchedule', newSchedule);
                          }}
                          className="pr-6"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Refresh Grants</label>
                <div className="space-y-2">
                  {pkg.equity.refreshGrants.map((grant, index) => (
                    <div key={index} className="grid grid-cols-7 gap-2 items-end">
                      <div className="col-span-2">
                        <label className="block text-xs mb-1">Year</label>
                        <Input
                          type="number"
                          value={grant.year}
                          onChange={(e) => {
                            const newGrants = [...pkg.equity.refreshGrants];
                            newGrants[index] = {
                              ...grant,
                              year: Number(e.target.value)
                            };
                            handleEquityChange('refreshGrants', newGrants);
                          }}
                          min="2"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs mb-1">Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                          <Input
                            type="number"
                            value={grant.amount}
                            onChange={(e) => {
                              const newGrants = [...pkg.equity.refreshGrants];
                              newGrants[index] = {
                                ...grant,
                                amount: Number(e.target.value)
                              };
                              handleEquityChange('refreshGrants', newGrants);
                            }}
                            className="pl-6"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tax" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Federal Tax Rate (%)</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={taxRates.federal}
                    onChange={(e) => setTaxRates(prev => ({ ...prev, federal: Number(e.target.value) }))}
                    className="pr-6"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">State Tax Rate (%)</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={taxRates.state}
                    onChange={(e) => setTaxRates(prev => ({ ...prev, state: Number(e.target.value) }))}
                    className="pr-6"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>

              {pkg.equity.type === 'ISO' && (
                <div>
                  <label className="block text-sm font-medium mb-1">AMT Rate (%)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={taxRates.amt}
                      onChange={(e) => setTaxRates(prev => ({ ...prev, amt: Number(e.target.value) }))}
                      className="pr-6"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <h3 className="font-medium text-lg mb-4">Equity Value Projection</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => `$${(value / 1000)}k`} />
              <Tooltip
                formatter={(value: number) => `$${value.toLocaleString()}`}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="gross"
                name="Gross Value"
                stroke="#8884d8"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="tax"
                name="Tax"
                stroke="#ff8884"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net Value"
                stroke="#82ca9d"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}