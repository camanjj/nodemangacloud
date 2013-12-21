/**
 * Created by cameronjackson on 12/19/13.
 */


var cheerio = require('cheerio');
var request = require('request');
var zlib = require('zlib');
var numeral = require('numeral');



exports.updates = function(req, res){

    fetchPage('http://www.batoto.net', req, res, parseUpdates);

};

exports.info = function(req, res){


    if(!req.query.page){
        res.status(400);
        res.send('Missing paramater page');
    } else {
    fetchPage(req.query.page, req, res, parseInfo);
    }

};

exports.read = function(req, res){
    fetchPage(req.query.page, req, res, getPages)
}

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


function fetchPage(url, req, jsonResponse, callback){

    var cookies;

    if(req != null){

        cookies =  req.headers.cookie;
    }


    var options = {
        uri: url,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'Accept' :'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding':'gzip',
            Cookie : cookies
        },
        encoding : null
    };

    request(options, function(error, response, body){

        if (!error && response.statusCode == 200) {

            zlib.unzip(body, function(err, buffer) {
                if (!err) {
                    var html = buffer.toString();
                    callback(jsonResponse, html);
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
