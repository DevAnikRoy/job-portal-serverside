const express = require('express')
const cors = require('cors')

// here we are generating token form JWT
const jwt = require('jsonwebtoken')

// cookie parser for the token
const cookieParser = require('cookie-parser')

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express()
const port = process.env.PORT || 3000;

// middleware using

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
// have to use the cookieParser with call
app.use(cookieParser())

// using when verify the token
const logger = (req, res, next) => {
    console.log('inside the logger middleware')
    next()
}

// ***************************************
// This is form fire base Project settings
var admin = require("firebase-admin");

var serviceAccount = require("./firebase-admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



// ***************************************

// for verify the token
const verifyToken = (req, res, next) => {
    const token = req?.cookies.token;
    console.log('cookie int the middleware', token)
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    // verify token cookies
    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        // console.log(decoded)
        next()
    })
}

// verify firebase token
const verifyFirebaseToken = async(req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    if (token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    
    const userInfo = await admin.auth().verifyIdToken(token)
    req.tokenEmail = userInfo.email;
    next()

}




// *******************************************************************************************


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ngwkmsl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // getting the collection form the db
        const jobsCollection = client.db('job-portal').collection('jobs')
        const applicationCollection = client.db('job-portal').collection('applications')

        // *********************************************************************
        // jwt token related apis
        app.post('/jwt', async (req, res) => {
            const userData = req.body;
            const token = jwt.sign(userData, process.env.JWT_ACCESS_SECRET, { expiresIn: '1d' });

            // set token in the cookies
            res.cookie('token', token, {
                httpOnly: true,
                secure: false
            })

            res.send({ success: true })
        })


        // *********************************************************************


        // jobs api
        app.get('/jobs', async (req, res) => {
            // checking the email to get a job poster posted jobs
            const email = req.query.email;
            const query = {};
            if (email) {
                query.he_email = email;
            }
            // here is normal get api
            const cursor = jobsCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        // jobs details
        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.findOne(query);
            res.send(result)
        })

        // Added Job related Api
        app.post('/jobs', async (req, res) => {
            const newJob = req.body;
            const result = await jobsCollection.insertOne(newJob);
            res.send(result)
        })

        // to get the view application
        app.get('/applications/job/:job_id', async (req, res) => {
            const job_id = req.params.job_id;
            const query = { jobId: job_id };
            const result = await applicationCollection.find(query).toArray();
            res.send(result);
        })

        // getting the updated status data 
        app.patch('/applications/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: req.body.status
                }
            }
            const result = await applicationCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        // sending applicants data to the UI
        app.get('/applications', logger, /*verifyToken*/ verifyFirebaseToken, async (req, res) => {
            const email = req.query.email;
            
            if(req.tokenEmail != email){
                return res.status(403).send({message: 'forbidden access'})
            }

            // console.log('inside application api', req.cookies);
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = {
                applicant: email
            }
            const result = await applicationCollection.find(query).toArray()
            // bad way to get aggregate data
            for (const application of result) {
                const jobId = application.jobId;
                const jobQuery = { _id: new ObjectId(jobId) };
                const job = await jobsCollection.findOne(jobQuery)
                application.company = job.company
                application.title = job.title
                application.company_logo = job.company_logo
            }
            res.send(result);
        })

        // jobs application related apis
        app.post('/applications', async (req, res) => {
            const application = req.body
            console.log(application)
            const result = await applicationCollection.insertOne(application)
            res.send(result)
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



// ********************************************************************************************

app.get('/', (req, res) => {
    res.send('Hello world')
})

app.listen(port, () => {
    console.log(`Example app listing on port ${port}`)
})