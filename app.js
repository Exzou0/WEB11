require('dotenv').config(); 
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(express.json()); 

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

const API_KEY = process.env.API_KEY || "topsecret";

let itemsCollection;

const client = new MongoClient(MONGO_URI);

client.connect()
  .then(() => {
    const db = client.db('shop');
    itemsCollection = db.collection('items');
    console.log('Connected to MongoDB: items collection');
  })
  .catch(err => console.error('Connection Error:', err));


const Auth = (req, res, next) => {
  const userKey = req.headers['api-key'];

  if (!userKey || userKey !== API_KEY) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid or missing API Key' 
    });
  }
  next(); 
};

app.get('/', (req, res) => {
  res.send(`
    <h1>Protected API (Task 14)</h1>
    <ul>
      <li><a href="/api/items">GET /api/items</a> (Public)</li>
      <li><a href="/version">GET /version</a> (Public)</li>
    </ul>
    `);
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await itemsCollection.find().toArray();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID format' });
    const item = await itemsCollection.findOne({ _id: new ObjectId(id) });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});


app.post('/api/items', Auth, async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    const newItem = { name, price: Number(price) };
    const result = await itemsCollection.insertOne(newItem);
    res.status(201).json({ _id: result.insertedId, ...newItem });
  } catch (error) {
    res.status(500).json({ error: 'Error creating item' });
  }
});

app.put('/api/items/:id', Auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });
    if (!name || price === undefined) return res.status(400).json({ error: 'Full update requires name and price' });

    const result = await itemsCollection.replaceOne(
      { _id: new ObjectId(id) },
      { name, price: Number(price) }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Item not found' });
    res.status(200).json({ message: 'Item replaced successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Update error' });
  }
});

app.patch('/api/items/:id', Auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });
    const result = await itemsCollection.updateOne({ _id: new ObjectId(id) }, { $set: req.body });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Item not found' });
    res.status(200).json({ message: 'Item patched successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Patch error' });
  }
});

app.delete('/api/items/:id', Auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });
    const result = await itemsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Item not found' });
    res.status(204).send(); 
  } catch (error) {
    res.status(500).json({ error: 'Delete error' });
  }
});

app.get('/version', (req, res) => {
    res.json({ "version": "1.3", "updatedAt": "2026-01-28" });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));