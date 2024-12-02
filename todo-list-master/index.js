require("dotenv").config();
const express = require("express");
const app = express();
//
const date = require(__dirname + "/date.js");
const day = date.getDateWitoutYearFrom_datejs_module();
//
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", false);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// const options = {
//   errorMessages: {
//       MissingPasswordError: 'No password was given',
//       AttemptTooSoonError: 'Account is currently locked. Try again later',
//       TooManyAttemptsError: 'Account locked due to too many failed login attempts',
//       NoSaltValueStoredError: 'Authentication not possible. No salt value stored',
//       IncorrectPasswordError: 'Password or username are incorrect',
//       IncorrectUsernameError: 'Password or username are incorrect',
//       MissingUsernameError: 'No username was given',
//       UserExistsError: 'A user with the given username is already registered'
//   }
// };

// userSchema.plugin(passportLocalMongoose,options);
userSchema.plugin(passportLocalMongoose);

// Model
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const itemsSchema = new mongoose.Schema({
  name: String,
  email: String,
});

const Item = mongoose.model("Item", itemsSchema);

//
const item1 = new Item({
  name: "Welcome to to-do list",
  email: "",
});
const item2 = new Item({
  name: "Click on ➕ to add new item to the list",
  email: "",
});
const item3 = new Item({
  name: "⬅️Click here to delete an item",
  email: "",
});

const defaultItems = [item1, item2, item3];
//

const listSchema = {
  name: String,
  items: [itemsSchema],
  email: String,
};

const List = mongoose.model("List", listSchema);

app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    Item.find({ email: req.user.username }, { name: 1, _id: 0 })
      .then(
        (def_info) => {
          if (def_info) {
            res.render("list", {
              listTitle: day,
              newListItems: def_info,
              day: day,
            });
          } else {
            console.log("no default info found");
          }
        },
        (err) => {
          console.log("errors are: " + err);
        }
      )
      .catch((err) => {
        console.log(`${err} while finding lists of:${req.user.username}`);
        res.redirect("/");
      });
  } else {
    res.render("home");
  }
});

app.get("/about",(req,res)=>{
  res.render("about");
})

app.get("/create-goto-:customListName", (req, res) => {
  if (req.isAuthenticated()) {
    const customListName = _.capitalize(req.params.customListName);

    List.findOne({
      $and: [{ name: customListName }, { email: req.user.username }],
    })
      .then((info) => {
        if (info) {
          //already exists
          res.render("list", {
            listTitle: info.name,
            newListItems: info.items,
            day: day,
          });
        } else {
          const list = new List({
            name: customListName,
            items: [],
            email: req.user.username,
          });
          list
            .save()
            .then((msg) => {
              // console.log(
              //   "new list with name : " + customListName + " is created"
              // );
              res.redirect("/create-goto-" + customListName); //This is imp. o/w the user is left hanging! This redirects to same page but this time the if condition is executed
            })
            .catch((error) => {
              console.log("New list couldn't be created bcoz of: " + error);
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    res.render("home");
  }
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

//remember to add the logout button in frontendd as well
app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      console.log("Error while logging out: " + err);
    } else {
      res.redirect("/");
    }
  });
});
//
// register, login
app.post("/register", function (req, res) {
  var newUser = new User({ username: req.body.username });
  User.register(newUser, req.body.password, function (err, user) {
    if (err) {
      console.log("This is the error while registering: " + err);
      return res.redirect("/");
    } else {
      // console.log(`${user} is registered`);
      
      passport.authenticate("local")(req, res, () => {
        const defaultItemsForAUser = defaultItems;
        defaultItemsForAUser[0].email = req.user.username;
        defaultItemsForAUser[1].email = req.user.username;
        defaultItemsForAUser[2].email = req.user.username;
        Item.insertMany(defaultItemsForAUser)
          .catch((err) => {
            console.log("errors : " + err);
          })
          .then((success) => {
            // console.log(success);
          });
        return res.redirect("/");
      });
    }
  });
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/login");
      // return;
    } else {
      passport.authenticate("local", { failureRedirect: "/" })(req, res, () => {
        res.redirect("/");
      });
    }
  });
});

//
app.post("/", (req, res) => {
  if (req.isAuthenticated()) {
    const item_name = req.body.newItem;
    const listName = req.body.listName;

    const item = new Item({
      name: item_name,
      email: req.user.username,
    });

    if (listName === day) {
      item
        .save()
        .then((msg) => {
          // console.log("successful insertion of " + msg);
          res.redirect("/");
        })
        .catch((err) => {
          console.log("errors while inserting " + item + " : " + err);
          // res.redirect("/");
        });
    } else {
      //💥something new:- to insert something into an embedded document 1st find parent document by findOne
      // then push the new document into the arrayed documents( (or)document with some schema array as their element)
      // by simply push since it's
      List.findOne({ $and: [{ name: listName }, { email: req.user.username }] })
        .then((foundList) => {
          // console.log(foundList);
          foundList.items.push(item);
          foundList
            .save()
            .then(() => {
              res.redirect("/create-goto-" + listName);
            })
            .catch((err) => {
              console.log(err);
            });
        })
        .catch((error) => {
          console.log(
            "Couldn't perform insertion of the new item due to:\n" + error
          );
          // res.redirect("/")
        });
    }
  } else {
    res.render("home");
  }
});

app.post("/delete_items/:list_name", (req, res) => {
  if (req.isAuthenticated()) {
    const item_name = req.body.delete_list_item;
    const list_name = req.params.list_name;

    if (list_name === day) {
      Item.deleteOne({
        $and: [{ name: item_name }, { email: req.user.username }],
      })
        .then((delete_info) => {
          // console.log(delete_info);
          res.redirect("/");
        })
        .catch((err) => {
          console.log("Error while deleting the item : " + err);
        });
    } else {
      List.findOneAndUpdate(
        { $and: [{ name: list_name }, { email: req.user.username }] },
        { $pull: { items: { name: item_name } } },
        (err, foundList) => {
          if (err) {
            console.log(
              "Deletion of " +
                item_name +
                " from " +
                list_name +
                " is Unsuccessful due to:\n" +
                err
            );
          } else {
            // console.log(
            //   "Deletion of " +
            //     item_name +
            //     " from " +
            //     list_name +
            //     " is successful:\n" +
            //     foundList
            // );
            res.redirect("/create-goto-" + list_name);
          }
        }
      );
    }
  } else {
    res.redirect("/login");
  }
});

app.post("/create-goto", (req, res) => {
  res.redirect("/create-goto-" + req.body.listname);
});

app.post("/home", (req, res) => {
  res.redirect("/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Example app listening on port:" + PORT));
