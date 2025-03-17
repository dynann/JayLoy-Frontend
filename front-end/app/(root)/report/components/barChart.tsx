"use client";
import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { Bar, BarChart, LabelList } from "recharts";
import { TrendingUp } from "lucide-react";
import { numberConverter } from "../page";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { TabWithCancelButton } from "@/layouts/Tabbar";

const chartConfig = {
  Expense: {
    label: "Expense",
    color: "#3EB075",
  },
} satisfies ChartConfig;

export default function BudgetBarChart(): React.JSX.Element {
  const [monthlyReport, setmonthlyReport] = useState<
    { month: string; Expense: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [limitBudget, setLimitBudget] = useState(100);
  const year = dayjs().year();

  useEffect(() => {
    const fetchmonthlyReport = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/accounts/transaction/monthly/totalExpense?year=${year}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch the balance");
        const monthlyData = await res.json();
        const allMonthlyData = monthlyData.map((item: { Expense: number }) => ({
          //array
          ...item,
          Expense: item.Expense / 100, // divide each Expense by 100
        }));
        setmonthlyReport(allMonthlyData);
      } catch (error) {
        console.error(error);
        setError("Failed to fetch the balance");
      }
    };
    fetchmonthlyReport();
  }, [year]);
  return (
    <div>
      {/* <TabWithCancelButton href="/report" text="Limit Budget"/> */}
      <Card>
        <div className="flex justify-between m-2">
          <CardHeader>
            <CardTitle>Monthly Budget Limit</CardTitle>
            <CardDescription>
              Limit Budget: {limitBudget} USD per month
            </CardDescription>
          </CardHeader>
          <Link href="/report/limitBudget" className="flex items-center m-4 text-primary font-bold hover:underline rounded-3xl font-body " >
           Limit Budget
          </Link>
        </div>

        <CardContent>
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : monthlyReport.length === 0 ? (
            <p>Loading...</p>
          ) : (
            <ChartContainer config={chartConfig}>
              <BarChart data={monthlyReport} margin={{ top: 30 }}>
                <RechartsPrimitive.CartesianGrid vertical={false} />
                <RechartsPrimitive.XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)} // Shorten to "Jan", "Feb"
                />
                <ChartTooltip
                  cursor={true}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="Expense" fill="#3EB075" radius={20}>
                  <LabelList
                    position="top"
                    offset={12}
                    className="fill-foreground"
                    fontSize={10}
                    formatter={(value: number) => numberConverter(value)} // Convert number to formatted string
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            You spend 10% less than February. <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            Your savings have increased for the past 2 months.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
