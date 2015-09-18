var Promise = require('promise');
var request = require('request');
var zlib = require('zlib');
var cheerio = require('cheerio');


function setOptions(req, url, method) {

    var cookies;
    if (req !== null) {
        //get the cookies from the request header
        cookies = req.headers.cookie;
    }

    //set the request options
    var options = {
        uri: url, //the url for the 
        method: method, //the request method
        headers: {
            'content-type': 'text/html',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'accept-encoding': "gzip,deflate",
            'Connection': 'keep-alive',
            // 'Cookie': cookies
        },
        gzip: true
    };

    if (typeof cookies !== 'undefined') {
        options.headers['Cookie'] = cookies
    }



    //send back the options for the request in a promise
    return Promise.resolve(options); 
}

function requestp(options) {
    return new Promise(function(resolve, reject) {
        var req = request(options, function(error, response, body){
            resolve(body)
        });
    });
}

function makePageFunction(url, response, page) {

    return function(callback) {
        var resp = response;
        var req = request({
            url: url,
            gzip: true,
        }, function(error, response, body){
            var image = findImage(body)
            handleImage(image, resp, page, callback);
        });

    };
}

function findImage(html) {
    //attempt to find the comic page in html
    var $ = cheerio.load(html);
    var image = $('#comic_page').attr('src');
    return image;
}

function handleImage(image, resp, page, callback) {

    //handle an undefined image
    if (image === undefined) {
        //send stringed json back to the client
        resp.write(JSON.stringify({
            page: page,
            link: 'failed'
        }) + '\n');

        //send error to the callback to tell it to stop sending the rest of the images
        callback(new Error("Failed to get an image"), null);
        return;
    }

    //send back the link to the page and the page number
    resp.write(JSON.stringify({
        page: page,
        link: image
    }) + '\n');

    //successful callcack
    callback(null, image);
}

function getRealImageFromThumbnail(link){
    var baseImageUrl = 'http://img.batoto.net/forums/uploads/';

    var arr = link.split('/');
    var imageToken = arr[arr.length-1];

    return baseImageUrl + imageToken;
}

function getMangaIdFromString(link){
    return link.substring(link.lastIndexOf('-')+1);
}

exports.setOptions = setOptions;
exports.requestp = requestp;
exports.makePageFunction = makePageFunction;
exports.getImageFromThumbnail = getRealImageFromThumbnail
exports.getMangaIdFromString = getMangaIdFromString;
