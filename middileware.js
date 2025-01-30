const List=require("./model/listing");
const Review=require("./model/Review");
module.exports.isLoggedin=(req,res,next)=>{
    if(!req.isAuthenticated()){
       req.session.redirectUrl=req.originalUrl;
       req.flash("error","You must logedin firstly.");
       return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl=(req,res,next)=>{
   if(req.session.redirectUrl){
    res.locals.redirectUrl=req.session.redirectUrl;
   }
   next();
};

module.exports.isOwner=async (req,res,next)=>{
 let {id}=req.params;
 let listing=await List.findById(id);
 if(!listing.owner.equals(res.locals.currUser._id)){
  req.flash("error","You are not the owner of this listing");
  return res.redirect(`/listing/${id}`);
 }
 next();
}

module.exports.isReviewauthor=async (req,res,next)=>{
   let {id,reviewId}=req.params;
   let listing=await Review.findById(reviewId);
   if(!listing.author.equals(res.locals.currUser._id)){
    req.flash("error","it is not your review");
    return res.redirect(`/listing/${id}`);
   }
  }