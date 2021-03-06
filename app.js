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

var socketIO=require("socket.io")(http,{
    allowEIO3:true
});
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

                    if(type=="page_post"){

                        database.collection("pages").findOne({
                            "_id":ObjectId(_id)
                        },function(err,page){
                            if(page==null){
                                res.json({
                                    "status":"error",
                                    "message":"Page does not exist"
                                })
                                return;
                            }else{

                                if(page.user._id.toString()!= user._id.toString()){
                                    res.json({
                                        "status":"error",
                                        "message":"Sorry,you dont own this page"
                                    })
                                    return;
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
                                        "_id":page._id,
                                        "name":page.name,
                                        "profileImage":page.coverPhoto
                                    }
                                },function(err,data){
                                    res.json({
                                        "status":"success",
                                        "message":"Post has been uploaded"
                                    })
                                })
                            }
                        })
                    }
                    
                    else if(type=="group_post"){
                        database.collection("groups").findOne({
                            "_id":ObjectId(_id)
                        },function(err,group){
                            if(group==null){
                                res.json({
                                    "status":"error",
                                    "message":"Group does not exist"
                                })
                            }else{

                                var isMember=false;

                                for(var a=0;a<group.members.length;a++){
                                    var member=group.members[a];

                                    if(member._id.toString()==user._id.toString()){
                                        isMember=true;
                                        break;
                                    }
                                }

                                if(!isMember){
                                    res.json({
                                        "status":"error",
                                        "message":"Sorry you are not a member of this group"
                                    });
                                    return;
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
                                        "_id":group._id,
                                        "name":group.name,
                                        "profileImage":group.coverPhoto
                                    },
                                    "uploader":{
                                        "_id":user._id,
                                        "name":user.name,
                                        "profileImage":user.profileImage
                                    }
                                },function(err,data){
                                    res.json({
                                        "status":"success",
                                        "message":"Post has been uploaded"
                                    })
                                })
                            }
                        })
                    }
                    else{
                        
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

                    for(var a=0;a<user.pages.length;a++){
                        ids.push(user.pages[a]._id);
                    }

                    for(var a=0;a<user.groups.length;a++){
                        if(user.groups[a].status=="Accepted"){
                            ids.push(user.groups[a]._id);
                        }
                    }

                    for(var a=0;a<user.friends.length;a++){
                        ids.push(user.friends[a]._id);
                    }

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

        app.post("/toggleLikePost",function(req,res){

            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;
        

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is Logged Out. Please Login to like the post!!"
                    })
                }else{
                    
                    database.collection("posts").findOne({
                        "_id":ObjectId(_id)
                    },function(err,post){
                        if(post==null){
                            res.json({
                                "status":"error",
                                "message":"Post doesnt exist"
                            })
                        }else{

                            var isLiked=false;
                            for(var a=0;a<post.likers.length;a++){
                                var liker=post.likers[a];

                                if(liker._id.toString()==user._id.toString()){
                                    isLiked=true;
                                    break;
                                }
                            }

                            if (isLiked){
                                
                                database.collection("posts").updateOne({
                                    "_id":ObjectId(_id)
                                },{
                                    $pull:{
                                        "likers":{
                                            "_id":user._id,
                                        }
                                    }
                                },function(err,data){
                                    database.collection("users").updateOne({
                                        $and:[{
                                            "_id":post.user._id
                                        },{
                                            "posts._id":post._id
                                        }]
                                    },{
                                        $pull:{
                                            "posts.$[].likers":{
                                                "_id":user._id,
                                            }
                                        }
                                    });

                                    res.json({
                                        "status":"unliked",
                                        "message":"Post has been unliked"
                                    })
                                })
                            }else{
                                
                                database.collection("users").updateOne({
                                    "_id":post.user._id
                                },{
                                    $push:{
                                        "notifications":{
                                            "id":ObjectId(),
                                            "type":"photo_liked",
                                            "content":user.name+" has liked your photo.",
                                            "profileImage":user.profileImage,
                                            "createdAt":new Date().getTime()
                                        }
                                    }
                                });

                                database.collection("posts").updateOne({
                                    "_id":ObjectId(_id)
                                },{
                                    $push:{
                                        "likers":{
                                            "_id":user._id,
                                            "name":user.name,
                                            "profileImage":user.profileImage
                                        }
                                    }
                                },function(err,data){
                                    database.collection("users").updateOne({
                                        $and:[{
                                            "_id":post.user._id
                                        },{
                                            "posts._id":post._id
                                        }]
                                    },{
                                        $push:{
                                            "posts.$[].likers":{
                                                "_id":user._id,
                                                "name":user.name,
                                                "profileImage":user.profileImage
                                            }
                                        }
                                    })
                                    
                                    res.json({
                                        "status":"success",
                                        "message":"Post has been liked!!"
                                    })
                                })
                            }

                        }
                    })
                }
            })
        })

        app.post("/postComment",function(req,res){
            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;
            var comment=req.fields.comment;
            var createdAt=new Date().getTime();

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged Out. Please login to Comment on this post!!"
                    })
                }else{
                    database.collection("posts").findOne({
                        "_id":ObjectId(_id)
                    },function(err,post){
                        if(post==null){
                            res.json({
                                "status":"error",
                                "message":"Post doesnt exist"
                            })
                        }else{
                            var commentId=ObjectId();

                            database.collection("posts").updateOne({
                                "_id":ObjectId(_id)
                            },{
                                $push:{
                                    "comments":{
                                        "_id":commentId,
                                        "user":{
                                            "_id":user._id,
                                            "name":user.name,
                                            "profileImage":user.profileImage
                                        },
                                        "comment":comment,
                                        "createdAt":createdAt,
                                        "replies":[]
                                    }
                                }
                            },function(err,data){
                                if(user._id.toString!=post.user._id.toString()){

                                    database.collection("users").updateOne({
                                        "_id":post.user._id
                                    },{
                                        $push:{
                                            "notifications":{
                                                "_id":ObjectId(),
                                                "type":"new_comment",
                                                "content":user.name+" has commented on your post.",
                                                "profileImage":user.profileImage,
                                                "createdAt":new Date().getTime()
                                            }
                                        }
                                    })
                                }

                                database.collection("users").updateOne({
                                    $and:[{
                                        "_id":post.user._id
                                    },{
                                        "posts._id":post._id,
                                    }]
                                },{
                                    $push:{
                                        "posts.$[].comments":{
                                            "_id":commentId,
                                            "user":{
                                                "_id":user._id,
                                                "name":user.name,
                                                "profileImage":user.profileImage
                                            },
                                            "comment":comment,
                                            "createdAt":createdAt,
                                            "replies":[]
                                        }
                                    }
                                })

                                res.json({
                                    "status":"success",
                                    "message":"Comment has been posted."
                                })
                            })
                        }
                    })
                }
            })
        })

        app.post("/postReply",function(req,res){
            var accessToken=req.fields.accessToken;
            var postId=req.fields.postId;
            var commentId=req.fields.commentId;
            var reply=req.fields.reply;
            var createdAt=new Date().getTime();

            database.collection("users").findOne({
                "accessToken":accessToken 
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out,Kindly login to reply to the comment"
                    })
                }else{
                    database.collection("posts").findOne({
                        "_id":ObjectId(postId)
                    },function(err,post){
                        if(post==null){
                            res.json({
                                "status":"error",
                                "message":"Post doesnt exist"
                            })
                        }else{

                            var replyId=ObjectId();

                            database.collection("posts").updateOne({
                                $and:[{
                                    "_id":ObjectId(postId)
                                },{
                                    "comments._id":ObjectId(commentId)
                                }]
                            },{
                                $push:{
                                    "comments.$.replies":{
                                        "_id":replyId,
                                        "user":{
                                            "_id":user._id,
                                            "name":user.name,
                                            "profileImage":user.profileImage
                                        },
                                        "reply":reply,
                                        "createdAt":createdAt
                                    }
                                }
                            },function(err,data){

                                database.collection("users").updateOne({
                                    $and:[{
                                        "_id":post.user._id
                                    },{
                                        "posts._id":post._id
                                    },{
                                        "posts.comments._id":ObjectId(commentId)
                                    }]
                                },{
                                    $push:{
                                        "posts.$[].comments.$[].replies":{
                                            "id":replyId,
                                            "user":{
                                                "_id":user._id,
                                                "name":user.name,
                                                "profileImage":user.profileImage 
                                            },
                                            "reply":reply,
                                            "createdAt":createdAt 
                                        }
                                    }
                                })

                                res.json({
                                    "status":"success",
                                    "message":"Reply has been posted"
                                })
                            })
                        }
                    })
                }
            })
        })

        app.post("/sharePost",function(req,res){
            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;
            var type="shared";
            var createdAt=new Date().getTime();

            database.collection("users").findOne({
                "accessToken":accessToken 
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out.Please login to share the post."
                    })
                }else{
                    database.collection("posts").findOne({
                        "_id":ObjectId(_id)
                    },function(err,post){
                        if(post==null){
                            res.json({
                                "status":"error",
                                "message":"Post doesnt exist"
                            })
                        }else{

                            database.collection("posts").updateOne({
                                "_id":ObjectId(_id)
                            },{
                                $push:{
                                    "shares":{
                                        "_id":user._id,
                                        "name":user.name,
                                        "profileImage":user.profileImage 
                                    }
                                }
                            },function(err,data){
                                database.collection("posts").insertOne({
                                    "caption":post.caption,
                                    "image":post.image,
                                    "video":post.video,
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
                                        $and:[{
                                            "_id":post.user._id
                                        },{
                                            "posts._id":post._id
                                        }]
                                    },{
                                        $push:{
                                            "posts.$[].shares":{
                                                "_id":user._id,
                                                "name":user.name,
                                                "profileImage":user.profileImage
                                            }
                                        }
                                    })

                                    res.json({
                                        "status":"success",
                                        "message":"Post has been shared."
                                    })
                                })
                            })
                        }
                    })
                }
            })
        })

        app.get("/search/:query",function(req,res){
            var query=req.params.query;

            res.render("search",{
                "query":query
            })
        })

        app.post("/search",function(req,res){
            var query=req.fields.query;

            database.collection("users").find({
                "name":{
                    $regex:".*"+query+".*",
                    $options:"i"//case insensitive
                }
            }).toArray(function(err,data){

                database.collection("pages").find({
                    "name":{
                        $regex:".*"+query+".*",
                        $options:"i"//case insensitive
                    }
                }).toArray(function(err,pages){

                    database.collection("groups").find({
                        "name":{
                            $regex:".*"+query+".*",
                            $options:"i"
                        }
                    }).toArray(function(err,groups){

                        res.json({
                            "status":"success",
                            "message":"Record has been fetched",
                            "data":data,
                            "pages":pages,
                            "groups":groups
                        })


                    })

                    
                })

                
            })
        })

        app.post("/sendFriendRequest",function(req,res){
            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out.Please Sign in again"
                    })
                }else{
                    var me=user;

                    database.collection("users").findOne({
                        "_id":ObjectId(_id)
                    },function(err,user){
                        if(user==null){
                            res.json({
                                "status":"error",
                                "message":"User doesnt exist"
                            })
                        }else{

                            database.collection("users").updateOne({
                                "_id":ObjectId(_id)
                            },{
                                $push:{
                                    "friends":{
                                        "_id":me._id,
                                        "name":me.name,
                                        "profileImage":me.profileImage,
                                        "status":"Pending",
                                        "sentByMe":false,
                                        "inbox":[]
                                    }   
                                }
                            },function(err,data){

                                database.collection("users").updateOne({
                                    "_id":me._id
                                },{
                                    $push:{
                                        "friends":{
                                            "_id":user._id,
                                            "name":user.name,
                                            "profileImage":user.profileImage,
                                            "status":"Pending",
                                            "sentByMe":true,
                                            "inbox":[]
                                        }
                                    }
                                },function(err,data){
                                    res.json({
                                        "status":"success",
                                        "message":"Friend Request sent successfully."
                                    })
                                })
                            })
                        }
                    })
                }
            })
        })

        app.get("/friends",function(req,res){
            res.render("friends");
        })

        app.post("/acceptFriendRequest",function(req,res){
            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;

            database.collection("users").findOne({
                "accessToken":accessToken 
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User logged out.Please Login again"
                    })
                }else{
                    var me=user;

                    database.collection("users").findOne({
                        "_id":ObjectId(_id)
                    },function(err,user){
                        if(user==null){
                            res.json({
                                "status":"error",
                                "message":"User does not exist"
                            })
                        }else{

                            database.collection("users").updateOne({
                                "_id":ObjectId(_id)
                            },{
                                $push:{
                                    "notifications":{
                                        "_id":ObjectId(),
                                        "type":"friend_request_accepted",
                                        "content":me.name+"accepted your friend request",
                                        "profileImage":me.profileImage,
                                        "createdAt":new Date().getTime()
                                    }
                                }
                            })

                            database.collection("users").updateOne({
                                $and:[{
                                    "_id":ObjectId(_id)
                                },{
                                    "friends._id":me._id
                                }]
                            },{
                                $set:{
                                    "friends.$.status":"Accepted"
                                }
                            },function(err,data){

                                database.collection("users").updateOne({
                                    $and:[{
                                        "_id":me._id
                                    },{
                                        "friends._id":user._id
                                    }]
                                },{
                                    $set:{
                                        "friends.$.status":"Accepted"
                                    }
                                },function(err,data){

                                    res.json({
                                        "status":"success",
                                        "message":"Friend request has been accepted"
                                    })
                                })
                            })
                        }
                    })
                }
            })
        })

        app.post("/unfriend",function(req,res){
            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out.Please login!!"
                    })
                }else{
                    var me=user;
                    database.collection("users").findOne({
                        "_id":ObjectId(_id)
                    },function(err,user){
                        if(user==null){
                            res.json({
                                "status":"error",
                                "message":"User does not exist"
                            })
                        }else{
                            database.collection("users").updateOne({
                                "_id":ObjectId(_id)
                            },{
                                $pull:{
                                    "friends":{
                                        "_id":me._id
                                    }
                                }
                            },function(err,data){

                                database.collection("users").updateOne({
                                    "_id":me._id
                                },{
                                    $pull:{
                                        "friends":{
                                            "_id":user._id 
                                        }
                                    }
                                },function(err,data){
                                    res.json({
                                        "status":"success",
                                        "message":"Friend has been removed"
                                    })
                                })
                            })
                        }
                    })
                }
            })
        })

        app.get("/inbox",function(req,res){
            res.render("inbox");
        })

        app.post("/getFriendsChat",function(req,res){
            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out. Please login."
                    })
                }else{

                    var index=user.friends.findIndex(function(friend){
                        return friend._id==_id
                    })
                    var inbox=user.friends[index].inbox;

                    res.json({
                        "status":"success",
                        "message":"Record has been fetched",
                        "data":inbox
                    })
                }
            })
        })

        app.post("/sendMessage",function(req,res){

            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;
            var message=req.fields.message;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out.Please login"
                    })
                }else{
                    var me=user;
                    database.collection("users").findOne({
                        "_id":ObjectId(_id)
                    },function(err,user){
                        if(user==null){
                            res.json({
                                "status":"error",
                                "message":"user doesnt exist"
                            })
                        }else{
                            

                            database.collection("users").updateOne({
                                $and:[{
                                    "_id":ObjectId(_id)
                                },{
                                    "friends._id":me._id
                                }]
                            },{
                                $push:{
                                    "friends.$.inbox":{
                                        "_id":ObjectId(),
                                        "message":message,
                                        "from":me._id
                                    }
                                }
                            },function(err,data){

                                database.collection("users").updateOne({
                                    $and:[{
                                        "_id":me._id
                                    },{
                                        "friends._id":user._id
                                    }]
                                },{
                                    $push:{
                                        "friends.$.inbox":{
                                            "id":ObjectId(),
                                            "message":message,
                                            "from":me._id
                                        }
                                    }
                                },function(err,data){

                                    socketIO.to(users[user._id]).emit("messageReceived",{
                                        "message":message,
                                        "from":me._id
                                    })

                                    res.json({
                                        "status":"success",
                                        "message":"Message has been sent"
                                    })
                                })
                            })
                        }
                    })
                }
            })
        })

        app.post("/connectSocket",function(req,res){
            var accessToken=req.fields.accessToken;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User has been logged out."
                    })
                }else{
                    users[user._id]=socketID;
                    res.json({
                        "status":"success",
                        "message":"Socket has been connected"
                    })
                }
            })
        })

        app.get("/createPage",function(req,res){
            res.render("createPage");
        })

        app.post("/createPage",function(req,res){

            var accessToken=req.fields.accessToken;
            var name=req.fields.name;
            var domainName=req.fields.domainName;
            var additionalInfo=req.fields.additionalInfo;
            var coverPhoto="";

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out.Please Login"
                    })
                }else{
                    if(req.files.coverPhoto.size>0 && req.files.coverPhoto.type.includes("image")){
                        coverPhoto="public/images/"+new Date().getTime()+"-"+req.files.coverPhoto.name;
                        fileSystem.rename(req.files.coverPhoto.path,coverPhoto,function(err){

                        });

                        database.collection("pages").insertOne({
                            "name":name,
                            "domainName":domainName,
                            "additionalInfo":additionalInfo,
                            "coverPhoto":coverPhoto,
                            "likers":[],
                            "user":{
                                "_id":user._id,
                                "name":user.name,
                                "profileImage":user.profileImage
                            }
                        },function(err,data){

                            res.json({
                                "status":"success",
                                "message":"Page has been created."
                            })
                        })
                    }else{
                        res.json({
                            "status":"error",
                            "message":"Please select a cover photo."
                        })
                    }
                }
            })
        })

        app.get("/pages",function(req,res){
            res.render("pages");
        })

        app.post("/getPages",function(req,res){

            var accessToken=req.fields.accessToken;

            database.collection("users").findOne({
                "accessToken":accessToken 
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User has been logged out.Please login"
                    })
                }else{
                    database.collection("pages").find({
                        $or:[{
                            "user._id":user._id
                        },{
                            "likers._id":user._id
                        }]
                    }).toArray(function(err,data){
                        res.json({
                            "status":"success",
                            "message":"Record has been fetched",
                            "data":data
                        })
                    })
                }
            })
        })

        app.get("/page/:_id",function(req,res){
            var _id=req.params._id;

            database.collection("pages").findOne({
                "_id":ObjectId(_id) 
            },function(err,page){
                if(page==null){
                    res.json({
                        "status":"error",
                        "message":"Page doesnt exist"
                    })
                }else{
                    res.render("singlePage",{
                        "_id":_id
                    })
                }
            })
        })
        
        app.post("/getPageDetail",function(req,res){
            var _id=req.fields._id;

            database.collection("pages").findOne({
                "_id":ObjectId(_id)
            },function(err,page){
                if(page==null){
                    res.json({
                        "status":"error",
                        "message":"Page doesnt exist"
                    })
                }else{

                    database.collection("posts").find({
                        $and:[{
                            "user._id":page._id
                        },{
                            "type":"page_post"
                        }]
                    }).toArray(function(err,posts){
                        res.json({
                            "status":"success",
                            "message":"Recod has been fetched",
                            "data":page,
                            "posts":posts
                        })
                    })
                }
            })
        })

        app.post("/toggleLikePage",function(req,res){
            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out.Please Login"
                    })
                }else{

                    database.collection("pages").findOne({
                        "_id":ObjectId(_id)
                    },function(err,page){
                        if(page==null){
                            res.json({
                                "status":"error",
                                "message":"Page does not exist"
                            })
                        }else{

                            var isLiked=false;
                            for(var a=0;a<page.likers.length;a++){
                                var liker=page.likers[a];

                                if(liker._id.toString()==user._id.toString()){
                                    isLiked=true;
                                    break;
                                }
                            }

                            if(isLiked){
                                database.collection("pages").updateOne({
                                    "_id":ObjectId(_id)
                                },{
                                    $pull:{
                                        "likers":{
                                            "_id":user._id,
                                        }
                                    }
                                },function(err,data){

                                    database.collection("users").updateOne({
                                        "accessToken":accessToken
                                    },{
                                        $pull:{
                                            "pages":{
                                                "_id":ObjectId(_id)
                                            }
                                        }
                                    },function(err,data){
                                        res.json({
                                            "status":"unliked",
                                            "message":'Page has been unliked'
                                        })
                                    })
                                })
                            }else{
                                database.collection("pages").updateOne({
                                    "_id":ObjectId(_id)
                                },{
                                    $push:{
                                        "likers":{
                                            "_id":user._id,
                                            "name":user.name,
                                            "profileImage":user.profileImage
                                        }
                                    }
                                },function(err,data){

                                    database.collection("users").updateOne({
                                        "accessToken":accessToken
                                    },{
                                        $push:{
                                            "pages":{
                                                "_id":page._id,
                                                "name":page.name,
                                                "coverPhoto":page.coverPhoto
                                            }
                                        }
                                    },function(err,data){
                                        res.json({
                                            "status":"success",
                                            "message":"Page has been liked"
                                        })
                                    })
                                })
                            }
                        }
                    })
                }
            })
        })

        app.post("/getMyPages",function(req,res){
            var accessToken=req.fields.accessToken

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out.Please Login again"
                    })
                }else{

                    database.collection("pages").find({
                        "user._id":user._id
                    }).toArray(function(err,data){
                        res.json({
                            "status":"success",
                            "message":"Record has been fetched",
                            "data":data
                        })
                    })
                }
            })
        })

        app.get("/createGroup",function(req,res){
            res.render("createGroup");
        })

        app.post("/createGroup",function(req,res){
            var accessToken=req.fields.accessToken;
            var name=req.fields.name;
            var additionalInfo=req.fields.additionalInfo;
            var coverPhoto="";

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out. Please login"
                    })
                }else{

                    if(req.files.coverPhoto.size>0 && req.files.coverPhoto.type.includes('image')){
                        coverPhoto='public/images/'+new Date().getTime()+'-'+req.files.coverPhoto.name;
                        fileSystem.rename(req.files.coverPhoto.path,coverPhoto,function(err){

                        })

                        database.collection("groups").insertOne({
                            "name":name,
                            "additionalInfo":additionalInfo,
                            "coverPhoto":coverPhoto,
                            "members":[{
                                "_id":user._id,
                                "name":user.name,
                                "profileImage":user.profileImage,
                                "status":"Accepted"
                            }],
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
                                    "groups":{
                                        "_id":data.insertedId,
                                        "name":name,
                                        "coverPhoto":coverPhoto,
                                        "status":"Accepted"
                                    }
                                }
                            },function(err,data){
                                res.json({
                                    "status":"success",
                                    "message":"Group has been created"
                                })
                            })
                        })
                    }else{
                        res.json({
                            "status":"error",
                            "message":"Please select a Cover Photo"
                        })
                    }
                }
            })
        })

        app.get("/groups",function(req,res){
            res.render("groups");
        })

        app.post("/getGroups",function(req,res){

            var accessToken=req.fields.accessToken;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out.Please Login"
                    })
                }else{

                    database.collection("groups").find({
                        $or:[{
                            "user._id":user._id
                        },{
                            "members._id":user._id 
                        }]
                    }).toArray(function(err,data){

                        res.json({
                            "status":"success",
                            "message":"Record has been fetched",
                            "data":data
                        })
                    })
                }
            })
        })

        app.get("/group/:_id",function(req,res){
            var _id=req.params._id;

            database.collection("groups").findOne({
                "_id":ObjectId(_id)
            },function(err,group){
                if(group==null){
                    res.json({
                        "status":"error",
                        "message":"Group doesnt exist"
                    })
                }else{

                    res.render("singleGroup",{
                        "_id":_id
                    })
                }
            })
        })

        app.post("/getGroupDetail",function(req,res){

            var _id=req.fields._id;

            database.collection("groups").findOne({
                "_id":ObjectId(_id)
            },function(err,group){
                if(group==null){
                    res.json({
                        "status":"error",
                        "message":"Group does not exist"
                    })
                }else{

                    database.collection("posts").find({
                        $and:[{
                            "user._id":group._id
                        },{
                            "type":"group_post"
                        }]
                    }).toArray(function(err,posts){
                        res.json({
                            "status":"success",
                            "message":"Record has been fetched",
                            "data":group,
                            "posts":posts
                        })
                    })
                }
            })
        })

        app.post("/toggleJoinGroup",function(req,res){

            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User has been logged Out.Please login"
                    })
                }else{

                    database.collection("groups").findOne({
                        "_id":ObjectId(_id)
                    },function(err,group){
                        if(group==null){
                            res.json({
                                "status":"error",
                                "message":"Group doesnt exist"
                            })
                        }else{

                            var isMember=false;

                            for(var a=0;a<group.members.length;a++){
                                var member=group.members[a];

                                if(member._id.toString()==user._id.toString())
                                {
                                    isMember=true;
                                    break;
                                }
                            }

                            if(isMember){

                                database.collection("groups").updateOne({
                                    "_id":ObjectId(_id)
                                },{
                                    $pull:{
                                        "members":{
                                            "_id":user._id
                                        }
                                    }
                                },function(err,data){

                                    database.collection("users").updateOne({
                                        "accessToken":accessToken 
                                    },{
                                        $pull:{
                                            "groups":{
                                                "_id":ObjectId(_id)
                                            }
                                        }
                                    },function(err,data){
                                        res.json({
                                            "status":"leaved",
                                            "message":"Group has been left."
                                        })
                                    })
                                })
                            } else{
                                
                                database.collection("groups").updateOne({
                                    "_id":ObjectId(_id)
                                },{
                                    $push:{
                                        "members":{
                                            "_id":user._id,
                                            "name":user.name,
                                            "profileImage":user.profileImage,
                                            "status":"Pending"
                                        }
                                    }
                                },function(err,data){

                                    database.collection("users").updateOne({
                                        "accessToken":accessToken
                                    },{
                                        $push:{
                                            "groups":{
                                                "_id":group._id,
                                                "name":group.name,
                                                "coverPhoto":group.coverPhoto,
                                                "status":"Pending"
                                            }
                                        }
                                    },function(err,data){

                                        database.collection("users").updateOne({
                                            "_id":group.user._id
                                        },{
                                            $push:{
                                                "notifications":{
                                                    "_id":ObjectId(),
                                                    "type":"group_join_request",
                                                    "content":user.name +" sent a request to join your group",
                                                    "profileImage":user.profileImage,
                                                    "groupId":group._id,
                                                    "userId":user._id,
                                                    "status":"Pending",
                                                    "createdAt":new Date().getTime()
                                                }
                                            }
                                        });

                                        res.json({
                                            "status":"success",
                                            "message":"Request to join the group has been sent."
                                        })
                                    })
                                })
                            }
                        }
                    })
                }
            })
        })

        app.get("/notifications",function(req,res){
            res.render("notifications");
        })

        app.post("/acceptRequestJoinGroup",function(req,res){
            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;
            var groupId=req.fields.groupId;
            var userId=req.fields.userId;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is logged out. Please login again"
                    })
                }else{

                    database.collection("groups").findOne({
                        "_id":ObjectId(groupId)
                    },function(err,group){
                        if(group==null){
                            res.json({
                                "status":"error",
                                "message":"Group doesnt exist"
                            })
                        }else{

                            if(group.user._id.toString()!=user._id.toString()){
                                res.json({
                                    "status":"error",
                                    "message":"Sorry you are not the owner of this group"
                                });
                                return;
                            }

                            database.collection("groups").updateOne({
                                $and:[{
                                    "_id":group._id 
                                },{
                                    "members._id":ObjectId(userId)
                                }]
                            },{
                                $set:{
                                    "members.$.status":"Accepted"
                                }
                            },function(err,data){

                                database.collection("users").updateOne({
                                    $and:[{
                                        "accessToken":accessToken
                                    },{
                                        "notifications.groupId":group._id 
                                    }]
                                },{
                                    $set:{
                                        "notifications.$.status":"Accepted"
                                    }
                                },function(err,data){

                                    database.collection("users").updateOne({
                                        $and:[{
                                            "_id":ObjectId(userId)
                                        },{
                                            "groups._id":group._id
                                        }]
                                    },{
                                        $set:{
                                            "groups.$.status":"Accepted"
                                        }
                                    },function(err,data){

                                        res.json({
                                            "status":"success",
                                            "message":"Group join request has been accepted"
                                        })
                                    })
                                })
                            })
                        }
                    })
                }
            })
        })

        app.post("/rejectRequestJoinGroup",function(req,res){
            var accessToken=req.fields.accessToken;
            var _id=req.fields._id;
            var groupId=req.fields.groupId;
            var userId=req.fields.userId;

            database.collection("users").findOne({
                "accessToken":accessToken
            },function(err,user){
                if(user==null){
                    res.json({
                        "status":"error",
                        "message":"User is loggrd out.Please login again"
                    })
                }else{

                    database.collection("groups").findOne({
                        "_id":ObjectId(groupId)
                    },function(err,group){
                        if(group==null){
                            res.json({
                                "status":"error",
                                "message":"Group does not exist"
                            })
                        }else{

                            if(group.user._id.toString()==user._id.toString()){
                                res.json({
                                    "status":"error",
                                    "message":"Sorry you dont own this group"
                                });
                                return;
                            }

                            database.collection("groups").updateOne({
                                "_id":group._id
                            },{
                                $pull:{
                                    "members":{
                                        "_id":ObjectId(userId)
                                    }
                                }
                            },function(err,data){

                                database.collection("users").updateOne({
                                    "accessToken":accessToken
                                },{
                                    $pull:{
                                        "notifications":{
                                            "groupId":group._id
                                        }
                                    }
                                },function(err,data){

                                    database.collection("users").updateOne({
                                        "_id":ObjectId(userId)
                                    },{
                                        $pull:{
                                            "groups":{
                                                "_id":group._id
                                            }
                                        }
                                    },function(err,data){

                                        res.json({
                                            "status":"success",
                                            "message":"Group join request has been rejected"
                                        })
                                    })
                                })
                            })
                        }
                    })
                }
            })
        })
    });
});