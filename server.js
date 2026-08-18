const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const cors = require('cors');

// Load .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5500;

// Allow JSON and frontend requests
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // To show your frontend

// MySQL Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.log('❌ Error connecting to database:', err);
  } else {
    console.log('✅ Connected to MySQL database!');
  }
});

// Test route: See all Product
app.get('/api/products', (req, res) => {
  db.query('SELECT * FROM Product', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

app.post('/api/add-product', (req, res) => {
  const { name, description, price, stock } = req.body;
  const sql = 'INSERT INTO Product (ProductName, Description, Price, stockQuantity) VALUES (?, ?, ?, ?)';
  db.query(sql, [name, description, price, stock], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).send('Error adding product');
      }
      res.status(200).send('Product added successfully');
  });
});


app.put('/api/update-product/:id', (req, res) => {
  const productId = req.params.id;
  const { name, description, price, stock } = req.body;

  const sql = `
    UPDATE Product
    SET ProductName = ?, Description = ?, Price = ?, StockQuantity = ?
    WHERE ProductID = ?
  `;

  db.query(sql, [name, description, price, stock, productId], (err, result) => {
    if (err) {
      console.error('Update error:', err);
      res.status(500).json({ error: 'Failed to update product' });
    } else {
      res.status(200).json({ message: 'Product updated successfully' });
    }
  });
});



app.post("/api/add-user", (req, res) => {
  const { username, password, email, phoneNumber } = req.body;

  // Simple validation to ensure data exists
  if (!username || !password || !email || !phoneNumber) {
      return res.status(400).json({ success: false, message: "All fields are required" });
  }

  // SQL query to insert a new user
  const query = "INSERT INTO Users (Username, Password, Email, PhoneNumber) VALUES (?, ?, ?, ?)";
  db.query(query, [username, password, email, phoneNumber], (err, results) => {
      if (err) {
          console.error("Error adding user:", err);
          return res.status(500).json({ success: false, message: "Error adding user to the database" });
      }
      res.status(200).json({ success: true, message: "User added successfully" });
  });
});



// Fetch all users
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM Users', (err, results) => {
    if (err) {
      console.log('❌ Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});














// Fetch all products for dropdown
app.get('/get-products', (req, res) => {
  db.query('SELECT ProductID, ProductName FROM Product', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Fetch price of a specific product
app.get('/get-product-price/:id', (req, res) => {
  const productId = req.params.id;
  db.query('SELECT Price FROM Product WHERE ProductID = ?', [productId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(results[0]);
  });
});




// Route to place an order
app.post('/place-order', (req, res) => {
  const { UserID, ProductID, Quantity, TotalAmount } = req.body;

  // Check if the product is in stock
  db.query('SELECT StockQuantity FROM Product WHERE ProductID = ?', [ProductID], (err, results) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: 'Product not found' });
      }

      const stockQuantity = results[0].StockQuantity;

      if (stockQuantity < Quantity) {
          return res.status(400).json({ error: 'Not enough stock available' });
      }

      // Step 1: Insert into Orders table
      const orderQuery = 'INSERT INTO Orders (UserID, OrderDate, TotalAmount) VALUES (?, NOW(), ?)';
      db.query(orderQuery, [UserID, TotalAmount], (err, results) => {
          if (err) {
              return res.status(500).json({ error: err.message });
          }

          const orderID = results.insertId;

          // Step 2: Insert into OrderDetails table
          const orderDetailsQuery = 'INSERT INTO OrderDetails (OrderID, ProductID, Quantity, Price) VALUES (?, ?, ?, ?)';
          db.query(orderDetailsQuery, [orderID, ProductID, Quantity, TotalAmount], (err) => {
              if (err) {
                  return res.status(500).json({ error: err.message });
              }

              // Step 3: Update stock quantity
              const newStockQuantity = stockQuantity - Quantity;
              db.query('UPDATE Product SET StockQuantity = ? WHERE ProductID = ?', [newStockQuantity, ProductID], (err) => {
                  if (err) {
                      return res.status(500).json({ error: err.message });
                  }

                  res.status(200).json({ message: 'Order placed successfully!' });
              });
          });
      });
  });
});





 // Delete product by ProductName
 // Route to delete product by name
app.delete('/api/delete-product/:name', (req, res) => {
  const productName = req.params.name;

  // First, delete the related records in orderdetails table
  const deleteOrderDetailsQuery = 'DELETE FROM orderdetails WHERE ProductID = (SELECT ProductID FROM product WHERE ProductName = ?)';
  
  db.query(deleteOrderDetailsQuery, [productName], (err, result) => {
    if (err) {
      console.error('Error deleting from orderdetails:', err);
      return res.status(500).json({ error: 'Failed to delete related order details' });
    }

    // Now, delete the product from the product table
    const deleteProductQuery = 'DELETE FROM product WHERE ProductName = ?';
    db.query(deleteProductQuery, [productName], (err, result) => {
      if (err) {
        console.error('Error deleting product:', err);
        return res.status(500).json({ error: 'Failed to delete product' });
      }

      res.status(200).json({ message: 'Product and related order details deleted successfully' });
    });
  });
});



