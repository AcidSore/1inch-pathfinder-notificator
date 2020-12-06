let program = module.parent.exports;
let bot = module.parent.parent.exports;

const LIMIT = 1000;
const TIMEOUT = 2000;
const REQUESTS_LIMIT = 10;

function start(){
	bot.log.info("Notificator checker start");
	startLoop();
}
module.exports.start = start;

function startLoop(offset = 0) {
	program.sql.getAllNotifications(LIMIT, offset).then(notifications => {
		if(notifications.length == 0){
			offset = 0 - LIMIT;
			nextLoop(offset);
			return;
		}
		checkNotifications(notifications).then(() => {
			nextLoop(offset);
		});
	}, error => { 
		bot.log.error(`sql.getAllNotifications ${offset}: ${error.toString()}`);
		nextLoop(offset);
	});
}

function nextLoop(offset) {
	setTimeout(function(){
		startLoop(offset+LIMIT);
	}, TIMEOUT);
}

function checkNotifications(notifications, index = 0) {
	return new Promise(function(ok){
		for(i = index; i <= index + REQUESTS_LIMIT; i++){
			if(i >= notifications.length){
				ok();
				return;
			}
			let fromToken = notifications[i]['from_token'];
			let toToken = notifications[i]['to_token'];
			let amount = notifications[i]['amount'];
			let j = i;
			bot.request(bot.QUOTE_REQUEST(fromToken,toToken,amount)).then(function(result){
				result = JSON.parse(result);
				let toTokenAmountBN = new program.web3.utils.BN(result['toTokenAmount']);
				let minResultBN = new program.web3.utils.BN(notifications[j]['min_result']);
				let route = notifications[j]['route'];
				if((route == 0 && toTokenAmountBN.gte(minResultBN)) || 
					(route == 1 && toTokenAmountBN.lte(minResultBN))){
					// send notification
					program.sql.updateNotificationLastDt(notifications[j]['id']).then(() => {}, error => {
						bot.log.error(`checkNotifications ${notifications[j]['id']}: ${error.toString()}`);
					});
					let fromSymbol = bot.config.eth.tokens[notifications[j]['from_token']].symbol;
					let toSymbol = bot.config.eth.tokens[notifications[j]['to_token']].symbol;
					let fromDecimals = bot.config.eth.tokens[notifications[j]['from_token']].decimals;
					let toDecimals = bot.config.eth.tokens[notifications[j]['to_token']].decimals;
					let message = `<b>Notification:</b>\n<code>${fromSymbol} -> ${toSymbol}</code>\n` +
								`${program.BnToString(new program.web3.utils.BN(notifications[j]['amount']), fromDecimals)} <code>-></code> ${program.BnToString(new program.web3.utils.BN(result['toTokenAmount']), toDecimals)}`;
					program.telegram.sendMessage(notifications[j]['telegram_id'], message, { 
						'parse_mode': 'html',
						'disable_web_page_preview': true,
					}).catch(error => { bot.log.error(`ERROR sendMessage ${error.toString()}`); });
				}
			}.bind(j)).catch(function(error){ 
				bot.log.error(`checkNotifications ${notifications[j]['id']}: ${error.toString()}`);
			}.bind(j));
		}

		checkNotifications(notifications, index + REQUESTS_LIMIT + 1).then(_ok => { ok(_ok); });
	});
}

