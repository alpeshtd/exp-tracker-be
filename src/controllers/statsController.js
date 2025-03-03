const Expense = require('../models/expenseModel');
const ExcelJS = require('exceljs');
const moment = require('moment-timezone');

const getStats = async (req, res) => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const budget = 8000; // Set your monthly budget here

        const expenses = await Expense.aggregate([
            {
                $addFields: {
                    timestamp: { $toDouble: "$date" },
                    amountNum: { $toDouble: "$amount" }
                }
            },
            {
                $addFields: {
                    dateObj: { $toDate: { $multiply: [{ $toLong: "$timestamp" }, 1000] } }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: { $dateAdd: { startDate: "$dateObj", unit: "minute", amount: 330 } } }, // 5 hours 30 minutes
                        month: { $month: { $dateAdd: { startDate: "$dateObj", unit: "minute", amount: 330 } } },
                        category: "$category"
                    },
                    totalAmount: { $sum: "$amountNum" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);

        let formattedData = {};
        let prevMonthTotals = {};

        expenses.forEach(({ _id, totalAmount }) => {
            const key = `${_id.year}-${_id.month}`;
            if (!formattedData[key]) {
                formattedData[key] = { totalExpense: 0, categories: {}, changePercentage: 0, categoryChanges: {} };
            }
            formattedData[key].totalExpense += totalAmount;
            formattedData[key].categories[_id.category] = totalAmount;
        });

        let previousTotal = null;
        Object.keys(formattedData).forEach((month, index, array) => {
            if (previousTotal !== null) {
                formattedData[month].changePercentage =
                    ((formattedData[month].totalExpense - previousTotal) / previousTotal) * 100;
            }
            previousTotal = formattedData[month].totalExpense;
        });

        Object.keys(formattedData).forEach((month, index, array) => {
            if (index > 0) {
                let prevMonth = array[index - 1];
                Object.keys(formattedData[month].categories).forEach(category => {
                    let currentAmount = formattedData[month].categories[category] || 0;
                    let prevAmount = formattedData[prevMonth]?.categories[category] || 0;
                    formattedData[month].categoryChanges[category] = prevAmount > 0 ? ((currentAmount - prevAmount) / prevAmount) * 100 : 0;
                });
            }
        });


        res.status(200).json(formattedData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getExcel = async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: 1 });

        // Grouping expenses by month in IST (India Standard Time)
        const groupedExpenses = {};
        expenses.forEach(expense => {
            const istDate = moment.unix(expense.date).tz("Asia/Kolkata"); // Convert timestamp to IST
            const monthKey = istDate.format('YYYY-MM'); // Group by YYYY-MM

            if (!groupedExpenses[monthKey]) {
                groupedExpenses[monthKey] = [];
            }
            groupedExpenses[monthKey].push({
                ...expense._doc,
                formattedDate: istDate.format('YYYY-MM-DD') // Save formatted date
            });
        });

        const workbook = new ExcelJS.Workbook();

        Object.keys(groupedExpenses).forEach(month => {
            const worksheet = workbook.addWorksheet(month); // Create a new tab per month

            // Add Header Row
            worksheet.addRow(['Date', 'Label', 'Amount', 'Category', 'Exp By', 'Method', 'Note']);

            let categoryTotal = {}; // Store category-wise total expenses

            // Add Expense Records
            groupedExpenses[month].forEach(expense => {
                worksheet.addRow([
                    expense.formattedDate,  // Corrected IST Date
                    expense.label,
                    parseFloat(expense.amount), // Ensure numeric amount
                    expense.category,
                    expense.expBy,
                    expense.method,
                    expense.note || ''
                ]);

                // Calculate total amount per category
                if (!categoryTotal[expense.category]) {
                    categoryTotal[expense.category] = 0;
                }
                categoryTotal[expense.category] += parseFloat(expense.amount);
            });

            // Add Space
            worksheet.addRow([]);
            worksheet.addRow(['Category-wise Total Expense']);
            worksheet.addRow(['Category', 'Total Amount']);

            // Add Summary Table
            Object.keys(categoryTotal).forEach(category => {
                worksheet.addRow([category, categoryTotal[category]]);
            });
        });

        // const buffer = await workbook.xlsx.writeBuffer();
        // await workbook.xlsx.writeFile('test_expenses.xlsx'); // Save for testing
        

        // Set response headers
        res.setHeader('Content-Disposition', 'attachment; filename=expenses.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        // res.setHeader("Content-Length", buffer.length);


        // res.send(Buffer.from(buffer));

        // Write workbook to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ message: 'Error generating Excel file', error });
    }
}

module.exports = { getStats, getExcel };