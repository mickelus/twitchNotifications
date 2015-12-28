var REQUEST_PATH_FOLLOWS = "https://api.twitch.tv/kraken/users/{user}/follows/channels";
var REQUEST_DATA_FOLLOWS = "direction=DESC&limit=25&offset={offset}";

var REQUEST_PATH_CHANNEL = "https://api.twitch.tv/kraken/streams?channel={channel}";

var NOTIFICATION_TITLE = "{name} is now playing {game}";

var USER_KEY = "username";
var CLIENT_ID = "gevhsubto5cnilf3uwcl5ws5lcrqmx8";
var activeChannels =  [];

// gets all channels followed by the user that is currently streaming
function getFollowedChannels(username) {

	var result = [];

	var offset = 0;
	var count = 0;

	do {
		var json;
		var followsRequest = new XMLHttpRequest();

		followsRequest.open("GET", REQUEST_PATH_FOLLOWS.replace("{user}", encodeURI(username)), false);
		followsRequest.send(REQUEST_DATA_FOLLOWS.replace("{offset}", offset));

		json = JSON.parse(followsRequest.responseText);

		count = json["_total"];
		offset += count;

		var channels = json["follows"];
		var channelNames = [];
		for (var i = 0; i < channels.length; i++) {
			channelNames.push(channels[i]["channel"]["name"]);
		};

		var streamingRequest = new XMLHttpRequest();

		streamingRequest.open("GET", REQUEST_PATH_CHANNEL.replace("{channel}", encodeURI(channelNames)), false);
		streamingRequest.send();

		json = JSON.parse(streamingRequest.responseText);

		result.push.apply(result, json["streams"]);

	} while(count >= 25);

	return result;
}

// notifies the user with a chrome notification box
function notifyUser(channelData) {


	var title = NOTIFICATION_TITLE;
	title = title.replace("{name}", channelData["display_name"]);
	title = title.replace("{game}", channelData["game"]);

	if(webkitNotifications.createHTMLNotification == undefined) {
		var options = {
			"type"		: "basic",
			"title"		: title,
			"message"	: channelData["status"],
			"iconUrl"	: channelData["logo"],
		}


		/*var imageRequest = new XMLHttpRequest();
		imageRequest.open("GET", channelData["logo"]);
		imageRequest.responseType = "blob";
		imageRequest.onload = function(){
		        var blob = this.response;
		        options.iconUrl = window.URL.createObjectURL(blob);
		        chrome.notifications.create((new Date()).toString(), options, function(){});
		    };
		imageRequest.send(null);*/
		chrome.notifications.create(channelData["_id"].toString(), options, function(){});
	} else {
		var notification = webkitNotifications.createNotification(
			channelData["logo"],
			title,
			channelData["status"]
		);
		var url = channelData["url"];
		notification.onclick = function() {
			chrome.tabs.create({ "url" : url});
			notification.close();
		}
		notification.show();
	}

	
}

// set up listener to open clicked streams
chrome.notifications.onClicked.addListener(function(notificationID) {
	for (i = 0; i < activeChannels.length; i++) {
		if(activeChannels[i]["channel"]["_id"] == notificationID ) {
			chrome.notifications.clear(notificationID, function() {});
			chrome.tabs.create({ "url" : activeChannels[i]["channel"]["url"]});
			
		}
	};
})


// init channels
chrome.storage.sync.get(USER_KEY, function(result) {
	var username = result[USER_KEY];

	if(username != undefined) {
		activeChannels = getFollowedChannels(username);
	}
});


// start update alarm
chrome.alarms.clearAll();
chrome.alarms.create("update", {periodInMinutes: 1});


chrome.alarms.onAlarm.addListener(function(alarm) {

	// get user from storage
	chrome.storage.sync.get(USER_KEY, function(result) {
  		var username = result[USER_KEY];

  		if(username != undefined) {
  			// query active followed streams on twitch
  			var currentChannels = getFollowedChannels(username);

			// store previously active streams in temp array
			var tempChannels = activeChannels.slice();

			// for each currently active stream
			for (var i = 0; i < currentChannels.length; i++) {

				// check if stream was active before
				var exists = false;
				var j;
				for (j = 0; j < tempChannels.length; j++) {
					if(tempChannels[j]["channel"]["_id"] == currentChannels[i]["channel"]["_id"] ) {
						exists = true;
						break;
					}
				};

				// stream has started if it was not previously active
				if(!exists) {

					// add stream to active array
					activeChannels.push(currentChannels[i]);
					// notify user about new stream
					notifyUser(currentChannels[i]["channel"]);

				} else {
					// remove stream from temp array
					tempChannels.splice(j, 1);

				}

				
			};

			// for each stream in temp array
			for (var i = 0; i < tempChannels.length; i++) {

				// remove from active array
				var index = activeChannels.indexOf(tempChannels[i]);
				activeChannels.splice(index, 1);
			};
  		}

  })
});

// Open options page when installed
chrome.runtime.onInstalled.addListener(function(details){
	if(details.reason === "install") {
		chrome.runtime.openOptionsPage();
	}
});