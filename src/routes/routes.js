const express = require('express');

const { getExpenses, createExpense, deleteExpense } = require('../controllers/expenseController');
const { getStats, getExcel } = require('../controllers/statsController');

const router = express.Router();

router.post('/expenses', getExpenses);
router.post('/add-expense', createExpense);
router.post('/delete-expense', deleteExpense);

router.post('/stats', getStats);
router.get('/download-excel', getExcel);

module.exports = router;