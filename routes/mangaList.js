/**
 * Created by cameronjackson on 12/19/13.
 */


var cheerio = require('cheerio');
var request = require('request');
var zlib = require('zlib');
var numeral = require('numeral');
var util = require('util');
var qs = require('querystring');


var loginUrl = 'http://www.batoto.net/forums/index.php?app=core&module=global&section=login&do=process';



//returns the updates list
exports.updates = function(req, res){

    fetchPage('http://www.batoto.net', req, res, parseUpdates);

};


//returns the manga information
exports.info = function(req, res){


    if(!req.query.page){
        res.status(400);
        res.send('Missing paramater page');
    } else {
    fetchPage(req.query.page, req, res, parseInfo);
    }

};


//returns the pages to manga chapter
exports.read = function(req, res){
    fetchPage(req.query.page, req, res, getPages)
}


//logs into batoto.net
exports.login = function(req, res){

    var body = '';
    req.on('data', function (data) {
        body += data;
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (body.length > 1e6) {
            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
            request.connection.destroy();
        }
    });
    req.on('end', function () {
        var POST = qs.parse(body);
        var formData = new Object();
        formData.auth_key = '880ea6a14ea49e853634fbdc5015a024';
        formData.referer = 'http://www.batoto.net/forums/';
        formData.rememberMe = 1;
        formData.ips_password = POST.pword;
        formData.ips_username = POST.uname;
        fetchPage(loginUrl, req, res, parseLogin, 'POST', formData);
    });
}

//TODO: Need to add documentation to the api
exports.follow = function(req, res){

    var cookies = req.headers.cookie;
    var body = '';
    req.on('data', function (data) {
        body += data;
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (body.length > 1e6) {
            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
            request.connection.destroy();
        }
    });
    req.on('end', function () {
        var params = qs.parse(body);

        var action = params.action === ('follow') ? 'save' : 'unset';

        //to follow set do equal to save, to unfollow set do equal to unset
        var url = util.format('http://www.batoto.net/forums/index.php?s=%s&&app=core&module=ajax&section=like&do=%s&secure_key=%s&f_app=ccs&f_area=ccs_custom_database_3_records&f_relid=%s', params.session, action, params.sKey, params.rid);
        console.log(url);
        fetchPage(url, req, res, function(response, body){


            //stores the html in a cheerio object
            var $ = cheerio.load(body);
            var text = $('a').first().text();

            if(action === 'save'){
                //returns bool representing if the follow was a success
                response.send(text === 'Unfollow');
            }else{
                //returns bool representing if the unfollow was a success
                response.send(text === 'Follow');
            }

        },'POST');

    });



};

function gunzipData(response){

    var gunzip = zlib.createGunzip();
    var json = "";

    gunzip.on('data', function(data){
        json += data.toString();
    });

    gunzip.on('end', function(){
//        console.log(json);
        return (json);
    });


    var buffer = response.pipe(gunzip);
    console.log(buffer);
}


function fetchPage(url, req, jsonResponse, callback, method, postBody, stringCookies){

    method = method === null ? 'GET' : 'POST';

    var cookies;

    if(req != null){

        cookies =  req.headers.cookie;
    } else {
        cookies = stringCookies;
    }


    var options = {
        uri: url,
        method: method,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'Accept' :'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding':'gzip',
            Cookie : cookies
        },
        encoding : null
    };

    if(postBody != null)
        options.form = postBody;

    request(options, function(error, response, body){

        if (!error) {

            zlib.unzip(body, function(err, buffer) {
                if (!err && (response.statusCode == 200 || response.statusCode == 302)) {
                    var html = buffer.toString();
                    callback(jsonResponse, html, response.headers['set-cookie']);
                }
            });
        }
    });
}

function parseUpdates(response, body){
    var $ = cheerio.load(body);

    var mpis = [];
    var mpi;
    $('.ipb_table tr[class!=header]').each(function(i, element){

        var self = $(this);

        if($(this).find('td').length == 2){

            //used to ignore the first blank row
            if(mpi != null)
                mpis.push(mpi);
            mpi = new Object();
            mpi.chapters = [];
            //gets the image element
            var image = $(this).find('img').first();
            mpi.imageLink = image.attr('src');
//                    console.log(mpi.imageLink);
            mpi.link = image.parent().attr('href');
//                    console.log(mpi.link);
            mpi.title = $(this).find('td a').last().text();
//                    console.log(mpi.title);

        } else {

            var chapter = new Object();
            var info = $(this).find('td a').first();

            chapter.link = info.text();
            chapter.title = info.attr('href');

            chapter.language = self.find('td div').attr('title');

            var groupInfo = self.find('td a').last();

            chapter.group = groupInfo.text();
            chapter.groupLink = groupInfo.attr('href');


            chapter.updateTime = self.find('td').last().text().trim();

            //adds this chapter to the manga preview item
            mpi.chapters.push(chapter);

        }


    });
    response.send(mpis);
}

