var express=require('express');
var app=express();
var http=require('http');

var formidable=require('express-formidable');
app.use(formidable());

var mongodb=require('mongodb');
var mongoClient=mongodb.MongoClient;//start the server and sets the database
var ObjectId=mongodb.ObjectId;//unique idea of each doc created..

var http=require('http').createServer(app);
var bcrypt=require('bcryptjs');
var fileSystem=require('fs');

var jwt=require('jsonwebtoken');
var accessTokenSecret="myAccessTokenSecret1234567890";

app.use("/public",express.static(__dirname+"/public"));
app.set("view engine","ejs");

var socketIO=require("socket.io")(http);
var socketID="";
var users=[];

var mainURL="http://localhost:3000";

socketIO.on("connection",function(socket){
    console.log("User connected",socket.id);
    socketID=socket.id;
});

http.listen(3000,function(){
    console.log("App is connected");
    mongoClient.connect("mongodb://localhost:27017",function(err,client){
        var database=client.db("weshare");
        console.log("Database Connected");

        app.get("/signup",function(req,res){
            res.render("signup");
        });

        app.post("/signup",function(req,res){
            var name=req.fields.name;
            var username=req.fields.username;
            var email=req.fields.email;
            var password=req.fields.password;
            var gender=req.fields.gender;

            database.collection("users").findOne({
                $or:[{
                    "email":email
                },{
                    "username": username
                }]
            },function(err,user){
                if(user==null)
                {
                    bcrypt.hash(password,10,function(error,hash){
                        database.collection("users").insertOne({
                            "name":name,
                            "username":username,
                            "email":email,
                            "password":hash,
                            "gender":gender,
                            "profileImage":"",
                            "coverPhoto":"",
                            "dob":"",
                            "city":"",
                            "country":"",
                            "aboutMe":"",
                            "friends":[],
                            "pages":[],
                            "notifications":[],
                            "groups":[],
                            "posts":[]
                        },function(err,data){
                            res.json({
                                "status":"success",
                                "message":"Signed up Successfully. You can login now"
                            });
                        });
                    });
                }
                else{
                    res.json({
                        "status":"error",
                        "message":"Email or username already exists"
                    });
                }
            });
        });

        app.get("/login",function(req,res){
            res.render("login");
        })

        app.post("/login",function(req,res){
            var email=req.fields.email;
            var password=req.fields.password;
            
            database.collection("users").findOne({
                "email":email
            },function(err,user){
                if(user==null)
                {
                    res.json({
                        "status":"error",
                        "message":"Email doesn't exists"
                    });
                }else{
                    bcrypt.compare(password,user.password,function(err,isVerify){
                        if(isVerify){
                            var accessToken=jwt.sign({email:email},accessTokenSecret);
                            database.collection("users").findOneAndUpdate({
                                "email":email
                            },{
                                $set:{
                                    "accessToken":accessToken
                                }
                            },function(err,data){
                                res.json({
                                    "status":"success",
                                    "message":"Login Successfully",
                                    "accessToken":accessToken,
                                    "profileImage":user.profileImage
                                });
                            });
                        }else{
                            res.json({
                                "status":"error",
                                "message":"Password Incorrect .. Try Again!!"
                            })
                        }
                    })
                }
            })
        })

        app.get("/updateProfile",function(req,res){
            res.render("updateProfile");
        })

        app.post("/getUser",function(req,res){
            var accessToken=req.fields.accessToken;
            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null)
                {
                    res.json({
                        "status":"error",
                        "message":"User has been logged out.Please login again"
                    });
                }else{  
                    res.json({
                        "status":"success",
                        "message":"Record has been sent",
                        "data":user
                    })
                }
            }) 
        })

        app.get('/logout',function(req,res){
            res.redirect("/login");
        })

        app.post('/uploadCoverPhoto',function(req,res){
            var accessToken=req.fields.accessToken;
            var coverPhoto="";

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null)
                {
                    res.json({
                        "status":"error",
                        "message":"User has been logged Out. Needs to Login again!!"
                    })
                }else{
                    if(req.files.coverPhoto.size>0 && req.files.coverPhoto.type.includes("image")){
                        if(user.coverPhoto!=""){
                            fileSystem.unlink(user.coverPhoto,function(err){
                            })
                        }
                        coverPhoto="public/images/"+new Date().getTime()+"-"+req.files.coverPhoto.name;
                        fileSystem.rename(req.files.coverPhoto.path,coverPhoto,function(err){

                        })

                        database.collection("users").updateOne({
                            "accessToken":accessToken
                        },{
                            $set:{
                                "coverPhoto":coverPhoto
                            }
                        },function(err,data){
                            res.json({
                                "status":"success",
                                "message":"Cover photo has been updated",
                                "data":mainURL+"/"+coverPhoto
                            })
                        })
                    }else{
                        res.json({
                            "status":"error",
                            "message":"Please select a valid image.."
                        })
                    }
                }
            })
        })

        app.post("/uploadProfileImage",function(req,res){
            var accessToken=req.fields.accessToken;
            var profileImage="";

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null)
                {
                    res.json({
                        "status":"error",
                        "message":"User is Logged Out. Please Login Again!!"
                    })
                }else{
                    if(req.files.profileImage.size>0 && req.files.profileImage.type.includes("image"))
                    {
                        if(user.profileImage!=""){
                            fileSystem.unlink(user.profileImage,function(err){
                            })
                        }
                        profileImage="public/images/"+new Date().getTime()+'-'+req.files.profileImage.name;
                        fileSystem.rename(req.files.profileImage.path,profileImage,function(err){
                        })

                        database.collection("users").updateOne({
                            "accessToken":accessToken
                        },{
                            $set:{
                                "profileImage":profileImage
                            }
                        },function(err,data){
                            res.json({
                                "status":"success",
                                "message":"Profile images Succesfully updated",
                                "data":mainURL+"/"+profileImage
                            })
                        })
                    }else{
                        res.json({
                            "status":"error",
                            "message":"Please select the right photo"
                        })
                    }
                }
            })
        })

        app.post("/updateProfile",function(req,res){
            var accessToken=req.fields.accessToken;
            var name=req.fields.name;
            var dob=req.fields.dob;
            var city=req.fields.city;
            var country=req.fields.country;
            var aboutMe=req.fields.aboutMe;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null)
                {
                    res.json({
                        "status":"error",
                        "message":"User has logged out. Kindly Login again!!"
                    })
                }else{
                    database.collection("users").updateOne({
                        "accessToken":accessToken
                    },{
                        $set:{
                            "name":name,
                            "dob":dob,
                            "city":city,
                            "country":country,
                            "aboutMe":aboutMe
                        }
                    },function(err,data){
                        res.json({
                            "status":"status",
                            "message":"Profile has been updated"
                        })
                    })
                }
            })
        })

        app.get("/",function(req,res){
            res.render("index");
        })

        app.post("/addPost",function(req,res){
            var accessToken=req.fields.accessToken;
            var caption=req.fields.caption;
            var image="";
            var video="";
            var type=req.fields.type;
            var createdAt=new Date().getTime();
            var _id=req.fields._id;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out. Please Login Again!!"
                    })
                }else{
                    if(req.files.image.size>0 && req.files.image.type.includes("image")){
                        image="public/images/"+new Date().getTime()+'-'+req.files.image.name;
                        fileSystem.rename(req.files.image.path,image,function(err){
                            //
                        })
                    }

                    if(req.files.video.size>0 && req.files.video.type.includes("video")){
                        video="public/videos/"+new Date().getTime()+'-'+req.files.video.name;
                        fileSystem.rename(req.files.video.path,video,function(err){
                            //
                        })
                    }

                    database.collection("posts").insertOne({
                        "caption":caption,
                        "image":image,
                        "video":video,
                        "type":type,
                        "createdAt":createdAt,
                        "likers":[],
                        "comments":[],
                        "shares":[],
                        "user":{
                            "_id":user._id,
                            "name":user.name,
                            "profileImage":user.profileImage
                        }
                    },function(err,data){
                        database.collection("users").updateOne({
                            "accessToken":accessToken
                        },{
                            $push:{
                                "posts":{
                                    "_id":data.insertedId,
                                    "caption":caption,
                                    "image":image,
                                    "video":video,
                                    "type":type,
                                    "createdAt":createdAt,
                                    "likers":[],
                                    "comments":[],
                                    "shares":[],
                                }
                            }
                        },function(err,data){
                            res.json({
                                "status":"success",
                                "message":"Post has been updated"
                            })
                        })
                    })
                }
            })
        })

        app.post("/getNewsfeed",function(req,res){
            var accessToken=req.fields.accessToken;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null)
                {
                    res.json({
                        "status":"error",
                        "message":"user is logged out.Please Login Again!!"
                    })
                }else{
                    var ids=[];
                    ids.push(user._id);

                    database.collection("posts").find({
                        "user._id":{
                            $in:ids
                        }
                    })
                    .sort({
                        "createdAt":-1
                    })
                    .limit(5)
                    .toArray(function(err,data){
                        res.json({
                            "status":"success",
                            "message":"Record has been fetched",
                            "data":data
                        })
                    })
                }
            })
        })
    });
});