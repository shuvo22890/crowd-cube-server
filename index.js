require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ynkon.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Middleware
app.use(cors());
app.use(express.json());


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");


        const database = client.db("crowd-cube");
        const campaignsCollection = database.collection("campaigns");
        const donatedCollection = database.collection("donated");

        // Load all the campaigns excluding some fields
        app.get('/', async (req, res) => {
            const projection = {
                thumb: 0,
                description: 0,
                name: 0,
                email: 0
            }
            const cursor = campaignsCollection.find().project(projection);
            const result = await cursor.toArray();
            res.send(result);
        });

        // Load campaigns of logged in user
        app.post('/my-campaigns/', async (req, res) => {
            const queryEmail = req.body.email;
            const query = { email: queryEmail }
            const projection = {
                thumb: 0,
                description: 0,
                name: 0,
                email: 0
            }
            const cursor = campaignsCollection.find(query).project(projection);
            const result = await cursor.toArray();
            res.send(result);
        })

        // Load data for updading single campaign
        app.post('/for-update-campaign', async (req, res) => {
            const { id, email: loggedInEmail } = req.body;
            const query = { _id: new ObjectId(id) }
            const result = await campaignsCollection.findOne(query);

            if (result.email === loggedInEmail) {
                res.send(result);
                return;
            }
            res.send({ notOwnData: true });
        })

        // Update a single campaign
        app.put('/update-campaign', async (req, res) => {
            const { data, id } = req.body;


            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    ...data
                }
            }

            const result = await campaignsCollection.updateOne(filter, updateDoc, options)
            res.send(result);
        })

        // Load single campaign
        app.get('/campaigns/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await campaignsCollection.findOne(query);
            res.send(result);
        })

        // Load six running campaigns
        app.get('/running-campaigns', async (req, res) => {
            const dateNow = new Date().getTime();

            // Load the campaigns where deadline is greater than or equal to today
            const query = {
                deadline: { $gte: dateNow }
            }

            // Excluding some fields it will be displayed in details page
            const projection = {
                description: 0,
                amount: 0,
                name: 0,
                email: 0
            }

            const cursor = campaignsCollection.find(query).project(projection).limit(6);

            const result = await cursor.toArray();
            res.send(result);
        })

        // get donations of a logged in user
        app.post('/my-donations', async (req, res) => {
            const email = req.body.email;
            const query = { donor_email: email }
            const projection = {
                donor_email: 0,
                donor_name: 0,
                email: 0,
                name: 0,
                description: 0
            }
            const cursor = donatedCollection.find(query).project(projection);
            const result = await cursor.toArray();
            res.send(result);
        })

        // add a new campaign
        app.post('/add-campaign', async (req, res) => {
            const data = req.body;
            if (!data.email || data.email === '') return;
            const result = await campaignsCollection.insertOne(data);
            res.send(result);
        })

        // add data to donated collection
        app.post('/donate', async (req, res) => {
            const data = req.body;
            const query = {campaign_id: data.campaign_id, donor_email: data.donor_email}
            const isExists = await donatedCollection.findOne(query, {projection: {title: 1}});
            if(isExists){
                res.send({code: 11000});
                return;
            }
            const result = await donatedCollection.insertOne(data);
            res.send(result);

        })

        // delete a single campaign under logged in user
        app.delete('/delete-campaign', async (req, res) => {
            const id = req.body.id;
            const query = { _id: new ObjectId(id) };
            const result = await campaignsCollection.deleteOne(query);
            res.send(result)
        })
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Server is running at ${port}`)
})