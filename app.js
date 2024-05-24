const express = require('express');
const AWSXRay = require('aws-xray-sdk');
const mysql = AWSXRay.captureMySQL(require('mysql'));
const crypto = require('crypto');
const config = require('./config.json');

// X-Ray setup
AWSXRay.setDaemonAddress(config.daemonAddress);
AWSXRay.captureHTTPsGlobal(require('http'));

// Use dynamic naming for segments
AWSXRay.middleware.setDefaultName('Node-Xray');
const app = express();
app.use(AWSXRay.express.openSegment('Node'));

// MySQL connection setup (ensure it's connecting to RDS)
const connection = mysql.createConnection({
    host: 'devser-rds.cb8odrbfvgxj.us-east-1.rds.amazonaws.com', // RDS endpoint
    user: 'dev_vijays',
    password: 'f1be8a1fe57f41f645930a4c005f52e19191',
    database: 'dev_vijays'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

// Function to generate a random string
const generateRandomString = (length) => {
    return crypto.randomBytes(length).toString('hex');
};

app.get('/insert', (req, res) => {
    const randomString = generateRandomString(8); // Generates a random string of 16 characters (8 bytes)
    const segment = AWSXRay.getSegment(); // Get the current segment
    const subsegment = segment.addNewSubsegment('MySQL Query'); // Create a subsegment for the query

    const query = 'INSERT INTO mytable (name) VALUES (?)';
  subsegment.addAnnotation('SQL Query', query); 
	connection.query(query, [randomString], (err, result) => {
        if (err) {
            subsegment.addError(err); // Add error information to the subsegment
            subsegment.close(err); // Close the subsegment with an error
            console.error('Error inserting data:', err);
            res.status(500).send('Error inserting data');
            return;
        }
	subsegment.addMetadata('Result', result); // Add query result as metadata

        subsegment.close(); // Close the subsegment
        res.send(`Data inserted successfully: ${randomString}`);
    });
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use(AWSXRay.express.closeSegment());

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

