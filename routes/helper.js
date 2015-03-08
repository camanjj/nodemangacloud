var Promise = require('promise');
var request = require('request');
var zlib = require('zlib');


function setOptions(req, url, method) {

    var cookies;
    if (req !== null) {
        //get the cookies from the request header
        cookies = req.headers.cookie;
    } else {
        //!!! dont really know why I put this here
        cookies = stringCookies;
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
            'Cookie': cookies
        }
    };

    //send back the options for the request in a promise
    return Promise.resolve(options); 
}

function requestp(options) {
    return new Promise(function(resolve, reject) {
        var req = request(options);
        req.on('response', function(res) {
            var chunks = [];
            res.on('data', function(chunk) {
                chunks.push(chunk);
            });

            res.on('end', function() {
                var buffer = Buffer.concat(chunks);
                var encoding = res.headers['content-encoding'];
                if (encoding == 'gzip') {
                    zlib.gunzip(buffer, function(err, decoded) {
                        resolve(decoded.toString());
                    });
                } else if (encoding == 'deflate') {
                    zlib.inflate(buffer, function(err, decoded) {
                        resolve(decoded.toString());
                    });
                } else {
                    resolve(buffer.toString());
                }
            });
        });
    });
}

function makePageFunction(url, response, page) {

    return function(callback) {
        var resp = response;
        var req = request({
            url: url
        });
        req.on('response', function(res) {

            var chunks = [];
            res.on('data', function(chunk) {
                chunks.push(chunk);
            });

            res.on('end', function() {
                var buffer = Buffer.concat(chunks);
                var encoding = res.headers['content-encoding'];
                if (encoding == 'gzip') {
                    zlib.gunzip(buffer, function(err, decoded) {
                        var image = findImage(decoded.toString());
                        handleImage(image, resp, page, callback);
                    });
                } else {
                    var image = findImage(buffer.toString());
                    handleImage(image, resp, page, callback);
                }
            });
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

    //debug line
    // console.log(image);

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
