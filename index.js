const express = require("express");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xxoesz5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = async (req, res, next) => {
  console.log('called:', req.host, req.originalUrl);
  next();
}

const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  console.log(token);
  if (!token) {
    return res.status(401).send({ message: 'not authorized' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SCRETE, (err, decoded) => {
    //error
    if (err) {
      return res.status(401).send({ message: 'unauthorized' });
    }

    // if token is valid then it would be decoded
    console.log('value in the token', decoded);
    req.user = decoded;
    next();
  })
}
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const blogCollection = client.db("blogDB").collection("blogs");
    const wishlistCollection = client.db("blogDB").collection("wishlist");

    // token
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      console.log(token);
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      }).send({ success: true });
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log(user);
      res.clearCookie('token', { maxAge: 0 }).send({ success: true });
    })

    // create

    // blogs
    app.post("/blogs", async (req, res) => {
      const newBlog = req.body;
      console.log(newBlog);
      const result = await blogCollection.insertOne(newBlog);
      res.send(result);
    })

    // wishlist
    app.post("/wishlist", async (req, res) => {
      const newBlog = req.body;
      console.log(req.cookies);
      console.log(newBlog);
      const result = await wishlistCollection.insertOne(newBlog);
      res.send(result);
    })

    // blogs read 
    app.get("/blogs", async (req, res) => {
      const cursor = blogCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // wishlist read 
    app.get("/wishlist", logger, verifyToken, async (req, res) => {
      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const cursor = wishlistCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // blogs find specific id 
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.findOne(query);
      res.send(result);
    })
    // wishlist find specific email 
    app.get("/wishlist/:email", async (req, res) => {
      const result = await wishlistCollection.find({ email: req.params.email }).toArray();
      console.log(result);
      res.send(result);
    })

    // update
    app.put("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedBlog = req.body;
      const blog = {
        $set: {
          title: updatedBlog.title,
          image: updatedBlog.image,
          category: updatedBlog.category,
          shortDes: updatedBlog.shortDes,
          longDes: updatedBlog.longDes
        },
      };
      const result = await blogCollection.updateOne(filter, blog, options);
      res.send(result);
    })

    // delete
    app.delete('/wishlist/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);








app.get("/", (req, res) => {
  res.send("MediTech Server is running...");
})

app.listen(port, () => {
  console.log(`MediTech Server on PORT: ${port}`);
})