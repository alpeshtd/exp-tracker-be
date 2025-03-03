const Expense = require('../models/expenseModel');

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

module.exports = { getStats };