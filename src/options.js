const REQUEST_PATH_USER = "https://api.twitch.tv/kraken/users/{user}";

var usernameInput = document.querySelector("#username");
var applyButton = document.querySelector("#apply");
var usernameCheckStatusSpan = document.querySelector("#usernameCheckStatus");
var savedUsername = "";
usernameInput.value = chrome.i18n.getMessage("optionsUsernameLoading");

// If enter is pressed in input, click done
usernameInput.addEventListener("keypress",function(event){
	if(event.keyIdentifier == "Enter") {
		applyButton.click();
	}
});
usernameInput.addEventListener("keyup",function(){
	applyButton.disabled = !this.checkValidity() || this.value.toLowerCase() === savedUsername.toLowerCase();
});

applyButton.addEventListener("click",function(){
	applyButton.disabled = true;
	usernameCheckStatusSpan.style.color = "blue";
	var username = usernameInput.value;
	if(username === "") {
		chrome.storage.sync.set({"username" : ""})
		savedUsername = "";
		usernameCheckStatusSpan.innerText = chrome.i18n.getMessage("optionsUsernameRemoved");
		return;
	}else{
		usernameInput.disabled = true;
		usernameCheckStatusSpan.innerText = chrome.i18n.getMessage("optionsChecking");
	}
	checkUsername(username,function(valid,data){
		usernameInput.disabled = false;
		if(valid) {
			usernameInput.value = data.display_name;
			username = data.display_name;
			savedUsername = data.display_name;
			chrome.storage.sync.set({"username" : username})
			usernameCheckStatusSpan.innerText = chrome.i18n.getMessage("optionsUsernameSet");
			usernameCheckStatusSpan.style.color = "green";
		}else{
			chrome.storage.sync.remove("username");
			if(data.message == "User '" + username + "' does not exist") {
				data.message = chrome.i18n.getMessage("errorUserDoesNotExist",username);
			}else if(data.message == "User '" + username + "' is unavailable"){
				data.message = chrome.i18n.getMessage("errorUserNotAvailable",username);
			}
			usernameCheckStatusSpan.innerText = chrome.i18n.getMessage("errorMessage",data.message);
			usernameCheckStatusSpan.style.color = "red";
			usernameInput.focus();
			usernameInput.select();
		}
	});
});

// Get saved username
chrome.storage.sync.get("username", function(items) {
	if(items.username === undefined){
		console.log("Attemping to get username from cookie");
		chrome.cookies.get({url:"https://api.twitch.tv/",name:"name"},function(cookie){
			if(cookie){
				console.log("Got cookie");
				savedUsername = cookie.value;
			}else{
				savedUsername = "";
			}
			usernameInput.value = savedUsername;
			usernameInput.disabled = false;
		})
	}else{
		console.log("Got saved username");
		savedUsername = items.username;
		usernameInput.value = savedUsername;
		usernameInput.disabled = false;
	}
})



// populates elements with a message attribute
var messageAttributeElements = document.querySelectorAll("[message]");
for(var i = 0;i < messageAttributeElements.length;i++) {
	messageAttributeElements[i].innerText = chrome.i18n.getMessage(messageAttributeElements[i].getAttribute("message"));
}

function checkUsername(username,callback) {
	var request = new XMLHttpRequest();
	request.addEventListener("load",function(){
		try {
			json = JSON.parse(request.responseText);
		}catch(e){
			console.log("Error: ",e);
			callback(false,e);
			return;
		}
		console.log(json);
		if(json["error"] === undefined) {
			callback(true,json);
		}else{
			callback(false,json);
		}
	});
	request.open("GET", REQUEST_PATH_USER.replace("{user}", username));
	request.send();
}