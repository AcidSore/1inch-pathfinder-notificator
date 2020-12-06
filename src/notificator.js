let program = module.parent.exports;
let bot = module.parent.parent.exports;

const LIMIT = 1000;
const TIMEOUT = 2000;

function start(){
	bot.log.info("Notificator checker start");
	startLoop();
}
module.exports.start = start;

function startLoop(offset = 0) {
	program.sql.getAllNotifications(LIMIT, offset).then(notifications => {
		if(notifications.length == 0){
			offset = 0 - LIMIT;
			return;
		}
		for(i = 0; i < notifications.length; i++){
			
		}
	}, error => { 
		bot.log.error(`sql.getAllNotifications ${offset}: ${error.toString()}`) 
	}).finally(() => {
		setTimeout(function(){
			startLoop(offset+LIMIT);
		}, TIMEOUT);
	});
}