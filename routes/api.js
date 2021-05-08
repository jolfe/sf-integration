const express = require("express");
const router = express.Router();
const jsforce = require("jsforce");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const {
  SF_LOGIN_URL,
  SF_USERNAME,
  SF_PASSWORD,
  SF_TOKEN,
  SF_CLIENT_ID,
  SF_CLIENT_SECRET,
  SF_REDIRECT_URI,
} = process.env;

let conn;

const checkOrg = (id, err) => {
  let stringUrl = "../" + id + ".json";
  console.log(stringUrl);
  const creds = JSON.parse(
    fs.readFileSync(path.resolve("./creds", id + ".json")).toString()
  );
  
  console.log(creds);
    
  conn = new jsforce.Connection({
    oauth2: {
      clientId: SF_CLIENT_ID,
      clientSecret: SF_CLIENT_SECRET,
      redirectUri: SF_REDIRECT_URI,
    },
    instanceUrl: creds.instanceUrl,
    accessToken: creds.accessToken,
    refreshToken: creds.refreshToken,
  });
};

// Change which org (client)
checkOrg("0054x000003SDR0AAO");

// Used to check access token validity and refresh token(s)
router.get("/", (req, res, next) => {
  conn.oauth2.refreshToken(conn.refreshToken, (err, results) => {
    if (err) return err;
    res.send(results);
  });
});

// Fetches all contacts
router.get("/contacts", (req, res, next) => {
  let records = [];

  conn.query("SELECT Id, Name FROM Account", (err, result) => {
    if (err) {
      return res.send(result.records);
      return console.error(err);
    }
    return res.send(JSON.stringify(result.records));
  });
});

// Example of checking for updated records (recent), can also sort by date ("Today" or custom values)
router.get("/update", (req, res, next) => {
  conn.sobject("Account").recent((err, result) => {
    if (err) {
      return console.error(err);
    }
    return res.send(result);
  });
});

// Example for querying contacts created today, alternatively you can change params to whatever such as: params.ModifiedDate: ....

/* conn.sobject("Contact")
  .find({ CreatedDate: jsforce.Date.TODAY }) // "fields" argument is omitted
  .execute((err, records) => {
    if (err) { return console.error(err); }
    console.log(records);
  }); */

// Example of loading data from Tone into SF (temporary)
router.get("insert", (req, res) => {
  var csvFileIn = require("fs").createReadStream("path/to/Account.csv");
  conn.bulk.load("Account", "insert", csvFileIn, (err, rets) => {
    if (err) {
      return console.error(err);
    }
    for (var i = 0; i < rets.length; i++) {
      if (rets[i].success) {
        console.log("#" + (i + 1) + " loaded successfully, id = " + rets[i].id);
      } else {
        console.log(
          "#" +
            (i + 1) +
            " error occurred, message = " +
            rets[i].errors.join(", ")
        );
      }
    }
  });
});

module.exports = router;
