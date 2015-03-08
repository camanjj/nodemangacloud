var cheerio = require('cheerio');
var request = require('request');
var zlib = require('zlib');
var numeral = require('numeral');
var util = require('util');
var Promise = require('promise');
var async = require('async');
var models = require('./model');


var baseUrl = "http://bato.to";