function parseInfo(response, body){


    var $ = cheerio.load(body);
    var manga = new Object();
    var infoTable = $('.ipsBox');
    manga.image = infoTable.find('img').first().attr('src');


    //collectes the manga information from the table
    $('.ipb_table').first().find('tr').each(function(i, element){

        var tableData = $(this).find('td').last().text();
        switch (i){

            case 0:
                manga.altNames = tableData;
                break;
            case 1:
                manga.author = tableData;
                break;
            case 2:
                manga.artist = tableData;
                break;
            case 3:
                manga.genre = tableData;
                break;
            case 4:
                manga.mangaType = tableData;
                break;
            case 5:
                manga.status = tableData;
                break;
            case 6:
                manga.summary = tableData;
                break;
        }
    });


    var chapters = [];

    //collects the chapters
    $('.chapters_list tr[class!=header]').each(function(i, element){

        var chapter = new Object();

        $(this).find('td').each(function(i, element){

            switch(i){

                case 0:
                    var title =  $(this).find('a').first();
                    chapter.title = title.text();
                    chapter.link = title.attr('href');
                    break;
                case 1:
                    chapter.language = $(this).find('div').first().attr('title');
                    break;
                case 2:
                    var group = $(this).find('a').first();
                    chapter.group = group.text();
                    chapter.groupLink = group.attr('href');
                    break;
                case 3:
                    var uploader = $(this).find('a').first();
                    chapter.uploader = uploader.text();
                    chapter.uploaderLink = uploader.attr('href');
                    break;
                case 4:
                    chapter.updateTime = $(this).text().trim();
                    break;
            }

        });

        if($(this).attr('id') !== 'no_chap_avl')
            chapters.push(chapter);

    });

    manga.chapters = chapters;

    response.send(manga);



}

function getPages(response, body){

    var $ = cheerio.load(body);

    var numberOfPages = $('#page_select').first().find('option').length;

    var title = $('head title').text();


    var images = [];

    if(!numberOfPages){//webtoon mode

        $('img').filter(function (i, el){
            return $(this).attr('alt') === title;
        }).each(function(i, el){
                images.push($(this).attr('src'));
        });

        response.send(images);
    } else {//manga mode

        var imageLink = $('#comic_page').attr('src');

        if(imageLink.indexOf('img0000') != -1){ //new manga

            var prefix  = imageLink.substring(0,imageLink.lastIndexOf('img')+3);
            var suffix = imageLink.substring(imageLink.lastIndexOf('.'));
            for(var i =1; i <= numberOfPages; i++){
                var page = numeral(i * .000001).format('.000000')
                page = page.substring(1);

                images.push(prefix + page + suffix);
            }

            response.send(images);
        } else { //old manga

            console.log('old manga');

            var imageLink = $('#comic_page').attr('src');
            images.push(imageLink);

            $('#page_select').first().find('option').each(function (e, el){
                console.log(e);
                var url = $(this).val();

                fetchPage(url, null, response, function(innerResponse, innerBody){
                    var inner = cheerio.load(innerBody);
                    images.push(inner('#comic_page').attr('src'));
                    if(e === $('#page_select').first().find('option').length-1)
                        response.send(images);
                });

            });

        }

    }

}

function parseLogin(response, body, cookies){

    var str = cookies.toString();
    if(str.indexOf('pass_hash') === -1){
       response.statusCode = 400;
        response.send('Error Logging in. Check Credentials');
        return;
    }

    console.log('signed in');

    var jar = new Object();
    var ckString = [];
    for(x  in cookies){

        var ck = (cookies[x].substring(0, cookies[x].indexOf(';')));
        ckString.push(ck);
        var split_arr = ck.split('=');
        jar[split_arr[0]] = split_arr[1];
    }

    fetchPage('http://www.batoto.net/',null,response, function(jsonResponse, html){
        var $ = cheerio.load(html);
        var logoutLink = $('#logout_link').first();
        var link = logoutLink.attr('href');
        var queryString = link.substring(link.indexOf('?')+1);
        var object = qs.parse(queryString);
        //object['k'] is the secret key needed
        console.log((jar[0]));
        jar['key'] = object['k'];
        jsonResponse.send(jar);

    }, 'GET', null, ckString.join('; '));
}
