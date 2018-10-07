const IMAGE_DIR = "/images/";
// const IMAGE_EXT = ".jpg";
const IMAGE_EXT = [".jpg", ".JPG", ".jpeg", ".png", ".tiff"];

const express = require('express');
const fs = require('fs');
const url  = require('url');

let imageFiles;
let imageHTML = "";

fs.readdir(__dirname + "/images", function(err, items) {
    imageFiles = items;
    // console.log(items.length, "images");
    for(let i in imageFiles){
        // if(!imageFiles[i].includes(IMAGE_EXT)) continue;
        if(!checkFileExtension(imageFiles[i])) continue;
        imageHTML += '<img src="' + IMAGE_DIR+imageFiles[i] + '">';
        // console.log(imageFiles[i]);
    }
});

const checkFileExtension = function(file){
    for(let e in IMAGE_EXT)
        if(file.includes(IMAGE_EXT[e]))
            return true;
    console.log("Not valid image: ", file);
    return false;
};

var app = express();
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
app.get('/client.js', function (req, res) {
    res.sendFile(__dirname + '/client.js');
});
app.get('/images/*', function (req, res) {
    res.sendFile(__dirname + req.url);
});
app.get('/baseImages/*', function (req, res) {
    res.sendFile(__dirname + req.url);
});
app.get('/imageList', function (req, res) {
    res.send(imageHTML);
});
app.listen(3000);