const Expense = require('../models/expenseModel');


const getExpenses = async (req, res) => {
    try {
        const { startDate, endDate, category, expBy, method, searchBy} = req.body;
        let dateFilter = {};
        let catFilter = '';
        let searchFilter = '';
        if(startDate) {
            dateFilter = {
                $gte: startDate
            }
        }
        if(endDate) {
            dateFilter = {
                ...dateFilter,
                $lte: endDate
            }
        }
        if(category) {
            catFilter = { $in: category };
        }
        if(searchBy) {
            searchFilter =  [ { label: { $regex: searchBy, $options: "i" } }, { note: { $regex: searchBy, $options: "i" } } ]
        }
        const filters = { 
            ...(Object.keys(dateFilter).length ? {date: dateFilter}: undefined), 
            ...(catFilter ? {category: catFilter} : undefined),
            ...(expBy? {expBy}: undefined),
            ...(method ? {method} : undefined),
            ...(searchFilter ? {$or: searchFilter} : undefined)
        }
        const expenses = await Expense.find(filters).sort({ date: -1 });
        res.status(200).json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createExpense = async (req, res) => {
    try {
        const { date, label, amount, category, expBy, method, note} = req.body;
        if(!date || !label || !amount || !category || !expBy || !method) {
            return res.status(400).json({ message: 'Fill all required data!'})
        }
        const expense = await Expense.create({ date, label, amount, category, method, expBy, note});
        res.status(201).json(expense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const deleteExpense = async (req, res) => {
    try {
        const { id } = req.body;
        const result = await Expense.deleteOne({ _id: id });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

module.exports = { getExpenses, createExpense, deleteExpense };