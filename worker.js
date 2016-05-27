var mongojs = require("mongojs");
var aws = require('aws-sdk');
aws.config.loadFromPath('./AwsConfig.json');

//S3 bucket config
var BUCKET_NAME = 'hadas-bucket';
var s3 = new aws.S3();

// mongo config
var connection_string = 'mongodb://admin:123456@ds011893.mlab.com:11893/hadas-images';
var db = mongojs(connection_string);
var images = db.collection("images");

var im = require('imagemagick');

var fs = require('fs');

var color = require('dominant-color');

var bs = require('nodestalker'),
    client = bs.Client('127.0.0.1:11300');

client.watch('default').onSuccess(function(data) {
    function resJob() {

        client.reserve().onSuccess(function(job) {
        data = JSON.parse(job.data);
            console.log('reserved', job);
        processImage(data.key, data.path, data.type);
            client.deleteJob(job.id).onSuccess(function(del_msg) {
                console.log('deleted', job);
                console.log('message', del_msg);
                resJob();
            });
        });
    }

    resJob();
});

function processImage(key, path, type) {

    uploadFile(key, path, type);

    var mediumPath = path+'_med';
    var smallPath = path+'_small';

    im.resize({
            srcPath: path,
            dstPath: smallPath,
            width:   200,
            height: 200
        }, function(err, stdout, stderr){
            if (err) throw err;
            console.log('resized image to fit within 200x200px');
        uploadFile(key+'_small', smallPath, type);
        });

    im.resize({
            srcPath: path,
            dstPath: mediumPath,
            width:   400,
            height:400
        }, function(err, stdout, stderr){
            if (err) throw err;
            console.log('resized image to fit within 400x400px');
        uploadFile(key+'_medium', mediumPath, type);
        });


    // dominant color
    color(path, function(err, color){
        console.log(color) // '5b6c6e'
        images.update({_id:mongojs.ObjectId(key)}, {$set:{'color':color}}, function(err, success) {
            if(success) {
                    console.log(success);
            console.log('color updated');
            } else {
                console.log(err);
        }
        });
    });
}

function uploadFile(remoteFilename, fileName, contentType) {
  var fileBuffer = fs.readFileSync(fileName);
console.log("here");
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
