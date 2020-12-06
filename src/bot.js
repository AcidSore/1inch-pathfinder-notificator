process.env.NTBA_FIX_319 = 1;

let request = require('request-promise');
let winston = require('winston');
module.exports.request = request;

const TOKENS_URL = "https://tokens.1inch.exchange/v1.0";
const QUOTE_REQUEST = function(fromToken, toToken, amount){
    return `https://api.1inch.exchange/v2.0/quote?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}`;
}
module.exports.QUOTE_REQUEST = QUOTE_REQUEST;
let config = {}

const myFormat = winston.format.printf(info => {
  return `${info.timestamp} ${info.level}: ${info.message}`
})

let log = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        myFormat
    ),
    transports: [
        new (winston.transports.Console),
    ],
    exitOnError: false,
});
module.exports.log = log;

log.info("----------");
request(TOKENS_URL).then(rawTokens => {
    let tokens = JSON.parse(rawTokens);
    let symbols = {};
    let tokensKeys = Object.keys(tokens);
    for(let i = 0; i < tokensKeys.length; i++){
        symbols[tokens[tokensKeys[i]].symbol.toLowerCase()] = tokens[tokensKeys[i]];
    }
    loadConfiguration(tokens, symbols).then(c => {
        config = c
        module.exports.config = config;
        require('./sql.js').checkTables().then(() => {
            log.info(`Checking database connection OK`);
        }, error => {
            dieWithError(`Checking database connection ERROR: ${error.toString()}`);
        }).finally(() => {
            log.info("Start program");
            require("./program.js").start();
        });
    }, error => {
        dieWithError(error.toString());
    });
}).catch(error => {
    dieWithError(`Download tokens list from ${TOKENS_URL} ERROR: ${error.toString()}`);
});

function loadConfiguration(tokens, symbols){
    return new Promise(function(ok, fail){
        let config = {
            'token': process.env.TELEGRAM || false,
            'sql': {
                'host': process.env.DB_HOST || '127.0.0.1',
                'user': process.env.DB_USER || false,
                'database': process.env.DB_DATABASE || false,
                'password': process.env.DB_PASSWORD || false,
                'tables': {
                    'users': process.env.DB_TABLE_USERS || 'users',
                    'user_status_ref': process.env.DB_TABLE_USER_STATUS_REF || 'user_status_ref',
                    'notifications': process.env.DB_TABLE_NOTIFICATIONS || 'notifications',
                },
            },
            'eth': {
                'tokens': tokens,
                'symbols': symbols,
            } 
        }

        if(!config.token){
            fail("Configuration without telegram token");
        }
        if(!config.sql.database){
            fail("Configuration without database name");
        }
        if(!config.sql.user){
            fail("Configuration without database user");
        }
        if(!config.sql.password){
            fail("Configuration without database password");
        }
        ok(config);
    });
}

function dieWithError(msg){
    log.error(msg);
    setTimeout(function(){ process.exit(-1); }, 1000);
}
module.exports.dieWithError = dieWithError;


