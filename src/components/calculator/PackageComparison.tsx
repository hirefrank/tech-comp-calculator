import React from 'react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import CompCalculator from './CompCalculator';
import EquityCalculator from './EquityCalculator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import defaultConfig from '../../config/defaults.json';
import { Config } from '../../types/config';
import { CompPackage } from '../../types/package';

// Add type assertion
const config = defaultConfig as Config;

export default function PackageComparison() {
  const [currentPackage, setCurrentPackage] = useState<CompPackage>({
    ...config.packages.current,
    company: { ...config.packages.current.company }
  });

  const [newPackage, setNewPackage] = useState<CompPackage>({
    ...config.packages.new,
    company: { ...config.packages.new.company }
  });

  const calculateYearlyTotal = (pkg: CompPackage, year: number) => {
    // Calculate base salary with growth
    let currentSalary = pkg.base;
    for (let i = 0; i < year; i++) {
      currentSalary *= (1 + pkg.growth[i].salaryGrowth / 100);
    }

    // Calculate bonus
    const bonus = currentSalary * (pkg.growth[year].bonusPercentage / 100);

    // Calculate equity value for that year
    const vestingPercent = pkg.equity.vestingSchedule[year];
    const equityValue = pkg.equity.initialGrant * (vestingPercent / 100);
    const refreshValue = pkg.equity.refreshGrants
      .filter(grant => grant.year === year + 1)
      .reduce((sum, grant) => sum + grant.amount, 0);

    let totalEquity = equityValue + refreshValue;

    // Apply private company adjustments
    if (pkg.company.type === 'private' && pkg.equity.liquidityDiscount && pkg.equity.exitMultiple) {
      totalEquity *= (1 - pkg.equity.liquidityDiscount / 100);
      totalEquity *= pkg.equity.exitMultiple;
    }

    return {
      salary: currentSalary,
      bonus: bonus,
      equity: totalEquity,
      total: currentSalary + bonus + totalEquity
    };
  };

  const comparisonData = Array(4).fill(null).map((_, year) => {
    const currentYearTotal = calculateYearlyTotal(currentPackage, year);
    const newYearTotal = calculateYearlyTotal(newPackage, year);

    return {
      year: `Year ${year + 1}`,
      current: currentYearTotal,
      new: newYearTotal,
      difference: newYearTotal.total - currentYearTotal.total
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 p-0">
      <div className="max-w-7xl mx-auto">

        <Tabs defaultValue="current" className="space-y-8">
          <TabsList>
            <TabsTrigger value="current">Current Package</TabsTrigger>
            <TabsTrigger value="new">New Package</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <div className="grid grid-cols-1 gap-8">
              <CompCalculator
                package={currentPackage}
                onUpdate={setCurrentPackage}
                title="Current Package"
              />
              <EquityCalculator
                package={currentPackage}
                onUpdate={setCurrentPackage}
              />
            </div>
          </TabsContent>

          <TabsContent value="new">
            <div className="grid grid-cols-1 gap-8">
              <CompCalculator
                package={newPackage}
                onUpdate={setNewPackage}
                title="New Package"
              />
              <EquityCalculator
                package={newPackage}
                onUpdate={setNewPackage}
              />
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Package Comparison</CardTitle>
                <CardDescription>Compare total compensation over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium">Year 1 Difference</div>
                        <div className={`text-2xl font-bold ${comparisonData[0].difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {comparisonData[0].difference >= 0 ? '+' : ''}
                          ${comparisonData[0].difference.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium">4-Year Total Difference</div>
                        <div className={`text-2xl font-bold ${comparisonData.reduce((sum, year) => sum + year.difference, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {comparisonData.reduce((sum, year) => sum + year.difference, 0) >= 0 ? '+' : ''}
                          ${comparisonData.reduce((sum, year) => sum + year.difference, 0).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm font-medium">Risk Adjusted Difference</div>
                        <div className={`text-2xl font-bold ${comparisonData[3].difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {comparisonData[3].difference >= 0 ? '+' : ''}
                          ${(comparisonData[3].difference * (newPackage.company.type === 'private' ? 0.7 : 1)).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Comparison Chart */}
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={comparisonData}>
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
                          dataKey="current.total"
                          name="Current Package"
                          stroke="#8884d8"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="new.total"
                          name="New Package"
                          stroke="#82ca9d"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Year by Year Breakdown</h3>
                    {comparisonData.map((year, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="font-medium">{year.year}</div>
                              <div className="text-sm text-gray-500">Current Package</div>
                              <div className="mt-1">
                                <div>Base: ${year.current.salary.toLocaleString()}</div>
                                <div>Bonus: ${year.current.bonus.toLocaleString()}</div>
                                <div>Equity: ${year.current.equity.toLocaleString()}</div>
                                <div className="font-medium mt-1">
                                  Total: ${year.current.total.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">&nbsp;</div>
                              <div className="text-sm text-gray-500">New Package</div>
                              <div className="mt-1">
                                <div>Base: ${year.new.salary.toLocaleString()}</div>
                                <div>Bonus: ${year.new.bonus.toLocaleString()}</div>
                                <div>Equity: ${year.new.equity.toLocaleString()}</div>
                                <div className="font-medium mt-1">
                                  Total: ${year.new.total.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">&nbsp;</div>
                              <div className="text-sm text-gray-500">Difference</div>
                              <div className="mt-1">
                                <div className={year.new.salary - year.current.salary >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  ${(year.new.salary - year.current.salary).toLocaleString()}
                                </div>
                                <div className={year.new.bonus - year.current.bonus >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  ${(year.new.bonus - year.current.bonus).toLocaleString()}
                                </div>
                                <div className={year.new.equity - year.current.equity >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  ${(year.new.equity - year.current.equity).toLocaleString()}
                                </div>
                                <div className={`font-medium mt-1 ${year.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ${year.difference.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}