var restify = require('restify');
var moment = require('moment');
var mongojs = require("mongojs");
var aws = require('aws-sdk');
aws.config.loadFromPath('./AwsConfig.json');

//S3 bucket config
var BUCKET_NAME = 'hadas-bucket';
var s3 = new aws.S3();


// redis cache
var redisClient = require('redis');
var redis = redisClient.createClient(15184, 'pub-redis-15184.us-west-2-1.1.ec2.garantiadata.com', {no_ready_check: true});
redis.auth('123456', function (err) {
    if (err) console.log(err);
});

redis.on('connect', function() {
    console.log('Connected to Redis');
});

//var redisClient = require('redis').createClient;
//var redis = redisClient(15184, 'pub-redis-15184.us-west-2-1.1.ec2.garantiadata.com');


var bs = require('nodestalker'),
    client = bs.Client('127.0.0.1:11300');
client.use('default');

var fs = require('fs');
var multiparty = require('connect-multiparty');
var multipartMiddleware = multiparty();

var server = restify.createServer();
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());

// mongo db config
var connection_string = 'mongodb://admin:123456@ds011893.mlab.com:11893/hadas-images';
//var db = mongojs(connection_string, ['app']);
var db = mongojs(connection_string);
var images = db.collection("images");

// multipartMiddleware
// CRUD API
var PATH = '/images'
server.get({path : PATH , version : '0.0.1'} , findAllImages);
server.get({path : PATH +'/:imageId' , version : '0.0.1'} , findImage);
server.post({path : PATH , version: '0.0.1'} , postNewImage);
server.put({path : PATH +'/:imageId' , version: '0.0.1'} , replaceImage);
server.del({path : PATH +'/:imageId' , version: '0.0.1'} ,deleteImage);
server.put({path : PATH +'/:imageId/metadata' , version: '0.0.1'} ,postImageMetadata);


function replaceImage(req, res, next) {
  console.log("got PUT request at "+ moment().format('h:mm:ss'));
  var file = req.files.file;
  var key = req.params.imageId;

  images.findOne({_id: mongojs.ObjectId(key)}, function (error,success){
    if(success){
      //  uploadFile(key, file.path, file.type);
             client.put(JSON.stringify({'key':key, 'path':file.path, 'type':file.type}));
            res.send(200 , success);
            return next();
        }else{
            res.send(404, {message: "Resource not found"});
            return next(err);
        }
  });
}

function postNewImage(req, res, next) {
  console.log("got POST request at "+ moment().format('h:mm:ss'));
  var file = req.files.file;
  var img = {};
  img.name = file.name;
  res.setHeader('Access-Control-Allow-Origin','*');
  images.save(img , function(err , success){
      console.log('Response success '+success);
      console.log('Response error '+err);
      if(success) {
      var key = img._id.toString();
      client.put(JSON.stringify({'key':key, 'path':file.path, 'type':file.type}));
          //uploadFile(key, file.path, file.type);
          res.send(201 , img);
          return next();
      } else {
          res.send(500, {message: "Resource not savd properly"});
          return next(err);
      }
  });
}

function deleteImage(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin','*');
    images.remove({_id:mongojs.ObjectId(req.params.imageId)} , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            var params = {
                Bucket: BUCKET_NAME,
                Delete: { // required
                    Objects: [ // required
                    {
                        Key: req.params.imageId // required
                    },
                    {
                        Key: req.params.imageId + '_med'
                    },
                    {
                        Key: req.params.imageId + '_small'
                    }
                    ],
                },
            };

            s3.deleteObjects(params, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else {   // successful response
                    console.log(data);
                    res.send(204);
                    return next();
                }
            });
        } else{
            return next(err);
        }
    });
}

function findAllImages(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin','*');
    if('color' in req.query) {
        images.find({color:req.query.color}).sort({postedOn : -1} , function(err , success){
            console.log('Response success '+success);
            console.log('Response error '+err);
            if(success){
                res.send(200 , success);
                return next();
            }else{
                return next(err);
            }
        });
    } else {
        images.find().sort({postedOn : -1} , function(err , success){
            console.log('Response success '+success);
            console.log('Response error '+err);
            if(success){
                res.send(200 , success);
                return next();
            }else{
                return next(err);
            }
        });
    }
}

function findImage(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin','*');
    var id = req.params.imageId;
    var size = "";
    if('size' in req.query) {
        console.log(req.query.size);
        size = "_"+req.query.size;
    }
    redis.get(id, function (err, success) {
        if (err) callback(null);
        else if (success) { //Image exists in cache
console.log("FOUND IN CACHE");
            console.log(success);
            //res.send(200 , JSON.parse(success));
            result = JSON.parse(success);
            console.log(result._id);
            result.link = 'https://s3-us-west-2.amazonaws.com/hadas-bucket/' + result._id + size;
            console.log(result);
            res.send(200 , result);

//edit


        } else {
        // Image doesn't exists in cache - need to query mongo
            images.findOne({_id:mongojs.ObjectId(id)} , function(err , success) {
                console.log('Response success '+success);
                console.log('Response error '+err);
                if(success){
                redis.set(id, JSON.stringify(success), function () {
                    success.link = 'https://s3-us-west-2.amazonaws.com/hadas-bucket/' + success._id + size;
                    res.send(200 , success);
                        return next();
                });
                } else {
                    res.send(404, {message: "Resource not found"});
                    return next(err);
                }
            });
        }
    });
}

function postImageMetadata(req, res , next) {
  console.log("got PUT request at "+ moment().format('h:mm:ss'));
  var img = {};

console.log(req.params);

  img.title = req.params.title;
  img.creator = req.params.creator;
  res.setHeader('Access-Control-Allow-Origin','*');
//  images.save(img , function(err , success){

  images.update({_id:mongojs.ObjectId(req.params.imageId)},
        {$set:img}, function(err, success) {
      if(success) {
        redis.get(req.params.imageId, function (err, success) {
            if (err) callback(null);
            else if (success) {
                img_data = JSON.parse(success);
                img_data.title = img.title;
                img_data.creator = img.creator;
                redis.set(req.params.imageId, JSON.stringify(img_data), function (err) {
                    if (err) callback(err);
                });
            }
        });
        res.send(201 , success);
        return next();
      } else {
      res.send(404, {message: "Resource not found"});
          return next(err);
      }
  });
}

function uploadFile(remoteFilename, fileName, contentType) {
  var fileBuffer = fs.readFileSync(fileName);

  s3.putObject({
    ACL: 'public-read',
    Bucket: BUCKET_NAME,
    Key: remoteFilename,
    Body: fileBuffer,
    ContentType: contentType
  }, function(error, response) {
    console.log('uploaded file[' + fileName + '] to [' + remoteFilename + '] as [' + contentType + ']');
    console.log(arguments);
  });
}

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});
