if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
}

const express=require("express");
const app=express();
const mongoose=require("mongoose");
const path=require("path");
const methodOverride=require("method-override");
const ejsMate=require("ejs-mate");
const session=require("express-session");
const flash=require("connect-flash");
const wrapAsync=require("./utils/wrapAsync.js");
const ErrorCatch=require("./utils/ErrorCatch.js");
const List=require("./model/listing");
const {listingSchema, reviewSchema}=require("./schema.js");
const Review = require("./model/Review.js");
const User=require("./model/user.js");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const { required } = require("joi");
const userRoutes=require("./Routs/user.js");
const {isLoggedin,isOwner,isReviewauthor}=require("./middileware.js");
const lsitingController=require("./controller/listings.js");
const multer=require("multer");
const {storage}=require("./cloudConfig.js");
const upload = multer({storage});
const MongoStore = require('connect-mongo');


app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")))
app.use(express.urlencoded({ extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
const url= "mongodb+srv://kuldeepskd51:c6g4tAxh67NzDTfv@cluster0.09ofg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const store = MongoStore.create({
    mongoUrl:url,
    crypto: {
      secret: process.env.SECRET
    }
  })

const sessionOption={
    store,
    secret:"vgchsbjdcghjkfvjkl",
    resave:false,
    uninitialized:true,
    cookie:{
        expires:Date.now()+7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly:true,
    }
}

app.use(session(sessionOption));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req,res,next)=>{
    res.locals.currUser=req.user || null;
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    // const currUser = req.session ? req.session.user : null;
    console.log('Local currUser:', res.locals.currUser);
    next();
})
app.use("/",userRoutes);

 
main().then(()=>{
    console.log("connection successfully");
}).catch((err)=>{
  console.log(err);
});
async function main(){
    await mongoose.connect(url);
}

// async function main(){
//     await mongoose.connect('mongodb://127.0.0.1:27017/wanderlust');
// }


app.listen(8000,()=>{
    console.log("Server is running");
})


app.get("/listing",wrapAsync(lsitingController.index));
app.get("/listing/:id",isLoggedin,wrapAsync(lsitingController.showIndex));
app.get("/create",isLoggedin,lsitingController.createList);

const validateListing=(req,res,next)=>{
    let {error}=listingSchema.validate(req.body);
    if(error){
           throw new ErrorCatch(400,error);
    }
    next();
 }
 const validateReview=(req,res,next)=>{
    let {error}=reviewSchema.validate(req.body);
    if(error){
           throw new ErrorCatch(400,error);
    }
    next();
 }
  
  

app.post("/creates",validateListing,upload.single("list[image]"),wrapAsync(lsitingController.createnewList));

 app.get("/edit/:id",isLoggedin,isOwner,wrapAsync(lsitingController.edit));

app.put("/edid/:id",upload.single("list[image]"),validateListing,wrapAsync(lsitingController.update));

app.delete("/delete/:id",isOwner,lsitingController.deleteList);

app.post("/review/:id",isLoggedin,validateReview,wrapAsync(async (req,res)=>{
    let {id}=req.params;
    let listing=await List.findById(id);
    let newReview=new Review(req.body.review);
    listing.reviews.push(newReview);
    newReview.author=req.user._id;
    await newReview.save();
    await listing.save();
    req.flash("success","Review added successfully");
    res.redirect(`/listing/${listing._id}`);
}));

app.delete("/review/:id/delete/:reviewId",isLoggedin,isReviewauthor,wrapAsync(async(req,res,next)=>{
   let {id,reviewId}=req.params;
   const re=await List.findByIdAndUpdate(id,{$pull:{reviews:reviewId}});
   await Review.findByIdAndDelete(reviewId);
   console.log(re);
   req.flash("success","Reviews Deleted");
   res.redirect(`/listing/${id}`);
}));

app.all("*",(req,res,next)=>{
    next(new ErrorCatch(404,"Page Not Founds"));
});
app.use((err,req,res,next)=>{
     let { status=404, message="Something went wrong" }=err; 
      res.status(status).render("error.ejs",{message});;
});




