
exports.version = function(request, response){

    if(request.query.version === "iOS"){
        response.send("0.4");
    } else if(request.query.version === "Android"){
        response.send("0.3.7");
    }

    response.json(500, {error: "No specification"})

};

exports.message = function(request, response){

    var message = {};
    message.urgent = 'REG';
    message.msg = 'This is a simple message';
    response.send('')

}