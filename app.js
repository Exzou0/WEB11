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
      <li><a href="/version">Current version</a></li>
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

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID format' });

    const product = await productsCollection.findOne({ _id: new ObjectId(id) });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });

    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: req.body } 
    );

    if (result.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated successfully', result });
  } catch (error) {
    res.status(500).json({ error: 'Update error' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });

    const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Delete error' });
  }
});

app.get('/version', (req, res) => {
    res.json({
        "version": "1.1",
        "updatedAt": "2026-01-21" 
    });
});

app.use((req, res) => res.status(404).json({ error: 'API endpoint not found' }));

app.listen(3000, () => console.log('Server: http://localhost:3000'));