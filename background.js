const REQUEST_ROOT = "https://api.twitch.tv/kraken";
const REQUEST_PATH_FOLLOWS = REQUEST_ROOT + "/users/{user}/follows/channels";
const REQUEST_PATH_STREAMS = REQUEST_ROOT + "/streams?channel={channels}";
const CLIENT_ID = "gevhsubto5cnilf3uwcl5ws5lcrqmx8";

function resetSessionOnlyItems() {
	window.localStorage.notificationURLs = "{}";
}

// Open options page and reset notification URLs when installed
chrome.runtime.onInstalled.addListener(function(details){
	resetSessionOnlyItems();
	if(details.reason === "install") {
		chrome.runtime.openOptionsPage();
	}
});

// Reset notification URLs on startup
chrome.runtime.onStartup.addListener(function(){
	resetSessionOnlyItems();
});

// Makes a GET request to 'url' and parses it as JSON
function getJSON(url,callback) {
	var request = new XMLHttpRequest();
	request.addEventListener("load",function(){
		try {
			var json = JSON.parse(this.responseText);
		}catch(e){
			callback(false,e);
			return;
		}
		callback(true,json);
	});
	request.addEventListener("error",function(){
		callback(false);
	});
	request.open("GET",url);
	request.send();
}

function getFollowedChannels(username,callback) {
	console.log("Getting followed channels");
	chrome.storage.sync.get({maxFollowsAge:1},function(items){
		if(((Date.now() - parseInt(window.localStorage.followedChannelsLastUpdated)) > items.maxFollowsAge * 60 * 60 * 1000) || !window.localStorage.followedChannels) {
			console.log("Cached channels too old, updating them...");
			var follows = [];
			function followsReponse(success,data){
				if(success) {
					if(data.follows.length === 0) {
						var channelNames = [];
						for(var i = 0;i < follows.length;i++) {
							channelNames.push(follows[i].channel.name);
						}
						window.localStorage.followedChannels = JSON.stringify(channelNames);
						window.localStorage.followedChannelsLastUpdated = Date.now();
						console.log("Got fresh list of followed channels");
						callback(true,channelNames);
					}else{
						for(var i = 0;i < data.follows.length;i++) {
							follows.push(data.follows[i]);
						}
						getJSON(data._links.next,followsReponse);
					}
				}else{
					console.error("Error in followed channels request response",data);
					callback(false,data);
				}
			}
			getJSON(REQUEST_PATH_FOLLOWS.replace("{user}",username),followsReponse);
		}else{
			console.log("Cached channels are young enough, using them");
			callback(true,JSON.parse(window.localStorage.followedChannels));
		}
	});
}

// Get user's followed channels who are streaming
function getStreamingChannels(username,callback) {
	console.group("Getting followed channels currently streaming...");
	getFollowedChannels(username,function(success,data){
		if(success){
			console.log("Getting streams...");
			var channelNames = data;
			var streams = [];
			function streamsReponse(success,data){
				if(success) {
					if(data.streams.length === 0) {
						console.log("Got streams");
						console.groupEnd();
						callback(true,streams);
						window.localStorage.streamsLastChecked = Date.now();
					}else{
						for(var i = 0;i < data.streams.length;i++) {
							// Convert date string to milliseconds since midnight the 1st January 1970
							data.streams[i].created_at = Date.parse(data.streams[i].created_at);
							streams.push(data.streams[i]);
						}
						getJSON(data._links.next,streamsReponse);
					}
				}else{
					console.groupEnd();
					callback(false,data);
				}
			}
			getJSON(REQUEST_PATH_STREAMS.replace("{channels}",channelNames.join(",")),streamsReponse);
		}
	});
}

// Notify the user
function notifyUser(stream) {
	console.log("Creating notification for ", stream);
	chrome.notifications.create({
		type:"image",
		iconUrl:stream.channel.logo,
		imageUrl:stream.preview.large,
		title:chrome.i18n.getMessage("notificationTitle",[stream.channel.display_name,stream.game]),
		message: stream.channel.status,
		eventTime:stream.created_at
	}, function(id){
		console.log("Nofication with ID " + id + " created.");
		var notificationURLs = JSON.parse(window.localStorage.notificationURLs);
		notificationURLs[id] = stream.channel.url;
		window.localStorage.notificationURLs = JSON.stringify(notificationURLs);
	});
}

// Open link to stream when notification is clicked
chrome.notifications.onClicked.addListener(function(notificationID) {
	chrome.tabs.create({url:JSON.parse(window.localStorage.notificationURLs)[notificationID]},function(){
		chrome.notifications.clear(notificationID);
	});
})

// Start update alarm
chrome.alarms.create("update", {periodInMinutes: 3});
chrome.alarms.onAlarm.addListener(function(alarm) {
	chrome.storage.sync.get("username", function(result) {
		console.log("Username: \"" + result.username + "\"");
  		if(result.username) {
			getStreamingChannels(result.username,function(success,data){
				if(success){
					var streamsLastChecked = parseInt(window.localStorage.streamsLastChecked) || (window.localStorage.streamsLastChecked = 0);
					var createdNotifications = {};
					for(var i = 0;i < data.length;i++) {
						console.log("Checking if " + data[i].channel.display_name + "'s stream started after streams were last checked");
						if(data[i].created_at > streamsLastChecked) {
							console.log("It was");
							notifyUser(data[i]);
						}else{
							console.log("It wasn't");
						}
					}
				}
			});
  		}
  	});
});