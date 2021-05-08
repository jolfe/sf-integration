const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const indexRouter = require("./routes/index");
const apiRouter = require("./routes/api");
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/api", apiRouter);
const fs = require("fs");
const jsforce = require("jsforce");
const dotenv = require("dotenv");
dotenv.config();

// App Credentials
const {
  SF_LOGIN_URL,
  SF_USERNAME,
  SF_PASSWORD,
  SF_TOKEN,
  SF_CLIENT_ID,
  SF_CLIENT_SECRET,
} = process.env;

// Intialize auth that allows use to access refresh token
// Custom callback uri specified within SF App, can be changed to anything
const oauth2 = new jsforce.OAuth2({
  loginUrl: "https://login.salesforce.com",
  clientId: SF_CLIENT_ID,
  clientSecret: SF_CLIENT_SECRET,
  redirectUri: "http://localhost:8080/oauth2/callback",
});

// Login dialog for client to give us access
app.get("/oauth2/auth", (req, res) => {
  res.redirect(
    oauth2.getAuthorizationUrl({
      scope: "api id web refresh_token offline_access",
    })
  );
});

// Callback redirect that secures all of our neccesary values to continue having API access
app.get("/oauth2/callback", (req, res) => {
  let conn = new jsforce.Connection({ oauth2: oauth2 });
  let code = req.param("code");

  conn.authorize(code, (err, userInfo) => {
    if (err) {
      return console.error(err);
    }

    let creds = {
      id: conn.userInfo.id,
      orgId: conn.userInfo.organizationId,
      accessToken: conn.accessToken,
      refreshToken: conn.refreshToken,
      instanceUrl: conn.instanceUrl,
    };

    fs.writeFile(
      "./creds/" + conn.userInfo.id + ".json",
      JSON.stringify(creds),
      (err) => {}
    );
    res.send("Success");
  });
});

app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
