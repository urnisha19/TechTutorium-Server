//---------------------------> Importing necessary libraries
require("dotenv").config(); // Loads environment variables from a .env file into process.env
const express = require('express');
const app = express();
const jwt = require("jsonwebtoken"); // JSON Web Token implementation
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors'); //Cross-Origin Resource Sharing middleware
const port = process.env.PORT;
//--------------------------->

//---------------------------> Middleware setup
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Body parser middleware,parse JSON request bodies
//--------------------------->

//---------------------------> Function to create JWT token
//This function generates a JWT token when a user signs in.
function createToken(user) {
  const token = jwt.sign(
    //we will pass three parameter in the token
    {
      email: user.email, // 1st parameter: user information
    },
    "secret", // 1st parameter: user information
    { expiresIn: "7d" } // 3rd parameter: Token expiration time
  );
  //console.log("Token: ",token);
  return token;
}
//--------------------------->

//---------------------------> Middleware to verify JWT token
/**This function extracts the token from the Authorization header, 
 * verifies it using the secret key, 
 * and attaches the user's email to the request object if the token is valid. 
 * If the token is invalid or missing email information, it returns an "Unauthorized" message.
 */
function verifyToken(req, res, next) {
  // (authorization: Bearer ${token} ke split korbo somoy ta array hoye jabe and token 2nd element hobe tai [1])
  const token = req.headers.authorization.split(" ")[1]; // Extract token from Authorization header
  const verify = jwt.verify(token, "secret"); // Verify the token
  if (!verify?.email) {
    return res.send("You are not authorized"); // Return unauthorized if token is invalid or missing email
  }
  req.user = verify.email; // Attach email to request object
  next(); // Call next middleware function of midlleware
}
//--------------------------->

//---------------------------> MongoDB connection URI
const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
//--------------------------->

//---------------------------> Async function to run server
// The run function connects to MongoDB and sets up the database and collection.
async function run() {
  try {
    await client.connect(); // Connecting to MongoDB
    console.log("You successfully connected to MongoDB!");

    // Create and access databases
    const userDB = client.db("userDB"); // Database for users
    const userCollection = userDB.collection("userCollection"); // Collection for users


    //---------------------------> Routes for user operations
    // Register/login user
    /**
    * POST /user
    * This endpoint receives user data from the frontend and inserts it into MongoDB.
    * This route is used in the GoogleLogin and Registration component on the frontend
    * It listens to POST requests at http://localhost:3000/user
    */
    app.post("/user", async (req, res) => {
      const user = req.body; // Extract user data from the request body
      const token = createToken(user); // Create a JWT token for the user

      // Check if the user already exists in the database
      const isUserExist = await userCollection.findOne({ email: user?.email });
      console.log("Is user with this email exist: ", isUserExist);

      // If the user exists, send a success message with the token
      if (isUserExist?._id) {
        return res.send({
          status: "success",
          message: "Login success",
          token,
        });
      }
      // If the user does not exist, insert them into the database and send the token
      await userCollection.insertOne(user);
      //console.log(token);
      return res.send({ token }); //sending token to clint after log in/registration
    });

    /**
    * GET /user/get/:id
    * Route to retrieve user information by ID from the database.
    * This route is used in the frontend to fetch user information for the EditProfile component.
    * It listens to GET requests at http://localhost:3000/user/get/:id.
    */
    app.get("/user/get/:id", async (req, res) => {
      const id = req.params.id; // Retrieve the user ID from the request parameters
      const result = await userCollection.findOne({ _id: new ObjectId(id) }); // Find the user document by ID in the database
      res.send(result); // Send the user data back to the client
    });

    /**
     * GET /user/:email
     * Route to retrieve user information by email from the database.
     * This route is used in the frontend to fetch user information for the dashboard.
     * It listens to GET requests at http://localhost:3000/user/:email.
     * */
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email; // Extract email parameter from request
      const result = await userCollection.findOne({ email }); // Find user by email in the database
      res.send(result); // Send user information back to frontend
    });

    // Update user by email
    /**
     * PATCH /user/:email
     * Route to update user information by email in the database.
     * This route is used in the frontend to update user profile information.
     * It listens to PATCH requests at http://localhost:3000/user/:email.
     */
    app.patch("/user/:email", async (req, res) => {
      const email = req.params.email; // Extract email parameter from request
      const userData = req.body; // Extract updated user data from request body
      const result = await userCollection.updateOne(
        { email }, // Filter user by email
        { $set: userData }, // Update user data
        { upsert: true } // Create a new user if not found
      );
      res.send(result); // Send response back to frontend
    });
    //--------------------------->

  } finally {
    // Commented out to keep the client connection open for handling multiple requests
    // await client.close();
  }
}
//--------------------------->

//---------------------------> Call the run function, Ensure the client is connected before starting the server
run().catch(console.dir);
//--------------------------->

//---------------------------> Route for root path
app.get("/", (req, res) => {
  res.send("Route is working");
});
//--------------------------->

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

// urnisha09
// NRTiKhgqq06v1hN9