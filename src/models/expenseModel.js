const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
    {
        date: { type: String, required: true },
        label: { type: String, required: true },
        amount: { type: String, required: true },
        category: { type: String, required: true },
        expBy: { type: String, required: true },
        method: { type: String, required: true },
        note: { type: String },
    }
)

module.exports = mongoose.model('Expense', expenseSchema);