/**
 * Created by Camanjj
 */


var cheerio = require('cheerio');
var request = require('request');
var zlib = require('zlib');
var numeral = require('numeral');
var util = require('util');
var qs = require('querystring');


var loginUrl = 'http://www.batoto.net/forums/index.php?app=core&module=global&section=login&do=process';

/**
 *  gets the updates list
 *  @property req.headers.cookie - set lang_option to something to get things in certain language
 */
exports.updates = function(req, res){

    if(!req.query.page || req.query.page === 1)
        fetchPage('http://www.batoto.net', req, res, parseUpdates);
    else{
        //allows paging to the request
        var pageLink = util.format('http://www.batoto.net?p=%d', req.query.page);
        fetchPage(pageLink, req, res, parseUpdates);
    }


};

/**
 * get the manga information for a selected manga
 * @param req - the request sent to the server
 * @property req.params.page - the page to the manga information page
 */
exports.info = function(req, res){

    if(!req.query.page){
        res.status(400);
        res.send('Missing paramater page');
    } else {
        fetchPage(req.query.page, req, res, parseInfo, 'GET');
    }

};


/**
 * gets the links for the pages in a manga chapter
 * @param {Request} req - the request
 * @property {String} req.query.page - the link to the first page in the manga chapter
 *
 */
exports.read = function(req, res){

    if(!req.query.page){
        res.status(400);
        res.send('Missing paramater page');
    } else {
        fetchPage(req.query.page, req, res, getPages, 'GET');
    }
};


/**
 * logs into batoto.net and returns JSON for all the credentials needed
 *
 * @param {Request} req - request only required params are uname and pword
 * @returns {String} JSON object giving all the credentials needed to continue being the specified user
 *
 * */
exports.login = function(req, res){

    var b = req.body.uname;
    var body = '';

    if(!b){
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
    } else {
        var formData = new Object();
        formData.auth_key = '880ea6a14ea49e853634fbdc5015a024';
        formData.referer = 'http://www.batoto.net/forums/';
        formData.rememberMe = 1;
        formData.ips_password = req.body.pword;
        formData.ips_username = req.body.uname;
        fetchPage(loginUrl, req, res, parseLogin, 'POST', formData);
    }
};


/**
 *  follows or unfollows a manga
 *  @param {Request} req - request hat has the cookies for credentialing
 *  @property {object} req.headers.cookie -  cookies need for credentialing
 *  @property {object} params.action - follow/unfollow
 *  @property {strng} params.rid - the id for the manga
 *  @property {object} params.sKey - the key needed to follow manga
 *  @property {object} params.session - the seesion id for the user
 */
exports.follow = function(req, res){

    var key = req.body.sKey;
    var body = '';

    if(!key){
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
    } else {
        var action = req.body.action === ('follow') ? 'save' : 'unset';
        var session = req.body.session;
        var rid = req.body.rid;


        //to follow set do equal to save, to unfollow set do equal to unset
        var url = util.format('http://www.batoto.net/forums/index.php?s=%s&&app=core&module=ajax&section=like&do=%s&secure_key=%s&f_app=ccs&f_area=ccs_custom_database_3_records&f_relid=%s', session, action, key, rid);
        fetchPage(url, req, res, function(response, body){


            //stores the html in a cheerio object
            var $ = cheerio.load(body);
            var text = $('a').first().text();

            var result = {};


            if(action === 'save'){
                //returns bool representing if the follow was a success
                result.success = text === 'Unfollow';
                response.send(result);
            }else{
                //returns bool representing if the unfollow was a success
                result.success = text === 'Follow';
                response.send(result);
            }

        },'POST');
    }



};

/**
 * retrieves the follow list for the user
 */
exports.follows = function(req, res){

    if(!req.query.page || req.query.page === 1)
        fetchPage('http://www.batoto.net/myfollows', req, res, parseFollows, 'GET');
    else {
        var pageLink = util.format('http://www.batoto.net/myfollows?p=%d', req.query.page);
        fetchPage(pageLink, req, res, parseFollows, 'GET');
    }
};

/**
 *  searches for manga
 */
exports.search = function(req, res){

    var term = req.body.term;
    var url = util.format('http://www.batoto.net/search?name=%s&name_cond=c&dosubmit=Search', term)

    fetchPage(url, req, res, parseSearch, 'GET');
};


function fetchPage(url, req, jsonResponse, callback, method, postBody, stringCookies){


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
                }else{
                    jsonResponse.statusCode = 400;
                    jsonResponse.send({'Failed' : 'For some reason'});
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
            var imageString = image.attr('src');
            imageString = imageString.substring(imageString.lastIndexOf('http://'));
            imageString = util.format('http://www.batoto.net/timthumb.php?h=%d&w=%d&src=%s', 75, 75, imageString);
            mpi.imageLink = imageString;
//                    console.log(mpi.imageLink);
            mpi.link = image.parent().attr('href');
//                    console.log(mpi.link);
            mpi.title = $(this).find('td a').last().text();
//                    console.log(mpi.title);

        } else {

            var chapter = {};
            var info = $(this).find('td a').first();

            chapter.title = info.text();
            chapter.link = info.attr('href');

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
    var manga = {};

    manga.title = $('.ipsType_pagetitle').first().text().trim();

    var infoTable = $('.ipsBox');
    manga.image = infoTable.find('img').first().attr('src');



    //if the user if signed in then it shows if the user is currently following the manga or not
    var followingSection = $('div.__like.right a').first();
    if(followingSection.length > 0){
        manga.following = followingSection.text().indexOf('Unfollow') !== -1;
    }


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
        jar['key'] = object['k'];
        jsonResponse.send(jar);

    }, 'GET', null, ckString.join('; '));
}

function parseFollows(response, body){

    var $ = cheerio.load(body);
    var mpis = [];
    var mpi;
    $('.ipb_table tr[class!=header]').each(function(i, element){

        mpi = {};
        mpi.chapters = [];
        var chapter = {};
        $(this).find('td').each(function(e, el){

            switch (e) {
                case 1:
                    var title = $(this).find('a').first();
                    mpi.title = title.text();
                    mpi.link = title.attr('href');

                    var chapterTitle = $(this).find('a').last();
                    chapter.title = chapterTitle.text();
                    chapter.link = chapterTitle.attr('href');

                    break;
                case 2:
                    chapter.language = $(this).find('div').first().attr('title');
                    break;
                case 3:
                    var groupTitle = $(this).find('a').first();
                    chapter.group = groupTitle.text();
                    chapter.groupLink = groupTitle.attr('href');
                    break;
                case 4:
                    chapter.updateTime = $(this).text();
                    break;
            }

        });

        mpi.chapters.push(chapter);
        mpis.push(mpi);
        chapter = {};


    });
    response.send(mpis);
}

function parseSearch(response, body){

    var $ = cheerio.load(body);

    var results = [];
    $('.chapters_list tr[class!=header]').each(function(i, element){

        if($(this).find('td').length !== 1){

            var result = {};

            var title = $(this).find('strong a').first();

            result.title = title.text();
            result.link = title.attr('href');

            if(result.title !== "")
                results.push(result);
        }

    });

    response.send(results);

}