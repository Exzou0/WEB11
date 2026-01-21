require('dotenv').config(); 
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(express.json()); 


const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

let productsCollection;


const client = new MongoClient(MONGO_URI);

client.connect()
  .then(() => {
    const db = client.db('shop');
    productsCollection = db.collection('products');
    console.log('Connected to MongoDB');
  })
  .catch(err => console.error('Connection Error:', err));


app.get('/', (req, res) => {
  res.send(`
    <h1>Shop</h1>
    <ul>
      <li><a href="/api/products">View All Products (/api/products)</a></li>
      <li><a href="/api/products?minPrice=50&sort=price">Sort > 50 </a></li>
      <li><a href="/api/products?fields=name,price">Projection</a></li>
    </ul>
  `);
});


app.post('/api/products', async (req, res) => {
  try {
    const { name, price, category } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const newProduct = { name, price: Number(price), category };
    const result = await productsCollection.insertOne(newProduct);
    

    res.status(201).json({ _id: result.insertedId, ...newProduct });
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, minPrice, sort, fields } = req.query;

    let query = {};
    if (category) query.category = category;
    if (minPrice) query.price = { $gte: Number(minPrice) };

    let sortOptions = {};
    if (sort === 'price') sortOptions.price = 1;

    let projection = {};
    if (fields) {
      fields.split(',').forEach(f => projection[f.trim()] = 1);
    }

    const list = await productsCollection
      .find(query)
      .sort(sortOptions)
      .project(projection)
      .toArray();

    res.json({ count: list.length, products: list });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

app.use((req, res) => res.status(404).json({ error: 'API endpoint not found' }));

app.listen(3000, () => console.log('Server: http://localhost:3000'));