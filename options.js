var REQUEST_PATH_USER = "https://api.twitch.tv/kraken/users/{user}";

var hideTimeout;

chrome.storage.sync.get("username", function(values) {
	if(values["username"] != undefined) {
		document.querySelector("#nameInput").value = values["username"];
	}
})

var nameSubmit = document.querySelector("#nameSubmit");
nameSubmit.addEventListener("click", submitUsername);

nameSubmit.value = chrome.i18n.getMessage("optionsUsernameSubmit");

// populates elements with a message attribute
var messageAttributeElements = document.querySelectorAll("[message]");
for(var i = 0;i < messageAttributeElements.length;i++) {
	messageAttributeElements[i].innerText = chrome.i18n.getMessage(messageAttributeElements[i].getAttribute("message"));
}

// checks if the username in the username input is valid and stores it in local storage
function submitUsername() {

	var username = document.querySelector("#nameInput").value;
	
	if(username == "") {

		showMessage(chrome.i18n.getMessage("optionsUsernameUnset"));

		chrome.storage.sync.remove("username");

	} else {
		var request = new XMLHttpRequest();
		var json;

		request.open("GET", REQUEST_PATH_USER.replace("{user}", username), true);
		request.send();

		request.onreadystatechange = function() {
			if(request.readyState == 4 ) {
				console.log("aasd");
				console.log(request.responseText)
				json = JSON.parse(request.responseText);

				if(json["error"] == undefined) {
					
					showMessage(chrome.i18n.getMessage("optionsUsernameSet"));

					chrome.storage.sync.set({"username" : username})

				} else {

					showMessage(chrome.i18n.getMessage("optionsUserNotFound"));

					chrome.storage.sync.remove("username");
				}
			}
		}

		
	}
}

// shows a message below the username input, color is optional and will default to black
function showMessage(message, color) {
	var messageContainer = document.querySelector("#messageContainer");
	var textNode = document.createTextNode(message);

	while (messageContainer.firstChild) {
	    messageContainer.removeChild(messageContainer.firstChild);
	}
	
	messageContainer.appendChild(textNode);
	

	if(color != undefined) {
		messageContainer.style.color = color;
	} else {
		messageContainer.style.color = "black";
	}

	messageContainer.style.opacity = 1;

	if(hideTimeout != undefined) {
		clearTimeout(hideTimeout);
	}
	hideTimeout = setTimeout(function() {
		messageContainer.style.opacity = 0;
	}, 7000);
}

