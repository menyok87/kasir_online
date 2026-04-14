const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/categories',   require('./routes/categories'));
app.use('/api/products',     require('./routes/products'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/dashboard',    require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use(require('./middleware/errorHandler'));

app.listen(PORT, () => {
  console.log(`Backend Kasir Online berjalan di http://localhost:${PORT}`);
});
