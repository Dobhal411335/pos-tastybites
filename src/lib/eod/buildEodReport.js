import mongoose from "mongoose";
import Order from "@/models/Order";
import Table from "@/models/floor/Table";
import TableSession from "@/models/floor/TableSession";
import Employee from "@/models/employee/Employee";
import EmployeeLog from "@/models/employee/EmployeeLog";
import EmployeeShift from "@/models/employee/EmployeeShift";
import Restaurant from "@/models/Restaurant";
import { buildWorkingHoursSummaryPipeline } from "@/lib/payEstimate";
import {
  businessCalendarDate,
  businessDateBounds,
  formatEmployeeName,
  isCashPaymentMethod,
  normalizePaymentTypeLabel,
  priorBusinessDate,
  r2,
  resolveTenders,
} from "./eodHelpers.js";
import { reconcileEod } from "./reconcileEod.js";

/**
 * Build full End-of-Day report payload for a restaurant + YYYY-MM-DD.
 */
export async function buildEodReport({
  restaurantId,
  businessDate,
  actualDeposit = null,
  generatedBy = null,
  generatedByName = null,
}) {
  const restaurant = await Restaurant.findById(restaurantId)
    .select("name email phone address")
    .lean();
  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  const { start, end } = businessDateBounds(businessDate);
  const calendarDate = businessCalendarDate(businessDate);
  const priorDate = priorBusinessDate(businessDate);
  const rid = new mongoose.Types.ObjectId(String(restaurantId));

  const [paidOrders, cancelledOrders, tables, sessions, shifts, laborRows] =
    await Promise.all([
      Order.find({
        restaurantId: rid,
        paymentStatus: "PAID",
        status: { $ne: "CANCELLED" },
        updatedAt: { $gte: start, $lt: end },
      })
        .populate("processedBy", "firstName lastName name")
        .populate("table", "section tableNumber")
        .lean(),
      Order.find({
        restaurantId: rid,
        status: "CANCELLED",
        updatedAt: { $gte: start, $lt: end },
      })
        .select("totalAmount subTotal")
        .lean(),
      Table.find({ restaurant: rid }).select("_id section").lean(),
      TableSession.find({
        restaurant: rid,
        openedAt: { $gte: start, $lt: end },
        status: { $in: ["COMPLETED", "RELEASED"] },
        closedAt: { $ne: null },
      })
        .select("openedAt closedAt guestCount")
        .lean(),
      EmployeeShift.find({
        restaurant: rid,
        date: calendarDate,
      })
        .select("status")
        .lean(),
      EmployeeLog.aggregate(
        buildWorkingHoursSummaryPipeline({
          restaurant: rid,
          date: calendarDate,
        })
      ),
    ]);

  const tableSectionById = new Map(
    tables.map((t) => [String(t._id), (t.section || "").trim() || "No Section"])
  );

  // —— Sales aggregates ——
  let grossSales = 0;
  let netSales = 0;
  let totalDiscounts = 0;
  let totalSalesTaxes = 0;
  let totalTips = 0;
  let totalGuestCount = 0;
  let totalCash = 0;
  let totalNonCash = 0;
  let totalGiftCardPayments = 0;
  let totalCashRounding = 0;
  let billsWithOutstanding = 0;

  const sectionMap = new Map();
  const categoryMap = new Map();
  const tipsByEmp = new Map();
  const paymentTypeMap = new Map();
  const taxMap = new Map();

  const ensureSection = (name) => {
    if (!sectionMap.has(name)) {
      sectionMap.set(name, {
        sectionName: name,
        billCount: 0,
        netSales: 0,
        grossSales: 0,
        discounts: 0,
        taxes: 0,
      });
    }
    return sectionMap.get(name);
  };

  const ensureCategory = (name) => {
    if (!categoryMap.has(name)) {
      categoryMap.set(name, {
        salesCategory: name,
        menuItemQuantity: 0,
        netSales: 0,
        grossSales: 0,
        discounts: 0,
        taxes: 0,
      });
    }
    return categoryMap.get(name);
  };

  for (const order of paidOrders) {
    const sub = r2(order.subTotal);
    const disc = r2(order.discountTotal);
    const tax = r2(order.taxTotal);
    const tip = r2(order.tipAmount);
    const net = r2(sub - disc);

    grossSales = r2(grossSales + sub);
    netSales = r2(netSales + net);
    totalDiscounts = r2(totalDiscounts + disc);
    totalSalesTaxes = r2(totalSalesTaxes + tax);
    totalTips = r2(totalTips + tip);
    if (order.guestCount != null && Number.isFinite(Number(order.guestCount))) {
      totalGuestCount += Number(order.guestCount);
    }

    const tenders = resolveTenders(order);
    totalCash = r2(totalCash + tenders.cash);
    totalNonCash = r2(totalNonCash + tenders.card + tenders.giftCard);
    totalGiftCardPayments = r2(totalGiftCardPayments + tenders.giftCard);

    // Section
    let sectionName = "No Section";
    if (order.table?.section) {
      sectionName = String(order.table.section).trim() || "No Section";
    } else if (order.table?._id) {
      sectionName =
        tableSectionById.get(String(order.table._id)) || "No Section";
    } else if (order.table) {
      sectionName =
        tableSectionById.get(String(order.table)) || "No Section";
    }
    const sec = ensureSection(sectionName);
    sec.billCount += 1;
    sec.netSales = r2(sec.netSales + net);
    sec.grossSales = r2(sec.grossSales + sub);
    sec.discounts = r2(sec.discounts + disc);
    sec.taxes = r2(sec.taxes + tax);

    // Categories — allocate order discount/tax proportionally by item line net
    const items = Array.isArray(order.items) ? order.items : [];
    const itemGrossTotal = items.reduce(
      (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0),
      0
    );
    for (const it of items) {
      const catName = (it.category || "Other").trim() || "Other";
      const lineGross = r2(
        (Number(it.price) || 0) * (Number(it.qty) || 0)
      );
      const share =
        itemGrossTotal > 0 ? lineGross / itemGrossTotal : 0;
      const lineDisc = r2(disc * share);
      const lineTax =
        it.tax != null
          ? r2((Number(it.tax) || 0) * (Number(it.qty) || 0))
          : r2(tax * share);
      const lineNet = r2(lineGross - lineDisc);
      const cat = ensureCategory(catName);
      cat.menuItemQuantity += Number(it.qty) || 0;
      cat.netSales = r2(cat.netSales + lineNet);
      cat.grossSales = r2(cat.grossSales + lineGross);
      cat.discounts = r2(cat.discounts + lineDisc);
      cat.taxes = r2(cat.taxes + lineTax);
    }

    // Tips by employee
    const emp = order.processedBy;
    const empKey = emp?._id ? String(emp._id) : "unknown";
    const empName = formatEmployeeName(emp);
    if (!tipsByEmp.has(empKey)) {
      tipsByEmp.set(empKey, {
        employeeName: empName,
        cashTips: 0,
        nonCashTips: 0,
        totalTips: 0,
      });
    }
    const tipRow = tipsByEmp.get(empKey);
    const cashTip = isCashPaymentMethod(order.paymentMethod)
      ? tip
      : tenders.cash > 0 && tenders.card === 0 && tenders.giftCard === 0
        ? tip
        : 0;
    const nonCashTip = r2(tip - cashTip);
    tipRow.cashTips = r2(tipRow.cashTips + cashTip);
    tipRow.nonCashTips = r2(tipRow.nonCashTips + nonCashTip);
    tipRow.totalTips = r2(tipRow.totalTips + tip);

    // Payment by type — attribute tip + tender to primary method label
    const typeLabel = normalizePaymentTypeLabel(
      order.paymentMethod,
      tenders.giftCard
    );
    if (!paymentTypeMap.has(typeLabel)) {
      paymentTypeMap.set(typeLabel, {
        paymentType: typeLabel,
        paymentCount: 0,
        refunds: 0,
        tips: 0,
        paymentTotal: 0,
      });
    }
    const pt = paymentTypeMap.get(typeLabel);
    pt.paymentCount += 1;
    pt.tips = r2(pt.tips + tip);
    const paymentTotalForOrder = r2(
      tenders.cash + tenders.card + tenders.giftCard
    );
    // If tenders sum to 0 (edge), fall back to total+tip
    pt.paymentTotal = r2(
      pt.paymentTotal +
        (paymentTotalForOrder > 0
          ? paymentTotalForOrder
          : r2(order.totalAmount + tip))
    );

    // Tax breakdown
    const breakdown = Array.isArray(order.taxBreakdown)
      ? order.taxBreakdown
      : [];
    if (breakdown.length > 0) {
      for (const t of breakdown) {
        const name = t.name || "Tax";
        if (!taxMap.has(name)) {
          taxMap.set(name, {
            taxName: name,
            billCount: 0,
            taxAmount: 0,
            netSales: 0,
            _bills: new Set(),
          });
        }
        const row = taxMap.get(name);
        row.taxAmount = r2(row.taxAmount + (Number(t.amount) || 0));
        row.netSales = r2(row.netSales + net);
        row._bills.add(String(order._id));
      }
    } else if (tax > 0) {
      const name = "Sales Tax";
      if (!taxMap.has(name)) {
        taxMap.set(name, {
          taxName: name,
          billCount: 0,
          taxAmount: 0,
          netSales: 0,
          _bills: new Set(),
        });
      }
      const row = taxMap.get(name);
      row.taxAmount = r2(row.taxAmount + tax);
      row.netSales = r2(row.netSales + net);
      row._bills.add(String(order._id));
    }
  }

  const billCount = paidOrders.length;
  const totalPayment = r2(totalCash + totalNonCash);
  const avgPerGuest =
    totalGuestCount > 0 ? r2(netSales / totalGuestCount) : 0;
  const avgPerBill = billCount > 0 ? r2(netSales / billCount) : 0;

  // Labor
  let totalLaborCost = 0;
  let totalLaborHours = 0;
  for (const row of laborRows) {
    totalLaborCost = r2(totalLaborCost + (row.estimatedTotalPay || 0));
    totalLaborHours = r2(totalLaborHours + (row.totalWorkedHours || 0));
  }
  const laborCostPct =
    netSales > 0 ? r2((totalLaborCost / netSales) * 100) : 0;

  let turnMinutesSum = 0;
  let turnCount = 0;
  for (const s of sessions) {
    if (s.openedAt && s.closedAt) {
      const mins =
        (new Date(s.closedAt).getTime() - new Date(s.openedAt).getTime()) /
        60000;
      if (mins > 0 && mins < 24 * 60) {
        turnMinutesSum += mins;
        turnCount += 1;
      }
    }
  }
  const avgTableTurn = turnCount > 0 ? r2(turnMinutesSum / turnCount) : 0;

  const totalCashTips = r2(
    [...tipsByEmp.values()].reduce((s, t) => s + t.cashTips, 0)
  );
  const totalNonCashTips = r2(
    [...tipsByEmp.values()].reduce((s, t) => s + t.nonCashTips, 0)
  );

  const activeShifts = shifts.filter((s) => s.status === "Active").length;
  const completedShifts = shifts.filter(
    (s) => s.status === "Completed"
  ).length;

  const menuItemCost = 0;
  const grossMargin = r2(netSales - totalLaborCost - menuItemCost);
  const totalRefundAmount = 0;
  const refundsCount = 0;
  const totalVoids = r2(
    cancelledOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0)
  );
  const giftCardSales = 0;
  const totalSurcharges = 0;
  const totalGratuity = 0;
  const serviceCharges = 0;
  const otherServiceCharges = 0;
  const serviceChargesTaxes = 0;

  const paymentsMinusNet = r2(totalPayment - netSales);

  const expectedDeposit = totalCash;
  const actualDep =
    actualDeposit != null && actualDeposit !== ""
      ? r2(actualDeposit)
      : null;
  const overShort =
    actualDep != null ? r2(actualDep - expectedDeposit) : r2(0 - expectedDeposit);

  let generatedByResolved = generatedByName;
  if (!generatedByResolved && generatedBy) {
    const emp = await Employee.findById(generatedBy)
      .select("firstName lastName name")
      .lean();
    generatedByResolved = formatEmployeeName(emp);
  }

  const taxSummaryRows = [...taxMap.values()].map((row) => ({
    taxName: row.taxName,
    billCount: row._bills.size,
    taxAmount: row.taxAmount,
    netSales: row.netSales,
  }));

  const tipsByEmployees = [...tipsByEmp.values()].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName)
  );

  const report = {
    meta: {
      restaurantName: restaurant.name || "Restaurant",
      restaurantEmail: restaurant.email || "",
      restaurantPhone: restaurant.phone || "",
      restaurantAddress: restaurant.address || "",
      businessDate,
      priorDate,
      title: `${restaurant.name || "Restaurant"} - End Of Day - ${businessDate}/${priorDate}`,
      generatedAt: new Date().toISOString(),
      generatedBy: generatedBy || null,
      generatedByName: generatedByResolved || null,
      source: "live",
    },
    detailedSalesSummary: {
      netSales,
      grossSales,
      totalDiscounts,
      menuItemCost,
      laborCost: totalLaborCost,
      grossMargin,
      totalSalesTaxes,
      averagePerGuest: avgPerGuest,
      averagePerBill: avgPerBill,
      totalRefundAmount,
    },
    detailedLaborSummary: {
      totalLaborCost,
      totalLaborHours,
      laborCostPctOfNetSales: laborCostPct,
      averageTableTurnTimeMinutes: avgTableTurn,
      totalNonCashTips,
      totalCashTips,
      totalTips,
      totalGratuity,
      totalActiveShifts: activeShifts,
      totalCompletedShifts: completedShifts,
    },
    paymentsSummary: {
      transactionsCount: billCount,
      refundsCount,
      totalCash,
      totalNonCash,
      totalSurcharges,
      totalPayment,
      totalPaymentsMinusNetSales: paymentsMinusNet,
      totalCashRounding,
    },
    salesBySection: {
      rows: [...sectionMap.values()].sort((a, b) =>
        a.sectionName.localeCompare(b.sectionName)
      ),
      total: {
        sectionName: "TOTAL",
        billCount,
        netSales,
        grossSales: r2(
          [...sectionMap.values()].reduce((s, r) => s + r.grossSales, 0)
        ),
        discounts: totalDiscounts,
        taxes: totalSalesTaxes,
      },
    },
    salesBySalesCategory: {
      rows: [...categoryMap.values()].sort((a, b) =>
        a.salesCategory.localeCompare(b.salesCategory)
      ),
      total: {
        salesCategory: "TOTAL",
        menuItemQuantity: [...categoryMap.values()].reduce(
          (s, r) => s + r.menuItemQuantity,
          0
        ),
        netSales,
        grossSales: r2(
          [...categoryMap.values()].reduce((s, r) => s + r.grossSales, 0)
        ),
        discounts: totalDiscounts,
        taxes: totalSalesTaxes,
      },
    },
    giftCardSales: {
      rows: [],
      total: { item: "TOTAL", count: 0, total: 0 },
    },
    tipsByEmployees: {
      rows: tipsByEmployees,
      total: {
        employeeName: "TOTAL",
        cashTips: totalCashTips,
        nonCashTips: totalNonCashTips,
        totalTips,
      },
    },
    tipsSummary: {
      totalCashTips,
      totalNonCashTips,
      totalTips,
    },
    paymentByPaymentType: {
      rows: [...paymentTypeMap.values()].sort((a, b) =>
        a.paymentType.localeCompare(b.paymentType)
      ),
      total: {
        paymentType: "TOTAL",
        paymentCount: billCount,
        refunds: 0,
        tips: totalTips,
        paymentTotal: totalPayment,
      },
    },
    accounts: {
      rows: [],
    },
    tipOuts: {
      totalCashOwedToHouse: 0,
      totalCashOwedToServer: 0,
    },
    payouts: {
      totalPayouts: 0,
    },
    payins: {
      totalPayins: 0,
    },
    salesTaxAndTipSummary: {
      netSales,
      grossSales,
      totalDiscounts,
      totalSalesTaxes,
      totalTips,
      totalNetSalesTaxesAndTips: r2(netSales + totalSalesTaxes + totalTips),
      serviceCharges,
      gratuities: totalGratuity,
      surcharges: totalSurcharges,
      otherServiceCharges,
      serviceChargesTaxes,
      totalRefundsAmount: totalRefundAmount,
      totalVoids,
      totalBillCount: billCount,
      totalGuestCount,
      giftCardSales,
      grossMargin,
      billsWithOutstandingBalance: billsWithOutstanding,
    },
    cashDeposit: {
      businessDay: businessDate,
      expectedDeposit,
      actualDeposit: actualDep ?? 0,
      overShort,
      createdBy: generatedByResolved || "",
    },
    taxSummary: {
      rows: taxSummaryRows,
      total: {
        taxName: "TOTAL",
        billCount: "",
        taxAmount: totalSalesTaxes,
        netSales: "",
      },
    },
    summary: {
      netSales,
      orders: billCount,
      taxes: totalSalesTaxes,
      tips: totalTips,
      cash: totalCash,
      card: r2(totalNonCash - totalGiftCardPayments),
      giftCard: totalGiftCardPayments,
      refunds: totalRefundAmount,
      totalPayment,
    },
  };

  report.reconciliation = reconcileEod(report);
  return report;
}
