const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require('connect-mongo').default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

// Environment variables
if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const dbURL = process.env.ATLAS_URL;

// Mongo session store
const store = MongoStore.create({
    mongoUrl: dbURL,
    crypto: { secret: process.env.SECRET },
    touchAfter: 24 * 3600
});

store.on("error", (err) => {
    console.log("SESSION STORE ERROR", err);
});

// Express setup
app.engine('ejs', ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Session
app.use(session({
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 7*24*60*60*1000, httpOnly: true }
}));

app.use(flash());

// Passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global variables
app.use((req, res, next) => {
    res.locals.currUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});

// Routers
app.use("/listings", require("./Routes/listings.js"));
app.use("/listings/:id/review", require("./Routes/review.js"));
app.use("/", require("./Routes/user.js"));

// Error handling
app.use((req, res, next) => next(new ExpressError(404, "Page Not Found")));
app.use((err, req, res, next) => {
    const { status = 500, message = "Something Went Wrong" } = err;
    res.status(status).render("error.ejs", { message });
});

// DB connection & server start
async function main() {
    await mongoose.connect(dbURL);
    console.log("Connected to DB");
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}

main().catch(err => console.log(err));
