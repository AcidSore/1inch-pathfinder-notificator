let bot = module.parent.parent.exports;
let sql = require('mysql');

let config = {
  host     : bot.config.sql.host,
  user     : bot.config.sql.user,
  database : bot.config.sql.database,
  password : bot.config.sql.password,
  timezone : 'utc',
};

let connection;

connection = connect(); 

function connect(){
    if(connection != undefined){
        connection.end();
    }

    let conn = sql.createConnection(config);

    conn.connect(function(err) { 
        if(err) {
            bot.log.error('SQL error connection to db: ' + err.toString());
            connection = connect();
        }
        bot.log.info("SQL connect");                                  
    }); 

    conn.on('error', function(err) {
        bot.log.error('SQL connection lost: ' + err.toString());
        connection = connect();
    });

    return conn;
}
module.exports.connect = connect;

module.exports.connection = connection;